' =============================================
' Multi-SETA ID Verification System
' Service: SA ID Validator
' Purpose: Validates South African ID numbers using Luhn algorithm
' =============================================

Imports System.Text.RegularExpressions
Imports SETA.Core.Models

Namespace Services

    ''' <summary>
    ''' Validates South African ID numbers using format checks and Luhn algorithm
    '''
    ''' SA ID Number Structure (13 digits):
    ''' YYMMDD SSSS C A Z
    '''   |     |   | | |
    '''   |     |   | | +-- Checksum digit (Luhn)
    '''   |     |   | +---- Citizenship (0=SA Citizen, 1=Permanent Resident)
    '''   |     |   +------ Usually 8 (historical)
    '''   |     +---------- Gender (0000-4999=Female, 5000-9999=Male)
    '''   +---------------- Date of Birth (YYMMDD)
    ''' </summary>
    Public Class SAIDValidator

        ''' <summary>
        ''' Validates a South African ID number
        ''' </summary>
        ''' <param name="idNumber">13-digit ID number to validate</param>
        ''' <returns>VerificationResult with status and extracted demographics</returns>
        Public Function Validate(idNumber As String) As VerificationResult
            Dim result As New VerificationResult()

            ' Remove any spaces or dashes
            idNumber = If(idNumber, "").Replace(" ", "").Replace("-", "").Trim()

            ' Step 1: Format check (exactly 13 numeric digits)
            If Not IsValidFormat(idNumber) Then
                result.IsValid = False
                result.Status = TrafficLightStatus.RED
                result.Message = "Invalid ID format"
                result.StatusReason = "ID number must be exactly 13 numeric digits"
                result.FormatValid = False
                Return result
            End If

            result.FormatValid = True

            ' Step 2: Extract and validate date of birth
            Dim dob As Date
            If Not TryExtractDateOfBirth(idNumber, dob) Then
                result.IsValid = False
                result.Status = TrafficLightStatus.RED
                result.Message = "Invalid date of birth"
                result.StatusReason = "The date of birth encoded in the ID number is not valid"
                Return result
            End If

            result.DateOfBirth = dob
            result.Age = CalculateAge(dob)

            ' Validate age is reasonable (0-120 years)
            If result.Age < 0 OrElse result.Age > 120 Then
                result.IsValid = False
                result.Status = TrafficLightStatus.RED
                result.Message = "Invalid date of birth"
                result.StatusReason = $"Calculated age ({result.Age}) is not valid"
                Return result
            End If

            ' Step 3: Luhn checksum validation
            If Not PassesLuhnCheck(idNumber) Then
                result.IsValid = False
                result.Status = TrafficLightStatus.RED
                result.Message = "Invalid ID checksum"
                result.StatusReason = "ID number fails Luhn checksum validation - possible fraudulent ID"
                result.LuhnValid = False
                Return result
            End If

            result.LuhnValid = True

            ' Step 4: Extract gender
            result.Gender = ExtractGender(idNumber)

            ' Step 5: Extract citizenship
            result.Citizenship = ExtractCitizenship(idNumber)

            ' All validations passed
            result.IsValid = True
            result.Status = TrafficLightStatus.GREEN
            result.Message = "ID format validated successfully"
            result.StatusReason = "Format valid, Luhn checksum passed"

            Return result
        End Function

        ''' <summary>
        ''' Checks if the ID number has valid format (13 numeric digits)
        ''' </summary>
        Private Function IsValidFormat(idNumber As String) As Boolean
            If String.IsNullOrEmpty(idNumber) Then Return False
            Return Regex.IsMatch(idNumber, "^\d{13}$")
        End Function

        ''' <summary>
        ''' Extracts date of birth from ID number
        ''' </summary>
        Private Function TryExtractDateOfBirth(idNumber As String, ByRef dob As Date) As Boolean
            Try
                Dim yearPart As Integer = CInt(idNumber.Substring(0, 2))
                Dim monthPart As Integer = CInt(idNumber.Substring(2, 2))
                Dim dayPart As Integer = CInt(idNumber.Substring(4, 2))

                ' Validate month
                If monthPart < 1 OrElse monthPart > 12 Then Return False

                ' Validate day (basic check)
                If dayPart < 1 OrElse dayPart > 31 Then Return False

                ' Determine century (people born after 2000 will have year < current year - 2000)
                Dim currentYear As Integer = DateTime.Now.Year
                Dim currentYearTwoDigit As Integer = currentYear Mod 100

                Dim fullYear As Integer
                If yearPart <= currentYearTwoDigit Then
                    fullYear = 2000 + yearPart
                Else
                    fullYear = 1900 + yearPart
                End If

                ' Try to create the date
                dob = New Date(fullYear, monthPart, dayPart)

                ' Date cannot be in the future
                If dob > DateTime.Today Then
                    ' Try 1900s instead
                    If fullYear >= 2000 Then
                        fullYear = 1900 + yearPart
                        dob = New Date(fullYear, monthPart, dayPart)
                    End If
                End If

                Return dob <= DateTime.Today

            Catch ex As Exception
                dob = Date.MinValue
                Return False
            End Try
        End Function

        ''' <summary>
        ''' Validates ID number using Luhn algorithm (Mod 10)
        ''' </summary>
        Private Function PassesLuhnCheck(idNumber As String) As Boolean
            Try
                ' Luhn algorithm for SA ID validation
                Dim total As Integer = 0

                ' Process odd-positioned digits (1, 3, 5, 7, 9, 11, 13) - sum them directly
                For i As Integer = 0 To 12 Step 2
                    total += CInt(idNumber(i).ToString())
                Next

                ' Process even-positioned digits (2, 4, 6, 8, 10, 12)
                Dim evenDigits As String = ""
                For i As Integer = 1 To 11 Step 2
                    evenDigits &= idNumber(i)
                Next

                ' Multiply the concatenated even digits by 2
                Dim doubled As Integer = CInt(evenDigits) * 2

                ' Sum all digits of the doubled result
                For Each c As Char In doubled.ToString()
                    total += CInt(c.ToString())
                Next

                ' Valid if total is divisible by 10
                Return (total Mod 10) = 0

            Catch ex As Exception
                Return False
            End Try
        End Function

        ''' <summary>
        ''' Extracts gender from ID number (positions 7-10)
        ''' 0000-4999 = Female, 5000-9999 = Male
        ''' </summary>
        Private Function ExtractGender(idNumber As String) As String
            Dim genderCode As Integer = CInt(idNumber.Substring(6, 4))
            Return If(genderCode >= 5000, "Male", "Female")
        End Function

        ''' <summary>
        ''' Extracts citizenship status from ID number (position 11)
        ''' 0 = SA Citizen, 1 = Permanent Resident
        ''' </summary>
        Private Function ExtractCitizenship(idNumber As String) As String
            Dim citizenDigit As Char = idNumber(10)
            Return If(citizenDigit = "0"c, "SA Citizen", "Permanent Resident")
        End Function

        ''' <summary>
        ''' Calculates age from date of birth
        ''' </summary>
        Private Function CalculateAge(dob As Date) As Integer
            Dim today As Date = DateTime.Today
            Dim age As Integer = today.Year - dob.Year

            If dob.Date > today.AddYears(-age) Then
                age -= 1
            End If

            Return age
        End Function

        ''' <summary>
        ''' Generates SHA-256 hash of ID number for privacy-preserving lookups
        ''' </summary>
        Public Shared Function HashIDNumber(idNumber As String) As String
            Using sha256 As System.Security.Cryptography.SHA256 = System.Security.Cryptography.SHA256.Create()
                Dim bytes As Byte() = System.Text.Encoding.UTF8.GetBytes(idNumber)
                Dim hash As Byte() = sha256.ComputeHash(bytes)
                Return BitConverter.ToString(hash).Replace("-", "").ToUpper()
            End Using
        End Function

        ''' <summary>
        ''' Generates SHA-256 hash of a password
        ''' </summary>
        Public Shared Function HashPassword(password As String) As String
            Return HashIDNumber(password) ' Same algorithm
        End Function

        ''' <summary>
        ''' Returns masked ID number for POPIA compliance (e.g., ****5012089)
        ''' </summary>
        Public Shared Function MaskIDNumber(idNumber As String) As String
            If String.IsNullOrEmpty(idNumber) OrElse idNumber.Length < 13 Then
                Return "****"
            End If
            Return "****" & idNumber.Substring(4)
        End Function

    End Class

End Namespace
