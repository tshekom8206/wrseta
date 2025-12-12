' =============================================
' Multi-SETA ID Verification System
' Model: VerificationResult
' =============================================

Namespace Models

    ''' <summary>
    ''' Traffic Light Status enumeration
    ''' </summary>
    Public Enum TrafficLightStatus
        ''' <summary>Identity verified - proceed with registration</summary>
        GREEN = 1
        ''' <summary>Review needed - minor discrepancy found</summary>
        YELLOW = 2
        ''' <summary>Blocked - invalid ID or duplicate found</summary>
        RED = 3
    End Enum

    ''' <summary>
    ''' Result of an ID verification operation
    ''' </summary>
    Public Class VerificationResult

        ''' <summary>
        ''' Overall validity of the ID
        ''' </summary>
        Public Property IsValid As Boolean = False

        ''' <summary>
        ''' Traffic light status (GREEN/YELLOW/RED)
        ''' </summary>
        Public Property Status As TrafficLightStatus = TrafficLightStatus.RED

        ''' <summary>
        ''' Status as string for database storage
        ''' </summary>
        Public ReadOnly Property StatusString As String
            Get
                Return Status.ToString()
            End Get
        End Property

        ''' <summary>
        ''' Human-readable status message
        ''' </summary>
        Public Property Message As String = ""

        ''' <summary>
        ''' Detailed reason for the status
        ''' </summary>
        Public Property StatusReason As String = ""

        ''' <summary>
        ''' Whether the ID format is valid (13 digits)
        ''' </summary>
        Public Property FormatValid As Boolean = False

        ''' <summary>
        ''' Whether the Luhn checksum passed
        ''' </summary>
        Public Property LuhnValid As Boolean = False

        ''' <summary>
        ''' Whether DHA verification succeeded
        ''' </summary>
        Public Property DHAVerified As Boolean = False

        ''' <summary>
        ''' Whether a duplicate was found at another SETA
        ''' </summary>
        Public Property DuplicateFound As Boolean = False

        ''' <summary>
        ''' Date of birth extracted from ID
        ''' </summary>
        Public Property DateOfBirth As Date

        ''' <summary>
        ''' Gender derived from ID (Male/Female)
        ''' </summary>
        Public Property Gender As String = ""

        ''' <summary>
        ''' Citizenship status (SA Citizen/Permanent Resident)
        ''' </summary>
        Public Property Citizenship As String = ""

        ''' <summary>
        ''' Age calculated from date of birth
        ''' </summary>
        Public Property Age As Integer = 0

        ''' <summary>
        ''' If duplicate found, the conflicting SETA ID
        ''' </summary>
        Public Property ConflictingSETAID As Integer? = Nothing

        ''' <summary>
        ''' If duplicate found, the conflicting SETA code
        ''' </summary>
        Public Property ConflictingSETACode As String = ""

        ''' <summary>
        ''' If duplicate found, the conflicting SETA name
        ''' </summary>
        Public Property ConflictingSETAName As String = ""

        ''' <summary>
        ''' First name returned from DHA (if different from input)
        ''' </summary>
        Public Property DHAFirstName As String = ""

        ''' <summary>
        ''' Surname returned from DHA (if different from input)
        ''' </summary>
        Public Property DHASurname As String = ""

        ''' <summary>
        ''' Creates a GREEN (verified) result
        ''' </summary>
        Public Shared Function CreateGreen(message As String) As VerificationResult
            Return New VerificationResult() With {
                .IsValid = True,
                .Status = TrafficLightStatus.GREEN,
                .Message = message,
                .StatusReason = "Identity verified successfully"
            }
        End Function

        ''' <summary>
        ''' Creates a YELLOW (review needed) result
        ''' </summary>
        Public Shared Function CreateYellow(message As String, reason As String) As VerificationResult
            Return New VerificationResult() With {
                .IsValid = True,
                .Status = TrafficLightStatus.YELLOW,
                .Message = message,
                .StatusReason = reason
            }
        End Function

        ''' <summary>
        ''' Creates a RED (blocked) result
        ''' </summary>
        Public Shared Function CreateRed(message As String, reason As String) As VerificationResult
            Return New VerificationResult() With {
                .IsValid = False,
                .Status = TrafficLightStatus.RED,
                .Message = message,
                .StatusReason = reason
            }
        End Function

    End Class

End Namespace
