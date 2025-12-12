' =============================================
' Multi-SETA ID Verification System
' Service: Verification Service
' Purpose: Orchestrates ID verification workflow with DHA mock and duplicate detection
' =============================================

Imports SETA.Core.Models
Imports SETA.Core.Data

Namespace Services

    ''' <summary>
    ''' Main verification service that orchestrates the complete verification workflow:
    ''' 1. Format validation (SAIDValidator)
    ''' 2. Luhn checksum validation
    ''' 3. Local duplicate check (same SETA)
    ''' 4. Cross-SETA duplicate check (other SETAs)
    ''' 5. DHA API verification (mock)
    ''' </summary>
    Public Class VerificationService

        Private ReadOnly _validator As SAIDValidator
        Private ReadOnly _dbHelper As DatabaseHelper
        Private ReadOnly _auditService As AuditService

        ''' <summary>
        ''' Current user performing verification
        ''' </summary>
        Public Property CurrentUser As User

        ''' <summary>
        ''' Current SETA context
        ''' </summary>
        Public Property CurrentSETAID As Integer

        ''' <summary>
        ''' Initializes the verification service
        ''' </summary>
        Public Sub New()
            _validator = New SAIDValidator()
            _dbHelper = New DatabaseHelper()
            _auditService = New AuditService()
        End Sub

        ''' <summary>
        ''' Initializes the verification service with user context
        ''' </summary>
        Public Sub New(user As User)
            Me.New()
            CurrentUser = user
            If user IsNot Nothing Then
                CurrentSETAID = user.SETAID
            End If
        End Sub

        ''' <summary>
        ''' Performs complete verification of a learner
        ''' Returns Traffic Light status (GREEN/YELLOW/RED)
        ''' </summary>
        Public Function VerifyLearner(idNumber As String, firstName As String, surname As String) As VerificationResult

            Dim result As New VerificationResult()
            Dim username As String = If(CurrentUser?.Username, "system")

            ' ============================================
            ' STEP 1: Format and Luhn Validation
            ' ============================================
            Dim idResult As VerificationResult = _validator.Validate(idNumber)

            If Not idResult.IsValid Then
                ' RED: Invalid ID format or checksum
                LogVerificationAttempt(idNumber, firstName, surname, idResult, Nothing)
                Return idResult
            End If

            ' Copy demographics from ID validation
            result.FormatValid = idResult.FormatValid
            result.LuhnValid = idResult.LuhnValid
            result.DateOfBirth = idResult.DateOfBirth
            result.Gender = idResult.Gender
            result.Citizenship = idResult.Citizenship
            result.Age = idResult.Age

            ' ============================================
            ' STEP 2: Check for Local Duplicate (same SETA)
            ' ============================================
            Dim localDuplicate As Learner = _dbHelper.CheckLocalDuplicate(idNumber, CurrentSETAID)

            If localDuplicate IsNot Nothing Then
                ' RED: Already registered at this SETA
                result.IsValid = False
                result.Status = TrafficLightStatus.RED
                result.Message = "Learner already registered"
                result.StatusReason = $"Learner already registered at {localDuplicate.SETACode} in programme: {localDuplicate.ProgrammeName}"
                result.DuplicateFound = True
                result.ConflictingSETAID = localDuplicate.RegisteredSETAID
                result.ConflictingSETACode = localDuplicate.SETACode
                result.ConflictingSETAName = localDuplicate.SETAName

                LogVerificationAttempt(idNumber, firstName, surname, result, localDuplicate)
                Return result
            End If

            ' ============================================
            ' STEP 3: Check for Cross-SETA Duplicate (other SETAs)
            ' ============================================
            Dim crossSETADuplicate As Learner = _dbHelper.CheckCrossSETADuplicate(idNumber, CurrentSETAID)

            If crossSETADuplicate IsNot Nothing Then
                ' RED: Registered at another SETA - Double Dipping Detected!
                result.IsValid = False
                result.Status = TrafficLightStatus.RED
                result.Message = "Cross-SETA duplicate detected"
                result.StatusReason = $"Learner already registered at {crossSETADuplicate.SETACode} ({crossSETADuplicate.SETAName})"
                result.DuplicateFound = True
                result.ConflictingSETAID = crossSETADuplicate.RegisteredSETAID
                result.ConflictingSETACode = crossSETADuplicate.SETACode
                result.ConflictingSETAName = crossSETADuplicate.SETAName

                ' Log duplicate attempt
                _dbHelper.LogDuplicateAttempt(idNumber, $"{firstName} {surname}", CurrentSETAID,
                                              crossSETADuplicate.RegisteredSETAID, crossSETADuplicate.LearnerID)

                LogVerificationAttempt(idNumber, firstName, surname, result, crossSETADuplicate)
                Return result
            End If

            ' ============================================
            ' STEP 4: DHA API Verification (Mock)
            ' ============================================
            Dim dhaResult As DHAVerificationResult = MockDHAVerification(idNumber, firstName, surname)

            result.DHAVerified = dhaResult.Found
            result.DHAFirstName = dhaResult.FirstName
            result.DHASurname = dhaResult.Surname

            If Not dhaResult.Found Then
                ' RED: Not found in DHA records
                result.IsValid = False
                result.Status = TrafficLightStatus.RED
                result.Message = "Identity not found"
                result.StatusReason = "ID number not found in Department of Home Affairs records"

                LogVerificationAttempt(idNumber, firstName, surname, result, Nothing)
                Return result
            End If

            If dhaResult.NameMismatch Then
                ' YELLOW: Name mismatch - requires manual review
                result.IsValid = True ' ID is valid, but needs review
                result.Status = TrafficLightStatus.YELLOW
                result.Message = "Name mismatch - review required"
                result.StatusReason = $"DHA records show: {dhaResult.FirstName} {dhaResult.Surname}. " &
                                      $"Submitted: {firstName} {surname}"
                result.DHAVerified = True

                LogVerificationAttempt(idNumber, firstName, surname, result, Nothing)
                Return result
            End If

            ' ============================================
            ' STEP 5: All Checks Passed - GREEN
            ' ============================================
            result.IsValid = True
            result.Status = TrafficLightStatus.GREEN
            result.Message = "Identity verified successfully"
            result.StatusReason = "Format valid, Luhn passed, DHA verified, no duplicates found"
            result.DHAVerified = True

            LogVerificationAttempt(idNumber, firstName, surname, result, Nothing)
            Return result

        End Function

        ''' <summary>
        ''' Mock DHA (Department of Home Affairs) verification
        ''' In production, this would call the actual DHA API
        ''' </summary>
        Private Function MockDHAVerification(idNumber As String, firstName As String, surname As String) As DHAVerificationResult
            Dim result As New DHAVerificationResult()

            ' For demo purposes, simulate realistic responses:
            ' - 90% success with matching name
            ' - 8% success with name mismatch (married name, spelling)
            ' - 2% not found

            Dim random As New Random(idNumber.GetHashCode()) ' Consistent results for same ID
            Dim roll As Integer = random.Next(100)

            If roll < 90 Then
                ' Perfect match
                result.Found = True
                result.NameMatch = True
                result.NameMismatch = False
                result.FirstName = firstName
                result.Surname = surname

            ElseIf roll < 98 Then
                ' Found but name mismatch
                result.Found = True
                result.NameMatch = False
                result.NameMismatch = True
                ' Return slightly different name (simulating maiden name, spelling variation)
                result.FirstName = firstName
                result.Surname = If(surname.Length > 3, surname.Substring(0, surname.Length - 2) & "a", surname & "i")

            Else
                ' Not found
                result.Found = False
                result.NameMatch = False
                result.NameMismatch = False
            End If

            Return result
        End Function

        ''' <summary>
        ''' Logs verification attempt to database
        ''' </summary>
        Private Sub LogVerificationAttempt(idNumber As String, firstName As String, surname As String,
                                           result As VerificationResult, conflictingLearner As Learner)

            Dim username As String = If(CurrentUser?.Username, "system")

            _dbHelper.LogVerification(
                CurrentSETAID,
                idNumber,
                firstName,
                surname,
                result.StatusString,
                result.StatusReason,
                result.FormatValid,
                result.LuhnValid,
                result.DHAVerified,
                result.DuplicateFound,
                result.ConflictingSETAID,
                username
            )

            ' Also log to audit trail
            _auditService.LogAction(
                CurrentSETAID,
                "Verify",
                "VerificationLog",
                Nothing,
                idNumber,
                $"Verification result: {result.StatusString} - {result.Message}",
                username,
                ""
            )
        End Sub

        ''' <summary>
        ''' Registers a verified learner
        ''' </summary>
        Public Function RegisterLearner(idNumber As String, firstName As String, surname As String,
                                        programmeName As String) As Integer

            Dim username As String = If(CurrentUser?.Username, "system")

            ' First verify the learner
            Dim verification As VerificationResult = VerifyLearner(idNumber, firstName, surname)

            If verification.Status = TrafficLightStatus.RED Then
                Throw New InvalidOperationException($"Cannot register: {verification.Message}")
            End If

            ' Create learner record
            Dim learner As New Learner() With {
                .IDNumber = idNumber,
                .IDNumberHash = SAIDValidator.HashIDNumber(idNumber),
                .FirstName = firstName,
                .Surname = surname,
                .DateOfBirth = verification.DateOfBirth,
                .Gender = verification.Gender,
                .RegisteredSETAID = CurrentSETAID,
                .ProgrammeName = programmeName,
                .CreatedBy = username
            }

            ' Save to database
            Dim learnerId As Integer = _dbHelper.RegisterLearner(learner)

            ' Log audit
            _auditService.LogAction(
                CurrentSETAID,
                "Register",
                "LearnerRegistry",
                learnerId,
                idNumber,
                $"Registered learner: {firstName} {surname} in programme: {programmeName}",
                username,
                ""
            )

            Return learnerId
        End Function

        ''' <summary>
        ''' Gets dashboard statistics for the current SETA
        ''' </summary>
        Public Function GetDashboardStats() As Dictionary(Of String, Integer)
            Return _dbHelper.GetDashboardStats(CurrentSETAID)
        End Function

        ''' <summary>
        ''' Gets recent verifications for the current SETA
        ''' </summary>
        Public Function GetRecentVerifications(count As Integer) As DataTable
            Return _dbHelper.GetRecentVerifications(CurrentSETAID, count)
        End Function

        ''' <summary>
        ''' Gets duplicate attempts for the current SETA
        ''' </summary>
        Public Function GetDuplicateAttempts() As DataTable
            Return _dbHelper.GetDuplicateAttempts(CurrentSETAID)
        End Function

    End Class

    ''' <summary>
    ''' Result from DHA API verification (mock)
    ''' </summary>
    Public Class DHAVerificationResult
        Public Property Found As Boolean = False
        Public Property NameMatch As Boolean = False
        Public Property NameMismatch As Boolean = False
        Public Property FirstName As String = ""
        Public Property Surname As String = ""
        Public Property DateOfBirth As Date
        Public Property Gender As String = ""
    End Class

End Namespace
