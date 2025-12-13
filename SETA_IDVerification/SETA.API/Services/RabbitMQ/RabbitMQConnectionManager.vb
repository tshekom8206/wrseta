Imports System
Imports System.Configuration
Imports System.Threading
Imports RabbitMQ.Client
Imports RabbitMQ.Client.Events

Namespace Services.RabbitMQ
    ''' <summary>
    ''' Singleton manager for RabbitMQ connections with auto-recovery
    ''' </summary>
    Public Class RabbitMQConnectionManager
        Implements IDisposable

        Private Shared ReadOnly _lock As New Object()
        Private Shared _instance As RabbitMQConnectionManager
        Private _connection As IConnection
        Private _connectionFactory As ConnectionFactory
        Private _disposed As Boolean = False

        ' Exchange and queue names
        Public Const VERIFICATION_EXCHANGE As String = "seta.verification"
        Public Const RETRY_EXCHANGE As String = "seta.retry"
        Public Const DLX_EXCHANGE As String = "seta.dlx"
        Public Const VERIFICATION_QUEUE As String = "verification.jobs"
        Public Const RETRY_QUEUE As String = "verification.retry.queue"
        Public Const DLQ_QUEUE As String = "verification.dlq"
        Public Const VERIFICATION_ROUTING_KEY As String = "verification.job"
        Public Const RETRY_ROUTING_KEY As String = "verification.retry"
        Public Const DEAD_ROUTING_KEY As String = "verification.dead"

        ''' <summary>
        ''' Gets the singleton instance
        ''' </summary>
        Public Shared ReadOnly Property Instance As RabbitMQConnectionManager
            Get
                If _instance Is Nothing Then
                    SyncLock _lock
                        If _instance Is Nothing Then
                            _instance = New RabbitMQConnectionManager()
                        End If
                    End SyncLock
                End If
                Return _instance
            End Get
        End Property

        ''' <summary>
        ''' Private constructor for singleton pattern
        ''' </summary>
        Private Sub New()
            InitializeConnectionFactory()
        End Sub

        ''' <summary>
        ''' Initialize the connection factory with settings from App.config
        ''' </summary>
        Private Sub InitializeConnectionFactory()
            Dim host = ConfigurationManager.AppSettings("RabbitMQHost")
            Dim port = Integer.Parse(ConfigurationManager.AppSettings("RabbitMQPort"))
            Dim user = ConfigurationManager.AppSettings("RabbitMQUser")
            Dim password = ConfigurationManager.AppSettings("RabbitMQPassword")
            Dim vhost = ConfigurationManager.AppSettings("RabbitMQVHost")

            _connectionFactory = New ConnectionFactory() With {
                .HostName = If(String.IsNullOrEmpty(host), "localhost", host),
                .Port = If(port = 0, 5672, port),
                .UserName = If(String.IsNullOrEmpty(user), "guest", user),
                .Password = If(String.IsNullOrEmpty(password), "guest", password),
                .VirtualHost = If(String.IsNullOrEmpty(vhost), "/", vhost),
                .AutomaticRecoveryEnabled = True,
                .NetworkRecoveryInterval = TimeSpan.FromSeconds(10),
                .RequestedHeartbeat = TimeSpan.FromSeconds(30)
            }

            Console.WriteLine($"[RabbitMQ] Configured for {_connectionFactory.HostName}:{_connectionFactory.Port}, VHost: {_connectionFactory.VirtualHost}")
        End Sub

        ''' <summary>
        ''' Gets or creates the RabbitMQ connection
        ''' </summary>
        Public Function GetConnection() As IConnection
            If _connection Is Nothing OrElse Not _connection.IsOpen Then
                SyncLock _lock
                    If _connection Is Nothing OrElse Not _connection.IsOpen Then
                        Try
                            ' Diagnostic: Log RabbitMQ.Client assembly version
                            Dim clientAssembly = GetType(ConnectionFactory).Assembly
                            Console.WriteLine($"[RabbitMQ] Client library version: {clientAssembly.GetName().Version}")

                            ' Diagnostic: Log connection factory settings
                            Console.WriteLine($"[RabbitMQ] Connection settings:")
                            Console.WriteLine($"  - HostName: {_connectionFactory.HostName}")
                            Console.WriteLine($"  - Port: {_connectionFactory.Port}")
                            Console.WriteLine($"  - VirtualHost: {_connectionFactory.VirtualHost}")
                            Console.WriteLine($"  - UserName: {_connectionFactory.UserName}")
                            Console.WriteLine($"  - AutomaticRecovery: {_connectionFactory.AutomaticRecoveryEnabled}")

                            ' Diagnostic: Test raw TCP connection first
                            Console.WriteLine($"[RabbitMQ] Testing TCP connection to {_connectionFactory.HostName}:{_connectionFactory.Port}...")
                            Try
                                Using tcpClient As New System.Net.Sockets.TcpClient()
                                    Dim connectTask = tcpClient.ConnectAsync(_connectionFactory.HostName, _connectionFactory.Port)
                                    If connectTask.Wait(5000) Then
                                        Console.WriteLine($"[RabbitMQ] TCP connection successful - port is reachable")
                                    Else
                                        Console.WriteLine($"[RabbitMQ] TCP connection timed out after 5 seconds")
                                    End If
                                End Using
                            Catch tcpEx As Exception
                                Console.WriteLine($"[RabbitMQ] TCP connection failed: {tcpEx.GetType().Name} - {tcpEx.Message}")
                            End Try

                            ' Now try the actual RabbitMQ connection
                            Console.WriteLine("[RabbitMQ] Attempting AMQP connection...")
                            _connection = _connectionFactory.CreateConnection("SETA.API.BatchVerification")
                            Console.WriteLine("[RabbitMQ] Connection established successfully")

                            ' Set up connection event handlers
                            AddHandler _connection.ConnectionShutdown, AddressOf OnConnectionShutdown
                            AddHandler _connection.ConnectionBlocked, AddressOf OnConnectionBlocked
                            AddHandler _connection.ConnectionUnblocked, AddressOf OnConnectionUnblocked
                        Catch ex As Exception
                            ' Detailed exception logging
                            Console.WriteLine($"[RabbitMQ] Failed to create connection:")
                            Console.WriteLine($"  - Exception Type: {ex.GetType().FullName}")
                            Console.WriteLine($"  - Message: {ex.Message}")
                            If ex.InnerException IsNot Nothing Then
                                Console.WriteLine($"  - Inner Exception Type: {ex.InnerException.GetType().FullName}")
                                Console.WriteLine($"  - Inner Exception: {ex.InnerException.Message}")
                                If ex.InnerException.InnerException IsNot Nothing Then
                                    Console.WriteLine($"  - Inner Inner Exception: {ex.InnerException.InnerException.Message}")
                                End If
                            End If
                            Console.WriteLine($"  - Stack Trace: {ex.StackTrace}")
                            Throw
                        End Try
                    End If
                End SyncLock
            End If
            Return _connection
        End Function

        ''' <summary>
        ''' Creates a new channel from the connection
        ''' </summary>
        Public Function CreateChannel() As IModel
            Return GetConnection().CreateModel()
        End Function

        ''' <summary>
        ''' Declares all exchanges and queues for batch verification
        ''' </summary>
        Public Sub DeclareTopology()
            Using channel = CreateChannel()
                Console.WriteLine("[RabbitMQ] Declaring exchanges and queues...")

                ' Dead Letter Exchange (must be declared first)
                channel.ExchangeDeclare(
                    exchange:=DLX_EXCHANGE,
                    type:=ExchangeType.Direct,
                    durable:=True,
                    autoDelete:=False,
                    arguments:=Nothing
                )

                ' Dead Letter Queue
                channel.QueueDeclare(
                    queue:=DLQ_QUEUE,
                    durable:=True,
                    exclusive:=False,
                    autoDelete:=False,
                    arguments:=Nothing
                )
                channel.QueueBind(queue:=DLQ_QUEUE, exchange:=DLX_EXCHANGE, routingKey:=DEAD_ROUTING_KEY, arguments:=Nothing)

                ' Retry Exchange
                channel.ExchangeDeclare(
                    exchange:=RETRY_EXCHANGE,
                    type:=ExchangeType.Direct,
                    durable:=True,
                    autoDelete:=False,
                    arguments:=Nothing
                )

                ' Main Verification Exchange
                channel.ExchangeDeclare(
                    exchange:=VERIFICATION_EXCHANGE,
                    type:=ExchangeType.Direct,
                    durable:=True,
                    autoDelete:=False,
                    arguments:=Nothing
                )

                ' Main Verification Queue with DLX
                Dim verificationQueueArgs = New Dictionary(Of String, Object) From {
                    {"x-dead-letter-exchange", DLX_EXCHANGE},
                    {"x-dead-letter-routing-key", DEAD_ROUTING_KEY}
                }
                channel.QueueDeclare(
                    queue:=VERIFICATION_QUEUE,
                    durable:=True,
                    exclusive:=False,
                    autoDelete:=False,
                    arguments:=verificationQueueArgs
                )
                channel.QueueBind(queue:=VERIFICATION_QUEUE, exchange:=VERIFICATION_EXCHANGE, routingKey:=VERIFICATION_ROUTING_KEY, arguments:=Nothing)

                ' Retry Queue - messages here will be re-routed back to main queue after TTL
                ' TTL is set per-message when publishing
                Dim retryQueueArgs = New Dictionary(Of String, Object) From {
                    {"x-dead-letter-exchange", VERIFICATION_EXCHANGE},
                    {"x-dead-letter-routing-key", VERIFICATION_ROUTING_KEY}
                }
                channel.QueueDeclare(
                    queue:=RETRY_QUEUE,
                    durable:=True,
                    exclusive:=False,
                    autoDelete:=False,
                    arguments:=retryQueueArgs
                )
                channel.QueueBind(queue:=RETRY_QUEUE, exchange:=RETRY_EXCHANGE, routingKey:=RETRY_ROUTING_KEY, arguments:=Nothing)

                Console.WriteLine("[RabbitMQ] Topology declared successfully:")
                Console.WriteLine($"  - Exchange: {VERIFICATION_EXCHANGE} -> Queue: {VERIFICATION_QUEUE}")
                Console.WriteLine($"  - Exchange: {RETRY_EXCHANGE} -> Queue: {RETRY_QUEUE}")
                Console.WriteLine($"  - Exchange: {DLX_EXCHANGE} -> Queue: {DLQ_QUEUE}")
            End Using
        End Sub

        ''' <summary>
        ''' Checks if RabbitMQ is healthy
        ''' </summary>
        Public Function IsHealthy() As Boolean
            Try
                If _connection IsNot Nothing AndAlso _connection.IsOpen Then
                    Using channel = CreateChannel()
                        ' Try to declare a passive queue check
                        Return channel.IsOpen
                    End Using
                End If
                Return False
            Catch
                Return False
            End Try
        End Function

        ''' <summary>
        ''' Gets queue message count
        ''' </summary>
        Public Function GetQueueMessageCount(queueName As String) As UInteger
            Try
                Using channel = CreateChannel()
                    Dim result = channel.QueueDeclarePassive(queueName)
                    Return result.MessageCount
                End Using
            Catch
                Return 0
            End Try
        End Function

        Private Sub OnConnectionShutdown(sender As Object, e As ShutdownEventArgs)
            Console.WriteLine($"[RabbitMQ] Connection shutdown: {e.ReplyText}")
        End Sub

        Private Sub OnConnectionBlocked(sender As Object, e As ConnectionBlockedEventArgs)
            Console.WriteLine($"[RabbitMQ] Connection blocked: {e.Reason}")
        End Sub

        Private Sub OnConnectionUnblocked(sender As Object, e As EventArgs)
            Console.WriteLine("[RabbitMQ] Connection unblocked")
        End Sub

        ''' <summary>
        ''' Dispose of resources
        ''' </summary>
        Public Sub Dispose() Implements IDisposable.Dispose
            Dispose(True)
            GC.SuppressFinalize(Me)
        End Sub

        Protected Overridable Sub Dispose(disposing As Boolean)
            If Not _disposed Then
                If disposing Then
                    If _connection IsNot Nothing Then
                        Try
                            _connection.Close()
                            _connection.Dispose()
                        Catch
                            ' Ignore errors during dispose
                        End Try
                    End If
                End If
                _disposed = True
            End If
        End Sub

        Protected Overrides Sub Finalize()
            Dispose(False)
        End Sub
    End Class
End Namespace
