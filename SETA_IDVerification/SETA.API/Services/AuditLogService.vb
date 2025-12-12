Imports System.Data.SqlClient
Imports System.Configuration
Imports System.Threading.Tasks

Namespace Services

    ''' <summary>
    ''' Service for logging audit trail entries (POPIA compliance)
    ''' All PII access and actions are logged
    ''' </summary>
    Public Class AuditLogService

        Private Shared ReadOnly ConnectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

        ''' <summary>
        ''' Log an audit entry asynchronously (fire and forget)
        ''' </summary>
        Public Shared Sub LogAsync(setaId As Integer, action As String, tableAffected As String,
                                   Optional recordId As Integer? = Nothing,
                                   Optional idNumber As String = Nothing,
                                   Optional details As String = Nothing,
                                   Optional userId As String = Nothing,
                                   Optional ipAddress As String = Nothing,
                                   Optional success As Boolean = True)
            ' Fire and forget - don't block the main request
            Task.Run(Sub()
                         Try
                             Log(setaId, action, tableAffected, recordId, idNumber, details, userId, ipAddress, success)
                         Catch ex As Exception
                             System.Diagnostics.Debug.WriteLine("Audit log failed: " & ex.Message)
                         End Try
                     End Sub)
        End Sub

        ''' <summary>
        ''' Log an audit entry synchronously
        ''' </summary>
        Public Shared Sub Log(setaId As Integer, action As String, tableAffected As String,
                              Optional recordId As Integer? = Nothing,
                              Optional idNumber As String = Nothing,
                              Optional details As String = Nothing,
                              Optional userId As String = Nothing,
                              Optional ipAddress As String = Nothing,
                              Optional success As Boolean = True)
            Try
                Using conn As New SqlConnection(ConnectionString)
                    conn.Open()

                    Dim sql As String = "
                        INSERT INTO AuditTrail
                            (SETAID, Action, TableAffected, RecordID, IDNumber, Details, UserID, IPAddress, ActionDate, Success)
                        VALUES
                            (@SETAID, @Action, @TableAffected, @RecordID, @IDNumber, @Details, @UserID, @IPAddress, GETDATE(), @Success)"

                    Using cmd As New SqlCommand(sql, conn)
                        cmd.Parameters.AddWithValue("@SETAID", setaId)
                        cmd.Parameters.AddWithValue("@Action", action)
                        cmd.Parameters.AddWithValue("@TableAffected", If(tableAffected, DBNull.Value))
                        cmd.Parameters.AddWithValue("@RecordID", If(recordId.HasValue, recordId.Value, DBNull.Value))
                        cmd.Parameters.AddWithValue("@IDNumber", If(String.IsNullOrEmpty(idNumber), DBNull.Value, MaskIdNumber(idNumber)))
                        cmd.Parameters.AddWithValue("@Details", If(String.IsNullOrEmpty(details), DBNull.Value, details))
                        cmd.Parameters.AddWithValue("@UserID", If(String.IsNullOrEmpty(userId), DBNull.Value, userId))
                        cmd.Parameters.AddWithValue("@IPAddress", If(String.IsNullOrEmpty(ipAddress), DBNull.Value, ipAddress))
                        cmd.Parameters.AddWithValue("@Success", success)
                        cmd.ExecuteNonQuery()
                    End Using
                End Using
            Catch ex As Exception
                System.Diagnostics.Debug.WriteLine("Audit log error: " & ex.Message)
            End Try
        End Sub

        ''' <summary>
        ''' Mask ID number for storage (POPIA compliance)
        ''' </summary>
        Private Shared Function MaskIdNumber(idNumber As String) As String
            If String.IsNullOrEmpty(idNumber) OrElse idNumber.Length < 13 Then
                Return "****"
            End If
            Return idNumber.Substring(0, 4) & "*****" & idNumber.Substring(9, 4)
        End Function

        ' Predefined action types for consistency
        Public Const ACTION_VERIFY As String = "Verify"
        Public Const ACTION_REGISTER As String = "Register"
        Public Const ACTION_ENROLL As String = "Enroll"
        Public Const ACTION_SEARCH As String = "Search"
        Public Const ACTION_VIEW As String = "View"
        Public Const ACTION_UPDATE As String = "Update"
        Public Const ACTION_DELETE As String = "Delete"
        Public Const ACTION_LOGIN As String = "Login"
        Public Const ACTION_LOGOUT As String = "Logout"
        Public Const ACTION_EXPORT As String = "Export"
        Public Const ACTION_API_CALL As String = "ApiCall"

    End Class

End Namespace
