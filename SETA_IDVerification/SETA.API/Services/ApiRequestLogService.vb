Imports System.Data.SqlClient
Imports System.Configuration
Imports System.Threading.Tasks

Namespace Services

    ''' <summary>
    ''' Service for logging API requests for monitoring and rate limiting
    ''' </summary>
    Public Class ApiRequestLogService

        Private Shared ReadOnly ConnectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

        ''' <summary>
        ''' Log an API request asynchronously
        ''' </summary>
        Public Shared Sub LogRequestAsync(apiKeyId As Integer, endpoint As String, method As String,
                                          responseStatus As Integer, responseTimeMs As Integer,
                                          ipAddress As String, Optional requestBody As String = Nothing)
            Task.Run(Sub()
                         Try
                             LogRequest(apiKeyId, endpoint, method, responseStatus, responseTimeMs, ipAddress, requestBody)
                         Catch ex As Exception
                             System.Diagnostics.Debug.WriteLine("API request log failed: " & ex.Message)
                         End Try
                     End Sub)
        End Sub

        ''' <summary>
        ''' Log an API request synchronously
        ''' </summary>
        Public Shared Sub LogRequest(apiKeyId As Integer, endpoint As String, method As String,
                                     responseStatus As Integer, responseTimeMs As Integer,
                                     ipAddress As String, Optional requestBody As String = Nothing)
            Try
                Using conn As New SqlConnection(ConnectionString)
                    conn.Open()

                    Dim sql As String = "
                        INSERT INTO ApiRequestLog
                            (ApiKeyID, Endpoint, Method, RequestBody, ResponseStatus, ResponseTime, IPAddress, RequestedAt)
                        VALUES
                            (@ApiKeyID, @Endpoint, @Method, @RequestBody, @ResponseStatus, @ResponseTime, @IPAddress, GETDATE())"

                    Using cmd As New SqlCommand(sql, conn)
                        cmd.Parameters.AddWithValue("@ApiKeyID", apiKeyId)
                        cmd.Parameters.AddWithValue("@Endpoint", If(endpoint, DBNull.Value))
                        cmd.Parameters.AddWithValue("@Method", If(method, DBNull.Value))
                        cmd.Parameters.AddWithValue("@RequestBody", If(String.IsNullOrEmpty(requestBody), DBNull.Value, MaskSensitiveData(requestBody)))
                        cmd.Parameters.AddWithValue("@ResponseStatus", responseStatus)
                        cmd.Parameters.AddWithValue("@ResponseTime", responseTimeMs)
                        cmd.Parameters.AddWithValue("@IPAddress", If(ipAddress, DBNull.Value))
                        cmd.ExecuteNonQuery()
                    End Using
                End Using
            Catch ex As Exception
                System.Diagnostics.Debug.WriteLine("API request log error: " & ex.Message)
            End Try
        End Sub

        ''' <summary>
        ''' Check if rate limit is exceeded for an API key
        ''' </summary>
        Public Shared Function IsRateLimitExceeded(apiKeyId As Integer, rateLimit As Integer) As Boolean
            Try
                Using conn As New SqlConnection(ConnectionString)
                    conn.Open()

                    Dim sql As String = "
                        SELECT COUNT(*)
                        FROM ApiRequestLog
                        WHERE ApiKeyID = @ApiKeyID
                          AND RequestedAt >= DATEADD(HOUR, -1, GETDATE())"

                    Using cmd As New SqlCommand(sql, conn)
                        cmd.Parameters.AddWithValue("@ApiKeyID", apiKeyId)
                        Dim count = CInt(cmd.ExecuteScalar())
                        Return count >= rateLimit
                    End Using
                End Using
            Catch ex As Exception
                System.Diagnostics.Debug.WriteLine("Rate limit check error: " & ex.Message)
                Return False ' Don't block on error
            End Try
        End Function

        ''' <summary>
        ''' Get request count for last hour
        ''' </summary>
        Public Shared Function GetRequestCountLastHour(apiKeyId As Integer) As Integer
            Try
                Using conn As New SqlConnection(ConnectionString)
                    conn.Open()

                    Dim sql As String = "
                        SELECT COUNT(*)
                        FROM ApiRequestLog
                        WHERE ApiKeyID = @ApiKeyID
                          AND RequestedAt >= DATEADD(HOUR, -1, GETDATE())"

                    Using cmd As New SqlCommand(sql, conn)
                        cmd.Parameters.AddWithValue("@ApiKeyID", apiKeyId)
                        Return CInt(cmd.ExecuteScalar())
                    End Using
                End Using
            Catch ex As Exception
                Return 0
            End Try
        End Function

        ''' <summary>
        ''' Mask sensitive data in request body (ID numbers, passwords)
        ''' </summary>
        Private Shared Function MaskSensitiveData(requestBody As String) As String
            If String.IsNullOrEmpty(requestBody) Then Return requestBody

            ' Mask ID numbers (13 digits)
            Dim masked = System.Text.RegularExpressions.Regex.Replace(
                requestBody,
                """idNumber""\s*:\s*""(\d{4})\d{5}(\d{4})""",
                """idNumber"": ""$1*****$2""",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase)

            ' Mask passwords
            masked = System.Text.RegularExpressions.Regex.Replace(
                masked,
                """password""\s*:\s*""[^""]+""",
                """password"": ""********""",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase)

            Return masked
        End Function

    End Class

End Namespace
