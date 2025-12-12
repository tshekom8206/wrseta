' =============================================
' Multi-SETA ID Verification System
' Data Access: Database Helper
' Purpose: Centralized database operations with parameterized queries
' =============================================

Imports System.Data.SqlClient
Imports System.Configuration
Imports SETA.Core.Models

Namespace Data

    ''' <summary>
    ''' Provides database access methods for the Multi-SETA system
    ''' All queries use parameterized SQL for security (SQL injection prevention)
    ''' </summary>
    Public Class DatabaseHelper

        Private ReadOnly _connectionString As String

        ''' <summary>
        ''' Initializes database helper with connection string from config
        ''' </summary>
        Public Sub New()
            _connectionString = ConfigurationManager.ConnectionStrings("SETAConnection")?.ConnectionString
            If String.IsNullOrEmpty(_connectionString) Then
                Throw New ConfigurationErrorsException("Connection string 'SETAConnection' not found in App.config")
            End If
        End Sub

        ''' <summary>
        ''' Initializes database helper with custom connection string
        ''' </summary>
        Public Sub New(connectionString As String)
            _connectionString = connectionString
        End Sub

#Region "Connection Management"

        ''' <summary>
        ''' Creates and returns a new SQL connection
        ''' </summary>
        Public Function GetConnection() As SqlConnection
            Return New SqlConnection(_connectionString)
        End Function

        ''' <summary>
        ''' Tests database connectivity
        ''' </summary>
        Public Function TestConnection() As Boolean
            Try
                Using conn As SqlConnection = GetConnection()
                    conn.Open()
                    Return True
                End Using
            Catch ex As Exception
                Return False
            End Try
        End Function

#End Region

#Region "SETA Operations"

        ''' <summary>
        ''' Gets all active SETAs
        ''' </summary>
        Public Function GetAllSETAs() As List(Of SetaInfo)
            Dim setas As New List(Of SetaInfo)()

            Using conn As SqlConnection = GetConnection()
                conn.Open()
                Using cmd As New SqlCommand("SELECT SETAID, SETACode, SETAName, Sector, IsActive FROM SETAs WHERE IsActive = 1 ORDER BY SETACode", conn)
                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        While reader.Read()
                            setas.Add(New SetaInfo() With {
                                .SETAID = reader.GetInt32(0),
                                .SETACode = reader.GetString(1),
                                .SETAName = reader.GetString(2),
                                .Sector = If(reader.IsDBNull(3), "", reader.GetString(3)),
                                .IsActive = reader.GetBoolean(4)
                            })
                        End While
                    End Using
                End Using
            End Using

            Return setas
        End Function

        ''' <summary>
        ''' Gets a SETA by its code
        ''' </summary>
        Public Function GetSETAByCode(setaCode As String) As SetaInfo
            Using conn As SqlConnection = GetConnection()
                conn.Open()
                Using cmd As New SqlCommand("SELECT SETAID, SETACode, SETAName, Sector, IsActive FROM SETAs WHERE SETACode = @SETACode", conn)
                    cmd.Parameters.AddWithValue("@SETACode", setaCode)
                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        If reader.Read() Then
                            Return New SetaInfo() With {
                                .SETAID = reader.GetInt32(0),
                                .SETACode = reader.GetString(1),
                                .SETAName = reader.GetString(2),
                                .Sector = If(reader.IsDBNull(3), "", reader.GetString(3)),
                                .IsActive = reader.GetBoolean(4)
                            }
                        End If
                    End Using
                End Using
            End Using
            Return Nothing
        End Function

#End Region

