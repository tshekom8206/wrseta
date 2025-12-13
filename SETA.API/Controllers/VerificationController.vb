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
            If Me.Request.Properties.ContainsKey("MS_HttpContext") Then
                Dim ctx = Me.Request.Properties("MS_HttpContext")
                If ctx IsNot Nothing Then
                    Return "127.0.0.1"
                End If
            End If
            Return "unknown"
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
            Dim idNumberMasked = MaskIdForResponse(idNumber)

            ' Step 1: Format validation
            Dim formatValid = idNumber.Length = 13 AndAlso IsAllDigits(idNumber)
            If Not formatValid Then
                LogVerification(setaId, idNumber, "RED", "Invalid ID format. Must be exactly 13 digits.",
                                formatValid:=False, luhnValid:=False, dhaVerified:=False, duplicateFound:=False)
                Return Ok(ApiResponse(Of VerificationResponse).SuccessResponse(New VerificationResponse With {
                    .IdNumberMasked = idNumberMasked,
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
                LogVerification(setaId, idNumber, "RED", "Invalid ID number. Checksum validation failed.",
                                formatValid:=True, luhnValid:=False, dhaVerified:=False, duplicateFound:=False)
                Return Ok(ApiResponse(Of VerificationResponse).SuccessResponse(New VerificationResponse With {
                    .IdNumberMasked = idNumberMasked,
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
                LogVerification(setaId, idNumber, "RED", "Learner already registered at another SETA",
                                formatValid:=True, luhnValid:=True, dhaVerified:=False, duplicateFound:=True,
                                conflictingSetaId:=duplicateInfo.SetaId)
                Return Ok(ApiResponse(Of VerificationResponse).SuccessResponse(New VerificationResponse With {
                    .IdNumberMasked = idNumberMasked,
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
                LogVerification(setaId, idNumber, "GREEN", "Identity verified successfully",
                                formatValid:=True, luhnValid:=True, dhaVerified:=True, duplicateFound:=False)
                Return Ok(ApiResponse(Of VerificationResponse).SuccessResponse(New VerificationResponse With {
                    .IdNumberMasked = idNumberMasked,
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
                LogVerification(setaId, idNumber, "YELLOW", "ID format valid but DHA verification pending",
                                formatValid:=True, luhnValid:=True, dhaVerified:=False, duplicateFound:=False)
                Return Ok(ApiResponse(Of VerificationResponse).SuccessResponse(New VerificationResponse With {
                    .IdNumberMasked = idNumberMasked,
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
            Dim idNumberMasked = MaskIdForResponse(idNumber)

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
                .IdNumberMasked = idNumberMasked,
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
                                .SetaCode = If(reader.IsDBNull(1), "", reader.GetString(1)),
                                .SetaName = If(reader.IsDBNull(2), "", reader.GetString(2)),
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
                    Dim formatValid = idNumber.Length = 13 AndAlso IsAllDigits(idNumber)
                    Dim luhnValid = False
                    Dim dhaVerified = False
                    Dim duplicateFound = False
                    Dim conflictingSetaId As Integer? = Nothing

                    If Not formatValid Then
                        result.Status = "RED"
                        result.Message = "Invalid ID format"
                        result.IsValid = False
                        failedCount += 1
                    Else
                        luhnValid = ValidateLuhn(idNumber)
                        If Not luhnValid Then
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
                                duplicateFound = True
                                conflictingSetaId = duplicateInfo.SetaId
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
                    End If

                    ' Log individual verification with detailed information
                    LogVerification(setaId, idNumber, result.Status, result.Message,
                                    formatValid:=formatValid, luhnValid:=luhnValid, dhaVerified:=dhaVerified,
                                    duplicateFound:=duplicateFound, conflictingSetaId:=conflictingSetaId,
                                    firstName:=item.FirstName, surname:=item.Surname)

                Catch ex As Exception
                    result.Status = "RED"
                    result.Message = "Verification error: " & ex.Message
                    result.IsValid = False
                    failedCount += 1
                    ' Log error case
                    Try
                        Dim idNumber = item.IdNumber.Replace(" ", "").Replace("-", "")
                        LogVerification(setaId, idNumber, "RED", "Verification error: " & ex.Message,
                                        formatValid:=False, luhnValid:=False, dhaVerified:=False, duplicateFound:=False,
                                        firstName:=item.FirstName, surname:=item.Surname)
                    Catch
                        ' Ignore logging errors
                    End Try
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
        ''' Verify if a learner exists by ID number
        ''' Checks LearnerRegistry for the learner
        ''' </summary>
        <Route("verify-learner")>
        <HttpPost>
        Public Function VerifyLearner(request As LearnerVerificationRequest) As IHttpActionResult
            ' Validate request
            If request Is Nothing OrElse String.IsNullOrWhiteSpace(request.IdNumber) Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of LearnerVerificationResponse).ErrorResponse("INVALID_REQUEST", "ID number is required"))
            End If

            ' Get SETA context from API Key
            Dim apiKeySetaId = CInt(Me.Request.Properties("SetaId"))
            Dim searchSetaId = If(request.SetaId > 0, request.SetaId, apiKeySetaId)

            ' Validate SETA access if specific SETA requested
            If request.SetaId > 0 AndAlso request.SetaId <> apiKeySetaId Then
                Return Content(HttpStatusCode.Forbidden,
                    ApiResponse(Of LearnerVerificationResponse).ErrorResponse("ACCESS_DENIED", "Cannot access other SETA's learners"))
            End If

            ' Clean ID number
            Dim idNumber = request.IdNumber.Replace(" ", "").Replace("-", "")

            ' Search for learner
            Dim learner = FindLearnerByIdNumber(idNumber, searchSetaId)

            If learner IsNot Nothing Then
                Return Ok(ApiResponse(Of LearnerVerificationResponse).SuccessResponse(New LearnerVerificationResponse With {
                    .Found = True,
                    .LearnerId = learner.LearnerId,
                    .IdNumberMasked = learner.IdNumberMasked,
                    .FirstName = learner.FirstName,
                    .Surname = learner.Surname,
                    .LearnershipCode = learner.LearnershipCode,
                    .ProgrammeName = learner.ProgrammeName,
                    .Province = learner.Province,
                    .Status = learner.Status,
                    .RegistrationDate = learner.RegistrationDate,
                    .RegisteredSetaId = learner.RegisteredSetaId,
                    .RegisteredSetaCode = learner.RegisteredSetaCode,
                    .RegisteredSetaName = learner.RegisteredSetaName,
                    .Message = "Learner found"
                }))
            Else
                Return Ok(ApiResponse(Of LearnerVerificationResponse).SuccessResponse(New LearnerVerificationResponse With {
                    .Found = False,
                    .Message = "Learner not found"
                }))
            End If
        End Function

        ''' <summary>
        ''' Bulk verify learners by ID numbers
        ''' Maximum 500 IDs per request
        ''' </summary>
        <Route("verify-learners-batch")>
        <HttpPost>
        Public Function VerifyLearnersBatch(request As BulkLearnerVerificationRequest) As IHttpActionResult
            ' Validate request
            If request Is Nothing OrElse request.IdNumbers Is Nothing OrElse request.IdNumbers.Count = 0 Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of BulkLearnerVerificationResponse).ErrorResponse("INVALID_REQUEST", "At least one ID number is required"))
            End If

            ' Enforce maximum batch size
            Const MAX_BATCH_SIZE As Integer = 500
            If request.IdNumbers.Count > MAX_BATCH_SIZE Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of BulkLearnerVerificationResponse).ErrorResponse("BATCH_TOO_LARGE",
                        $"Maximum {MAX_BATCH_SIZE} IDs per batch. You sent {request.IdNumbers.Count}."))
            End If

            ' Get SETA context
            Dim apiKeySetaId = CInt(Me.Request.Properties("SetaId"))
            Dim searchSetaId = If(request.SetaId > 0, request.SetaId, apiKeySetaId)

            ' Validate SETA access if specific SETA requested
            If request.SetaId > 0 AndAlso request.SetaId <> apiKeySetaId Then
                Return Content(HttpStatusCode.Forbidden,
                    ApiResponse(Of BulkLearnerVerificationResponse).ErrorResponse("ACCESS_DENIED", "Cannot access other SETA's learners"))
            End If

            ' Log audit entry
            Dim setaCode = Me.Request.Properties("SetaCode").ToString()
            AuditLogService.LogAsync(apiKeySetaId, AuditLogService.ACTION_VERIFY, "LearnerVerificationLog",
                                     details:=$"Bulk learner verification: {request.IdNumbers.Count} IDs",
                                     userId:=setaCode, ipAddress:=GetClientIp())

            Dim sw = System.Diagnostics.Stopwatch.StartNew()
            Dim results As New List(Of BulkLearnerVerificationResult)
            Dim foundCount As Integer = 0
            Dim notFoundCount As Integer = 0

            For Each idNumber As String In request.IdNumbers
                Dim result As New BulkLearnerVerificationResult With {
                    .IdNumber = MaskIdForResponse(idNumber)
                }

                Try
                    ' Clean ID number
                    Dim cleanId = idNumber.Replace(" ", "").Replace("-", "")

                    ' Search for learner
                    Dim learner = FindLearnerByIdNumber(cleanId, searchSetaId)

                    If learner IsNot Nothing Then
                        result.Found = True
                        result.LearnerId = learner.LearnerId
                        result.FirstName = learner.FirstName
                        result.Surname = learner.Surname
                        result.Status = learner.Status
                        result.RegisteredSetaCode = learner.RegisteredSetaCode
                        result.Message = "Learner found"
                        foundCount += 1
                    Else
                        result.Found = False
                        result.Message = "Learner not found"
                        notFoundCount += 1
                    End If

                Catch ex As Exception
                    result.Found = False
                    result.Message = "Verification error: " & ex.Message
                    notFoundCount += 1
                End Try

                results.Add(result)
            Next

            sw.Stop()

            Dim response As New BulkLearnerVerificationResponse With {
                .TotalProcessed = request.IdNumbers.Count,
                .FoundCount = foundCount,
                .NotFoundCount = notFoundCount,
                .Results = results,
                .ProcessingTimeMs = sw.ElapsedMilliseconds
            }

            Return Ok(ApiResponse(Of BulkLearnerVerificationResponse).SuccessResponse(response))
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
        ''' Log verification attempt with detailed information
        ''' </summary>
        Private Sub LogVerification(setaId As Integer, idNumber As String, status As String, message As String,
                                    Optional formatValid As Boolean = False,
                                    Optional luhnValid As Boolean = False,
                                    Optional dhaVerified As Boolean = False,
                                    Optional duplicateFound As Boolean = False,
                                    Optional conflictingSetaId As Integer? = Nothing,
                                    Optional firstName As String = Nothing,
                                    Optional surname As String = Nothing,
                                    Optional durationMs As Double = 0)
            ' Record telemetry metrics
            Dim setaCode = If(Me.Request.Properties.ContainsKey("SetaCode"), Me.Request.Properties("SetaCode").ToString(), "UNKNOWN")
            TelemetryService.Instance.RecordVerification(status, setaCode, durationMs)

            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString
            Dim idHash = ComputeSha256Hash(idNumber)

            Try
                Using conn As New SqlConnection(connectionString)
                    conn.Open()

                    Dim sql As String = "
                        INSERT INTO VerificationLog (
                            RequestingSETAID, IDNumber, FirstName, Surname, Status, StatusReason,
                            FormatValid, LuhnValid, DHAVerified, DuplicateFound, ConflictingSETAID,
                            VerifiedBy, Message, IDNumberHash, VerifiedAt
                        )
                        VALUES (
                            @SETAID, @IDNumber, @FirstName, @Surname, @Status, @StatusReason,
                            @FormatValid, @LuhnValid, @DHAVerified, @DuplicateFound, @ConflictingSETAID,
                            @VerifiedBy, @Message, @IDHash, GETDATE()
                        )"

                    Using cmd As New SqlCommand(sql, conn)
                        cmd.Parameters.AddWithValue("@SETAID", setaId)
                        cmd.Parameters.AddWithValue("@IDNumber", idNumber)
                        cmd.Parameters.AddWithValue("@FirstName", If(String.IsNullOrEmpty(firstName), DBNull.Value, firstName))
                        cmd.Parameters.AddWithValue("@Surname", If(String.IsNullOrEmpty(surname), DBNull.Value, surname))
                        cmd.Parameters.AddWithValue("@Status", status)
                        cmd.Parameters.AddWithValue("@StatusReason", If(String.IsNullOrEmpty(message), DBNull.Value, message))
                        cmd.Parameters.AddWithValue("@FormatValid", formatValid)
                        cmd.Parameters.AddWithValue("@LuhnValid", luhnValid)
                        cmd.Parameters.AddWithValue("@DHAVerified", dhaVerified)
                        cmd.Parameters.AddWithValue("@DuplicateFound", duplicateFound)
                        cmd.Parameters.AddWithValue("@ConflictingSETAID", If(conflictingSetaId.HasValue, conflictingSetaId.Value, DBNull.Value))
                        cmd.Parameters.AddWithValue("@VerifiedBy", setaCode)
                        cmd.Parameters.AddWithValue("@Message", If(String.IsNullOrEmpty(message), DBNull.Value, message))
                        cmd.Parameters.AddWithValue("@IDHash", idHash)
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
                    SELECT TOP (@Limit) VerificationID, Status, Message, VerifiedAt
                    FROM VerificationLog
                    WHERE RequestingSETAID = @SETAID
                    ORDER BY VerifiedAt DESC"

                Using cmd As New SqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@Limit", limit)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        While reader.Read()
                            results.Add(New With {
                                .LogId = reader.GetInt32(0),
                                .Status = If(reader.IsDBNull(1), "", reader.GetString(1)),
                                .Message = If(reader.IsDBNull(2), "", reader.GetString(2)),
                                .VerifiedAt = If(reader.IsDBNull(3), DateTime.MinValue, reader.GetDateTime(3))
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

        ''' <summary>
        ''' Find learner by ID number in LearnerRegistry
        ''' </summary>
        Private Function FindLearnerByIdNumber(idNumber As String, setaId As Integer) As LearnerVerificationInfo
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString
            Dim idHash = ComputeSha256Hash(idNumber)

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                Dim sql As String = "
                    SELECT l.LearnerID, l.IDNumber, l.FirstName, l.Surname, l.LearnershipCode,
                           l.LearnershipName, l.ProvinceCode, l.RegistrationDate, l.Status,
                           l.RegisteredSETAID, s.SETACode, s.SETAName
                    FROM LearnerRegistry l
                    INNER JOIN SETAs s ON l.RegisteredSETAID = s.SETAID
                    WHERE l.IDNumberHash = @IDHash
                      AND l.RegisteredSETAID = @SETAID"

                Using cmd As New SqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@IDHash", idHash)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        If reader.Read() Then
                            Return New LearnerVerificationInfo With {
                                .LearnerId = reader.GetInt32(0),
                                .IdNumberMasked = MaskIdForResponse(If(reader.IsDBNull(1), "", reader.GetString(1))),
                                .FirstName = If(reader.IsDBNull(2), "", reader.GetString(2)),
                                .Surname = If(reader.IsDBNull(3), "", reader.GetString(3)),
                                .LearnershipCode = If(reader.IsDBNull(4), "", reader.GetString(4)),
                                .ProgrammeName = If(reader.IsDBNull(5), "", reader.GetString(5)),
                                .Province = If(reader.IsDBNull(6), "", reader.GetString(6)),
                                .RegistrationDate = If(reader.IsDBNull(7), Nothing, reader.GetDateTime(7)),
                                .Status = If(reader.IsDBNull(8), "", reader.GetString(8)),
                                .RegisteredSetaId = reader.GetInt32(9),
                                .RegisteredSetaCode = If(reader.IsDBNull(10), "", reader.GetString(10)),
                                .RegisteredSetaName = If(reader.IsDBNull(11), "", reader.GetString(11))
                            }
                        End If
                    End Using
                End Using
            End Using

            Return Nothing
        End Function

        ''' <summary>
        ''' Internal class for learner verification info
        ''' </summary>
        Private Class LearnerVerificationInfo
            Public Property LearnerId As Integer
            Public Property IdNumberMasked As String
            Public Property FirstName As String
            Public Property Surname As String
            Public Property LearnershipCode As String
            Public Property ProgrammeName As String
            Public Property Province As String
            Public Property Status As String
            Public Property RegistrationDate As DateTime?
            Public Property RegisteredSetaId As Integer
            Public Property RegisteredSetaCode As String
            Public Property RegisteredSetaName As String
        End Class

    End Class

End Namespace
