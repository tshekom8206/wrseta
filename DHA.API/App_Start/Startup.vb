' =============================================
' OWIN Startup Configuration
' Configures Web API for self-hosting
' =============================================

Imports System.Web.Http
Imports System.Web.Http.Cors
Imports Owin
Imports Newtonsoft.Json
Imports Newtonsoft.Json.Serialization
Imports DHA.API.Filters
Imports DHA.API.Handlers
Imports DHA.API.DHA.API.Handlers
Imports DHA.API.DHA.API.Filters

Public Class Startup

    Public Sub Configuration(app As IAppBuilder)
        ' Configure Web API
        Dim config As New HttpConfiguration()

        ' =============================================
        ' CORS Configuration
        ' Allow cross-origin requests from LMS systems
        ' =============================================
        Dim corsOrigins As String = System.Configuration.ConfigurationManager.AppSettings("CorsOrigins")
        If String.IsNullOrEmpty(corsOrigins) Then
            corsOrigins = "*" ' Allow all origins in development
        End If

        Dim corsPolicy As New EnableCorsAttribute(corsOrigins, "*", "GET, POST, PUT, DELETE, OPTIONS")
        config.EnableCors(corsPolicy)

        ' =============================================
        ' Message Handlers Pipeline
        ' Order matters: first handler runs first
        ' =============================================
        ' 1. Correlation ID Handler - adds request tracing
        config.MessageHandlers.Add(New CorrelationIdHandler())

        ' =============================================
        ' Global Exception Filter
        ' Provides consistent error responses
        ' =============================================
        config.Filters.Add(New GlobalExceptionFilter())

        ' =============================================
        ' JSON Serialization Settings
        ' =============================================
        config.Formatters.JsonFormatter.SerializerSettings.ContractResolver = New CamelCasePropertyNamesContractResolver()
        config.Formatters.JsonFormatter.SerializerSettings.DateTimeZoneHandling = DateTimeZoneHandling.Utc
        config.Formatters.JsonFormatter.SerializerSettings.NullValueHandling = NullValueHandling.Ignore

        ' Remove XML formatter (JSON only)
        config.Formatters.Remove(config.Formatters.XmlFormatter)

        ' Configure routing
        WebApiConfig.Register(config)

        ' Use Web API
        app.UseWebApi(config)

        System.Diagnostics.Debug.WriteLine("DHA API configured with CORS, message handlers, and exception filter")
    End Sub

End Class
