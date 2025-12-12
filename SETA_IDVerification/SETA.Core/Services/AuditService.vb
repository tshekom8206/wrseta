' =============================================
' Multi-SETA ID Verification System
' Service: Audit Service
' Purpose: POPIA-compliant audit logging for all PII access
' =============================================

Imports SETA.Core.Data

Namespace Services

    ''' <summary>
    ''' Provides POPIA-compliant audit logging for all system actions
    ''' Logs every access to PII (Personal Identifiable Information)
    ''' </summary>
    Public Class AuditService

        Private ReadOnly _dbHelper As DatabaseHelper

        ''' <summary>
        ''' Initializes the audit service
        ''' </summary>
        Public Sub New()
            _dbHelper = New DatabaseHelper()
        End Sub

        ''' <summary>
        ''' Logs an action to the audit trail
        ''' </summary>
        ''' <param name="setaId">ID of the SETA performing the action</param>
        ''' <param name="action">Type of action (Verify/Register/Export/Login/View/Update)</param>
        ''' <param name="tableAffected">Database table affected</param>
        ''' <param name="recordId">ID of the affected record (if applicable)</param>
        ''' <param name="idNumber">ID number accessed (for POPIA compliance)</param>
        ''' <param name="details">Detailed description of the action</param>
        ''' <param name="userId">Username of the user performing the action</param>
        ''' <param name="ipAddress">IP address of the client</param>
        Public Sub LogAction(setaId As Integer, action As String, tableAffected As String,
                            recordId As Integer?, idNumber As String, details As String,
                            userId As String, ipAddress As String)
            Try
                _dbHelper.LogAudit(setaId, action, tableAffected, recordId, idNumber, details, userId, ipAddress, True)
            Catch ex As Exception
                ' Log to event log if database logging fails
                System.Diagnostics.Debug.WriteLine($"Audit logging failed: {ex.Message}")
            End Try
        End Sub

        ''' <summary>
        ''' Logs a failed action to the audit trail
        ''' </summary>
        Public Sub LogFailedAction(setaId As Integer, action As String, tableAffected As String,
                                   recordId As Integer?, idNumber As String, details As String,
                                   userId As String, ipAddress As String, errorMessage As String)
            Try
                _dbHelper.LogAudit(setaId, action, tableAffected, recordId, idNumber,
                                   $"FAILED: {details} - Error: {errorMessage}", userId, ipAddress, False)
            Catch ex As Exception
                System.Diagnostics.Debug.WriteLine($"Audit logging failed: {ex.Message}")
            End Try
        End Sub

        ''' <summary>
        ''' Logs a user login event
        ''' </summary>
        Public Sub LogLogin(setaId As Integer, userId As String, ipAddress As String, success As Boolean)
            Dim details As String = If(success, "User logged in successfully", "Login attempt failed")
            Try
                _dbHelper.LogAudit(setaId, "Login", "Users", Nothing, Nothing, details, userId, ipAddress, success)
            Catch ex As Exception
                System.Diagnostics.Debug.WriteLine($"Audit logging failed: {ex.Message}")
            End Try
        End Sub

        ''' <summary>
        ''' Logs a user logout event
        ''' </summary>
        Public Sub LogLogout(setaId As Integer, userId As String, ipAddress As String)
            Try
                _dbHelper.LogAudit(setaId, "Logout", "Users", Nothing, Nothing, "User logged out", userId, ipAddress, True)
            Catch ex As Exception
                System.Diagnostics.Debug.WriteLine($"Audit logging failed: {ex.Message}")
            End Try
        End Sub

        ''' <summary>
        ''' Logs a data export event (important for POPIA)
        ''' </summary>
        Public Sub LogDataExport(setaId As Integer, userId As String, exportType As String,
                                 recordCount As Integer, ipAddress As String)
            Dim details As String = $"Exported {recordCount} records via {exportType}"
            Try
                _dbHelper.LogAudit(setaId, "Export", Nothing, Nothing, Nothing, details, userId, ipAddress, True)
            Catch ex As Exception
                System.Diagnostics.Debug.WriteLine($"Audit logging failed: {ex.Message}")
            End Try
        End Sub

        ''' <summary>
        ''' Logs a PII view event (POPIA compliance)
        ''' </summary>
        Public Sub LogPIIAccess(setaId As Integer, userId As String, idNumber As String,
                               recordType As String, ipAddress As String)
            Dim details As String = $"Viewed {recordType} for ID: {SAIDValidator.MaskIDNumber(idNumber)}"
            Try
                _dbHelper.LogAudit(setaId, "View", recordType, Nothing, idNumber, details, userId, ipAddress, True)
            Catch ex As Exception
                System.Diagnostics.Debug.WriteLine($"Audit logging failed: {ex.Message}")
            End Try
        End Sub

    End Class

End Namespace
