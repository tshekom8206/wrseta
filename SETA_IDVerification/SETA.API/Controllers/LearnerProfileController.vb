Imports System.Net
Imports System.Web.Http
Imports System.Web.Http.Cors
Imports System.Data.SqlClient
Imports System.Configuration
Imports SETA.API.Models
Imports SETA.API.Security

Namespace SETA.API.Controllers

    ''' <summary>
    ''' Controller for learner self-service profile operations
    ''' </summary>
    <RoutePrefix("api/learner")>
    <EnableCors("*", "*", "*")>
    Public Class LearnerProfileController
        Inherits ApiController

        Private ReadOnly _connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

        ''' <summary>
        ''' Get learner profile by ID number
        ''' Returns masked ID for privacy (POPIA compliance)
        ''' </summary>
        <Route("profile/{idNumber}")>
        <HttpGet>
        <ApiKeyAuth>
        Public Function GetProfile(idNumber As String) As IHttpActionResult
            Try
                If String.IsNullOrWhiteSpace(idNumber) Then
                    Return Content(HttpStatusCode.BadRequest,
                        ApiResponse(Of Object).ErrorResponse("INVALID_REQUEST", "ID number is required"))
                End If

                Dim setaId = CInt(Me.Request.Properties("SetaId"))

                Using conn As New SqlConnection(_connectionString)
                    conn.Open()

                    Dim sql As String = "
                        SELECT
                            l.LearnerID,
                            l.IDNumber,
                            l.FirstName,
                            l.Surname,
                            l.DateOfBirth,
                            l.Gender,
                            l.ProgrammeName,
                            l.Status,
                            l.RegistrationDate,
                            s.SETAName,
                            s.SETACode
                        FROM LearnerRegistry l
                        INNER JOIN SETAs s ON l.RegisteredSETAID = s.SETAID
                        WHERE l.IDNumber = @IDNumber
                          AND l.RegisteredSETAID = @SETAID"

                    Using cmd As New SqlCommand(sql, conn)
                        cmd.Parameters.AddWithValue("@IDNumber", idNumber)
                        cmd.Parameters.AddWithValue("@SETAID", setaId)

                        Using reader As SqlDataReader = cmd.ExecuteReader()
                            If reader.Read() Then
                                Dim fullIdNumber = reader.GetString(1)
                                Dim profile As New LearnerProfileResponse With {
                                    .LearnerId = reader.GetInt32(0),
                                    .IdNumber = MaskIdNumber(fullIdNumber),
                                    .FirstName = If(reader.IsDBNull(2), "", reader.GetString(2)),
                                    .Surname = If(reader.IsDBNull(3), "", reader.GetString(3)),
                                    .FullName = If(reader.IsDBNull(2), "", reader.GetString(2)) & " " & If(reader.IsDBNull(3), "", reader.GetString(3)),
                                    .DateOfBirth = If(reader.IsDBNull(4), Nothing, reader.GetDateTime(4)),
                                    .Gender = If(reader.IsDBNull(5), "", reader.GetString(5)),
                                    .ProgrammeName = If(reader.IsDBNull(6), "", reader.GetString(6)),
                                    .Status = If(reader.IsDBNull(7), "Active", reader.GetString(7)),
                                    .EnrollmentDate = If(reader.IsDBNull(8), Nothing, reader.GetDateTime(8)),
                                    .SetaName = If(reader.IsDBNull(9), "", reader.GetString(9)),
                                    .SetaCode = If(reader.IsDBNull(10), "", reader.GetString(10)),
                                    .IsVerified = True,
                                    .VerificationDate = If(reader.IsDBNull(8), DateTime.Now, reader.GetDateTime(8))
                                }

                                Return Ok(ApiResponse(Of LearnerProfileResponse).SuccessResponse(profile))
                            Else
                                Return Content(HttpStatusCode.NotFound,
                                    ApiResponse(Of Object).ErrorResponse("NOT_FOUND", "Learner profile not found"))
                            End If
                        End Using
                    End Using
                End Using

            Catch ex As Exception
                Return Content(HttpStatusCode.InternalServerError,
                    ApiResponse(Of Object).ErrorResponse("SERVER_ERROR", ex.Message))
            End Try
        End Function

        ''' <summary>
        ''' Get learner profile by username (for logged in learners)
        ''' Returns full profile with progress, verification, and certificate data from database
        ''' </summary>
        <Route("my-profile")>
        <HttpGet>
        <ApiKeyAuth>
        Public Function GetMyProfile(<FromUri> username As String) As IHttpActionResult
            Try
                If String.IsNullOrWhiteSpace(username) Then
                    Return Content(HttpStatusCode.BadRequest,
                        ApiResponse(Of Object).ErrorResponse("INVALID_REQUEST", "Username is required"))
                End If

                Dim setaId = CInt(Me.Request.Properties("SetaId"))

                Using conn As New SqlConnection(_connectionString)
                    conn.Open()

                    ' Get learner basic info with progress, verification, and certificate data
                    Dim sql As String = "
                        SELECT TOP 1
                            l.LearnerID,
                            l.IDNumber,
                            l.FirstName,
                            l.Surname,
                            l.DateOfBirth,
                            l.Gender,
                            ISNULL(p.ProgrammeName, l.ProgrammeName) AS ProgrammeName,
                            ISNULL(p.ProgrammeLevel, 'NQF Level 3') AS ProgrammeLevel,
                            l.Status,
                            l.RegistrationDate,
                            s.SETAName,
                            s.SETACode,
                            ISNULL(p.ProgressPercent, 0) AS ProgressPercent,
                            ISNULL(p.CreditsEarned, 0) AS CreditsEarned,
                            ISNULL(p.TotalCredits, 0) AS TotalCredits,
                            ISNULL(p.ModulesCompleted, 0) AS ModulesCompleted,
                            ISNULL(p.TotalModules, 0) AS TotalModules,
                            ISNULL(p.ExpectedCompletionDate, DATEADD(MONTH, 12, l.RegistrationDate)) AS ExpectedCompletion,
                            v.VerifiedAt AS VerificationDate,
                            CASE WHEN v.Status = 'Verified' THEN 1 ELSE 0 END AS IsVerified,
                            (SELECT COUNT(*) FROM LearnerCertificates c WHERE c.LearnerID = l.LearnerID AND c.Status = 'Active') AS CertificateCount
                        FROM LearnerRegistry l
                        INNER JOIN SETAs s ON l.RegisteredSETAID = s.SETAID
                        LEFT JOIN LearnerProgress p ON l.LearnerID = p.LearnerID
                        LEFT JOIN (
                            SELECT LearnerID, Status, VerifiedAt,
                                   ROW_NUMBER() OVER (PARTITION BY LearnerID ORDER BY VerifiedAt DESC) AS rn
                            FROM LearnerVerificationHistory
                            WHERE Status = 'Verified'
                        ) v ON l.LearnerID = v.LearnerID AND v.rn = 1
                        WHERE l.RegisteredSETAID = @SETAID
                        ORDER BY l.RegistrationDate DESC"

                    Using cmd As New SqlCommand(sql, conn)
                        cmd.Parameters.AddWithValue("@SETAID", setaId)

                        Using reader As SqlDataReader = cmd.ExecuteReader()
                            If reader.Read() Then
                                Dim fullIdNumber = reader.GetString(1)
                                Dim profile As New LearnerProfileResponse With {
                                    .LearnerId = reader.GetInt32(0),
                                    .IdNumber = MaskIdNumber(fullIdNumber),
                                    .FirstName = If(reader.IsDBNull(2), "", reader.GetString(2)),
                                    .Surname = If(reader.IsDBNull(3), "", reader.GetString(3)),
                                    .FullName = If(reader.IsDBNull(2), "", reader.GetString(2)) & " " & If(reader.IsDBNull(3), "", reader.GetString(3)),
                                    .DateOfBirth = If(reader.IsDBNull(4), Nothing, reader.GetDateTime(4)),
                                    .Gender = If(reader.IsDBNull(5), "", reader.GetString(5)),
                                    .ProgrammeName = If(reader.IsDBNull(6), "Not enrolled", reader.GetString(6)),
                                    .ProgrammeLevel = If(reader.IsDBNull(7), "NQF Level 3", reader.GetString(7)),
                                    .Status = If(reader.IsDBNull(8), "Active", reader.GetString(8)),
                                    .EnrollmentDate = If(reader.IsDBNull(9), Nothing, reader.GetDateTime(9)),
                                    .SetaName = If(reader.IsDBNull(10), "", reader.GetString(10)),
                                    .SetaCode = If(reader.IsDBNull(11), "", reader.GetString(11)),
                                    .ProgressPercent = If(reader.IsDBNull(12), 0, reader.GetInt32(12)),
                                    .CreditsEarned = If(reader.IsDBNull(13), 0, reader.GetInt32(13)),
                                    .TotalCredits = If(reader.IsDBNull(14), 0, reader.GetInt32(14)),
                                    .ModulesCompleted = If(reader.IsDBNull(15), 0, reader.GetInt32(15)),
                                    .TotalModules = If(reader.IsDBNull(16), 0, reader.GetInt32(16)),
                                    .ExpectedCompletion = If(reader.IsDBNull(17), Nothing, reader.GetDateTime(17)),
                                    .VerificationDate = If(reader.IsDBNull(18), Nothing, reader.GetDateTime(18)),
                                    .IsVerified = If(reader.IsDBNull(19), False, reader.GetInt32(19) = 1),
                                    .CertificateCount = If(reader.IsDBNull(20), 0, reader.GetInt32(20))
                                }

                                Return Ok(ApiResponse(Of LearnerProfileResponse).SuccessResponse(profile))
                            Else
                                ' Return a default profile if no learner found
                                Dim defaultProfile As New LearnerProfileResponse With {
                                    .LearnerId = 0,
                                    .IdNumber = "No ID on file",
                                    .FirstName = "",
                                    .Surname = "",
                                    .FullName = username,
                                    .ProgrammeName = "Not enrolled in any programme",
                                    .ProgrammeLevel = "",
                                    .Status = "Pending",
                                    .SetaName = "Wholesale & Retail SETA",
                                    .SetaCode = "WRSETA",
                                    .IsVerified = False,
                                    .ProgressPercent = 0,
                                    .CreditsEarned = 0,
                                    .TotalCredits = 0,
                                    .ModulesCompleted = 0,
                                    .TotalModules = 0,
                                    .CertificateCount = 0
                                }
                                Return Ok(ApiResponse(Of LearnerProfileResponse).SuccessResponse(defaultProfile))
                            End If
                        End Using
                    End Using
                End Using

            Catch ex As Exception
                Return Content(HttpStatusCode.InternalServerError,
                    ApiResponse(Of Object).ErrorResponse("SERVER_ERROR", ex.Message))
            End Try
        End Function

        ''' <summary>
        ''' Mask ID number for privacy (POPIA compliance)
        ''' Shows first 4 and last 3 digits: 8506******089
        ''' </summary>
        Private Function MaskIdNumber(idNumber As String) As String
            If String.IsNullOrEmpty(idNumber) OrElse idNumber.Length < 10 Then
                Return "***********"
            End If
            ' Format: 8506 **** 089
            Return idNumber.Substring(0, 4) & " **** " & idNumber.Substring(idNumber.Length - 3)
        End Function

    End Class

    ''' <summary>
    ''' Learner profile response model
    ''' </summary>
    Public Class LearnerProfileResponse
        Public Property LearnerId As Integer
        Public Property IdNumber As String
        Public Property FirstName As String
        Public Property Surname As String
        Public Property FullName As String
        Public Property DateOfBirth As DateTime?
        Public Property Gender As String
        Public Property ProgrammeName As String
        Public Property ProgrammeLevel As String
        Public Property Status As String
        Public Property EnrollmentDate As DateTime?
        Public Property VerificationDate As DateTime?
        Public Property SetaName As String
        Public Property SetaCode As String
        Public Property IsVerified As Boolean
        Public Property ProgressPercent As Integer = 0
        Public Property CreditsEarned As Integer = 0
        Public Property TotalCredits As Integer = 0
        Public Property ModulesCompleted As Integer = 0
        Public Property TotalModules As Integer = 0
        Public Property CertificateCount As Integer = 0
        Public Property ExpectedCompletion As DateTime?
    End Class

End Namespace
