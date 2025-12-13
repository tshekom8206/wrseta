Imports System.Net
Imports System.Net.Http
Imports System.Web.Http
Imports System.Data.SqlClient
Imports System.Configuration
Imports SETA.API.Models
Imports SETA.API.Security

Namespace SETA.API.Controllers

    ''' <summary>
    ''' Dashboard controller for verification and enrollment statistics
    ''' </summary>
    <RoutePrefix("api/dashboard")>
    <ApiKeyAuth>
    Public Class DashboardController
        Inherits ApiController

        ''' <summary>
        ''' Get dashboard statistics for a specific SETA
        ''' </summary>
        <Route("stats/{setaId:int}")>
        <HttpGet>
        Public Function GetStats(setaId As Integer) As IHttpActionResult
            ' Validate SETA access
            Dim apiKeySetaId = CInt(Me.Request.Properties("SetaId"))
            If apiKeySetaId <> setaId Then
                Return Content(HttpStatusCode.Forbidden,
                    ApiResponse(Of DashboardStats).ErrorResponse("ACCESS_DENIED", "Cannot access other SETA's statistics"))
            End If

            Dim stats = GetDashboardStatsFromDB(setaId)
            Return Ok(ApiResponse(Of DashboardStats).SuccessResponse(stats))
        End Function

        ''' <summary>
        ''' Get summary across all SETAs (admin only)
        ''' </summary>
        <Route("summary")>
        <HttpGet>
        Public Function GetSummary() As IHttpActionResult
            ' This endpoint could be restricted to admin users
            Dim summary = GetAllSETAsSummary()
            Return Ok(ApiResponse(Of Object).SuccessResponse(summary))
        End Function

        ''' <summary>
        ''' Get verification trends for a SETA
        ''' </summary>
        <Route("trends/{setaId:int}")>
        <HttpGet>
        Public Function GetTrends(setaId As Integer, Optional days As Integer = 30) As IHttpActionResult
            ' Validate SETA access
            Dim apiKeySetaId = CInt(Me.Request.Properties("SetaId"))
            If apiKeySetaId <> setaId Then
                Return Content(HttpStatusCode.Forbidden,
                    ApiResponse(Of Object).ErrorResponse("ACCESS_DENIED", "Cannot access other SETA's data"))
            End If

            If days > 365 Then days = 365
            If days < 1 Then days = 30

            Dim trends = GetVerificationTrends(setaId, days)
            Return Ok(ApiResponse(Of Object).SuccessResponse(trends))
        End Function

        ''' <summary>
        ''' Get blocked enrollment attempts
        ''' </summary>
        <Route("blocked/{setaId:int}")>
        <HttpGet>
        Public Function GetBlockedAttempts(setaId As Integer, Optional page As Integer = 1, Optional pageSize As Integer = 20) As IHttpActionResult
            ' Validate SETA access
            Dim apiKeySetaId = CInt(Me.Request.Properties("SetaId"))
            If apiKeySetaId <> setaId Then
                Return Content(HttpStatusCode.Forbidden,
                    ApiResponse(Of Object).ErrorResponse("ACCESS_DENIED", "Cannot access other SETA's data"))
            End If

            Dim blocked = GetBlockedAttemptsFromDB(setaId, page, pageSize)
            Return Ok(ApiResponse(Of Object).SuccessResponse(New With {
                .blockedAttempts = blocked,
                .page = page,
                .pageSize = pageSize
            }))
        End Function

        ''' <summary>
        ''' Get verification history logs with pagination and optional filters
        ''' </summary>
        <Route("verification-history/{setaId:int}")>
        <HttpGet>
        Public Function GetVerificationHistory(setaId As Integer,
                                               Optional page As Integer = 1,
                                               Optional pageSize As Integer = 50,
                                               Optional status As String = Nothing,
                                               Optional startDate As String = Nothing,
                                               Optional endDate As String = Nothing) As IHttpActionResult
            ' Validate SETA access
            Dim apiKeySetaId = CInt(Me.Request.Properties("SetaId"))
            If apiKeySetaId <> setaId Then
                Return Content(HttpStatusCode.Forbidden,
                    ApiResponse(Of Object).ErrorResponse("ACCESS_DENIED", "Cannot access other SETA's data"))
            End If

            ' Validate pagination
            If page < 1 Then page = 1
            If pageSize < 1 OrElse pageSize > 100 Then pageSize = 50

            Dim history = GetVerificationHistoryFromDB(setaId, page, pageSize, status, startDate, endDate)
            Return Ok(ApiResponse(Of Object).SuccessResponse(history))
        End Function

        ''' <summary>
        ''' Get recent verification history logs (last N records)
        ''' </summary>
        <Route("verification-recent/{setaId:int}")>
        <HttpGet>
        Public Function GetRecentVerificationHistory(setaId As Integer, Optional limit As Integer = 50) As IHttpActionResult
            ' Validate SETA access
            Dim apiKeySetaId = CInt(Me.Request.Properties("SetaId"))
            If apiKeySetaId <> setaId Then
                Return Content(HttpStatusCode.Forbidden,
                    ApiResponse(Of Object).ErrorResponse("ACCESS_DENIED", "Cannot access other SETA's data"))
            End If

            ' Validate limit
            If limit < 1 OrElse limit > 200 Then limit = 50

            Dim recent = GetRecentVerificationHistoryFromDB(setaId, limit)
            Return Ok(ApiResponse(Of Object).SuccessResponse(New With {
                .verifications = recent,
                .count = recent.Count,
                .setaId = setaId
            }))
        End Function

        ''' <summary>
        ''' Get enrollment report with pagination and optional filters
        ''' </summary>
        <Route("enrollment-report/{setaId:int}")>
        <HttpGet>
        Public Function GetEnrollmentReport(setaId As Integer,
                                           Optional page As Integer = 1,
                                           Optional pageSize As Integer = 50,
                                           Optional status As String = Nothing,
                                           Optional learnershipCode As String = Nothing,
                                           Optional enrollmentYear As Integer = 0,
                                           Optional startDate As String = Nothing,
                                           Optional endDate As String = Nothing) As IHttpActionResult
            ' Validate SETA access
            Dim apiKeySetaId = CInt(Me.Request.Properties("SetaId"))
            If apiKeySetaId <> setaId Then
                Return Content(HttpStatusCode.Forbidden,
                    ApiResponse(Of Object).ErrorResponse("ACCESS_DENIED", "Cannot access other SETA's data"))
            End If

            ' Validate pagination
            If page < 1 Then page = 1
            If pageSize < 1 OrElse pageSize > 100 Then pageSize = 50

            Dim report = GetEnrollmentReportFromDB(setaId, page, pageSize, status, learnershipCode, enrollmentYear, startDate, endDate)
            Return Ok(ApiResponse(Of Object).SuccessResponse(report))
        End Function

        ''' <summary>
        ''' Get dashboard statistics from database
        ''' </summary>
        Private Function GetDashboardStatsFromDB(setaId As Integer) As DashboardStats
            Dim stats As New DashboardStats With {
                .SetaId = setaId
            }

            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                ' Get SETA info
                Dim setaSQL As String = "SELECT SETACode, SETAName FROM SETAs WHERE SETAID = @SETAID"
                Using cmd As New SqlCommand(setaSQL, conn)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        If reader.Read() Then
                            stats.SetaCode = reader.GetString(0)
                            stats.SetaName = reader.GetString(1)
                        End If
                    End Using
                End Using

                ' Get total learners
                Dim totalSQL As String = "SELECT COUNT(*) FROM LearnerRegistry WHERE RegisteredSETAID = @SETAID AND Status = 'Active'"
                Using cmd As New SqlCommand(totalSQL, conn)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    stats.TotalLearners = CInt(cmd.ExecuteScalar())
                End Using

                ' Get verification counts by status
                Dim greenSQL As String = "SELECT COUNT(*) FROM VerificationLog WHERE RequestingSETAID = @SETAID AND Status = 'GREEN'"
                Using cmd As New SqlCommand(greenSQL, conn)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    stats.VerifiedGreen = CInt(cmd.ExecuteScalar())
                End Using

                Dim yellowSQL As String = "SELECT COUNT(*) FROM VerificationLog WHERE RequestingSETAID = @SETAID AND Status = 'YELLOW'"
                Using cmd As New SqlCommand(yellowSQL, conn)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    stats.VerifiedYellow = CInt(cmd.ExecuteScalar())
                End Using

                Dim redSQL As String = "SELECT COUNT(*) FROM VerificationLog WHERE RequestingSETAID = @SETAID AND Status = 'RED'"
                Using cmd As New SqlCommand(redSQL, conn)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    stats.VerifiedRed = CInt(cmd.ExecuteScalar())
                End Using

                ' Get blocked attempts (duplicates)
                Dim blockedSQL As String = "
                    SELECT COUNT(*) FROM VerificationLog
                    WHERE RequestingSETAID = @SETAID
                      AND Status = 'RED'
                      AND Message LIKE '%duplicate%'"
                Using cmd As New SqlCommand(blockedSQL, conn)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    stats.BlockedAttempts = CInt(cmd.ExecuteScalar())
                End Using

                ' Get today's verifications
                Dim todaySQL As String = "
                    SELECT COUNT(*) FROM VerificationLog
                    WHERE RequestingSETAID = @SETAID
                      AND CAST(VerifiedAt AS DATE) = CAST(GETDATE() AS DATE)"
                Using cmd As New SqlCommand(todaySQL, conn)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    stats.TodayVerifications = CInt(cmd.ExecuteScalar())
                End Using

                ' Get this month's enrollments
                Dim monthSQL As String = "
                    SELECT COUNT(*) FROM LearnerEnrollmentIndex
                    WHERE RegisteredSETAID = @SETAID
                      AND MONTH(RegistrationDate) = MONTH(GETDATE())
                      AND YEAR(RegistrationDate) = YEAR(GETDATE())"
                Using cmd As New SqlCommand(monthSQL, conn)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    stats.ThisMonthEnrollments = CInt(cmd.ExecuteScalar())
                End Using
            End Using

            Return stats
        End Function

        ''' <summary>
        ''' Get summary for all SETAs
        ''' </summary>
        Private Function GetAllSETAsSummary() As Object
            Dim summaryList As New List(Of Object)
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                Dim sql As String = "
                    SELECT
                        s.SETAID,
                        s.SETACode,
                        s.SETAName,
                        ISNULL(lr.LearnerCount, 0) AS TotalLearners,
                        ISNULL(vl.VerificationCount, 0) AS TotalVerifications,
                        ISNULL(em.MonthEnrollments, 0) AS ThisMonthEnrollments
                    FROM SETAs s
                    LEFT JOIN (
                        SELECT RegisteredSETAID, COUNT(*) AS LearnerCount
                        FROM LearnerRegistry WHERE Status = 'Active'
                        GROUP BY RegisteredSETAID
                    ) lr ON s.SETAID = lr.RegisteredSETAID
                    LEFT JOIN (
                        SELECT RequestingSETAID, COUNT(*) AS VerificationCount
                        FROM VerificationLog
                        GROUP BY RequestingSETAID
                    ) vl ON s.SETAID = vl.RequestingSETAID
                    LEFT JOIN (
                        SELECT RegisteredSETAID, COUNT(*) AS MonthEnrollments
                        FROM LearnerEnrollmentIndex
                        WHERE MONTH(RegistrationDate) = MONTH(GETDATE())
                          AND YEAR(RegistrationDate) = YEAR(GETDATE())
                        GROUP BY RegisteredSETAID
                    ) em ON s.SETAID = em.RegisteredSETAID
                    WHERE s.IsActive = 1
                    ORDER BY s.SETACode"

                Using cmd As New SqlCommand(sql, conn)
                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        While reader.Read()
                            summaryList.Add(New With {
                                .setaId = reader.GetInt32(0),
                                .setaCode = reader.GetString(1),
                                .setaName = reader.GetString(2),
                                .totalLearners = reader.GetInt32(3),
                                .totalVerifications = reader.GetInt32(4),
                                .thisMonthEnrollments = reader.GetInt32(5)
                            })
                        End While
                    End Using
                End Using
            End Using

            Return New With {
                .setas = summaryList,
                .totalSETAs = summaryList.Count,
                .grandTotalLearners = summaryList.Sum(Function(s) CInt(s.totalLearners)),
                .grandTotalVerifications = summaryList.Sum(Function(s) CInt(s.totalVerifications))
            }
        End Function

        ''' <summary>
        ''' Get verification trends over time
        ''' </summary>
        Private Function GetVerificationTrends(setaId As Integer, days As Integer) As Object
            Dim trendList As New List(Of Object)
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                Dim sql As String = "
                    SELECT
                        CAST(VerifiedAt AS DATE) AS VerificationDate,
                        SUM(CASE WHEN Status = 'GREEN' THEN 1 ELSE 0 END) AS GreenCount,
                        SUM(CASE WHEN Status = 'YELLOW' THEN 1 ELSE 0 END) AS YellowCount,
                        SUM(CASE WHEN Status = 'RED' THEN 1 ELSE 0 END) AS RedCount,
                        COUNT(*) AS TotalCount
                    FROM VerificationLog
                    WHERE RequestingSETAID = @SETAID
                      AND VerifiedAt >= DATEADD(DAY, -@Days, GETDATE())
                    GROUP BY CAST(VerifiedAt AS DATE)
                    ORDER BY CAST(VerifiedAt AS DATE)"

                Using cmd As New SqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    cmd.Parameters.AddWithValue("@Days", days)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        While reader.Read()
                            trendList.Add(New With {
                                .date = reader.GetDateTime(0).ToString("yyyy-MM-dd"),
                                .green = reader.GetInt32(1),
                                .yellow = reader.GetInt32(2),
                                .red = reader.GetInt32(3),
                                .total = reader.GetInt32(4)
                            })
                        End While
                    End Using
                End Using
            End Using

            Return New With {
                .days = days,
                .trends = trendList
            }
        End Function

        ''' <summary>
        ''' Get blocked enrollment attempts
        ''' </summary>
        Private Function GetBlockedAttemptsFromDB(setaId As Integer, page As Integer, pageSize As Integer) As List(Of Object)
            Dim blocked As New List(Of Object)
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString
            Dim offset = (page - 1) * pageSize

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                Dim sql As String = "
                    SELECT VerificationID, Status, Message, VerifiedAt
                    FROM VerificationLog
                    WHERE RequestingSETAID = @SETAID
                      AND Status = 'RED'
                    ORDER BY VerifiedAt DESC
                    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY"

                Using cmd As New SqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    cmd.Parameters.AddWithValue("@Offset", offset)
                    cmd.Parameters.AddWithValue("@PageSize", pageSize)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        While reader.Read()
                            blocked.Add(New With {
                                .logId = reader.GetInt32(0),
                                .status = reader.GetString(1),
                                .message = reader.GetString(2),
                                .verifiedAt = reader.GetDateTime(3)
                            })
                        End While
                    End Using
                End Using
            End Using

            Return blocked
        End Function

        ''' <summary>
        ''' Get verification history from database with pagination and filters
        ''' </summary>
        Private Function GetVerificationHistoryFromDB(setaId As Integer, page As Integer, pageSize As Integer,
                                                      Optional status As String = Nothing,
                                                      Optional startDate As String = Nothing,
                                                      Optional endDate As String = Nothing) As Object
            Dim historyList As New List(Of Object)
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString
            Dim offset = (page - 1) * pageSize
            Dim totalCount As Integer = 0

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                ' Build WHERE clause
                Dim whereConditions As New List(Of String) From {"RequestingSETAID = @SETAID"}

                If Not String.IsNullOrWhiteSpace(status) Then
                    whereConditions.Add("Status = @Status")
                End If

                If Not String.IsNullOrWhiteSpace(startDate) Then
                    whereConditions.Add("CAST(VerifiedAt AS DATE) >= CAST(@StartDate AS DATE)")
                End If

                If Not String.IsNullOrWhiteSpace(endDate) Then
                    whereConditions.Add("CAST(VerifiedAt AS DATE) <= CAST(@EndDate AS DATE)")
                End If

                Dim whereClause = String.Join(" AND ", whereConditions)

                ' Get total count
                Dim countSQL As String = $"SELECT COUNT(*) FROM VerificationLog WHERE {whereClause}"
                Using countCmd As New SqlCommand(countSQL, conn)
                    countCmd.Parameters.AddWithValue("@SETAID", setaId)
                    If Not String.IsNullOrWhiteSpace(status) Then
                        countCmd.Parameters.AddWithValue("@Status", status)
                    End If
                    If Not String.IsNullOrWhiteSpace(startDate) Then
                        countCmd.Parameters.AddWithValue("@StartDate", startDate)
                    End If
                    If Not String.IsNullOrWhiteSpace(endDate) Then
                        countCmd.Parameters.AddWithValue("@EndDate", endDate)
                    End If
                    totalCount = CInt(countCmd.ExecuteScalar())
                End Using

                ' Get paginated results
                Dim sql As String = $"
                    SELECT
                        VerificationID,
                        IDNumber,
                        FirstName,
                        Surname,
                        Status,
                        StatusReason,
                        FormatValid,
                        LuhnValid,
                        DHAVerified,
                        DuplicateFound,
                        ConflictingSETAID,
                        VerifiedBy,
                        Message,
                        VerifiedAt
                    FROM VerificationLog
                    WHERE {whereClause}
                    ORDER BY VerifiedAt DESC
                    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY"

                Using cmd As New SqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    cmd.Parameters.AddWithValue("@Offset", offset)
                    cmd.Parameters.AddWithValue("@PageSize", pageSize)
                    If Not String.IsNullOrWhiteSpace(status) Then
                        cmd.Parameters.AddWithValue("@Status", status)
                    End If
                    If Not String.IsNullOrWhiteSpace(startDate) Then
                        cmd.Parameters.AddWithValue("@StartDate", startDate)
                    End If
                    If Not String.IsNullOrWhiteSpace(endDate) Then
                        cmd.Parameters.AddWithValue("@EndDate", endDate)
                    End If

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        While reader.Read()
                            historyList.Add(New With {
                                .verificationId = reader.GetInt32(0),
                                .idNumber = If(reader.IsDBNull(1), "", MaskIdNumber(reader.GetString(1))),
                                .firstName = If(reader.IsDBNull(2), "", reader.GetString(2)),
                                .surname = If(reader.IsDBNull(3), "", reader.GetString(3)),
                                .status = If(reader.IsDBNull(4), "", reader.GetString(4)),
                                .statusReason = If(reader.IsDBNull(5), "", reader.GetString(5)),
                                .formatValid = If(reader.IsDBNull(6), False, reader.GetBoolean(6)),
                                .luhnValid = If(reader.IsDBNull(7), False, reader.GetBoolean(7)),
                                .dhaVerified = If(reader.IsDBNull(8), False, reader.GetBoolean(8)),
                                .duplicateFound = If(reader.IsDBNull(9), False, reader.GetBoolean(9)),
                                .conflictingSetaId = If(reader.IsDBNull(10), Nothing, CType(reader.GetInt32(10), Integer?)),
                                .verifiedBy = If(reader.IsDBNull(11), "", reader.GetString(11)),
                                .message = If(reader.IsDBNull(12), "", reader.GetString(12)),
                                .verifiedAt = reader.GetDateTime(13)
                            })
                        End While
                    End Using
                End Using
            End Using

            Return New With {
                .verifications = historyList,
                .page = page,
                .pageSize = pageSize,
                .totalCount = totalCount,
                .totalPages = CInt(Math.Ceiling(totalCount / CDbl(pageSize)))
            }
        End Function

        ''' <summary>
        ''' Get recent verification history from database
        ''' </summary>
        Private Function GetRecentVerificationHistoryFromDB(setaId As Integer, limit As Integer) As List(Of Object)
            Dim recentList As New List(Of Object)
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                Dim sql As String = "
                    SELECT TOP (@Limit)
                        VerificationID,
                        IDNumber,
                        FirstName,
                        Surname,
                        Status,
                        StatusReason,
                        FormatValid,
                        LuhnValid,
                        DHAVerified,
                        DuplicateFound,
                        ConflictingSETAID,
                        VerifiedBy,
                        Message,
                        VerifiedAt
                    FROM VerificationLog
                    WHERE RequestingSETAID = @SETAID
                    ORDER BY VerifiedAt DESC"

                Using cmd As New SqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    cmd.Parameters.AddWithValue("@Limit", limit)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        While reader.Read()
                            recentList.Add(New With {
                                .verificationId = reader.GetInt32(0),
                                .idNumber = If(reader.IsDBNull(1), "", MaskIdNumber(reader.GetString(1))),
                                .firstName = If(reader.IsDBNull(2), "", reader.GetString(2)),
                                .surname = If(reader.IsDBNull(3), "", reader.GetString(3)),
                                .status = If(reader.IsDBNull(4), "", reader.GetString(4)),
                                .statusReason = If(reader.IsDBNull(5), "", reader.GetString(5)),
                                .formatValid = If(reader.IsDBNull(6), False, reader.GetBoolean(6)),
                                .luhnValid = If(reader.IsDBNull(7), False, reader.GetBoolean(7)),
                                .dhaVerified = If(reader.IsDBNull(8), False, reader.GetBoolean(8)),
                                .duplicateFound = If(reader.IsDBNull(9), False, reader.GetBoolean(9)),
                                .conflictingSetaId = If(reader.IsDBNull(10), Nothing, CType(reader.GetInt32(10), Integer?)),
                                .verifiedBy = If(reader.IsDBNull(11), "", reader.GetString(11)),
                                .message = If(reader.IsDBNull(12), "", reader.GetString(12)),
                                .verifiedAt = reader.GetDateTime(13)
                            })
                        End While
                    End Using
                End Using
            End Using

            Return recentList
        End Function

        ''' <summary>
        ''' Get enrollment report from database with pagination and filters
        ''' </summary>
        Private Function GetEnrollmentReportFromDB(setaId As Integer, page As Integer, pageSize As Integer,
                                                    Optional status As String = Nothing,
                                                    Optional learnershipCode As String = Nothing,
                                                    Optional enrollmentYear As Integer = 0,
                                                    Optional startDate As String = Nothing,
                                                    Optional endDate As String = Nothing) As Object
            Dim enrollmentList As New List(Of Object)
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString
            Dim offset = (page - 1) * pageSize
            Dim totalCount As Integer = 0

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                ' Build WHERE clause
                Dim whereConditions As New List(Of String) From {"RegisteredSETAID = @SETAID"}

                If Not String.IsNullOrWhiteSpace(status) Then
                    whereConditions.Add("Status = @Status")
                End If

                If Not String.IsNullOrWhiteSpace(learnershipCode) Then
                    whereConditions.Add("LearnershipCode = @LearnershipCode")
                End If

                If enrollmentYear > 0 Then
                    whereConditions.Add("EnrollmentYear = @EnrollmentYear")
                End If

                If Not String.IsNullOrWhiteSpace(startDate) Then
                    whereConditions.Add("CAST(RegistrationDate AS DATE) >= CAST(@StartDate AS DATE)")
                End If

                If Not String.IsNullOrWhiteSpace(endDate) Then
                    whereConditions.Add("CAST(RegistrationDate AS DATE) <= CAST(@EndDate AS DATE)")
                End If

                Dim whereClause = String.Join(" AND ", whereConditions)

                ' Get total count
                Dim countSQL As String = $"SELECT COUNT(*) FROM LearnerRegistry WHERE {whereClause}"
                Using countCmd As New SqlCommand(countSQL, conn)
                    countCmd.Parameters.AddWithValue("@SETAID", setaId)
                    If Not String.IsNullOrWhiteSpace(status) Then
                        countCmd.Parameters.AddWithValue("@Status", status)
                    End If
                    If Not String.IsNullOrWhiteSpace(learnershipCode) Then
                        countCmd.Parameters.AddWithValue("@LearnershipCode", learnershipCode)
                    End If
                    If enrollmentYear > 0 Then
                        countCmd.Parameters.AddWithValue("@EnrollmentYear", enrollmentYear)
                    End If
                    If Not String.IsNullOrWhiteSpace(startDate) Then
                        countCmd.Parameters.AddWithValue("@StartDate", startDate)
                    End If
                    If Not String.IsNullOrWhiteSpace(endDate) Then
                        countCmd.Parameters.AddWithValue("@EndDate", endDate)
                    End If
                    totalCount = CInt(countCmd.ExecuteScalar())
                End Using

                ' Get paginated results
                Dim sql As String = $"
                    SELECT
                        LearnerID,
                        IDNumber,
                        FirstName,
                        Surname,
                        DateOfBirth,
                        Gender,
                        LearnershipCode,
                        LearnershipName,
                        EnrollmentYear,
                        ProvinceCode,
                        RegistrationDate,
                        Status,
                        EnrollmentID,
                        CreatedBy
                    FROM LearnerRegistry
                    WHERE {whereClause}
                    ORDER BY RegistrationDate DESC
                    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY"

                Using cmd As New SqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    cmd.Parameters.AddWithValue("@Offset", offset)
                    cmd.Parameters.AddWithValue("@PageSize", pageSize)
                    If Not String.IsNullOrWhiteSpace(status) Then
                        cmd.Parameters.AddWithValue("@Status", status)
                    End If
                    If Not String.IsNullOrWhiteSpace(learnershipCode) Then
                        cmd.Parameters.AddWithValue("@LearnershipCode", learnershipCode)
                    End If
                    If enrollmentYear > 0 Then
                        cmd.Parameters.AddWithValue("@EnrollmentYear", enrollmentYear)
                    End If
                    If Not String.IsNullOrWhiteSpace(startDate) Then
                        cmd.Parameters.AddWithValue("@StartDate", startDate)
                    End If
                    If Not String.IsNullOrWhiteSpace(endDate) Then
                        cmd.Parameters.AddWithValue("@EndDate", endDate)
                    End If

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        While reader.Read()
                            enrollmentList.Add(New With {
                                .learnerId = reader.GetInt32(0),
                                .idNumber = If(reader.IsDBNull(1), "", MaskIdNumber(reader.GetString(1))),
                                .firstName = If(reader.IsDBNull(2), "", reader.GetString(2)),
                                .surname = If(reader.IsDBNull(3), "", reader.GetString(3)),
                                .dateOfBirth = If(reader.IsDBNull(4), Nothing, CType(reader.GetDateTime(4), DateTime?)),
                                .gender = If(reader.IsDBNull(5), "", reader.GetString(5)),
                                .learnershipCode = If(reader.IsDBNull(6), "", reader.GetString(6)),
                                .learnershipName = If(reader.IsDBNull(7), "", reader.GetString(7)),
                                .enrollmentYear = If(reader.IsDBNull(8), Nothing, CType(reader.GetInt32(8), Integer?)),
                                .province = If(reader.IsDBNull(9), "", reader.GetString(9)),
                                .registrationDate = If(reader.IsDBNull(10), DateTime.MinValue, reader.GetDateTime(10)),
                                .status = If(reader.IsDBNull(11), "", reader.GetString(11)),
                                .enrollmentId = If(reader.IsDBNull(12), "", reader.GetString(12)),
                                .createdBy = If(reader.IsDBNull(13), "", reader.GetString(13))
                            })
                        End While
                    End Using
                End Using
            End Using

            Return New With {
                .enrollments = enrollmentList,
                .page = page,
                .pageSize = pageSize,
                .totalCount = totalCount,
                .totalPages = CInt(Math.Ceiling(totalCount / CDbl(pageSize)))
            }
        End Function

        ''' <summary>
        ''' Mask ID number for privacy (POPIA compliance)
        ''' </summary>
        Private Function MaskIdNumber(idNumber As String) As String
            If String.IsNullOrEmpty(idNumber) OrElse idNumber.Length < 13 Then
                Return "******"
            End If
            Return idNumber.Substring(0, 4) & "****" & idNumber.Substring(idNumber.Length - 3)
        End Function

    End Class

End Namespace
