import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, toast } from '@newwork/nw-design-system'
import { FileText } from 'lucide-react'
import { DocumentExternalSourceService } from '../../services/DocumentExternalSourceService'
import type {
  UnstructuredConnectorSummary,
  UnstructuredPreviewItem,
  UnstructuredSyncRunStatus
} from '../../types/externalUnstructuredConnector'
import { UnstructuredConnectorSelector } from './UnstructuredConnectorSelector'
import { UnstructuredPreview } from './UnstructuredPreview'
import { UnstructuredImportConfig } from './UnstructuredImportConfig'
import { UnstructuredSyncProgress } from './UnstructuredSyncProgress'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'

type Step = 'select' | 'preview' | 'config' | 'progress'

export interface ExternalDocumentImportSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  onAfterImport?: () => void
  'data-testid'?: string
}

export const ExternalDocumentImportSheet: React.FC<ExternalDocumentImportSheetProps> = ({
  open,
  onOpenChange,
  accessToken,
  onAfterImport,
  'data-testid': testId = 'external-document-import-sheet'
}) => {
  const promptManagerClient = usePromptManagerClient(accessToken)
  const [step, setStep] = useState<Step>('select')
  const [connectors, setConnectors] = useState<UnstructuredConnectorSummary[]>([])
  const [isLoadingConnectors, setIsLoadingConnectors] = useState(false)
  const [connectorError, setConnectorError] = useState<string | null>(null)
  const [selectedConnector, setSelectedConnector] = useState<UnstructuredConnectorSummary | null>(null)
  const [sharedConnections, setSharedConnections] = useState<Array<{ id: string; name: string }>>([])
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null)
  const [isLoadingSharedConnections, setIsLoadingSharedConnections] = useState(false)
  const [sharedConnectionsError, setSharedConnectionsError] = useState<string | null>(null)

  const [previewItems, setPreviewItems] = useState<UnstructuredPreviewItem[]>([])
  const [estimatedTotal, setEstimatedTotal] = useState<number | undefined>()
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  const [limit, setLimit] = useState(100)
  const [keepConnected, setKeepConnected] = useState(false)
  const [refreshMode, setRefreshMode] = useState<'manual' | 'onOpen' | 'periodic'>('manual')
  const [isImporting, setIsImporting] = useState(false)

  const [runId, setRunId] = useState<string | null>(null)
  const [runStatus, setRunStatus] = useState<UnstructuredSyncRunStatus>('queued')
  const [totalDiscovered, setTotalDiscovered] = useState(0)
  const [totalImported, setTotalImported] = useState(0)
  const [totalSkipped, setTotalSkipped] = useState(0)
  const [runError, setRunError] = useState<string | null>(null)
  const [lastMessage, setLastMessage] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<string | undefined>()
  const [completedAt, setCompletedAt] = useState<string | undefined>()

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const runIdRef = useRef<string | null>(null)
  runIdRef.current = runId
  const pmClientRef = useRef(promptManagerClient)
  pmClientRef.current = promptManagerClient

  useEffect(() => {
    if (accessToken) {
      DocumentExternalSourceService.setAccessToken(accessToken)
    }
  }, [accessToken])

  const loadConnectors = useCallback(async () => {
    setIsLoadingConnectors(true)
    setConnectorError(null)
    try {
      const [allConnectors, activeConnections] = await Promise.all([
        DocumentExternalSourceService.listConnectors(),
        pmClientRef.current.getExternalConnections({
          kind: 'unstructured',
          consumerType: 'document_import',
          limit: 100,
          offset: 0
        })
      ])
      const activeConnectorIds = new Set(
        (activeConnections.data || []).map(c => (c as any).connector_id || (c as any).connectorId || '').filter(Boolean)
      )
      const filtered = allConnectors.filter(c => activeConnectorIds.has(c.name))
      setConnectors(filtered)
    } catch {
      setConnectorError('Failed to load connectors')
    } finally {
      setIsLoadingConnectors(false)
    }
  }, [])

  useEffect(() => {
    if (open && step === 'select') {
      void loadConnectors()
    }
  }, [open, step, loadConnectors])

  useEffect(() => {
    const loadSharedConnections = async () => {
      if (!selectedConnector) {
        setSharedConnections([])
        setSelectedConnectionId(null)
        setSharedConnectionsError(null)
        return
      }
      setIsLoadingSharedConnections(true)
      setSharedConnectionsError(null)
      try {
        const result = await promptManagerClient.getExternalConnections({
          kind: 'unstructured',
          connectorId: selectedConnector.name,
          consumerType: 'document_import',
          limit: 100,
          offset: 0,
          returnTotalRecords: true
        })
        const next = (result.data || []).map(item => ({
          id: (item as any).connection_id || (item as any).connectionId || '',
          name: item.name
        }))
        const valid = next.filter(item => item.id)
        setSharedConnections(valid)
        if (valid.length === 1) {
          setSelectedConnectionId(valid[0].id)
        }
      } catch {
        setSharedConnections([])
        setSharedConnectionsError('Failed to load shared connections')
      } finally {
        setIsLoadingSharedConnections(false)
      }
    }
    void loadSharedConnections()
  }, [promptManagerClient, selectedConnector])

  const handlePreview = useCallback(async () => {
    if (!selectedConnector) return
    setIsLoadingPreview(true)
    setStep('preview')
    try {
      const result = await DocumentExternalSourceService.preview(
        selectedConnector.id,
        selectedConnectionId || undefined
      )
      if (result) {
        setPreviewItems(result.items)
        setEstimatedTotal(result.estimatedTotal)
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
  }, [selectedConnector, selectedConnectionId])

  const pollRunStatus = useCallback(
    async (activeRunId: string) => {
      const status = await DocumentExternalSourceService.getRunStatus(activeRunId)
      if (!status) return
      setRunStatus(status.status)
      setTotalDiscovered(status.totalDiscovered)
      setTotalImported(status.totalImported)
      setTotalSkipped(status.totalSkipped)
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
          toast.success(`Imported ${status.totalImported.toLocaleString()} documents from external source`)
          onAfterImport?.()
        }
      }
    },
    [onAfterImport]
  )

  const startPolling = useCallback(
    (activeRunId: string) => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      pollingRef.current = setInterval(() => {
        void pollRunStatus(activeRunId)
      }, 3_000)
    },
    [pollRunStatus]
  )

  const handleImport = useCallback(async () => {
    if (!selectedConnector) return
    setIsImporting(true)
    try {
      const result = await DocumentExternalSourceService.startSync({
        connectorId: selectedConnector.id,
        connectorName: selectedConnector.name,
        connectorDescription: selectedConnector.description ?? undefined,
        connectionId: selectedConnectionId || undefined,
        limit,
        keepConnected,
        refreshMode: keepConnected ? refreshMode : undefined
      })
      if (!result) {
        toast.error('Failed to start import')
        return
      }
      setRunId(result.runId)
      setRunStatus('queued')
      setTotalDiscovered(0)
      setTotalImported(0)
      setTotalSkipped(0)
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
  }, [selectedConnector, selectedConnectionId, limit, keepConnected, refreshMode, startPolling])

  const handleCancel = useCallback(async () => {
    if (!runId) return
    await DocumentExternalSourceService.cancelRun(runId)
  }, [runId])

  const handleRetry = useCallback(() => {
    setStep('config')
  }, [])

  const resetState = useCallback(() => {
    setStep('select')
    setSelectedConnector(null)
    setSharedConnections([])
    setSelectedConnectionId(null)
    setSharedConnectionsError(null)
    setPreviewItems([])
    setEstimatedTotal(undefined)
    setRunId(null)
    setRunStatus('queued')
    setTotalDiscovered(0)
    setTotalImported(0)
    setTotalSkipped(0)
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
            <FileText className="gba:w-4 gba:h-4" />
            Import external documents
          </SheetTitle>
        </SheetHeader>

        <div className="gba:overflow-y-auto gba:flex-1 gba:px-4 gba:pb-4">
          {step === 'select' && (
            <UnstructuredConnectorSelector
              connectors={connectors}
              selectedId={selectedConnector?.id ?? null}
              onSelect={setSelectedConnector}
              connectionOptions={sharedConnections}
              selectedConnectionId={selectedConnectionId}
              onConnectionChange={setSelectedConnectionId}
              isLoadingConnections={isLoadingSharedConnections}
              connectionError={sharedConnectionsError}
              onNext={() => void handlePreview()}
              isLoading={isLoadingConnectors}
              error={connectorError}
              data-testid={`${testId}-selector`}
            />
          )}

          {step === 'preview' && selectedConnector && (
            <UnstructuredPreview
              connectorName={selectedConnector.name}
              items={previewItems}
              estimatedTotal={estimatedTotal}
              isLoading={isLoadingPreview}
              onBack={() => setStep('select')}
              onNext={() => setStep('config')}
              data-testid={`${testId}-preview`}
            />
          )}

          {step === 'config' && selectedConnector && (
            <UnstructuredImportConfig
              connectorName={selectedConnector.name}
              estimatedTotal={estimatedTotal}
              limit={limit}
              onLimitChange={setLimit}
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
            <UnstructuredSyncProgress
              status={runStatus}
              totalDiscovered={totalDiscovered}
              totalImported={totalImported}
              totalSkipped={totalSkipped}
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
