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
                    SELECT LogID, Status, Message, VerifiedAt
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
                                .logId = reader.GetInt64(0),
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

    End Class

End Namespace
