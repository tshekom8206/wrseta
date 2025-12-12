' =============================================
' Multi-SETA ID Verification System
' User Control: Traffic Light
' Purpose: Visual indicator showing verification status (GREEN/YELLOW/RED)
' =============================================

Imports System.Drawing
Imports System.Drawing.Drawing2D
Imports System.Windows.Forms
Imports SETA.Core.Models

''' <summary>
''' Traffic Light user control for displaying verification status
''' Shows three lights (Red, Yellow, Green) with active state highlighting
''' </summary>
Public Class ucTrafficLight
    Inherits UserControl

    ' Light colors when active/inactive
    Private Const RED_ACTIVE As Integer = &HFFFF0000
    Private Const RED_INACTIVE As Integer = &HFF660000
    Private Const YELLOW_ACTIVE As Integer = &HFFFFFF00
    Private Const YELLOW_INACTIVE As Integer = &HFF666600
    Private Const GREEN_ACTIVE As Integer = &HFF00FF00
    Private Const GREEN_INACTIVE As Integer = &HFF006600

    Private _status As TrafficLightStatus = TrafficLightStatus.RED
    Private _statusMessage As String = ""
    Private _showStatusText As Boolean = True

    ' Light panels
    Private pnlRed As Panel
    Private pnlYellow As Panel
    Private pnlGreen As Panel
    Private lblStatus As Label

    ''' <summary>
    ''' Current traffic light status
    ''' </summary>
    Public Property Status As TrafficLightStatus
        Get
            Return _status
        End Get
        Set(value As TrafficLightStatus)
            _status = value
            UpdateDisplay()
        End Set
    End Property

    ''' <summary>
    ''' Status message shown below the lights
    ''' </summary>
    Public Property StatusMessage As String
        Get
            Return _statusMessage
        End Get
        Set(value As String)
            _statusMessage = value
            If lblStatus IsNot Nothing Then
                lblStatus.Text = value
            End If
        End Set
    End Property

    ''' <summary>
    ''' Whether to show status text below lights
    ''' </summary>
    Public Property ShowStatusText As Boolean
        Get
            Return _showStatusText
        End Get
        Set(value As Boolean)
            _showStatusText = value
            If lblStatus IsNot Nothing Then
                lblStatus.Visible = value
            End If
        End Set
    End Property

    ''' <summary>
    ''' Initializes the traffic light control
    ''' </summary>
    Public Sub New()
        InitializeComponent()
        SetupLights()
        Reset()
    End Sub

    Private Sub InitializeComponent()
        Me.SuspendLayout()
        Me.Name = "ucTrafficLight"
        Me.Size = New Size(100, 240)
        Me.BackColor = Color.FromArgb(40, 40, 40) ' Dark housing
        Me.ResumeLayout(False)
    End Sub

    Private Sub SetupLights()
        Dim lightSize As Integer = 60
        Dim spacing As Integer = 10
        Dim startX As Integer = (Me.Width - lightSize) \ 2
        Dim startY As Integer = 10

        ' Red light (top)
        pnlRed = CreateLightPanel(startX, startY, lightSize)
        pnlRed.Tag = "RED"
        AddHandler pnlRed.Paint, AddressOf PaintLight

        ' Yellow light (middle)
        pnlYellow = CreateLightPanel(startX, startY + lightSize + spacing, lightSize)
        pnlYellow.Tag = "YELLOW"
        AddHandler pnlYellow.Paint, AddressOf PaintLight

        ' Green light (bottom)
        pnlGreen = CreateLightPanel(startX, startY + 2 * (lightSize + spacing), lightSize)
        pnlGreen.Tag = "GREEN"
        AddHandler pnlGreen.Paint, AddressOf PaintLight

        ' Status label
        lblStatus = New Label() With {
            .AutoSize = False,
            .Size = New Size(Me.Width - 10, 30),
            .Location = New Point(5, startY + 3 * (lightSize + spacing)),
            .TextAlign = ContentAlignment.MiddleCenter,
            .ForeColor = Color.White,
            .BackColor = Color.Transparent,
            .Font = New Font("Segoe UI", 9, FontStyle.Bold)
        }
        Me.Controls.Add(lblStatus)

        Me.Controls.Add(pnlRed)
        Me.Controls.Add(pnlYellow)
        Me.Controls.Add(pnlGreen)
    End Sub

    Private Function CreateLightPanel(x As Integer, y As Integer, size As Integer) As Panel
        Return New Panel() With {
            .Location = New Point(x, y),
            .Size = New Size(size, size),
            .BackColor = Color.Transparent
        }
    End Function

    Private Sub PaintLight(sender As Object, e As PaintEventArgs)
        Dim pnl As Panel = CType(sender, Panel)
        Dim lightType As String = CStr(pnl.Tag)
        Dim g As Graphics = e.Graphics
        g.SmoothingMode = SmoothingMode.AntiAlias

        Dim isActive As Boolean = False
        Dim activeColor As Color = Color.Gray
        Dim inactiveColor As Color = Color.DarkGray

        Select Case lightType
            Case "RED"
                isActive = (_status = TrafficLightStatus.RED)
                activeColor = Color.FromArgb(RED_ACTIVE)
                inactiveColor = Color.FromArgb(RED_INACTIVE)
            Case "YELLOW"
                isActive = (_status = TrafficLightStatus.YELLOW)
                activeColor = Color.FromArgb(YELLOW_ACTIVE)
                inactiveColor = Color.FromArgb(YELLOW_INACTIVE)
            Case "GREEN"
                isActive = (_status = TrafficLightStatus.GREEN)
                activeColor = Color.FromArgb(GREEN_ACTIVE)
                inactiveColor = Color.FromArgb(GREEN_INACTIVE)
        End Select

        Dim lightColor As Color = If(isActive, activeColor, inactiveColor)
        Dim rect As New Rectangle(2, 2, pnl.Width - 4, pnl.Height - 4)

        ' Draw outer ring
        Using ringBrush As New SolidBrush(Color.FromArgb(60, 60, 60))
            g.FillEllipse(ringBrush, rect)
        End Using

        ' Draw inner light with gradient for 3D effect
        Dim innerRect As New Rectangle(6, 6, pnl.Width - 12, pnl.Height - 12)
        Using path As New GraphicsPath()
            path.AddEllipse(innerRect)
            Using gradBrush As New PathGradientBrush(path)
                gradBrush.CenterColor = If(isActive, Color.White, lightColor)
                gradBrush.SurroundColors = New Color() {lightColor}
                gradBrush.CenterPoint = New PointF(innerRect.X + innerRect.Width * 0.3F, innerRect.Y + innerRect.Height * 0.3F)
                g.FillEllipse(gradBrush, innerRect)
            End Using
        End Using

        ' Draw highlight/glare if active
        If isActive Then
            Dim glareRect As New Rectangle(innerRect.X + 8, innerRect.Y + 4, innerRect.Width \ 3, innerRect.Height \ 4)
            Using glareBrush As New LinearGradientBrush(glareRect, Color.FromArgb(150, Color.White), Color.FromArgb(0, Color.White), 90)
                g.FillEllipse(glareBrush, glareRect)
            End Using
        End If
    End Sub

    ''' <summary>
    ''' Updates the visual display based on current status
    ''' </summary>
    Private Sub UpdateDisplay()
        pnlRed?.Invalidate()
        pnlYellow?.Invalidate()
        pnlGreen?.Invalidate()

        If lblStatus IsNot Nothing Then
            Select Case _status
                Case TrafficLightStatus.GREEN
                    lblStatus.Text = If(String.IsNullOrEmpty(_statusMessage), "VERIFIED", _statusMessage)
                    lblStatus.ForeColor = Color.LightGreen
                Case TrafficLightStatus.YELLOW
                    lblStatus.Text = If(String.IsNullOrEmpty(_statusMessage), "REVIEW", _statusMessage)
                    lblStatus.ForeColor = Color.Yellow
                Case TrafficLightStatus.RED
                    lblStatus.Text = If(String.IsNullOrEmpty(_statusMessage), "BLOCKED", _statusMessage)
                    lblStatus.ForeColor = Color.Red
            End Select
        End If

        Me.Refresh()
    End Sub

    ''' <summary>
    ''' Sets the traffic light to GREEN (verified)
    ''' </summary>
    Public Sub SetGreen(Optional message As String = "VERIFIED")
        _statusMessage = message
        Status = TrafficLightStatus.GREEN
    End Sub

    ''' <summary>
    ''' Sets the traffic light to YELLOW (review needed)
    ''' </summary>
    Public Sub SetYellow(Optional message As String = "REVIEW")
        _statusMessage = message
        Status = TrafficLightStatus.YELLOW
    End Sub

    ''' <summary>
    ''' Sets the traffic light to RED (blocked)
    ''' </summary>
    Public Sub SetRed(Optional message As String = "BLOCKED")
        _statusMessage = message
        Status = TrafficLightStatus.RED
    End Sub

    ''' <summary>
    ''' Resets the traffic light (all lights dim)
    ''' </summary>
    Public Sub Reset()
        _statusMessage = ""
        If lblStatus IsNot Nothing Then
            lblStatus.Text = "READY"
            lblStatus.ForeColor = Color.Gray
        End If
        ' Set to a "neutral" state by keeping RED but dimmed
        pnlRed?.Invalidate()
        pnlYellow?.Invalidate()
        pnlGreen?.Invalidate()
    End Sub

    ''' <summary>
    ''' Sets status from VerificationResult
    ''' </summary>
    Public Sub SetFromResult(result As VerificationResult)
        _statusMessage = result.Message
        Status = result.Status
    End Sub

End Class
