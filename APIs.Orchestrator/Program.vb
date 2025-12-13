' =============================================
' APIs Orchestrator - Launches Both APIs
' W&RSETA Hackathon 2025
' Similar to .NET Aspire orchestration
' =============================================

Option Strict On
Option Explicit On

Imports System
Imports System.Diagnostics
Imports System.IO
Imports System.Threading
Imports System.Threading.Tasks

Module Program

    Private dhaApiProcess As Process = Nothing
    Private setaApiProcess As Process = Nothing
    Private cancellationTokenSource As CancellationTokenSource = Nothing

    ''' <summary>
    ''' Gets the solution root directory by finding the directory containing the .sln file
    ''' </summary>
    Private Function GetSolutionRoot() As String
        Dim currentDir As String = Directory.GetCurrentDirectory()
        Dim dir As New DirectoryInfo(currentDir)

        ' Walk up the directory tree to find the solution root
        While dir IsNot Nothing
            ' Check if this directory contains the solution file
            Dim slnFiles As String() = Directory.GetFiles(dir.FullName, "*.sln")
            If slnFiles.Length > 0 Then
                Return dir.FullName
            End If
            dir = dir.Parent
        End While

        ' Fallback: go up 3 levels from current directory (assuming we're in bin\Debug)
        Return Path.GetFullPath(Path.Combine(currentDir, "..", "..", ".."))
    End Function

    Sub Main()
        Console.ForegroundColor = ConsoleColor.Cyan
        Console.WriteLine("================================================")
        Console.WriteLine("  APIs ORCHESTRATOR")
        Console.WriteLine("  W&RSETA Hackathon 2025")
        Console.WriteLine("================================================")
        Console.ResetColor()
        Console.WriteLine()
        Console.WriteLine("Starting both APIs simultaneously...")
        Console.WriteLine()

        cancellationTokenSource = New CancellationTokenSource()

        Try
            ' Start both APIs
            StartDHAAPI()
            StartSETAAPI()

            ' Wait a moment for APIs to start
            Thread.Sleep(2000)

            ' Display status
            DisplayStatus()

            Console.WriteLine()
            Console.ForegroundColor = ConsoleColor.Yellow
            Console.WriteLine("Both APIs are running. Press ENTER to stop all services...")
            Console.ResetColor()
            Console.ReadLine()

        Catch ex As Exception
            Console.ForegroundColor = ConsoleColor.Red
            Console.WriteLine("Error: " & ex.Message)
            Console.WriteLine()
            Console.WriteLine("Details:")
            Console.WriteLine(ex.ToString())
            Console.ResetColor()
        Finally
            StopAllAPIs()
        End Try
    End Sub

    Private Sub StartDHAAPI()
        Try
            Console.ForegroundColor = ConsoleColor.Green
            Console.Write("[DHA.API] ")
            Console.ResetColor()
            Console.WriteLine("Starting on http://localhost:5000...")

            Dim solutionRoot As String = GetSolutionRoot()
            Dim dhaApiPath As String = Path.Combine(
                solutionRoot,
                "DHA.API", "bin", "Debug", "DHA.API.exe"
            )

            ' Resolve to absolute path
            dhaApiPath = Path.GetFullPath(dhaApiPath)

            Console.ForegroundColor = ConsoleColor.DarkGray
            Console.WriteLine("  Looking for: " & dhaApiPath)
            Console.ResetColor()

            If Not File.Exists(dhaApiPath) Then
                Throw New FileNotFoundException("DHA.API.exe not found at: " & dhaApiPath & vbCrLf &
                    "Please ensure DHA.API project is built in Debug configuration.")
            End If

            Dim startInfo As New ProcessStartInfo() With {
                .FileName = dhaApiPath,
                .UseShellExecute = True,
                .CreateNoWindow = False,
                .WorkingDirectory = Path.GetDirectoryName(dhaApiPath)
            }

            dhaApiProcess = Process.Start(startInfo)

            Console.ForegroundColor = ConsoleColor.Green
            Console.Write("[DHA.API] ")
            Console.ResetColor()
            Console.WriteLine("Started (PID: " & dhaApiProcess.Id & ")")
            Console.WriteLine()

        Catch ex As Exception
            Console.ForegroundColor = ConsoleColor.Red
            Console.Write("[DHA.API] ")
            Console.WriteLine("Failed to start: " & ex.Message)
            Console.ResetColor()
            Throw
        End Try
    End Sub

    Private Sub StartSETAAPI()
        Try
            Console.ForegroundColor = ConsoleColor.Green
            Console.Write("[SETA.API] ")
            Console.ResetColor()
            Console.WriteLine("Starting on http://localhost:5001...")

            Dim solutionRoot As String = GetSolutionRoot()
            Dim setaApiPath As String = Path.Combine(
                solutionRoot,
                "SETA.API", "bin", "Debug", "SETA.API.exe"
            )

            ' Resolve to absolute path
            setaApiPath = Path.GetFullPath(setaApiPath)

            Console.ForegroundColor = ConsoleColor.DarkGray
            Console.WriteLine("  Looking for: " & setaApiPath)
            Console.ResetColor()

            If Not File.Exists(setaApiPath) Then
                Throw New FileNotFoundException("SETA.API.exe not found at: " & setaApiPath & vbCrLf &
                    "Please ensure SETA.API project is built in Debug configuration.")
            End If

            Dim startInfo As New ProcessStartInfo() With {
                .FileName = setaApiPath,
                .UseShellExecute = True,
                .CreateNoWindow = False,
                .WorkingDirectory = Path.GetDirectoryName(setaApiPath)
            }

            setaApiProcess = Process.Start(startInfo)

            Console.ForegroundColor = ConsoleColor.Green
            Console.Write("[SETA.API] ")
            Console.ResetColor()
            Console.WriteLine("Started (PID: " & setaApiProcess.Id & ")")
            Console.WriteLine()

        Catch ex As Exception
            Console.ForegroundColor = ConsoleColor.Red
            Console.Write("[SETA.API] ")
            Console.WriteLine("Failed to start: " & ex.Message)
            Console.ResetColor()
            Throw
        End Try
    End Sub

    Private Sub DisplayStatus()
        Console.ForegroundColor = ConsoleColor.Cyan
        Console.WriteLine("================================================")
        Console.WriteLine("  APIs STATUS")
        Console.WriteLine("================================================")
        Console.ResetColor()
        Console.WriteLine()
        Console.WriteLine("DHA.API:")
        Console.WriteLine("  URL: http://localhost:5000")
        Console.WriteLine("  Swagger: http://localhost:5000/swagger")
        Console.WriteLine("  Health: http://localhost:5000/api/health")
        Console.WriteLine()
        Console.WriteLine("SETA.API:")
        Console.WriteLine("  URL: http://localhost:5001")
        Console.WriteLine("  Swagger: http://localhost:5001/swagger")
        Console.WriteLine("  Health: http://localhost:5001/api/health")
        Console.WriteLine()
        Console.ForegroundColor = ConsoleColor.Cyan
        Console.WriteLine("================================================")
        Console.ResetColor()
    End Sub

    Private Sub StopAllAPIs()
        Console.WriteLine()
        Console.ForegroundColor = ConsoleColor.Yellow
        Console.WriteLine("Stopping all APIs...")
        Console.ResetColor()

        cancellationTokenSource?.Cancel()

        Try
            If dhaApiProcess IsNot Nothing AndAlso Not dhaApiProcess.HasExited Then
                Console.Write("[DHA.API] ")
                dhaApiProcess.Kill()
                dhaApiProcess.WaitForExit(5000)
                dhaApiProcess.Dispose()
                Console.WriteLine("Stopped")
            End If
        Catch ex As Exception
            Console.ForegroundColor = ConsoleColor.Red
            Console.Write("[DHA.API] ")
            Console.WriteLine("Error stopping: " & ex.Message)
            Console.ResetColor()
        End Try

        Try
            If setaApiProcess IsNot Nothing AndAlso Not setaApiProcess.HasExited Then
                Console.Write("[SETA.API] ")
                setaApiProcess.Kill()
                setaApiProcess.WaitForExit(5000)
                setaApiProcess.Dispose()
                Console.WriteLine("Stopped")
            End If
        Catch ex As Exception
            Console.ForegroundColor = ConsoleColor.Red
            Console.Write("[SETA.API] ")
            Console.WriteLine("Error stopping: " & ex.Message)
            Console.ResetColor()
        End Try

        Console.WriteLine()
        Console.ForegroundColor = ConsoleColor.Green
        Console.WriteLine("All APIs stopped.")
        Console.ResetColor()
    End Sub

End Module
