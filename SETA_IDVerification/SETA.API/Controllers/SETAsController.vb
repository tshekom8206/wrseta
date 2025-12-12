Imports System.Net
Imports System.Net.Http
Imports System.Web.Http
Imports System.Data.SqlClient
Imports System.Configuration
Imports SETA.API.Models
Imports SETA.API.Security

Namespace SETA.API.Controllers

    ''' <summary>
    ''' SETA lookup and reference data controller
    ''' </summary>
    <RoutePrefix("api/setas")>
    <ApiKeyAuth>
    Public Class SETAsController
        Inherits ApiController

        ''' <summary>
        ''' Get all active SETAs
        ''' </summary>
        <Route("")>
        <HttpGet>
        Public Function GetAll() As IHttpActionResult
            Dim setas = GetAllSETAsFromDB()
            Return Ok(ApiResponse(Of Object).SuccessResponse(setas))
        End Function

        ''' <summary>
        ''' Get SETA by code (e.g., "WRSETA", "MICT")
        ''' </summary>
        <Route("{code}")>
        <HttpGet>
        Public Function GetByCode(code As String) As IHttpActionResult
            If String.IsNullOrWhiteSpace(code) Then
                Return Content(HttpStatusCode.BadRequest,
                    ApiResponse(Of SetaInfo).ErrorResponse("INVALID_CODE", "SETA code is required"))
            End If

            Dim seta = GetSETAByCode(code.ToUpper())
            If seta Is Nothing Then
                Return Content(HttpStatusCode.NotFound,
                    ApiResponse(Of SetaInfo).ErrorResponse("NOT_FOUND", "SETA not found"))
            End If

            Return Ok(ApiResponse(Of SetaInfo).SuccessResponse(seta))
        End Function

        ''' <summary>
        ''' Get all provinces
        ''' </summary>
        <Route("provinces")>
        <HttpGet>
        Public Function GetProvinces() As IHttpActionResult
            Dim provinces = GetProvincesFromDB()
            Return Ok(ApiResponse(Of Object).SuccessResponse(provinces))
        End Function

        ''' <summary>
        ''' Get current SETA context (from API key)
        ''' </summary>
        <Route("current")>
        <HttpGet>
        Public Function GetCurrent() As IHttpActionResult
            Dim setaId = CInt(Me.Request.Properties("SetaId"))
            Dim setaCode = Me.Request.Properties("SetaCode").ToString()

            Dim seta = GetSETAById(setaId)
            Return Ok(ApiResponse(Of SetaInfo).SuccessResponse(seta))
        End Function

        ''' <summary>
        ''' Get all SETAs from database
        ''' </summary>
        Private Function GetAllSETAsFromDB() As List(Of SetaInfo)
            Dim setas As New List(Of SetaInfo)
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                Dim sql As String = "
                    SELECT SETAID, SETACode, SETAName, Sector, IsActive
                    FROM SETAs
                    WHERE IsActive = 1
                    ORDER BY SETACode"

                Using cmd As New SqlCommand(sql, conn)
                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        While reader.Read()
                            setas.Add(New SetaInfo With {
                                .SetaId = reader.GetInt32(0),
                                .SetaCode = reader.GetString(1),
                                .SetaName = reader.GetString(2),
                                .Sector = If(reader.IsDBNull(3), "", reader.GetString(3)),
                                .IsActive = reader.GetBoolean(4)
                            })
                        End While
                    End Using
                End Using
            End Using

            Return setas
        End Function

        ''' <summary>
        ''' Get SETA by code
        ''' </summary>
        Private Function GetSETAByCode(code As String) As SetaInfo
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                Dim sql As String = "
                    SELECT SETAID, SETACode, SETAName, Sector, IsActive
                    FROM SETAs
                    WHERE SETACode = @Code"

                Using cmd As New SqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@Code", code)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        If reader.Read() Then
                            Return New SetaInfo With {
                                .SetaId = reader.GetInt32(0),
                                .SetaCode = reader.GetString(1),
                                .SetaName = reader.GetString(2),
                                .Sector = If(reader.IsDBNull(3), "", reader.GetString(3)),
                                .IsActive = reader.GetBoolean(4)
                            }
                        End If
                    End Using
                End Using
            End Using

            Return Nothing
        End Function

        ''' <summary>
        ''' Get SETA by ID
        ''' </summary>
        Private Function GetSETAById(id As Integer) As SetaInfo
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                Dim sql As String = "
                    SELECT SETAID, SETACode, SETAName, Sector, IsActive
                    FROM SETAs
                    WHERE SETAID = @ID"

                Using cmd As New SqlCommand(sql, conn)
                    cmd.Parameters.AddWithValue("@ID", id)

                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        If reader.Read() Then
                            Return New SetaInfo With {
                                .SetaId = reader.GetInt32(0),
                                .SetaCode = reader.GetString(1),
                                .SetaName = reader.GetString(2),
                                .Sector = If(reader.IsDBNull(3), "", reader.GetString(3)),
                                .IsActive = reader.GetBoolean(4)
                            }
                        End If
                    End Using
                End Using
            End Using

            Return Nothing
        End Function

        ''' <summary>
        ''' Get all provinces from database
        ''' </summary>
        Private Function GetProvincesFromDB() As List(Of ProvinceInfo)
            Dim provinces As New List(Of ProvinceInfo)
            Dim connectionString As String = ConfigurationManager.ConnectionStrings("SETAConnection").ConnectionString

            Using conn As New SqlConnection(connectionString)
                conn.Open()

                Dim sql As String = "
                    SELECT ProvinceCode, ProvinceName
                    FROM Provinces
                    ORDER BY ProvinceName"

                Using cmd As New SqlCommand(sql, conn)
                    Using reader As SqlDataReader = cmd.ExecuteReader()
                        While reader.Read()
                            provinces.Add(New ProvinceInfo With {
                                .ProvinceCode = reader.GetString(0),
                                .ProvinceName = reader.GetString(1)
                            })
                        End While
                    End Using
                End Using
            End Using

            Return provinces
        End Function

    End Class

End Namespace