#Region "User Authentication"

        ''' <summary>
        ''' Authenticates a user and returns their details
        ''' </summary>
        Public Function AuthenticateUser(username As String, passwordHash As String, setaId As Integer) As User
            Using conn As SqlConnection = GetConnection()
                conn.Open()
                Using cmd As New SqlCommand(
                    "SELECT u.UserID, u.Username, u.FirstName, u.Surname, u.Email, u.SETAID, u.Role, u.IsActive, u.LastLogin, s.SETACode, s.SETAName " &
                    "FROM Users u " &
                    "INNER JOIN SETAs s ON u.SETAID = s.SETAID " &
                    "WHERE u.Username = @Username AND u.PasswordHash = @PasswordHash AND u.SETAID = @SETAID AND u.IsActive = 1", conn)

                    cmd.Parameters.AddWithValue("@Username", username)
                    cmd.Parameters.AddWithValue("@PasswordHash", passwordHash)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        If reader.Read() Then
                            Return New User() With {
                                .UserID = reader.GetInt32(0),
                                .Username = reader.GetString(1),
                                .FirstName = If(reader.IsDBNull(2), "", reader.GetString(2)),
                                .Surname = If(reader.IsDBNull(3), "", reader.GetString(3)),
                                .Email = If(reader.IsDBNull(4), "", reader.GetString(4)),
                                .SETAID = reader.GetInt32(5),
                                .Role = If(reader.IsDBNull(6), "Clerk", reader.GetString(6)),
                                .IsActive = reader.GetBoolean(7),
                                .LastLogin = If(reader.IsDBNull(8), Nothing, reader.GetDateTime(8)),
                                .SETACode = reader.GetString(9),
                                .SETAName = reader.GetString(10)
                            }
                        End If
                    End Using
                End Using
            End Using
            Return Nothing
        End Function

        ''' <summary>
        ''' Updates the last login timestamp for a user
        ''' </summary>
        Public Sub UpdateLastLogin(userId As Integer)
            Using conn As SqlConnection = GetConnection()
                conn.Open()
                Using cmd As New SqlCommand("UPDATE Users SET LastLogin = GETDATE() WHERE UserID = @UserID", conn)
                    cmd.Parameters.AddWithValue("@UserID", userId)
                    cmd.ExecuteNonQuery()
                End Using
            End Using
        End Sub

#End Region

