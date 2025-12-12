Imports System.ComponentModel.DataAnnotations

Namespace DHA.API.Models

#Region "Base Response Models"

    ''' <summary>
    ''' Standard API response wrapper
    ''' </summary>
    Public Class ApiResponse(Of T)
        Public Property Success As Boolean
        Public Property Data As T
        Public Property [Error] As ApiError
        Public Property Timestamp As DateTime = DateTime.UtcNow
        Public Property RequestId As String = Guid.NewGuid().ToString("N").Substring(0, 8)

        Public Shared Function SuccessResponse(data As T) As ApiResponse(Of T)
            Return New ApiResponse(Of T) With {
                .Success = True,
                .Data = data
            }
        End Function

        Public Shared Function ErrorResponse(code As String, message As String, Optional details As Object = Nothing) As ApiResponse(Of T)
            Return New ApiResponse(Of T) With {
                .Success = False,
                .[Error] = New ApiError With {
                    .Code = code,
                    .Message = message,
                    .Details = details
                }
            }
        End Function
    End Class

    ''' <summary>
    ''' API error details
    ''' </summary>
    Public Class ApiError
        Public Property Code As String
        Public Property Message As String
        Public Property Details As Object
    End Class

#End Region

#Region "Verification Models"

    ''' <summary>
    ''' Request model for ID verification
    ''' </summary>
    Public Class VerificationRequest
        <Required>
        <StringLength(13, MinimumLength:=13, ErrorMessage:="ID Number must be exactly 13 digits")>
        Public Property IdNumber As String

        Public Property FirstName As String
        Public Property Surname As String
    End Class

    ''' <summary>
    ''' Demographics extracted from ID number
    ''' </summary>
    Public Class DemographicsInfo
        Public Property DateOfBirth As String
        Public Property Gender As String
        Public Property Citizenship As String
        Public Property Age As Integer
    End Class

#End Region

#Region "DHA Verification Models"

    ''' <summary>
    ''' Response model for DHA verification simulation
    ''' </summary>
    Public Class DHAVerificationResponse
        Public Property Success As Boolean
        Public Property Verified As Boolean
        Public Property Status As String              ' VERIFIED, NOT_FOUND, SERVICE_ERROR, PENDING_REVIEW, SUSPENDED, NAME_MISMATCH, VERIFIED_DECEASED
        Public Property Message As String
        Public Property FirstName As String
        Public Property Surname As String
        Public Property DateOfBirth As String
        Public Property Gender As String
        Public Property Citizenship As String
        Public Property IsDeceased As Boolean
        Public Property DateOfDeath As DateTime?
        Public Property ErrorCode As String
        Public Property ErrorMessage As String
        Public Property NeedsManualReview As Boolean
        Public Property ReviewReason As String
        Public Property EstimatedReviewDays As Integer?
        Public Property RetryAfterSeconds As Integer?
        Public Property VerificationDate As DateTime?
        Public Property VerificationReference As String
        Public Property ProcessingTimeMs As Integer
        Public Property Timestamp As DateTime
        Public Property RequestId As String
    End Class

    ''' <summary>
    ''' Request model for bulk DHA verification
    ''' </summary>
    Public Class BulkDHAVerificationRequest
        <Required>
        Public Property IdNumbers As List(Of String)
    End Class

    ''' <summary>
    ''' Response model for bulk DHA verification
    ''' </summary>
    Public Class BulkDHAVerificationResponse
        Public Property TotalProcessed As Integer
        Public Property Results As List(Of DHAVerificationResponse)
        Public Property ProcessingTimeMs As Long
        Public Property Timestamp As DateTime
    End Class

    ''' <summary>
    ''' DHA Person model for database operations
    ''' </summary>
    Public Class DHAPerson
        Public Property PersonId As Integer
        Public Property IdNumber As String
        Public Property FirstName As String
        Public Property Surname As String
        Public Property DateOfBirth As DateTime
        Public Property Gender As String
        Public Property Citizenship As String
        Public Property Race As String
        Public Property IssueDate As DateTime?
        Public Property MaritalStatus As String
        Public Property IsDeceased As Boolean
        Public Property DateOfDeath As DateTime?
        Public Property IsSuspended As Boolean
        Public Property SuspensionReason As String
        Public Property NeedsManualReview As Boolean
        Public Property ReviewReason As String
        Public Property CreatedAt As DateTime
        Public Property UpdatedAt As DateTime
    End Class

    ''' <summary>
    ''' Request model for adding a person to DHA database
    ''' </summary>
    Public Class AddPersonRequest
        <Required>
        <StringLength(13, MinimumLength:=13)>
        Public Property IdNumber As String

        <Required>
        Public Property FirstName As String

        <Required>
        Public Property Surname As String

        <Required>
        Public Property DateOfBirth As DateTime

        <Required>
        Public Property Gender As String

        <Required>
        Public Property Citizenship As String

        Public Property Race As String
        Public Property IssueDate As DateTime?
        Public Property MaritalStatus As String
        Public Property IsDeceased As Boolean = False
        Public Property DateOfDeath As DateTime?
        Public Property IsSuspended As Boolean = False
        Public Property SuspensionReason As String
        Public Property NeedsManualReview As Boolean = False
        Public Property ReviewReason As String
    End Class

    ''' <summary>
    ''' Response model for adding a person
    ''' </summary>
    Public Class AddPersonResponse
        Public Property Success As Boolean
        Public Property PersonId As Integer
        Public Property Message As String
    End Class

#End Region

#Region "Error Models"

    ''' <summary>
    ''' Detailed error response with correlation ID
    ''' </summary>
    Public Class ErrorResponse
        Public Property Success As Boolean = False
        Public Property [Error] As ErrorDetail
        Public Property Timestamp As DateTime = DateTime.UtcNow
        Public Property RequestId As String
        Public Property Path As String
    End Class

    ''' <summary>
    ''' Error detail with code and message
    ''' </summary>
    Public Class ErrorDetail
        Public Property Code As String
        Public Property Message As String
        Public Property Details As Object
        Public Property ValidationErrors As List(Of ValidationError)
    End Class

    ''' <summary>
    ''' Validation error for a specific field
    ''' </summary>
    Public Class ValidationError
        Public Property Field As String
        Public Property Message As String
    End Class

#End Region

End Namespace
