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
    ''' Learner enrollment and management controller
    ''' Handles registration and enrollment duplicate detection
    ''' </summary>
    <RoutePrefix("api/learners")>
    <ApiKeyAuth>
    Public Class LearnersController
        Inherits ApiController

        ''' <summary>
        ''' Register a learner in a learnership
        ''' Checks for duplicate enrollments across all SETAs
        ''' </summary>
        <Route("register")>
        <HttpPost>
        Public Function Register(request As EnrollmentRequest) As IHttpActionResult
            ' Validate request
            If request Is Nothing Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of EnrollmentResponse).ErrorResponse("INVALID_REQUEST", "Request body is required"))
            End If

            ' Validate required fields
            If String.IsNullOrWhiteSpace(request.IdNumber) OrElse
               String.IsNullOrWhiteSpace(request.FirstName) OrElse
               String.IsNullOrWhiteSpace(request.Surname) OrElse
               String.IsNullOrWhiteSpace(request.LearnershipCode) OrElse
               String.IsNullOrWhiteSpace(request.Province) Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of EnrollmentResponse).ErrorResponse("INVALID_REQUEST", "All required fields must be provided"))
            End If

            ' Get SETA context from API Key
            Dim apiKeySetaId = CInt(Me.Request.Properties("SetaId"))
            Dim apiKeySetaCode = Me.Request.Properties("SetaCode").ToString()

            ' Validate that requested SETA matches API Key SETA
            If request.SetaId <> apiKeySetaId Then
                Return Content(HttpStatusCode.Forbidden,
                    ApiResponse(Of EnrollmentResponse).ErrorResponse("SETA_MISMATCH", "Cannot register learners for other SETAs"))
            End If

            ' Clean ID number
            Dim idNumber = request.IdNumber.Replace(" ", "").Replace("-", "")

            ' Validate ID format
            If idNumber.Length <> 13 OrElse Not IsAllDigits(idNumber) Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of EnrollmentResponse).ErrorResponse("INVALID_ID", "ID number must be exactly 13 digits"))
            End If

            ' Check for enrollment duplicates using stored procedure
            Dim duplicateResult = CheckEnrollmentDuplicate(
                idNumber,
                request.LearnershipCode,
                request.SetaId,
                request.EnrollmentYear,
                request.Province)

            If duplicateResult.Decision = "BLOCKED" Then
                Return Ok(ApiResponse(Of EnrollmentResponse).SuccessResponse(New EnrollmentResponse With {
                    .Decision = "BLOCKED",
                    .DuplicateType = duplicateResult.DuplicateType,
                    .Message = duplicateResult.Message,
                    .ExistingEnrollment = duplicateResult.ExistingEnrollment
                }))
            End If

            ' No blocking duplicate found - proceed with registration
            Dim enrollmentResult = CreateEnrollment(request, idNumber)

            If enrollmentResult Is Nothing OrElse enrollmentResult.LearnerId = 0 Then
                Return Content(HttpStatusCode.InternalServerError,
                    ApiResponse(Of EnrollmentResponse).ErrorResponse("REGISTRATION_FAILED", "Failed to create registration"))
            End If

            ' Log to LearnerVerificationHistory
            LogLearnerVerification(
                learnerId:=enrollmentResult.LearnerId,
                verificationType:="REGISTRATION",
                status:="SUCCESS",
                dhaStatus:="PENDING",
                verifiedBy:=apiKeySetaCode,
                notes:=$"Registration successful. EnrollmentID: {enrollmentResult.EnrollmentId}")

            Dim responseMessage = "Registration successful"
            If duplicateResult.DuplicateType = "DIFFERENT_PROVINCE" Then
                responseMessage = "Registration approved - learner has existing enrollment in different province"
            End If

            Return Ok(ApiResponse(Of EnrollmentResponse).SuccessResponse(New EnrollmentResponse With {
                .Decision = "ALLOWED",
                .DuplicateType = If(String.IsNullOrEmpty(duplicateResult.DuplicateType), "NEW_ENROLLMENT", duplicateResult.DuplicateType),
                .Message = responseMessage,
                .EnrollmentId = enrollmentResult.EnrollmentId,
                .ExistingEnrollment = duplicateResult.ExistingEnrollment
            }))
        End Function

        ''' <summary>
        ''' Enroll a learner in a learnership
        ''' Checks for duplicate enrollments across all SETAs
        ''' </summary>
        <Route("enroll")>
        <HttpPost>
        Public Function Enroll(request As EnrollmentRequest) As IHttpActionResult
            ' Validate request
            If request Is Nothing Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of EnrollmentResponse).ErrorResponse("INVALID_REQUEST", "Request body is required"))
            End If

            ' Validate required fields
            If String.IsNullOrWhiteSpace(request.IdNumber) OrElse
               String.IsNullOrWhiteSpace(request.FirstName) OrElse
               String.IsNullOrWhiteSpace(request.Surname) OrElse
               String.IsNullOrWhiteSpace(request.LearnershipCode) OrElse
               String.IsNullOrWhiteSpace(request.Province) Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of EnrollmentResponse).ErrorResponse("INVALID_REQUEST", "All required fields must be provided"))
            End If

            ' Get SETA context from API Key
            Dim apiKeySetaId = CInt(Me.Request.Properties("SetaId"))
            Dim apiKeySetaCode = Me.Request.Properties("SetaCode").ToString()

            ' Validate that requested SETA matches API Key SETA
            If request.SetaId <> apiKeySetaId Then
                Return Content(HttpStatusCode.Forbidden,
                    ApiResponse(Of EnrollmentResponse).ErrorResponse("SETA_MISMATCH", "Cannot enroll learners for other SETAs"))
            End If

            ' Clean ID number
            Dim idNumber = request.IdNumber.Replace(" ", "").Replace("-", "")

            ' Validate ID format
            If idNumber.Length <> 13 OrElse Not IsAllDigits(idNumber) Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of EnrollmentResponse).ErrorResponse("INVALID_ID", "ID number must be exactly 13 digits"))
            End If

            ' Check for enrollment duplicates using stored procedure
            Dim duplicateResult = CheckEnrollmentDuplicate(
                idNumber,
                request.LearnershipCode,
                request.SetaId,
                request.EnrollmentYear,
                request.Province)

            If duplicateResult.Decision = "BLOCKED" Then
                Return Ok(ApiResponse(Of EnrollmentResponse).SuccessResponse(New EnrollmentResponse With {
                    .Decision = "BLOCKED",
                    .DuplicateType = duplicateResult.DuplicateType,
                    .Message = duplicateResult.Message,
                    .ExistingEnrollment = duplicateResult.ExistingEnrollment
                }))
            End If

            ' No blocking duplicate found - proceed with enrollment
            Dim enrollmentResult = CreateEnrollment(request, idNumber)

            If enrollmentResult Is Nothing OrElse enrollmentResult.LearnerId = 0 Then
                Return Content(HttpStatusCode.InternalServerError,
                    ApiResponse(Of EnrollmentResponse).ErrorResponse("ENROLLMENT_FAILED", "Failed to create enrollment"))
            End If

            ' Log to LearnerVerificationHistory
            LogLearnerVerification(
                learnerId:=enrollmentResult.LearnerId,
                verificationType:="ENROLLMENT",
                status:="SUCCESS",
                dhaStatus:="PENDING",
                verifiedBy:=apiKeySetaCode,
                notes:=$"Enrollment successful. EnrollmentID: {enrollmentResult.EnrollmentId}")

            Dim responseMessage = "Enrollment successful"
            If duplicateResult.DuplicateType = "DIFFERENT_PROVINCE" Then
                responseMessage = "Enrollment approved - learner has existing enrollment in different province"
            End If

            Return Ok(ApiResponse(Of EnrollmentResponse).SuccessResponse(New EnrollmentResponse With {
                .Decision = "ALLOWED",
                .DuplicateType = If(String.IsNullOrEmpty(duplicateResult.DuplicateType), "NEW_ENROLLMENT", duplicateResult.DuplicateType),
                .Message = responseMessage,
                .EnrollmentId = enrollmentResult.EnrollmentId,
                .ExistingEnrollment = duplicateResult.ExistingEnrollment
            }))
        End Function

        ''' <summary>
        ''' Get learners for a SETA (paginated)
        ''' </summary>
        <Route("{setaId:int}")>
        <HttpGet>
        Public Function GetLearners(setaId As Integer, Optional page As Integer = 1, Optional pageSize As Integer = 50) As IHttpActionResult
            ' Validate SETA access
            Dim apiKeySetaId = CInt(Me.Request.Properties("SetaId"))
            If apiKeySetaId <> setaId Then
                Return Content(HttpStatusCode.Forbidden,
                    ApiResponse(Of Object).ErrorResponse("ACCESS_DENIED", "Cannot access other SETA's learners"))
            End If

            Dim learners = GetLearnersFromDB(setaId, page, pageSize)
            Return Ok(ApiResponse(Of Object).SuccessResponse(New With {
                .learners = learners,
                .page = page,
                .pageSize = pageSize
            }))
        End Function

        ''' <summary>
        ''' Search for a learner by ID number
        ''' </summary>
        <Route("search")>
        <HttpPost>
        Public Function SearchLearner(request As LearnerSearchRequest) As IHttpActionResult
            If request Is Nothing Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of Object).ErrorResponse("INVALID_REQUEST", "Request body is required"))
            End If

            Dim apiKeySetaId = CInt(Me.Request.Properties("SetaId"))

            ' If SetaId specified, validate access
            If request.SetaId > 0 AndAlso request.SetaId <> apiKeySetaId Then
                Return Content(HttpStatusCode.Forbidden,
                    ApiResponse(Of Object).ErrorResponse("ACCESS_DENIED", "Cannot search other SETA's learners"))
            End If

            Dim searchSetaId = If(request.SetaId > 0, request.SetaId, apiKeySetaId)

            Dim learners As List(Of LearnerInfo)

            If Not String.IsNullOrWhiteSpace(request.IdNumber) Then
                learners = SearchByIdNumber(request.IdNumber, searchSetaId)
            ElseIf Not String.IsNullOrWhiteSpace(request.FirstName) OrElse Not String.IsNullOrWhiteSpace(request.Surname) Then
                learners = SearchByName(request.FirstName, request.Surname, searchSetaId)
            Else
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of Object).ErrorResponse("INVALID_SEARCH", "Provide ID number or name to search"))
            End If

            Return Ok(ApiResponse(Of Object).SuccessResponse(learners))
        End Function

        ''' <summary>
        ''' Update a learner's information
        ''' </summary>
        <Route("{learnerId:int}")>
        <HttpPut>
        Public Function UpdateLearner(learnerId As Integer, request As LearnerUpdateRequest) As IHttpActionResult
            If request Is Nothing Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of Object).ErrorResponse("INVALID_REQUEST", "Request body is required"))
            End If

            Dim apiKeySetaId = CInt(Me.Request.Properties("SetaId"))
            Dim setaCode = Me.Request.Properties("SetaCode").ToString()

            ' Verify the learner belongs to this SETA
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                ' Check if learner exists and belongs to this SETA
                Dim checkSql As String = "SELECT RegisteredSETAID FROM LearnerRegistry WHERE LearnerID = @LearnerID"
                Using checkCmd As New SqlCommand(checkSql, conn)
                    checkCmd.Parameters.AddWithValue("@LearnerID", learnerId)
                    Dim result = checkCmd.ExecuteScalar()

                    If result Is Nothing Then
                        Return Content(HttpStatusCode.NotFound,
                            ApiResponse(Of Object).ErrorResponse("NOT_FOUND", "Learner not found"))
                    End If

                    If CInt(result) <> apiKeySetaId Then
                        Return Content(HttpStatusCode.Forbidden,
                            ApiResponse(Of Object).ErrorResponse("ACCESS_DENIED", "Cannot update learners from other SETAs"))
                    End If
                End Using

                ' Build update SQL dynamically based on provided fields
                Dim updates As New List(Of String)
                Dim cmd As New SqlCommand()
                cmd.Connection = conn

                If Not String.IsNullOrEmpty(request.FirstName) Then
                    updates.Add("FirstName = @FirstName")
                    cmd.Parameters.AddWithValue("@FirstName", request.FirstName)
                End If

                If Not String.IsNullOrEmpty(request.Surname) Then
                    updates.Add("Surname = @Surname")
                    cmd.Parameters.AddWithValue("@Surname", request.Surname)
                End If

                If Not String.IsNullOrEmpty(request.LearnershipCode) Then
                    updates.Add("LearnershipCode = @LearnershipCode")
                    cmd.Parameters.AddWithValue("@LearnershipCode", request.LearnershipCode)
                End If

                If Not String.IsNullOrEmpty(request.LearnershipName) Then
                    updates.Add("LearnershipName = @LearnershipName")
                    cmd.Parameters.AddWithValue("@LearnershipName", request.LearnershipName)
                End If

                If Not String.IsNullOrEmpty(request.Province) Then
                    updates.Add("ProvinceCode = @Province")
                    cmd.Parameters.AddWithValue("@Province", request.Province)
                End If

                If Not String.IsNullOrEmpty(request.Status) Then
                    updates.Add("Status = @Status")
                    cmd.Parameters.AddWithValue("@Status", request.Status)
                End If

                If updates.Count = 0 Then
                    Return Content(HttpStatusCode.BadRequest,
                        ApiResponse(Of Object).ErrorResponse("NO_UPDATES", "No fields to update"))
                End If

                ' Execute update
                Dim updateSql As String = $"UPDATE LearnerRegistry SET {String.Join(", ", updates)} WHERE LearnerID = @LearnerID"
                cmd.CommandText = updateSql
                cmd.Parameters.AddWithValue("@LearnerID", learnerId)
                cmd.ExecuteNonQuery()

                ' Log audit
                AuditLogService.LogAsync(apiKeySetaId, AuditLogService.ACTION_UPDATE, "LearnerRegistry",
                                         recordId:=learnerId, details:=$"Updated fields: {String.Join(", ", updates)}",
                                         userId:=setaCode)

                ' Log to LearnerVerificationHistory
                LogLearnerVerification(
                    learnerId:=learnerId,
                    verificationType:="UPDATE",
                    status:="SUCCESS",
                    verifiedBy:=setaCode,
                    notes:=$"Updated fields: {String.Join(", ", updates)}")
            End Using

            Return Ok(ApiResponse(Of Object).SuccessResponse(New With {
                .message = "Learner updated successfully",
                .learnerId = learnerId
            }))
        End Function

        ''' <summary>
        ''' Deactivate/withdraw a learner
        ''' </summary>
        <Route("{learnerId:int}/deactivate")>
        <HttpPost>
        Public Function DeactivateLearner(learnerId As Integer, request As LearnerDeactivateRequest) As IHttpActionResult
            If request Is Nothing OrElse String.IsNullOrWhiteSpace(request.Reason) Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of Object).ErrorResponse("INVALID_REQUEST", "Withdrawal reason is required"))
            End If

            Dim apiKeySetaId = CInt(Me.Request.Properties("SetaId"))
            Dim setaCode = Me.Request.Properties("SetaCode").ToString()

            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                ' Check if learner exists and belongs to this SETA
                Dim checkSql As String = "SELECT RegisteredSETAID, Status FROM LearnerRegistry WHERE LearnerID = @LearnerID"
                Using checkCmd As New SqlCommand(checkSql, conn)
                    checkCmd.Parameters.AddWithValue("@LearnerID", learnerId)
                    Using reader = checkCmd.ExecuteReader()
                        If Not reader.Read() Then
                            Return Content(HttpStatusCode.NotFound,
                                ApiResponse(Of Object).ErrorResponse("NOT_FOUND", "Learner not found"))
                        End If

                        If reader.GetInt32(0) <> apiKeySetaId Then
                            Return Content(HttpStatusCode.Forbidden,
                                ApiResponse(Of Object).ErrorResponse("ACCESS_DENIED", "Cannot deactivate learners from other SETAs"))
                        End If

                        If reader.GetString(1) = "Withdrawn" Then
                            Return Content(HttpStatusCode.Conflict,
                                ApiResponse(Of Object).ErrorResponse("ALREADY_WITHDRAWN", "Learner is already withdrawn"))
                        End If
                    End Using
                End Using

                ' Update learner status to Withdrawn
                Dim updateSql As String = "UPDATE LearnerRegistry SET Status = 'Withdrawn' WHERE LearnerID = @LearnerID"
                Using updateCmd As New SqlCommand(updateSql, conn)
                    updateCmd.Parameters.AddWithValue("@LearnerID", learnerId)
                    updateCmd.ExecuteNonQuery()
                End Using

                ' Update enrollment index to mark as inactive
                Dim indexSql As String = "
                    UPDATE LearnerEnrollmentIndex
                    SET IsActive = 0
                    WHERE IDNumberHash = (SELECT IDNumberHash FROM LearnerRegistry WHERE LearnerID = @LearnerID)
                      AND RegisteredSETAID = @SETAID"
                Using indexCmd As New SqlCommand(indexSql, conn)
                    indexCmd.Parameters.AddWithValue("@LearnerID", learnerId)
                    indexCmd.Parameters.AddWithValue("@SETAID", apiKeySetaId)
                    indexCmd.ExecuteNonQuery()
                End Using

                ' Log audit
                AuditLogService.LogAsync(apiKeySetaId, AuditLogService.ACTION_DELETE, "LearnerRegistry",
                                         recordId:=learnerId, details:=$"Withdrawal reason: {request.Reason}",
                                         userId:=setaCode)

                ' Log to LearnerVerificationHistory
                LogLearnerVerification(
                    learnerId:=learnerId,
                    verificationType:="DEACTIVATION",
                    status:="WITHDRAWN",
                    verifiedBy:=setaCode,
                    notes:=$"Learner withdrawn. Reason: {request.Reason}")
            End Using

            Return Ok(ApiResponse(Of Object).SuccessResponse(New With {
                .message = "Learner withdrawn successfully",
                .learnerId = learnerId,
                .status = "Withdrawn"
            }))
        End Function

        ''' <summary>
        ''' Get a single learner by ID
        ''' </summary>
        <Route("detail/{learnerId:int}")>
        <HttpGet>
        Public Function GetLearnerById(learnerId As Integer) As IHttpActionResult
            Dim apiKeySetaId = CInt(Me.Request.Properties("SetaId"))

            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                Dim sql As String = "
                    SELECT LearnerID, IDNumber, FirstName, Surname, DateOfBirth, Gender,
                           LearnershipCode, LearnershipName, ProvinceCode, RegistrationDate, Status, EnrollmentYear
                    FROM LearnerRegistry
                    WHERE LearnerID = @LearnerID AND RegisteredSETAID = @SETAID"

                Using cmd As New SqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@LearnerID", learnerId)
                    cmd.Parameters.AddWithValue("@SETAID", apiKeySetaId)

                    Using reader = cmd.ExecuteReader()
                        If Not reader.Read() Then
                            Return Content(HttpStatusCode.NotFound,
                                ApiResponse(Of Object).ErrorResponse("NOT_FOUND", "Learner not found or access denied"))
                        End If

                        Dim learner As New LearnerInfo With {
                            .LearnerId = reader.GetInt32(0),
                            .IdNumberMasked = MaskIdNumber(If(reader.IsDBNull(1), "", reader.GetString(1))),
                            .FirstName = If(reader.IsDBNull(2), "", reader.GetString(2)),
                            .Surname = If(reader.IsDBNull(3), "", reader.GetString(3)),
                            .DateOfBirth = If(reader.IsDBNull(4), Nothing, reader.GetDateTime(4)),
                            .Gender = If(reader.IsDBNull(5), Nothing, reader.GetString(5)),
                            .LearnershipCode = If(reader.IsDBNull(6), Nothing, reader.GetString(6)),
                            .ProgrammeName = If(reader.IsDBNull(7), Nothing, reader.GetString(7)),
                            .Province = If(reader.IsDBNull(8), Nothing, reader.GetString(8)),
                            .RegistrationDate = If(reader.IsDBNull(9), DateTime.MinValue, reader.GetDateTime(9)),
                            .Status = If(reader.IsDBNull(10), "", reader.GetString(10))
                        }

                        Return Ok(ApiResponse(Of LearnerInfo).SuccessResponse(learner))
                    End Using
                End Using
            End Using
        End Function

        ''' <summary>
        ''' Check for enrollment duplicates
        ''' </summary>
        Private Function CheckEnrollmentDuplicate(idNumber As String, learnershipCode As String,
                                                  setaId As Integer, enrollmentYear As Integer,
                                                  province As String) As DuplicateCheckResult
            Dim result As New DuplicateCheckResult With {
                .Decision = "ALLOWED"
            }

            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString
            Dim idHash = ComputeSha256HashBytes(idNumber)

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                ' Check 1: Same learnership, same SETA, same province, same year = BLOCKED
                Dim sql1 As String = "
                    SELECT idx.RegisteredSETAID, s.SETACode, s.SETAName,
                           idx.LearnershipCode, idx.EnrollmentYear, idx.ProvinceCode, idx.RegistrationDate
                    FROM LearnerEnrollmentIndex idx
                    INNER JOIN SETAs s ON idx.RegisteredSETAID = s.SETAID
                    WHERE idx.IDNumberHash = @IDHash
                      AND idx.LearnershipCode = @LearnershipCode
                      AND idx.RegisteredSETAID = @SETAID
                      AND idx.EnrollmentYear = @Year
                      AND idx.ProvinceCode = @Province
                      AND idx.IsActive = 1"

                Using cmd As New SqlCommand(sql1, conn)
                    cmd.Parameters.AddWithValue("@IDHash", idHash)
                    cmd.Parameters.AddWithValue("@LearnershipCode", learnershipCode)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    cmd.Parameters.AddWithValue("@Year", enrollmentYear)
                    cmd.Parameters.AddWithValue("@Province", province)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        If reader.Read() Then
                            result.Decision = "BLOCKED"
                            result.DuplicateType = "SAME_SETA_SAME_PROVINCE"
                            result.Message = "Learner already enrolled in this learnership at this SETA in this province"
                            result.ExistingEnrollment = ReadExistingEnrollment(reader)
                            Return result
                        End If
                    End Using
                End Using

                ' Check 2: Same learnership at DIFFERENT SETA in same year = BLOCKED
                Dim sql2 As String = "
                    SELECT idx.RegisteredSETAID, s.SETACode, s.SETAName,
                           idx.LearnershipCode, idx.EnrollmentYear, idx.ProvinceCode, idx.RegistrationDate
                    FROM LearnerEnrollmentIndex idx
                    INNER JOIN SETAs s ON idx.RegisteredSETAID = s.SETAID
                    WHERE idx.IDNumberHash = @IDHash
                      AND idx.LearnershipCode = @LearnershipCode
                      AND idx.RegisteredSETAID <> @SETAID
                      AND idx.EnrollmentYear = @Year
                      AND idx.IsActive = 1"

                Using cmd As New SqlCommand(sql2, conn)
                    cmd.Parameters.AddWithValue("@IDHash", idHash)
                    cmd.Parameters.AddWithValue("@LearnershipCode", learnershipCode)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    cmd.Parameters.AddWithValue("@Year", enrollmentYear)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        If reader.Read() Then
                            result.Decision = "BLOCKED"
                            result.DuplicateType = "DIFFERENT_SETA_SAME_YEAR"
                            result.Message = "Learner already enrolled in this learnership at another SETA this year"
                            result.ExistingEnrollment = ReadExistingEnrollment(reader)
                            Return result
                        End If
                    End Using
                End Using

                ' Check 3: Same learnership, same SETA, DIFFERENT province = ALLOWED (return info)
                Dim sql3 As String = "
                    SELECT idx.RegisteredSETAID, s.SETACode, s.SETAName,
                           idx.LearnershipCode, idx.EnrollmentYear, idx.ProvinceCode, idx.RegistrationDate
                    FROM LearnerEnrollmentIndex idx
                    INNER JOIN SETAs s ON idx.RegisteredSETAID = s.SETAID
                    WHERE idx.IDNumberHash = @IDHash
                      AND idx.LearnershipCode = @LearnershipCode
                      AND idx.RegisteredSETAID = @SETAID
                      AND idx.EnrollmentYear = @Year
                      AND idx.ProvinceCode <> @Province
                      AND idx.IsActive = 1"

                Using cmd As New SqlCommand(sql3, conn)
                    cmd.Parameters.AddWithValue("@IDHash", idHash)
                    cmd.Parameters.AddWithValue("@LearnershipCode", learnershipCode)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    cmd.Parameters.AddWithValue("@Year", enrollmentYear)
                    cmd.Parameters.AddWithValue("@Province", province)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        If reader.Read() Then
                            result.Decision = "ALLOWED"
                            result.DuplicateType = "DIFFERENT_PROVINCE"
                            result.Message = "Learner can enroll in different province"
                            result.ExistingEnrollment = ReadExistingEnrollment(reader)
                        End If
                    End Using
                End Using
            End Using

            Return result
        End Function

        ''' <summary>
        ''' Create enrollment in database
        ''' Returns enrollment result with both EnrollmentID and LearnerID
        ''' </summary>
        Private Function CreateEnrollment(request As EnrollmentRequest, cleanIdNumber As String) As EnrollmentResult
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString
            Dim enrollmentId As String = Guid.NewGuid().ToString("N").Substring(0, 12).ToUpper()
            Dim idHash = ComputeSha256HashBytes(cleanIdNumber)

            Try
                Using conn As New SqlConnection(connectionString)
                    conn.Open()

                    Using tran As SqlTransaction = conn.BeginTransaction()
                        Try
                            ' Insert into LearnerEnrollmentIndex (global)
                            Dim sql1 As String = "
                                INSERT INTO LearnerEnrollmentIndex
                                    (IDNumberHash, LearnershipCode, RegisteredSETAID, EnrollmentYear, ProvinceCode, RegistrationDate, IsActive)
                                VALUES
                                    (@IDHash, @LearnershipCode, @SETAID, @Year, @Province, GETDATE(), 1)"

                            Using cmd As New SqlCommand(sql1, conn, tran)
                                cmd.Parameters.AddWithValue("@IDHash", idHash)
                                cmd.Parameters.AddWithValue("@LearnershipCode", request.LearnershipCode)
                                cmd.Parameters.AddWithValue("@SETAID", request.SetaId)
                                cmd.Parameters.AddWithValue("@Year", request.EnrollmentYear)
                                cmd.Parameters.AddWithValue("@Province", request.Province)
                                cmd.ExecuteNonQuery()
                            End Using

                            ' Insert into LearnerRegistry (partitioned by SETA) and get LearnerID
                            Dim sql2 As String = "
                                INSERT INTO LearnerRegistry
                                    (EnrollmentID, IDNumber, IDNumberHash, FirstName, Surname, LearnershipCode,
                                     LearnershipName, RegisteredSETAID, ProvinceCode, EnrollmentYear,
                                     RegistrationDate, Status, CreatedAt)
                                OUTPUT INSERTED.LearnerID
                                VALUES
                                    (@EnrollmentID, @IDNumber, @IDHash, @FirstName, @Surname, @LearnershipCode,
                                     @LearnershipName, @SETAID, @Province, @Year,
                                     GETDATE(), 'Active', GETDATE())"

                            Dim learnerId As Integer = 0
                            Using cmd As New SqlCommand(sql2, conn, tran)
                                cmd.Parameters.AddWithValue("@EnrollmentID", enrollmentId)
                                cmd.Parameters.AddWithValue("@IDNumber", cleanIdNumber)
                                cmd.Parameters.AddWithValue("@IDHash", idHash)
                                cmd.Parameters.AddWithValue("@FirstName", request.FirstName)
                                cmd.Parameters.AddWithValue("@Surname", request.Surname)
                                cmd.Parameters.AddWithValue("@LearnershipCode", request.LearnershipCode)
                                cmd.Parameters.AddWithValue("@LearnershipName", If(request.LearnershipName, ""))
                                cmd.Parameters.AddWithValue("@SETAID", request.SetaId)
                                cmd.Parameters.AddWithValue("@Province", request.Province)
                                cmd.Parameters.AddWithValue("@Year", request.EnrollmentYear)
                                learnerId = CInt(cmd.ExecuteScalar())
                            End Using

                            tran.Commit()
                            Return New EnrollmentResult With {
                                .EnrollmentId = enrollmentId,
                                .LearnerId = learnerId
                            }

                        Catch ex As Exception
                            tran.Rollback()
                            System.Diagnostics.Debug.WriteLine("Enrollment failed: " & ex.Message)
                            Return Nothing
                        End Try
                    End Using
                End Using
            Catch ex As Exception
                System.Diagnostics.Debug.WriteLine("Enrollment connection failed: " & ex.Message)
                Return Nothing
            End Try
        End Function

        ''' <summary>
        ''' Get learners from database
        ''' </summary>
        Private Function GetLearnersFromDB(setaId As Integer, page As Integer, pageSize As Integer) As List(Of LearnerInfo)
            Dim learners As New List(Of LearnerInfo)
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString
            Dim offset = (page - 1) * pageSize

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                Dim sql As String = "
                    SELECT LearnerID, IDNumber, FirstName, Surname, LearnershipCode,
                           LearnershipName, ProvinceCode, RegistrationDate, Status
                    FROM LearnerRegistry
                    WHERE RegisteredSETAID = @SETAID
                    ORDER BY RegistrationDate DESC
                    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY"

                Using cmd As New SqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    cmd.Parameters.AddWithValue("@Offset", offset)
                    cmd.Parameters.AddWithValue("@PageSize", pageSize)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        While reader.Read()
                            learners.Add(New LearnerInfo With {
                                .LearnerId = reader.GetInt32(0),
                                .IdNumberMasked = MaskIdNumber(If(reader.IsDBNull(1), "", reader.GetString(1))),
                                .FirstName = If(reader.IsDBNull(2), "", reader.GetString(2)),
                                .Surname = If(reader.IsDBNull(3), "", reader.GetString(3)),
                                .LearnershipCode = If(reader.IsDBNull(4), "", reader.GetString(4)),
                                .ProgrammeName = If(reader.IsDBNull(5), "", reader.GetString(5)),
                                .Province = If(reader.IsDBNull(6), "", reader.GetString(6)),
                                .RegistrationDate = If(reader.IsDBNull(7), DateTime.MinValue, reader.GetDateTime(7)),
                                .Status = If(reader.IsDBNull(8), "", reader.GetString(8))
                            })
                        End While
                    End Using
                End Using
            End Using

            Return learners
        End Function

        ''' <summary>
        ''' Search learners by ID number
        ''' </summary>
        Private Function SearchByIdNumber(idNumber As String, setaId As Integer) As List(Of LearnerInfo)
            Dim learners As New List(Of LearnerInfo)
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString
            Dim cleanId = idNumber.Replace(" ", "").Replace("-", "")
            Dim idHash = ComputeSha256HashBytes(cleanId)

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                Dim sql As String = "
                    SELECT LearnerID, IDNumber, FirstName, Surname, LearnershipCode,
                           LearnershipName, ProvinceCode, RegistrationDate, Status
                    FROM LearnerRegistry
                    WHERE RegisteredSETAID = @SETAID
                      AND IDNumberHash = @IDHash"

                Using cmd As New SqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    cmd.Parameters.AddWithValue("@IDHash", idHash)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        While reader.Read()
                            learners.Add(New LearnerInfo With {
                                .LearnerId = reader.GetInt32(0),
                                .IdNumberMasked = MaskIdNumber(If(reader.IsDBNull(1), "", reader.GetString(1))),
                                .FirstName = If(reader.IsDBNull(2), "", reader.GetString(2)),
                                .Surname = If(reader.IsDBNull(3), "", reader.GetString(3)),
                                .LearnershipCode = If(reader.IsDBNull(4), "", reader.GetString(4)),
                                .ProgrammeName = If(reader.IsDBNull(5), "", reader.GetString(5)),
                                .Province = If(reader.IsDBNull(6), "", reader.GetString(6)),
                                .RegistrationDate = If(reader.IsDBNull(7), DateTime.MinValue, reader.GetDateTime(7)),
                                .Status = If(reader.IsDBNull(8), "", reader.GetString(8))
                            })
                        End While
                    End Using
                End Using
            End Using

            Return learners
        End Function

        ''' <summary>
        ''' Search learners by name
        ''' </summary>
        Private Function SearchByName(firstName As String, surname As String, setaId As Integer) As List(Of LearnerInfo)
            Dim learners As New List(Of LearnerInfo)
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                Dim sql As String = "
                    SELECT TOP 100 LearnerID, IDNumber, FirstName, Surname, LearnershipCode,
                           LearnershipName, ProvinceCode, RegistrationDate, Status
                    FROM LearnerRegistry
                    WHERE RegisteredSETAID = @SETAID
                      AND (@FirstName IS NULL OR FirstName LIKE @FirstName + '%')
                      AND (@Surname IS NULL OR Surname LIKE @Surname + '%')
                    ORDER BY Surname, FirstName"

                Using cmd As New SqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    cmd.Parameters.AddWithValue("@FirstName", If(String.IsNullOrEmpty(firstName), DBNull.Value, firstName))
                    cmd.Parameters.AddWithValue("@Surname", If(String.IsNullOrEmpty(surname), DBNull.Value, surname))

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        While reader.Read()
                            learners.Add(New LearnerInfo With {
                                .LearnerId = reader.GetInt32(0),
                                .IdNumberMasked = MaskIdNumber(If(reader.IsDBNull(1), "", reader.GetString(1))),
                                .FirstName = If(reader.IsDBNull(2), "", reader.GetString(2)),
                                .Surname = If(reader.IsDBNull(3), "", reader.GetString(3)),
                                .LearnershipCode = If(reader.IsDBNull(4), "", reader.GetString(4)),
                                .ProgrammeName = If(reader.IsDBNull(5), "", reader.GetString(5)),
                                .Province = If(reader.IsDBNull(6), "", reader.GetString(6)),
                                .RegistrationDate = If(reader.IsDBNull(7), DateTime.MinValue, reader.GetDateTime(7)),
                                .Status = If(reader.IsDBNull(8), "", reader.GetString(8))
                            })
                        End While
                    End Using
                End Using
            End Using

            Return learners
        End Function

        ''' <summary>
        ''' Mask ID number for privacy (POPIA)
        ''' </summary>
        Private Function MaskIdNumber(idNumber As String) As String
            If String.IsNullOrEmpty(idNumber) OrElse idNumber.Length < 13 Then
                Return "****"
            End If
            Return idNumber.Substring(0, 6) & "****" & idNumber.Substring(10, 3)
        End Function

        ''' <summary>
        ''' Read existing enrollment info from reader
        ''' </summary>
        Private Function ReadExistingEnrollment(reader As SqlDataReader) As ExistingEnrollmentInfo
            Return New ExistingEnrollmentInfo With {
                .SetaId = reader.GetInt32(0),
                .SetaCode = reader.GetString(1),
                .SetaName = reader.GetString(2),
                .LearnershipCode = reader.GetString(3),
                .EnrollmentYear = reader.GetInt32(4),
                .Province = reader.GetString(5),
                .EnrollmentDate = reader.GetDateTime(6)
            }
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
        ''' Compute SHA256 hash as bytes
        ''' </summary>
        Private Function ComputeSha256HashBytes(input As String) As Byte()
            Using sha256 As SHA256 = SHA256.Create()
                Return sha256.ComputeHash(Encoding.UTF8.GetBytes(input))
            End Using
        End Function

        ''' <summary>
        ''' Log learner verification to LearnerVerificationHistory table
        ''' </summary>
        Private Sub LogLearnerVerification(learnerId As Integer, verificationType As String, status As String,
                                          Optional dhaStatus As String = Nothing,
                                          Optional dhaReference As String = Nothing,
                                          Optional verifiedBy As String = Nothing,
                                          Optional expiresAt As DateTime? = Nothing,
                                          Optional notes As String = Nothing)
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

            Try
                Using conn As New SqlConnection(connectionString)
                    conn.Open()

                    Dim sql As String = "
                        INSERT INTO LearnerVerificationHistory (
                            LearnerID, VerificationType, Status, DHAStatus, DHAReference,
                            VerifiedAt, VerifiedBy, ExpiresAt, Notes
                        )
                        VALUES (
                            @LearnerID, @VerificationType, @Status, @DHAStatus, @DHAReference,
                            GETDATE(), @VerifiedBy, @ExpiresAt, @Notes
                        )"

                    Using cmd As New SqlCommand(sql, conn)
                        cmd.Parameters.AddWithValue("@LearnerID", learnerId)
                        cmd.Parameters.AddWithValue("@VerificationType", verificationType)
                        cmd.Parameters.AddWithValue("@Status", status)
                        cmd.Parameters.AddWithValue("@DHAStatus", If(String.IsNullOrEmpty(dhaStatus), DBNull.Value, dhaStatus))
                        cmd.Parameters.AddWithValue("@DHAReference", If(String.IsNullOrEmpty(dhaReference), DBNull.Value, dhaReference))
                        cmd.Parameters.AddWithValue("@VerifiedBy", If(String.IsNullOrEmpty(verifiedBy), DBNull.Value, verifiedBy))
                        cmd.Parameters.AddWithValue("@ExpiresAt", If(expiresAt.HasValue, expiresAt.Value, DBNull.Value))
                        cmd.Parameters.AddWithValue("@Notes", If(String.IsNullOrEmpty(notes), DBNull.Value, notes))
                        cmd.ExecuteNonQuery()
                    End Using
                End Using
            Catch ex As Exception
                System.Diagnostics.Debug.WriteLine("Failed to log learner verification: " & ex.Message)
            End Try
        End Sub

        ''' <summary>
        ''' Duplicate check result
        ''' </summary>
        Private Class DuplicateCheckResult
            Public Property Decision As String
            Public Property DuplicateType As String
            Public Property Message As String
            Public Property ExistingEnrollment As ExistingEnrollmentInfo
        End Class

        ''' <summary>
        ''' Enrollment result containing both EnrollmentID and LearnerID
        ''' </summary>
        Private Class EnrollmentResult
            Public Property EnrollmentId As String
            Public Property LearnerId As Integer
        End Class

    End Class

End Namespace
