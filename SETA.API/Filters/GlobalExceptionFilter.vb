Imports System.Net
Imports System.Net.Http
Imports System.Web.Http.Filters
Imports System.Web.Http
Imports SETA.API.Models
Imports SETA.API.Services

Namespace Filters

    ''' <summary>
    ''' Global exception filter for consistent error handling across all controllers
    ''' </summary>
    Public Class GlobalExceptionFilter
        Inherits ExceptionFilterAttribute

        Public Overrides Sub OnException(context As HttpActionExecutedContext)
            Dim requestId = GetOrCreateRequestId(context.Request)
            Dim path = context.Request.RequestUri.PathAndQuery

            ' Log the exception
            System.Diagnostics.Debug.WriteLine($"[{requestId}] Unhandled exception at {path}: {context.Exception.Message}")

            ' Try to get SETA ID for audit logging
            Dim setaId As Integer = 0
            If context.Request.Properties.ContainsKey("SetaId") Then
                setaId = CInt(context.Request.Properties("SetaId"))
            End If

            ' Log to audit trail if we have a SETA context
            If setaId > 0 Then
                AuditLogService.LogAsync(
                    setaId,
                    AuditLogService.ACTION_API_CALL,
                    "Exception",
                    details:=$"Error: {context.Exception.Message}",
                    success:=False)
            End If

            ' Determine error response based on exception type
            Dim errorResponse As ErrorResponse
            Dim statusCode As HttpStatusCode

            Select Case True
                Case TypeOf context.Exception Is ArgumentException,
                     TypeOf context.Exception Is ArgumentNullException
                    statusCode = HttpStatusCode.BadRequest
                    errorResponse = CreateErrorResponse(
                        requestId, path,
                        "INVALID_ARGUMENT",
                        context.Exception.Message)

                Case TypeOf context.Exception Is UnauthorizedAccessException
                    statusCode = HttpStatusCode.Unauthorized
                    errorResponse = CreateErrorResponse(
                        requestId, path,
                        "UNAUTHORIZED",
                        "Access denied")

                Case TypeOf context.Exception Is KeyNotFoundException
                    statusCode = HttpStatusCode.NotFound
                    errorResponse = CreateErrorResponse(
                        requestId, path,
                        "NOT_FOUND",
                        context.Exception.Message)

                Case TypeOf context.Exception Is InvalidOperationException
                    statusCode = HttpStatusCode.Conflict
                    errorResponse = CreateErrorResponse(
                        requestId, path,
                        "INVALID_OPERATION",
                        context.Exception.Message)

                Case TypeOf context.Exception Is TimeoutException
                    statusCode = HttpStatusCode.GatewayTimeout
                    errorResponse = CreateErrorResponse(
                        requestId, path,
                        "TIMEOUT",
                        "The operation timed out. Please try again.")

                Case TypeOf context.Exception Is System.Data.SqlClient.SqlException
                    statusCode = HttpStatusCode.ServiceUnavailable
                    errorResponse = CreateErrorResponse(
                        requestId, path,
                        "DATABASE_ERROR",
                        "A database error occurred. Please try again later.")

                Case TypeOf context.Exception Is HttpRequestException
                    statusCode = HttpStatusCode.BadGateway
                    errorResponse = CreateErrorResponse(
                        requestId, path,
                        "EXTERNAL_SERVICE_ERROR",
                        "An external service is unavailable. Please try again later.")

                Case Else
                    statusCode = HttpStatusCode.InternalServerError
                    errorResponse = CreateErrorResponse(
                        requestId, path,
                        "INTERNAL_ERROR",
                        "An unexpected error occurred. Please contact support if the problem persists.")
            End Select

            ' Create the response
            context.Response = context.Request.CreateResponse(statusCode, errorResponse)

            ' Add correlation ID to response header
            context.Response.Headers.Add("X-Request-ID", requestId)
        End Sub

        Private Function CreateErrorResponse(requestId As String, path As String, code As String, message As String) As ErrorResponse
            Return New ErrorResponse With {
                .Success = False,
                .RequestId = requestId,
                .Path = path,
                .[Error] = New ErrorDetail With {
                    .Code = code,
                    .Message = message
                }
            }
        End Function

        Private Function GetOrCreateRequestId(request As HttpRequestMessage) As String
            If request.Properties.ContainsKey("RequestId") Then
                Return request.Properties("RequestId").ToString()
            End If

            Dim requestId = Guid.NewGuid().ToString("N").Substring(0, 12).ToUpper()
            request.Properties("RequestId") = requestId
            Return requestId
        End Function

    End Class

End Namespace
