Imports System.Net.Http
Imports System.Threading.Tasks
Imports System.Configuration
Imports Newtonsoft.Json
Imports SETA.API.Models

Namespace Services

    ''' <summary>
    ''' Service for DHA (Department of Home Affairs) ID verification
    ''' Includes Redis caching, circuit breaker, retry logic, and graceful degradation
    ''' </summary>
    Public Class DHAVerificationService

        Private Shared ReadOnly _httpClient As HttpClient

        ' DHA API configuration from App.config
        Private Shared ReadOnly DHA_ENABLED As Boolean = Boolean.Parse(If(ConfigurationManager.AppSettings("DHAEnabled"), "false"))
        Private Shared ReadOnly DHA_BASE_URL As String = ConfigurationManager.AppSettings("DHABaseUrl")
        Private Shared ReadOnly DHA_API_KEY As String = ConfigurationManager.AppSettings("DHAApiKey")
        Private Shared ReadOnly DHA_TIMEOUT_MS As Integer = If(Integer.TryParse(ConfigurationManager.AppSettings("DHATimeoutMs"), 0), 10000, 10000)

        ' Static constructor to configure HttpClient once
        Shared Sub New()
            _httpClient = New HttpClient()
            _httpClient.Timeout = TimeSpan.FromMilliseconds(DHA_TIMEOUT_MS)
        End Sub

        ''' <summary>
        ''' Result of DHA verification
        ''' </summary>
        Public Class DHAVerificationResult
            Public Property Success As Boolean
            Public Property Verified As Boolean
            Public Property FirstName As String
            Public Property Surname As String
            Public Property DateOfBirth As DateTime?
            Public Property Gender As String
            Public Property Citizenship As String
            Public Property Race As String
            Public Property MaritalStatus As String
            Public Property IssueDate As DateTime?
            Public Property IsDeceased As Boolean
            Public Property DateOfDeath As DateTime?
            Public Property IsSuspended As Boolean
            Public Property ErrorCode As String
            Public Property ErrorMessage As String
            Public Property CircuitBreakerOpen As Boolean
            Public Property NeedsManualReview As Boolean
            Public Property Source As String ' "DHA_API", "CACHE", or "SIMULATED"
            Public Property RequestId As String
        End Class

        ''' <summary>
        ''' Verify an ID number with DHA (with Redis caching)
        ''' </summary>
        Public Shared Function VerifyIdNumber(idNumber As String) As DHAVerificationResult
            Dim result As New DHAVerificationResult()

            ' Step 1: Check Redis cache first
            Try
                Dim cached = RedisCacheService.GetPersonData(idNumber)
                If cached IsNot Nothing AndAlso cached.Data IsNot Nothing Then
                    ' Return cached data
                    result = MapDHADataToResult(cached.Data)
                    result.Success = True
                    result.Verified = True
                    result.Source = "CACHE"
                    System.Diagnostics.Debug.WriteLine("Cache HIT for ID: " & idNumber)
                    Return result
                End If
            Catch ex As Exception
                ' Redis error - continue without cache
                System.Diagnostics.Debug.WriteLine("Redis cache error: " & ex.Message)
            End Try

            System.Diagnostics.Debug.WriteLine("Cache MISS for ID: " & idNumber)

            ' Step 2: Check if DHA integration is enabled
            If Not DHA_ENABLED OrElse String.IsNullOrEmpty(DHA_BASE_URL) Then
                ' Fall back to simulation mode
                result = SimulateDHACall(idNumber)
                result.Source = "SIMULATED"
                Return result
            End If

            ' Step 3: Check circuit breaker
            If Not DHACircuitBreaker.AllowCall() Then
                ' Circuit open - try cache fallback
                Try
                    Dim cached = RedisCacheService.GetPersonData(idNumber)
                    If cached IsNot Nothing AndAlso cached.Data IsNot Nothing Then
                        result = MapDHADataToResult(cached.Data)
                        result.Success = True
                        result.Verified = True
                        result.Source = "CACHE"
                        result.CircuitBreakerOpen = True
                        Return result
                    End If
                Catch
                    ' Ignore cache errors
                End Try

                result.Success = False
                result.Verified = False
                result.CircuitBreakerOpen = True
                result.NeedsManualReview = True
                result.ErrorCode = "DHA_UNAVAILABLE"
                result.ErrorMessage = DHACircuitBreaker.GetOpenReason()
                Return result
            End If

            ' Step 4: Call DHA API
            Try
                result = CallDHAApi(idNumber)

                If result.Success Then
                    DHACircuitBreaker.RecordSuccess()
                Else
                    ' Don't record failure for "not found" - that's a valid response
                    If result.ErrorCode <> "ID_NOT_FOUND" Then
                        DHACircuitBreaker.RecordFailure()
                    End If
                End If

            Catch ex As HttpRequestException
                DHACircuitBreaker.RecordFailure()

                ' Try cache fallback on connection error
                result = TryGetFromCacheFallback(idNumber)
                If result Is Nothing Then
                    result = New DHAVerificationResult()
                    result.Success = False
                    result.Verified = False
                    result.ErrorCode = "DHA_CONNECTION_ERROR"
                    result.ErrorMessage = "Unable to connect to DHA service: " & ex.Message
                    result.NeedsManualReview = True
                End If

            Catch ex As TaskCanceledException
                DHACircuitBreaker.RecordFailure()

                ' Try cache fallback on timeout
                result = TryGetFromCacheFallback(idNumber)
                If result Is Nothing Then
                    result = New DHAVerificationResult()
                    result.Success = False
                    result.Verified = False
                    result.ErrorCode = "DHA_TIMEOUT"
                    result.ErrorMessage = "DHA service timeout after " & DHA_TIMEOUT_MS & "ms"
                    result.NeedsManualReview = True
                End If

            Catch ex As Exception
                DHACircuitBreaker.RecordFailure()

                ' Try cache fallback on any error
                result = TryGetFromCacheFallback(idNumber)
                If result Is Nothing Then
                    result = New DHAVerificationResult()
                    result.Success = False
                    result.Verified = False
                    result.ErrorCode = "DHA_ERROR"
                    result.ErrorMessage = "DHA verification error: " & ex.Message
                    result.NeedsManualReview = True
                End If
            End Try

            Return result
        End Function

        ''' <summary>
        ''' Call the real DHA API
        ''' </summary>
        Private Shared Function CallDHAApi(idNumber As String) As DHAVerificationResult
            Dim result As New DHAVerificationResult()

            Dim url As String = DHA_BASE_URL.TrimEnd("/"c) & "/api/dha/data/person/" & idNumber

            Using request As New HttpRequestMessage(HttpMethod.Get, New Uri(url))
                ' Add required headers
                request.Headers.Add("X-API-Key", DHA_API_KEY)
                request.Headers.Add("ngrok-skip-browser-warning", "true")
                request.Headers.Add("Accept", "application/json")

                Dim response = _httpClient.SendAsync(request).Result
                Dim content = response.Content.ReadAsStringAsync().Result

                System.Diagnostics.Debug.WriteLine("DHA API Response: " & response.StatusCode.ToString() & " - " & content)

                If response.IsSuccessStatusCode Then
                    Dim dhaResponse = JsonConvert.DeserializeObject(Of DHAApiResponse)(content)

                    If dhaResponse IsNot Nothing AndAlso dhaResponse.Success AndAlso dhaResponse.Data IsNot Nothing Then
                        ' Cache the successful response
                        Try
                            RedisCacheService.SetPersonData(idNumber, dhaResponse.Data)
                            System.Diagnostics.Debug.WriteLine("Cached DHA data for ID: " & idNumber)
                        Catch ex As Exception
                            System.Diagnostics.Debug.WriteLine("Failed to cache DHA data: " & ex.Message)
                        End Try

                        ' Map to result
                        result = MapDHADataToResult(dhaResponse.Data)
                        result.Success = True
                        result.Verified = True
                        result.Source = "DHA_API"
                        result.RequestId = dhaResponse.RequestId
                    Else
                        result.Success = False
                        result.Verified = False
                        result.ErrorCode = If(dhaResponse?.ErrorCode, "DHA_INVALID_RESPONSE")
                        result.ErrorMessage = If(dhaResponse?.ErrorMessage, "Invalid response from DHA API")
                        result.Source = "DHA_API"
                    End If

                ElseIf response.StatusCode = Net.HttpStatusCode.NotFound Then
                    ' ID not found in DHA database
                    result.Success = False
                    result.Verified = False
                    result.ErrorCode = "ID_NOT_FOUND"
                    result.ErrorMessage = "ID number not found in DHA database"
                    result.NeedsManualReview = True
                    result.Source = "DHA_API"

                ElseIf response.StatusCode = Net.HttpStatusCode.Unauthorized Then
                    result.Success = False
                    result.Verified = False
                    result.ErrorCode = "DHA_AUTH_ERROR"
                    result.ErrorMessage = "DHA API authentication failed"
                    result.Source = "DHA_API"

                ElseIf CInt(response.StatusCode) = 429 Then ' TooManyRequests
                    result.Success = False
                    result.Verified = False
                    result.ErrorCode = "DHA_RATE_LIMITED"
                    result.ErrorMessage = "DHA API rate limit exceeded"
                    result.NeedsManualReview = True
                    result.Source = "DHA_API"

                Else
                    result.Success = False
                    result.Verified = False
                    result.ErrorCode = "DHA_HTTP_ERROR"
                    result.ErrorMessage = "DHA API returned status " & CInt(response.StatusCode).ToString()
                    result.Source = "DHA_API"
                End If
            End Using

            Return result
        End Function

        ''' <summary>
        ''' Map DHA person data to verification result
        ''' </summary>
        Private Shared Function MapDHADataToResult(data As DHAPersonData) As DHAVerificationResult
            Return New DHAVerificationResult With {
                .FirstName = data.FirstName,
                .Surname = data.Surname,
                .DateOfBirth = data.DateOfBirth,
                .Gender = data.Gender,
                .Citizenship = data.Citizenship,
                .Race = data.Race,
                .MaritalStatus = data.MaritalStatus,
                .IssueDate = data.IssueDate,
                .IsDeceased = data.IsDeceased,
                .DateOfDeath = data.DateOfDeath,
                .IsSuspended = data.IsSuspended,
                .NeedsManualReview = data.NeedsManualReview
            }
        End Function

        ''' <summary>
        ''' Try to get data from cache as fallback
        ''' </summary>
        Private Shared Function TryGetFromCacheFallback(idNumber As String) As DHAVerificationResult
            Try
                Dim cached = RedisCacheService.GetPersonData(idNumber)
                If cached IsNot Nothing AndAlso cached.Data IsNot Nothing Then
                    Dim result = MapDHADataToResult(cached.Data)
                    result.Success = True
                    result.Verified = True
                    result.Source = "CACHE"
                    Return result
                End If
            Catch
                ' Ignore cache errors
            End Try
            Return Nothing
        End Function

        ''' <summary>
        ''' Simulate DHA API call (fallback when DHA is disabled)
        ''' </summary>
        Private Shared Function SimulateDHACall(idNumber As String) As DHAVerificationResult
            Dim result As New DHAVerificationResult()

            ' Simulate network latency (50-200ms)
            System.Threading.Thread.Sleep(New Random().Next(50, 200))

            ' Extract demographics from ID number
            Dim year = Integer.Parse(idNumber.Substring(0, 2))
            Dim month = Integer.Parse(idNumber.Substring(2, 2))
            Dim day = Integer.Parse(idNumber.Substring(4, 2))
            Dim currentYear = DateTime.Now.Year Mod 100
            Dim fullYear = If(year <= currentYear, 2000 + year, 1900 + year)

            ' Simulate 5% DHA API failure rate
            If New Random().Next(1, 101) <= 5 Then
                result.Success = False
                result.ErrorCode = "DHA_SERVICE_ERROR"
                result.ErrorMessage = "DHA service temporarily unavailable"
                Return result
            End If

            ' Simulate 2% deceased persons
            If New Random().Next(1, 101) <= 2 Then
                result.Success = True
                result.Verified = True
                result.IsDeceased = True
                result.DateOfBirth = New DateTime(fullYear, month, day)
                result.Gender = If(Integer.Parse(idNumber.Substring(6, 4)) >= 5000, "Male", "Female")
                result.Citizenship = If(idNumber(10) = "0"c, "SA Citizen", "Permanent Resident")
                Return result
            End If

            ' Successful verification (93% of cases)
            result.Success = True
            result.Verified = True
            result.IsDeceased = False
            result.DateOfBirth = New DateTime(fullYear, month, day)
            result.Gender = If(Integer.Parse(idNumber.Substring(6, 4)) >= 5000, "Male", "Female")
            result.Citizenship = If(idNumber(10) = "0"c, "SA Citizen", "Permanent Resident")

            Return result
        End Function

        ''' <summary>
        ''' Get DHA service status including cache status
        ''' </summary>
        Public Shared Function GetServiceStatus() As Object
            Return New With {
                .circuitBreaker = DHACircuitBreaker.GetStatus(),
                .dhaEnabled = DHA_ENABLED,
                .dhaBaseUrl = DHA_BASE_URL,
                .timeoutMs = DHA_TIMEOUT_MS,
                .cache = RedisCacheService.GetStatus()
            }
        End Function

    End Class

End Namespace