#Region "Learner Operations"

        ''' <summary>
        ''' Checks if a learner exists at the specified SETA
        ''' </summary>
        Public Function CheckLocalDuplicate(idNumber As String, setaId As Integer) As Learner
            Using conn As SqlConnection = GetConnection()
                conn.Open()
                Using cmd As New SqlCommand(
                    "SELECT l.LearnerID, l.IDNumber, l.FirstName, l.Surname, l.DateOfBirth, l.Gender, " &
                    "l.RegisteredSETAID, l.ProgrammeName, l.RegistrationDate, l.Status, s.SETACode, s.SETAName " &
                    "FROM LearnerRegistry l " &
                    "INNER JOIN SETAs s ON l.RegisteredSETAID = s.SETAID " &
                    "WHERE l.IDNumber = @IDNumber AND l.RegisteredSETAID = @SETAID AND l.Status = 'Active'", conn)

                    cmd.Parameters.AddWithValue("@IDNumber", idNumber)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        If reader.Read() Then
                            Return CreateLearnerFromReader(reader)
                        End If
                    End Using
                End Using
            End Using
            Return Nothing
        End Function

        ''' <summary>
        ''' Checks if a learner exists at ANY OTHER SETA (cross-SETA duplicate detection)
        ''' </summary>
        Public Function CheckCrossSETADuplicate(idNumber As String, excludeSetaId As Integer) As Learner
            Using conn As SqlConnection = GetConnection()
                conn.Open()
                Using cmd As New SqlCommand(
                    "SELECT l.LearnerID, l.IDNumber, l.FirstName, l.Surname, l.DateOfBirth, l.Gender, " &
                    "l.RegisteredSETAID, l.ProgrammeName, l.RegistrationDate, l.Status, s.SETACode, s.SETAName " &
                    "FROM LearnerRegistry l " &
                    "INNER JOIN SETAs s ON l.RegisteredSETAID = s.SETAID " &
                    "WHERE l.IDNumber = @IDNumber AND l.RegisteredSETAID != @SETAID AND l.Status = 'Active'", conn)

                    cmd.Parameters.AddWithValue("@IDNumber", idNumber)
                    cmd.Parameters.AddWithValue("@SETAID", excludeSetaId)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        If reader.Read() Then
                            Return CreateLearnerFromReader(reader)
                        End If
                    End Using
                End Using
            End Using
            Return Nothing
        End Function

        ''' <summary>
        ''' Registers a new learner
        ''' </summary>
        Public Function RegisterLearner(learner As Learner) As Integer
            Using conn As SqlConnection = GetConnection()
                conn.Open()
                Using cmd As New SqlCommand(
                    "INSERT INTO LearnerRegistry (IDNumber, IDNumberHash, FirstName, Surname, DateOfBirth, Gender, " &
                    "RegisteredSETAID, ProgrammeName, Status, CreatedBy) " &
                    "VALUES (@IDNumber, @IDNumberHash, @FirstName, @Surname, @DateOfBirth, @Gender, " &
                    "@RegisteredSETAID, @ProgrammeName, 'Active', @CreatedBy); SELECT SCOPE_IDENTITY();", conn)

                    cmd.Parameters.AddWithValue("@IDNumber", learner.IDNumber)
                    cmd.Parameters.AddWithValue("@IDNumberHash", learner.IDNumberHash)
                    cmd.Parameters.AddWithValue("@FirstName", learner.FirstName)
                    cmd.Parameters.AddWithValue("@Surname", learner.Surname)
                    cmd.Parameters.AddWithValue("@DateOfBirth", learner.DateOfBirth)
                    cmd.Parameters.AddWithValue("@Gender", learner.Gender)
                    cmd.Parameters.AddWithValue("@RegisteredSETAID", learner.RegisteredSETAID)
                    cmd.Parameters.AddWithValue("@ProgrammeName", If(learner.ProgrammeName, ""))
                    cmd.Parameters.AddWithValue("@CreatedBy", If(learner.CreatedBy, "system"))

                    Return CInt(cmd.ExecuteScalar())
                End Using
            End Using
        End Function

        ''' <summary>
        ''' Gets all learners for a specific SETA
        ''' </summary>
        Public Function GetLearnersBySETA(setaId As Integer) As List(Of Learner)
            Dim learners As New List(Of Learner)()

            Using conn As SqlConnection = GetConnection()
                conn.Open()
                Using cmd As New SqlCommand(
                    "SELECT l.LearnerID, l.IDNumber, l.FirstName, l.Surname, l.DateOfBirth, l.Gender, " &
                    "l.RegisteredSETAID, l.ProgrammeName, l.RegistrationDate, l.Status, s.SETACode, s.SETAName " &
                    "FROM LearnerRegistry l " &
                    "INNER JOIN SETAs s ON l.RegisteredSETAID = s.SETAID " &
                    "WHERE l.RegisteredSETAID = @SETAID ORDER BY l.RegistrationDate DESC", conn)

                    cmd.Parameters.AddWithValue("@SETAID", setaId)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        While reader.Read()
                            learners.Add(CreateLearnerFromReader(reader))
                        End While
                    End Using
                End Using
            End Using

            Return learners
        End Function

        Private Function CreateLearnerFromReader(reader As SqlDataReader) As Learner
            Return New Learner() With {
                .LearnerID = reader.GetInt32(0),
                .IDNumber = reader.GetString(1),
                .FirstName = If(reader.IsDBNull(2), "", reader.GetString(2)),
                .Surname = If(reader.IsDBNull(3), "", reader.GetString(3)),
                .DateOfBirth = If(reader.IsDBNull(4), Date.MinValue, reader.GetDateTime(4)),
                .Gender = If(reader.IsDBNull(5), "", reader.GetString(5)),
                .RegisteredSETAID = reader.GetInt32(6),
                .ProgrammeName = If(reader.IsDBNull(7), "", reader.GetString(7)),
                .RegistrationDate = If(reader.IsDBNull(8), DateTime.Now, reader.GetDateTime(8)),
                .Status = If(reader.IsDBNull(9), "Active", reader.GetString(9)),
                .SETACode = reader.GetString(10),
                .SETAName = reader.GetString(11)
            }
        End Function

#End Region

