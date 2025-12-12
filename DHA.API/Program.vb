' =============================================
' DHA ID Verification API - Self-Hosted Server
' W&RSETA Hackathon 2025
' =============================================

Option Strict On
Option Explicit On

Imports System
Imports Microsoft.Owin.Hosting
Imports Owin

Module Program

    Private Const BaseUrl As String = "http://localhost:5000"

    Sub Main()
        Console.ForegroundColor = ConsoleColor.Cyan
        Console.WriteLine("================================================")
            Console.WriteLine("  DHA ID VERIFICATION API")
            Console.WriteLine("  W&RSETA Hackathon 2025")
        Console.WriteLine("================================================")
        Console.ResetColor()
        Console.WriteLine()

        Dim server As IDisposable = Nothing

        Try
            ' Start OWIN host using Action delegate
            Dim configAction As Action(Of IAppBuilder) = AddressOf ConfigureApp
            server = WebApp.Start(BaseUrl, configAction)

            Console.ForegroundColor = ConsoleColor.Green
            Console.WriteLine("API Server started successfully!")
            Console.WriteLine("Base URL: " & BaseUrl)
            Console.ResetColor()
            Console.WriteLine()
            Console.WriteLine("Available Endpoints:")
            Console.WriteLine("--------------------------------------------")
            Console.WriteLine("  GET  /api/health            - Health check")
            Console.WriteLine("  GET  /api/telemetry/metrics - Telemetry metrics")
            Console.WriteLine("  POST /api/dha/data/add-person - Add person to DB")
            Console.WriteLine("  GET  /api/dha/data/person/{id} - Get person by ID")
            Console.WriteLine("  GET  /api/dha/data/test-connection - Test DB")
            Console.WriteLine("  GET  /swagger              - API documentation")
            Console.WriteLine("--------------------------------------------")
            Console.WriteLine()
            Console.ForegroundColor = ConsoleColor.Magenta
            Console.WriteLine("API Documentation:")
            Console.WriteLine("  " & BaseUrl & "/swagger")
            Console.ResetColor()
            Console.WriteLine("--------------------------------------------")
            Console.WriteLine()
            Console.ForegroundColor = ConsoleColor.Yellow
            Console.WriteLine("Press ENTER to stop the server...")
            Console.ResetColor()
            Console.ReadLine()
        Catch ex As Exception
            Console.ForegroundColor = ConsoleColor.Red
            Console.WriteLine("Error starting server: " & ex.Message)
            Console.WriteLine()
            Console.WriteLine("Details:")
            Console.WriteLine(ex.ToString())
            Console.ResetColor()
            Console.WriteLine()
            Console.WriteLine("Press any key to exit...")
            Console.ReadKey()
        Finally
            If server IsNot Nothing Then
                server.Dispose()
            End If
        End Try
    End Sub

    Private Sub ConfigureApp(app As IAppBuilder)
        Dim startupInstance As New Startup()
        startupInstance.Configuration(app)
    End Sub

End Module
