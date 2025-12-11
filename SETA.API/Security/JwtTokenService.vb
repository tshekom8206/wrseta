Imports System.Configuration
Imports System.IdentityModel.Tokens.Jwt
Imports System.Security.Claims
Imports System.Text
Imports Microsoft.IdentityModel.Tokens

Namespace Security

    ''' <summary>
    ''' Service for generating and validating JWT tokens
    ''' </summary>
    Public Class JwtTokenService

        Private ReadOnly _secretKey As String
        Private ReadOnly _expirationMinutes As Integer
        Private ReadOnly _issuer As String = "SETA.API"
        Private ReadOnly _audience As String = "SETA.LMS"

        Public Sub New()
            _secretKey = ConfigurationManager.AppSettings("JwtSecretKey")
            _expirationMinutes = Integer.Parse(ConfigurationManager.AppSettings("JwtExpirationMinutes"))

            If String.IsNullOrEmpty(_secretKey) OrElse _secretKey.Length < 32 Then
                Throw New ConfigurationErrorsException("JwtSecretKey must be at least 32 characters")
            End If
        End Sub

        ''' <summary>
        ''' Generate a JWT token for authenticated user
        ''' </summary>
        Public Function GenerateToken(setaId As Integer, setaCode As String, setaName As String, username As String) As TokenResult
            Dim expiresAt As DateTime = DateTime.UtcNow.AddMinutes(_expirationMinutes)
            Dim refreshToken As String = GenerateRefreshToken()

            Dim securityKey = New SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secretKey))
            Dim credentials = New SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256)

            Dim claims As New List(Of Claim) From {
                New Claim(JwtRegisteredClaimNames.Sub, username),
                New Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                New Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64),
                New Claim("setaId", setaId.ToString()),
                New Claim("setaCode", setaCode),
                New Claim("setaName", setaName)
            }

            Dim token = New JwtSecurityToken(
                issuer:=_issuer,
                audience:=_audience,
                claims:=claims,
                notBefore:=DateTime.UtcNow,
                expires:=expiresAt,
                signingCredentials:=credentials
            )

            Dim tokenHandler = New JwtSecurityTokenHandler()
            Dim tokenString = tokenHandler.WriteToken(token)

            Return New TokenResult With {
                .Token = tokenString,
                .ExpiresAt = expiresAt,
                .RefreshToken = refreshToken,
                .SetaId = setaId,
                .SetaCode = setaCode,
                .SetaName = setaName
            }
        End Function

        ''' <summary>
        ''' Validate a JWT token and extract claims
        ''' </summary>
        Public Function ValidateToken(token As String) As ClaimsPrincipal
            Dim tokenHandler = New JwtSecurityTokenHandler()
            Dim securityKey = New SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secretKey))

            Dim validationParameters = New TokenValidationParameters With {
                .ValidateIssuer = True,
                .ValidIssuer = _issuer,
                .ValidateAudience = True,
                .ValidAudience = _audience,
                .ValidateIssuerSigningKey = True,
                .IssuerSigningKey = securityKey,
                .ValidateLifetime = True,
                .ClockSkew = TimeSpan.FromMinutes(5)
            }

            Dim validatedToken As SecurityToken = Nothing
            Return tokenHandler.ValidateToken(token, validationParameters, validatedToken)
        End Function

        ''' <summary>
        ''' Extract SETA ID from validated token
        ''' </summary>
        Public Function GetSetaIdFromToken(principal As ClaimsPrincipal) As Integer
            Dim setaIdClaim = principal.FindFirst("setaId")
            If setaIdClaim IsNot Nothing Then
                Return Integer.Parse(setaIdClaim.Value)
            End If
            Return 0
        End Function

        ''' <summary>
        ''' Extract SETA Code from validated token
        ''' </summary>
        Public Function GetSetaCodeFromToken(principal As ClaimsPrincipal) As String
            Dim setaCodeClaim = principal.FindFirst("setaCode")
            If setaCodeClaim IsNot Nothing Then
                Return setaCodeClaim.Value
            End If
            Return String.Empty
        End Function

        ''' <summary>
        ''' Generate a secure refresh token
        ''' </summary>
        Private Function GenerateRefreshToken() As String
            Dim randomBytes(31) As Byte
            Using rng = System.Security.Cryptography.RandomNumberGenerator.Create()
                rng.GetBytes(randomBytes)
            End Using
            Return Convert.ToBase64String(randomBytes)
        End Function

        ''' <summary>
        ''' Token generation result
        ''' </summary>
        Public Class TokenResult
            Public Property Token As String
            Public Property ExpiresAt As DateTime
            Public Property RefreshToken As String
            Public Property SetaId As Integer
            Public Property SetaCode As String
            Public Property SetaName As String
        End Class

    End Class

End Namespace
