' =============================================
' Multi-SETA ID Verification System
' Model: User
' =============================================

Namespace Models

    ''' <summary>
    ''' User roles in the system
    ''' </summary>
    Public Enum UserRole
        Clerk = 1
        Admin = 2
        Auditor = 3
    End Enum

    ''' <summary>
    ''' Represents a system user belonging to a specific SETA
    ''' </summary>
    Public Class User

        ''' <summary>
        ''' Primary key identifier
        ''' </summary>
        Public Property UserID As Integer

        ''' <summary>
        ''' Login username
        ''' </summary>
        Public Property Username As String

        ''' <summary>
        ''' SHA-256 hashed password (never store plain text)
        ''' </summary>
        Public Property PasswordHash As String

        ''' <summary>
        ''' User's first name
        ''' </summary>
        Public Property FirstName As String

        ''' <summary>
        ''' User's surname
        ''' </summary>
        Public Property Surname As String

        ''' <summary>
        ''' User's email address
        ''' </summary>
        Public Property Email As String

        ''' <summary>
        ''' ID of the SETA this user belongs to
        ''' </summary>
        Public Property SETAID As Integer

        ''' <summary>
        ''' Code of the user's SETA
        ''' </summary>
        Public Property SETACode As String

        ''' <summary>
        ''' Name of the user's SETA
        ''' </summary>
        Public Property SETAName As String

        ''' <summary>
        ''' User's role (Admin/Clerk/Auditor)
        ''' </summary>
        Public Property Role As String = "Clerk"

        ''' <summary>
        ''' Whether the user account is active
        ''' </summary>
        Public Property IsActive As Boolean = True

        ''' <summary>
        ''' Timestamp of last login
        ''' </summary>
        Public Property LastLogin As DateTime?

        ''' <summary>
        ''' Date when account was created
        ''' </summary>
        Public Property CreatedDate As DateTime = DateTime.Now

        ''' <summary>
        ''' Returns the user's full name
        ''' </summary>
        Public ReadOnly Property FullName As String
            Get
                Return $"{FirstName} {Surname}"
            End Get
        End Property

        ''' <summary>
        ''' Returns display string for the user
        ''' </summary>
        Public Overrides Function ToString() As String
            Return $"{FullName} ({SETACode})"
        End Function

    End Class

End Namespace
