' =============================================
' OpenTelemetry Service
' Provides distributed tracing and metrics
' =============================================

Imports System.Collections.Generic
Imports System.Diagnostics
Imports System.Net.Http
Imports System.Text
Imports System.Threading.Tasks
Imports Newtonsoft.Json

Namespace DHA.API.Services

    ''' <summary>
    ''' OpenTelemetry-compatible telemetry service for distributed tracing
    ''' Supports OTLP HTTP protocol for sending traces to Jaeger, Zipkin, etc.
    ''' </summary>
    Public Class TelemetryService

        ' Singleton instance
        Private Shared _instance As TelemetryService
        Private Shared ReadOnly _lock As New Object()

        ' Configuration
        Private ReadOnly _serviceName As String = "DHA.API"
        Private ReadOnly _serviceVersion As String = "1.1.0"
        Private ReadOnly _otlpEndpoint As String
        Private ReadOnly _enabled As Boolean
        Private ReadOnly _httpClient As HttpClient

        ' Active spans tracking
        Private ReadOnly _activeSpans As New Dictionary(Of String, SpanContext)

        ' Metrics counters
        Private _requestCount As Long = 0
        Private _errorCount As Long = 0
        Private _verificationCount As Long = 0

        ''' <summary>
        ''' Gets the singleton instance of TelemetryService
        ''' </summary>
        Public Shared ReadOnly Property Instance As TelemetryService
            Get
                If _instance Is Nothing Then
                    SyncLock _lock
                        If _instance Is Nothing Then
                            _instance = New TelemetryService()
                        End If
                    End SyncLock
                End If
                Return _instance
            End Get
        End Property

        Private Sub New()
            _otlpEndpoint = System.Configuration.ConfigurationManager.AppSettings("OtlpEndpoint")
            If String.IsNullOrEmpty(_otlpEndpoint) Then
                _otlpEndpoint = "http://localhost:4318/v1/traces"
            End If

            Dim enabledSetting As String = System.Configuration.ConfigurationManager.AppSettings("TelemetryEnabled")
            _enabled = String.Equals(enabledSetting, "true", StringComparison.OrdinalIgnoreCase)

            _httpClient = New HttpClient()
            _httpClient.Timeout = TimeSpan.FromSeconds(5)

            Debug.WriteLine($"TelemetryService initialized. Enabled: {_enabled}, Endpoint: {_otlpEndpoint}")
        End Sub

        ''' <summary>
        ''' Starts a new trace span
        ''' </summary>
        Public Function StartSpan(operationName As String, Optional parentSpanId As String = Nothing) As SpanContext
            Dim span As New SpanContext()
            span.TraceId = If(String.IsNullOrEmpty(parentSpanId), GenerateTraceId(), GetTraceIdFromSpan(parentSpanId))
            span.SpanId = GenerateSpanId()
            span.ParentSpanId = parentSpanId
            span.OperationName = operationName
            span.StartTime = DateTime.UtcNow
            span.Attributes = New Dictionary(Of String, Object)()
            span.Events = New List(Of SpanEvent)()

            span.Attributes("service.name") = _serviceName
            span.Attributes("service.version") = _serviceVersion

            SyncLock _activeSpans
                _activeSpans(span.SpanId) = span
            End SyncLock

            Return span
        End Function

        ''' <summary>
        ''' Ends a span and exports it
        ''' </summary>
        Public Sub EndSpan(span As SpanContext, Optional status As String = "OK", Optional errorMessage As String = Nothing)
            If span Is Nothing Then Return

            span.EndTime = DateTime.UtcNow
            span.Duration = span.EndTime.Value.Subtract(span.StartTime).TotalMilliseconds
            span.Status = status

            If Not String.IsNullOrEmpty(errorMessage) Then
                span.Attributes("error") = True
                span.Attributes("error.message") = errorMessage
                Threading.Interlocked.Increment(_errorCount)
            End If

            SyncLock _activeSpans
                _activeSpans.Remove(span.SpanId)
            End SyncLock

            ' Export span asynchronously
            If _enabled Then
                Task.Run(Sub() ExportSpanAsync(span))
            End If
        End Sub

        ''' <summary>
        ''' Adds an attribute to a span
        ''' </summary>
        Public Sub SetAttribute(span As SpanContext, key As String, value As Object)
            If span IsNot Nothing AndAlso span.Attributes IsNot Nothing Then
                span.Attributes(key) = value
            End If
        End Sub

        ''' <summary>
        ''' Adds an event to a span
        ''' </summary>
        Public Sub AddEvent(span As SpanContext, eventName As String, Optional attributes As Dictionary(Of String, Object) = Nothing)
            If span IsNot Nothing AndAlso span.Events IsNot Nothing Then
                Dim evt As New SpanEvent()
                evt.Name = eventName
                evt.Timestamp = DateTime.UtcNow
                evt.Attributes = attributes
                span.Events.Add(evt)
            End If
        End Sub

        ''' <summary>
        ''' Records a verification request metric
        ''' </summary>
        Public Sub RecordVerification(status As String, Optional durationMs As Double = 0)
            Threading.Interlocked.Increment(_verificationCount)
            Threading.Interlocked.Increment(_requestCount)

            Debug.WriteLine($"[OTEL] Verification recorded: Status={status}, Duration={durationMs}ms")
        End Sub

        ''' <summary>
        ''' Records an API request metric
        ''' </summary>
        Public Sub RecordRequest(endpoint As String, method As String, statusCode As Integer, durationMs As Double)
            Threading.Interlocked.Increment(_requestCount)

            If statusCode >= 400 Then
                Threading.Interlocked.Increment(_errorCount)
            End If

            Debug.WriteLine($"[OTEL] Request recorded: {method} {endpoint} -> {statusCode} ({durationMs}ms)")
        End Sub

        ''' <summary>
        ''' Gets current metrics snapshot
        ''' </summary>
        Public Function GetMetrics() As TelemetryMetrics
            Return New TelemetryMetrics() With {
                .TotalRequests = _requestCount,
                .TotalErrors = _errorCount,
                .TotalVerifications = _verificationCount,
                .ActiveSpans = _activeSpans.Count,
                .ServiceName = _serviceName,
                .ServiceVersion = _serviceVersion,
                .Enabled = _enabled,
                .Endpoint = _otlpEndpoint
            }
        End Function

        ' =============================================
        ' Private Helper Methods
        ' =============================================

        Private Function GenerateTraceId() As String
            Dim bytes(15) As Byte
            Dim rng As New System.Security.Cryptography.RNGCryptoServiceProvider()
            rng.GetBytes(bytes)
            Return BitConverter.ToString(bytes).Replace("-", "").ToLower()
        End Function

        Private Function GenerateSpanId() As String
            Dim bytes(7) As Byte
            Dim rng As New System.Security.Cryptography.RNGCryptoServiceProvider()
            rng.GetBytes(bytes)
            Return BitConverter.ToString(bytes).Replace("-", "").ToLower()
        End Function

        Private Function GetTraceIdFromSpan(spanId As String) As String
            SyncLock _activeSpans
                If _activeSpans.ContainsKey(spanId) Then
                    Return _activeSpans(spanId).TraceId
                End If
            End SyncLock
            Return GenerateTraceId()
        End Function

        Private Async Sub ExportSpanAsync(span As SpanContext)
            Try
                Dim otlpSpan = ConvertToOtlpFormat(span)
                Dim json = JsonConvert.SerializeObject(otlpSpan)
                Dim content = New StringContent(json, Encoding.UTF8, "application/json")

                Dim response = Await _httpClient.PostAsync(_otlpEndpoint, content)
                If Not response.IsSuccessStatusCode Then
                    Debug.WriteLine($"[OTEL] Failed to export span: {response.StatusCode}")
                End If
            Catch ex As Exception
                Debug.WriteLine($"[OTEL] Export error: {ex.Message}")
            End Try
        End Sub

        Private Function ConvertToOtlpFormat(span As SpanContext) As Object
            Return New With {
                .resourceSpans = New Object() {
                    New With {
                        .resource = New With {
                            .attributes = New Object() {
                                New With {.key = "service.name", .value = New With {.stringValue = _serviceName}},
                                New With {.key = "service.version", .value = New With {.stringValue = _serviceVersion}}
                            }
                        },
                        .scopeSpans = New Object() {
                            New With {
                                .scope = New With {.name = "DHA.API", .version = "1.1.0"},
                                .spans = New Object() {
                                    New With {
                                        .traceId = span.TraceId,
                                        .spanId = span.SpanId,
                                        .parentSpanId = span.ParentSpanId,
                                        .name = span.OperationName,
                                        .kind = 2,
                                        .startTimeUnixNano = ToUnixNano(span.StartTime),
                                        .endTimeUnixNano = ToUnixNano(span.EndTime),
                                        .status = New With {.code = If(span.Status = "OK", 1, 2)},
                                        .attributes = ConvertAttributes(span.Attributes)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        End Function

        Private Function ToUnixNano(dt As DateTime?) As Long
            If Not dt.HasValue Then Return 0
            Return CLng((dt.Value.ToUniversalTime() - New DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds * 1000000)
        End Function

        Private Function ConvertAttributes(attrs As Dictionary(Of String, Object)) As Object()
            If attrs Is Nothing Then Return New Object() {}

            Dim result As New List(Of Object)()
            For Each kvp As KeyValuePair(Of String, Object) In attrs
                Dim valueObj As Object
                If TypeOf kvp.Value Is String Then
                    valueObj = New With {.stringValue = kvp.Value.ToString()}
                ElseIf TypeOf kvp.Value Is Integer OrElse TypeOf kvp.Value Is Long Then
                    valueObj = New With {.intValue = kvp.Value.ToString()}
                ElseIf TypeOf kvp.Value Is Double OrElse TypeOf kvp.Value Is Decimal Then
                    valueObj = New With {.doubleValue = CDbl(kvp.Value)}
                ElseIf TypeOf kvp.Value Is Boolean Then
                    valueObj = New With {.boolValue = CBool(kvp.Value)}
                Else
                    Dim strVal As String = If(kvp.Value IsNot Nothing, kvp.Value.ToString(), "")
                    valueObj = New With {.stringValue = strVal}
                End If
                result.Add(New With {.key = kvp.Key, .value = valueObj})
            Next
            Return result.ToArray()
        End Function

    End Class

    ''' <summary>
    ''' Represents a trace span context
    ''' </summary>
    Public Class SpanContext
        Public Property TraceId As String
        Public Property SpanId As String
        Public Property ParentSpanId As String
        Public Property OperationName As String
        Public Property StartTime As DateTime
        Public Property EndTime As DateTime?
        Public Property Duration As Double
        Public Property Status As String
        Public Property Attributes As Dictionary(Of String, Object)
        Public Property Events As List(Of SpanEvent)
    End Class

    ''' <summary>
    ''' Represents an event within a span
    ''' </summary>
    Public Class SpanEvent
        Public Property Name As String
        Public Property Timestamp As DateTime
        Public Property Attributes As Dictionary(Of String, Object)
    End Class

    ''' <summary>
    ''' Telemetry metrics snapshot
    ''' </summary>
    Public Class TelemetryMetrics
        Public Property TotalRequests As Long
        Public Property TotalErrors As Long
        Public Property TotalVerifications As Long
        Public Property ActiveSpans As Integer
        Public Property ServiceName As String
        Public Property ServiceVersion As String
        Public Property Enabled As Boolean
        Public Property Endpoint As String
    End Class

End Namespace
