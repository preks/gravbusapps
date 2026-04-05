import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Sheet, SheetContent, SheetHeader, SheetTitle, toast } from '@newwork/nw-design-system'
import { CloudDownload, HardDrive, CheckCircle2, ArrowRight } from 'lucide-react'
import { DocumentExternalSourceService } from '@/business-apps/core/office/apps/documents/services/DocumentExternalSourceService'
import type {
  UnstructuredConnectorSummary,
  UnstructuredPreviewItem,
  UnstructuredSyncRunStatus
} from '@/business-apps/core/office/apps/documents/types/externalUnstructuredConnector'
import { UnstructuredConnectorSelector } from '@/business-apps/core/office/apps/documents/components/external-import/UnstructuredConnectorSelector'
import { UnstructuredPreview } from '@/business-apps/core/office/apps/documents/components/external-import/UnstructuredPreview'
import { UnstructuredImportConfig } from '@/business-apps/core/office/apps/documents/components/external-import/UnstructuredImportConfig'
import { UnstructuredSyncProgress } from '@/business-apps/core/office/apps/documents/components/external-import/UnstructuredSyncProgress'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { AddFromDriveStep } from './AddFromDriveStep'

type Step = 'select' | 'browse-drive' | 'preview' | 'config' | 'progress'

export interface DriveExternalImportSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  currentFolderId: string | null
  spaceId?: string
  onAfterImport?: () => void
  'data-testid'?: string
}

export const DriveExternalImportSheet: React.FC<DriveExternalImportSheetProps> = ({
  open,
  onOpenChange,
  accessToken,
  currentFolderId,
  spaceId,
  onAfterImport,
  'data-testid': testId = 'drive-external-import-sheet'
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
  const [myDriveSelected, setMyDriveSelected] = useState(false)

  const [previewItems, setPreviewItems] = useState<UnstructuredPreviewItem[]>([])
  const [estimatedTotal, setEstimatedTotal] = useState<number | undefined>()
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

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
    setPreviewError(null)
    setPreviewItems([])
    setEstimatedTotal(undefined)
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Preview failed'
      setPreviewError(message)
      toast.error(message)
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
          toast.success(`Imported ${status.totalImported.toLocaleString()} items from external source`)
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
        refreshMode: keepConnected ? refreshMode : undefined,
        destinationSpaceId: spaceId || undefined,
        destinationFolderId: currentFolderId || undefined
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
  }, [
    selectedConnector,
    selectedConnectionId,
    limit,
    keepConnected,
    refreshMode,
    startPolling,
    spaceId,
    currentFolderId
  ])

  const handleCancel = useCallback(async () => {
    if (!runId) return
    await DocumentExternalSourceService.cancelRun(runId)
  }, [runId])

  const handleRetry = useCallback(() => {
    setStep('config')
  }, [])

  const resetState = useCallback(() => {
    setStep('select')
    setMyDriveSelected(false)
    setSelectedConnector(null)
    setSharedConnections([])
    setSelectedConnectionId(null)
    setSharedConnectionsError(null)
    setPreviewItems([])
    setEstimatedTotal(undefined)
    setPreviewError(null)
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

  const sheetWidth = step === 'preview' || step === 'browse-drive' ? 'gba:sm:max-w-2xl' : 'gba:sm:max-w-lg'

  const handleSelectMyDrive = useCallback(() => {
    setMyDriveSelected(true)
    setSelectedConnector(null)
  }, [])

  const handleSelectConnector = useCallback((connector: UnstructuredConnectorSummary) => {
    setMyDriveSelected(false)
    setSelectedConnector(connector)
  }, [])

  const handleBrowseDriveComplete = useCallback(() => {
    onAfterImport?.()
    handleOpenChange(false)
  }, [onAfterImport, handleOpenChange])

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className={sheetWidth} data-testid={testId}>
        <SheetHeader>
          <SheetTitle className="gba:flex gba:items-center gba:gap-2">
            {step === 'browse-drive' ? (
              <>
                <HardDrive className="gba:w-4 gba:h-4" />
                Add from my Drive
              </>
            ) : (
              <>
                <CloudDownload className="gba:w-4 gba:h-4" />
                Import from external source
              </>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="gba:overflow-y-auto gba:flex-1 gba:px-4 gba:pb-4">
          {currentFolderId && step === 'select' && (
            <div className="gba:mb-3 gba:rounded gba:border gba:border-info/50 gba:bg-info-secondary gba:p-2">
              <p className="gba:text-xs gba:text-info-foreground">
                Imported files will be placed into the current folder.
              </p>
            </div>
          )}

          {step === 'select' && (
            <>
              {spaceId && (
                <div className="gba:mb-4" data-testid={`${testId}-my-drive-section`}>
                  <button
                    type="button"
                    className={`gba:relative gba:w-full gba:text-left gba:rounded-xl gba:border gba:p-4 gba:transition-all ${
                      myDriveSelected
                        ? 'gba:border-primary gba:bg-accent gba:ring-1 gba:ring-primary'
                        : 'gba:border-border gba:hover:border-primary/40 gba:hover:bg-accent/50'
                    }`}
                    onClick={handleSelectMyDrive}
                    data-testid={`${testId}-my-drive-option`}
                  >
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:shrink-0">
                        <HardDrive className="gba:w-5 gba:h-5 gba:text-primary" />
                      </div>
                      <div className="gba:min-w-0 gba:flex-1">
                        <div className="gba:text-sm gba:font-semibold">My NEWWORK Drive</div>
                        <div className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
                          Browse your personal Drive and add files to this space
                        </div>
                      </div>
                      {myDriveSelected && <CheckCircle2 className="gba:w-5 gba:h-5 gba:text-primary gba:shrink-0" />}
                    </div>
                  </button>

                  {myDriveSelected && (
                    <div className="gba:flex gba:justify-end gba:mt-3">
                      <Button size="sm" onClick={() => setStep('browse-drive')} data-testid={`${testId}-my-drive-next`}>
                        Browse <ArrowRight className="gba:w-3 gba:h-3 gba:ml-1" />
                      </Button>
                    </div>
                  )}

                  <div className="gba:relative gba:my-4">
                    <div className="gba:absolute gba:inset-0 gba:flex gba:items-center">
                      <div className="gba:w-full gba:border-t gba:border-border/50" />
                    </div>
                    <div className="gba:relative gba:flex gba:justify-center">
                      <span className="gba:bg-background gba:px-3 gba:text-xs gba:text-muted-foreground">
                        or import from an external source
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <UnstructuredConnectorSelector
                connectors={connectors}
                selectedId={selectedConnector?.id ?? null}
                onSelect={handleSelectConnector}
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
            </>
          )}

          {step === 'browse-drive' && spaceId && (
            <AddFromDriveStep
              accessToken={accessToken}
              spaceId={spaceId}
              targetFolderId={currentFolderId}
              onBack={() => setStep('select')}
              onComplete={handleBrowseDriveComplete}
              data-testid={`${testId}-browse-drive`}
            />
          )}

          {step === 'preview' && selectedConnector && (
            <UnstructuredPreview
              connectorName={selectedConnector.name}
              items={previewItems}
              estimatedTotal={estimatedTotal}
              isLoading={isLoadingPreview}
              error={previewError}
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
