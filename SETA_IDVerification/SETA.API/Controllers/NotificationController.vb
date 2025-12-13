Imports System
Imports System.Net
Imports System.Net.Http
Imports System.Web.Http
Imports System.Web.Http.Cors
Imports SETA.API.Models
Imports SETA.API.Services

Namespace Controllers
    ''' <summary>
    ''' Controller for in-app notification operations
    ''' </summary>
    <RoutePrefix("api/notifications")>
    <EnableCors("*", "*", "*")>
    Public Class NotificationController
        Inherits ApiController

        Private ReadOnly _notificationService As InAppNotificationService

        Public Sub New()
            _notificationService = New InAppNotificationService()
        End Sub

        ''' <summary>
        ''' Gets notifications for a user
        ''' </summary>
        ''' <param name="userId">The user ID</param>
        ''' <param name="limit">Maximum number of notifications to return (default 20)</param>
        ''' <returns>List of notifications</returns>
        <HttpGet>
        <Route("")>
        Public Function GetNotifications(<FromUri> userId As String, Optional limit As Integer = 20) As IHttpActionResult
            Try
                If String.IsNullOrEmpty(userId) Then
                    Return BadRequest("userId is required")
                End If

                If limit < 1 Then limit = 20
                If limit > 50 Then limit = 50

                Dim response = _notificationService.GetNotifications(userId, limit)
                Return Ok(response)
            Catch ex As Exception
                Console.WriteLine($"[NotificationController] Error getting notifications: {ex.Message}")
                Return InternalServerError(New Exception("Failed to get notifications"))
            End Try
        End Function

        ''' <summary>
        ''' Gets the unread notification count for a user
        ''' </summary>
        ''' <param name="userId">The user ID</param>
        ''' <returns>Unread count</returns>
        <HttpGet>
        <Route("unread-count")>
        Public Function GetUnreadCount(<FromUri> userId As String) As IHttpActionResult
            Try
                If String.IsNullOrEmpty(userId) Then
                    Return BadRequest("userId is required")
                End If

                Dim count = _notificationService.GetUnreadCount(userId)
                Return Ok(New UnreadCountResponse() With {
                    .UnreadCount = count
                })
            Catch ex As Exception
                Console.WriteLine($"[NotificationController] Error getting unread count: {ex.Message}")
                Return InternalServerError(New Exception("Failed to get unread count"))
            End Try
        End Function

        ''' <summary>
        ''' Marks a notification as read
        ''' </summary>
        ''' <param name="notificationId">The notification ID</param>
        ''' <param name="userId">The user ID</param>
        ''' <returns>Success status</returns>
        <HttpPost>
        <Route("{notificationId}/read")>
        Public Function MarkAsRead(notificationId As String, <FromUri> userId As String) As IHttpActionResult
            Try
                If String.IsNullOrEmpty(notificationId) Then
                    Return BadRequest("notificationId is required")
                End If

                If String.IsNullOrEmpty(userId) Then
                    Return BadRequest("userId is required")
                End If

                Dim success = _notificationService.MarkAsRead(userId, notificationId)

                If success Then
                    Return Ok(New With {.success = True, .message = "Notification marked as read"})
                Else
                    Return NotFound()
                End If
            Catch ex As Exception
                Console.WriteLine($"[NotificationController] Error marking as read: {ex.Message}")
                Return InternalServerError(New Exception("Failed to mark notification as read"))
            End Try
        End Function

        ''' <summary>
        ''' Marks all notifications as read for a user
        ''' </summary>
        ''' <param name="userId">The user ID</param>
        ''' <returns>Success status</returns>
        <HttpPost>
        <Route("read-all")>
        Public Function MarkAllAsRead(<FromUri> userId As String) As IHttpActionResult
            Try
                If String.IsNullOrEmpty(userId) Then
                    Return BadRequest("userId is required")
                End If

                _notificationService.MarkAllAsRead(userId)
                Return Ok(New With {.success = True, .message = "All notifications marked as read"})
            Catch ex As Exception
                Console.WriteLine($"[NotificationController] Error marking all as read: {ex.Message}")
                Return InternalServerError(New Exception("Failed to mark all notifications as read"))
            End Try
        End Function

        ''' <summary>
        ''' Deletes a notification
        ''' </summary>
        ''' <param name="notificationId">The notification ID</param>
        ''' <param name="userId">The user ID</param>
        ''' <returns>Success status</returns>
        <HttpDelete>
        <Route("{notificationId}")>
        Public Function DeleteNotification(notificationId As String, <FromUri> userId As String) As IHttpActionResult
            Try
                If String.IsNullOrEmpty(notificationId) Then
                    Return BadRequest("notificationId is required")
                End If

                If String.IsNullOrEmpty(userId) Then
                    Return BadRequest("userId is required")
                End If

                Dim success = _notificationService.DeleteNotification(userId, notificationId)

                If success Then
                    Return Ok(New With {.success = True, .message = "Notification deleted"})
                Else
                    Return NotFound()
                End If
            Catch ex As Exception
                Console.WriteLine($"[NotificationController] Error deleting notification: {ex.Message}")
                Return InternalServerError(New Exception("Failed to delete notification"))
            End Try
        End Function

        ''' <summary>
        ''' Clears all notifications for a user
        ''' </summary>
        ''' <param name="userId">The user ID</param>
        ''' <returns>Success status</returns>
        <HttpDelete>
        <Route("")>
        Public Function ClearAllNotifications(<FromUri> userId As String) As IHttpActionResult
            Try
                If String.IsNullOrEmpty(userId) Then
                    Return BadRequest("userId is required")
                End If

                _notificationService.ClearAllNotifications(userId)
                Return Ok(New With {.success = True, .message = "All notifications cleared"})
            Catch ex As Exception
                Console.WriteLine($"[NotificationController] Error clearing notifications: {ex.Message}")
                Return InternalServerError(New Exception("Failed to clear notifications"))
            End Try
        End Function
    End Class
End Namespace
