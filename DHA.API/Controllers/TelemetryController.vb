' =============================================
' Telemetry Controller
' Exposes OpenTelemetry metrics and configuration
' =============================================

Imports System.Web.Http
Imports DHA.API.DHA.API.Services
Imports DHA.API.Services

Namespace DHA.API.Controllers

    ''' <summary>
    ''' Provides telemetry and observability endpoints
    ''' </summary>
    <RoutePrefix("api/telemetry")>
    Public Class TelemetryController
        Inherits ApiController

        ' =============================================
        ' GET /api/telemetry/metrics
        ' Returns current telemetry metrics
        ' =============================================
        <Route("metrics")>
        <HttpGet>
        Public Function GetMetrics() As IHttpActionResult
            Try
                Dim metrics = TelemetryService.Instance.GetMetrics()

                Return Ok(New With {
                    .success = True,
                    .data = New With {
                        .metrics = New With {
                            .totalRequests = metrics.TotalRequests,
                            .totalErrors = metrics.TotalErrors,
                            .totalVerifications = metrics.TotalVerifications,
                            .errorRate = If(metrics.TotalRequests > 0,
                                Math.Round(CDbl(metrics.TotalErrors) / metrics.TotalRequests * 100, 2), 0)
                        },
                        .tracing = New With {
                            .activeSpans = metrics.ActiveSpans,
                            .enabled = metrics.Enabled,
                            .endpoint = metrics.Endpoint
                        },
                        .service = New With {
                            .name = metrics.ServiceName,
                            .version = metrics.ServiceVersion
                        }
                    },
                    .timestamp = DateTime.UtcNow
                })
            Catch ex As Exception
                Return InternalServerError(ex)
            End Try
        End Function

        ' =============================================
        ' GET /api/telemetry/status
        ' Returns telemetry configuration status
        ' =============================================
        <Route("status")>
        <HttpGet>
        Public Function GetStatus() As IHttpActionResult
            Try
                Dim metrics = TelemetryService.Instance.GetMetrics()

                Return Ok(New With {
                    .success = True,
                    .data = New With {
                        .telemetryEnabled = metrics.Enabled,
                        .otlpEndpoint = metrics.Endpoint,
                        .serviceName = metrics.ServiceName,
                        .serviceVersion = metrics.ServiceVersion,
                        .features = New With {
                            .distributedTracing = metrics.Enabled,
                            .metricsCollection = True,
                            .correlationIds = True,
                            .requestLogging = True
                        },
                        .exporters = New With {
                            .otlp = New With {
                                .enabled = metrics.Enabled,
                                .protocol = "http/protobuf",
                                .endpoint = metrics.Endpoint
                            },
                            .console = New With {
                                .enabled = True
                            }
                        }
                    },
                    .timestamp = DateTime.UtcNow
                })
            Catch ex As Exception
                Return InternalServerError(ex)
            End Try
        End Function

        ' =============================================
        ' GET /api/telemetry/prometheus
        ' Returns metrics in Prometheus format
        ' =============================================
        <Route("prometheus")>
        <HttpGet>
        Public Function GetPrometheusMetrics() As IHttpActionResult
            Try
                Dim metrics = TelemetryService.Instance.GetMetrics()
                Dim sb As New System.Text.StringBuilder()

                ' Prometheus format metrics
                sb.AppendLine("# HELP dha_api_requests_total Total number of API requests")
                sb.AppendLine("# TYPE dha_api_requests_total counter")
                sb.AppendLine($"dha_api_requests_total {metrics.TotalRequests}")
                sb.AppendLine()

                sb.AppendLine("# HELP dha_api_errors_total Total number of API errors")
                sb.AppendLine("# TYPE dha_api_errors_total counter")
                sb.AppendLine($"dha_api_errors_total {metrics.TotalErrors}")
                sb.AppendLine()

                sb.AppendLine("# HELP dha_verifications_total Total number of ID verifications")
                sb.AppendLine("# TYPE dha_verifications_total counter")
                sb.AppendLine($"dha_verifications_total {metrics.TotalVerifications}")
                sb.AppendLine()

                sb.AppendLine("# HELP dha_active_spans Current number of active trace spans")
                sb.AppendLine("# TYPE dha_active_spans gauge")
                sb.AppendLine($"dha_active_spans {metrics.ActiveSpans}")
                sb.AppendLine()

                sb.AppendLine("# HELP dha_api_info API service information")
                sb.AppendLine("# TYPE dha_api_info gauge")
                sb.AppendLine($"dha_api_info{{service=""{metrics.ServiceName}"",version=""{metrics.ServiceVersion}""}} 1")

                Dim response = Request.CreateResponse(Net.HttpStatusCode.OK)
                response.Content = New Net.Http.StringContent(sb.ToString(), System.Text.Encoding.UTF8, "text/plain")
                Return ResponseMessage(response)
            Catch ex As Exception
                Return InternalServerError(ex)
            End Try
        End Function

        ' =============================================
        ' POST /api/telemetry/trace
        ' Creates a manual trace span (for testing)
        ' =============================================
        <Route("trace")>
        <HttpPost>
        Public Function CreateTestTrace() As IHttpActionResult
            Try
                Dim span = TelemetryService.Instance.StartSpan("test-trace")
                TelemetryService.Instance.SetAttribute(span, "test.type", "manual")
                TelemetryService.Instance.SetAttribute(span, "test.timestamp", DateTime.UtcNow.ToString("o"))
                TelemetryService.Instance.AddEvent(span, "test-event-started")

                ' Simulate some work
                System.Threading.Thread.Sleep(100)

                TelemetryService.Instance.AddEvent(span, "test-event-completed")
                TelemetryService.Instance.EndSpan(span, "OK")

                Return Ok(New With {
                    .success = True,
                    .data = New With {
                        .traceId = span.TraceId,
                        .spanId = span.SpanId,
                        .operationName = span.OperationName,
                        .durationMs = span.Duration,
                        .status = span.Status,
                        .message = "Test trace created and exported"
                    },
                    .timestamp = DateTime.UtcNow
                })
            Catch ex As Exception
                Return InternalServerError(ex)
            End Try
        End Function

    End Class

End Namespace
