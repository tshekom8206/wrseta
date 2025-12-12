Imports System.Net
Imports System.Net.Http
Imports System.Web.Http.Controllers
Imports System.Web.Http.Filters
Imports System.Data.SqlClient
Imports System.Configuration
Imports System.Security.Cryptography
Imports System.Text

Namespace Security

    ''' <summary>
    ''' API Key authentication filter attribute
    ''' Validates X-API-Key header against database
    ''' </summary>
    Public Class ApiKeyAuthAttribute
        Inherits ActionFilterAttribute

        Private Const API_KEY_HEADER As String = "X-API-Key"

        Public Overrides Sub OnActionExecuting(actionContext As HttpActionContext)
            ' Check for API key header
            Dim apiKeyValues As IEnumerable(Of String) = Nothing
            If Not actionContext.Request.Headers.TryGetValues(API_KEY_HEADER, apiKeyValues) Then
                actionContext.Response = actionContext.Request.CreateErrorResponse(
                    HttpStatusCode.Unauthorized,
                    "API Key is required. Include X-API-Key header.")
                Return
            End If

            Dim apiKey As String = apiKeyValues.FirstOrDefault()
            If String.IsNullOrWhiteSpace(apiKey) Then
                actionContext.Response = actionContext.Request.CreateErrorResponse(
                    HttpStatusCode.Unauthorized,
                    "API Key is required. Include X-API-Key header.")
                Return
            End If

            ' Validate API key against database
            Dim apiKeyInfo = ValidateApiKey(apiKey)
            If apiKeyInfo Is Nothing Then
                actionContext.Response = actionContext.Request.CreateErrorResponse(
                    HttpStatusCode.Unauthorized,
                    "Invalid or expired API Key.")
                Return
            End If

            ' Check rate limiting
            If IsRateLimitExceeded(apiKeyInfo.ApiKeyId, apiKeyInfo.RateLimit) Then
                actionContext.Response = actionContext.Request.CreateErrorResponse(
                    CType(429, HttpStatusCode),
                    "Rate limit exceeded. Please try again later.")
                Return
            End If

            ' Store API key info in request properties for later use
            actionContext.Request.Properties("ApiKeyId") = apiKeyInfo.ApiKeyId
            actionContext.Request.Properties("SetaId") = apiKeyInfo.SetaId
            actionContext.Request.Properties("SetaCode") = apiKeyInfo.SetaCode

            ' Update last used date
            UpdateApiKeyLastUsed(apiKeyInfo.ApiKeyId)

            MyBase.OnActionExecuting(actionContext)
        End Sub

        ''' <summary>
        ''' Validate API key against database
        ''' </summary>
        Private Function ValidateApiKey(apiKey As String) As ApiKeyInfo
            Dim apiKeyHash As String = ComputeSha256Hash(apiKey)
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                Dim sql As String = "
                    SELECT ak.ApiKeyID, ak.SETAID, ak.RateLimit, ak.ExpiresDate, s.SETACode, s.SETAName
                    FROM ApiKeys ak
                    INNER JOIN SETAs s ON ak.SETAID = s.SETAID
                    WHERE ak.ApiKeyHash = @ApiKeyHash
                      AND ak.IsActive = 1
                      AND (ak.ExpiresDate IS NULL OR ak.ExpiresDate > GETDATE())"

                Using cmd As New SqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@ApiKeyHash", apiKeyHash)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        If reader.Read() Then
                            Return New ApiKeyInfo With {
                                .ApiKeyId = reader.GetInt32(0),
                                .SetaId = reader.GetInt32(1),
                                .RateLimit = reader.GetInt32(2),
                                .ExpiresDate = If(reader.IsDBNull(3), Nothing, reader.GetDateTime(3)),
                                .SetaCode = reader.GetString(4),
                                .SetaName = reader.GetString(5)
                            }
                        End If
                    End Using
                End Using
            End Using

            Return Nothing
        End Function

        ''' <summary>
        ''' Check if rate limit is exceeded for this API key
        ''' </summary>
        Private Function IsRateLimitExceeded(apiKeyId As Integer, rateLimit As Integer) As Boolean
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                ' Count requests in the last hour
                Dim sql As String = "
                    SELECT COUNT(*)
                    FROM ApiRequestLog
                    WHERE ApiKeyID = @ApiKeyID
                      AND RequestedAt > DATEADD(HOUR, -1, GETDATE())"

                Using cmd As New SqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@ApiKeyID", apiKeyId)
                    Dim count As Integer = CInt(cmd.ExecuteScalar())
                    Return count >= rateLimit
                End Using
            End Using
        End Function

        ''' <summary>
        ''' Update the last used date for the API key
        ''' </summary>
        Private Sub UpdateApiKeyLastUsed(apiKeyId As Integer)
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

            Try
                Using conn As New SqlConnection(connectionString)
                    conn.Open()

                    Dim sql As String = "UPDATE ApiKeys SET LastUsedDate = GETDATE() WHERE ApiKeyID = @ApiKeyID"
                    Using cmd As New SqlCommand(sql, conn)
                        cmd.Parameters.AddWithValue("@ApiKeyID", apiKeyId)
                        cmd.ExecuteNonQuery()
                    End Using
                End Using
            Catch ex As Exception
                ' Log but don't fail the request
                System.Diagnostics.Debug.WriteLine("Failed to update API key last used: " & ex.Message)
            End Try
        End Sub

        ''' <summary>
        ''' Compute SHA256 hash of a string
        ''' </summary>
        Private Function ComputeSha256Hash(input As String) As String
            Using sha256 As SHA256 = SHA256.Create()
                Dim bytes As Byte() = sha256.ComputeHash(Encoding.UTF8.GetBytes(input))
                Dim builder As New StringBuilder()
                For Each b As Byte In bytes
                    builder.Append(b.ToString("X2"))
                Next
                Return builder.ToString()
            End Using
        End Function

        ''' <summary>
        ''' API Key information from database
        ''' </summary>
        Public Class ApiKeyInfo
            Public Property ApiKeyId As Integer
            Public Property SetaId As Integer
            Public Property SetaCode As String
            Public Property SetaName As String
            Public Property RateLimit As Integer
            Public Property ExpiresDate As DateTime?
        End Class

    End Class

End Namespace
