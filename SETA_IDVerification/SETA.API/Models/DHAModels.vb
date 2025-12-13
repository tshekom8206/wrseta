Imports System

Namespace Models

    ''' <summary>
    ''' Response wrapper from DHA API
    ''' </summary>
    Public Class DHAApiResponse
        Public Property Success As Boolean
        Public Property Data As DHAPersonData
        Public Property Timestamp As DateTime
        Public Property RequestId As String
        Public Property ErrorCode As String
        Public Property ErrorMessage As String
    End Class

    ''' <summary>
    ''' Person data from DHA API
    ''' </summary>
    Public Class DHAPersonData
        Public Property PersonId As Integer
        Public Property IdNumber As String
        Public Property FirstName As String
        Public Property Surname As String
        Public Property DateOfBirth As DateTime
        Public Property Gender As String
        Public Property Citizenship As String
        Public Property Race As String
        Public Property IssueDate As DateTime
        Public Property MaritalStatus As String
        Public Property IsDeceased As Boolean
        Public Property DateOfDeath As DateTime?
        Public Property IsSuspended As Boolean
        Public Property NeedsManualReview As Boolean
        Public Property CreatedAt As DateTime
        Public Property UpdatedAt As DateTime
    End Class

    ''' <summary>
    ''' Cached person data (stored in Redis)
    ''' </summary>
    Public Class CachedDHAPersonData
        Public Property Data As DHAPersonData
        Public Property CachedAt As DateTime
        Public Property ExpiresAt As DateTime
        Public Property Source As String ' "DHA_API" or "CACHE"
    End Class

End Namespace
