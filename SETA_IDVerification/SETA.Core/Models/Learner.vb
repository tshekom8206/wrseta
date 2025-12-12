' =============================================
' Multi-SETA ID Verification System
' Model: Learner
' =============================================

Namespace Models

    ''' <summary>
    ''' Represents a learner registered in the central registry
    ''' </summary>
    Public Class Learner

        ''' <summary>
        ''' Primary key identifier
        ''' </summary>
        Public Property LearnerID As Integer

        ''' <summary>
        ''' 13-digit South African ID number
        ''' </summary>
        Public Property IDNumber As String

        ''' <summary>
        ''' SHA-256 hash of the ID number for privacy-preserving lookups
        ''' </summary>
        Public Property IDNumberHash As String

        ''' <summary>
        ''' Learner's first name
        ''' </summary>
        Public Property FirstName As String

        ''' <summary>
        ''' Learner's surname
        ''' </summary>
        Public Property Surname As String

        ''' <summary>
        ''' Date of birth extracted from ID number
        ''' </summary>
        Public Property DateOfBirth As Date

        ''' <summary>
        ''' Gender derived from ID number (Male/Female)
        ''' </summary>
        Public Property Gender As String

        ''' <summary>
        ''' ID of the SETA where learner is registered
        ''' </summary>
        Public Property RegisteredSETAID As Integer

        ''' <summary>
        ''' Code of the registering SETA
        ''' </summary>
        Public Property SETACode As String

        ''' <summary>
        ''' Name of the registering SETA
        ''' </summary>
        Public Property SETAName As String

        ''' <summary>
        ''' Name of the learning programme
        ''' </summary>
        Public Property ProgrammeName As String

        ''' <summary>
        ''' Date of registration
        ''' </summary>
        Public Property RegistrationDate As DateTime = DateTime.Now

        ''' <summary>
        ''' Registration status (Active/Completed/Withdrawn)
        ''' </summary>
        Public Property Status As String = "Active"

        ''' <summary>
        ''' User who created this record
        ''' </summary>
        Public Property CreatedBy As String

        ''' <summary>
        ''' Returns the learner's full name
        ''' </summary>
        Public ReadOnly Property FullName As String
            Get
                Return $"{FirstName} {Surname}"
            End Get
        End Property

        ''' <summary>
        ''' Returns masked ID number for POPIA compliance (e.g., ****5012089)
        ''' </summary>
        Public ReadOnly Property MaskedIDNumber As String
            Get
                If String.IsNullOrEmpty(IDNumber) OrElse IDNumber.Length < 13 Then
                    Return "****"
                End If
                Return "****" & IDNumber.Substring(4)
            End Get
        End Property

    End Class

End Namespace
