Imports System.Net
Imports System.Net.Http
Imports System.Security.Claims
Imports System.Threading
Imports System.Threading.Tasks
Imports System.Web

Namespace Security

    ''' <summary>
    ''' HTTP Message Handler for JWT token validation
    ''' Validates Bearer token on protected endpoints
    ''' </summary>
    Public Class JwtAuthHandler
        Inherits DelegatingHandler

        Private ReadOnly _tokenService As New JwtTokenService()

        Protected Overrides Async Function SendAsync(request As HttpRequestMessage, cancellationToken As CancellationToken) As Task(Of HttpResponseMessage)
            ' Skip authentication for auth endpoints
            If request.RequestUri.AbsolutePath.ToLower().Contains("/api/auth/") Then
                Return Await MyBase.SendAsync(request, cancellationToken)
            End If

            ' Check for Authorization header
            If request.Headers.Authorization Is Nothing OrElse
               Not request.Headers.Authorization.Scheme.Equals("Bearer", StringComparison.OrdinalIgnoreCase) Then
                Return CreateUnauthorizedResponse(request, "Authorization header with Bearer token is required")
            End If

            Dim token As String = request.Headers.Authorization.Parameter
            If String.IsNullOrWhiteSpace(token) Then
                Return CreateUnauthorizedResponse(request, "Bearer token is required")
            End If

            Try
                ' Validate token
                Dim principal As ClaimsPrincipal = _tokenService.ValidateToken(token)

                ' Set the principal on the current context
                Thread.CurrentPrincipal = principal
                If HttpContext.Current IsNot Nothing Then
                    HttpContext.Current.User = principal
                End If

                ' Store SETA info in request properties for controllers
                Dim setaId = _tokenService.GetSetaIdFromToken(principal)
                Dim setaCode = _tokenService.GetSetaCodeFromToken(principal)

                request.Properties("JwtSetaId") = setaId
                request.Properties("JwtSetaCode") = setaCode

                ' Validate that JWT SETA matches API Key SETA (defense in depth)
                If request.Properties.ContainsKey("SetaId") Then
                    Dim apiKeySetaId = CInt(request.Properties("SetaId"))
                    If apiKeySetaId <> setaId Then
                        Return CreateUnauthorizedResponse(request, "Token SETA does not match API Key SETA")
                    End If
                End If

                Return Await MyBase.SendAsync(request, cancellationToken)

            Catch ex As Microsoft.IdentityModel.Tokens.SecurityTokenExpiredException
                Return CreateUnauthorizedResponse(request, "Token has expired")
            Catch ex As Microsoft.IdentityModel.Tokens.SecurityTokenValidationException
                Return CreateUnauthorizedResponse(request, "Invalid token")
            Catch ex As Exception
                Return CreateUnauthorizedResponse(request, "Token validation failed: " & ex.Message)
            End Try
        End Function

        Private Function CreateUnauthorizedResponse(request As HttpRequestMessage, message As String) As HttpResponseMessage
            Return request.CreateErrorResponse(HttpStatusCode.Unauthorized, message)
        End Function

    End Class

End Namespace
