Imports System
Imports System.Configuration
Imports System.Collections.Generic
Imports System.Threading

Namespace Services.RabbitMQ
    ''' <summary>
    ''' Manages the lifecycle of verification workers
    ''' </summary>
    Public Class WorkerManager
        Implements IDisposable

        Private Shared ReadOnly _lock As New Object()
        Private Shared _instance As WorkerManager
        Private ReadOnly _workers As New List(Of VerificationWorker)()
        Private _disposed As Boolean = False
        Private _started As Boolean = False

        ''' <summary>
        ''' Gets the singleton instance
        ''' </summary>
        Public Shared ReadOnly Property Instance As WorkerManager
            Get
                If _instance Is Nothing Then
                    SyncLock _lock
                        If _instance Is Nothing Then
                            _instance = New WorkerManager()
                        End If
                    End SyncLock
                End If
                Return _instance
            End Get
        End Property

        Private Sub New()
            ' Private constructor for singleton
        End Sub

        ''' <summary>
        ''' Initializes RabbitMQ topology and starts workers
        ''' </summary>
        Public Sub Initialize()
            If _started Then Return

            SyncLock _lock
                If _started Then Return

                Try
                    Console.WriteLine("[WorkerManager] Initializing batch verification system...")

                    ' First, declare RabbitMQ topology
                    Console.WriteLine("[WorkerManager] Declaring RabbitMQ exchanges and queues...")
                    RabbitMQConnectionManager.Instance.DeclareTopology()

                    ' Get worker count from config
                    Dim workerCountStr = ConfigurationManager.AppSettings("BatchWorkerCount")
                    Dim workerCount = If(Integer.TryParse(workerCountStr, Nothing), Integer.Parse(workerCountStr), 5)

                    Console.WriteLine($"[WorkerManager] Starting {workerCount} verification workers...")

                    ' Start workers
                    For i As Integer = 1 To workerCount
                        Dim worker As VerificationWorker = New VerificationWorker(i)
                        worker.Start()
                        _workers.Add(worker)
                    Next

                    _started = True
                    Console.WriteLine($"[WorkerManager] Successfully started {workerCount} workers")

                Catch ex As Exception
                    Console.WriteLine($"[WorkerManager] Failed to initialize: {ex.Message}")
                    Console.WriteLine("[WorkerManager] Batch verification will not be available")
                    ' Don't throw - allow API to continue running without batch support
                End Try
            End SyncLock
        End Sub

        ''' <summary>
        ''' Stops all workers gracefully
        ''' </summary>
        Public Sub Shutdown()
            If Not _started Then Return

            SyncLock _lock
                Console.WriteLine("[WorkerManager] Shutting down workers...")

                For Each worker As VerificationWorker In _workers
                    Try
                        worker.Stop()
                        worker.Dispose()
                    Catch ex As Exception
                        Console.WriteLine($"[WorkerManager] Error stopping worker: {ex.Message}")
                    End Try
                Next

                _workers.Clear()
                _started = False

                ' Dispose connection manager
                Try
                    RabbitMQConnectionManager.Instance.Dispose()
                Catch
                    ' Ignore
                End Try

                Console.WriteLine("[WorkerManager] All workers stopped")
            End SyncLock
        End Sub

        ''' <summary>
        ''' Gets the number of active workers
        ''' </summary>
        Public ReadOnly Property ActiveWorkerCount As Integer
            Get
                Return _workers.Count
            End Get
        End Property

        ''' <summary>
        ''' Checks if the worker system is running
        ''' </summary>
        Public ReadOnly Property IsRunning As Boolean
            Get
                Return _started
            End Get
        End Property

        Public Sub Dispose() Implements IDisposable.Dispose
            Dispose(True)
            GC.SuppressFinalize(Me)
        End Sub

        Protected Overridable Sub Dispose(disposing As Boolean)
            If Not _disposed Then
                If disposing Then
                    Shutdown()
                End If
                _disposed = True
            End If
        End Sub
    End Class
End Namespace
