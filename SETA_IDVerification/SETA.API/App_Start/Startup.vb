' =============================================
' OWIN Startup Configuration
' Configures Web API for self-hosting
' =============================================

Imports System.Web.Http
Imports System.Web.Http.Cors
Imports Owin
Imports Newtonsoft.Json
Imports Newtonsoft.Json.Serialization
Imports SETA.API.Filters
Imports SETA.API.Handlers
Imports SETA.API.Services.RabbitMQ

Public Class Startup

    Private Shared _workersInitialized As Boolean = False

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

        ' 2. API Logging Handler - logs all requests
        config.MessageHandlers.Add(New ApiLoggingHandler())

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

        System.Diagnostics.Debug.WriteLine("SETA API configured with CORS, message handlers, and exception filter")

        ' =============================================
        ' Initialize RabbitMQ Workers for Batch Processing
        ' =============================================
        If Not _workersInitialized Then
            Try
                System.Threading.Tasks.Task.Run(Sub()
                    ' Delay slightly to let the API fully start
                    System.Threading.Thread.Sleep(2000)
                    WorkerManager.Instance.Initialize()
                End Sub)
                _workersInitialized = True
            Catch ex As Exception
                Console.WriteLine($"[Startup] Warning: Failed to start batch workers: {ex.Message}")
                ' Continue - batch processing won't be available but API will work
            End Try
        End If
    End Sub

    ''' <summary>
    ''' Shuts down the worker manager gracefully
    ''' </summary>
    Public Shared Sub Shutdown()
        Try
            WorkerManager.Instance.Shutdown()
        Catch ex As Exception
            Console.WriteLine($"[Startup] Error during shutdown: {ex.Message}")
        End Try
    End Sub

End Class
