Imports System.ComponentModel.DataAnnotations

Namespace Models

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

#Region "Authentication Models"

    ''' <summary>
    ''' Request model for JWT token generation
    ''' </summary>
    Public Class AuthTokenRequest
        <Required>
        Public Property Username As String

        <Required>
        Public Property Password As String

        <Required>
        Public Property SetaId As Integer
    End Class

    ''' <summary>
    ''' Response model for JWT token
    ''' </summary>
    Public Class AuthTokenResponse
        Public Property Token As String
        Public Property ExpiresAt As DateTime
        Public Property RefreshToken As String
        Public Property SetaId As Integer
        Public Property SetaCode As String
        Public Property SetaName As String
    End Class

    ''' <summary>
    ''' Request model for token refresh
    ''' </summary>
    Public Class RefreshTokenRequest
        <Required>
        Public Property RefreshToken As String
    End Class

    ''' <summary>
    ''' Request model for revoking a specific token
    ''' </summary>
    Public Class RevokeTokenRequest
        <Required>
        Public Property RefreshToken As String
    End Class

    ''' <summary>
    ''' Request model for user registration
    ''' </summary>
    Public Class RegistrationRequest
        <Required>
        Public Property Username As String

        <Required>
        <StringLength(100, MinimumLength:=6, ErrorMessage:="Password must be at least 6 characters")>
        Public Property Password As String

        <Required>
        Public Property Name As String

        <Required>
        Public Property Surname As String

        <Required>
        <EmailAddress(ErrorMessage:="Invalid email address")>
        Public Property Email As String

        <Required>
        Public Property SetaId As Integer

        Public Property UserType As String

        Public Property IdNumber As String

        Public Property LearnerId As Integer?
    End Class

    ''' <summary>
    ''' Response model for user registration
    ''' </summary>
    Public Class RegistrationResponse
        Public Property UserId As Integer
        Public Property Username As String
        Public Property Message As String
        Public Property SetaId As Integer
        Public Property SetaCode As String
        Public Property SetaName As String
    End Class

    ''' <summary>
    ''' Request model for user login
    ''' </summary>
    Public Class LoginRequest
        <Required>
        Public Property Username As String

        <Required>
        Public Property Password As String
    End Class

    ''' <summary>
    ''' Response model for user login
    ''' </summary>
    Public Class LoginResponse
        Public Property Token As String
        Public Property ExpiresAt As DateTime
        Public Property RefreshToken As String
        Public Property UserId As Integer
        Public Property Username As String
        Public Property Name As String
        Public Property Surname As String
        Public Property Email As String
        Public Property SetaId As Integer
        Public Property SetaCode As String
        Public Property SetaName As String
        Public Property UserType As String
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
    End Class

    ''' <summary>
    ''' Response model for ID verification
    ''' </summary>
    Public Class VerificationResponse
        Public Property IdNumberMasked As String
        Public Property Status As String          ' GREEN, YELLOW, RED
        Public Property Message As String
        Public Property IsValid As Boolean
        Public Property FormatValid As Boolean
        Public Property LuhnValid As Boolean
        Public Property DhaVerified As Boolean
        Public Property DuplicateFound As Boolean
        Public Property Demographics As DemographicsInfo
        Public Property ConflictingSeta As ConflictInfo
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

    ''' <summary>
    ''' Conflicting SETA information for duplicates
    ''' </summary>
    Public Class ConflictInfo
        Public Property SetaId As Integer
        Public Property SetaCode As String
        Public Property SetaName As String
        Public Property RegistrationDate As DateTime?
    End Class

#End Region

