Imports System.Web.Http
Imports Newtonsoft.Json.Serialization

Public Module WebApiConfig
    Public Sub Register(ByVal config As HttpConfiguration)
        ' Enable attribute routing
        config.MapHttpAttributeRoutes()

        ' Convention-based routing
        config.Routes.MapHttpRoute(
            name:="DefaultApi",
            routeTemplate:="api/{controller}/{id}",
            defaults:=New With {.id = RouteParameter.Optional}
        )

        ' Configure JSON formatter
        config.Formatters.JsonFormatter.SerializerSettings.ContractResolver = New CamelCasePropertyNamesContractResolver()
        config.Formatters.JsonFormatter.SerializerSettings.DateFormatString = "yyyy-MM-ddTHH:mm:ssZ"
        config.Formatters.JsonFormatter.SerializerSettings.NullValueHandling = Newtonsoft.Json.NullValueHandling.Ignore

        ' Remove XML formatter (JSON only API)
        config.Formatters.Remove(config.Formatters.XmlFormatter)
    End Sub
End Module
