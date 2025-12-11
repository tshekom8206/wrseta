' =============================================
' Multi-SETA ID Verification System
' Form: Registration
' Purpose: Learner registration with real-time ID verification and traffic light display
' =============================================

Imports System.Windows.Forms
Imports SETA.Core.Models
Imports SETA.Core.Services

Public Class frmRegistration
    Inherits Form

    ' Current context
    Private _currentUser As User
    Private _currentSETA As Models.SETA
    Private _verificationService As VerificationService
    Private _validator As SAIDValidator
    Private _lastVerificationResult As VerificationResult

    ' Controls - Header
    Private pnlHeader As Panel
    Private lblTitle As Label

    ' Controls - ID Entry
    Private grpIDEntry As GroupBox
    Private lblIDNumber As Label
    Private txtIDNumber As TextBox
    Private WithEvents btnValidate As Button

    ' Controls - Traffic Light
    Private pnlTrafficLight As Panel
    Private trafficLight As ucTrafficLight

    ' Controls - Validation Results
    Private grpValidation As GroupBox
    Private lblFormatStatus As Label
    Private lblLuhnStatus As Label
    Private lblDHAStatus As Label
    Private lblDuplicateStatus As Label
    Private lblDetails As Label

    ' Controls - Demographics
    Private grpDemographics As GroupBox
    Private lblDOB As Label
    Private txtDOB As TextBox
    Private lblGender As Label
    Private txtGender As TextBox
    Private lblCitizenship As Label
    Private txtCitizenship As TextBox
    Private lblAge As Label
    Private txtAge As TextBox

    ' Controls - Learner Info
    Private grpLearnerInfo As GroupBox
    Private lblFirstName As Label
    Private txtFirstName As TextBox
    Private lblSurname As Label
    Private txtSurname As TextBox
    Private lblProgramme As Label
    Private cboProgramme As ComboBox

    ' Controls - Actions
    Private pnlActions As Panel
    Private WithEvents btnRegister As Button
    Private WithEvents btnClear As Button
    Private WithEvents btnClose As Button

    Public Sub New(user As User, seta As Models.SETA)
        _currentUser = user
        _currentSETA = seta
        _verificationService = New VerificationService(user)
        _validator = New SAIDValidator()

        InitializeComponent()
        SetupForm()
    End Sub

    Private Sub InitializeComponent()
        Me.SuspendLayout()

        ' Form properties
        Me.Text = $"Register Learner - {_currentSETA.SETACode}"
        Me.Size = New Drawing.Size(800, 700)
        Me.StartPosition = FormStartPosition.CenterParent
        Me.BackColor = Drawing.Color.FromArgb(240, 240, 245)
        Me.FormBorderStyle = FormBorderStyle.FixedDialog
        Me.MaximizeBox = False

        ' Header
        pnlHeader = New Panel() With {
            .Dock = DockStyle.Top,
            .Height = 50,
            .BackColor = Drawing.Color.FromArgb(0, 122, 204)
        }
        Me.Controls.Add(pnlHeader)

        lblTitle = New Label() With {
            .Text = $"Learner Registration - {_currentSETA.SETAName}",
            .Font = New Drawing.Font("Segoe UI", 14, Drawing.FontStyle.Bold),
            .ForeColor = Drawing.Color.White,
            .AutoSize = True,
            .Location = New Drawing.Point(15, 12)
        }
        pnlHeader.Controls.Add(lblTitle)

        ' ID Entry Group
        grpIDEntry = New GroupBox() With {
            .Text = "Step 1: Enter SA ID Number",
            .Font = New Drawing.Font("Segoe UI", 10, Drawing.FontStyle.Bold),
            .Location = New Drawing.Point(15, 65),
            .Size = New Drawing.Size(450, 80),
            .BackColor = Drawing.Color.White
        }
        Me.Controls.Add(grpIDEntry)

        lblIDNumber = New Label() With {
            .Text = "SA ID Number (13 digits):",
            .Font = New Drawing.Font("Segoe UI", 9),
            .Location = New Drawing.Point(15, 30),
            .AutoSize = True
        }
        grpIDEntry.Controls.Add(lblIDNumber)

        txtIDNumber = New TextBox() With {
            .Size = New Drawing.Size(180, 25),
            .Location = New Drawing.Point(15, 50),
            .Font = New Drawing.Font("Consolas", 12),
            .MaxLength = 13
        }
        grpIDEntry.Controls.Add(txtIDNumber)

        btnValidate = New Button() With {
            .Text = "Validate ID",
            .Size = New Drawing.Size(100, 30),
            .Location = New Drawing.Point(210, 48),
            .BackColor = Drawing.Color.FromArgb(0, 122, 204),
            .ForeColor = Drawing.Color.White,
            .FlatStyle = FlatStyle.Flat,
            .Font = New Drawing.Font("Segoe UI", 9, Drawing.FontStyle.Bold),
            .Cursor = Cursors.Hand
        }
        btnValidate.FlatAppearance.BorderSize = 0
        grpIDEntry.Controls.Add(btnValidate)

        ' Traffic Light Panel
        pnlTrafficLight = New Panel() With {
            .Location = New Drawing.Point(480, 65),
            .Size = New Drawing.Size(120, 280),
            .BackColor = Drawing.Color.FromArgb(30, 30, 35)
        }
        Me.Controls.Add(pnlTrafficLight)

        trafficLight = New ucTrafficLight() With {
            .Location = New Drawing.Point(10, 15),
            .Size = New Drawing.Size(100, 240)
        }
        pnlTrafficLight.Controls.Add(trafficLight)

        ' Validation Results Group
        grpValidation = New GroupBox() With {
            .Text = "Validation Status",
            .Font = New Drawing.Font("Segoe UI", 10, Drawing.FontStyle.Bold),
            .Location = New Drawing.Point(15, 155),
            .Size = New Drawing.Size(450, 130),
            .BackColor = Drawing.Color.White
        }
        Me.Controls.Add(grpValidation)

        lblFormatStatus = CreateStatusLabel("Format Check:", 25, grpValidation)
        lblLuhnStatus = CreateStatusLabel("Luhn Checksum:", 50, grpValidation)
        lblDHAStatus = CreateStatusLabel("DHA Verification:", 75, grpValidation)
        lblDuplicateStatus = CreateStatusLabel("Duplicate Check:", 100, grpValidation)

        ' Demographics Group
        grpDemographics = New GroupBox() With {
            .Text = "Extracted Demographics",
            .Font = New Drawing.Font("Segoe UI", 10, Drawing.FontStyle.Bold),
            .Location = New Drawing.Point(15, 295),
            .Size = New Drawing.Size(450, 100),
            .BackColor = Drawing.Color.White
        }
        Me.Controls.Add(grpDemographics)

        lblDOB = New Label() With {.Text = "Date of Birth:", .Location = New Drawing.Point(15, 30), .AutoSize = True, .Font = New Drawing.Font("Segoe UI", 9)}
        txtDOB = New TextBox() With {.Location = New Drawing.Point(110, 27), .Size = New Drawing.Size(100, 23), .ReadOnly = True, .BackColor = Drawing.Color.FromArgb(245, 245, 245)}
        grpDemographics.Controls.Add(lblDOB)
        grpDemographics.Controls.Add(txtDOB)

        lblGender = New Label() With {.Text = "Gender:", .Location = New Drawing.Point(230, 30), .AutoSize = True, .Font = New Drawing.Font("Segoe UI", 9)}
        txtGender = New TextBox() With {.Location = New Drawing.Point(290, 27), .Size = New Drawing.Size(80, 23), .ReadOnly = True, .BackColor = Drawing.Color.FromArgb(245, 245, 245)}
        grpDemographics.Controls.Add(lblGender)
        grpDemographics.Controls.Add(txtGender)

        lblAge = New Label() With {.Text = "Age:", .Location = New Drawing.Point(15, 60), .AutoSize = True, .Font = New Drawing.Font("Segoe UI", 9)}
        txtAge = New TextBox() With {.Location = New Drawing.Point(110, 57), .Size = New Drawing.Size(50, 23), .ReadOnly = True, .BackColor = Drawing.Color.FromArgb(245, 245, 245)}
        grpDemographics.Controls.Add(lblAge)
        grpDemographics.Controls.Add(txtAge)

        lblCitizenship = New Label() With {.Text = "Citizenship:", .Location = New Drawing.Point(180, 60), .AutoSize = True, .Font = New Drawing.Font("Segoe UI", 9)}
        txtCitizenship = New TextBox() With {.Location = New Drawing.Point(260, 57), .Size = New Drawing.Size(120, 23), .ReadOnly = True, .BackColor = Drawing.Color.FromArgb(245, 245, 245)}
        grpDemographics.Controls.Add(lblCitizenship)
        grpDemographics.Controls.Add(txtCitizenship)

        ' Learner Info Group
        grpLearnerInfo = New GroupBox() With {
            .Text = "Step 2: Learner Information",
            .Font = New Drawing.Font("Segoe UI", 10, Drawing.FontStyle.Bold),
            .Location = New Drawing.Point(15, 405),
            .Size = New Drawing.Size(585, 130),
            .BackColor = Drawing.Color.White
        }
        Me.Controls.Add(grpLearnerInfo)

        lblFirstName = New Label() With {.Text = "First Name:", .Location = New Drawing.Point(15, 35), .AutoSize = True, .Font = New Drawing.Font("Segoe UI", 9)}
        txtFirstName = New TextBox() With {.Location = New Drawing.Point(110, 32), .Size = New Drawing.Size(200, 25), .Font = New Drawing.Font("Segoe UI", 10)}
        grpLearnerInfo.Controls.Add(lblFirstName)
        grpLearnerInfo.Controls.Add(txtFirstName)

        lblSurname = New Label() With {.Text = "Surname:", .Location = New Drawing.Point(320, 35), .AutoSize = True, .Font = New Drawing.Font("Segoe UI", 9)}
        txtSurname = New TextBox() With {.Location = New Drawing.Point(390, 32), .Size = New Drawing.Size(180, 25), .Font = New Drawing.Font("Segoe UI", 10)}
        grpLearnerInfo.Controls.Add(lblSurname)
        grpLearnerInfo.Controls.Add(txtSurname)

        lblProgramme = New Label() With {.Text = "Programme:", .Location = New Drawing.Point(15, 75), .AutoSize = True, .Font = New Drawing.Font("Segoe UI", 9)}
        cboProgramme = New ComboBox() With {
            .Location = New Drawing.Point(110, 72),
            .Size = New Drawing.Size(350, 25),
            .DropDownStyle = ComboBoxStyle.DropDownList,
            .Font = New Drawing.Font("Segoe UI", 10)
        }
        cboProgramme.Items.AddRange({"Learnership", "Apprenticeship", "Skills Programme", "Internship", "Bursary", "AET Programme"})
        cboProgramme.SelectedIndex = 0
        grpLearnerInfo.Controls.Add(lblProgramme)
        grpLearnerInfo.Controls.Add(cboProgramme)

        ' Actions Panel
        pnlActions = New Panel() With {
            .Location = New Drawing.Point(15, 545),
            .Size = New Drawing.Size(585, 50),
            .BackColor = Drawing.Color.Transparent
        }
        Me.Controls.Add(pnlActions)

        btnRegister = New Button() With {
            .Text = "Register Learner",
            .Size = New Drawing.Size(150, 40),
            .Location = New Drawing.Point(0, 5),
            .BackColor = Drawing.Color.FromArgb(0, 180, 0),
            .ForeColor = Drawing.Color.White,
            .FlatStyle = FlatStyle.Flat,
            .Font = New Drawing.Font("Segoe UI", 10, Drawing.FontStyle.Bold),
            .Cursor = Cursors.Hand,
            .Enabled = False
        }
        btnRegister.FlatAppearance.BorderSize = 0
        pnlActions.Controls.Add(btnRegister)

        btnClear = New Button() With {
            .Text = "Clear Form",
            .Size = New Drawing.Size(120, 40),
            .Location = New Drawing.Point(170, 5),
            .BackColor = Drawing.Color.FromArgb(80, 80, 85),
            .ForeColor = Drawing.Color.White,
            .FlatStyle = FlatStyle.Flat,
            .Font = New Drawing.Font("Segoe UI", 10),
            .Cursor = Cursors.Hand
        }
        btnClear.FlatAppearance.BorderSize = 0
        pnlActions.Controls.Add(btnClear)

        btnClose = New Button() With {
            .Text = "Close",
            .Size = New Drawing.Size(100, 40),
            .Location = New Drawing.Point(310, 5),
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

    Private Function CreateStatusLabel(text As String, y As Integer, parent As Control) As Label
        Dim lbl As New Label() With {
            .Text = text & " Pending",
            .Font = New Drawing.Font("Segoe UI", 9),
            .ForeColor = Drawing.Color.Gray,
            .Location = New Drawing.Point(15, y),
            .AutoSize = True
        }
        parent.Controls.Add(lbl)
        Return lbl
    End Function

    Private Sub SetupForm()
        AddHandler txtIDNumber.KeyPress, AddressOf IDNumber_KeyPress
        trafficLight.Reset()
    End Sub

    Private Sub IDNumber_KeyPress(sender As Object, e As KeyPressEventArgs)
        ' Only allow digits and control characters
        If Not Char.IsDigit(e.KeyChar) AndAlso Not Char.IsControl(e.KeyChar) Then
            e.Handled = True
        End If

        ' Validate on Enter
        If e.KeyChar = ChrW(Keys.Enter) Then
            btnValidate.PerformClick()
        End If
    End Sub

    Private Sub btnValidate_Click(sender As Object, e As EventArgs) Handles btnValidate.Click
        If String.IsNullOrWhiteSpace(txtIDNumber.Text) Then
            MessageBox.Show("Please enter an ID number", "Validation", MessageBoxButtons.OK, MessageBoxIcon.Warning)
            txtIDNumber.Focus()
            Return
        End If

        ' Reset status
        ResetValidationStatus()
        btnRegister.Enabled = False

        Try
            ' Get names for full verification
            Dim firstName As String = If(String.IsNullOrWhiteSpace(txtFirstName.Text), "Test", txtFirstName.Text)
            Dim surname As String = If(String.IsNullOrWhiteSpace(txtSurname.Text), "User", txtSurname.Text)

            ' Perform full verification
            _lastVerificationResult = _verificationService.VerifyLearner(txtIDNumber.Text, firstName, surname)

            ' Update traffic light
            trafficLight.SetFromResult(_lastVerificationResult)

            ' Update status labels
            UpdateStatusLabel(lblFormatStatus, "Format Check:", _lastVerificationResult.FormatValid)
            UpdateStatusLabel(lblLuhnStatus, "Luhn Checksum:", _lastVerificationResult.LuhnValid)
            UpdateStatusLabel(lblDHAStatus, "DHA Verification:", _lastVerificationResult.DHAVerified)
            UpdateStatusLabel(lblDuplicateStatus, "Duplicate Check:", Not _lastVerificationResult.DuplicateFound,
                             If(_lastVerificationResult.DuplicateFound, $"Found at {_lastVerificationResult.ConflictingSETACode}", ""))

            ' Update demographics
            If _lastVerificationResult.FormatValid AndAlso _lastVerificationResult.LuhnValid Then
                txtDOB.Text = _lastVerificationResult.DateOfBirth.ToString("yyyy-MM-dd")
                txtGender.Text = _lastVerificationResult.Gender
                txtAge.Text = _lastVerificationResult.Age.ToString()
                txtCitizenship.Text = _lastVerificationResult.Citizenship
            End If

            ' Enable registration if GREEN or YELLOW
            If _lastVerificationResult.Status = TrafficLightStatus.GREEN OrElse
               _lastVerificationResult.Status = TrafficLightStatus.YELLOW Then
                btnRegister.Enabled = True
                grpLearnerInfo.Enabled = True
            Else
                btnRegister.Enabled = False
            End If

            ' Show detailed message
            If _lastVerificationResult.Status = TrafficLightStatus.RED Then
                MessageBox.Show($"Verification Failed:{vbCrLf}{vbCrLf}{_lastVerificationResult.StatusReason}",
                               "RED - Cannot Register", MessageBoxButtons.OK, MessageBoxIcon.Stop)
            ElseIf _lastVerificationResult.Status = TrafficLightStatus.YELLOW Then
                MessageBox.Show($"Review Required:{vbCrLf}{vbCrLf}{_lastVerificationResult.StatusReason}{vbCrLf}{vbCrLf}You may proceed with caution.",
                               "YELLOW - Review Needed", MessageBoxButtons.OK, MessageBoxIcon.Warning)
            End If

        Catch ex As Exception
            MessageBox.Show($"Validation error: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error)
            trafficLight.SetRed("ERROR")
        End Try
    End Sub

    Private Sub UpdateStatusLabel(lbl As Label, prefix As String, passed As Boolean, Optional additionalInfo As String = "")
        If passed Then
            lbl.Text = $"{prefix} Passed"
            lbl.ForeColor = Drawing.Color.Green
        Else
            lbl.Text = $"{prefix} Failed {additionalInfo}"
            lbl.ForeColor = Drawing.Color.Red
        End If
    End Sub

    Private Sub ResetValidationStatus()
        lblFormatStatus.Text = "Format Check: Checking..."
        lblFormatStatus.ForeColor = Drawing.Color.Gray
        lblLuhnStatus.Text = "Luhn Checksum: Checking..."
        lblLuhnStatus.ForeColor = Drawing.Color.Gray
        lblDHAStatus.Text = "DHA Verification: Checking..."
        lblDHAStatus.ForeColor = Drawing.Color.Gray
        lblDuplicateStatus.Text = "Duplicate Check: Checking..."
        lblDuplicateStatus.ForeColor = Drawing.Color.Gray

        txtDOB.Clear()
        txtGender.Clear()
        txtAge.Clear()
        txtCitizenship.Clear()

        trafficLight.Reset()
        _lastVerificationResult = Nothing
    End Sub

    Private Sub btnRegister_Click(sender As Object, e As EventArgs) Handles btnRegister.Click
        ' Validate inputs
        If String.IsNullOrWhiteSpace(txtFirstName.Text) Then
            MessageBox.Show("Please enter the learner's first name", "Validation", MessageBoxButtons.OK, MessageBoxIcon.Warning)
            txtFirstName.Focus()
            Return
        End If

        If String.IsNullOrWhiteSpace(txtSurname.Text) Then
            MessageBox.Show("Please enter the learner's surname", "Validation", MessageBoxButtons.OK, MessageBoxIcon.Warning)
            txtSurname.Focus()
            Return
        End If

        If cboProgramme.SelectedItem Is Nothing Then
            MessageBox.Show("Please select a programme", "Validation", MessageBoxButtons.OK, MessageBoxIcon.Warning)
            cboProgramme.Focus()
            Return
        End If

        ' Confirm YELLOW status registration
        If _lastVerificationResult?.Status = TrafficLightStatus.YELLOW Then
            If MessageBox.Show("This learner has a YELLOW status (review needed)." & vbCrLf & vbCrLf &
                              "Are you sure you want to proceed with registration?",
                              "Confirm Registration", MessageBoxButtons.YesNo, MessageBoxIcon.Warning) = DialogResult.No Then
                Return
            End If
        End If

        Try
            ' Register the learner
            Dim learnerId As Integer = _verificationService.RegisterLearner(
                txtIDNumber.Text,
                txtFirstName.Text,
                txtSurname.Text,
                cboProgramme.SelectedItem.ToString()
            )

            MessageBox.Show($"Learner registered successfully!" & vbCrLf & vbCrLf &
                           $"Learner ID: {learnerId}" & vbCrLf &
                           $"Name: {txtFirstName.Text} {txtSurname.Text}" & vbCrLf &
                           $"Programme: {cboProgramme.SelectedItem}" & vbCrLf &
                           $"SETA: {_currentSETA.SETACode}",
                           "Registration Successful", MessageBoxButtons.OK, MessageBoxIcon.Information)

            ClearForm()

        Catch ex As Exception
            MessageBox.Show($"Registration failed: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error)
        End Try
    End Sub

    Private Sub btnClear_Click(sender As Object, e As EventArgs) Handles btnClear.Click
        ClearForm()
    End Sub

    Private Sub ClearForm()
        txtIDNumber.Clear()
        txtFirstName.Clear()
        txtSurname.Clear()
        cboProgramme.SelectedIndex = 0
        ResetValidationStatus()
        btnRegister.Enabled = False
        txtIDNumber.Focus()
    End Sub

    Private Sub btnClose_Click(sender As Object, e As EventArgs) Handles btnClose.Click
        Me.Close()
    End Sub

End Class
