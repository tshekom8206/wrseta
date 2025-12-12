Imports System.Data.SqlClient
Imports System.Configuration
Imports DHA.API.Models
Imports DHA.API.DHA.API.Models

Namespace DHA.API.Services

    ''' <summary>
    ''' Service for accessing DHA Mock Database
    ''' Provides methods to interact with the simulated Home Affairs database
    ''' </summary>
    Public Class DHADatabaseService

        Private ReadOnly _connectionString As String

        Public Sub New()
            _connectionString = ConfigurationManager.ConnectionStrings("DHAConnection")?.ConnectionString
            If String.IsNullOrEmpty(_connectionString) Then
                Throw New ConfigurationErrorsException("Connection string 'DHAConnection' not found in App.config")
            End If

            ' Log connection string for debugging (without sensitive info)
            Dim safeConnectionString = _connectionString
            If safeConnectionString.Contains("Password") Then
                safeConnectionString = "***REDACTED***"
            End If
            System.Diagnostics.Debug.WriteLine($"[DHADatabaseService] Connection string: {safeConnectionString}")
        End Sub

        ''' <summary>
        ''' Get person information by ID number
        ''' </summary>
        Public Function GetPersonByIdNumber(idNumber As String) As DHAPerson
            Using conn As New SqlConnection(_connectionString)
                conn.Open()
                Using cmd As New SqlCommand("sp_GetPersonByIdNumber", conn)
                    cmd.CommandType = CommandType.StoredProcedure
                    cmd.Parameters.AddWithValue("@IdNumber", idNumber)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        If reader.Read() Then
                            Return New DHAPerson With {
                                .PersonId = reader.GetInt32(0),
                                .IdNumber = reader.GetString(1),
                                .FirstName = reader.GetString(2),
                                .Surname = reader.GetString(3),
                                .DateOfBirth = reader.GetDateTime(4),
                                .Gender = reader.GetString(5),
                                .Citizenship = reader.GetString(6),
                                .IsDeceased = reader.GetBoolean(7),
                                .DateOfDeath = If(reader.IsDBNull(8), Nothing, reader.GetDateTime(8)),
                                .IsSuspended = reader.GetBoolean(9),
                                .SuspensionReason = If(reader.IsDBNull(10), Nothing, reader.GetString(10)),
                                .NeedsManualReview = reader.GetBoolean(11),
                                .ReviewReason = If(reader.IsDBNull(12), Nothing, reader.GetString(12)),
                                .CreatedAt = reader.GetDateTime(13),
                                .UpdatedAt = reader.GetDateTime(14)
                            }
                        End If
                    End Using
                End Using
            End Using

            Return Nothing
        End Function

        ''' <summary>
        ''' Add a new person to the database
        ''' </summary>
        Public Function AddPerson(person As DHAPerson) As Integer
            Using conn As New SqlConnection(_connectionString)
                conn.Open()
                Using cmd As New SqlCommand("sp_AddPerson", conn)
                    cmd.CommandType = CommandType.StoredProcedure
                    cmd.Parameters.AddWithValue("@IdNumber", person.IdNumber)
                    cmd.Parameters.AddWithValue("@FirstName", person.FirstName)
                    cmd.Parameters.AddWithValue("@Surname", person.Surname)
                    cmd.Parameters.AddWithValue("@DateOfBirth", person.DateOfBirth)
                    cmd.Parameters.AddWithValue("@Gender", person.Gender)
                    cmd.Parameters.AddWithValue("@Citizenship", person.Citizenship)
                    cmd.Parameters.AddWithValue("@IsDeceased", person.IsDeceased)
                    cmd.Parameters.AddWithValue("@DateOfDeath", If(person.DateOfDeath.HasValue, CObj(person.DateOfDeath.Value), DBNull.Value))
                    cmd.Parameters.AddWithValue("@IsSuspended", person.IsSuspended)
                    cmd.Parameters.AddWithValue("@SuspensionReason", If(person.SuspensionReason, DBNull.Value))
                    cmd.Parameters.AddWithValue("@NeedsManualReview", person.NeedsManualReview)
                    cmd.Parameters.AddWithValue("@ReviewReason", If(person.ReviewReason, DBNull.Value))

                    Dim personIdParam As New SqlParameter("@PersonId", SqlDbType.Int)
                    personIdParam.Direction = ParameterDirection.Output
                    cmd.Parameters.Add(personIdParam)

                    cmd.ExecuteNonQuery()

                    Return CInt(personIdParam.Value)
                End Using
            End Using
        End Function

        ''' <summary>
        ''' Log a verification request
        ''' </summary>
        Public Sub LogVerification(idNumber As String, status As String, Optional verificationReference As String = Nothing,
                                   Optional requestId As String = Nothing, Optional processingTimeMs As Integer? = Nothing,
                                   Optional errorMessage As String = Nothing, Optional clientIp As String = Nothing)
            Try
                Using conn As New SqlConnection(_connectionString)
                    conn.Open()
                    Using cmd As New SqlCommand("sp_LogVerification", conn)
                        cmd.CommandType = CommandType.StoredProcedure
                        cmd.Parameters.AddWithValue("@IdNumber", idNumber)
                        cmd.Parameters.AddWithValue("@VerificationStatus", status)
                        cmd.Parameters.AddWithValue("@VerificationReference", If(verificationReference, DBNull.Value))
                        cmd.Parameters.AddWithValue("@RequestId", If(requestId, DBNull.Value))
                        cmd.Parameters.AddWithValue("@ProcessingTimeMs", If(processingTimeMs.HasValue, CObj(processingTimeMs.Value), DBNull.Value))
                        cmd.Parameters.AddWithValue("@ErrorMessage", If(errorMessage, DBNull.Value))
                        cmd.Parameters.AddWithValue("@ClientIp", If(clientIp, DBNull.Value))

                        cmd.ExecuteNonQuery()
                    End Using
                End Using
            Catch ex As Exception
                System.Diagnostics.Debug.WriteLine("Failed to log verification: " & ex.Message)
            End Try
        End Sub

        ''' <summary>
        ''' Test database connectivity with detailed error information
        ''' </summary>
        Public Function TestConnection() As (Success As Boolean, ErrorMessage As String)
            Try
                Using conn As New SqlConnection(_connectionString)
                    conn.Open()
                    Using cmd As New SqlCommand("SELECT 1", conn)
                        cmd.ExecuteScalar()
                    End Using
                End Using
                Return (True, Nothing)
            Catch ex As Exception
                Return (False, ex.Message)
            End Try
        End Function

    End Class

End Namespace
