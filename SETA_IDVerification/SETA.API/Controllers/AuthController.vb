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
        ''' Logout - revoke all tokens for the current user
        ''' </summary>
        ''' <remarks>
        ''' Revokes all refresh tokens for the authenticated user's SETA.
        ''' The JWT token will remain valid until expiration but no refresh is possible.
        ''' </remarks>
        <Route("logout")>
        <HttpPost>
        Public Function Logout() As IHttpActionResult
            ' Get SETA info from API Key (set by ApiKeyAuthAttribute)
            Dim setaId = CInt(Me.Request.Properties("SetaId"))

            ' Get username from request body or JWT if available
            Dim username As String = Nothing

            ' Try to get username from Authorization header (JWT)
            If Request.Headers.Authorization IsNot Nothing AndAlso
               Request.Headers.Authorization.Scheme = "Bearer" Then
                Try
                    Dim token = Request.Headers.Authorization.Parameter
                    Dim principal = _tokenService.ValidateToken(token)
                    If principal IsNot Nothing Then
                        username = principal.Identity.Name
                    End If
                Catch
                    ' Token might be expired, that's ok for logout
                End Try
            End If

            ' Revoke tokens
            Dim revokedCount = RevokeAllTokensForUser(setaId, username)

            ' Log the logout action
            Services.AuditLogService.LogAsync(
                setaId,
                Services.AuditLogService.ACTION_LOGOUT,
                "RefreshTokens",
                details:=$"User logged out. {revokedCount} refresh tokens revoked.",
                success:=True)

            Return Ok(ApiResponse(Of Object).SuccessResponse(New With {
                .message = "Successfully logged out",
                .tokensRevoked = revokedCount
            }))
        End Function

        ''' <summary>
        ''' Revoke a specific refresh token
        ''' </summary>
        <Route("revoke")>
        <HttpPost>
        Public Function RevokeToken(request As RevokeTokenRequest) As IHttpActionResult
            If request Is Nothing OrElse String.IsNullOrWhiteSpace(request.RefreshToken) Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of Object).ErrorResponse("INVALID_REQUEST", "Refresh token is required"))
            End If

            Dim setaId = CInt(Me.Request.Properties("SetaId"))

            ' Revoke the specific token
            Dim revoked = RevokeSpecificToken(request.RefreshToken, setaId)

            If Not revoked Then
                Return Content(HttpStatusCode.NotFound,
                    ApiResponse(Of Object).ErrorResponse("TOKEN_NOT_FOUND", "Refresh token not found or already revoked"))
            End If

            ' Log the action
            Services.AuditLogService.LogAsync(
                setaId,
                Services.AuditLogService.ACTION_LOGOUT,
                "RefreshTokens",
                details:="Refresh token manually revoked",
                success:=True)

            Return Ok(ApiResponse(Of Object).SuccessResponse(New With {
                .message = "Token successfully revoked"
            }))
        End Function

        ''' <summary>
        ''' Revoke all tokens for a user (admin endpoint)
        ''' </summary>
        <Route("revoke-all/{username}")>
        <HttpPost>
        Public Function RevokeAllUserTokens(username As String) As IHttpActionResult
            If String.IsNullOrWhiteSpace(username) Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of Object).ErrorResponse("INVALID_REQUEST", "Username is required"))
            End If

            Dim setaId = CInt(Me.Request.Properties("SetaId"))

            ' Revoke all tokens for this user
            Dim revokedCount = RevokeAllTokensForUser(setaId, username)

            ' Log the action
            Services.AuditLogService.LogAsync(
                setaId,
                Services.AuditLogService.ACTION_LOGOUT,
                "RefreshTokens",
                details:=$"Admin revoked all tokens for user {username}. {revokedCount} tokens revoked.",
                success:=True)

            Return Ok(ApiResponse(Of Object).SuccessResponse(New With {
                .message = $"All tokens revoked for user {username}",
                .tokensRevoked = revokedCount
            }))
        End Function

        ''' <summary>
        ''' Get current session info
        ''' </summary>
        <Route("session")>
        <HttpGet>
        Public Function GetSessionInfo() As IHttpActionResult
            Dim setaId = CInt(Me.Request.Properties("SetaId"))
            Dim setaCode = Me.Request.Properties("SetaCode").ToString()
            Dim setaName = If(Me.Request.Properties.ContainsKey("SetaName"),
                              Me.Request.Properties("SetaName").ToString(), "")

            Dim tokenInfo As Object = Nothing

            ' Try to extract info from JWT if present
            If Request.Headers.Authorization IsNot Nothing AndAlso
               Request.Headers.Authorization.Scheme = "Bearer" Then
                Try
                    Dim token = Request.Headers.Authorization.Parameter
                    Dim principal = _tokenService.ValidateToken(token)
                    If principal IsNot Nothing Then
                        tokenInfo = New With {
                            .username = principal.Identity.Name,
                            .isAuthenticated = principal.Identity.IsAuthenticated
                        }
                    End If
                Catch
                    ' Token might be invalid
                End Try
            End If

            Return Ok(ApiResponse(Of Object).SuccessResponse(New With {
                .setaId = setaId,
                .setaCode = setaCode,
                .setaName = setaName,
                .tokenInfo = tokenInfo,
                .timestamp = DateTime.UtcNow
            }))
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
                                .UserId = If(reader.IsDBNull(0), 0, reader.GetInt32(0)),
                                .Username = If(reader.IsDBNull(1), "", reader.GetString(1)),
                                .SetaId = If(reader.IsDBNull(2), 0, reader.GetInt32(2)),
                                .SetaCode = If(reader.IsDBNull(3), "", reader.GetString(3)),
                                .SetaName = If(reader.IsDBNull(4), "", reader.GetString(4))
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
                                .UserId = If(reader.IsDBNull(0), 0, reader.GetInt32(0)),
                                .Username = If(reader.IsDBNull(1), "", reader.GetString(1)),
                                .SetaId = If(reader.IsDBNull(2), 0, reader.GetInt32(2)),
                                .SetaCode = If(reader.IsDBNull(3), "", reader.GetString(3)),
                                .SetaName = If(reader.IsDBNull(4), "", reader.GetString(4))
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
        ''' Revoke all refresh tokens for a user
        ''' </summary>
        Private Function RevokeAllTokensForUser(setaId As Integer, username As String) As Integer
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString
            Dim revokedCount As Integer = 0

            Try
                Using conn As New SqlConnection(connectionString)
                    conn.Open()

                    Dim sql As String
                    If String.IsNullOrEmpty(username) Then
                        ' Revoke all tokens for this SETA (if no username provided)
                        sql = "UPDATE RefreshTokens SET IsRevoked = 1, RevokedAt = GETDATE() WHERE SETAID = @SETAID AND IsRevoked = 0"
                        Using cmd As New SqlCommand(sql, conn)
                            cmd.Parameters.AddWithValue("@SETAID", setaId)
                            revokedCount = cmd.ExecuteNonQuery()
                        End Using
                    Else
                        ' Revoke all tokens for this specific user
                        sql = "UPDATE RefreshTokens SET IsRevoked = 1, RevokedAt = GETDATE() WHERE SETAID = @SETAID AND Username = @Username AND IsRevoked = 0"
                        Using cmd As New SqlCommand(sql, conn)
                            cmd.Parameters.AddWithValue("@SETAID", setaId)
                            cmd.Parameters.AddWithValue("@Username", username)
                            revokedCount = cmd.ExecuteNonQuery()
                        End Using
                    End If
                End Using
            Catch ex As Exception
                System.Diagnostics.Debug.WriteLine("Failed to revoke tokens: " & ex.Message)
            End Try

            Return revokedCount
        End Function

        ''' <summary>
        ''' Revoke a specific refresh token
        ''' </summary>
        Private Function RevokeSpecificToken(refreshToken As String, setaId As Integer) As Boolean
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

            Try
                Using conn As New SqlConnection(connectionString)
                    conn.Open()

                    Dim sql As String = "UPDATE RefreshTokens SET IsRevoked = 1, RevokedAt = GETDATE() WHERE RefreshToken = @RefreshToken AND SETAID = @SETAID AND IsRevoked = 0"
                    Using cmd As New SqlCommand(sql, conn)
                        cmd.Parameters.AddWithValue("@RefreshToken", refreshToken)
                        cmd.Parameters.AddWithValue("@SETAID", setaId)
                        Return cmd.ExecuteNonQuery() > 0
                    End Using
                End Using
            Catch ex As Exception
                System.Diagnostics.Debug.WriteLine("Failed to revoke token: " & ex.Message)
            End Try

            Return False
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
