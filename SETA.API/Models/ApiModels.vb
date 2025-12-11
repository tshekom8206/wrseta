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
    ''' Response model for ID verification
    ''' </summary>
    Public Class VerificationResponse
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

End Namespace
