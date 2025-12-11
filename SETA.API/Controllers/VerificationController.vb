Imports System.Net
Imports System.Net.Http
Imports System.Web.Http
Imports System.Data.SqlClient
Imports System.Configuration
Imports System.Security.Cryptography
Imports System.Text
Imports SETA.API.Models
Imports SETA.API.Security

Namespace SETA.API.Controllers

    ''' <summary>
    ''' ID Verification controller
    ''' Provides endpoints for SA ID number verification
    ''' </summary>
    <RoutePrefix("api/verification")>
    <ApiKeyAuth>
    Public Class VerificationController
        Inherits ApiController

        ''' <summary>
        ''' Verify a South African ID number
        ''' Returns traffic light status: GREEN, YELLOW, or RED
        ''' </summary>
        <Route("verify")>
        <HttpPost>
        Public Function Verify(request As VerificationRequest) As IHttpActionResult
            ' Validate request
            If request Is Nothing OrElse String.IsNullOrWhiteSpace(request.IdNumber) Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of VerificationResponse).ErrorResponse("INVALID_REQUEST", "ID number is required"))
            End If

            ' Get SETA context from API Key
            Dim setaId = CInt(Me.Request.Properties("SetaId"))
            Dim setaCode = Me.Request.Properties("SetaCode").ToString()

            ' Clean ID number
            Dim idNumber = request.IdNumber.Replace(" ", "").Replace("-", "")

            ' Step 1: Format validation
            If idNumber.Length <> 13 OrElse Not IsAllDigits(idNumber) Then
                LogVerification(setaId, idNumber, "RED", "Invalid format")
                Return Ok(ApiResponse(Of VerificationResponse).SuccessResponse(New VerificationResponse With {
                    .Status = "RED",
                    .Message = "Invalid ID format. Must be exactly 13 digits.",
                    .IsValid = False,
                    .FormatValid = False,
                    .LuhnValid = False,
                    .DhaVerified = False,
                    .DuplicateFound = False
                }))
            End If

            ' Step 2: Luhn algorithm validation
            Dim luhnValid = ValidateLuhn(idNumber)
            If Not luhnValid Then
                LogVerification(setaId, idNumber, "RED", "Luhn check failed")
                Return Ok(ApiResponse(Of VerificationResponse).SuccessResponse(New VerificationResponse With {
                    .Status = "RED",
                    .Message = "Invalid ID number. Checksum validation failed.",
                    .IsValid = False,
                    .FormatValid = True,
                    .LuhnValid = False,
                    .DhaVerified = False,
                    .DuplicateFound = False
                }))
            End If

            ' Step 3: Extract demographics
            Dim demographics = ExtractDemographics(idNumber)

            ' Step 4: Check for cross-SETA duplicates
            Dim duplicateInfo = CheckCrossSETADuplicate(idNumber, setaId)

            If duplicateInfo IsNot Nothing Then
                LogVerification(setaId, idNumber, "RED", "Duplicate found at " & duplicateInfo.SetaCode)
                Return Ok(ApiResponse(Of VerificationResponse).SuccessResponse(New VerificationResponse With {
                    .Status = "RED",
                    .Message = "Learner already registered at another SETA",
                    .IsValid = True,
                    .FormatValid = True,
                    .LuhnValid = True,
                    .DhaVerified = False,
                    .DuplicateFound = True,
                    .Demographics = demographics,
                    .ConflictingSeta = duplicateInfo
                }))
            End If

            ' Step 5: DHA verification (simulated - would call real DHA API)
            Dim dhaVerified = SimulateDHAVerification(idNumber)

            If dhaVerified Then
                LogVerification(setaId, idNumber, "GREEN", "Verified successfully")
                Return Ok(ApiResponse(Of VerificationResponse).SuccessResponse(New VerificationResponse With {
                    .Status = "GREEN",
                    .Message = "Identity verified successfully",
                    .IsValid = True,
                    .FormatValid = True,
                    .LuhnValid = True,
                    .DhaVerified = True,
                    .DuplicateFound = False,
                    .Demographics = demographics
                }))
            Else
                LogVerification(setaId, idNumber, "YELLOW", "DHA verification pending")
                Return Ok(ApiResponse(Of VerificationResponse).SuccessResponse(New VerificationResponse With {
                    .Status = "YELLOW",
                    .Message = "ID format valid but DHA verification pending",
                    .IsValid = True,
                    .FormatValid = True,
                    .LuhnValid = True,
                    .DhaVerified = False,
                    .DuplicateFound = False,
                    .Demographics = demographics
                }))
            End If
        End Function

        ''' <summary>
        ''' Quick format validation only (no DHA check)
        ''' </summary>
        <Route("validate-format")>
        <HttpPost>
        Public Function ValidateFormat(request As VerificationRequest) As IHttpActionResult
            If request Is Nothing OrElse String.IsNullOrWhiteSpace(request.IdNumber) Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of VerificationResponse).ErrorResponse("INVALID_REQUEST", "ID number is required"))
            End If

            Dim idNumber = request.IdNumber.Replace(" ", "").Replace("-", "")

            ' Format check
            Dim formatValid = idNumber.Length = 13 AndAlso IsAllDigits(idNumber)

            ' Luhn check
            Dim luhnValid = If(formatValid, ValidateLuhn(idNumber), False)

            ' Extract demographics if valid
            Dim demographics As DemographicsInfo = Nothing
            If formatValid AndAlso luhnValid Then
                demographics = ExtractDemographics(idNumber)
            End If

            Return Ok(ApiResponse(Of VerificationResponse).SuccessResponse(New VerificationResponse With {
                .Status = If(formatValid AndAlso luhnValid, "GREEN", "RED"),
                .Message = If(formatValid AndAlso luhnValid, "ID format is valid", "Invalid ID format or checksum"),
                .IsValid = formatValid AndAlso luhnValid,
                .FormatValid = formatValid,
                .LuhnValid = luhnValid,
                .DhaVerified = False,
                .DuplicateFound = False,
                .Demographics = demographics
            }))
        End Function

        ''' <summary>
        ''' Get recent verification attempts for a SETA
        ''' </summary>
        <Route("recent/{setaId:int}")>
        <HttpGet>
        Public Function GetRecentVerifications(setaId As Integer) As IHttpActionResult
            ' Validate SETA access
            Dim apiKeySetaId = CInt(Me.Request.Properties("SetaId"))
            If apiKeySetaId <> setaId Then
                Return Content(HttpStatusCode.Forbidden,
                    ApiResponse(Of Object).ErrorResponse("ACCESS_DENIED", "Cannot access other SETA's data"))
            End If

            Dim verifications = GetRecentVerificationsFromDB(setaId, 50)
            Return Ok(ApiResponse(Of Object).SuccessResponse(verifications))
        End Function

        ''' <summary>
        ''' Validate using Luhn algorithm
        ''' </summary>
        Private Function ValidateLuhn(idNumber As String) As Boolean
            Dim sum As Integer = 0
            Dim alternate As Boolean = False

            For i As Integer = idNumber.Length - 1 To 0 Step -1
                Dim digit As Integer = Integer.Parse(idNumber(i).ToString())

                If alternate Then
                    digit *= 2
                    If digit > 9 Then
                        digit -= 9
                    End If
                End If

                sum += digit
                alternate = Not alternate
            Next

            Return (sum Mod 10 = 0)
        End Function

        ''' <summary>
        ''' Extract demographic information from ID number
        ''' </summary>
        Private Function ExtractDemographics(idNumber As String) As DemographicsInfo
            ' Extract date of birth (YYMMDD)
            Dim year = Integer.Parse(idNumber.Substring(0, 2))
            Dim month = Integer.Parse(idNumber.Substring(2, 2))
            Dim day = Integer.Parse(idNumber.Substring(4, 2))

            ' Determine century
            Dim currentYear = DateTime.Now.Year Mod 100
            Dim fullYear = If(year <= currentYear, 2000 + year, 1900 + year)

            Dim dateOfBirth As New DateTime(fullYear, month, day)

            ' Gender (digits 7-10: 0000-4999 = Female, 5000-9999 = Male)
            Dim genderCode = Integer.Parse(idNumber.Substring(6, 4))
            Dim gender = If(genderCode >= 5000, "Male", "Female")

            ' Citizenship (digit 11: 0 = SA Citizen, 1 = Permanent Resident)
            Dim citizenship = If(idNumber(10) = "0"c, "SA Citizen", "Permanent Resident")

            ' Calculate age
            Dim age = DateTime.Now.Year - dateOfBirth.Year
            If DateTime.Now.DayOfYear < dateOfBirth.DayOfYear Then
                age -= 1
            End If

            Return New DemographicsInfo With {
                .DateOfBirth = dateOfBirth.ToString("yyyy-MM-dd"),
                .Gender = gender,
                .Citizenship = citizenship,
                .Age = age
            }
        End Function

        ''' <summary>
        ''' Check for duplicate registration across all SETAs
        ''' </summary>
        Private Function CheckCrossSETADuplicate(idNumber As String, requestingSetaId As Integer) As ConflictInfo
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString
            Dim idHash = ComputeSha256Hash(idNumber)

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                Dim sql As String = "
                    SELECT idx.RegisteredSETAID, s.SETACode, s.SETAName, idx.RegistrationDate
                    FROM LearnerIDIndex idx
                    INNER JOIN SETAs s ON idx.RegisteredSETAID = s.SETAID
                    WHERE idx.IDNumberHash = @IDHash
                      AND idx.RegisteredSETAID <> @RequestingSETA
                      AND idx.IsActive = 1"

                Using cmd As New SqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@IDHash", idHash)
                    cmd.Parameters.AddWithValue("@RequestingSETA", requestingSetaId)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        If reader.Read() Then
                            Return New ConflictInfo With {
                                .SetaId = reader.GetInt32(0),
                                .SetaCode = reader.GetString(1),
                                .SetaName = reader.GetString(2),
                                .RegistrationDate = If(reader.IsDBNull(3), Nothing, reader.GetDateTime(3))
                            }
                        End If
                    End Using
                End Using
            End Using

            Return Nothing
        End Function

        ''' <summary>
        ''' Simulate DHA verification (would call real API in production)
        ''' </summary>
        Private Function SimulateDHAVerification(idNumber As String) As Boolean
            ' In production, this would call the actual DHA API
            ' For now, simulate with 90% success rate
            Return New Random().Next(1, 11) <= 9
        End Function

        ''' <summary>
        ''' Log verification attempt
        ''' </summary>
        Private Sub LogVerification(setaId As Integer, idNumber As String, status As String, message As String)
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString
            Dim idHash = ComputeSha256Hash(idNumber)

            Try
                Using conn As New SqlConnection(connectionString)
                    conn.Open()

                    Dim sql As String = "
                        INSERT INTO VerificationLog (RequestingSETAID, IDNumberHash, Status, Message, VerifiedAt)
                        VALUES (@SETAID, @IDHash, @Status, @Message, GETDATE())"

                    Using cmd As New SqlCommand(sql, conn)
                        cmd.Parameters.AddWithValue("@SETAID", setaId)
                        cmd.Parameters.AddWithValue("@IDHash", idHash)
                        cmd.Parameters.AddWithValue("@Status", status)
                        cmd.Parameters.AddWithValue("@Message", message)
                        cmd.ExecuteNonQuery()
                    End Using
                End Using
            Catch ex As Exception
                System.Diagnostics.Debug.WriteLine("Failed to log verification: " & ex.Message)
            End Try
        End Sub

        ''' <summary>
        ''' Get recent verifications from database
        ''' </summary>
        Private Function GetRecentVerificationsFromDB(setaId As Integer, limit As Integer) As List(Of Object)
            Dim results As New List(Of Object)
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                Dim sql As String = "
                    SELECT TOP (@Limit) LogID, Status, Message, VerifiedAt
                    FROM VerificationLog
                    WHERE RequestingSETAID = @SETAID
                    ORDER BY VerifiedAt DESC"

                Using cmd As New SqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@Limit", limit)
                    cmd.Parameters.AddWithValue("@SETAID", setaId)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        While reader.Read()
                            results.Add(New With {
                                .LogId = reader.GetInt64(0),
                                .Status = reader.GetString(1),
                                .Message = reader.GetString(2),
                                .VerifiedAt = reader.GetDateTime(3)
                            })
                        End While
                    End Using
                End Using
            End Using

            Return results
        End Function

        ''' <summary>
        ''' Compute SHA256 hash (VARBINARY)
        ''' </summary>
        Private Function ComputeSha256Hash(input As String) As Byte()
            Using sha256 As SHA256 = SHA256.Create()
                Return sha256.ComputeHash(Encoding.UTF8.GetBytes(input))
            End Using
        End Function

        ''' <summary>
        ''' Check if all characters in a string are digits
        ''' </summary>
        Private Function IsAllDigits(input As String) As Boolean
            For Each c As Char In input
                If Not Char.IsDigit(c) Then
                    Return False
                End If
            Next
            Return True
        End Function

    End Class

End Namespace
