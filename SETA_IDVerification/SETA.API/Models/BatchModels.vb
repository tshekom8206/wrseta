Imports System
Imports System.Collections.Generic

Namespace Models
    ''' <summary>
    ''' Request model for submitting a batch verification job
    ''' </summary>
    Public Class BatchVerificationSubmitRequest
        ''' <summary>
        ''' List of ID numbers to verify (max 500)
        ''' </summary>
        Public Property IdNumbers As List(Of BatchIdItem)

        ''' <summary>
        ''' SETA ID for the verification
        ''' </summary>
        Public Property SetaId As Integer

        ''' <summary>
        ''' SETA code (e.g., WRSETA)
        ''' </summary>
        Public Property SetaCode As String

        ''' <summary>
        ''' User ID who submitted the batch
        ''' </summary>
        Public Property SubmittedByUserId As String

        ''' <summary>
        ''' Display name of user who submitted
        ''' </summary>
        Public Property SubmittedByName As String
    End Class

    ''' <summary>
    ''' Individual ID item in batch request
    ''' </summary>
    Public Class BatchIdItem
        ''' <summary>
        ''' The 13-digit SA ID number
        ''' </summary>
        Public Property IdNumber As String

        ''' <summary>
        ''' Optional reference (e.g., employee number)
        ''' </summary>
        Public Property Reference As String
    End Class

    ''' <summary>
    ''' Response after submitting batch job
    ''' </summary>
    Public Class BatchVerificationSubmitResponse
        ''' <summary>
        ''' Unique batch job identifier
        ''' </summary>
        Public Property BatchJobId As String

        ''' <summary>
        ''' URL to poll for status
        ''' </summary>
        Public Property StatusUrl As String

        ''' <summary>
        ''' URL to fetch results when complete
        ''' </summary>
        Public Property ResultsUrl As String

        ''' <summary>
        ''' Total IDs submitted
        ''' </summary>
        Public Property TotalItems As Integer

        ''' <summary>
        ''' Timestamp when job was created
        ''' </summary>
        Public Property CreatedAt As DateTime

        ''' <summary>
        ''' Message to user
        ''' </summary>
        Public Property Message As String
    End Class

    ''' <summary>
    ''' Batch job status response for polling
    ''' </summary>
    Public Class BatchJobStatusResponse
        ''' <summary>
        ''' Batch job identifier
        ''' </summary>
        Public Property BatchJobId As String

        ''' <summary>
        ''' Current status: PENDING, PROCESSING, COMPLETED, PARTIAL, FAILED
        ''' </summary>
        Public Property Status As String

        ''' <summary>
        ''' Total items in batch
        ''' </summary>
        Public Property TotalItems As Integer

        ''' <summary>
        ''' Number of items processed so far
        ''' </summary>
        Public Property ProcessedCount As Integer

        ''' <summary>
        ''' Number of GREEN results (clear)
        ''' </summary>
        Public Property GreenCount As Integer

        ''' <summary>
        ''' Number of YELLOW results (warning)
        ''' </summary>
        Public Property YellowCount As Integer

        ''' <summary>
        ''' Number of RED results (blocked)
        ''' </summary>
        Public Property RedCount As Integer

        ''' <summary>
        ''' Number of failed verifications
        ''' </summary>
        Public Property FailedCount As Integer

        ''' <summary>
        ''' Progress percentage (0-100)
        ''' </summary>
        Public Property ProgressPercent As Integer

        ''' <summary>
        ''' When the job was created
        ''' </summary>
        Public Property CreatedAt As DateTime?

        ''' <summary>
        ''' When processing started
        ''' </summary>
        Public Property StartedAt As DateTime?

        ''' <summary>
        ''' When processing completed
        ''' </summary>
        Public Property CompletedAt As DateTime?

        ''' <summary>
        ''' Estimated time remaining (seconds)
        ''' </summary>
        Public Property EstimatedSecondsRemaining As Integer?

        ''' <summary>
        ''' Number of items currently being retried
        ''' </summary>
        Public Property RetryingCount As Integer

        ''' <summary>
        ''' Number of items that exhausted all retries
        ''' </summary>
        Public Property ExhaustedRetriesCount As Integer

        ''' <summary>
        ''' Details about items currently being retried
        ''' </summary>
        Public Property RetryingItems As List(Of RetryingItemInfo)

        ''' <summary>
        ''' Current processing message for UI display
        ''' </summary>
        Public Property CurrentActivity As String
    End Class

    ''' <summary>
    ''' Info about an item being retried
    ''' </summary>
    Public Class RetryingItemInfo
        ''' <summary>
        ''' The ID number being retried
        ''' </summary>
        Public Property IdNumber As String

        ''' <summary>
        ''' Current retry attempt (1, 2, 3)
        ''' </summary>
        Public Property RetryAttempt As Integer

        ''' <summary>
        ''' Maximum retries allowed
        ''' </summary>
        Public Property MaxRetries As Integer

        ''' <summary>
        ''' Reason for retry
        ''' </summary>
        Public Property Reason As String

        ''' <summary>
        ''' When next retry will be attempted
        ''' </summary>
        Public Property NextRetryAt As DateTime?
    End Class

    ''' <summary>
    ''' Individual batch result item
    ''' </summary>
    Public Class BatchItemResult
        ''' <summary>
        ''' Position in batch (0-based index)
        ''' </summary>
        Public Property ItemIndex As Integer

        ''' <summary>
        ''' The ID number verified
        ''' </summary>
        Public Property IdNumber As String

        ''' <summary>
        ''' Optional reference from request
        ''' </summary>
        Public Property Reference As String

        ''' <summary>
        ''' Verification status: GREEN, YELLOW, RED
        ''' </summary>
        Public Property Status As String

        ''' <summary>
        ''' Result message
        ''' </summary>
        Public Property Message As String

        ''' <summary>
        ''' First name from DHA
        ''' </summary>
        Public Property FirstName As String

        ''' <summary>
        ''' Last name from DHA
        ''' </summary>
        Public Property LastName As String

        ''' <summary>
        ''' Full name
        ''' </summary>
        Public Property FullName As String

        ''' <summary>
        ''' Date of birth extracted from ID
        ''' </summary>
        Public Property DateOfBirth As DateTime?

        ''' <summary>
        ''' Gender extracted from ID
        ''' </summary>
        Public Property Gender As String

        ''' <summary>
        ''' Whether this is a duplicate enrollment
        ''' </summary>
        Public Property IsDuplicate As Boolean

        ''' <summary>
        ''' Error code if verification failed
        ''' </summary>
        Public Property ErrorCode As String

        ''' <summary>
        ''' When this item was processed
        ''' </summary>
        Public Property ProcessedAt As DateTime
    End Class

    ''' <summary>
    ''' Paginated batch results response
    ''' </summary>
    Public Class BatchResultsResponse
        ''' <summary>
        ''' Batch job identifier
        ''' </summary>
        Public Property BatchJobId As String

        ''' <summary>
        ''' Current status
        ''' </summary>
        Public Property Status As String

        ''' <summary>
        ''' Total items in batch
        ''' </summary>
        Public Property TotalItems As Integer

        ''' <summary>
        ''' Current page number
        ''' </summary>
        Public Property Page As Integer

        ''' <summary>
        ''' Items per page
        ''' </summary>
        Public Property PageSize As Integer

        ''' <summary>
        ''' Total pages available
        ''' </summary>
        Public Property TotalPages As Integer

        ''' <summary>
        ''' Results for current page
        ''' </summary>
        Public Property Results As List(Of BatchItemResult)

        ''' <summary>
        ''' Summary statistics
        ''' </summary>
        Public Property Summary As BatchSummary
    End Class

    ''' <summary>
    ''' Batch summary statistics
    ''' </summary>
    Public Class BatchSummary
        Public Property GreenCount As Integer
        Public Property YellowCount As Integer
        Public Property RedCount As Integer
        Public Property FailedCount As Integer
        Public Property GreenPercent As Decimal
        Public Property YellowPercent As Decimal
        Public Property RedPercent As Decimal
        Public Property FailedPercent As Decimal
    End Class

    ''' <summary>
    ''' RabbitMQ message for verification job
    ''' </summary>
    Public Class VerificationJobMessage
        ''' <summary>
        ''' Unique message identifier
        ''' </summary>
        Public Property MessageId As String

        ''' <summary>
        ''' Parent batch job identifier
        ''' </summary>
        Public Property BatchJobId As String

        ''' <summary>
        ''' Position in batch (0-based)
        ''' </summary>
        Public Property ItemIndex As Integer

        ''' <summary>
        ''' Total items in batch
        ''' </summary>
        Public Property TotalItems As Integer

        ''' <summary>
        ''' ID number to verify
        ''' </summary>
        Public Property IdNumber As String

        ''' <summary>
        ''' Optional reference
        ''' </summary>
        Public Property Reference As String

        ''' <summary>
        ''' SETA identifier
        ''' </summary>
        Public Property SetaId As Integer

        ''' <summary>
        ''' SETA code
        ''' </summary>
        Public Property SetaCode As String

        ''' <summary>
        ''' User ID who submitted batch
        ''' </summary>
        Public Property SubmittedByUserId As String

        ''' <summary>
        ''' User display name
        ''' </summary>
        Public Property SubmittedByName As String

        ''' <summary>
        ''' Current retry attempt (0 = first try)
        ''' </summary>
        Public Property RetryCount As Integer

        ''' <summary>
        ''' Maximum retry attempts
        ''' </summary>
        Public Property MaxRetries As Integer

        ''' <summary>
        ''' When message was created
        ''' </summary>
        Public Property CreatedAt As DateTime
    End Class

    ''' <summary>
    ''' In-app notification model
    ''' </summary>
    Public Class InAppNotification
        ''' <summary>
        ''' Unique notification identifier
        ''' </summary>
        Public Property Id As String

        ''' <summary>
        ''' Notification type (e.g., batch_complete)
        ''' </summary>
        Public Property Type As String

        ''' <summary>
        ''' Status related to notification (COMPLETED, PARTIAL, FAILED)
        ''' </summary>
        Public Property Status As String

        ''' <summary>
        ''' Related batch job ID (if applicable)
        ''' </summary>
        Public Property BatchJobId As String

        ''' <summary>
        ''' Notification title
        ''' </summary>
        Public Property Title As String

        ''' <summary>
        ''' Notification message/body
        ''' </summary>
        Public Property Message As String

        ''' <summary>
        ''' Link to navigate to when clicked
        ''' </summary>
        Public Property Link As String

        ''' <summary>
        ''' Whether notification has been read
        ''' </summary>
        Public Property Read As Boolean

        ''' <summary>
        ''' When notification was created
        ''' </summary>
        Public Property CreatedAt As DateTime

        ''' <summary>
        ''' User ID this notification belongs to
        ''' </summary>
        Public Property UserId As String
    End Class

    ''' <summary>
    ''' Response for notification list
    ''' </summary>
    Public Class NotificationListResponse
        ''' <summary>
        ''' List of notifications
        ''' </summary>
        Public Property Notifications As List(Of InAppNotification)

        ''' <summary>
        ''' Total unread count
        ''' </summary>
        Public Property UnreadCount As Integer

        ''' <summary>
        ''' Total notifications
        ''' </summary>
        Public Property TotalCount As Integer
    End Class

    ''' <summary>
    ''' Unread count response
    ''' </summary>
    Public Class UnreadCountResponse
        ''' <summary>
        ''' Number of unread notifications
        ''' </summary>
        Public Property UnreadCount As Integer
    End Class

    ''' <summary>
    ''' Health check response for batch system
    ''' </summary>
    Public Class BatchHealthResponse
        ''' <summary>
        ''' Overall health status
        ''' </summary>
        Public Property Healthy As Boolean

        ''' <summary>
        ''' Timestamp of health check
        ''' </summary>
        Public Property Timestamp As DateTime

        ''' <summary>
        ''' Component health statuses
        ''' </summary>
        Public Property Components As List(Of ComponentHealth)
    End Class

    ''' <summary>
    ''' Individual component health
    ''' </summary>
    Public Class ComponentHealth
        ''' <summary>
        ''' Component name
        ''' </summary>
        Public Property Name As String

        ''' <summary>
        ''' Status string (healthy/unhealthy)
        ''' </summary>
        Public Property Status As String

        ''' <summary>
        ''' Additional details
        ''' </summary>
        Public Property Details As Dictionary(Of String, Object)
    End Class
End Namespace
