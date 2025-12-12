Imports System.Net
Imports System.Net.Http
Imports System.Web.Http
Imports System.Data.SqlClient
Imports DHA.API.Models
Imports DHA.API.Security
Imports DHA.API.Services
Imports DHA.API.DHA.API.Security
Imports DHA.API.DHA.API.Services
Imports DHA.API.DHA.API.Models

Namespace DHA.API.Controllers

    ''' <summary>
    ''' DHA Data Controller
    ''' Manages sample data in the DHA Mock database
    ''' </summary>
    <RoutePrefix("api/dha/data")>
    <ApiKeyAuth>
    Public Class DHADataController
        Inherits ApiController

        Private ReadOnly _dbService As New DHADatabaseService()

        ''' <summary>
        ''' Add a person to the DHA mock database
        ''' </summary>
        <Route("add-person")>
        <HttpPost>
        Public Function AddPerson(request As AddPersonRequest) As IHttpActionResult
            ' Validate request
            If request Is Nothing Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of AddPersonResponse).ErrorResponse("INVALID_REQUEST", "Request body is required"))
            End If

            ' Clean ID number
            Dim idNumber = request.IdNumber.Replace(" ", "").Replace("-", "").Trim()

            ' Validate ID format
            If idNumber.Length <> 13 OrElse Not IsAllDigits(idNumber) Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of AddPersonResponse).ErrorResponse("INVALID_FORMAT",
                        "ID number must be exactly 13 numeric digits"))
            End If

            ' Validate gender
            If request.Gender <> "Male" AndAlso request.Gender <> "Female" Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of AddPersonResponse).ErrorResponse("INVALID_GENDER",
                        "Gender must be 'Male' or 'Female'"))
            End If

            ' Validate citizenship
            If request.Citizenship <> "SA Citizen" AndAlso request.Citizenship <> "Permanent Resident" Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of AddPersonResponse).ErrorResponse("INVALID_CITIZENSHIP",
                        "Citizenship must be 'SA Citizen' or 'Permanent Resident'"))
            End If

            Try
                ' Create person object
                Dim person As New DHAPerson With {
                    .IdNumber = idNumber,
                    .FirstName = request.FirstName,
                    .Surname = request.Surname,
                    .DateOfBirth = request.DateOfBirth,
                    .Gender = request.Gender,
                    .Citizenship = request.Citizenship,
                    .IsDeceased = request.IsDeceased,
                    .DateOfDeath = request.DateOfDeath,
                    .IsSuspended = request.IsSuspended,
                    .SuspensionReason = request.SuspensionReason,
                    .NeedsManualReview = request.NeedsManualReview,
                    .ReviewReason = request.ReviewReason
                }

                ' Add to database
                Dim personId = _dbService.AddPerson(person)

                Dim response As New AddPersonResponse With {
                    .Success = True,
                    .PersonId = personId,
                    .Message = "Person added successfully"
                }

                Return Ok(ApiResponse(Of AddPersonResponse).SuccessResponse(response))

            Catch ex As SqlException
                If ex.Number = 50000 Then ' Custom error from stored procedure
                    Return Content(HttpStatusCode.Conflict,
                        ApiResponse(Of AddPersonResponse).ErrorResponse("DUPLICATE_ID",
                            "A person with this ID number already exists"))
                End If
                Return Content(HttpStatusCode.InternalServerError,
                    ApiResponse(Of AddPersonResponse).ErrorResponse("DATABASE_ERROR",
                        "Error adding person: " & ex.Message))
            Catch ex As Exception
                Return Content(HttpStatusCode.InternalServerError,
                    ApiResponse(Of AddPersonResponse).ErrorResponse("ERROR",
                        "Unexpected error: " & ex.Message))
            End Try
        End Function

        ''' <summary>
        ''' Add sample data (multiple people) to the database
        ''' </summary>
        <Route("add-sample-data")>
        <HttpPost>
        Public Function AddSampleData(Optional count As Integer = 10) As IHttpActionResult
            If count < 1 OrElse count > 100 Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of Object).ErrorResponse("INVALID_COUNT",
                        "Count must be between 1 and 100"))
            End If

            Dim random As New Random()
            Dim addedCount As Integer = 0
            Dim errors As New List(Of String)

            ' Sample first names
            Dim maleNames = {"John", "Michael", "David", "James", "Robert", "William", "Richard", "Joseph", "Thomas", "Christopher",
                            "Daniel", "Matthew", "Mark", "Andrew", "Steven", "Paul", "Kenneth", "Joshua", "Kevin", "Brian"}
            Dim femaleNames = {"Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen",
                              "Nancy", "Lisa", "Betty", "Margaret", "Sandra", "Ashley", "Kimberly", "Emily", "Donna", "Michelle"}

            ' Sample surnames
            Dim surnames = {"Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
                           "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee",
                           "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young"}

            For i As Integer = 1 To count
                Try
                    ' Generate random date of birth (between 18 and 80 years old)
                    Dim age = random.Next(18, 81)
                    Dim birthYear = DateTime.Now.Year - age
                    Dim birthMonth = random.Next(1, 13)
                    Dim birthDay = random.Next(1, 29) ' Avoid day 29-31 issues
                    Dim dateOfBirth As New DateTime(birthYear, birthMonth, birthDay)

                    ' Generate ID number based on date of birth
                    Dim yearPart = (birthYear Mod 100).ToString("00")
                    Dim monthPart = birthMonth.ToString("00")
                    Dim dayPart = birthDay.ToString("00")

                    ' Generate gender code (0000-4999 = Female, 5000-9999 = Male)
                    Dim gender = If(random.Next(2) = 0, "Female", "Male")
                    Dim genderCode = If(gender = "Male", random.Next(5000, 10000), random.Next(0, 5000))
                    Dim genderPart = genderCode.ToString("0000")

                    ' Citizenship (0 = SA Citizen, 1 = Permanent Resident)
                    Dim citizenshipCode = If(random.Next(10) < 9, "0", "1") ' 90% SA Citizens
                    Dim citizenship = If(citizenshipCode = "0", "SA Citizen", "Permanent Resident")

                    ' Checksum digit (simplified - in real ID this is Luhn algorithm)
                    Dim checksum = random.Next(0, 10)

                    ' Construct ID number
                    Dim idNumber = yearPart & monthPart & dayPart & genderPart & "8" & citizenshipCode & checksum.ToString()

                    ' Select name based on gender
                    Dim firstName = If(gender = "Male",
                        maleNames(random.Next(maleNames.Length)),
                        femaleNames(random.Next(femaleNames.Length)))
                    Dim surname = surnames(random.Next(surnames.Length))

                    ' Create person
                    Dim person As New DHAPerson With {
                        .IdNumber = idNumber,
                        .FirstName = firstName,
                        .Surname = surname,
                        .DateOfBirth = dateOfBirth,
                        .Gender = gender,
                        .Citizenship = citizenship,
                        .IsDeceased = False,
                        .IsSuspended = random.Next(100) < 2, ' 2% suspended
                        .NeedsManualReview = random.Next(100) < 3 ' 3% need review
                    }

                    ' Add to database
                    _dbService.AddPerson(person)
                    addedCount += 1

                Catch ex As Exception
                    errors.Add($"Error adding person {i}: {ex.Message}")
                End Try
            Next

            Dim response = New With {
                .TotalRequested = count,
                .Added = addedCount,
                .Failed = count - addedCount,
                .Errors = errors
            }

            Return Ok(ApiResponse(Of Object).SuccessResponse(response))
        End Function

        ''' <summary>
        ''' Get person by ID number
        ''' </summary>
        <Route("person/{idNumber}")>
        <HttpGet>
        Public Function GetPerson(idNumber As String) As IHttpActionResult
            If String.IsNullOrWhiteSpace(idNumber) Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of DHAPerson).ErrorResponse("INVALID_REQUEST", "ID number is required"))
            End If

            Dim cleanId = idNumber.Replace(" ", "").Replace("-", "").Trim()

            Dim person = _dbService.GetPersonByIdNumber(cleanId)

            If person Is Nothing Then
                Return Content(HttpStatusCode.NotFound,
                    ApiResponse(Of DHAPerson).ErrorResponse("NOT_FOUND", "Person not found in database"))
            End If

            Return Ok(ApiResponse(Of DHAPerson).SuccessResponse(person))
        End Function

        ''' <summary>
        ''' Test database connection
        ''' </summary>
        <Route("test-connection")>
        <HttpGet>
        Public Function TestConnection() As IHttpActionResult
            Dim result = _dbService.TestConnection()

            If result.Success Then
                Return Ok(ApiResponse(Of Object).SuccessResponse(New With {
                    .Connected = True,
                    .Message = "Database connection successful"
                }))
            Else
                Return Content(HttpStatusCode.ServiceUnavailable,
                    ApiResponse(Of Object).ErrorResponse("CONNECTION_FAILED",
                        $"Unable to connect to DHA database. Error: {result.ErrorMessage}"))
            End If
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
