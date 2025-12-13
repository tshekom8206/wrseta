Imports System.Web.Http
Imports System.Web.Http.Cors
Imports SETA.API.Services
Imports SETA.API.Models

Namespace Controllers

    ''' <summary>
    ''' DHA (Department of Home Affairs) API proxy controller
    ''' Provides endpoints for ID verification with Redis caching
    ''' </summary>
    <EnableCors("*", "*", "*")>
    <RoutePrefix("api/dha")>
    Public Class DHAController
        Inherits ApiController

        ''' <summary>
        ''' Verify a person by ID number via DHA
        ''' Checks Redis cache first, then calls DHA API if not cached
        ''' </summary>
        ''' <param name="idNumber">South African ID number (13 digits)</param>
        ''' <returns>Person verification result with demographic data</returns>
        <HttpGet>
        <Route("person/{idNumber}")>
        Public Function GetPerson(idNumber As String) As IHttpActionResult
            ' Validate ID number format
            If String.IsNullOrEmpty(idNumber) OrElse idNumber.Length <> 13 Then
                Return Content(Net.HttpStatusCode.BadRequest, New With {
                    .success = False,
                    .errorCode = "INVALID_ID_FORMAT",
                    .errorMessage = "ID number must be exactly 13 digits"
                })
            End If

            ' Check if numeric
            If Not idNumber.All(AddressOf Char.IsDigit) Then
                Return Content(Net.HttpStatusCode.BadRequest, New With {
                    .success = False,
                    .errorCode = "INVALID_ID_FORMAT",
                    .errorMessage = "ID number must contain only digits"
                })
            End If

            ' Verify with DHA (via cache or API)
            Dim result = DHAVerificationService.VerifyIdNumber(idNumber)

            If result.Success Then
                Return Ok(New With {
                    .success = True,
                    .data = New With {
                        .idNumber = idNumber,
                        .firstName = result.FirstName,
                        .surname = result.Surname,
                        .dateOfBirth = result.DateOfBirth,
                        .gender = result.Gender,
                        .citizenship = result.Citizenship,
                        .race = result.Race,
                        .maritalStatus = result.MaritalStatus,
                        .issueDate = result.IssueDate,
                        .isDeceased = result.IsDeceased,
                        .dateOfDeath = result.DateOfDeath,
                        .isSuspended = result.IsSuspended,
                        .needsManualReview = result.NeedsManualReview
                    },
                    .source = result.Source,
                    .requestId = result.RequestId,
                    .timestamp = DateTime.UtcNow
                })
            Else
                ' Return appropriate status code based on error
                If result.ErrorCode = "ID_NOT_FOUND" Then
                    ' Return 404 with body so frontend knows it's "not found" vs "offline"
                    Return Content(Net.HttpStatusCode.NotFound, New With {
                        .success = False,
                        .errorCode = result.ErrorCode,
                        .errorMessage = "ID number not found in DHA database",
                        .needsManualReview = result.NeedsManualReview
                    })
                ElseIf result.CircuitBreakerOpen Then
                    Return Content(Net.HttpStatusCode.ServiceUnavailable, New With {
                        .success = False,
                        .errorCode = result.ErrorCode,
                        .errorMessage = If(result.ErrorMessage, "DHA service is currently unavailable"),
                        .circuitBreakerOpen = True,
                        .needsManualReview = result.NeedsManualReview
                    })
                ElseIf result.ErrorCode = "DHA_CONNECTION_ERROR" OrElse result.ErrorCode = "DHA_TIMEOUT" Then
                    ' Connection/timeout errors - service is offline
                    Return Content(Net.HttpStatusCode.ServiceUnavailable, New With {
                        .success = False,
                        .errorCode = result.ErrorCode,
                        .errorMessage = If(result.ErrorMessage, "DHA service is offline - please try again later"),
                        .needsManualReview = result.NeedsManualReview
                    })
                Else
                    Return Content(Net.HttpStatusCode.BadGateway, New With {
                        .success = False,
                        .errorCode = result.ErrorCode,
                        .errorMessage = If(result.ErrorMessage, "DHA service error"),
                        .needsManualReview = result.NeedsManualReview
                    })
                End If
            End If
        End Function

        ''' <summary>
        ''' Get DHA service and cache status
        ''' </summary>
        <HttpGet>
        <Route("status")>
        Public Function GetStatus() As IHttpActionResult
            Dim status = DHAVerificationService.GetServiceStatus()
            Return Ok(New With {
                .success = True,
                .status = status,
                .timestamp = DateTime.UtcNow
            })
        End Function

        ''' <summary>
        ''' Clear cache entry for a specific ID number (admin operation)
        ''' </summary>
        ''' <param name="idNumber">ID number to clear from cache</param>
        <HttpDelete>
        <Route("cache/{idNumber}")>
        Public Function ClearCache(idNumber As String) As IHttpActionResult
            ' Validate ID number format
            If String.IsNullOrEmpty(idNumber) OrElse idNumber.Length <> 13 Then
                Return Content(Net.HttpStatusCode.BadRequest, New With {
                    .success = False,
                    .errorCode = "INVALID_ID_FORMAT",
                    .errorMessage = "ID number must be exactly 13 digits"
                })
            End If

            Try
                Dim removed = RedisCacheService.RemovePersonData(idNumber)
                Return Ok(New With {
                    .success = True,
                    .removed = removed,
                    .idNumber = idNumber,
                    .timestamp = DateTime.UtcNow
                })
            Catch ex As Exception
                Return Content(Net.HttpStatusCode.InternalServerError, New With {
                    .success = False,
                    .errorCode = "CACHE_ERROR",
                    .errorMessage = "Failed to clear cache: " & ex.Message
                })
            End Try
        End Function

        ''' <summary>
        ''' Check if Redis cache is available
        ''' </summary>
        <HttpGet>
        <Route("cache/health")>
        Public Function GetCacheHealth() As IHttpActionResult
            Dim isAvailable = RedisCacheService.IsAvailable()
            Dim cacheStatus = RedisCacheService.GetStatus()

            If isAvailable Then
                Return Ok(New With {
                    .success = True,
                    .cacheAvailable = True,
                    .status = cacheStatus,
                    .timestamp = DateTime.UtcNow
                })
            Else
                Return Content(Net.HttpStatusCode.ServiceUnavailable, New With {
                    .success = False,
                    .cacheAvailable = False,
                    .status = cacheStatus,
                    .timestamp = DateTime.UtcNow
                })
            End If
        End Function

    End Class

End Namespace