#Region "Verification Log"

        ''' <summary>
        ''' Logs a verification attempt
        ''' </summary>
        Public Sub LogVerification(setaId As Integer, idNumber As String, firstName As String, surname As String,
                                   status As String, statusReason As String, formatValid As Boolean, luhnValid As Boolean,
                                   dhaVerified As Boolean, duplicateFound As Boolean, conflictingSETAID As Integer?,
                                   verifiedBy As String)

            Using conn As SqlConnection = GetConnection()
                conn.Open()
                Using cmd As New SqlCommand(
                    "INSERT INTO VerificationLog (RequestingSETAID, IDNumber, FirstName, Surname, Status, StatusReason, " &
                    "FormatValid, LuhnValid, DHAVerified, DuplicateFound, ConflictingSETAID, VerifiedBy) " &
                    "VALUES (@SETAID, @IDNumber, @FirstName, @Surname, @Status, @StatusReason, " &
                    "@FormatValid, @LuhnValid, @DHAVerified, @DuplicateFound, @ConflictingSETAID, @VerifiedBy)", conn)

                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    cmd.Parameters.AddWithValue("@IDNumber", idNumber)
                    cmd.Parameters.AddWithValue("@FirstName", If(firstName, ""))
                    cmd.Parameters.AddWithValue("@Surname", If(surname, ""))
                    cmd.Parameters.AddWithValue("@Status", status)
                    cmd.Parameters.AddWithValue("@StatusReason", If(statusReason, ""))
                    cmd.Parameters.AddWithValue("@FormatValid", formatValid)
                    cmd.Parameters.AddWithValue("@LuhnValid", luhnValid)
                    cmd.Parameters.AddWithValue("@DHAVerified", dhaVerified)
                    cmd.Parameters.AddWithValue("@DuplicateFound", duplicateFound)
                    cmd.Parameters.AddWithValue("@ConflictingSETAID", If(conflictingSETAID, DBNull.Value))
                    cmd.Parameters.AddWithValue("@VerifiedBy", If(verifiedBy, "system"))

                    cmd.ExecuteNonQuery()
                End Using
            End Using
        End Sub

        ''' <summary>
        ''' Gets recent verifications for a SETA
        ''' </summary>
        Public Function GetRecentVerifications(setaId As Integer, count As Integer) As DataTable
            Dim dt As New DataTable()

            Using conn As SqlConnection = GetConnection()
                conn.Open()
                Using cmd As New SqlCommand(
                    $"SELECT TOP {count} v.IDNumber, v.FirstName, v.Surname, v.Status, v.StatusReason, " &
                    "v.VerifiedAt, s.SETACode AS ConflictSETA " &
                    "FROM VerificationLog v " &
                    "LEFT JOIN SETAs s ON v.ConflictingSETAID = s.SETAID " &
                    "WHERE v.RequestingSETAID = @SETAID ORDER BY v.VerifiedAt DESC", conn)

                    cmd.Parameters.AddWithValue("@SETAID", setaId)

                    Using adapter As New SqlDataAdapter(cmd)
                        adapter.Fill(dt)
                    End Using
                End Using
            End Using

            Return dt
        End Function

#End Region

#Region "Duplicate Attempts"

        ''' <summary>
        ''' Logs a blocked duplicate registration attempt
        ''' </summary>
        Public Sub LogDuplicateAttempt(idNumber As String, attemptedName As String, attemptingSETAID As Integer,
                                       existingSETAID As Integer, existingLearnerID As Integer?)

            Using conn As SqlConnection = GetConnection()
                conn.Open()
                Using cmd As New SqlCommand(
                    "INSERT INTO DuplicateAttempts (IDNumber, AttemptedName, AttemptingSETAID, ExistingSETAID, ExistingLearnerID, Blocked) " &
                    "VALUES (@IDNumber, @AttemptedName, @AttemptingSETAID, @ExistingSETAID, @ExistingLearnerID, 1)", conn)

                    cmd.Parameters.AddWithValue("@IDNumber", idNumber)
                    cmd.Parameters.AddWithValue("@AttemptedName", If(attemptedName, ""))
                    cmd.Parameters.AddWithValue("@AttemptingSETAID", attemptingSETAID)
                    cmd.Parameters.AddWithValue("@ExistingSETAID", existingSETAID)
                    cmd.Parameters.AddWithValue("@ExistingLearnerID", If(existingLearnerID, DBNull.Value))

                    cmd.ExecuteNonQuery()
                End Using
            End Using
        End Sub

        ''' <summary>
        ''' Gets duplicate attempts for a SETA
        ''' </summary>
        Public Function GetDuplicateAttempts(setaId As Integer) As DataTable
            Dim dt As New DataTable()

            Using conn As SqlConnection = GetConnection()
                conn.Open()
                Using cmd As New SqlCommand(
                    "SELECT d.AttemptID, d.IDNumber, d.AttemptedName, d.AttemptDate, d.ResolutionStatus, " &
                    "s.SETACode AS ExistingSETACode, s.SETAName AS ExistingSETAName " &
                    "FROM DuplicateAttempts d " &
                    "INNER JOIN SETAs s ON d.ExistingSETAID = s.SETAID " &
                    "WHERE d.AttemptingSETAID = @SETAID ORDER BY d.AttemptDate DESC", conn)

                    cmd.Parameters.AddWithValue("@SETAID", setaId)

                    Using adapter As New SqlDataAdapter(cmd)
                        adapter.Fill(dt)
                    End Using
                End Using
            End Using

            Return dt
        End Function

