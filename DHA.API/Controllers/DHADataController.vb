Imports System.Net
Imports System.Net.Http
Imports System.Web.Http
Imports System.Data.SqlClient
Imports System.Linq
Imports DHA.API.Security
Imports DHA.API.Services
Imports DHA.API.Models
Imports DHA.API.DHA.API.Models
Imports DHA.API.DHA.API.Security
Imports DHA.API.DHA.API.Services

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
                    .Race = request.Race,
                    .IssueDate = request.IssueDate,
                    .MaritalStatus = request.MaritalStatus,
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

            ' South African names - diverse representation
            ' African names (Zulu, Xhosa, Sotho, Tswana, etc.)
            Dim africanMaleNames = {"Thabo", "Sipho", "Mandla", "Bongani", "Sibusiso", "Lungile", "Mpho", "Kagiso", "Tshepo", "Kgosi",
                                   "Nkosi", "Dumisani", "Sizwe", "Lwandle", "Ayanda", "Zola", "Vusi", "Sifiso", "Themba", "Jabulani",
                                   "Lucky", "Bheki", "Mthunzi", "Sanele", "Nhlanhla", "Sanele", "Lwazi", "Mxolisi", "Siphiwe", "Nkululeko"}
            Dim africanFemaleNames = {"Nomsa", "Thandi", "Zanele", "Ntombi", "Nolwazi", "Sibongile", "Nokuthula", "Lindiwe", "Nomvula", "Nompumelelo",
                                     "Puleng", "Mpho", "Kgomotso", "Boitumelo", "Tshegofatso", "Refilwe", "Kelebogile", "Lesego", "Kagiso", "Lerato",
                                     "Nthabiseng", "Thandeka", "Noluthando", "Nokwanda", "Nokukhanya", "Nolwandle", "Siphokazi", "Nolubabalo", "Noluthando", "Nokulunga"}

            ' Afrikaans names
            Dim afrikaansMaleNames = {"Johan", "Pieter", "Andries", "Willem", "Stefan", "Hendrik", "Frik", "Dirk", "Kobus", "Gert",
                                     "Barend", "Cornelius", "Eugene", "Francois", "Hannes", "Jacques", "Karel", "Louis", "Marius", "Nico"}
            Dim afrikaansFemaleNames = {"Maria", "Anna", "Elize", "Petronella", "Susanna", "Magdalena", "Johanna", "Catharina", "Willemiena", "Cornelia",
                                       "Elsa", "Hester", "Jacoba", "Margaretha", "Sara", "Wilhelmina", "Aletta", "Christina", "Elizabeth", "Frederika"}

            ' English names (common in SA)
            Dim englishMaleNames = {"John", "Michael", "David", "James", "Robert", "William", "Richard", "Joseph", "Thomas", "Christopher",
                                   "Daniel", "Matthew", "Mark", "Andrew", "Steven", "Paul", "Kenneth", "Joshua", "Kevin", "Brian"}
            Dim englishFemaleNames = {"Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen",
                                     "Nancy", "Lisa", "Betty", "Margaret", "Sandra", "Ashley", "Kimberly", "Emily", "Donna", "Michelle"}

            ' Indian/South Asian names
            Dim indianMaleNames = {"Rajesh", "Kumar", "Vishal", "Amit", "Ravi", "Sunil", "Naresh", "Prakash", "Suresh", "Manoj",
                                  "Arjun", "Rohan", "Dev", "Kiran", "Nikhil", "Rahul", "Vikram", "Anil", "Deepak", "Ganesh"}
            Dim indianFemaleNames = {"Priya", "Kavita", "Sunita", "Anita", "Meera", "Radha", "Lakshmi", "Sita", "Geeta", "Rekha",
                                    "Neha", "Pooja", "Divya", "Shreya", "Anjali", "Kiran", "Nisha", "Ritu", "Swati", "Vidya"}

            ' Surnames from all communities
            Dim africanSurnames = {"Mthembu", "Dlamini", "Mkhize", "Ndlovu", "Zulu", "Khumalo", "Molefe", "Mokoena", "Sithole", "Nkosi",
                                  "Mabena", "Maseko", "Mabaso", "Mnguni", "Ntuli", "Buthelezi", "Mthethwa", "Gumede", "Mabuyakhulu", "Mthembu"}
            Dim afrikaansSurnames = {"Van der Merwe", "Botha", "Van Wyk", "Du Plessis", "Fourie", "Smit", "Van Niekerk", "Meyer", "De Villiers", "Coetzee",
                                    "Van Zyl", "Steyn", "Venter", "Nel", "Pretorius", "Kruger", "Van den Berg", "Viljoen", "Swart", "Van Rensburg"}
            Dim englishSurnames = {"Smith", "Johnson", "Williams", "Brown", "Jones", "Taylor", "Wilson", "Anderson", "Thomas", "Jackson",
                                   "White", "Harris", "Martin", "Thompson", "Garcia", "Martinez", "Robinson", "Clark", "Rodriguez", "Lewis"}
            Dim indianSurnames = {"Naidoo", "Pillay", "Reddy", "Govender", "Singh", "Khan", "Patel", "Maharaj", "Moodley", "Ramdass",
                                 "Nair", "Krishnan", "Sharma", "Desai", "Mehta", "Agarwal", "Kapoor", "Gupta", "Malhotra", "Bhatt"}

            ' Combine all names using List approach (more compatible with VB.NET)
            Dim allMaleNamesList As New List(Of String)
            allMaleNamesList.AddRange(africanMaleNames)
            allMaleNamesList.AddRange(afrikaansMaleNames)
            allMaleNamesList.AddRange(englishMaleNames)
            allMaleNamesList.AddRange(indianMaleNames)
            Dim allMaleNames = allMaleNamesList.ToArray()

            Dim allFemaleNamesList As New List(Of String)
            allFemaleNamesList.AddRange(africanFemaleNames)
            allFemaleNamesList.AddRange(afrikaansFemaleNames)
            allFemaleNamesList.AddRange(englishFemaleNames)
            allFemaleNamesList.AddRange(indianFemaleNames)
            Dim allFemaleNames = allFemaleNamesList.ToArray()

            Dim allSurnamesList As New List(Of String)
            allSurnamesList.AddRange(africanSurnames)
            allSurnamesList.AddRange(afrikaansSurnames)
            allSurnamesList.AddRange(englishSurnames)
            allSurnamesList.AddRange(indianSurnames)
            Dim allSurnames = allSurnamesList.ToArray()

            For i As Integer = 1 To count
                Try
                    ' Generate random date of birth (between 18 and 80 years old)
                    Dim age = random.Next(18, 81)
                    Dim birthYear = DateTime.Now.Year - age
                    Dim birthMonth = random.Next(1, 13)
                    Dim maxDay = DateTime.DaysInMonth(birthYear, birthMonth)
                    Dim birthDay = random.Next(1, maxDay + 1)
                    Dim dateOfBirth As New DateTime(birthYear, birthMonth, birthDay)

                    ' Generate gender
                    Dim gender = If(random.Next(2) = 0, "Female", "Male")

                    ' Generate South African ID number using dedicated method
                    Dim idNumberResult = GenerateSouthAfricanIdNumber(dateOfBirth, gender, random)
                    Dim idNumber = idNumberResult.IdNumber
                    Dim citizenship = idNumberResult.Citizenship

                    ' Validate ID number length before saving
                    If idNumber.Length <> 13 Then
                        errors.Add($"Person {i}: Generated invalid ID length ({idNumber.Length} digits): {idNumber}. Expected 13 digits.")
                        System.Diagnostics.Debug.WriteLine($"[AddSampleData] ERROR: Person {i}: Invalid ID length: {idNumber} (Length: {idNumber.Length})")
                        Continue For
                    End If

                    ' Debug: Log the generated ID
                    System.Diagnostics.Debug.WriteLine($"[AddSampleData] Person {i}: Generated ID: {idNumber} (Length: {idNumber.Length})")

                    ' Select name based on gender
                    Dim firstName = If(gender = "Male",
                        allMaleNames(random.Next(allMaleNames.Length)),
                        allFemaleNames(random.Next(allFemaleNames.Length)))
                    Dim surname = allSurnames(random.Next(allSurnames.Length))

                    ' Generate race (South African population groups)
                    Dim races = {"Black", "White", "Coloured", "Indian/Asian", "Other"}
                    Dim race = races(random.Next(races.Length))

                    ' Generate issue date (typically 16-18 years after birth for first ID)
                    Dim issueDate As DateTime? = Nothing
                    If age >= 16 Then
                        Dim issueYear = birthYear + random.Next(16, Math.Min(age + 3, 25))
                        Dim issueMonth = random.Next(1, 13)
                        Dim issueMaxDay = DateTime.DaysInMonth(issueYear, issueMonth)
                        Dim issueDay = random.Next(1, issueMaxDay + 1)
                        issueDate = New DateTime(issueYear, issueMonth, issueDay)
                    End If

                    ' Generate marital status (age-based probability)
                    Dim maritalStatuses = {"Single", "Married", "Divorced", "Widowed"}
                    Dim maritalStatus As String = "Single"
                    If age >= 18 Then
                        Dim statusRoll = random.Next(100)
                        If age >= 25 AndAlso statusRoll < 60 Then
                            maritalStatus = "Married"
                        ElseIf age >= 30 AndAlso statusRoll < 75 Then
                            maritalStatus = "Married"
                        ElseIf age >= 40 AndAlso statusRoll < 5 Then
                            maritalStatus = "Divorced"
                        ElseIf age >= 60 AndAlso statusRoll < 3 Then
                            maritalStatus = "Widowed"
                        End If
                    End If

                    ' Create person
                    Dim person As New DHAPerson With {
                        .IdNumber = idNumber,
                        .FirstName = firstName,
                        .Surname = surname,
                        .DateOfBirth = dateOfBirth,
                        .Gender = gender,
                        .Citizenship = citizenship,
                        .Race = race,
                        .IssueDate = issueDate,
                        .MaritalStatus = maritalStatus,
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
        ''' Generate a South African ID number according to the official format
        ''' Format: YYMMDD GGGG CAZ (13 digits total, no spaces)
        ''' Based on regex pattern: /(([0-9]{2})(0|1)([0-9])([0-3])([0-9]))([ ]?)(([0-9]{4})([ ]?)([0-1][8]([ ]?)[0-9]))/
        '''
        ''' YYMMDD: Year (last 2 digits), Month (01-12), Day (01-31)
        ''' GGGG: Gender sequence - 0000-4999 = Female, 5000-9999 = Male
        ''' C: Citizenship - 0 = SA Citizen, 1 = Permanent Resident
        ''' A: Race indicator - always 8
        ''' Z: Luhn checksum digit
        ''' </summary>
        ''' <param name="dateOfBirth">Date of birth for the person</param>
        ''' <param name="gender">Gender: "Male" or "Female"</param>
        ''' <param name="random">Random number generator</param>
        ''' <returns>Tuple containing the 13-digit ID number and citizenship string</returns>
        Private Function GenerateSouthAfricanIdNumber(dateOfBirth As DateTime, gender As String, random As Random) As (IdNumber As String, Citizenship As String)
            ' Extract date components
            Dim birthYear = dateOfBirth.Year
            Dim birthMonth = dateOfBirth.Month
            Dim birthDay = dateOfBirth.Day

            ' YY: Year (last 2 digits) - 2 digits
            Dim yearLastTwo = birthYear Mod 100
            Dim yearPart As String = yearLastTwo.ToString().PadLeft(2, "0"c)
            If yearPart.Length <> 2 Then
                Throw New InvalidOperationException($"Year part invalid: '{yearPart}' (Length: {yearPart.Length}, from year {birthYear})")
            End If

            ' MM: Month (01-12) - 2 digits
            Dim monthPart As String = birthMonth.ToString().PadLeft(2, "0"c)
            If monthPart.Length <> 2 Then
                Throw New InvalidOperationException($"Month part invalid: '{monthPart}' (Length: {monthPart.Length}, from month {birthMonth})")
            End If

            ' DD: Day (01-31) - 2 digits
            Dim dayPart As String = birthDay.ToString().PadLeft(2, "0"c)
            If dayPart.Length <> 2 Then
                Throw New InvalidOperationException($"Day part invalid: '{dayPart}' (Length: {dayPart.Length}, from day {birthDay})")
            End If

            ' GGGG: Gender/Sequence (4 digits) - 0000-4999 = Female, 5000-9999 = Male
            Dim genderSequence As Integer
            If gender = "Male" Then
                genderSequence = random.Next(5000, 10000) ' Male: 5000-9999
            Else
                genderSequence = random.Next(0, 5000) ' Female: 0000-4999
            End If
            Dim genderPart As String = genderSequence.ToString().PadLeft(4, "0"c)
            If genderPart.Length <> 4 Then
                Throw New InvalidOperationException($"Gender part invalid: '{genderPart}' (Length: {genderPart.Length}, from sequence {genderSequence})")
            End If

            ' C: Citizenship (0 = SA Citizen, 1 = Permanent Resident) - 1 digit
            Dim citizenshipCode As String = If(random.Next(10) < 9, "0", "1") ' 90% SA Citizens
            Dim citizenship As String = If(citizenshipCode = "0", "SA Citizen", "Permanent Resident")
            If String.IsNullOrEmpty(citizenshipCode) OrElse citizenshipCode.Length <> 1 Then
                Throw New InvalidOperationException($"Citizenship code invalid: '{citizenshipCode}' (Length: {If(citizenshipCode IsNot Nothing, citizenshipCode.Length, 0)})")
            End If

            ' A: Race indicator (always 8) - 1 digit
            Dim raceIndicator = "8"
            If raceIndicator.Length <> 1 Then
                Throw New InvalidOperationException($"Race indicator invalid: {raceIndicator}")
            End If

            ' Debug: Log each part BEFORE concatenation to identify the issue
            System.Diagnostics.Debug.WriteLine($"[GenerateSouthAfricanIdNumber] Date: {dateOfBirth:yyyy-MM-dd}, Gender: {gender}")
            System.Diagnostics.Debug.WriteLine($"[GenerateSouthAfricanIdNumber] Parts BEFORE concat - YY: '{yearPart}' (Len:{yearPart.Length}), MM: '{monthPart}' (Len:{monthPart.Length}), DD: '{dayPart}' (Len:{dayPart.Length}), GGGG: '{genderPart}' (Len:{genderPart.Length}), C: '{citizenshipCode}' (Len:{citizenshipCode.Length}), A: '{raceIndicator}' (Len:{raceIndicator.Length})")

            ' Additional validation: ensure all parts are non-empty and correct length
            If String.IsNullOrEmpty(yearPart) OrElse yearPart.Length <> 2 Then
                Throw New InvalidOperationException($"Year part invalid: '{yearPart}' (Length: {If(yearPart IsNot Nothing, yearPart.Length, 0)})")
            End If
            If String.IsNullOrEmpty(monthPart) OrElse monthPart.Length <> 2 Then
                Throw New InvalidOperationException($"Month part invalid: '{monthPart}' (Length: {If(monthPart IsNot Nothing, monthPart.Length, 0)})")
            End If
            If String.IsNullOrEmpty(dayPart) OrElse dayPart.Length <> 2 Then
                Throw New InvalidOperationException($"Day part invalid: '{dayPart}' (Length: {If(dayPart IsNot Nothing, dayPart.Length, 0)})")
            End If
            If String.IsNullOrEmpty(genderPart) OrElse genderPart.Length <> 4 Then
                Throw New InvalidOperationException($"Gender part invalid: '{genderPart}' (Length: {If(genderPart IsNot Nothing, genderPart.Length, 0)})")
            End If
            If String.IsNullOrEmpty(citizenshipCode) OrElse citizenshipCode.Length <> 1 Then
                Throw New InvalidOperationException($"Citizenship code invalid: '{citizenshipCode}' (Length: {If(citizenshipCode IsNot Nothing, citizenshipCode.Length, 0)})")
            End If
            If String.IsNullOrEmpty(raceIndicator) OrElse raceIndicator.Length <> 1 Then
                Throw New InvalidOperationException($"Race indicator invalid: '{raceIndicator}' (Length: {If(raceIndicator IsNot Nothing, raceIndicator.Length, 0)})")
            End If

            ' Construct ID number without checksum (12 digits: YYMMDDGGGGCA)
            ' Use String.Format to ensure proper formatting
            Dim idWithoutChecksum = String.Format("{0}{1}{2}{3}{4}{5}", yearPart, monthPart, dayPart, genderPart, citizenshipCode, raceIndicator)

            ' Debug: Log the combined result
            System.Diagnostics.Debug.WriteLine($"[GenerateSouthAfricanIdNumber] Combined: '{idWithoutChecksum}' (Length: {idWithoutChecksum.Length})")

            ' Validate we have exactly 12 digits before checksum
            If idWithoutChecksum.Length <> 12 Then
                Throw New InvalidOperationException($"Invalid ID base length: {idWithoutChecksum.Length}. Expected 12 digits. Value: '{idWithoutChecksum}'. Parts were: YY='{yearPart}', MM='{monthPart}', DD='{dayPart}', GGGG='{genderPart}', C='{citizenshipCode}', A='{raceIndicator}'")
            End If

            ' Calculate Luhn checksum digit
            Dim checksum = CalculateLuhnChecksum(idWithoutChecksum)

            ' Complete ID number (should be exactly 13 digits)
            Dim idNumber = idWithoutChecksum & checksum.ToString()

            ' Final validation - must be exactly 13 digits
            If idNumber.Length <> 13 Then
                Throw New InvalidOperationException($"Invalid final ID length: {idNumber.Length}. Expected 13 digits. Value: {idNumber}")
            End If

            ' Validate format matches regex pattern: YYMMDDGGGGCAZ
            ' Pattern: /(([0-9]{2})(0|1)([0-9])([0-3])([0-9]))([ ]?)(([0-9]{4})([ ]?)([0-1][8]([ ]?)[0-9]))/
            ' Simplified validation: 13 digits, position 10 (C) is 0 or 1, position 11 (A) is 8
            If Not IsAllDigits(idNumber) Then
                Throw New InvalidOperationException($"ID number contains non-digit characters: {idNumber}")
            End If

            Dim citizenshipDigit = idNumber(10).ToString()
            Dim raceDigit = idNumber(11).ToString()

            If citizenshipDigit <> "0" AndAlso citizenshipDigit <> "1" Then
                Throw New InvalidOperationException($"Invalid citizenship digit at position 10: {citizenshipDigit}. Must be 0 or 1. ID: {idNumber}")
            End If

            If raceDigit <> "8" Then
                Throw New InvalidOperationException($"Invalid race indicator at position 11: {raceDigit}. Must be 8. ID: {idNumber}")
            End If

            ' Debug output for verification
            System.Diagnostics.Debug.WriteLine($"[GenerateSouthAfricanIdNumber] Generated: {idNumber} | Format: YY={idNumber.Substring(0, 2)} MM={idNumber.Substring(2, 2)} DD={idNumber.Substring(4, 2)} GGGG={idNumber.Substring(6, 4)} C={idNumber.Substring(10, 1)} A={idNumber.Substring(11, 1)} Z={idNumber.Substring(12, 1)}")

            Return (idNumber, citizenship)
        End Function

        ''' <summary>
        ''' Calculate Luhn checksum digit for South African ID number
        ''' </summary>
        Private Function CalculateLuhnChecksum(idNumber As String) As Integer
            Dim sum As Integer = 0
            Dim isEvenPosition As Boolean = False

            ' Process from right to left (excluding the checksum digit we're calculating)
            For i As Integer = idNumber.Length - 1 To 0 Step -1
                Dim digit As Integer = Integer.Parse(idNumber(i).ToString())

                If isEvenPosition Then
                    digit *= 2
                    If digit > 9 Then
                        digit = digit Mod 10 + 1
                    End If
                End If

                sum += digit
                isEvenPosition = Not isEvenPosition
            Next

            ' Calculate checksum digit
            Dim checksum = (10 - (sum Mod 10)) Mod 10
            Return checksum
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
