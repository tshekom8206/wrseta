' =============================================
' Multi-SETA ID Verification System
' Form: Duplicates
' Purpose: View and manage cross-SETA duplicate registration attempts
' =============================================

Imports System.Windows.Forms
Imports SETA.Core.Models
Imports SETA.Core.Services

Public Class frmDuplicates
    Inherits Form

    ' Current context
    Private _currentUser As User
    Private _currentSETA As SetaInfo
    Private _verificationService As VerificationService

    ' Controls
    Private pnlHeader As Panel
    Private lblTitle As Label
    Private lblDescription As Label
    Private grpDuplicates As GroupBox
    Private dgvDuplicates As DataGridView
    Private pnlActions As Panel
    Private WithEvents btnRefresh As Button
    Private WithEvents btnClose As Button
    Private lblStats As Label

    Public Sub New(user As User, seta As SetaInfo)
        _currentUser = user
        _currentSETA = seta
        _verificationService = New VerificationService(user)

        InitializeComponent()
        LoadDuplicates()
    End Sub

    Private Sub InitializeComponent()
        Me.SuspendLayout()

        ' Form properties
        Me.Text = $"Blocked Duplicate Attempts - {_currentSETA.SETACode}"
        Me.Size = New Drawing.Size(900, 600)
        Me.StartPosition = FormStartPosition.CenterParent
        Me.BackColor = Drawing.Color.FromArgb(240, 240, 245)
        Me.FormBorderStyle = FormBorderStyle.FixedDialog
        Me.MaximizeBox = False

        ' Header
        pnlHeader = New Panel() With {
            .Dock = DockStyle.Top,
            .Height = 80,
            .BackColor = Drawing.Color.FromArgb(128, 0, 128) ' Purple for duplicates
        }
        Me.Controls.Add(pnlHeader)

        lblTitle = New Label() With {
            .Text = "Double Dip Detective - Blocked Attempts",
            .Font = New Drawing.Font("Segoe UI", 14, Drawing.FontStyle.Bold),
            .ForeColor = Drawing.Color.White,
            .AutoSize = True,
            .Location = New Drawing.Point(15, 12)
        }
        pnlHeader.Controls.Add(lblTitle)

        lblDescription = New Label() With {
            .Text = "These learners attempted to register at your SETA but are already registered elsewhere.",
            .Font = New Drawing.Font("Segoe UI", 9),
            .ForeColor = Drawing.Color.White,
            .AutoSize = True,
            .Location = New Drawing.Point(15, 45)
        }
        pnlHeader.Controls.Add(lblDescription)

        ' Stats label
        lblStats = New Label() With {
            .Text = "Loading...",
            .Font = New Drawing.Font("Segoe UI", 10, Drawing.FontStyle.Bold),
            .ForeColor = Drawing.Color.FromArgb(128, 0, 128),
            .AutoSize = True,
            .Location = New Drawing.Point(15, 95)
        }
        Me.Controls.Add(lblStats)

        ' Duplicates Group
        grpDuplicates = New GroupBox() With {
            .Text = "Blocked Cross-SETA Registration Attempts",
            .Font = New Drawing.Font("Segoe UI", 10, Drawing.FontStyle.Bold),
            .Location = New Drawing.Point(15, 120),
            .Size = New Drawing.Size(860, 380),
            .BackColor = Drawing.Color.White
        }
        Me.Controls.Add(grpDuplicates)

        dgvDuplicates = New DataGridView() With {
            .Location = New Drawing.Point(15, 25),
            .Size = New Drawing.Size(830, 340),
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
        dgvDuplicates.ColumnHeadersDefaultCellStyle.BackColor = Drawing.Color.FromArgb(128, 0, 128)
        dgvDuplicates.ColumnHeadersDefaultCellStyle.ForeColor = Drawing.Color.White
        dgvDuplicates.ColumnHeadersDefaultCellStyle.Font = New Drawing.Font("Segoe UI", 9, Drawing.FontStyle.Bold)
        dgvDuplicates.EnableHeadersVisualStyles = False
        dgvDuplicates.AlternatingRowsDefaultCellStyle.BackColor = Drawing.Color.FromArgb(245, 240, 250)

        grpDuplicates.Controls.Add(dgvDuplicates)

        ' Actions Panel
        pnlActions = New Panel() With {
            .Location = New Drawing.Point(15, 510),
            .Size = New Drawing.Size(860, 50),
            .BackColor = Drawing.Color.Transparent
        }
        Me.Controls.Add(pnlActions)

        btnRefresh = New Button() With {
            .Text = "Refresh",
            .Size = New Drawing.Size(120, 40),
            .Location = New Drawing.Point(0, 5),
            .BackColor = Drawing.Color.FromArgb(0, 122, 204),
            .ForeColor = Drawing.Color.White,
            .FlatStyle = FlatStyle.Flat,
            .Font = New Drawing.Font("Segoe UI", 10),
            .Cursor = Cursors.Hand
        }
        btnRefresh.FlatAppearance.BorderSize = 0
        pnlActions.Controls.Add(btnRefresh)

        btnClose = New Button() With {
            .Text = "Close",
            .Size = New Drawing.Size(100, 40),
            .Location = New Drawing.Point(140, 5),
            .BackColor = Drawing.Color.FromArgb(60, 60, 65),
            .ForeColor = Drawing.Color.White,
            .FlatStyle = FlatStyle.Flat,
            .Font = New Drawing.Font("Segoe UI", 10),
            .Cursor = Cursors.Hand
        }
        btnClose.FlatAppearance.BorderSize = 0
        pnlActions.Controls.Add(btnClose)

        Me.ResumeLayout(False)
    End Sub

    Private Sub LoadDuplicates()
        Try
            Dim dt As DataTable = _verificationService.GetDuplicateAttempts()

            ' Mask ID numbers for POPIA compliance
            For Each row As DataRow In dt.Rows
                If row("IDNumber") IsNot DBNull.Value Then
                    row("IDNumber") = SAIDValidator.MaskIDNumber(row("IDNumber").ToString())
                End If
            Next

            dgvDuplicates.DataSource = dt

            ' Update stats
            lblStats.Text = $"Total Blocked Attempts: {dt.Rows.Count}"

            ' Format columns if they exist
            If dgvDuplicates.Columns.Contains("AttemptDate") Then
                dgvDuplicates.Columns("AttemptDate").DefaultCellStyle.Format = "yyyy-MM-dd HH:mm"
            End If

            If dgvDuplicates.Columns.Contains("AttemptID") Then
                dgvDuplicates.Columns("AttemptID").Visible = False
            End If

        Catch ex As Exception
            MessageBox.Show($"Error loading duplicate attempts: {ex.Message}", "Error",
                           MessageBoxButtons.OK, MessageBoxIcon.Error)
            lblStats.Text = "Error loading data"
        End Try
    End Sub

    Private Sub btnRefresh_Click(sender As Object, e As EventArgs) Handles btnRefresh.Click
        LoadDuplicates()
    End Sub

    Private Sub btnClose_Click(sender As Object, e As EventArgs) Handles btnClose.Click
        Me.Close()
    End Sub

End Class
