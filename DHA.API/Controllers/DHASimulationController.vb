Imports System.Net
Imports System.Net.Http
Imports System.Web.Http
Imports System.Threading
Imports DHA.API.Models
Imports DHA.API.Security
Imports DHA.API.Services
Imports DHA.API.DHA.API.Models
Imports DHA.API.DHA.API.Security
Imports DHA.API.DHA.API.Services

Namespace DHA.API.Controllers

    ''' <summary>
    ''' DHA Simulation Controller
    ''' Simulates the process of ID number verification with South Africa's Home Affairs
    ''' This is a mock controller for testing and development purposes
    ''' </summary>
    <RoutePrefix("api/dha")>
    <ApiKeyAuth>
    Public Class DHASimulationController
        Inherits ApiController

        ''' <summary>
        ''' Simulate DHA ID verification
        ''' Returns detailed verification results as if from Home Affairs
        ''' Only requires ID number - no name validation is performed
        ''' </summary>
        ''' <param name="request">Verification request containing ID number (FirstName and Surname are ignored)</param>
        ''' <returns>DHA verification response with detailed information</returns>
        <Route("verify")>
        <HttpPost>
        Public Function VerifyIdNumber(request As VerificationRequest) As IHttpActionResult
            ' Validate request
            If request Is Nothing OrElse String.IsNullOrWhiteSpace(request.IdNumber) Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of DHAVerificationResponse).ErrorResponse("INVALID_REQUEST", "ID number is required"))
            End If

            ' Clean ID number
            Dim idNumber = request.IdNumber.Replace(" ", "").Replace("-", "").Trim()

            ' Basic format validation
            If idNumber.Length <> 13 OrElse Not IsAllDigits(idNumber) Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of DHAVerificationResponse).ErrorResponse("INVALID_FORMAT",
                        "ID number must be exactly 13 numeric digits"))
            End If

            ' Simulate network latency (50-300ms) - realistic DHA API delay
            Dim delayMs = New Random().Next(50, 300)
            Thread.Sleep(delayMs)

            ' Simulate DHA verification process (ID number only)
            Dim result = SimulateDHAVerification(idNumber)

            ' Return response
            Return Ok(ApiResponse(Of DHAVerificationResponse).SuccessResponse(result))
        End Function

        ''' <summary>
        ''' Simulate DHA verification with detailed scenarios (ID number only)
        ''' </summary>
        Private Function SimulateDHAVerification(idNumber As String) As DHAVerificationResponse
            Dim response As New DHAVerificationResponse()
            Dim random As New Random(idNumber.GetHashCode()) ' Deterministic randomness based on ID

            ' Extract demographics from ID number
            Dim demographics = ExtractDemographicsFromId(idNumber)

            ' Simulate various DHA response scenarios
            Dim scenario = random.Next(1, 101) ' 1-100

            Select Case scenario
                Case 1 To 3 ' 3% - ID not found in DHA database
                    response.Success = False
                    response.Verified = False
                    response.Status = "NOT_FOUND"
                    response.Message = "ID number not found in Home Affairs database"
                    response.ErrorCode = "DHA_ID_NOT_FOUND"
                    response.ErrorMessage = "The provided ID number does not exist in the Department of Home Affairs records"
                    response.NeedsManualReview = True

                Case 4 To 5 ' 2% - Deceased person
                    response.Success = True
                    response.Verified = True
                    response.Status = "VERIFIED_DECEASED"
                    response.Message = "ID verified but person is deceased"
                    response.IsDeceased = True
                    response.DateOfDeath = DateTime.Now.AddDays(-random.Next(1, 3650)) ' Random date in last 10 years
                    response.FirstName = GenerateRandomFirstName(demographics.Gender)
                    response.Surname = GenerateRandomSurname()
                    response.DateOfBirth = demographics.DateOfBirth
                    response.Gender = demographics.Gender
                    response.Citizenship = demographics.Citizenship

                Case 6 To 8 ' 3% - DHA service error
                    response.Success = False
                    response.Verified = False
                    response.Status = "SERVICE_ERROR"
                    response.Message = "DHA service temporarily unavailable"
                    response.ErrorCode = "DHA_SERVICE_ERROR"
                    response.ErrorMessage = "The Department of Home Affairs verification service is currently experiencing technical difficulties"
                    response.NeedsManualReview = True
                    response.RetryAfterSeconds = 60

                Case 9 To 10 ' 2% - ID flagged for manual review
                    response.Success = True
                    response.Verified = False
                    response.Status = "PENDING_REVIEW"
                    response.Message = "ID requires manual verification by Home Affairs"
                    response.NeedsManualReview = True
                    response.ReviewReason = "Identity verification requires additional documentation review"
                    response.EstimatedReviewDays = random.Next(3, 14)

                Case 11 To 12 ' 2% - ID suspended or flagged
                    response.Success = True
                    response.Verified = False
                    response.Status = "SUSPENDED"
                    response.Message = "ID number is suspended in Home Affairs system"
                    response.ErrorCode = "DHA_ID_SUSPENDED"
                    response.ErrorMessage = "This ID number has been flagged or suspended. Please contact Home Affairs for assistance"
                    response.NeedsManualReview = True

                Case 13 To 100 ' 88% - Successful verification
                    response.Success = True
                    response.Verified = True
                    response.Status = "VERIFIED"
                    response.Message = "ID number successfully verified with Home Affairs"
                    response.FirstName = GenerateRandomFirstName(demographics.Gender)
                    response.Surname = GenerateRandomSurname()
                    response.DateOfBirth = demographics.DateOfBirth
                    response.Gender = demographics.Gender
                    response.Citizenship = demographics.Citizenship
                    response.IsDeceased = False
                    response.VerificationDate = DateTime.UtcNow
                    response.VerificationReference = "DHA-" & Guid.NewGuid().ToString("N").Substring(0, 12).ToUpper()
            End Select

            ' Add metadata
            response.ProcessingTimeMs = New Random().Next(50, 300)
            response.Timestamp = DateTime.UtcNow
            response.RequestId = GetRequestId()

            Return response
        End Function

        ''' <summary>
        ''' Extract demographics from South African ID number
        ''' </summary>
        Private Function ExtractDemographicsFromId(idNumber As String) As DemographicsInfo
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
        ''' Generate random first name based on gender
        ''' </summary>
        Private Function GenerateRandomFirstName(gender As String) As String
            Dim maleNames = {"John", "Michael", "David", "James", "Robert", "William", "Richard", "Joseph", "Thomas", "Christopher",
                            "Daniel", "Matthew", "Mark", "Andrew", "Steven", "Paul", "Kenneth", "Joshua", "Kevin", "Brian"}
            Dim femaleNames = {"Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen",
                              "Nancy", "Lisa", "Betty", "Margaret", "Sandra", "Ashley", "Kimberly", "Emily", "Donna", "Michelle"}

            Dim names = If(gender = "Male", maleNames, femaleNames)
            Return names(New Random().Next(names.Length))
        End Function

        ''' <summary>
        ''' Generate random surname
        ''' </summary>
        Private Function GenerateRandomSurname() As String
            Dim surnames = {"Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
                           "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee",
                           "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young"}
            Return surnames(New Random().Next(surnames.Length))
        End Function

        ''' <summary>
        ''' Get request correlation ID
        ''' </summary>
        Private Function GetRequestId() As String
            If Me.Request.Properties.ContainsKey("RequestId") Then
                Return Me.Request.Properties("RequestId").ToString()
            End If
            Return Guid.NewGuid().ToString("N").Substring(0, 12).ToUpper()
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

        ''' <summary>
        ''' Get DHA service status and circuit breaker information
        ''' </summary>
        <Route("status")>
        <HttpGet>
        Public Function GetServiceStatus() As IHttpActionResult
            Dim status = DHAVerificationService.GetServiceStatus()
            Return Ok(ApiResponse(Of Object).SuccessResponse(status))
        End Function

        ''' <summary>
        ''' Simulate bulk DHA verification (up to 100 IDs)
        ''' </summary>
        <Route("verify-batch")>
        <HttpPost>
        Public Function VerifyBatch(request As BulkDHAVerificationRequest) As IHttpActionResult
            If request Is Nothing OrElse request.IdNumbers Is Nothing OrElse request.IdNumbers.Count = 0 Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of BulkDHAVerificationResponse).ErrorResponse("INVALID_REQUEST", "At least one ID number is required"))
            End If

            Const MAX_BATCH_SIZE As Integer = 100
            If request.IdNumbers.Count > MAX_BATCH_SIZE Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of BulkDHAVerificationResponse).ErrorResponse("BATCH_TOO_LARGE",
                        $"Maximum {MAX_BATCH_SIZE} IDs per batch. You sent {request.IdNumbers.Count}."))
            End If

            Dim sw = System.Diagnostics.Stopwatch.StartNew()
            Dim results As New List(Of DHAVerificationResponse)

            For Each idNumber As String In request.IdNumbers
                Dim cleanId = idNumber.Replace(" ", "").Replace("-", "").Trim()

                If cleanId.Length = 13 AndAlso IsAllDigits(cleanId) Then
                    Dim result = SimulateDHAVerification(cleanId)
                    results.Add(result)
                Else
                    results.Add(New DHAVerificationResponse With {
                        .Success = False,
                        .Verified = False,
                        .Status = "INVALID_FORMAT",
                        .Message = "Invalid ID format",
                        .ErrorCode = "INVALID_FORMAT",
                        .ErrorMessage = "ID number must be exactly 13 numeric digits"
                    })
                End If
            Next

            sw.Stop()

            Dim response As New BulkDHAVerificationResponse With {
                .TotalProcessed = request.IdNumbers.Count,
                .Results = results,
                .ProcessingTimeMs = sw.ElapsedMilliseconds,
                .Timestamp = DateTime.UtcNow
            }

            Return Ok(ApiResponse(Of BulkDHAVerificationResponse).SuccessResponse(response))
        End Function

    End Class

End Namespace
