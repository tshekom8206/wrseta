Imports System.Web.Http

Namespace DHA.API
    Public Class WebApiApplication
        Inherits System.Web.HttpApplication

        Protected Sub Application_Start()
            GlobalConfiguration.Configure(AddressOf WebApiConfig.Register)
        End Sub

    End Class
End Namespace
