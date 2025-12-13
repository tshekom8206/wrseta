Imports System
Imports System.Configuration
Imports System.Linq
Imports System.Text
Imports System.Threading
Imports System.Threading.Tasks
Imports Newtonsoft.Json
Imports RabbitMQ.Client
Imports RabbitMQ.Client.Events
Imports SETA.API.Models

Namespace Services.RabbitMQ
    ''' <summary>
    ''' Worker that consumes verification jobs from RabbitMQ and processes them
    ''' </summary>
    Public Class VerificationWorker
        Implements IDisposable

        Private ReadOnly _workerId As Integer
        Private ReadOnly _connectionManager As RabbitMQConnectionManager
        Private ReadOnly _batchStatusService As BatchStatusService
        Private ReadOnly _notificationService As InAppNotificationService
        Private ReadOnly _publisher As BatchJobPublisher
        Private _channel As IModel
        Private _consumer As EventingBasicConsumer
        Private _consumerTag As String
        Private _cancellationTokenSource As CancellationTokenSource
        Private _disposed As Boolean = False
        Private Const PREFETCH_COUNT As UShort = 10

        Public Sub New(workerId As Integer)
            _workerId = workerId
            _connectionManager = RabbitMQConnectionManager.Instance
            _batchStatusService = New BatchStatusService()
            _notificationService = New InAppNotificationService()
            _publisher = New BatchJobPublisher()
            _cancellationTokenSource = New CancellationTokenSource()
        End Sub

        ''' <summary>
        ''' Starts the worker consuming messages
        ''' </summary>
        Public Sub Start()
            Try
                _channel = _connectionManager.CreateChannel()
                _channel.BasicQos(prefetchSize:=0, prefetchCount:=PREFETCH_COUNT, global:=False)

                _consumer = New EventingBasicConsumer(_channel)
                AddHandler _consumer.Received, AddressOf OnMessageReceived

                _consumerTag = _channel.BasicConsume(
                    queue:=RabbitMQConnectionManager.VERIFICATION_QUEUE,
                    autoAck:=False,
                    consumer:=_consumer
                )

                Console.WriteLine($"[Worker-{_workerId}] Started consuming from {RabbitMQConnectionManager.VERIFICATION_QUEUE}")
            Catch ex As Exception
                Console.WriteLine($"[Worker-{_workerId}] Failed to start: {ex.Message}")
                Throw
            End Try
        End Sub

        ''' <summary>
        ''' Stops the worker
        ''' </summary>
        Public Sub [Stop]()
            Try
                _cancellationTokenSource?.Cancel()

                If _channel IsNot Nothing AndAlso _channel.IsOpen Then
                    If Not String.IsNullOrEmpty(_consumerTag) Then
                        _channel.BasicCancel(_consumerTag)
                    End If
                End If

                Console.WriteLine($"[Worker-{_workerId}] Stopped")
            Catch ex As Exception
                Console.WriteLine($"[Worker-{_workerId}] Error stopping: {ex.Message}")
            End Try
        End Sub

        ''' <summary>
        ''' Handles received messages
        ''' </summary>
        Private Sub OnMessageReceived(sender As Object, e As BasicDeliverEventArgs)
            Dim message As VerificationJobMessage = Nothing

            Try
                Dim body = Encoding.UTF8.GetString(e.Body.ToArray())
                message = JsonConvert.DeserializeObject(Of VerificationJobMessage)(body)

                Dim isRetry = message.RetryCount > 0
                Dim retryInfo = If(isRetry, $" [RETRY {message.RetryCount}/{message.MaxRetries}]", "")
                Console.WriteLine($"[Worker-{_workerId}] Processing {message.IdNumber} (item {message.ItemIndex + 1}/{message.TotalItems}){retryInfo} for batch {message.BatchJobId}")

                ' Update batch status to PROCESSING if this is the first item
                If message.ItemIndex = 0 AndAlso message.RetryCount = 0 Then
                    _batchStatusService.SetProcessing(message.BatchJobId)
                End If

                ' Update current activity for UI
                Dim activityMsg = If(isRetry,
                    $"Retrying {message.IdNumber} (attempt {message.RetryCount}/{message.MaxRetries})",
                    $"Verifying {message.IdNumber} ({message.ItemIndex + 1}/{message.TotalItems})")
                _batchStatusService.SetCurrentActivity(message.BatchJobId, activityMsg)

                ' Process the verification
                Dim result = ProcessVerification(message)

                ' If this was a retry and succeeded, remove from retrying set
                If isRetry Then
                    _batchStatusService.RemoveRetryingItem(message.BatchJobId, message.IdNumber, exhaustedRetries:=False)
                End If

                ' Store the result
                _batchStatusService.StoreItemResult(message.BatchJobId, result)

                ' Update batch status and check if complete
                Dim isLastItem = _batchStatusService.IncrementProcessed(message.BatchJobId, result.Status)

                ' Acknowledge the message
                _channel.BasicAck(e.DeliveryTag, multiple:=False)

                ' If this was the last item, send notification
                If isLastItem Then
                    SendCompletionNotification(message.BatchJobId, message.SubmittedByUserId)
                End If

            Catch ex As Exception
                Console.WriteLine($"[Worker-{_workerId}] Error processing message: {ex.GetType().Name} - {ex.Message}")
                Console.WriteLine($"[Worker-{_workerId}] Stack: {ex.StackTrace}")

                If message IsNot Nothing Then
                    HandleFailure(message, ex.Message, e.DeliveryTag)
                Else
                    ' Can't process - reject without requeue
                    _channel.BasicNack(e.DeliveryTag, multiple:=False, requeue:=False)
                End If
            End Try
        End Sub

        ''' <summary>
        ''' Processes a single verification
        ''' </summary>
        Private Function ProcessVerification(message As VerificationJobMessage) As BatchItemResult
            Dim result As BatchItemResult = New BatchItemResult() With {
                .ItemIndex = message.ItemIndex,
                .IdNumber = message.IdNumber,
                .Reference = message.Reference,
                .ProcessedAt = DateTime.UtcNow
            }

            Try
                ' Step 1: Validate ID format (13 digits, numeric)
                If Not IsValidIdFormat(message.IdNumber) Then
                    result.Status = "RED"
                    result.Message = "Invalid ID number format"
                    result.ErrorCode = "INVALID_FORMAT"
                    Return result
                End If

                ' Step 2: Call DHA verification service (static method)
                Dim dhaResult As DHAVerificationService.DHAVerificationResult = DHAVerificationService.VerifyIdNumber(message.IdNumber)

                If dhaResult.Success Then
                    result.FirstName = dhaResult.FirstName
                    result.LastName = dhaResult.Surname
                    result.FullName = $"{dhaResult.FirstName} {dhaResult.Surname}".Trim()
                    result.DateOfBirth = dhaResult.DateOfBirth
                    result.Gender = dhaResult.Gender

                    ' Check for issues
                    If dhaResult.IsDeceased Then
                        result.Status = "RED"
                        result.Message = "ID belongs to deceased person"
                    ElseIf dhaResult.IsSuspended Then
                        result.Status = "RED"
                        result.Message = "ID has been suspended"
                    ElseIf dhaResult.NeedsManualReview Then
                        result.Status = "YELLOW"
                        result.Message = "Manual verification required"
                    Else
                        ' TODO: Add duplicate enrollment check here
                        result.Status = "GREEN"
                        result.Message = "Verified successfully"
                    End If
                Else
                    ' DHA verification failed
                    result.Status = "YELLOW"
                    result.Message = dhaResult.ErrorMessage
                    result.ErrorCode = dhaResult.ErrorCode

                    ' Check if this is a retryable error
                    If IsRetryableError(dhaResult.ErrorCode) Then
                        Throw New Exception($"Retryable DHA error: {dhaResult.ErrorCode}")
                    End If
                End If

            Catch ex As Exception
                ' Re-throw to trigger retry logic
                Throw
            End Try

            Return result
        End Function

        ''' <summary>
        ''' Validates SA ID number format
        ''' </summary>
        Private Function IsValidIdFormat(idNumber As String) As Boolean
            If String.IsNullOrEmpty(idNumber) Then Return False
            If idNumber.Length <> 13 Then Return False
            Dim result As Long
            Return Long.TryParse(idNumber, result)
        End Function

        ''' <summary>
        ''' Handles message failure with retry logic
        ''' </summary>
        Private Sub HandleFailure(message As VerificationJobMessage, errorMessage As String, deliveryTag As ULong)
            message.RetryCount += 1

            If message.RetryCount <= message.MaxRetries Then
                ' Calculate next retry time
                Dim delayMs = CInt(Math.Pow(5, message.RetryCount) * 1000)
                If delayMs > 125000 Then delayMs = 125000
                Dim nextRetryAt = DateTime.UtcNow.AddMilliseconds(delayMs)

                ' Track retry in Redis for UI visibility
                _batchStatusService.AddRetryingItem(
                    message.BatchJobId,
                    message.IdNumber,
                    message.RetryCount,
                    message.MaxRetries,
                    errorMessage,
                    nextRetryAt
                )

                ' Retry with exponential backoff
                Console.WriteLine($"[Worker-{_workerId}] Retrying {message.IdNumber} (attempt {message.RetryCount}/{message.MaxRetries}) in {delayMs}ms")
                _publisher.PublishToRetryQueue(message)
                _channel.BasicAck(deliveryTag, multiple:=False)
            Else
                ' Remove from retrying set (exhausted)
                _batchStatusService.RemoveRetryingItem(message.BatchJobId, message.IdNumber, exhaustedRetries:=True)

                ' Max retries exceeded - send to DLQ and record failure
                Console.WriteLine($"[Worker-{_workerId}] Max retries exceeded for {message.IdNumber}, sending to DLQ")
                _publisher.PublishToDeadLetterQueue(message, errorMessage)

                ' Record as failed result
                Dim failedResult = New BatchItemResult() With {
                    .ItemIndex = message.ItemIndex,
                    .IdNumber = message.IdNumber,
                    .Reference = message.Reference,
                    .Status = "FAILED",
                    .Message = $"Verification failed after {message.MaxRetries} retries: {errorMessage}",
                    .ErrorCode = "MAX_RETRIES_EXCEEDED",
                    .ProcessedAt = DateTime.UtcNow
                }
                _batchStatusService.StoreItemResult(message.BatchJobId, failedResult)
                Dim isLastItem = _batchStatusService.IncrementProcessed(message.BatchJobId, "FAILED")

                _channel.BasicAck(deliveryTag, multiple:=False)

                If isLastItem Then
                    SendCompletionNotification(message.BatchJobId, message.SubmittedByUserId)
                End If
            End If
        End Sub

        ''' <summary>
        ''' Sends completion notification to user
        ''' </summary>
        Private Sub SendCompletionNotification(batchJobId As String, userId As String)
            Try
                ' Check if notification already sent
                If _batchStatusService.IsNotificationSent(batchJobId) Then
                    Return
                End If

                Dim status = _batchStatusService.GetBatchStatus(batchJobId)
                If status Is Nothing Then Return

                Dim notificationType As String
                Dim title As String
                Dim message As String

                Select Case status.Status
                    Case "COMPLETED"
                        notificationType = "success"
                        title = "Batch Verification Complete"
                        message = $"{status.GreenCount}/{status.TotalItems} IDs verified successfully"
                    Case "PARTIAL"
                        notificationType = "warning"
                        title = "Batch Verification Partial"
                        message = $"{status.ProcessedCount}/{status.TotalItems} processed, {status.FailedCount} failed"
                    Case "FAILED"
                        notificationType = "error"
                        title = "Batch Verification Failed"
                        message = "Manual review required"
                    Case Else
                        Return
                End Select

                _notificationService.AddNotification(userId, New InAppNotification() With {
                    .Id = Guid.NewGuid().ToString(),
                    .Type = "batch_complete",
                    .Status = status.Status,
                    .BatchJobId = batchJobId,
                    .Title = title,
                    .Message = message,
                    .Link = $"/batch/{batchJobId}/results",
                    .Read = False,
                    .CreatedAt = DateTime.UtcNow,
                    .UserId = userId
                })

                _batchStatusService.MarkNotificationSent(batchJobId)
                Console.WriteLine($"[Worker-{_workerId}] Sent completion notification for batch {batchJobId}")
            Catch ex As Exception
                Console.WriteLine($"[Worker-{_workerId}] Error sending notification: {ex.Message}")
            End Try
        End Sub

        ''' <summary>
        ''' Determines if an error is retryable
        ''' </summary>
        Private Function IsRetryableError(errorCode As String) As Boolean
            Dim retryableErrors As String() = New String() {
                "DHA_TIMEOUT",
                "DHA_HTTP_ERROR",
                "SERVICE_UNAVAILABLE",
                "CIRCUIT_BREAKER_OPEN",
                "RATE_LIMITED"
            }
            Return Array.IndexOf(retryableErrors, errorCode) >= 0
        End Function

        Public Sub Dispose() Implements IDisposable.Dispose
            Dispose(True)
            GC.SuppressFinalize(Me)
        End Sub

        Protected Overridable Sub Dispose(disposing As Boolean)
            If Not _disposed Then
                If disposing Then
                    [Stop]()
                    _cancellationTokenSource?.Dispose()
                    _channel?.Dispose()
                End If
                _disposed = True
            End If
        End Sub
    End Class
End Namespace