#Region "Enrollment Models"

    ''' <summary>
    ''' Request model for learner enrollment
    ''' </summary>
    Public Class EnrollmentRequest
        <Required>
        <StringLength(13, MinimumLength:=13, ErrorMessage:="ID Number must be exactly 13 digits")>
        Public Property IdNumber As String

        <Required>
        Public Property FirstName As String

        <Required>
        Public Property Surname As String

        <Required>
        <StringLength(20, ErrorMessage:="Learnership code cannot exceed 20 characters")>
        Public Property LearnershipCode As String

        Public Property LearnershipName As String

        <Required>
        <Range(2020, 2100, ErrorMessage:="Enrollment year must be valid")>
        Public Property EnrollmentYear As Integer

        <Required>
        <StringLength(3, MinimumLength:=2, ErrorMessage:="Province code must be 2-3 characters")>
        Public Property Province As String

        <Required>
        Public Property SetaId As Integer
    End Class

    ''' <summary>
    ''' Response model for enrollment
    ''' </summary>
    Public Class EnrollmentResponse
        Public Property Decision As String         ' ALLOWED, BLOCKED
        Public Property DuplicateType As String    ' NEW_ENROLLMENT, SAME_SETA_SAME_PROVINCE, DIFFERENT_SETA_SAME_YEAR, DIFFERENT_PROVINCE
        Public Property Message As String
        Public Property EnrollmentId As String
        Public Property ExistingEnrollment As ExistingEnrollmentInfo
    End Class

    ''' <summary>
    ''' Existing enrollment details for duplicate detection
    ''' </summary>
    Public Class ExistingEnrollmentInfo
        Public Property SetaId As Integer
        Public Property SetaCode As String
        Public Property SetaName As String
        Public Property LearnershipCode As String
        Public Property Province As String
        Public Property EnrollmentYear As Integer
        Public Property EnrollmentDate As DateTime
    End Class

#End Region

#Region "Dashboard Models"

    ''' <summary>
    ''' Dashboard statistics response
    ''' </summary>
    Public Class DashboardStats
        Public Property SetaId As Integer
        Public Property SetaCode As String
        Public Property SetaName As String
        Public Property TotalLearners As Integer
        Public Property VerifiedGreen As Integer
        Public Property VerifiedYellow As Integer
        Public Property VerifiedRed As Integer
        Public Property BlockedAttempts As Integer
        Public Property TodayVerifications As Integer
        Public Property ThisMonthEnrollments As Integer
    End Class

#End Region

#Region "SETA Models"

    ''' <summary>
    ''' SETA information
    ''' </summary>
    Public Class SetaInfo
        Public Property SetaId As Integer
        Public Property SetaCode As String
        Public Property SetaName As String
        Public Property Sector As String
        Public Property IsActive As Boolean
    End Class

#End Region

#Region "Learner Models"

    ''' <summary>
    ''' Learner information (with masked ID)
    ''' </summary>
    Public Class LearnerInfo
        Public Property LearnerId As Integer
        Public Property IdNumberMasked As String    ' e.g., "850615****089"
        Public Property FirstName As String
        Public Property Surname As String
        Public Property DateOfBirth As DateTime?
        Public Property Gender As String
        Public Property LearnershipCode As String
        Public Property ProgrammeName As String
        Public Property Province As String
        Public Property RegistrationDate As DateTime
        Public Property Status As String
    End Class

    ''' <summary>
    ''' Learner search request
    ''' </summary>
    Public Class LearnerSearchRequest
        Public Property IdNumber As String
        Public Property FirstName As String
        Public Property Surname As String
        Public Property SetaId As Integer
    End Class

#End Region

#Region "Province Models"

    ''' <summary>
    ''' Province lookup
    ''' </summary>
    Public Class ProvinceInfo
        Public Property ProvinceCode As String
        Public Property ProvinceName As String
    End Class

#End Region

