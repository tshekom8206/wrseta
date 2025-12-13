Imports System.Net
Imports System.Net.Http
Imports System.Web.Http
Imports System.Data.SqlClient
Imports System.Configuration
Imports System.Security.Cryptography
Imports System.Text
Imports SETA.API.Models
Imports SETA.API.Security
Imports SETA.API.Services

Namespace SETA.API.Controllers

    ''' <summary>
    ''' ID Verification controller
    ''' Provides endpoints for SA ID number verification
    ''' </summary>
    <RoutePrefix("api/verification")>
    <ApiKeyAuth>
    Public Class VerificationController
        Inherits ApiController

        ''' <summary>
        ''' Get the client IP address from the request
        ''' </summary>
        Private Function GetClientIp() As String
            ' Check for forwarded headers first (behind proxy/load balancer)
            If Me.Request.Headers.Contains("X-Forwarded-For") Then
                Return Me.Request.Headers.GetValues("X-Forwarded-For").FirstOrDefault()?.Split(","c).FirstOrDefault()?.Trim()
            End If

            If Me.Request.Headers.Contains("X-Real-IP") Then
                Return Me.Request.Headers.GetValues("X-Real-IP").FirstOrDefault()
            End If

            ' Try OWIN context (for self-hosted apps)
            If Me.Request.Properties.ContainsKey("MS_OwinContext") Then
                Try
                    Dim owinContext = Me.Request.Properties("MS_OwinContext")
                    If owinContext IsNot Nothing Then
                        Dim requestProp = owinContext.GetType().GetProperty("Request")
                        If requestProp IsNot Nothing Then
                            Dim owinRequest = requestProp.GetValue(owinContext)
                            If owinRequest IsNot Nothing Then
                                Dim remoteIpProp = owinRequest.GetType().GetProperty("RemoteIpAddress")
                                If remoteIpProp IsNot Nothing Then
                                    Dim ip = TryCast(remoteIpProp.GetValue(owinRequest), String)
                                    If Not String.IsNullOrEmpty(ip) Then
                                        If ip = "::1" OrElse ip = "127.0.0.1" Then Return "localhost"
                                        Return ip
                                    End If
                                End If
                            End If
                        End If
                    End If
                Catch
                End Try
            End If

            ' Fallback for IIS hosting
            If Me.Request.Properties.ContainsKey("MS_HttpContext") Then
                Dim ctx = Me.Request.Properties("MS_HttpContext")
                If ctx IsNot Nothing Then
                    Dim httpContext = TryCast(ctx, System.Web.HttpContextWrapper)
                    If httpContext IsNot Nothing Then
                        Return httpContext.Request.UserHostAddress
                    End If
                End If
            End If

            Return "localhost"
        End Function

        ''' <summary>
        ''' Get the request correlation ID
        ''' </summary>
        Private Function GetRequestId() As String
            If Me.Request.Properties.ContainsKey("RequestId") Then
                Return Me.Request.Properties("RequestId").ToString()
            End If
            Return Guid.NewGuid().ToString("N").Substring(0, 8)
        End Function

        ''' <summary>
        ''' Verify a South African ID number
        ''' Returns traffic light status: GREEN, YELLOW, or RED
        ''' </summary>
        <Route("verify")>
        <HttpPost>
        Public Function Verify(request As VerificationRequest) As IHttpActionResult
            ' Validate request
            If request Is Nothing OrElse String.IsNullOrWhiteSpace(request.IdNumber) Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of VerificationResponse).ErrorResponse("INVALID_REQUEST", "ID number is required"))
            End If

            ' Get SETA context from API Key
            Dim setaId = CInt(Me.Request.Properties("SetaId"))
            Dim setaCode = Me.Request.Properties("SetaCode").ToString()

            ' Log audit entry
            AuditLogService.LogAsync(setaId, AuditLogService.ACTION_VERIFY, "VerificationLog",
                                     idNumber:=request.IdNumber, userId:=setaCode, ipAddress:=GetClientIp())

            ' Clean ID number
            Dim idNumber = request.IdNumber.Replace(" ", "").Replace("-", "")

            ' Step 1: Format validation
            If idNumber.Length <> 13 OrElse Not IsAllDigits(idNumber) Then
                LogVerification(setaId, idNumber, "RED", "Invalid format")
                Return Ok(ApiResponse(Of VerificationResponse).SuccessResponse(New VerificationResponse With {
                    .Status = "RED",
                    .Message = "Invalid ID format. Must be exactly 13 digits.",
                    .IsValid = False,
                    .FormatValid = False,
                    .LuhnValid = False,
                    .DhaVerified = False,
                    .DuplicateFound = False
                }))
            End If

            ' Step 2: Luhn algorithm validation
            Dim luhnValid = ValidateLuhn(idNumber)
            If Not luhnValid Then
                LogVerification(setaId, idNumber, "RED", "Luhn check failed")
                Return Ok(ApiResponse(Of VerificationResponse).SuccessResponse(New VerificationResponse With {
                    .Status = "RED",
                    .Message = "Invalid ID number. Checksum validation failed.",
                    .IsValid = False,
                    .FormatValid = True,
                    .LuhnValid = False,
                    .DhaVerified = False,
                    .DuplicateFound = False
                }))
            End If

            ' Step 3: Extract demographics
            Dim demographics = ExtractDemographics(idNumber)

            ' Step 4: Check for cross-SETA duplicates
            Dim duplicateInfo = CheckCrossSETADuplicate(idNumber, setaId)

            If duplicateInfo IsNot Nothing Then
                LogVerification(setaId, idNumber, "RED", "Duplicate found at " & duplicateInfo.SetaCode, isDuplicate:=True)
                Return Ok(ApiResponse(Of VerificationResponse).SuccessResponse(New VerificationResponse With {
                    .Status = "RED",
                    .Message = "Learner already registered at another SETA",
                    .IsValid = True,
                    .FormatValid = True,
                    .LuhnValid = True,
                    .DhaVerified = False,
                    .DuplicateFound = True,
                    .Demographics = demographics,
                    .ConflictingSeta = duplicateInfo
                }))
            End If

            ' Step 5: DHA verification (simulated - would call real DHA API)
            Dim dhaVerified = SimulateDHAVerification(idNumber)

            If dhaVerified Then
                LogVerification(setaId, idNumber, "GREEN", "Verified successfully")
                Return Ok(ApiResponse(Of VerificationResponse).SuccessResponse(New VerificationResponse With {
                    .Status = "GREEN",
                    .Message = "Identity verified successfully",
                    .IsValid = True,
                    .FormatValid = True,
                    .LuhnValid = True,
                    .DhaVerified = True,
                    .DuplicateFound = False,
                    .Demographics = demographics
                }))
            Else
                LogVerification(setaId, idNumber, "YELLOW", "DHA verification pending")
                Return Ok(ApiResponse(Of VerificationResponse).SuccessResponse(New VerificationResponse With {
                    .Status = "YELLOW",
                    .Message = "ID format valid but DHA verification pending",
                    .IsValid = True,
                    .FormatValid = True,
                    .LuhnValid = True,
                    .DhaVerified = False,
                    .DuplicateFound = False,
                    .Demographics = demographics
                }))
            End If
        End Function

        ''' <summary>
        ''' Quick format validation only (no DHA check)
        ''' </summary>
        <Route("validate-format")>
        <HttpPost>
        Public Function ValidateFormat(request As VerificationRequest) As IHttpActionResult
            If request Is Nothing OrElse String.IsNullOrWhiteSpace(request.IdNumber) Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of VerificationResponse).ErrorResponse("INVALID_REQUEST", "ID number is required"))
            End If

            Dim idNumber = request.IdNumber.Replace(" ", "").Replace("-", "")

            ' Format check
            Dim formatValid = idNumber.Length = 13 AndAlso IsAllDigits(idNumber)

            ' Luhn check
            Dim luhnValid = If(formatValid, ValidateLuhn(idNumber), False)

            ' Extract demographics if valid
            Dim demographics As DemographicsInfo = Nothing
            If formatValid AndAlso luhnValid Then
                demographics = ExtractDemographics(idNumber)
            End If

            Return Ok(ApiResponse(Of VerificationResponse).SuccessResponse(New VerificationResponse With {
                .Status = If(formatValid AndAlso luhnValid, "GREEN", "RED"),
                .Message = If(formatValid AndAlso luhnValid, "ID format is valid", "Invalid ID format or checksum"),
                .IsValid = formatValid AndAlso luhnValid,
                .FormatValid = formatValid,
                .LuhnValid = luhnValid,
                .DhaVerified = False,
                .DuplicateFound = False,
                .Demographics = demographics
            }))
        End Function

        ''' <summary>
        ''' Get recent verification attempts for a SETA
        ''' </summary>
        <Route("recent/{setaId:int}")>
        <HttpGet>
        Public Function GetRecentVerifications(setaId As Integer) As IHttpActionResult
            ' Validate SETA access
            Dim apiKeySetaId = CInt(Me.Request.Properties("SetaId"))
            If apiKeySetaId <> setaId Then
                Return Content(HttpStatusCode.Forbidden,
                    ApiResponse(Of Object).ErrorResponse("ACCESS_DENIED", "Cannot access other SETA's data"))
            End If

            Dim verifications = GetRecentVerificationsFromDB(setaId, 50)
            Return Ok(ApiResponse(Of Object).SuccessResponse(verifications))
        End Function

        ''' <summary>
        ''' Validate using Luhn algorithm
        ''' </summary>
        Private Function ValidateLuhn(idNumber As String) As Boolean
            Dim sum As Integer = 0
            Dim alternate As Boolean = False

            For i As Integer = idNumber.Length - 1 To 0 Step -1
                Dim digit As Integer = Integer.Parse(idNumber(i).ToString())

                If alternate Then
                    digit *= 2
                    If digit > 9 Then
                        digit -= 9
                    End If
                End If

                sum += digit
                alternate = Not alternate
            Next

            Return (sum Mod 10 = 0)
        End Function

        ''' <summary>
        ''' Extract demographic information from ID number
        ''' </summary>
        Private Function ExtractDemographics(idNumber As String) As DemographicsInfo
            ' Extract date of birth (YYMMDD)
            Dim year = Integer.Parse(idNumber.Substring(0, 2))
            Dim month = Integer.Parse(idNumber.Substring(2, 2))
            Dim day = Integer.Parse(idNumber.Substring(4, 2))

            ' Determine century
            Dim currentYear = DateTime.Now.Year Mod 100
            Dim fullYear = If(year <= currentYear, 2000 + year, 1900 + year)

            Dim dateOfBirth As New DateTime(fullYear, month, day)

            ' Gender (digits 7-10: 0000-4999 = Female, 5000-9999 = Male)
            Dim genderCode = Integer.Parse(idNumber.Substring(6, 4))
            Dim gender = If(genderCode >= 5000, "Male", "Female")

            ' Citizenship (digit 11: 0 = SA Citizen, 1 = Permanent Resident)
            Dim citizenship = If(idNumber(10) = "0"c, "SA Citizen", "Permanent Resident")

            ' Calculate age
            Dim age = DateTime.Now.Year - dateOfBirth.Year
            If DateTime.Now.DayOfYear < dateOfBirth.DayOfYear Then
                age -= 1
            End If

            Return New DemographicsInfo With {
                .DateOfBirth = dateOfBirth.ToString("yyyy-MM-dd"),
                .Gender = gender,
                .Citizenship = citizenship,
                .Age = age
            }
        End Function

        ''' <summary>
        ''' Check for duplicate registration across all SETAs
        ''' </summary>
        Private Function CheckCrossSETADuplicate(idNumber As String, requestingSetaId As Integer) As ConflictInfo
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString
            Dim idHash = ComputeSha256Hash(idNumber)

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                Dim sql As String = "
                    SELECT idx.RegisteredSETAID, s.SETACode, s.SETAName, idx.RegistrationDate
                    FROM LearnerIDIndex idx
                    INNER JOIN SETAs s ON idx.RegisteredSETAID = s.SETAID
                    WHERE idx.IDNumberHash = @IDHash
                      AND idx.RegisteredSETAID <> @RequestingSETA
                      AND idx.IsActive = 1"

                Using cmd As New SqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@IDHash", idHash)
                    cmd.Parameters.AddWithValue("@RequestingSETA", requestingSetaId)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        If reader.Read() Then
                            Return New ConflictInfo With {
                                .SetaId = reader.GetInt32(0),
                                .SetaCode = reader.GetString(1),
                                .SetaName = reader.GetString(2),
                                .RegistrationDate = If(reader.IsDBNull(3), Nothing, reader.GetDateTime(3))
                            }
                        End If
                    End Using
                End Using
            End Using

            Return Nothing
        End Function

        ''' <summary>
        ''' DHA verification using circuit breaker
        ''' </summary>
        Private Function VerifyWithDHA(idNumber As String) As DHAVerificationService.DHAVerificationResult
            Return DHAVerificationService.VerifyIdNumber(idNumber)
        End Function

        ''' <summary>
        ''' Simulate DHA verification (would call real API in production)
        ''' Uses circuit breaker for resilience
        ''' </summary>
        Private Function SimulateDHAVerification(idNumber As String) As Boolean
            Dim dhaResult = VerifyWithDHA(idNumber)

            ' If circuit breaker is open, return false but allow YELLOW status
            If dhaResult.CircuitBreakerOpen Then
                Return False
            End If

            Return dhaResult.Success AndAlso dhaResult.Verified AndAlso Not dhaResult.IsDeceased
        End Function

        ''' <summary>
        ''' Bulk verify multiple ID numbers
        ''' Maximum 500 IDs per request
        ''' </summary>
        <Route("verify-batch")>
        <HttpPost>
        Public Function VerifyBatch(request As BulkVerificationRequest) As IHttpActionResult
            ' Validate request
            If request Is Nothing OrElse request.IdNumbers Is Nothing OrElse request.IdNumbers.Count = 0 Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of BulkVerificationResponse).ErrorResponse("INVALID_REQUEST", "At least one ID number is required"))
            End If

            ' Enforce maximum batch size
            Const MAX_BATCH_SIZE As Integer = 500
            If request.IdNumbers.Count > MAX_BATCH_SIZE Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of BulkVerificationResponse).ErrorResponse("BATCH_TOO_LARGE",
                        $"Maximum {MAX_BATCH_SIZE} IDs per batch. You sent {request.IdNumbers.Count}."))
            End If

            ' Get SETA context
            Dim setaId = CInt(Me.Request.Properties("SetaId"))
            Dim setaCode = Me.Request.Properties("SetaCode").ToString()

            ' Log audit entry
            AuditLogService.LogAsync(setaId, AuditLogService.ACTION_VERIFY, "VerificationLog",
                                     details:=$"Bulk verification: {request.IdNumbers.Count} IDs",
                                     userId:=setaCode, ipAddress:=GetClientIp())

            Dim sw = System.Diagnostics.Stopwatch.StartNew()
            Dim results As New List(Of BulkVerificationResult)
            Dim successCount As Integer = 0
            Dim failedCount As Integer = 0

            For Each item As BulkVerificationItem In request.IdNumbers
                Dim result As New BulkVerificationResult With {
                    .IdNumber = MaskIdForResponse(item.IdNumber),
                    .Reference = item.Reference
                }

                Try
                    ' Clean ID number
                    Dim idNumber = item.IdNumber.Replace(" ", "").Replace("-", "")

                    ' Format validation
                    If idNumber.Length <> 13 OrElse Not IsAllDigits(idNumber) Then
                        result.Status = "RED"
                        result.Message = "Invalid ID format"
                        result.IsValid = False
                        failedCount += 1
                    ElseIf Not ValidateLuhn(idNumber) Then
                        result.Status = "RED"
                        result.Message = "Luhn check failed"
                        result.IsValid = False
                        failedCount += 1
                    Else
                        ' Check for duplicates
                        Dim duplicateInfo = CheckCrossSETADuplicate(idNumber, setaId)

                        If duplicateInfo IsNot Nothing Then
                            result.Status = "RED"
                            result.Message = "Duplicate found"
                            result.IsValid = True
                            result.DuplicateFound = True
                            result.ConflictingSeta = duplicateInfo.SetaCode
                            failedCount += 1
                        Else
                            ' DHA verification (skip for bulk to improve performance)
                            result.Status = "YELLOW"
                            result.Message = "Format valid, DHA verification pending"
                            result.IsValid = True
                            result.DuplicateFound = False
                            successCount += 1
                        End If
                    End If

                    ' Log individual verification
                    LogVerification(setaId, item.IdNumber, result.Status, result.Message)

                Catch ex As Exception
                    result.Status = "RED"
                    result.Message = "Verification error"
                    result.IsValid = False
                    failedCount += 1
                End Try

                results.Add(result)
            Next

            sw.Stop()

            Dim response As New BulkVerificationResponse With {
                .TotalProcessed = request.IdNumbers.Count,
                .SuccessCount = successCount,
                .FailedCount = failedCount,
                .Results = results,
                .ProcessingTimeMs = sw.ElapsedMilliseconds
            }

            Return Ok(ApiResponse(Of BulkVerificationResponse).SuccessResponse(response))
        End Function

        ''' <summary>
        ''' Get DHA service status including circuit breaker state
        ''' </summary>
        <Route("dha-status")>
        <HttpGet>
        Public Function GetDHAStatus() As IHttpActionResult
            Return Ok(ApiResponse(Of Object).SuccessResponse(DHAVerificationService.GetServiceStatus()))
        End Function

        ''' <summary>
        ''' Mask ID number for response (privacy)
        ''' </summary>
        Private Function MaskIdForResponse(idNumber As String) As String
            If String.IsNullOrEmpty(idNumber) OrElse idNumber.Length < 6 Then
                Return "******"
            End If
            Return idNumber.Substring(0, 4) & "****" & idNumber.Substring(idNumber.Length - 3)
        End Function

        ''' <summary>
        ''' Log verification attempt
        ''' </summary>
        Private Sub LogVerification(setaId As Integer, idNumber As String, status As String, message As String, Optional durationMs As Double = 0, Optional isDuplicate As Boolean = False)
            ' Record telemetry metrics
            Dim setaCode = If(Me.Request.Properties.ContainsKey("SetaCode"), Me.Request.Properties("SetaCode").ToString(), "UNKNOWN")
            TelemetryService.Instance.RecordVerification(status, setaCode, durationMs, isDuplicate)

            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString
            Dim idHash = ComputeSha256Hash(idNumber)

            Try
                Using conn As New SqlConnection(connectionString)
                    conn.Open()

                    Dim sql As String = "
                        INSERT INTO VerificationLog (RequestingSETAID, IDNumber, IDNumberHash, Status, Message, VerifiedAt)
                        VALUES (@SETAID, @IDNumber, @IDHash, @Status, @Message, GETDATE())"

                    Using cmd As New SqlCommand(sql, conn)
                        cmd.Parameters.AddWithValue("@SETAID", setaId)
                        cmd.Parameters.AddWithValue("@IDNumber", idNumber)
                        cmd.Parameters.AddWithValue("@IDHash", idHash)
                        cmd.Parameters.AddWithValue("@Status", status)
                        cmd.Parameters.AddWithValue("@Message", message)
                        cmd.ExecuteNonQuery()
                    End Using
                End Using
            Catch ex As Exception
                System.Diagnostics.Debug.WriteLine("Failed to log verification: " & ex.Message)
            End Try
        End Sub

        ''' <summary>
        ''' Get recent verifications from database
        ''' </summary>
        Private Function GetRecentVerificationsFromDB(setaId As Integer, limit As Integer) As List(Of Object)
            Dim results As New List(Of Object)
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                Dim sql As String = "
                    SELECT TOP (@Limit)
                        vl.VerificationID,
                        vl.Status,
                        ISNULL(vl.Message, vl.StatusReason) AS Message,
                        vl.VerifiedAt,
                        vl.IDNumber,
                        ISNULL(vl.FirstName, lr.FirstName) AS FirstName,
                        ISNULL(vl.Surname, lr.Surname) AS Surname,
                        cs.SETACode AS ConflictingSeta
                    FROM VerificationLog vl
                    LEFT JOIN LearnerRegistry lr ON vl.IDNumberHash = lr.IDNumberHash
                    LEFT JOIN SETAs cs ON lr.RegisteredSETAID = cs.SETAID AND cs.SETAID <> @SETAID
                    WHERE vl.RequestingSETAID = @SETAID
                    ORDER BY vl.VerifiedAt DESC"

                Using cmd As New SqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@Limit", limit)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        While reader.Read()
                            Dim idNumber As String = If(reader.IsDBNull(4), "", reader.GetString(4))
                            Dim firstName As String = If(reader.IsDBNull(5), "", reader.GetString(5))
                            Dim surname As String = If(reader.IsDBNull(6), "", reader.GetString(6))
                            Dim conflictingSeta As String = If(reader.IsDBNull(7), "", reader.GetString(7))

                            Dim learnerName As String = ""
                            If Not String.IsNullOrEmpty(firstName) OrElse Not String.IsNullOrEmpty(surname) Then
                                learnerName = (firstName & " " & surname).Trim()
                            End If

                            results.Add(New With {
                                .LogId = reader.GetInt32(0),
                                .Status = reader.GetString(1),
                                .Message = If(reader.IsDBNull(2), "", reader.GetString(2)),
                                .VerifiedAt = reader.GetDateTime(3),
                                .IdNumber = idNumber,
                                .LearnerName = learnerName,
                                .ConflictingSeta = conflictingSeta
                            })
                        End While
                    End Using
                End Using
            End Using

            Return results
        End Function

        ''' <summary>
        ''' Compute SHA256 hash (VARBINARY)
        ''' </summary>
        Private Function ComputeSha256Hash(input As String) As Byte()
            Using sha256 As SHA256 = SHA256.Create()
                Return sha256.ComputeHash(Encoding.UTF8.GetBytes(input))
            End Using
        End Function

        ''' <summary>
        ''' Check if all characters in a string are digits
        ''' </summary>
        Private Function IsAllDigits(input As String) As Boolean
            For Each c As Char In input
                If Not Char.IsDigit(c) Then
                    Return False
                End If
            Next
            Return True
        End Function

    End Class

End Namespace
