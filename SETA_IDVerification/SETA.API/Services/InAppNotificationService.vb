Imports System
Imports System.Configuration
Imports System.Collections.Generic
Imports Newtonsoft.Json
Imports StackExchange.Redis
Imports SETA.API.Models

Namespace Services
    ''' <summary>
    ''' Manages in-app notifications stored in Redis
    ''' </summary>
    Public Class InAppNotificationService
        Private ReadOnly _redis As ConnectionMultiplexer
        Private ReadOnly _db As IDatabase
        Private Const NOTIFICATIONS_PREFIX As String = "notifications:"
        Private ReadOnly _maxPerUser As Integer
        Private ReadOnly _retentionDays As Integer

        Public Sub New()
            Dim connectionString = ConfigurationManager.AppSettings("RedisConnectionString")
            _redis = ConnectionMultiplexer.Connect(connectionString)
            _db = _redis.GetDatabase()

            _maxPerUser = Integer.Parse(If(ConfigurationManager.AppSettings("NotificationMaxPerUser"), "50"))
            _retentionDays = Integer.Parse(If(ConfigurationManager.AppSettings("NotificationRetentionDays"), "7"))
        End Sub

        ''' <summary>
        ''' Adds a notification for a user
        ''' </summary>
        Public Sub AddNotification(userId As String, notification As InAppNotification)
            If String.IsNullOrEmpty(userId) Then
                Throw New ArgumentException("User ID is required")
            End If

            notification.UserId = userId
            notification.CreatedAt = DateTime.UtcNow
            If String.IsNullOrEmpty(notification.Id) Then
                notification.Id = Guid.NewGuid().ToString()
            End If

            Dim key As StackExchange.Redis.RedisKey = New StackExchange.Redis.RedisKey(NOTIFICATIONS_PREFIX & userId)
            Dim json As StackExchange.Redis.RedisValue = New StackExchange.Redis.RedisValue(JsonConvert.SerializeObject(notification))

            ' Add to list (LPUSH for most recent first)
            _db.ListLeftPush(key, json)

            ' Trim to max notifications
            _db.ListTrim(key, 0, _maxPerUser - 1)

            ' Set expiry
            _db.KeyExpire(key, TimeSpan.FromDays(_retentionDays))

            Console.WriteLine($"[Notification] Added notification for user {userId}: {notification.Title}")
        End Sub

        ''' <summary>
        ''' Gets notifications for a user
        ''' </summary>
        Public Function GetNotifications(userId As String, Optional limit As Integer = 20) As NotificationListResponse
            If String.IsNullOrEmpty(userId) Then
                Return New NotificationListResponse() With {
                    .Notifications = New List(Of InAppNotification)(),
                    .UnreadCount = 0,
                    .TotalCount = 0
                }
            End If

            Dim key As StackExchange.Redis.RedisKey = New StackExchange.Redis.RedisKey(NOTIFICATIONS_PREFIX & userId)
            Dim items As StackExchange.Redis.RedisValue() = _db.ListRange(key, 0, limit - 1)
            Dim notifications As List(Of InAppNotification) = New List(Of InAppNotification)()
            Dim unreadCount As Integer = 0

            For Each item As StackExchange.Redis.RedisValue In items
                Try
                    Dim notification As InAppNotification = JsonConvert.DeserializeObject(Of InAppNotification)(item.ToString())
                    notifications.Add(notification)
                    If Not notification.Read Then
                        unreadCount += 1
                    End If
                Catch
                    ' Skip invalid items
                End Try
            Next

            Dim totalCount As Integer = CInt(_db.ListLength(key))

            Return New NotificationListResponse() With {
                .Notifications = notifications,
                .UnreadCount = unreadCount,
                .TotalCount = totalCount
            }
        End Function

        ''' <summary>
        ''' Gets unread notification count for a user
        ''' </summary>
        Public Function GetUnreadCount(userId As String) As Integer
            If String.IsNullOrEmpty(userId) Then
                Return 0
            End If

            Dim key As StackExchange.Redis.RedisKey = New StackExchange.Redis.RedisKey(NOTIFICATIONS_PREFIX & userId)
            Dim items As StackExchange.Redis.RedisValue() = _db.ListRange(key, 0, _maxPerUser - 1)
            Dim unreadCount As Integer = 0

            For Each item As StackExchange.Redis.RedisValue In items
                Try
                    Dim notification As InAppNotification = JsonConvert.DeserializeObject(Of InAppNotification)(item.ToString())
                    If Not notification.Read Then
                        unreadCount += 1
                    End If
                Catch
                    ' Skip invalid items
                End Try
            Next

            Return unreadCount
        End Function

        ''' <summary>
        ''' Marks a specific notification as read
        ''' </summary>
        Public Function MarkAsRead(userId As String, notificationId As String) As Boolean
            If String.IsNullOrEmpty(userId) OrElse String.IsNullOrEmpty(notificationId) Then
                Return False
            End If

            Dim key As StackExchange.Redis.RedisKey = New StackExchange.Redis.RedisKey(NOTIFICATIONS_PREFIX & userId)
            Dim items As StackExchange.Redis.RedisValue() = _db.ListRange(key, 0, -1)

            For i As Integer = 0 To items.Length - 1
                Try
                    Dim notification As InAppNotification = JsonConvert.DeserializeObject(Of InAppNotification)(items(i).ToString())
                    If notification.Id = notificationId Then
                        notification.Read = True
                        Dim updatedJson As StackExchange.Redis.RedisValue = New StackExchange.Redis.RedisValue(JsonConvert.SerializeObject(notification))
                        _db.ListSetByIndex(key, i, updatedJson)
                        Return True
                    End If
                Catch
                    ' Skip invalid items
                End Try
            Next

            Return False
        End Function

        ''' <summary>
        ''' Marks all notifications as read for a user
        ''' </summary>
        Public Sub MarkAllAsRead(userId As String)
            If String.IsNullOrEmpty(userId) Then
                Return
            End If

            Dim key As StackExchange.Redis.RedisKey = New StackExchange.Redis.RedisKey(NOTIFICATIONS_PREFIX & userId)
            Dim items As StackExchange.Redis.RedisValue() = _db.ListRange(key, 0, -1)

            For i As Integer = 0 To items.Length - 1
                Try
                    Dim notification As InAppNotification = JsonConvert.DeserializeObject(Of InAppNotification)(items(i).ToString())
                    If Not notification.Read Then
                        notification.Read = True
                        Dim updatedJson As StackExchange.Redis.RedisValue = New StackExchange.Redis.RedisValue(JsonConvert.SerializeObject(notification))
                        _db.ListSetByIndex(key, i, updatedJson)
                    End If
                Catch
                    ' Skip invalid items
                End Try
            Next
        End Sub

        ''' <summary>
        ''' Deletes a notification
        ''' </summary>
        Public Function DeleteNotification(userId As String, notificationId As String) As Boolean
            If String.IsNullOrEmpty(userId) OrElse String.IsNullOrEmpty(notificationId) Then
                Return False
            End If

            Dim key As StackExchange.Redis.RedisKey = New StackExchange.Redis.RedisKey(NOTIFICATIONS_PREFIX & userId)
            Dim items As StackExchange.Redis.RedisValue() = _db.ListRange(key, 0, -1)

            For Each item As StackExchange.Redis.RedisValue In items
                Try
                    Dim notification As InAppNotification = JsonConvert.DeserializeObject(Of InAppNotification)(item.ToString())
                    If notification.Id = notificationId Then
                        _db.ListRemove(key, item, 1)
                        Return True
                    End If
                Catch
                    ' Skip invalid items
                End Try
            Next

            Return False
        End Function

        ''' <summary>
        ''' Clears all notifications for a user
        ''' </summary>
        Public Sub ClearAllNotifications(userId As String)
            If String.IsNullOrEmpty(userId) Then
                Return
            End If

            Dim key As String = NOTIFICATIONS_PREFIX & userId
            _db.KeyDelete(New StackExchange.Redis.RedisKey(key))
        End Sub
    End Class
End Namespace
