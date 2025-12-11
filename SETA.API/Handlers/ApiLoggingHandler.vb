Imports System.Net.Http
Imports System.Threading
Imports System.Threading.Tasks
Imports SETA.API.Services

Namespace Handlers

    ''' <summary>
    ''' HTTP Message Handler that logs all API requests for monitoring
    ''' </summary>
    Public Class ApiLoggingHandler
        Inherits DelegatingHandler

        Protected Overrides Async Function SendAsync(request As HttpRequestMessage, cancellationToken As CancellationToken) As Task(Of HttpResponseMessage)
            Dim startTime As DateTime = DateTime.UtcNow

            ' Process the request
            Dim response = Await MyBase.SendAsync(request, cancellationToken)

            ' Calculate response time
            Dim responseTimeMs As Integer = CInt((DateTime.UtcNow - startTime).TotalMilliseconds)

            ' Get API Key ID if available
            Dim apiKeyId As Integer = 0
            If request.Properties.ContainsKey("ApiKeyId") Then
                apiKeyId = CInt(request.Properties("ApiKeyId"))
            End If

            ' Only log if we have an API key (authenticated requests)
            If apiKeyId > 0 Then
                ' Get client IP
                Dim ipAddress = GetClientIpAddress(request)

                ' Get request body (for POST/PUT)
                Dim requestBody As String = Nothing
                If request.Content IsNot Nothing AndAlso
                   (request.Method = HttpMethod.Post OrElse request.Method = HttpMethod.Put) Then
                    Try
                        requestBody = Await request.Content.ReadAsStringAsync()
                    Catch
                        ' Ignore if we can't read the body
                    End Try
                End If

                ' Log the request asynchronously (fire and forget)
                ApiRequestLogService.LogRequestAsync(
                    apiKeyId,
                    request.RequestUri.PathAndQuery,
                    request.Method.Method,
                    CInt(response.StatusCode),
                    responseTimeMs,
                    ipAddress,
                    requestBody)
            End If

            Return response
        End Function

        Private Function GetClientIpAddress(request As HttpRequestMessage) As String
            ' Try to get IP from various headers (for proxied requests)
            If request.Headers.Contains("X-Forwarded-For") Then
                Return request.Headers.GetValues("X-Forwarded-For").FirstOrDefault()?.Split(","c).FirstOrDefault()?.Trim()
            End If

            If request.Headers.Contains("X-Real-IP") Then
                Return request.Headers.GetValues("X-Real-IP").FirstOrDefault()
            End If

            ' Fall back to remote endpoint
            If request.Properties.ContainsKey("MS_HttpContext") Then
                Dim ctx = request.Properties("MS_HttpContext")
                If ctx IsNot Nothing Then
                    Dim httpContext = TryCast(ctx, System.Web.HttpContextWrapper)
                    If httpContext IsNot Nothing Then
                        Return httpContext.Request.UserHostAddress
                    End If
                End If
            End If

            Return "unknown"
        End Function

    End Class

End Namespace
