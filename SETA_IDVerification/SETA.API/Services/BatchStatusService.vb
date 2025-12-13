Imports System
Imports System.Configuration
Imports System.Collections.Generic
Imports System.Threading.Tasks
Imports Newtonsoft.Json
Imports StackExchange.Redis
Imports SETA.API.Models

Namespace Services
    ''' <summary>
    ''' Manages batch job status in Redis
    ''' </summary>
    Public Class BatchStatusService
        Private Shared _redis As ConnectionMultiplexer
        Private Shared _isInitialized As Boolean = False
        Private Shared ReadOnly _lock As New Object()
        Private ReadOnly _db As IDatabase
        Private Const BATCH_STATUS_PREFIX As String = "batch:status:"
        Private Const BATCH_ITEMS_PREFIX As String = "batch:items:"
        Private Const BATCH_RETRYING_PREFIX As String = "batch:retrying:"
        Private ReadOnly _statusTtl As TimeSpan = TimeSpan.FromHours(72) ' 72 hours

        Public Sub New()
            EnsureConnection()
            _db = _redis.GetDatabase()
        End Sub

        Private Shared Sub EnsureConnection()
            If _isInitialized AndAlso _redis IsNot Nothing AndAlso _redis.IsConnected Then
                Return
            End If

            SyncLock _lock
                If _isInitialized AndAlso _redis IsNot Nothing AndAlso _redis.IsConnected Then
                    Return
                End If

                Try
                    Dim connectionString = ConfigurationManager.AppSettings("RedisConnectionString")
                    Dim options = ConfigurationOptions.Parse(If(String.IsNullOrEmpty(connectionString), "localhost:6379", connectionString))
                    options.AbortOnConnectFail = False
                    options.ConnectTimeout = 5000
                    options.SyncTimeout = 3000

                    _redis = ConnectionMultiplexer.Connect(options)
                    _isInitialized = True
                    Console.WriteLine($"[BatchStatusService] Connected to Redis: {_redis.IsConnected}")
                Catch ex As Exception
                    Console.WriteLine($"[BatchStatusService] Failed to connect to Redis: {ex.Message}")
                    Throw
                End Try
            End SyncLock
        End Sub

        ''' <summary>
        ''' Creates a new batch job status entry
        ''' </summary>
        Public Sub CreateBatchStatus(batchJobId As String, totalItems As Integer, submittedByUserId As String, submittedByName As String, setaCode As String)
            If _redis Is Nothing OrElse Not _redis.IsConnected Then
                Console.WriteLine($"[BatchStatus] Redis not connected, cannot create batch status")
                Throw New InvalidOperationException("Redis is not connected")
            End If

            Dim statusKey As String = BATCH_STATUS_PREFIX & batchJobId
            Dim keyRedis As RedisKey = CType(statusKey, RedisKey)

            ' Create HashEntry array with explicit CType conversions for VB.NET
            Dim entries As HashEntry() = New HashEntry() {
                New HashEntry(CType("status", RedisValue), CType("PENDING", RedisValue)),
                New HashEntry(CType("totalItems", RedisValue), CType(totalItems.ToString(), RedisValue)),
                New HashEntry(CType("processedCount", RedisValue), CType("0", RedisValue)),
                New HashEntry(CType("greenCount", RedisValue), CType("0", RedisValue)),
                New HashEntry(CType("yellowCount", RedisValue), CType("0", RedisValue)),
                New HashEntry(CType("redCount", RedisValue), CType("0", RedisValue)),
                New HashEntry(CType("failedCount", RedisValue), CType("0", RedisValue)),
                New HashEntry(CType("submittedByUserId", RedisValue), CType(submittedByUserId, RedisValue)),
                New HashEntry(CType("submittedByName", RedisValue), CType(submittedByName, RedisValue)),
                New HashEntry(CType("setaCode", RedisValue), CType(setaCode, RedisValue)),
                New HashEntry(CType("createdAt", RedisValue), CType(DateTime.UtcNow.ToString("O"), RedisValue)),
                New HashEntry(CType("notificationSent", RedisValue), CType("false", RedisValue)),
                New HashEntry(CType("retryingCount", RedisValue), CType("0", RedisValue)),
                New HashEntry(CType("exhaustedRetriesCount", RedisValue), CType("0", RedisValue))
            }

            _db.HashSet(keyRedis, entries, CommandFlags.None)
            _db.KeyExpire(keyRedis, _statusTtl, CommandFlags.None)

            Console.WriteLine($"[BatchStatus] Created status for batch {batchJobId} with {totalItems} items")
        End Sub

        ''' <summary>
        ''' Updates batch status to PROCESSING and sets startedAt
        ''' </summary>
        Public Sub SetProcessing(batchJobId As String)
            Dim statusKey As String = BATCH_STATUS_PREFIX & batchJobId
            Console.WriteLine($"[BatchStatus] SetProcessing - Key: {statusKey}")

            Try
                ' VB.NET requires explicit CType for StackExchange.Redis implicit operators
                Dim keyRedis As RedisKey = CType(statusKey, RedisKey)
                Dim fieldRedis As RedisValue = CType("status", RedisValue)

                ' Use CommandFlags.None to ensure correct overload resolution
                Dim redisValue As RedisValue = _db.HashGet(keyRedis, fieldRedis, CommandFlags.None)
                Console.WriteLine($"[BatchStatus] SetProcessing - HashGet returned, IsNull: {redisValue.IsNull}, HasValue: {redisValue.HasValue}")

                If redisValue.IsNull Then
                    Console.WriteLine($"[BatchStatus] SetProcessing - Key not found, skipping")
                    Return
                End If

                ' Use ToString() instead of CStr() for RedisValue
                Dim currentStatus As String = redisValue.ToString()
                Console.WriteLine($"[BatchStatus] SetProcessing - Current status: {currentStatus}")

                If currentStatus = "PENDING" Then
                    Console.WriteLine($"[BatchStatus] SetProcessing - Updating to PROCESSING")
                    ' Explicit HashEntry creation with CType conversions
                    Dim statusField As RedisValue = CType("status", RedisValue)
                    Dim statusVal As RedisValue = CType("PROCESSING", RedisValue)
                    Dim startedField As RedisValue = CType("startedAt", RedisValue)
                    Dim startedVal As RedisValue = CType(DateTime.UtcNow.ToString("O"), RedisValue)

                    Dim entry1 As New HashEntry(statusField, statusVal)
                    Dim entry2 As New HashEntry(startedField, startedVal)
                    Dim entries() As HashEntry = {entry1, entry2}
                    _db.HashSet(keyRedis, entries, CommandFlags.None)
                    Console.WriteLine($"[BatchStatus] SetProcessing - Updated successfully")
                End If
            Catch ex As Exception
                Console.WriteLine($"[BatchStatus] SetProcessing - Error: {ex.GetType().Name} - {ex.Message}")
                Console.WriteLine($"[BatchStatus] SetProcessing - Stack: {ex.StackTrace}")
                Throw
            End Try
        End Sub

        ''' <summary>
        ''' Increments the processed count and updates status counters
        ''' Returns True if this was the last item
        ''' </summary>
        Public Function IncrementProcessed(batchJobId As String, status As String) As Boolean
            Dim statusKey As String = BATCH_STATUS_PREFIX & batchJobId
            Dim keyRedis As RedisKey = CType(statusKey, RedisKey)

            ' Increment processed count
            Dim processedField As RedisValue = CType("processedCount", RedisValue)
            Dim newProcessed As Long = _db.HashIncrement(keyRedis, processedField, 1, CommandFlags.None)

            ' Increment status-specific counter
            Dim counterField As RedisValue
            Select Case status.ToUpper()
                Case "GREEN"
                    counterField = CType("greenCount", RedisValue)
                Case "YELLOW"
                    counterField = CType("yellowCount", RedisValue)
                Case "RED"
                    counterField = CType("redCount", RedisValue)
                Case Else
                    counterField = CType("failedCount", RedisValue)
            End Select
            _db.HashIncrement(keyRedis, counterField, 1, CommandFlags.None)

            ' Check if batch is complete
            Dim totalItemsField As RedisValue = CType("totalItems", RedisValue)
            Dim totalItemsValue As RedisValue = _db.HashGet(keyRedis, totalItemsField, CommandFlags.None)
            Dim totalItemsStr As String = totalItemsValue.ToString()
            Dim totalItems As Long = If(String.IsNullOrEmpty(totalItemsStr), 0L, CLng(totalItemsStr))
            If newProcessed >= totalItems Then
                CompleteBatch(batchJobId)
                Return True
            End If

            Return False
        End Function

        ''' <summary>
        ''' Marks the batch as complete and sets final status
        ''' </summary>
        Private Sub CompleteBatch(batchJobId As String)
            Dim statusKey As String = BATCH_STATUS_PREFIX & batchJobId
            Dim keyRedis As RedisKey = CType(statusKey, RedisKey)
            Dim hash As HashEntry() = _db.HashGetAll(keyRedis, CommandFlags.None)
            Dim values As New Dictionary(Of String, String)
            For Each h As HashEntry In hash
                values(h.Name.ToString()) = h.Value.ToString()
            Next

            ' Safe access with defaults
            Dim failedCountStr As String = If(values.ContainsKey("failedCount"), values("failedCount"), "0")
            Dim totalItemsStr As String = If(values.ContainsKey("totalItems"), values("totalItems"), "0")
            Dim failedCount As Integer = If(String.IsNullOrEmpty(failedCountStr), 0, Integer.Parse(failedCountStr))
            Dim totalItems As Integer = If(String.IsNullOrEmpty(totalItemsStr), 0, Integer.Parse(totalItemsStr))

            Dim finalStatus As String
            If failedCount = 0 Then
                finalStatus = "COMPLETED"
            ElseIf failedCount = totalItems Then
                finalStatus = "FAILED"
            Else
                finalStatus = "PARTIAL"
            End If

            Dim statusField As RedisValue = CType("status", RedisValue)
            Dim statusVal As RedisValue = CType(finalStatus, RedisValue)
            Dim completedField As RedisValue = CType("completedAt", RedisValue)
            Dim completedVal As RedisValue = CType(DateTime.UtcNow.ToString("O"), RedisValue)
            Dim entries() As HashEntry = {
                New HashEntry(statusField, statusVal),
                New HashEntry(completedField, completedVal)
            }
            _db.HashSet(keyRedis, entries, CommandFlags.None)

            Console.WriteLine($"[BatchStatus] Batch {batchJobId} completed with status {finalStatus}")
        End Sub

        ''' <summary>
        ''' Stores an individual item result
        ''' </summary>
        Public Sub StoreItemResult(batchJobId As String, result As BatchItemResult)
            Dim itemsKey As String = BATCH_ITEMS_PREFIX & batchJobId
            Dim keyRedis As RedisKey = CType(itemsKey, RedisKey)
            Dim json As String = JsonConvert.SerializeObject(result)
            Dim jsonValue As RedisValue = CType(json, RedisValue)

            ' Store as sorted set with index as score for ordering
            _db.SortedSetAdd(keyRedis, jsonValue, CDbl(result.ItemIndex), CommandFlags.None)
            _db.KeyExpire(keyRedis, _statusTtl, CommandFlags.None)
        End Sub

        ''' <summary>
        ''' Gets the current batch status
        ''' </summary>
        Public Function GetBatchStatus(batchJobId As String) As BatchJobStatusResponse
            Dim statusKey As String = BATCH_STATUS_PREFIX & batchJobId
            Dim keyRedis As RedisKey = CType(statusKey, RedisKey)
            Dim hash As HashEntry() = _db.HashGetAll(keyRedis, CommandFlags.None)

            If hash.Length = 0 Then
                Return Nothing
            End If

            Dim values As New Dictionary(Of String, String)
            For Each h As HashEntry In hash
                values(h.Name.ToString()) = h.Value.ToString()
            Next

            ' Safe int parsing helper
            Dim totalItems As Integer = SafeParseInt(values, "totalItems")
            Dim processedCount As Integer = SafeParseInt(values, "processedCount")
            Dim progressPercent As Integer = If(totalItems > 0, CInt((processedCount * 100) / totalItems), 0)

            Return New BatchJobStatusResponse() With {
                .BatchJobId = batchJobId,
                .Status = SafeGetString(values, "status"),
                .TotalItems = totalItems,
                .ProcessedCount = processedCount,
                .GreenCount = SafeParseInt(values, "greenCount"),
                .YellowCount = SafeParseInt(values, "yellowCount"),
                .RedCount = SafeParseInt(values, "redCount"),
                .FailedCount = SafeParseInt(values, "failedCount"),
                .ProgressPercent = progressPercent,
                .CreatedAt = SafeParseDate(values, "createdAt"),
                .StartedAt = SafeParseDate(values, "startedAt"),
                .CompletedAt = SafeParseDate(values, "completedAt")
            }
        End Function

        Private Function SafeParseInt(values As Dictionary(Of String, String), key As String) As Integer
            If Not values.ContainsKey(key) Then Return 0
            Dim val As String = values(key)
            If String.IsNullOrEmpty(val) Then Return 0
            Return Integer.Parse(val)
        End Function

        Private Function SafeGetString(values As Dictionary(Of String, String), key As String) As String
            If Not values.ContainsKey(key) Then Return ""
            Return values(key)
        End Function

        Private Function SafeParseDate(values As Dictionary(Of String, String), key As String) As DateTime?
            If Not values.ContainsKey(key) Then Return Nothing
            Dim val As String = values(key)
            If String.IsNullOrEmpty(val) Then Return Nothing
            Return DateTime.Parse(val)
        End Function

        ''' <summary>
        ''' Gets paginated batch results
        ''' </summary>
        Public Function GetBatchResults(batchJobId As String, page As Integer, pageSize As Integer) As BatchResultsResponse
            Dim status As BatchJobStatusResponse = GetBatchStatus(batchJobId)
            If status Is Nothing Then
                Return Nothing
            End If

            Dim itemsKey As String = BATCH_ITEMS_PREFIX & batchJobId
            Dim keyRedis As RedisKey = CType(itemsKey, RedisKey)
            Dim startIndex As Integer = (page - 1) * pageSize
            Dim endIndex As Integer = startIndex + pageSize - 1

            ' Get items from sorted set
            Dim items As RedisValue() = _db.SortedSetRangeByScore(keyRedis, CDbl(startIndex), CDbl(endIndex), Exclude.None, Order.Ascending, 0, -1, CommandFlags.None)
            Dim results As New List(Of BatchItemResult)()

            For Each item As RedisValue In items
                Dim result As BatchItemResult = JsonConvert.DeserializeObject(Of BatchItemResult)(item.ToString())
                results.Add(result)
            Next

            Dim totalPages As Integer = CInt(Math.Ceiling(status.TotalItems / CDbl(pageSize)))

            ' Calculate summary percentages
            Dim total As Integer = status.TotalItems
            Dim summary As New BatchSummary() With {
                .GreenCount = status.GreenCount,
                .YellowCount = status.YellowCount,
                .RedCount = status.RedCount,
                .FailedCount = status.FailedCount,
                .GreenPercent = If(total > 0, Math.Round(CDec(status.GreenCount * 100) / total, 1), 0),
                .YellowPercent = If(total > 0, Math.Round(CDec(status.YellowCount * 100) / total, 1), 0),
                .RedPercent = If(total > 0, Math.Round(CDec(status.RedCount * 100) / total, 1), 0),
                .FailedPercent = If(total > 0, Math.Round(CDec(status.FailedCount * 100) / total, 1), 0)
            }

            Return New BatchResultsResponse() With {
                .BatchJobId = batchJobId,
                .Status = status.Status,
                .TotalItems = status.TotalItems,
                .Page = page,
                .PageSize = pageSize,
                .TotalPages = totalPages,
                .Results = results,
                .Summary = summary
            }
        End Function

        ''' <summary>
        ''' Checks if notification has been sent for this batch
        ''' </summary>
        Public Function IsNotificationSent(batchJobId As String) As Boolean
            Dim statusKey As String = BATCH_STATUS_PREFIX & batchJobId
            Dim keyRedis As RedisKey = CType(statusKey, RedisKey)
            Dim fieldRedis As RedisValue = CType("notificationSent", RedisValue)
            Dim value As RedisValue = _db.HashGet(keyRedis, fieldRedis, CommandFlags.None)
            Return value.ToString() = "true"
        End Function

        ''' <summary>
        ''' Marks notification as sent
        ''' </summary>
        Public Sub MarkNotificationSent(batchJobId As String)
            Dim statusKey As String = BATCH_STATUS_PREFIX & batchJobId
            Dim keyRedis As RedisKey = CType(statusKey, RedisKey)
            Dim fieldRedis As RedisValue = CType("notificationSent", RedisValue)
            Dim valueRedis As RedisValue = CType("true", RedisValue)
            _db.HashSet(keyRedis, fieldRedis, valueRedis, [When].Always, CommandFlags.None)
        End Sub

        ''' <summary>
        ''' Gets the user ID who submitted the batch
        ''' </summary>
        Public Function GetSubmittedByUserId(batchJobId As String) As String
            Dim statusKey As String = BATCH_STATUS_PREFIX & batchJobId
            Dim keyRedis As RedisKey = CType(statusKey, RedisKey)
            Dim fieldRedis As RedisValue = CType("submittedByUserId", RedisValue)
            Dim value As RedisValue = _db.HashGet(keyRedis, fieldRedis, CommandFlags.None)
            Return value.ToString()
        End Function

        ''' <summary>
        ''' Adds an item to the retrying set
        ''' </summary>
        Public Sub AddRetryingItem(batchJobId As String, idNumber As String, retryAttempt As Integer, maxRetries As Integer, reason As String, nextRetryAt As DateTime)
            Dim retryingKeyStr As String = BATCH_RETRYING_PREFIX & batchJobId
            Dim retryingKey As RedisKey = CType(retryingKeyStr, RedisKey)
            Dim retryInfo As New RetryingItemInfo() With {
                .IdNumber = idNumber,
                .RetryAttempt = retryAttempt,
                .MaxRetries = maxRetries,
                .Reason = reason,
                .NextRetryAt = nextRetryAt
            }
            Dim json As String = JsonConvert.SerializeObject(retryInfo)
            Dim fieldRedis As RedisValue = CType(idNumber, RedisValue)
            Dim jsonValue As RedisValue = CType(json, RedisValue)
            _db.HashSet(retryingKey, fieldRedis, jsonValue, [When].Always, CommandFlags.None)
            _db.KeyExpire(retryingKey, _statusTtl, CommandFlags.None)

            ' Increment retrying count
            Dim statusKey As String = BATCH_STATUS_PREFIX & batchJobId
            Dim statusKeyRedis As RedisKey = CType(statusKey, RedisKey)
            Dim retryingCountField As RedisValue = CType("retryingCount", RedisValue)
            _db.HashIncrement(statusKeyRedis, retryingCountField, 1, CommandFlags.None)

            ' Update current activity
            Dim activityField As RedisValue = CType("currentActivity", RedisValue)
            Dim activityValue As RedisValue = CType($"Retrying {idNumber} (attempt {retryAttempt}/{maxRetries}): {reason}", RedisValue)
            _db.HashSet(statusKeyRedis, activityField, activityValue, [When].Always, CommandFlags.None)

            Console.WriteLine($"[BatchStatus] Added retrying item {idNumber} for batch {batchJobId} (attempt {retryAttempt})")
        End Sub

        ''' <summary>
        ''' Removes an item from the retrying set (success or max retries)
        ''' </summary>
        Public Sub RemoveRetryingItem(batchJobId As String, idNumber As String, exhaustedRetries As Boolean)
            Dim retryingKeyStr As String = BATCH_RETRYING_PREFIX & batchJobId
            Dim retryingKey As RedisKey = CType(retryingKeyStr, RedisKey)
            Dim fieldRedis As RedisValue = CType(idNumber, RedisValue)
            _db.HashDelete(retryingKey, fieldRedis, CommandFlags.None)

            Dim statusKey As String = BATCH_STATUS_PREFIX & batchJobId
            Dim statusKeyRedis As RedisKey = CType(statusKey, RedisKey)
            Dim retryingCountField As RedisValue = CType("retryingCount", RedisValue)
            _db.HashDecrement(statusKeyRedis, retryingCountField, 1, CommandFlags.None)

            If exhaustedRetries Then
                Dim exhaustedField As RedisValue = CType("exhaustedRetriesCount", RedisValue)
                _db.HashIncrement(statusKeyRedis, exhaustedField, 1, CommandFlags.None)
            End If
        End Sub

        ''' <summary>
        ''' Gets all items currently being retried
        ''' </summary>
        Public Function GetRetryingItems(batchJobId As String) As List(Of RetryingItemInfo)
            Dim retryingKeyStr As String = BATCH_RETRYING_PREFIX & batchJobId
            Dim retryingKey As RedisKey = CType(retryingKeyStr, RedisKey)
            Dim items As HashEntry() = _db.HashGetAll(retryingKey, CommandFlags.None)
            Dim result As New List(Of RetryingItemInfo)()

            For Each item As HashEntry In items
                Try
                    Dim retryInfo As RetryingItemInfo = JsonConvert.DeserializeObject(Of RetryingItemInfo)(item.Value.ToString())
                    result.Add(retryInfo)
                Catch
                    ' Skip invalid items
                End Try
            Next

            Return result
        End Function

        ''' <summary>
        ''' Updates current activity message
        ''' </summary>
        Public Sub SetCurrentActivity(batchJobId As String, activity As String)
            Dim statusKey As String = BATCH_STATUS_PREFIX & batchJobId
            Dim keyRedis As RedisKey = CType(statusKey, RedisKey)
            Dim fieldRedis As RedisValue = CType("currentActivity", RedisValue)
            Dim valueRedis As RedisValue = CType(activity, RedisValue)
            _db.HashSet(keyRedis, fieldRedis, valueRedis, [When].Always, CommandFlags.None)
        End Sub

        ''' <summary>
        ''' Gets extended batch status including retry information
        ''' </summary>
        Public Function GetBatchStatusWithRetries(batchJobId As String) As BatchJobStatusResponse
            Dim status As BatchJobStatusResponse = GetBatchStatus(batchJobId)
            If status Is Nothing Then Return Nothing

            Dim statusKey As String = BATCH_STATUS_PREFIX & batchJobId
            Dim keyRedis As RedisKey = CType(statusKey, RedisKey)
            Dim hash As HashEntry() = _db.HashGetAll(keyRedis, CommandFlags.None)
            Dim values As New Dictionary(Of String, String)
            For Each h As HashEntry In hash
                values(h.Name.ToString()) = h.Value.ToString()
            Next

            ' Add retry information
            status.RetryingCount = If(values.ContainsKey("retryingCount"), Integer.Parse(values("retryingCount")), 0)
            status.ExhaustedRetriesCount = If(values.ContainsKey("exhaustedRetriesCount"), Integer.Parse(values("exhaustedRetriesCount")), 0)
            status.CurrentActivity = If(values.ContainsKey("currentActivity"), values("currentActivity"), Nothing)
            status.RetryingItems = GetRetryingItems(batchJobId)

            Return status
        End Function

        ''' <summary>
        ''' Lists all batch jobs (scans Redis for batch:status:* keys)
        ''' </summary>
        Public Function ListAllBatches() As List(Of BatchJobStatusResponse)
            Dim batches As New List(Of BatchJobStatusResponse)()

            Try
                ' Get the Redis server to scan keys
                Dim server As IServer = _redis.GetServer(_redis.GetEndPoints()(0))
                Dim pattern As RedisValue = CType(BATCH_STATUS_PREFIX & "*", RedisValue)

                ' Scan for all batch status keys
                For Each key As RedisKey In server.Keys(pattern:=pattern.ToString(), pageSize:=100)
                    Try
                        Dim keyStr As String = key.ToString()
                        Dim batchJobId As String = keyStr.Replace(BATCH_STATUS_PREFIX, "")

                        Dim status As BatchJobStatusResponse = GetBatchStatusWithRetries(batchJobId)
                        If status IsNot Nothing Then
                            batches.Add(status)
                        End If
                    Catch ex As Exception
                        Console.WriteLine($"[BatchStatus] Error reading batch key {key}: {ex.Message}")
                    End Try
                Next

                ' Sort by createdAt descending (most recent first)
                batches.Sort(Function(a, b)
                                 Dim aDate = If(a.CreatedAt, DateTime.MinValue)
                                 Dim bDate = If(b.CreatedAt, DateTime.MinValue)
                                 Return bDate.CompareTo(aDate)
                             End Function)

                Console.WriteLine($"[BatchStatus] Listed {batches.Count} batches")
            Catch ex As Exception
                Console.WriteLine($"[BatchStatus] Error listing batches: {ex.Message}")
            End Try

            Return batches
        End Function

        ''' <summary>
        ''' Gets all failed item results for a batch (for retry functionality)
        ''' </summary>
        Public Function GetFailedItems(batchJobId As String) As List(Of BatchItemResult)
            Dim itemsKey As String = BATCH_ITEMS_PREFIX & batchJobId
            Dim keyRedis As RedisKey = CType(itemsKey, RedisKey)
            Dim failedItems As New List(Of BatchItemResult)()

            ' Get all items from sorted set
            Dim items As RedisValue() = _db.SortedSetRangeByScore(keyRedis, Double.NegativeInfinity, Double.PositiveInfinity, Exclude.None, Order.Ascending, 0, -1, CommandFlags.None)

            For Each item As RedisValue In items
                Try
                    Dim result As BatchItemResult = JsonConvert.DeserializeObject(Of BatchItemResult)(item.ToString())
                    If result.Status = "FAILED" Then
                        failedItems.Add(result)
                    End If
                Catch ex As Exception
                    Console.WriteLine($"[BatchStatus] Error deserializing item: {ex.Message}")
                End Try
            Next

            Return failedItems
        End Function
    End Class
End Namespace
