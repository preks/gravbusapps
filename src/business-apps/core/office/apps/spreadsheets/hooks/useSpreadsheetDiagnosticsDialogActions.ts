import { useCallback } from 'react'

export interface UseSpreadsheetDiagnosticsDialogActionsParams {
  setIsDiagnosticsDialogOpen: (open: boolean) => void
  startDiagnosticsTraceSession: () => Promise<void>
  stopDiagnosticsTraceSession: () => Promise<void>
  refreshDiagnosticsData: (traceSessionId?: string, options?: { force?: boolean }) => Promise<void>
  setSelectedTraceSessionId: (traceSessionId: string | null) => void
  setTraceEvents: (events: unknown[]) => void
  setTraceFindings: (findings: unknown[]) => void
}

export interface UseSpreadsheetDiagnosticsDialogActionsResult {
  openDiagnosticsDialog: () => void
  onDiagnosticsDialogOpenChange: (open: boolean) => void
  startDiagnosticsTrace: () => void
  stopDiagnosticsTrace: () => void
  refreshDiagnosticsTraceData: () => void
  clearDisplayedDiagnosticsData: () => void
  selectDiagnosticsTraceSession: (traceSessionId: string) => void
}

export function useSpreadsheetDiagnosticsDialogActions(
  params: UseSpreadsheetDiagnosticsDialogActionsParams
): UseSpreadsheetDiagnosticsDialogActionsResult {
  const {
    setIsDiagnosticsDialogOpen,
    startDiagnosticsTraceSession,
    stopDiagnosticsTraceSession,
    refreshDiagnosticsData,
    setSelectedTraceSessionId,
    setTraceEvents,
    setTraceFindings
  } = params

  const openDiagnosticsDialog = useCallback(() => {
    setIsDiagnosticsDialogOpen(true)
  }, [setIsDiagnosticsDialogOpen])

  const onDiagnosticsDialogOpenChange = useCallback(
    (open: boolean) => {
      setIsDiagnosticsDialogOpen(open)
    },
    [setIsDiagnosticsDialogOpen]
  )

  const startDiagnosticsTrace = useCallback(() => {
    void startDiagnosticsTraceSession()
  }, [startDiagnosticsTraceSession])

  const stopDiagnosticsTrace = useCallback(() => {
    void stopDiagnosticsTraceSession()
  }, [stopDiagnosticsTraceSession])

  const refreshDiagnosticsTraceData = useCallback(() => {
    void refreshDiagnosticsData(undefined, { force: true })
  }, [refreshDiagnosticsData])

  const clearDisplayedDiagnosticsData = useCallback(() => {
    setSelectedTraceSessionId(null)
    setTraceEvents([])
    setTraceFindings([])
  }, [setSelectedTraceSessionId, setTraceEvents, setTraceFindings])

  const selectDiagnosticsTraceSession = useCallback(
    (traceSessionId: string) => {
      void refreshDiagnosticsData(traceSessionId, { force: true })
    },
    [refreshDiagnosticsData]
  )

  return {
    openDiagnosticsDialog,
    onDiagnosticsDialogOpenChange,
    startDiagnosticsTrace,
    stopDiagnosticsTrace,
    refreshDiagnosticsTraceData,
    clearDisplayedDiagnosticsData,
    selectDiagnosticsTraceSession
  }
}
