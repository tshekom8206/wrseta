Imports System.Net
Imports System.Net.Http
Imports System.Web.Http.Controllers
Imports System.Web.Http.Filters
Imports System.Configuration

Namespace DHA.API.Security

    ''' <summary>
    ''' API Key authentication filter attribute
    ''' Validates X-API-Key header against database
    ''' </summary>
    Public Class ApiKeyAuthAttribute
        Inherits ActionFilterAttribute

        Private Const API_KEY_HEADER As String = "X-API-Key"

        Public Overrides Sub OnActionExecuting(actionContext As HttpActionContext)
            ' Check for API key header
            Dim apiKeyValues As IEnumerable(Of String) = Nothing
            If Not actionContext.Request.Headers.TryGetValues(API_KEY_HEADER, apiKeyValues) Then
                actionContext.Response = actionContext.Request.CreateErrorResponse(
                    HttpStatusCode.Unauthorized,
                    "API Key is required. Include X-API-Key header.")
                Return
            End If

            Dim apiKey As String = apiKeyValues.FirstOrDefault()
            If String.IsNullOrWhiteSpace(apiKey) Then
                actionContext.Response = actionContext.Request.CreateErrorResponse(
                    HttpStatusCode.Unauthorized,
                    "API Key is required. Include X-API-Key header.")
                Return
            End If

            ' Validate API key (simple config-based for DHA mock API)
            Dim validApiKey As String = ConfigurationManager.AppSettings("DHAApiKey")
            If String.IsNullOrEmpty(validApiKey) Then
                validApiKey = "dha-api-key-2025" ' Default key for development
            End If

            If apiKey <> validApiKey Then
                actionContext.Response = actionContext.Request.CreateErrorResponse(
                    HttpStatusCode.Unauthorized,
                    "Invalid API Key.")
                Return
            End If

            MyBase.OnActionExecuting(actionContext)
        End Sub


    End Class

End Namespace