#End Region

#Region "Dashboard Statistics"

        ''' <summary>
        ''' Gets dashboard statistics for a SETA
        ''' </summary>
        Public Function GetDashboardStats(setaId As Integer) As Dictionary(Of String, Integer)
            Dim stats As New Dictionary(Of String, Integer)()

            Using conn As SqlConnection = GetConnection()
                conn.Open()

                ' Total Learners
                Using cmd As New SqlCommand("SELECT COUNT(*) FROM LearnerRegistry WHERE RegisteredSETAID = @SETAID", conn)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    stats("TotalLearners") = CInt(cmd.ExecuteScalar())
                End Using

                ' GREEN verifications
                Using cmd As New SqlCommand("SELECT COUNT(*) FROM VerificationLog WHERE RequestingSETAID = @SETAID AND Status = 'GREEN'", conn)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    stats("VerifiedGreen") = CInt(cmd.ExecuteScalar())
                End Using

                ' YELLOW verifications
                Using cmd As New SqlCommand("SELECT COUNT(*) FROM VerificationLog WHERE RequestingSETAID = @SETAID AND Status = 'YELLOW'", conn)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    stats("VerifiedYellow") = CInt(cmd.ExecuteScalar())
                End Using

                ' RED verifications
                Using cmd As New SqlCommand("SELECT COUNT(*) FROM VerificationLog WHERE RequestingSETAID = @SETAID AND Status = 'RED'", conn)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    stats("VerifiedRed") = CInt(cmd.ExecuteScalar())
                End Using

                ' Blocked attempts
                Using cmd As New SqlCommand("SELECT COUNT(*) FROM DuplicateAttempts WHERE AttemptingSETAID = @SETAID AND Blocked = 1", conn)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    stats("BlockedAttempts") = CInt(cmd.ExecuteScalar())
                End Using
            End Using

            Return stats
        End Function

#End Region

#Region "Audit Trail"

        ''' <summary>
        ''' Logs an audit trail entry (POPIA compliance)
        ''' </summary>
        Public Sub LogAudit(setaId As Integer, action As String, tableAffected As String, recordId As Integer?,
                           idNumber As String, details As String, userId As String, ipAddress As String, success As Boolean)

            Using conn As SqlConnection = GetConnection()
                conn.Open()
                Using cmd As New SqlCommand(
                    "INSERT INTO AuditTrail (SETAID, Action, TableAffected, RecordID, IDNumber, Details, UserID, IPAddress, Success) " &
                    "VALUES (@SETAID, @Action, @TableAffected, @RecordID, @IDNumber, @Details, @UserID, @IPAddress, @Success)", conn)

                    cmd.Parameters.AddWithValue("@SETAID", setaId)
                    cmd.Parameters.AddWithValue("@Action", action)
                    cmd.Parameters.AddWithValue("@TableAffected", If(tableAffected, ""))
                    cmd.Parameters.AddWithValue("@RecordID", If(recordId, DBNull.Value))
                    cmd.Parameters.AddWithValue("@IDNumber", If(idNumber, ""))
                    cmd.Parameters.AddWithValue("@Details", If(details, ""))
                    cmd.Parameters.AddWithValue("@UserID", If(userId, "system"))
                    cmd.Parameters.AddWithValue("@IPAddress", If(ipAddress, ""))
                    cmd.Parameters.AddWithValue("@Success", success)

                    cmd.ExecuteNonQuery()
                End Using
            End Using
        End Sub

#End Region

    End Class

End Namespace
