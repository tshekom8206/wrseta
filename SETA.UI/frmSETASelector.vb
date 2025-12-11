' =============================================
' Multi-SETA ID Verification System
' Form: SETA Selector (Login)
' Purpose: Login screen with SETA selection for multi-tenant access
' =============================================

Imports System.Windows.Forms
Imports SETA.Core.Data
Imports SETA.Core.Models
Imports SETA.Core.Services

Public Class frmSETASelector
    Inherits Form

    ' Controls
    Private WithEvents cboSETA As ComboBox
    Private WithEvents txtUsername As TextBox
    Private WithEvents txtPassword As TextBox
    Private WithEvents btnLogin As Button
    Private WithEvents btnExit As Button
    Private lblTitle As Label
    Private lblSETA As Label
    Private lblUsername As Label
    Private lblPassword As Label
    Private lblStatus As Label
    Private pnlMain As Panel

    ' Data
    Private _dbHelper As DatabaseHelper
    Private _auditService As AuditService
    Private _setas As List(Of Models.SETA)

    ''' <summary>
    ''' Authenticated user (available after successful login)
    ''' </summary>
    Public Property AuthenticatedUser As User

    ''' <summary>
    ''' Selected SETA (available after successful login)
    ''' </summary>
    Public Property SelectedSETA As Models.SETA

    Public Sub New()
        InitializeComponent()
        SetupForm()
    End Sub

    Private Sub InitializeComponent()
        Me.SuspendLayout()

        ' Form properties
        Me.Text = "Multi-SETA ID Verification System - Login"
        Me.Size = New Drawing.Size(500, 400)
        Me.StartPosition = FormStartPosition.CenterScreen
        Me.FormBorderStyle = FormBorderStyle.FixedDialog
        Me.MaximizeBox = False
        Me.MinimizeBox = False
        Me.BackColor = Drawing.Color.FromArgb(45, 45, 48)

        ' Main panel
        pnlMain = New Panel() With {
            .Size = New Drawing.Size(400, 320),
            .Location = New Drawing.Point(50, 30),
            .BackColor = Drawing.Color.FromArgb(60, 60, 65),
            .BorderStyle = BorderStyle.None
        }
        Me.Controls.Add(pnlMain)

        ' Title label
        lblTitle = New Label() With {
            .Text = "SETA ID Verification System",
            .Font = New Drawing.Font("Segoe UI", 16, Drawing.FontStyle.Bold),
            .ForeColor = Drawing.Color.White,
            .AutoSize = True,
            .Location = New Drawing.Point(50, 20)
        }
        pnlMain.Controls.Add(lblTitle)

        ' Subtitle
        Dim lblSubtitle As New Label() With {
            .Text = "Central Hub for all 21 South African SETAs",
            .Font = New Drawing.Font("Segoe UI", 9),
            .ForeColor = Drawing.Color.LightGray,
            .AutoSize = True,
            .Location = New Drawing.Point(50, 50)
        }
        pnlMain.Controls.Add(lblSubtitle)

        ' SETA selection
        lblSETA = New Label() With {
            .Text = "Select Your SETA:",
            .Font = New Drawing.Font("Segoe UI", 10),
            .ForeColor = Drawing.Color.White,
            .AutoSize = True,
            .Location = New Drawing.Point(50, 90)
        }
        pnlMain.Controls.Add(lblSETA)

        cboSETA = New ComboBox() With {
            .Size = New Drawing.Size(300, 25),
            .Location = New Drawing.Point(50, 115),
            .DropDownStyle = ComboBoxStyle.DropDownList,
            .Font = New Drawing.Font("Segoe UI", 10)
        }
        pnlMain.Controls.Add(cboSETA)

        ' Username
        lblUsername = New Label() With {
            .Text = "Username:",
            .Font = New Drawing.Font("Segoe UI", 10),
            .ForeColor = Drawing.Color.White,
            .AutoSize = True,
            .Location = New Drawing.Point(50, 155)
        }
        pnlMain.Controls.Add(lblUsername)

        txtUsername = New TextBox() With {
            .Size = New Drawing.Size(300, 25),
            .Location = New Drawing.Point(50, 180),
            .Font = New Drawing.Font("Segoe UI", 10)
        }
        pnlMain.Controls.Add(txtUsername)

        ' Password
        lblPassword = New Label() With {
            .Text = "Password:",
            .Font = New Drawing.Font("Segoe UI", 10),
            .ForeColor = Drawing.Color.White,
            .AutoSize = True,
            .Location = New Drawing.Point(50, 215)
        }
        pnlMain.Controls.Add(lblPassword)

        txtPassword = New TextBox() With {
            .Size = New Drawing.Size(300, 25),
            .Location = New Drawing.Point(50, 240),
            .Font = New Drawing.Font("Segoe UI", 10),
            .PasswordChar = "*"c
        }
        pnlMain.Controls.Add(txtPassword)

        ' Status label
        lblStatus = New Label() With {
            .Text = "",
            .Font = New Drawing.Font("Segoe UI", 9),
            .ForeColor = Drawing.Color.Red,
            .AutoSize = True,
            .Location = New Drawing.Point(50, 270)
        }
        pnlMain.Controls.Add(lblStatus)

        ' Login button
        btnLogin = New Button() With {
            .Text = "Login",
            .Size = New Drawing.Size(140, 35),
            .Location = New Drawing.Point(50, 290),
            .Font = New Drawing.Font("Segoe UI", 10, Drawing.FontStyle.Bold),
            .BackColor = Drawing.Color.FromArgb(0, 122, 204),
            .ForeColor = Drawing.Color.White,
            .FlatStyle = FlatStyle.Flat,
            .Cursor = Cursors.Hand
        }
        btnLogin.FlatAppearance.BorderSize = 0
        pnlMain.Controls.Add(btnLogin)

        ' Exit button
        btnExit = New Button() With {
            .Text = "Exit",
            .Size = New Drawing.Size(140, 35),
            .Location = New Drawing.Point(210, 290),
            .Font = New Drawing.Font("Segoe UI", 10),
            .BackColor = Drawing.Color.FromArgb(80, 80, 85),
            .ForeColor = Drawing.Color.White,
            .FlatStyle = FlatStyle.Flat,
            .Cursor = Cursors.Hand
        }
        btnExit.FlatAppearance.BorderSize = 0
        pnlMain.Controls.Add(btnExit)

        Me.AcceptButton = btnLogin
        Me.ResumeLayout(False)
    End Sub

    Private Sub SetupForm()
        Try
            _dbHelper = New DatabaseHelper()
            _auditService = New AuditService()

            ' Load SETAs into dropdown
            _setas = _dbHelper.GetAllSETAs()

            If _setas.Count = 0 Then
                lblStatus.Text = "Error: No SETAs found in database. Please run Schema.sql first."
                lblStatus.ForeColor = Drawing.Color.Red
                btnLogin.Enabled = False
                Return
            End If

            cboSETA.DisplayMember = "ToString"
            cboSETA.ValueMember = "SETAID"
            cboSETA.DataSource = _setas

            ' Default to WRSETA if available
            Dim wrseta = _setas.FirstOrDefault(Function(s) s.SETACode = "WRSETA")
            If wrseta IsNot Nothing Then
                cboSETA.SelectedItem = wrseta
            End If

            ' Default credentials hint
            lblStatus.Text = "Default: admin / admin123"
            lblStatus.ForeColor = Drawing.Color.LightGray

        Catch ex As Exception
            lblStatus.Text = $"Database connection failed: {ex.Message}"
            lblStatus.ForeColor = Drawing.Color.Red
            btnLogin.Enabled = False
        End Try
    End Sub

    Private Sub btnLogin_Click(sender As Object, e As EventArgs) Handles btnLogin.Click
        lblStatus.Text = ""

        ' Validate inputs
        If cboSETA.SelectedItem Is Nothing Then
            lblStatus.Text = "Please select a SETA"
            lblStatus.ForeColor = Drawing.Color.Red
            Return
        End If

        If String.IsNullOrWhiteSpace(txtUsername.Text) Then
            lblStatus.Text = "Please enter username"
            lblStatus.ForeColor = Drawing.Color.Red
            txtUsername.Focus()
            Return
        End If

        If String.IsNullOrWhiteSpace(txtPassword.Text) Then
            lblStatus.Text = "Please enter password"
            lblStatus.ForeColor = Drawing.Color.Red
            txtPassword.Focus()
            Return
        End If

        Try
            Dim selectedSeta As Models.SETA = CType(cboSETA.SelectedItem, Models.SETA)
            Dim passwordHash As String = SAIDValidator.HashPassword(txtPassword.Text)

            ' Authenticate
            Dim user As User = _dbHelper.AuthenticateUser(txtUsername.Text, passwordHash, selectedSeta.SETAID)

            If user Is Nothing Then
                lblStatus.Text = "Invalid username or password"
                lblStatus.ForeColor = Drawing.Color.Red
                _auditService.LogLogin(selectedSeta.SETAID, txtUsername.Text, "", False)
                txtPassword.Clear()
                txtPassword.Focus()
                Return
            End If

            ' Success!
            AuthenticatedUser = user
            SelectedSETA = selectedSeta

            ' Update last login
            _dbHelper.UpdateLastLogin(user.UserID)

            ' Log successful login
            _auditService.LogLogin(selectedSeta.SETAID, user.Username, "", True)

            Me.DialogResult = DialogResult.OK
            Me.Close()

        Catch ex As Exception
            lblStatus.Text = $"Login error: {ex.Message}"
            lblStatus.ForeColor = Drawing.Color.Red
        End Try
    End Sub

    Private Sub btnExit_Click(sender As Object, e As EventArgs) Handles btnExit.Click
        Me.DialogResult = DialogResult.Cancel
        Me.Close()
    End Sub

    Private Sub txtPassword_KeyPress(sender As Object, e As KeyPressEventArgs) Handles txtPassword.KeyPress
        If e.KeyChar = ChrW(Keys.Enter) Then
            btnLogin.PerformClick()
        End If
    End Sub

End Class
