Imports System
Imports System.Net
Imports System.Net.Http
Imports System.Web.Http
Imports System.Web.Http.Cors
Imports SETA.API.Models
Imports SETA.API.Services
Imports SETA.API.Services.RabbitMQ

Namespace Controllers
    ''' <summary>
    ''' Controller for batch ID verification operations using RabbitMQ queuing
    ''' </summary>
    <RoutePrefix("api/batch")>
    <EnableCors("*", "*", "*")>
    Public Class BatchVerificationController
        Inherits ApiController

        Private ReadOnly _publisher As BatchJobPublisher
        Private ReadOnly _statusService As BatchStatusService
        Private ReadOnly _connectionManager As RabbitMQConnectionManager

        Public Sub New()
            _publisher = New BatchJobPublisher()
            _statusService = New BatchStatusService()
            _connectionManager = RabbitMQConnectionManager.Instance
        End Sub

        ''' <summary>
        ''' Submits a batch of ID numbers for verification
        ''' </summary>
        ''' <param name="request">Batch submission request with ID numbers</param>
        ''' <returns>Batch job ID and status URL</returns>
        <HttpPost>
        <Route("")>
        Public Function SubmitBatch(request As BatchVerificationSubmitRequest) As IHttpActionResult
            Try
                ' Validate request
                If request Is Nothing Then
                    Return BadRequest("Request body is required")
                End If

                If request.IdNumbers Is Nothing OrElse request.IdNumbers.Count = 0 Then
                    Return BadRequest("At least one ID number is required")
                End If

                If request.IdNumbers.Count > 500 Then
                    Return BadRequest("Maximum 500 ID numbers per batch")
                End If

                If String.IsNullOrEmpty(request.SubmittedByUserId) Then
                    Return BadRequest("SubmittedByUserId is required")
                End If

                ' Validate each ID item
                For Each idItem As BatchIdItem In request.IdNumbers
                    If String.IsNullOrEmpty(idItem.IdNumber) Then
                        Return BadRequest("Each item must have an IdNumber")
                    End If
                    If idItem.IdNumber.Length <> 13 Then
                        Return BadRequest($"Invalid ID number length: {idItem.IdNumber}")
                    End If
                Next

                ' Submit batch to queue
                Dim batchJobId = _publisher.SubmitBatch(request)

                ' Create initial status in Redis
                _statusService.CreateBatchStatus(
                    batchJobId,
                    request.IdNumbers.Count,
                    request.SubmittedByUserId,
                    If(request.SubmittedByName, "Unknown"),
                    If(request.SetaCode, "WRSETA")
                )

                Console.WriteLine($"[BatchController] Submitted batch {batchJobId} with {request.IdNumbers.Count} items")

                Dim response = New BatchVerificationSubmitResponse() With {
                    .BatchJobId = batchJobId,
                    .StatusUrl = $"/api/batch/{batchJobId}/status",
                    .ResultsUrl = $"/api/batch/{batchJobId}/results",
                    .TotalItems = request.IdNumbers.Count,
                    .Message = "Batch submitted successfully. Poll the status URL for progress."
                }

                Return Content(HttpStatusCode.Accepted, response)
            Catch ex As ArgumentException
                Return BadRequest(ex.Message)
            Catch ex As Exception
                Console.WriteLine($"[BatchController] Error submitting batch: {ex.GetType().Name} - {ex.Message}")
                If ex.InnerException IsNot Nothing Then
                    Console.WriteLine($"[BatchController] Inner: {ex.InnerException.Message}")
                End If
                Console.WriteLine($"[BatchController] Stack: {ex.StackTrace}")
                Return InternalServerError(New Exception($"Failed to submit batch: {ex.Message}"))
            End Try
        End Function

        ''' <summary>
        ''' Gets the current status of a batch job including retry information
        ''' </summary>
        ''' <param name="batchJobId">The batch job ID</param>
        ''' <returns>Current batch status with progress and retry details</returns>
        <HttpGet>
        <Route("{batchJobId}/status")>
        Public Function GetBatchStatus(batchJobId As String) As IHttpActionResult
            Try
                If String.IsNullOrEmpty(batchJobId) Then
                    Return BadRequest("Batch job ID is required")
                End If

                ' Use GetBatchStatusWithRetries to include retry information
                Dim status = _statusService.GetBatchStatusWithRetries(batchJobId)

                If status Is Nothing Then
                    Return NotFound()
                End If

                Return Ok(status)
            Catch ex As Exception
                Console.WriteLine($"[BatchController] Error getting status for {batchJobId}: {ex.Message}")
                Return InternalServerError(New Exception("Failed to get batch status"))
            End Try
        End Function

        ''' <summary>
        ''' Gets the results of a completed batch job
        ''' </summary>
        ''' <param name="batchJobId">The batch job ID</param>
        ''' <param name="page">Page number (default 1)</param>
        ''' <param name="pageSize">Page size (default 50, max 100)</param>
        ''' <returns>Paginated batch results</returns>
        <HttpGet>
        <Route("{batchJobId}/results")>
        Public Function GetBatchResults(batchJobId As String, Optional page As Integer = 1, Optional pageSize As Integer = 50) As IHttpActionResult
            Try
                If String.IsNullOrEmpty(batchJobId) Then
                    Return BadRequest("Batch job ID is required")
                End If

                If page < 1 Then page = 1
                If pageSize < 1 Then pageSize = 50
                If pageSize > 100 Then pageSize = 100

                Dim results = _statusService.GetBatchResults(batchJobId, page, pageSize)

                If results Is Nothing Then
                    Return NotFound()
                End If

                Return Ok(results)
            Catch ex As Exception
                Console.WriteLine($"[BatchController] Error getting results for {batchJobId}: {ex.Message}")
                Return InternalServerError(New Exception("Failed to get batch results"))
            End Try
        End Function

        ''' <summary>
        ''' Gets health status of the batch processing system
        ''' </summary>
        ''' <returns>Health status of RabbitMQ and Redis</returns>
        <HttpGet>
        <Route("health")>
        Public Function GetHealth() As IHttpActionResult
            Try
                Dim rabbitHealthy = _connectionManager.IsHealthy()
                Dim queueCount = _connectionManager.GetQueueMessageCount(RabbitMQConnectionManager.VERIFICATION_QUEUE)
                Dim retryCount = _connectionManager.GetQueueMessageCount(RabbitMQConnectionManager.RETRY_QUEUE)
                Dim dlqCount = _connectionManager.GetQueueMessageCount(RabbitMQConnectionManager.DLQ_QUEUE)

                ' Check Redis by trying to get a status
                Dim redisHealthy = True
                Try
                    _statusService.GetBatchStatus("health-check-test")
                    Console.WriteLine("[BatchController] Redis health check passed")
                Catch ex As Exception
                    Console.WriteLine($"[BatchController] Redis health check failed: {ex.GetType().Name} - {ex.Message}")
                    redisHealthy = False
                End Try

                Dim overallHealthy = rabbitHealthy AndAlso redisHealthy

                Dim response = New BatchHealthResponse() With {
                    .Healthy = overallHealthy,
                    .Timestamp = DateTime.UtcNow,
                    .Components = New List(Of ComponentHealth) From {
                        New ComponentHealth() With {
                            .Name = "RabbitMQ",
                            .Status = If(rabbitHealthy, "healthy", "unhealthy"),
                            .Details = New Dictionary(Of String, Object) From {
                                {"queueMessages", queueCount},
                                {"retryMessages", retryCount},
                                {"deadLetterMessages", dlqCount}
                            }
                        },
                        New ComponentHealth() With {
                            .Name = "Redis",
                            .Status = If(redisHealthy, "healthy", "unhealthy"),
                            .Details = New Dictionary(Of String, Object)()
                        }
                    }
                }

                If overallHealthy Then
                    Return Ok(response)
                Else
                    Return Content(HttpStatusCode.ServiceUnavailable, response)
                End If
            Catch ex As Exception
                Console.WriteLine($"[BatchController] Error checking health: {ex.Message}")
                Return Content(HttpStatusCode.ServiceUnavailable, New BatchHealthResponse() With {
                    .Healthy = False,
                    .Timestamp = DateTime.UtcNow,
                    .Components = New List(Of ComponentHealth)()
                })
            End Try
        End Function

        ''' <summary>
        ''' Gets queue statistics
        ''' </summary>
        ''' <returns>Current queue message counts</returns>
        <HttpGet>
        <Route("queues")>
        Public Function GetQueueStats() As IHttpActionResult
            Try
                Dim stats = New Dictionary(Of String, Object) From {
                    {"verificationQueue", _connectionManager.GetQueueMessageCount(RabbitMQConnectionManager.VERIFICATION_QUEUE)},
                    {"retryQueue", _connectionManager.GetQueueMessageCount(RabbitMQConnectionManager.RETRY_QUEUE)},
                    {"deadLetterQueue", _connectionManager.GetQueueMessageCount(RabbitMQConnectionManager.DLQ_QUEUE)},
                    {"timestamp", DateTime.UtcNow}
                }

                Return Ok(stats)
            Catch ex As Exception
                Console.WriteLine($"[BatchController] Error getting queue stats: {ex.Message}")
                Return InternalServerError(New Exception("Failed to get queue statistics"))
            End Try
        End Function

        ''' <summary>
        ''' Lists all batch jobs
        ''' </summary>
        ''' <returns>List of all batch jobs sorted by creation date</returns>
        <HttpGet>
        <Route("list")>
        Public Function ListBatches() As IHttpActionResult
            Try
                Dim batches = _statusService.ListAllBatches()

                Dim response = New Dictionary(Of String, Object) From {
                    {"batches", batches},
                    {"count", batches.Count},
                    {"timestamp", DateTime.UtcNow}
                }

                Return Ok(response)
            Catch ex As Exception
                Console.WriteLine($"[BatchController] Error listing batches: {ex.Message}")
                Return InternalServerError(New Exception("Failed to list batches"))
            End Try
        End Function

        ''' <summary>
        ''' Retry failed items in a batch
        ''' </summary>
        ''' <param name="batchJobId">The batch job ID</param>
        ''' <returns>Result of retry operation</returns>
        <HttpPost>
        <Route("{batchJobId}/retry")>
        Public Function RetryFailed(batchJobId As String) As IHttpActionResult
            Try
                If String.IsNullOrEmpty(batchJobId) Then
                    Return BadRequest("Batch job ID is required")
                End If

                ' Get the batch status
                Dim status = _statusService.GetBatchStatus(batchJobId)
                If status Is Nothing Then
                    Return NotFound()
                End If

                ' Get failed items
                Dim failedItems = _statusService.GetFailedItems(batchJobId)
                If failedItems.Count = 0 Then
                    Return Ok(New Dictionary(Of String, Object) From {
                        {"success", True},
                        {"message", "No failed items to retry"},
                        {"retryCount", 0}
                    })
                End If

                ' Create retry request
                Dim idItems As New List(Of BatchIdItem)()
                For Each item As BatchItemResult In failedItems
                    idItems.Add(New BatchIdItem() With {
                        .IdNumber = item.IdNumber,
                        .Reference = item.Reference
                    })
                Next

                Dim retryRequest As New BatchVerificationSubmitRequest() With {
                    .IdNumbers = idItems,
                    .SetaCode = "WRSETA",
                    .SubmittedByUserId = "RETRY-" & batchJobId,
                    .SubmittedByName = "Retry System"
                }

                ' Submit as new batch
                Dim newBatchId = _publisher.SubmitBatch(retryRequest)

                ' Create status for retry batch
                _statusService.CreateBatchStatus(
                    newBatchId,
                    idItems.Count,
                    retryRequest.SubmittedByUserId,
                    retryRequest.SubmittedByName,
                    retryRequest.SetaCode
                )

                Console.WriteLine($"[BatchController] Retry batch {newBatchId} created for {idItems.Count} failed items from {batchJobId}")

                Return Ok(New Dictionary(Of String, Object) From {
                    {"success", True},
                    {"message", $"Created retry batch for {idItems.Count} failed items"},
                    {"retryCount", idItems.Count},
                    {"newBatchJobId", newBatchId}
                })
            Catch ex As Exception
                Console.WriteLine($"[BatchController] Error retrying batch {batchJobId}: {ex.Message}")
                Return InternalServerError(New Exception("Failed to retry batch"))
            End Try
        End Function
    End Class
End Namespace
