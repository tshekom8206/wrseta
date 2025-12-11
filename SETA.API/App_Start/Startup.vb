' =============================================
' OWIN Startup Configuration
' Configures Web API for self-hosting
' =============================================

Imports System.Web.Http
Imports Owin
Imports Newtonsoft.Json
Imports Newtonsoft.Json.Serialization

Public Class Startup

    Public Sub Configuration(app As IAppBuilder)
        ' Configure Web API
        Dim config As New HttpConfiguration()

        ' JSON Serialization Settings
        config.Formatters.JsonFormatter.SerializerSettings.ContractResolver = New CamelCasePropertyNamesContractResolver()
        config.Formatters.JsonFormatter.SerializerSettings.DateTimeZoneHandling = DateTimeZoneHandling.Utc
        config.Formatters.JsonFormatter.SerializerSettings.NullValueHandling = NullValueHandling.Ignore

        ' Remove XML formatter (JSON only)
        config.Formatters.Remove(config.Formatters.XmlFormatter)

        ' Configure routing
        WebApiConfig.Register(config)

        ' Use Web API
        app.UseWebApi(config)
    End Sub

End Class
