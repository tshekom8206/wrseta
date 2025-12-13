' =============================================
' Multi-SETA ID Verification System
' Form: Main Dashboard
' Purpose: Central hub showing statistics and navigation
' =============================================

Imports System.Windows.Forms
Imports SETA.Core.Models
Imports SETA.Core.Services
Imports SETA.Core.Data
Imports SETA.Core

Public Class frmMain
    Inherits Form

    ' Current user and SETA context
    Private _currentUser As User
    Private _currentSETA As Models.SETA
    Private _verificationService As VerificationService
    Private _auditService As AuditService

    ' Controls - Header
    Private pnlHeader As Panel
    Private lblTitle As Label
    Private lblSETAName As Label
    Private lblUserName As Label
    Private WithEvents btnLogout As Button

    ' Controls - Navigation
    Private pnlNav As Panel
    Private WithEvents btnDashboard As Button
    Private WithEvents btnRegistration As Button
    Private WithEvents btnDuplicates As Button

    ' Controls - Stats
    Private pnlStats As Panel
    Private pnlTotalLearners As Panel
    Private pnlGreen As Panel
    Private pnlYellow As Panel
    Private pnlRed As Panel
    Private pnlBlocked As Panel
    Private lblTotalLearners As Label
    Private lblGreen As Label
    Private lblYellow As Label
    Private lblRed As Label
    Private lblBlocked As Label

    ' Controls - Recent Activity
    Private grpRecentActivity As GroupBox
    Private dgvRecentVerifications As DataGridView

    Public Sub New(user As User, seta As Models.SETA)
        _currentUser = user
        _currentSETA = seta
        _verificationService = New VerificationService(user)
        _auditService = New AuditService()

        InitializeComponent()
        SetupForm()
        LoadDashboard()
    End Sub

    Private Sub InitializeComponent()
        Me.SuspendLayout()

        ' Form properties
        Me.Text = $"Multi-SETA ID Verification System - {_currentSETA.SETACode}"
        Me.Size = New Drawing.Size(1000, 700)
        Me.StartPosition = FormStartPosition.CenterScreen
        Me.BackColor = Drawing.Color.FromArgb(240, 240, 245)

        CreateHeader()
        CreateNavigation()
        CreateStatsPanel()
        CreateRecentActivityPanel()

        Me.ResumeLayout(False)
    End Sub

    Private Sub CreateHeader()
        pnlHeader = New Panel() With {
            .Dock = DockStyle.Top,
            .Height = 60,
            .BackColor = Drawing.Color.FromArgb(0, 122, 204)
        }
        Me.Controls.Add(pnlHeader)

        lblTitle = New Label() With {
            .Text = "SETA ID Verification System",
            .Font = New Drawing.Font("Segoe UI", 16, Drawing.FontStyle.Bold),
            .ForeColor = Drawing.Color.White,
            .AutoSize = True,
            .Location = New Drawing.Point(15, 15)
        }
        pnlHeader.Controls.Add(lblTitle)

        lblSETAName = New Label() With {
            .Text = $"{_currentSETA.SETACode} - {_currentSETA.SETAName}",
            .Font = New Drawing.Font("Segoe UI", 10),
            .ForeColor = Drawing.Color.White,
            .AutoSize = True,
            .Location = New Drawing.Point(350, 20)
        }
        pnlHeader.Controls.Add(lblSETAName)

        lblUserName = New Label() With {
            .Text = $"Logged in: {_currentUser.FullName} ({_currentUser.Role})",
            .Font = New Drawing.Font("Segoe UI", 9),
            .ForeColor = Drawing.Color.White,
            .AutoSize = True,
            .Location = New Drawing.Point(650, 22)
        }
        pnlHeader.Controls.Add(lblUserName)

        btnLogout = New Button() With {
            .Text = "Logout",
            .Size = New Drawing.Size(80, 30),
            .Location = New Drawing.Point(890, 15),
            .FlatStyle = FlatStyle.Flat,
            .BackColor = Drawing.Color.FromArgb(200, 50, 50),
            .ForeColor = Drawing.Color.White,
            .Font = New Drawing.Font("Segoe UI", 9),
            .Cursor = Cursors.Hand
        }
        btnLogout.FlatAppearance.BorderSize = 0
        pnlHeader.Controls.Add(btnLogout)
    End Sub

    Private Sub CreateNavigation()
        pnlNav = New Panel() With {
            .Dock = DockStyle.Top,
            .Height = 50,
            .BackColor = Drawing.Color.FromArgb(45, 45, 48)
        }
        Me.Controls.Add(pnlNav)
        pnlNav.BringToFront()

        btnDashboard = CreateNavButton("Dashboard", 10)
        btnDashboard.BackColor = Drawing.Color.FromArgb(0, 122, 204) ' Active
        pnlNav.Controls.Add(btnDashboard)

        btnRegistration = CreateNavButton("Register Learner", 130)
        pnlNav.Controls.Add(btnRegistration)

        btnDuplicates = CreateNavButton("Duplicate Attempts", 270)
        pnlNav.Controls.Add(btnDuplicates)
    End Sub

    Private Function CreateNavButton(text As String, x As Integer) As Button
        Return New Button() With {
            .Text = text,
            .Size = New Drawing.Size(130, 35),
            .Location = New Drawing.Point(x, 8),
            .FlatStyle = FlatStyle.Flat,
            .BackColor = Drawing.Color.FromArgb(60, 60, 65),
            .ForeColor = Drawing.Color.White,
            .Font = New Drawing.Font("Segoe UI", 9),
            .Cursor = Cursors.Hand
        }
    End Function

    Private Sub CreateStatsPanel()
        pnlStats = New Panel() With {
            .Location = New Drawing.Point(15, 125),
            .Size = New Drawing.Size(960, 120),
            .BackColor = Drawing.Color.White
        }
        Me.Controls.Add(pnlStats)

        ' Total Learners
        pnlTotalLearners = CreateStatCard("Total Learners", "0", Drawing.Color.FromArgb(0, 122, 204), 10)
        lblTotalLearners = CType(pnlTotalLearners.Controls(1), Label)
        pnlStats.Controls.Add(pnlTotalLearners)

        ' GREEN
        pnlGreen = CreateStatCard("Verified (GREEN)", "0", Drawing.Color.FromArgb(0, 180, 0), 200)
        lblGreen = CType(pnlGreen.Controls(1), Label)
        pnlStats.Controls.Add(pnlGreen)

        ' YELLOW
        pnlYellow = CreateStatCard("Review (YELLOW)", "0", Drawing.Color.FromArgb(200, 180, 0), 390)
        lblYellow = CType(pnlYellow.Controls(1), Label)
        pnlStats.Controls.Add(pnlYellow)

        ' RED
        pnlRed = CreateStatCard("Invalid (RED)", "0", Drawing.Color.FromArgb(200, 50, 50), 580)
        lblRed = CType(pnlRed.Controls(1), Label)
        pnlStats.Controls.Add(pnlRed)

        ' Blocked
        pnlBlocked = CreateStatCard("Blocked Attempts", "0", Drawing.Color.FromArgb(128, 0, 128), 770)
        lblBlocked = CType(pnlBlocked.Controls(1), Label)
        pnlStats.Controls.Add(pnlBlocked)
    End Sub

    Private Function CreateStatCard(title As String, value As String, color As Drawing.Color, x As Integer) As Panel
        Dim pnl As New Panel() With {
            .Size = New Drawing.Size(170, 100),
            .Location = New Drawing.Point(x, 10),
            .BackColor = color
        }

        Dim lblTitle As New Label() With {
            .Text = title,
            .Font = New Drawing.Font("Segoe UI", 9),
            .ForeColor = Drawing.Color.White,
            .AutoSize = True,
            .Location = New Drawing.Point(10, 10)
        }
        pnl.Controls.Add(lblTitle)

        Dim lblValue As New Label() With {
            .Text = value,
            .Font = New Drawing.Font("Segoe UI", 24, Drawing.FontStyle.Bold),
            .ForeColor = Drawing.Color.White,
            .AutoSize = True,
            .Location = New Drawing.Point(10, 40)
        }
        pnl.Controls.Add(lblValue)

        Return pnl
    End Function

    Private Sub CreateRecentActivityPanel()
        grpRecentActivity = New GroupBox() With {
            .Text = "Recent Verifications (Masked for POPIA)",
            .Font = New Drawing.Font("Segoe UI", 10, Drawing.FontStyle.Bold),
            .Location = New Drawing.Point(15, 260),
            .Size = New Drawing.Size(960, 380),
            .BackColor = Drawing.Color.White
        }
        Me.Controls.Add(grpRecentActivity)

        dgvRecentVerifications = New DataGridView() With {
            .Location = New Drawing.Point(15, 25),
            .Size = New Drawing.Size(930, 340),
            .AllowUserToAddRows = False,
            .AllowUserToDeleteRows = False,
            .ReadOnly = True,
            .AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
            .SelectionMode = DataGridViewSelectionMode.FullRowSelect,
            .BackgroundColor = Drawing.Color.White,
            .BorderStyle = BorderStyle.None,
            .RowHeadersVisible = False,
            .Font = New Drawing.Font("Segoe UI", 9)
        }

        ' Style the grid
        dgvRecentVerifications.ColumnHeadersDefaultCellStyle.BackColor = Drawing.Color.FromArgb(45, 45, 48)
        dgvRecentVerifications.ColumnHeadersDefaultCellStyle.ForeColor = Drawing.Color.White
        dgvRecentVerifications.ColumnHeadersDefaultCellStyle.Font = New Drawing.Font("Segoe UI", 9, Drawing.FontStyle.Bold)
        dgvRecentVerifications.EnableHeadersVisualStyles = False

        grpRecentActivity.Controls.Add(dgvRecentVerifications)
    End Sub

    Private Sub SetupForm()
        ' Add resize handler
        AddHandler Me.Resize, AddressOf Form_Resize
    End Sub

    Private Sub LoadDashboard()
        Try
            ' Load statistics
            Dim stats As Dictionary(Of String, Integer) = _verificationService.GetDashboardStats()

            lblTotalLearners.Text = stats("TotalLearners").ToString("N0")
            lblGreen.Text = stats("VerifiedGreen").ToString("N0")
            lblYellow.Text = stats("VerifiedYellow").ToString("N0")
            lblRed.Text = stats("VerifiedRed").ToString("N0")
            lblBlocked.Text = stats("BlockedAttempts").ToString("N0")

            ' Load recent verifications
            Dim recentData As DataTable = _verificationService.GetRecentVerifications(50)

            ' Mask ID numbers for POPIA compliance
            For Each row As DataRow In recentData.Rows
                If row("IDNumber") IsNot DBNull.Value Then
                    row("IDNumber") = SAIDValidator.MaskIDNumber(row("IDNumber").ToString())
                End If
            Next

            dgvRecentVerifications.DataSource = recentData

            ' Color code status column
            AddHandler dgvRecentVerifications.CellFormatting, AddressOf FormatStatusColumn

        Catch ex As Exception
            MessageBox.Show($"Error loading dashboard: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error)
        End Try
    End Sub

    Private Sub FormatStatusColumn(sender As Object, e As DataGridViewCellFormattingEventArgs)
        If dgvRecentVerifications.Columns(e.ColumnIndex).Name = "Status" AndAlso e.Value IsNot Nothing Then
            Select Case e.Value.ToString()
                Case "GREEN"
                    e.CellStyle.BackColor = Drawing.Color.LightGreen
                    e.CellStyle.ForeColor = Drawing.Color.DarkGreen
                Case "YELLOW"
                    e.CellStyle.BackColor = Drawing.Color.LightYellow
                    e.CellStyle.ForeColor = Drawing.Color.DarkGoldenrod
                Case "RED"
                    e.CellStyle.BackColor = Drawing.Color.LightCoral
                    e.CellStyle.ForeColor = Drawing.Color.DarkRed
            End Select
        End If
    End Sub

    Private Sub btnLogout_Click(sender As Object, e As EventArgs) Handles btnLogout.Click
        If MessageBox.Show("Are you sure you want to logout?", "Confirm Logout",
                          MessageBoxButtons.YesNo, MessageBoxIcon.Question) = DialogResult.Yes Then
            _auditService.LogLogout(_currentSETA.SETAID, _currentUser.Username, "")
            Me.DialogResult = DialogResult.Abort
            Me.Close()
        End If
    End Sub

    Private Sub btnDashboard_Click(sender As Object, e As EventArgs) Handles btnDashboard.Click
        ResetNavButtons()
        btnDashboard.BackColor = Drawing.Color.FromArgb(0, 122, 204)
        LoadDashboard()
    End Sub

    Private Sub btnRegistration_Click(sender As Object, e As EventArgs) Handles btnRegistration.Click
        ResetNavButtons()
        btnRegistration.BackColor = Drawing.Color.FromArgb(0, 122, 204)

        Using frm As New frmRegistration(_currentUser, _currentSETA)
            frm.ShowDialog()
            ' Refresh dashboard after registration
            LoadDashboard()
        End Using
    End Sub

    Private Sub btnDuplicates_Click(sender As Object, e As EventArgs) Handles btnDuplicates.Click
        ResetNavButtons()
        btnDuplicates.BackColor = Drawing.Color.FromArgb(0, 122, 204)

        Using frm As New frmDuplicates(_currentUser, _currentSETA)
            frm.ShowDialog()
        End Using
    End Sub

    Private Sub ResetNavButtons()
        btnDashboard.BackColor = Drawing.Color.FromArgb(60, 60, 65)
        btnRegistration.BackColor = Drawing.Color.FromArgb(60, 60, 65)
        btnDuplicates.BackColor = Drawing.Color.FromArgb(60, 60, 65)
    End Sub

    Private Sub Form_Resize(sender As Object, e As EventArgs)
        ' Adjust controls on resize if needed
    End Sub

End Class
