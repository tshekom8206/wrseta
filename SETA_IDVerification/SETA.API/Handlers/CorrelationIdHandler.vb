Imports System.Net.Http
Imports System.Threading
Imports System.Threading.Tasks

Namespace Handlers

    ''' <summary>
    ''' HTTP Message Handler that adds correlation IDs to all requests and responses
    ''' Correlation IDs are used for tracing requests across distributed systems
    ''' </summary>
    Public Class CorrelationIdHandler
        Inherits DelegatingHandler

        Public Const CORRELATION_ID_HEADER As String = "X-Request-ID"
        Public Const CORRELATION_ID_PROPERTY As String = "RequestId"

        Protected Overrides Async Function SendAsync(request As HttpRequestMessage, cancellationToken As CancellationToken) As Task(Of HttpResponseMessage)
            ' Check if correlation ID was provided in request header
            Dim correlationId As String = Nothing

            If request.Headers.Contains(CORRELATION_ID_HEADER) Then
                correlationId = request.Headers.GetValues(CORRELATION_ID_HEADER).FirstOrDefault()
            End If

            ' Generate new correlation ID if not provided
            If String.IsNullOrEmpty(correlationId) Then
                correlationId = GenerateCorrelationId()
            End If

            ' Store in request properties for use by controllers
            request.Properties(CORRELATION_ID_PROPERTY) = correlationId

            ' Record start time for response time tracking
            Dim startTime As DateTime = DateTime.UtcNow
            request.Properties("StartTime") = startTime

            ' Process the request
            Dim response = Await MyBase.SendAsync(request, cancellationToken)

            ' Add correlation ID to response headers
            If Not response.Headers.Contains(CORRELATION_ID_HEADER) Then
                response.Headers.Add(CORRELATION_ID_HEADER, correlationId)
            End If

            ' Add processing time header
            Dim processingTime As Double = (DateTime.UtcNow - startTime).TotalMilliseconds
            If Not response.Headers.Contains("X-Processing-Time-Ms") Then
                response.Headers.Add("X-Processing-Time-Ms", CInt(processingTime).ToString())
            End If

            Return response
        End Function

        Private Function GenerateCorrelationId() As String
            ' Generate a 12-character uppercase alphanumeric ID
            ' Format: YYYYMMDD-XXXX (date + random)
            Dim datePart = DateTime.UtcNow.ToString("yyyyMMdd")
            Dim randomPart = Guid.NewGuid().ToString("N").Substring(0, 4).ToUpper()
            Return $"{datePart}-{randomPart}"
        End Function

    End Class

End Namespace
