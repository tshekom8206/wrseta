Imports System.Net
Imports System.Net.Http
Imports System.Web.Http
Imports System.Data.SqlClient
Imports System.Configuration
Imports DHA.API.Models

Namespace DHA.API.Controllers

    ''' <summary>
    ''' Health check controller for monitoring and load balancer probes
    ''' No authentication required for basic health checks
    ''' </summary>
    <RoutePrefix("api/health")>
    Public Class HealthController
        Inherits ApiController

        ''' <summary>
        ''' Basic health check - returns OK if API is running
        ''' Used by load balancers and monitoring tools
        ''' </summary>
        <Route("")>
        <HttpGet>
        Public Function GetHealth() As IHttpActionResult
            Return Ok(New With {
                .status = "healthy",
                .timestamp = DateTime.UtcNow,
                .version = "1.1.0",
                .service = "DHA.API"
            })
        End Function

        ''' <summary>
        ''' Detailed health check - checks database connectivity
        ''' </summary>
        <Route("detailed")>
        <HttpGet>
        Public Function GetDetailedHealth() As IHttpActionResult
            Dim dbStatus = "healthy"
            Dim dbMessage = "Connected"
            Dim dbResponseTime As Integer = 0

            ' Check database connectivity
            Try
                Dim sw = System.Diagnostics.Stopwatch.StartNew()
                Dim connectionString As String = ConfigurationManager.ConnectionStrings("DHAConnection").ConnectionString

                Using conn As New SqlConnection(connectionString)
                    conn.Open()
                    Using cmd As New SqlCommand("SELECT 1", conn)
                        cmd.ExecuteScalar()
                    End Using
                End Using

                sw.Stop()
                dbResponseTime = CInt(sw.ElapsedMilliseconds)
            Catch ex As Exception
                dbStatus = "unhealthy"
                dbMessage = ex.Message
            End Try

            Dim overallStatus = If(dbStatus = "healthy", "healthy", "degraded")

            Return Ok(New With {
                .status = overallStatus,
                .timestamp = DateTime.UtcNow,
                .version = "1.1.0",
                .service = "DHA.API",
                .checks = New With {
                    .database = New With {
                        .status = dbStatus,
                        .message = dbMessage,
                        .responseTimeMs = dbResponseTime
                    },
                    .api = New With {
                        .status = "healthy",
                        .uptime = GetUptime()
                    }
                }
            })
        End Function

        ''' <summary>
        ''' Readiness probe - checks if API is ready to accept traffic
        ''' </summary>
        <Route("ready")>
        <HttpGet>
        Public Function GetReadiness() As IHttpActionResult
            Try
                ' Check database
                Dim connectionString As String = ConfigurationManager.ConnectionStrings("DHAConnection").ConnectionString
                Using conn As New SqlConnection(connectionString)
                    conn.Open()
                    Using cmd As New SqlCommand("SELECT COUNT(*) FROM People WHERE IsActive = 1", conn)
                        Dim personCount = CInt(cmd.ExecuteScalar())
                        ' Database is ready if we can query it
                    End Using
                End Using

                Return Ok(New With {
                    .status = "ready",
                    .timestamp = DateTime.UtcNow
                })
            Catch ex As Exception
                Return Content(HttpStatusCode.ServiceUnavailable, New With {
                    .status = "not_ready",
                    .reason = ex.Message
                })
            End Try
        End Function

        ''' <summary>
        ''' Liveness probe - basic check that process is alive
        ''' </summary>
        <Route("live")>
        <HttpGet>
        Public Function GetLiveness() As IHttpActionResult
            Return Ok(New With {
                .status = "alive",
                .timestamp = DateTime.UtcNow
            })
        End Function

        Private Shared ReadOnly _startTime As DateTime = DateTime.UtcNow

        Private Function GetUptime() As String
            Dim uptime = DateTime.UtcNow - _startTime
            Return $"{uptime.Days}d {uptime.Hours}h {uptime.Minutes}m {uptime.Seconds}s"
        End Function

    End Class

End Namespace
