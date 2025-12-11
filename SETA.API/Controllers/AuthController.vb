Imports System.Net
Imports System.Net.Http
Imports System.Web.Http
Imports System.Data.SqlClient
Imports System.Configuration
Imports System.Security.Cryptography
Imports System.Text
Imports SETA.API.Models
Imports SETA.API.Security

Namespace SETA.API.Controllers

    ''' <summary>
    ''' Authentication controller for JWT token generation
    ''' </summary>
    <RoutePrefix("api/auth")>
    <ApiKeyAuth>
    Public Class AuthController
        Inherits ApiController

        Private ReadOnly _tokenService As New JwtTokenService()

        ''' <summary>
        ''' Generate JWT token using credentials
        ''' </summary>
        ''' <remarks>
        ''' Requires valid API Key in X-API-Key header
        ''' </remarks>
        <Route("token")>
        <HttpPost>
        Public Function GetToken(request As AuthTokenRequest) As IHttpActionResult
            ' Validate request
            If request Is Nothing Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of AuthTokenResponse).ErrorResponse("INVALID_REQUEST", "Request body is required"))
            End If

            If String.IsNullOrWhiteSpace(request.Username) OrElse String.IsNullOrWhiteSpace(request.Password) Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of AuthTokenResponse).ErrorResponse("INVALID_CREDENTIALS", "Username and password are required"))
            End If

            ' Get SETA info from API Key (set by ApiKeyAuthAttribute)
            Dim apiKeySetaId = CInt(Me.Request.Properties("SetaId"))
            Dim apiKeySetaCode = Me.Request.Properties("SetaCode").ToString()

            ' Validate that requested SETA matches API Key SETA
            If request.SetaId <> apiKeySetaId Then
                Return Content(HttpStatusCode.Forbidden,
                    ApiResponse(Of AuthTokenResponse).ErrorResponse("SETA_MISMATCH", "Requested SETA does not match API Key SETA"))
            End If

            ' Validate credentials against database
            Dim userInfo = ValidateUserCredentials(request.Username, request.Password, request.SetaId)
            If userInfo Is Nothing Then
                Return Content(HttpStatusCode.Unauthorized,
                    ApiResponse(Of AuthTokenResponse).ErrorResponse("INVALID_CREDENTIALS", "Invalid username or password"))
            End If

            ' Generate JWT token
            Dim tokenResult = _tokenService.GenerateToken(
                userInfo.SetaId,
                userInfo.SetaCode,
                userInfo.SetaName,
                request.Username)

            ' Store refresh token in database
            StoreRefreshToken(userInfo.SetaId, request.Username, tokenResult.RefreshToken, tokenResult.ExpiresAt.AddDays(7))

            Dim response = New AuthTokenResponse With {
                .Token = tokenResult.Token,
                .ExpiresAt = tokenResult.ExpiresAt,
                .RefreshToken = tokenResult.RefreshToken,
                .SetaId = tokenResult.SetaId,
                .SetaCode = tokenResult.SetaCode,
                .SetaName = tokenResult.SetaName
            }

            Return Ok(ApiResponse(Of AuthTokenResponse).SuccessResponse(response))
        End Function

        ''' <summary>
        ''' Refresh an expired token using refresh token
        ''' </summary>
        <Route("refresh")>
        <HttpPost>
        Public Function RefreshToken(request As RefreshTokenRequest) As IHttpActionResult
            If request Is Nothing OrElse String.IsNullOrWhiteSpace(request.RefreshToken) Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of AuthTokenResponse).ErrorResponse("INVALID_REQUEST", "Refresh token is required"))
            End If

            ' Validate refresh token and get user info
            Dim userInfo = ValidateRefreshToken(request.RefreshToken)
            If userInfo Is Nothing Then
                Return Content(HttpStatusCode.Unauthorized,
                    ApiResponse(Of AuthTokenResponse).ErrorResponse("INVALID_REFRESH_TOKEN", "Invalid or expired refresh token"))
            End If

            ' Generate new JWT token
            Dim tokenResult = _tokenService.GenerateToken(
                userInfo.SetaId,
                userInfo.SetaCode,
                userInfo.SetaName,
                userInfo.Username)

            ' Update refresh token in database
            StoreRefreshToken(userInfo.SetaId, userInfo.Username, tokenResult.RefreshToken, tokenResult.ExpiresAt.AddDays(7))

            Dim response = New AuthTokenResponse With {
                .Token = tokenResult.Token,
                .ExpiresAt = tokenResult.ExpiresAt,
                .RefreshToken = tokenResult.RefreshToken,
                .SetaId = tokenResult.SetaId,
                .SetaCode = tokenResult.SetaCode,
                .SetaName = tokenResult.SetaName
            }

            Return Ok(ApiResponse(Of AuthTokenResponse).SuccessResponse(response))
        End Function

        ''' <summary>
        ''' Validate user credentials against database
        ''' </summary>
        Private Function ValidateUserCredentials(username As String, password As String, setaId As Integer) As UserInfo
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString
            Dim passwordHash As String = ComputeSha256Hash(password)

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                Dim sql As String = "
                    SELECT u.UserID, u.Username, s.SETAID, s.SETACode, s.SETAName
                    FROM ApiUsers u
                    INNER JOIN SETAs s ON u.SETAID = s.SETAID
                    WHERE u.Username = @Username
                      AND u.PasswordHash = @PasswordHash
                      AND u.SETAID = @SETAID
                      AND u.IsActive = 1
                      AND s.IsActive = 1"

                Using cmd As New SqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@Username", username)
                    cmd.Parameters.AddWithValue("@PasswordHash", passwordHash)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        If reader.Read() Then
                            Return New UserInfo With {
                                .UserId = reader.GetInt32(0),
                                .Username = reader.GetString(1),
                                .SetaId = reader.GetInt32(2),
                                .SetaCode = reader.GetString(3),
                                .SetaName = reader.GetString(4)
                            }
                        End If
                    End Using
                End Using
            End Using

            Return Nothing
        End Function

        ''' <summary>
        ''' Validate refresh token and return user info
        ''' </summary>
        Private Function ValidateRefreshToken(refreshToken As String) As UserInfo
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                Dim sql As String = "
                    SELECT rt.UserID, rt.Username, s.SETAID, s.SETACode, s.SETAName
                    FROM RefreshTokens rt
                    INNER JOIN SETAs s ON rt.SETAID = s.SETAID
                    WHERE rt.RefreshToken = @RefreshToken
                      AND rt.ExpiresAt > GETDATE()
                      AND rt.IsRevoked = 0"

                Using cmd As New SqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@RefreshToken", refreshToken)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        If reader.Read() Then
                            Return New UserInfo With {
                                .UserId = reader.GetInt32(0),
                                .Username = reader.GetString(1),
                                .SetaId = reader.GetInt32(2),
                                .SetaCode = reader.GetString(3),
                                .SetaName = reader.GetString(4)
                            }
                        End If
                    End Using
                End Using
            End Using

            Return Nothing
        End Function

        ''' <summary>
        ''' Store refresh token in database
        ''' </summary>
        Private Sub StoreRefreshToken(setaId As Integer, username As String, refreshToken As String, expiresAt As DateTime)
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

            Try
                Using conn As New SqlConnection(connectionString)
                    conn.Open()

                    ' Revoke existing tokens for this user
                    Dim revokeSQL As String = "UPDATE RefreshTokens SET IsRevoked = 1 WHERE Username = @Username AND SETAID = @SETAID"
                    Using revokeCmd As New SqlCommand(revokeSQL, conn)
                        revokeCmd.Parameters.AddWithValue("@Username", username)
                        revokeCmd.Parameters.AddWithValue("@SETAID", setaId)
                        revokeCmd.ExecuteNonQuery()
                    End Using

                    ' Insert new refresh token
                    Dim insertSQL As String = "
                        INSERT INTO RefreshTokens (SETAID, Username, RefreshToken, ExpiresAt, CreatedAt, IsRevoked)
                        VALUES (@SETAID, @Username, @RefreshToken, @ExpiresAt, GETDATE(), 0)"
                    Using insertCmd As New SqlCommand(insertSQL, conn)
                        insertCmd.Parameters.AddWithValue("@SETAID", setaId)
                        insertCmd.Parameters.AddWithValue("@Username", username)
                        insertCmd.Parameters.AddWithValue("@RefreshToken", refreshToken)
                        insertCmd.Parameters.AddWithValue("@ExpiresAt", expiresAt)
                        insertCmd.ExecuteNonQuery()
                    End Using
                End Using
            Catch ex As Exception
                System.Diagnostics.Debug.WriteLine("Failed to store refresh token: " & ex.Message)
            End Try
        End Sub

        ''' <summary>
        ''' Compute SHA256 hash
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
        ''' User information from database
        ''' </summary>
        Private Class UserInfo
            Public Property UserId As Integer
            Public Property Username As String
            Public Property SetaId As Integer
            Public Property SetaCode As String
            Public Property SetaName As String
        End Class

    End Class

End Namespace
