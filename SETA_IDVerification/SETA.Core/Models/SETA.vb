' =============================================
' Multi-SETA ID Verification System
' Model: SETA (Sector Education & Training Authority)
' =============================================

Namespace Models

    ''' <summary>
    ''' Represents one of the 21 South African SETAs
    ''' </summary>
    Public Class SetaInfo

        ''' <summary>
        ''' Primary key identifier
        ''' </summary>
        Public Property SETAID As Integer

        ''' <summary>
        ''' Unique code for the SETA (e.g., "WRSETA", "MICT", "SERVICES")
        ''' </summary>
        Public Property SETACode As String

        ''' <summary>
        ''' Full name of the SETA
        ''' </summary>
        Public Property SETAName As String

        ''' <summary>
        ''' Economic sector covered by this SETA
        ''' </summary>
        Public Property Sector As String

        ''' <summary>
        ''' Whether the SETA is currently active in the system
        ''' </summary>
        Public Property IsActive As Boolean = True

        ''' <summary>
        ''' Date when the SETA was added to the system
        ''' </summary>
        Public Property CreatedDate As DateTime = DateTime.Now

        ''' <summary>
        ''' Returns the SETA code and name for display
        ''' </summary>
        Public Overrides Function ToString() As String
            Return $"{SETACode} - {SETAName}"
        End Function

    End Class

End Namespace
