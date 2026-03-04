import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, toast } from '@newwork/nw-design-system'
import { Plug } from 'lucide-react'
import { BoardApiService } from '../../services/BoardApiService'
import { useBoardRealtime, type BoardRealtimeEvent } from '../../hooks/useBoardRealtime'
import type { ConnectorSummary, ConnectorField, SyncRunStatus } from '../../types'
import { ConnectorSelector } from './ConnectorSelector'
import { ExternalPreview } from './ExternalPreview'
import { ExternalImportConfig } from './ExternalImportConfig'
import { ExternalSyncProgress } from './ExternalSyncProgress'

type Step = 'select' | 'preview' | 'config' | 'progress'

export interface ExternalDataSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardId: string
  sheetId: string
  accessToken: string
  onAfterImport?: () => void
  onSheetUpdate?: (boardId: string, sheetId: string, updates: Record<string, unknown>) => Promise<unknown>
  'data-testid'?: string
}

export const ExternalDataSheet: React.FC<ExternalDataSheetProps> = ({
  open,
  onOpenChange,
  boardId,
  sheetId,
  accessToken,
  onAfterImport,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSheetUpdate,
  'data-testid': testId = 'external-data-sheet'
}) => {
  const [step, setStep] = useState<Step>('select')
  const [connectors, setConnectors] = useState<ConnectorSummary[]>([])
  const [isLoadingConnectors, setIsLoadingConnectors] = useState(false)
  const [connectorError, setConnectorError] = useState<string | null>(null)
  const [selectedConnector, setSelectedConnector] = useState<ConnectorSummary | null>(null)

  const [previewRecords, setPreviewRecords] = useState<Array<Record<string, unknown>>>([])
  const [previewSchema, setPreviewSchema] = useState<ConnectorField[]>([])
  const [estimatedTotal, setEstimatedTotal] = useState<number | undefined>()
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  const [limit, setLimit] = useState(500)
  const [mode, setMode] = useState<'replace' | 'append' | 'merge'>('replace')
  const [mergeKey, setMergeKey] = useState('id')
  const [keepConnected, setKeepConnected] = useState(false)
  const [refreshMode, setRefreshMode] = useState<'manual' | 'onOpen' | 'periodic'>('manual')
  const [isImporting, setIsImporting] = useState(false)

  const [runId, setRunId] = useState<string | null>(null)
  const [runStatus, setRunStatus] = useState<SyncRunStatus>('queued')
  const [totalFetched, setTotalFetched] = useState(0)
  const [totalSynced, setTotalSynced] = useState(0)
  const [runError, setRunError] = useState<string | null>(null)
  const [lastMessage, setLastMessage] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<string | undefined>()
  const [completedAt, setCompletedAt] = useState<string | undefined>()

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const runIdRef = useRef<string | null>(null)
  runIdRef.current = runId

  const handleRealtimeEvent = useCallback(
    (event: BoardRealtimeEvent) => {
      if (!event.type.startsWith('sheet.externalSync.')) return
      if (event.sheetId !== sheetId || event.runId !== runIdRef.current) return

      if (event.type === 'sheet.externalSync.progress') {
        if (event.status) setRunStatus(event.status as SyncRunStatus)
        if (event.totalFetched != null) setTotalFetched(event.totalFetched)
        if (event.totalSynced != null) setTotalSynced(event.totalSynced)
        if (event.estimatedTotal) setEstimatedTotal(event.estimatedTotal)
        setLastMessage(event.lastMessage ?? null)
      } else if (event.type === 'sheet.externalSync.completed') {
        setRunStatus('completed')
        if (event.syncedCount != null) setTotalSynced(event.syncedCount)
        toast.success(`Imported ${(event.syncedCount ?? 0).toLocaleString()} rows from external source`)
        onAfterImport?.()
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      } else if (event.type === 'sheet.externalSync.failed') {
        setRunStatus('failed')
        setRunError(event.error ?? 'Import failed')
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      } else if (event.type === 'sheet.externalSync.cancelled') {
        setRunStatus('cancelled')
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      }
    },
    [sheetId, onAfterImport]
  )

  const realtimeEnabled = step === 'progress' && !!runId
  const { isConnected: wsConnected } = useBoardRealtime({
    boardId,
    accessToken,
    enabled: realtimeEnabled,
    onEvent: handleRealtimeEvent
  })

  const loadConnectors = useCallback(async () => {
    setIsLoadingConnectors(true)
    setConnectorError(null)
    try {
      const result = await BoardApiService.listExternalConnectors(boardId, sheetId)
      setConnectors(result as unknown as ConnectorSummary[])
    } catch {
      setConnectorError('Failed to load connectors')
    } finally {
      setIsLoadingConnectors(false)
    }
  }, [boardId, sheetId])

  useEffect(() => {
    if (open && step === 'select') {
      void loadConnectors()
    }
  }, [open, step, loadConnectors])

  const handlePreview = useCallback(async () => {
    if (!selectedConnector) return
    setIsLoadingPreview(true)
    setStep('preview')
    try {
      const result = await BoardApiService.externalPreview(boardId, sheetId, selectedConnector.id)
      if (result) {
        setPreviewRecords(result.records)
        setPreviewSchema(result.schema as ConnectorField[])
        setEstimatedTotal(result.estimatedTotal)
        setSelectedFields(result.schema.map((s: { name: string }) => s.name))
      } else {
        toast.error('Preview failed')
        setStep('select')
      }
    } catch {
      toast.error('Preview failed')
      setStep('select')
    } finally {
      setIsLoadingPreview(false)
    }
  }, [selectedConnector, boardId, sheetId])

  const pollRunStatus = useCallback(
    async (activeRunId: string) => {
      const status = await BoardApiService.getExternalSyncRunStatus(boardId, sheetId, activeRunId)
      if (!status) return
      setRunStatus(status.status as SyncRunStatus)
      setTotalFetched(status.totalFetched)
      setTotalSynced(status.totalSynced)
      setRunError(status.error ?? null)
      setLastMessage(status.lastMessage ?? null)
      if (status.estimatedTotal) setEstimatedTotal(status.estimatedTotal)
      setStartedAt(status.startedAt)
      setCompletedAt(status.completedAt)

      if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
        if (pollingRef.current) {
          clearInterval(pollingRef.current)
          pollingRef.current = null
        }
        if (status.status === 'completed') {
          toast.success(`Imported ${status.totalSynced.toLocaleString()} rows from external source`)
          onAfterImport?.()
        }
      }
    },
    [boardId, sheetId, onAfterImport]
  )

  const startPolling = useCallback(
    (activeRunId: string) => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      const intervalMs = wsConnected ? 10_000 : 2_000
      pollingRef.current = setInterval(() => {
        void pollRunStatus(activeRunId)
      }, intervalMs)
    },
    [wsConnected, pollRunStatus]
  )

  const handleImport = useCallback(async () => {
    if (!selectedConnector) return
    setIsImporting(true)
    try {
      const result = await BoardApiService.startExternalSync(boardId, sheetId, {
        connectorId: selectedConnector.id,
        connectorName: selectedConnector.name,
        connectorDescription: selectedConnector.description ?? undefined,
        selectedFields,
        limit,
        mode,
        mergeKey: mode === 'merge' ? mergeKey.trim() : undefined,
        autoColumns: true,
        keepConnected,
        refreshMode: keepConnected ? refreshMode : undefined
      })
      if (!result) {
        toast.error('Failed to start import')
        return
      }
      setRunId(result.runId)
      setRunStatus('queued')
      setTotalFetched(0)
      setTotalSynced(0)
      setRunError(null)
      setLastMessage(null)
      setStartedAt(undefined)
      setCompletedAt(undefined)
      setStep('progress')
      startPolling(result.runId)
    } catch {
      toast.error('Failed to start import')
    } finally {
      setIsImporting(false)
    }
  }, [
    selectedConnector,
    boardId,
    sheetId,
    selectedFields,
    limit,
    mode,
    mergeKey,
    keepConnected,
    refreshMode,
    startPolling
  ])

  const handleCancel = useCallback(async () => {
    if (!runId) return
    await BoardApiService.cancelExternalSyncRun(boardId, sheetId, runId)
  }, [boardId, sheetId, runId])

  const handleRetry = useCallback(() => {
    setStep('config')
  }, [])

  const resetState = useCallback(() => {
    setStep('select')
    setSelectedConnector(null)
    setPreviewRecords([])
    setPreviewSchema([])
    setEstimatedTotal(undefined)
    setSelectedFields([])
    setRunId(null)
    setRunStatus('queued')
    setTotalFetched(0)
    setTotalSynced(0)
    setRunError(null)
    setLastMessage(null)
    setStartedAt(undefined)
    setCompletedAt(undefined)
    setKeepConnected(false)
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) resetState()
      onOpenChange(isOpen)
    },
    [onOpenChange, resetState]
  )

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  const sheetWidth = step === 'preview' ? 'gba:sm:max-w-2xl' : 'gba:sm:max-w-lg'

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className={sheetWidth} data-testid={testId}>
        <SheetHeader>
          <SheetTitle className="gba:flex gba:items-center gba:gap-2">
            <Plug className="gba:w-4 gba:h-4" />
            Import external data
          </SheetTitle>
        </SheetHeader>

        <div className="gba:overflow-y-auto gba:flex-1 gba:px-4 gba:pb-4">
          {step === 'select' && (
            <ConnectorSelector
              connectors={connectors}
              selectedId={selectedConnector?.id ?? null}
              onSelect={setSelectedConnector}
              onNext={() => void handlePreview()}
              isLoading={isLoadingConnectors}
              error={connectorError}
              data-testid={`${testId}-selector`}
            />
          )}

          {step === 'preview' && selectedConnector && (
            <ExternalPreview
              connectorName={selectedConnector.name}
              records={previewRecords}
              schema={previewSchema}
              estimatedTotal={estimatedTotal}
              selectedFields={selectedFields}
              onSelectedFieldsChange={setSelectedFields}
              isLoading={isLoadingPreview}
              onBack={() => setStep('select')}
              onNext={() => setStep('config')}
              data-testid={`${testId}-preview`}
            />
          )}

          {step === 'config' && selectedConnector && (
            <ExternalImportConfig
              connectorName={selectedConnector.name}
              selectedFieldCount={selectedFields.length}
              estimatedTotal={estimatedTotal}
              limit={limit}
              onLimitChange={setLimit}
              mode={mode}
              onModeChange={setMode}
              mergeKey={mergeKey}
              onMergeKeyChange={setMergeKey}
              keepConnected={keepConnected}
              onKeepConnectedChange={setKeepConnected}
              refreshMode={refreshMode}
              onRefreshModeChange={setRefreshMode}
              isImporting={isImporting}
              onBack={() => setStep('preview')}
              onImport={() => void handleImport()}
              data-testid={`${testId}-config`}
            />
          )}

          {step === 'progress' && (
            <ExternalSyncProgress
              status={runStatus}
              totalFetched={totalFetched}
              totalSynced={totalSynced}
              limit={limit}
              estimatedTotal={estimatedTotal}
              lastMessage={lastMessage}
              error={runError}
              startedAt={startedAt}
              completedAt={completedAt}
              onCancel={() => void handleCancel()}
              onRetry={handleRetry}
              onClose={() => handleOpenChange(false)}
              data-testid={`${testId}-progress`}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
