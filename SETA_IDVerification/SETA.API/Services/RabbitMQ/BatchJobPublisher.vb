Imports System
Imports System.Configuration
Imports System.Text
Imports Newtonsoft.Json
Imports RabbitMQ.Client
Imports SETA.API.Models

Namespace Services.RabbitMQ
    ''' <summary>
    ''' Publishes batch verification jobs to RabbitMQ
    ''' </summary>
    Public Class BatchJobPublisher
        Private ReadOnly _connectionManager As RabbitMQConnectionManager

        Public Sub New()
            _connectionManager = RabbitMQConnectionManager.Instance
        End Sub

        ''' <summary>
        ''' Submits a batch of ID numbers for verification
        ''' Returns the batch job ID
        ''' </summary>
        Public Function SubmitBatch(request As BatchVerificationSubmitRequest) As String
            If request Is Nothing OrElse request.IdNumbers Is Nothing OrElse request.IdNumbers.Count = 0 Then
                Throw New ArgumentException("Request must contain at least one ID number")
            End If

            If request.IdNumbers.Count > 500 Then
                Throw New ArgumentException("Maximum 500 ID numbers per batch")
            End If

            Dim batchJobId = GenerateBatchJobId()
            Dim totalItems = request.IdNumbers.Count
            Dim maxRetries = Integer.Parse(ConfigurationManager.AppSettings("BatchMaxRetries"))

            Using channel = _connectionManager.CreateChannel()
                ' Enable publisher confirms for reliability
                channel.ConfirmSelect()

                Dim properties = channel.CreateBasicProperties()
                properties.Persistent = True
                properties.ContentType = "application/json"
                properties.DeliveryMode = 2 ' Persistent

                Console.WriteLine($"[BatchPublisher] Publishing {totalItems} messages for batch {batchJobId}")

                For i As Integer = 0 To request.IdNumbers.Count - 1
                    Dim item As BatchIdItem = request.IdNumbers(i)
                    Dim message = New VerificationJobMessage() With {
                        .MessageId = Guid.NewGuid().ToString(),
                        .BatchJobId = batchJobId,
                        .ItemIndex = i,
                        .TotalItems = totalItems,
                        .IdNumber = item.IdNumber,
                        .Reference = item.Reference,
                        .SetaId = request.SetaId,
                        .SetaCode = request.SetaCode,
                        .SubmittedByUserId = request.SubmittedByUserId,
                        .SubmittedByName = request.SubmittedByName,
                        .RetryCount = 0,
                        .MaxRetries = maxRetries,
                        .CreatedAt = DateTime.UtcNow
                    }

                    Dim json = JsonConvert.SerializeObject(message)
                    Dim body = Encoding.UTF8.GetBytes(json)

                    properties.MessageId = message.MessageId
                    properties.CorrelationId = batchJobId

                    Dim bodyMemory As New ReadOnlyMemory(Of Byte)(body)
                    channel.BasicPublish(RabbitMQConnectionManager.VERIFICATION_EXCHANGE, RabbitMQConnectionManager.VERIFICATION_ROUTING_KEY, False, properties, bodyMemory)
                Next

                ' Wait for publisher confirms
                channel.WaitForConfirmsOrDie(TimeSpan.FromSeconds(30))

                Console.WriteLine($"[BatchPublisher] Successfully published {totalItems} messages for batch {batchJobId}")
            End Using

            Return batchJobId
        End Function

        ''' <summary>
        ''' Publishes a message to the retry queue with exponential backoff TTL
        ''' </summary>
        Public Sub PublishToRetryQueue(message As VerificationJobMessage)
            ' Calculate delay based on retry count: 5s, 25s, 125s
            Dim delayMs = CInt(Math.Pow(5, message.RetryCount + 1) * 1000)
            If delayMs > 125000 Then delayMs = 125000 ' Cap at 125 seconds

            Using channel = _connectionManager.CreateChannel()
                Dim properties = channel.CreateBasicProperties()
                properties.Persistent = True
                properties.ContentType = "application/json"
                properties.DeliveryMode = 2
                properties.MessageId = message.MessageId
                properties.CorrelationId = message.BatchJobId
                properties.Expiration = delayMs.ToString() ' TTL for retry delay

                Dim json = JsonConvert.SerializeObject(message)
                Dim body = Encoding.UTF8.GetBytes(json)

                Dim bodyMemory As New ReadOnlyMemory(Of Byte)(body)
                channel.BasicPublish(RabbitMQConnectionManager.RETRY_EXCHANGE, RabbitMQConnectionManager.RETRY_ROUTING_KEY, False, properties, bodyMemory)

                Console.WriteLine($"[BatchPublisher] Published retry message for {message.IdNumber}, attempt {message.RetryCount + 1}, delay {delayMs}ms")
            End Using
        End Sub

        ''' <summary>
        ''' Publishes a message directly to the dead letter queue
        ''' </summary>
        Public Sub PublishToDeadLetterQueue(message As VerificationJobMessage, reason As String)
            Using channel = _connectionManager.CreateChannel()
                Dim properties = channel.CreateBasicProperties()
                properties.Persistent = True
                properties.ContentType = "application/json"
                properties.DeliveryMode = 2
                properties.MessageId = message.MessageId
                properties.CorrelationId = message.BatchJobId
                properties.Headers = New Dictionary(Of String, Object) From {
                    {"x-death-reason", reason},
                    {"x-original-retry-count", message.RetryCount}
                }

                Dim json = JsonConvert.SerializeObject(message)
                Dim body = Encoding.UTF8.GetBytes(json)

                Dim bodyMemory As New ReadOnlyMemory(Of Byte)(body)
                channel.BasicPublish(RabbitMQConnectionManager.DLX_EXCHANGE, RabbitMQConnectionManager.DEAD_ROUTING_KEY, False, properties, bodyMemory)

                Console.WriteLine($"[BatchPublisher] Message for {message.IdNumber} sent to DLQ: {reason}")
            End Using
        End Sub

        ''' <summary>
        ''' Generates a unique batch job ID
        ''' </summary>
        Private Function GenerateBatchJobId() As String
            Dim timestamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmss")
            Dim random = Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper()
            Return $"BATCH-{timestamp}-{random}"
        End Function
    End Class
End Namespace
