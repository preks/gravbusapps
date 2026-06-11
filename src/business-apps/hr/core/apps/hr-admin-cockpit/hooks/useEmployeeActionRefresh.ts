import { useCallback, useEffect, useRef } from 'react'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { useDataQualityContext } from './dataQualityHooks'

const FOLLOW_UP_EMPLOYEE_REFRESH_DELAY_MS = 1200
type RefreshTimerId = ReturnType<typeof globalThis.setTimeout>

export function useEmployeeActionRefresh() {
  const ctx = useDataQualityContext()
  const pendingActionEmployeeIdRef = useRef<string | null>(null)
  const pendingRefreshTimersRef = useRef(new Set<RefreshTimerId>())

  const handleActionStarted = useCallback((employeeId: string) => {
    pendingActionEmployeeIdRef.current = employeeId
  }, [])

  const handleProcessSuccess = useCallback(() => {
    const employeeId = pendingActionEmployeeIdRef.current
    pendingActionEmployeeIdRef.current = null
    if (!employeeId) return

    void ctx.refreshEmployee(employeeId)
    const followUpRefreshTimer = globalThis.setTimeout(() => {
      pendingRefreshTimersRef.current.delete(followUpRefreshTimer)
      void ctx.refreshEmployee(employeeId)
    }, FOLLOW_UP_EMPLOYEE_REFRESH_DELAY_MS)
    pendingRefreshTimersRef.current.add(followUpRefreshTimer)
  }, [ctx])

  const handleProcessFailure = useCallback(() => {
    pendingActionEmployeeIdRef.current = null
  }, [])

  useProcessCompletion({
    onSuccess: handleProcessSuccess,
    onFailure: handleProcessFailure
  })

  useEffect(() => {
    const pendingRefreshTimers = pendingRefreshTimersRef.current
    return () => {
      pendingRefreshTimers.forEach(timerId => globalThis.clearTimeout(timerId))
      pendingRefreshTimers.clear()
    }
  }, [])

  return handleActionStarted
}
