Imports System.Threading

Namespace DHA.API.Services

    ''' <summary>
    ''' Circuit Breaker for DHA (Department of Home Affairs) API
    ''' Implements resilience pattern to handle DHA API unavailability
    ''' States: CLOSED (normal) -> OPEN (failing) -> HALF-OPEN (testing recovery)
    ''' </summary>
    Public Class DHACircuitBreaker

        Private Shared ReadOnly _lock As New Object()

        ' Circuit breaker state
        Private Shared _state As CircuitState = CircuitState.Closed
        Private Shared _failureCount As Integer = 0
        Private Shared _lastFailureTime As DateTime = DateTime.MinValue
        Private Shared _lastSuccessTime As DateTime = DateTime.Now

        ' Configuration
        Private Const FAILURE_THRESHOLD As Integer = 5          ' Failures before opening
        Private Const OPEN_TIMEOUT_SECONDS As Integer = 300     ' 5 minutes before half-open
        Private Const HALF_OPEN_SUCCESS_THRESHOLD As Integer = 2 ' Successes needed to close

        Private Shared _halfOpenSuccessCount As Integer = 0

        Public Enum CircuitState
            Closed     ' Normal operation - calls go through
            Open       ' Failing - calls are blocked
            HalfOpen   ' Testing recovery - limited calls allowed
        End Enum

        ''' <summary>
        ''' Get current circuit state
        ''' </summary>
        Public Shared ReadOnly Property State As CircuitState
            Get
                SyncLock _lock
                    ' Check if we should transition from Open to HalfOpen
                    If _state = CircuitState.Open Then
                        If (DateTime.Now - _lastFailureTime).TotalSeconds >= OPEN_TIMEOUT_SECONDS Then
                            _state = CircuitState.HalfOpen
                            _halfOpenSuccessCount = 0
                            System.Diagnostics.Debug.WriteLine("DHA Circuit Breaker: Transitioning to HALF-OPEN")
                        End If
                    End If
                    Return _state
                End SyncLock
            End Get
        End Property

        ''' <summary>
        ''' Check if circuit allows the call
        ''' </summary>
        Public Shared Function AllowCall() As Boolean
            SyncLock _lock
                Select Case State
                    Case CircuitState.Closed
                        Return True
                    Case CircuitState.Open
                        Return False
                    Case CircuitState.HalfOpen
                        ' Allow limited calls in half-open state
                        Return True
                    Case Else
                        Return True
                End Select
            End SyncLock
        End Function

        ''' <summary>
        ''' Record a successful DHA call
        ''' </summary>
        Public Shared Sub RecordSuccess()
            SyncLock _lock
                _lastSuccessTime = DateTime.Now

                Select Case _state
                    Case CircuitState.HalfOpen
                        _halfOpenSuccessCount += 1
                        If _halfOpenSuccessCount >= HALF_OPEN_SUCCESS_THRESHOLD Then
                            _state = CircuitState.Closed
                            _failureCount = 0
                            System.Diagnostics.Debug.WriteLine("DHA Circuit Breaker: Transitioning to CLOSED (recovered)")
                        End If
                    Case CircuitState.Closed
                        ' Reset failure count on success
                        If _failureCount > 0 Then
                            _failureCount = Math.Max(0, _failureCount - 1)
                        End If
                End Select
            End SyncLock
        End Sub

        ''' <summary>
        ''' Record a failed DHA call
        ''' </summary>
        Public Shared Sub RecordFailure()
            SyncLock _lock
                _failureCount += 1
                _lastFailureTime = DateTime.Now

                Select Case _state
                    Case CircuitState.Closed
                        If _failureCount >= FAILURE_THRESHOLD Then
                            _state = CircuitState.Open
                            System.Diagnostics.Debug.WriteLine("DHA Circuit Breaker: Transitioning to OPEN (failures: " & _failureCount & ")")
                        End If
                    Case CircuitState.HalfOpen
                        ' Any failure in half-open goes back to open
                        _state = CircuitState.Open
                        _halfOpenSuccessCount = 0
                        System.Diagnostics.Debug.WriteLine("DHA Circuit Breaker: Transitioning back to OPEN (half-open failure)")
                End Select
            End SyncLock
        End Sub

        ''' <summary>
        ''' Get circuit breaker status for monitoring
        ''' </summary>
        Public Shared Function GetStatus() As Object
            SyncLock _lock
                Return New With {
                    .state = _state.ToString(),
                    .failureCount = _failureCount,
                    .lastFailure = If(_lastFailureTime = DateTime.MinValue, Nothing, _lastFailureTime),
                    .lastSuccess = _lastSuccessTime,
                    .failureThreshold = FAILURE_THRESHOLD,
                    .openTimeoutSeconds = OPEN_TIMEOUT_SECONDS,
                    .halfOpenSuccessCount = _halfOpenSuccessCount,
                    .halfOpenSuccessThreshold = HALF_OPEN_SUCCESS_THRESHOLD
                }
            End SyncLock
        End Function

        ''' <summary>
        ''' Manually reset the circuit breaker (for admin use)
        ''' </summary>
        Public Shared Sub Reset()
            SyncLock _lock
                _state = CircuitState.Closed
                _failureCount = 0
                _halfOpenSuccessCount = 0
                System.Diagnostics.Debug.WriteLine("DHA Circuit Breaker: Manually reset to CLOSED")
            End SyncLock
        End Sub

        ''' <summary>
        ''' Get reason message when circuit is open
        ''' </summary>
        Public Shared Function GetOpenReason() As String
            SyncLock _lock
                If _state = CircuitState.Open Then
                    Dim secondsRemaining = OPEN_TIMEOUT_SECONDS - (DateTime.Now - _lastFailureTime).TotalSeconds
                    Return $"DHA service temporarily unavailable. Retry in {Math.Max(0, CInt(secondsRemaining))} seconds."
                End If
                Return Nothing
            End SyncLock
        End Function

    End Class

End Namespace
