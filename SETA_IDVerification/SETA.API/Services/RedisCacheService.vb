Imports System
Imports System.Configuration
Imports StackExchange.Redis
Imports Newtonsoft.Json
Imports SETA.API.Models

Namespace Services

    ''' <summary>
    ''' Redis cache service for DHA person data
    ''' Provides caching layer to reduce DHA API calls and improve response times
    ''' </summary>
    Public Class RedisCacheService

        Private Shared _connectionMultiplexer As ConnectionMultiplexer
        Private Shared _isConnected As Boolean = False
        Private Shared _lastConnectionAttempt As DateTime = DateTime.MinValue
        Private Shared _lastConnectionError As String = ""
        Private Shared ReadOnly _connectionRetryInterval As TimeSpan = TimeSpan.FromSeconds(30)
        Private Shared ReadOnly _lock As New Object()

        Private Shared ReadOnly REDIS_CONNECTION_STRING As String = ConfigurationManager.AppSettings("RedisConnectionString")
        Private Shared ReadOnly CACHE_EXPIRY_MINUTES As Integer = If(Integer.TryParse(ConfigurationManager.AppSettings("RedisCacheExpiryMinutes"), 0), 1440, 1440)
        Private Const KEY_PREFIX As String = "dha:person:"

        ''' <summary>
        ''' Initialize Redis connection (lazy singleton)
        ''' </summary>
        Private Shared Sub EnsureConnection()
            If _isConnected AndAlso _connectionMultiplexer IsNot Nothing AndAlso _connectionMultiplexer.IsConnected Then
                Return
            End If

            SyncLock _lock
                ' Check again inside lock
                If _isConnected AndAlso _connectionMultiplexer IsNot Nothing AndAlso _connectionMultiplexer.IsConnected Then
                    Return
                End If

                ' Avoid rapid reconnection attempts
                If DateTime.UtcNow - _lastConnectionAttempt < _connectionRetryInterval Then
                    Return
                End If

                _lastConnectionAttempt = DateTime.UtcNow

                Try
                    Dim options = ConfigurationOptions.Parse(If(String.IsNullOrEmpty(REDIS_CONNECTION_STRING), "localhost:6379", REDIS_CONNECTION_STRING))
                    options.AbortOnConnectFail = False
                    options.ConnectTimeout = 5000
                    options.SyncTimeout = 3000

                    _connectionMultiplexer = ConnectionMultiplexer.Connect(options)
                    _isConnected = _connectionMultiplexer.IsConnected
                    System.Diagnostics.Debug.WriteLine("Redis connected: " & _isConnected)
                Catch ex As Exception
                    _isConnected = False
                    _lastConnectionError = ex.Message
                    System.Diagnostics.Debug.WriteLine("Redis connection failed: " & ex.Message)
                End Try
            End SyncLock
        End Sub

        ''' <summary>
        ''' Get database instance
        ''' </summary>
        Private Shared Function GetDatabase() As IDatabase
            EnsureConnection()
            If _connectionMultiplexer Is Nothing OrElse Not _connectionMultiplexer.IsConnected Then
                Return Nothing
            End If
            Return _connectionMultiplexer.GetDatabase()
        End Function

        ''' <summary>
        ''' Get cached person data by ID number
        ''' </summary>
        Public Shared Function GetPersonData(idNumber As String) As CachedDHAPersonData
            Try
                Dim db = GetDatabase()
                If db Is Nothing Then
                    Return Nothing
                End If

                Dim key = KEY_PREFIX & idNumber
                Dim value = db.StringGet(key)

                If value.IsNullOrEmpty Then
                    Return Nothing
                End If

                Dim cached = JsonConvert.DeserializeObject(Of CachedDHAPersonData)(value)

                ' Check if expired
                If cached IsNot Nothing AndAlso cached.ExpiresAt < DateTime.UtcNow Then
                    ' Remove expired entry
                    db.KeyDelete(key)
                    Return Nothing
                End If

                cached.Source = "CACHE"
                Return cached
            Catch ex As Exception
                System.Diagnostics.Debug.WriteLine("Redis GetPersonData error: " & ex.Message)
                Return Nothing
            End Try
        End Function

        ''' <summary>
        ''' Cache person data
        ''' </summary>
        Public Shared Sub SetPersonData(idNumber As String, personData As DHAPersonData)
            Try
                Dim db = GetDatabase()
                If db Is Nothing Then
                    Return
                End If

                Dim key = KEY_PREFIX & idNumber
                Dim cached As New CachedDHAPersonData With {
                    .Data = personData,
                    .CachedAt = DateTime.UtcNow,
                    .ExpiresAt = DateTime.UtcNow.AddMinutes(CACHE_EXPIRY_MINUTES),
                    .Source = "DHA_API"
                }

                Dim json = JsonConvert.SerializeObject(cached)
                db.StringSet(key, json, TimeSpan.FromMinutes(CACHE_EXPIRY_MINUTES))
            Catch ex As Exception
                System.Diagnostics.Debug.WriteLine("Redis SetPersonData error: " & ex.Message)
            End Try
        End Sub

        ''' <summary>
        ''' Remove cached person data
        ''' </summary>
        Public Shared Function RemovePersonData(idNumber As String) As Boolean
            Try
                Dim db = GetDatabase()
                If db Is Nothing Then
                    Return False
                End If

                Dim key = KEY_PREFIX & idNumber
                Return db.KeyDelete(key)
            Catch ex As Exception
                System.Diagnostics.Debug.WriteLine("Redis RemovePersonData error: " & ex.Message)
                Return False
            End Try
        End Function

        ''' <summary>
        ''' Check if Redis is available
        ''' </summary>
        Public Shared Function IsAvailable() As Boolean
            EnsureConnection()
            Return _isConnected AndAlso _connectionMultiplexer IsNot Nothing AndAlso _connectionMultiplexer.IsConnected
        End Function

        ''' <summary>
        ''' Get cache status information
        ''' </summary>
        Public Shared Function GetStatus() As Object
            EnsureConnection()
            Return New With {
                .isConnected = _isConnected,
                .connectionString = If(String.IsNullOrEmpty(REDIS_CONNECTION_STRING), "localhost:6379", REDIS_CONNECTION_STRING),
                .cacheExpiryMinutes = CACHE_EXPIRY_MINUTES,
                .lastConnectionAttempt = _lastConnectionAttempt,
                .lastConnectionError = _lastConnectionError
            }
        End Function

    End Class

End Namespace
