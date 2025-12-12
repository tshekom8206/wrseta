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