#Region "Bulk Verification Models"

    ''' <summary>
    ''' Request model for bulk ID verification
    ''' </summary>
    Public Class BulkVerificationRequest
        <Required>
        Public Property IdNumbers As List(Of BulkVerificationItem)

        ''' <summary>
        ''' Maximum number of IDs per batch (default 100, max 500)
        ''' </summary>
        Public Property BatchSize As Integer = 100
    End Class

    ''' <summary>
    ''' Individual item in bulk verification
    ''' </summary>
    Public Class BulkVerificationItem
        <Required>
        Public Property IdNumber As String
        Public Property FirstName As String
        Public Property Surname As String
        Public Property Reference As String  ' Client reference for tracking
    End Class

    ''' <summary>
    ''' Response model for bulk verification
    ''' </summary>
    Public Class BulkVerificationResponse
        Public Property TotalProcessed As Integer
        Public Property SuccessCount As Integer
        Public Property FailedCount As Integer
        Public Property Results As List(Of BulkVerificationResult)
        Public Property ProcessingTimeMs As Long
    End Class

    ''' <summary>
    ''' Individual result in bulk verification
    ''' </summary>
    Public Class BulkVerificationResult
        Public Property IdNumber As String
        Public Property Reference As String
        Public Property Status As String          ' GREEN, YELLOW, RED
        Public Property Message As String
        Public Property IsValid As Boolean
        Public Property DuplicateFound As Boolean
        Public Property ConflictingSeta As String
    End Class

#End Region

#Region "Learner Verification Models"

    ''' <summary>
    ''' Request model for learner verification by ID number
    ''' </summary>
    Public Class LearnerVerificationRequest
        <Required>
        Public Property IdNumber As String
        Public Property SetaId As Integer = 0  ' Optional: 0 means use API key SETA
    End Class

    ''' <summary>
    ''' Response model for learner verification
    ''' </summary>
    Public Class LearnerVerificationResponse
        Public Property Found As Boolean
        Public Property LearnerId As Integer?
        Public Property IdNumberMasked As String
        Public Property FirstName As String
        Public Property Surname As String
        Public Property LearnershipCode As String
        Public Property ProgrammeName As String
        Public Property Province As String
        Public Property Status As String
        Public Property RegistrationDate As DateTime?
        Public Property RegisteredSetaId As Integer?
        Public Property RegisteredSetaCode As String
        Public Property RegisteredSetaName As String
        Public Property Message As String
    End Class

    ''' <summary>
    ''' Request model for bulk learner verification
    ''' </summary>
    Public Class BulkLearnerVerificationRequest
        <Required>
        Public Property IdNumbers As List(Of String)
        Public Property SetaId As Integer = 0  ' Optional: 0 means use API key SETA
    End Class

    ''' <summary>
    ''' Response model for bulk learner verification
    ''' </summary>
    Public Class BulkLearnerVerificationResponse
        Public Property TotalProcessed As Integer
        Public Property FoundCount As Integer
        Public Property NotFoundCount As Integer
        Public Property Results As List(Of BulkLearnerVerificationResult)
        Public Property ProcessingTimeMs As Long
    End Class

    ''' <summary>
    ''' Individual result in bulk learner verification
    ''' </summary>
    Public Class BulkLearnerVerificationResult
        Public Property IdNumber As String  ' Masked
        Public Property Found As Boolean
        Public Property LearnerId As Integer?
        Public Property FirstName As String
        Public Property Surname As String
        Public Property Status As String
        Public Property RegisteredSetaCode As String
        Public Property Message As String
    End Class

#End Region

#Region "Learner Update Models"

    ''' <summary>
    ''' Request model for updating a learner
    ''' </summary>
    Public Class LearnerUpdateRequest
        Public Property FirstName As String
        Public Property Surname As String
        Public Property LearnershipCode As String
        Public Property LearnershipName As String
        Public Property Province As String
        Public Property Status As String          ' Active, Completed, Withdrawn
    End Class

    ''' <summary>
    ''' Request model for deactivating/withdrawing a learner
    ''' </summary>
    Public Class LearnerDeactivateRequest
        <Required>
        Public Property Reason As String          ' Withdrawal reason
        Public Property EffectiveDate As DateTime?
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
