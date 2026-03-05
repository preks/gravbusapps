import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  Spinner,
  Switch,
  Badge,
  toast
} from '@newwork/nw-design-system'
import { Database, RefreshCw, Unlink, Plus, GitBranch, Plug } from 'lucide-react'
import type { Board, BoardSheet, EntityDataSource } from '../../types'
import { BoardApiService } from '../../services/BoardApiService'

export interface BoardSettingsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  board: Board
  activeSheet: BoardSheet | null
  onUpdateBoard?: (updates: Partial<Board>) => Promise<void>
  onSheetUpdate?: (boardId: string, sheetId: string, updates: Record<string, unknown>) => Promise<unknown>
  onOpenImport?: () => void
  onOpenFlowImport?: () => void
  onOpenExternalImport?: () => void
  'data-testid'?: string
}

export const BoardSettingsSheet: React.FC<BoardSettingsSheetProps> = ({
  open,
  onOpenChange,
  board,
  activeSheet,
  onUpdateBoard,
  onSheetUpdate,
  onOpenImport,
  onOpenFlowImport,
  onOpenExternalImport,
  'data-testid': testId = 'board-settings-sheet'
}) => {
  const [name, setName] = useState(board.name)
  const [description, setDescription] = useState(board.description || '')
  const [liveEnabled, setLiveEnabled] = useState(Boolean((board.settings as any)?.liveUpdatesEnabled))
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(board.name)
    setDescription(board.description || '')
    setLiveEnabled(Boolean((board.settings as any)?.liveUpdatesEnabled))
  }, [open, board.name, board.description, board.settings])

  const canSave = useMemo(() => Boolean(name.trim()) && !isSaving, [name, isSaving])

  const handleSave = useCallback(async () => {
    if (!onUpdateBoard || !name.trim()) return
    setIsSaving(true)
    try {
      await onUpdateBoard({
        name: name.trim(),
        description: description.trim() || undefined,
        settings: { ...(board.settings || {}), liveUpdatesEnabled: liveEnabled }
      })
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }, [onUpdateBoard, name, description, board.settings, liveEnabled, onOpenChange])

  const dataSource = activeSheet?.entityDataSource as EntityDataSource | undefined
  const auxSources = (dataSource as Record<string, unknown> | undefined)?.auxiliarySources as
    | Array<{ entityType: string; entityDisplayName: string; targetColumn: string; sourceField: string }>
    | undefined
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSyncNow = useCallback(async () => {
    if (!activeSheet || !dataSource) return
    setIsSyncing(true)
    const dsAny = dataSource as Record<string, unknown>
    try {
      let syncCount = 0
      if (dsAny.mergeStrategy === 'populateOptions' && dsAny.populateTargetCol && dsAny.populateSourceField) {
        const optLimit = dataSource.limit != null ? dataSource.limit : 200
        const result = await BoardApiService.populateColumnOptions(
          board.id,
          activeSheet.id,
          dataSource.entityType,
          dsAny.populateSourceField as string,
          dsAny.populateTargetCol as string,
          optLimit
        )
        if (!result) {
          toast.error('Sync failed')
          return
        }
        syncCount = result.optionCount
        toast.success(
          `Updated ${syncCount} options for "${dsAny.populateTargetCol}" from ${dataSource.entityDisplayName || dataSource.entityType}`
        )
      } else if (dsAny.provider === 'functionManager') {
        const syncLimit = dataSource.limit != null ? dataSource.limit : 500
        const result = await BoardApiService.startExternalSync(board.id, activeSheet.id, {
          connectorId: dsAny.connectorId as string,
          connectorName: dsAny.connectorName as string,
          query: dsAny.query as Record<string, unknown> | undefined,
          selectedFields: dsAny.selectedFields as string[] | undefined,
          limit: syncLimit,
          mode: (dsAny.syncMode as 'replace' | 'append' | 'merge') || 'replace',
          mergeKey: dsAny.mergeKey as string | undefined,
          autoColumns: true,
          keepConnected: true,
          refreshMode: dsAny.refreshMode as string | undefined
        })
        if (!result) {
          toast.error('Sync failed')
          return
        }
        toast.success('External sync started in background')
        syncCount = 0
      } else if (dsAny.provider === 'flowEngine') {
        const syncLimit = dataSource.limit != null ? dataSource.limit : 200
        const result = await BoardApiService.syncFromFlowEngine(board.id, activeSheet.id, {
          flowEntity: (dsAny.flowEntity as 'flows' | 'tasks') || 'flows',
          templateIds: dsAny.templateIds as string[] | undefined,
          tags: dsAny.tags as Array<{ key: string; value: string }> | undefined,
          scope: (dsAny.scope as 'all' | 'byUser') || 'all',
          userId: dsAny.userId as string | undefined,
          participationType: dsAny.participationType as 'initiated' | 'participated' | undefined,
          status: dsAny.status as string | undefined,
          customStatus: dsAny.customStatus as string | undefined,
          priority: dsAny.priority as string | undefined,
          limit: syncLimit,
          mode: 'replace',
          autoColumns: true
        })
        if (!result) {
          toast.error('Sync failed')
          return
        }
        syncCount = result.fetched
        toast.success(`Synced ${syncCount} ${dataSource.entityDisplayName || 'flow'} records`)
      } else {
        const syncLimit = dataSource.limit != null ? dataSource.limit : 200
        const result = await BoardApiService.syncFromGraphQL(board.id, activeSheet.id, {
          entity: dataSource.entityType,
          limit: syncLimit,
          mode: 'replace',
          autoColumns: true
        })
        if (!result) {
          toast.error('Sync failed')
          return
        }
        syncCount = result.fetched
        toast.success(`Synced ${syncCount} ${dataSource.entityDisplayName || dataSource.entityType} records`)
      }
      if (onSheetUpdate) {
        await onSheetUpdate(board.id, activeSheet.id, {
          entityDataSource: {
            ...dataSource,
            lastSyncAt: new Date().toISOString(),
            lastSyncCount: syncCount,
            lastSyncError: undefined
          }
        })
      }
    } catch {
      toast.error('Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }, [activeSheet, board.id, dataSource, onSheetUpdate])

  const handleDisconnect = useCallback(async () => {
    if (!activeSheet || !onSheetUpdate) return
    await onSheetUpdate(board.id, activeSheet.id, { entityDataSource: null })
    toast.success('Data source disconnected')
  }, [activeSheet, board.id, onSheetUpdate])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gba:w-full gba:sm:max-w-md" data-testid={testId}>
        <SheetHeader>
          <SheetTitle>Board settings</SheetTitle>
        </SheetHeader>

        <div className="gba:px-4 gba:pb-4 gba:space-y-4 gba:overflow-y-auto gba:flex-1">
          <div>
            <Label className="gba:text-xs" htmlFor={`${testId}-name`}>
              Name
            </Label>
            <Input
              id={`${testId}-name`}
              value={name}
              onChange={e => setName(e.target.value)}
              className="gba:h-9"
              data-testid={`${testId}-name`}
            />
          </div>
          <div>
            <Label className="gba:text-xs" htmlFor={`${testId}-desc`}>
              Description
            </Label>
            <Input
              id={`${testId}-desc`}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="gba:h-9"
              data-testid={`${testId}-description`}
            />
          </div>

          <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:border gba:rounded-md gba:p-3">
            <div className="gba:min-w-0">
              <div className="gba:text-sm gba:font-medium gba:text-foreground">Live updates</div>
              <div className="gba:text-xs gba:text-muted-foreground">
                When enabled, the board receives realtime updates.
              </div>
            </div>
            <Switch checked={liveEnabled} onCheckedChange={setLiveEnabled} data-testid={`${testId}-live-toggle`} />
          </div>

          <div className="gba:border gba:rounded-md gba:p-3 gba:space-y-3">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Database className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                <span className="gba:text-sm gba:font-medium gba:text-foreground">Data sources</span>
              </div>
              <div className="gba:flex gba:gap-1">
                {onOpenImport && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gba:h-7 gba:text-xs gba:gap-1"
                    onClick={() => {
                      onOpenChange(false)
                      onOpenImport()
                    }}
                    data-testid={`${testId}-add-source`}
                  >
                    <Plus className="gba:w-3 gba:h-3" /> System data
                  </Button>
                )}
                {onOpenFlowImport && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gba:h-7 gba:text-xs gba:gap-1"
                    onClick={() => {
                      onOpenChange(false)
                      onOpenFlowImport()
                    }}
                    data-testid={`${testId}-add-flow-source`}
                  >
                    <GitBranch className="gba:w-3 gba:h-3" /> Flow data
                  </Button>
                )}
                {onOpenExternalImport && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gba:h-7 gba:text-xs gba:gap-1"
                    onClick={() => {
                      onOpenChange(false)
                      onOpenExternalImport()
                    }}
                    data-testid={`${testId}-add-external-source`}
                  >
                    <Plug className="gba:w-3 gba:h-3" /> External
                  </Button>
                )}
              </div>
            </div>

            {dataSource ? (
              <div className="gba:space-y-2">
                <div className="gba:rounded gba:border gba:border-border gba:p-2.5 gba:space-y-2">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <div className="gba:flex gba:items-center gba:gap-1.5">
                      <span className="gba:text-xs gba:font-medium">
                        {dataSource.entityDisplayName || dataSource.entityType}
                      </span>
                      <Badge variant="info" className="gba:text-[10px]">
                        Rows
                      </Badge>
                    </div>
                    <Badge variant="secondary" className="gba:text-xs">
                      {dataSource.refreshMode === 'periodic'
                        ? 'Auto-refresh'
                        : dataSource.refreshMode === 'onOpen'
                          ? 'On open'
                          : 'Manual'}
                    </Badge>
                  </div>
                  {dataSource.lastSyncAt && (
                    <p className="gba:text-xs gba:text-muted-foreground">
                      Last sync: {new Date(dataSource.lastSyncAt).toLocaleString()}
                      {dataSource.lastSyncCount != null && ` (${dataSource.lastSyncCount} records)`}
                    </p>
                  )}
                  {dataSource.lastSyncError && (
                    <p className="gba:text-xs gba:text-destructive">{dataSource.lastSyncError}</p>
                  )}
                  <div className="gba:flex gba:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gba:h-6 gba:text-xs gba:gap-1"
                      onClick={() => void handleSyncNow()}
                      disabled={isSyncing}
                      data-testid={`${testId}-sync-now`}
                    >
                      {isSyncing ? (
                        <>
                          <Spinner size="sm" /> Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="gba:w-3 gba:h-3" /> Sync now
                        </>
                      )}
                    </Button>
                    {onSheetUpdate && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gba:h-6 gba:text-xs gba:gap-1 gba:text-destructive"
                        onClick={() => void handleDisconnect()}
                        data-testid={`${testId}-disconnect`}
                      >
                        <Unlink className="gba:w-3 gba:h-3" /> Disconnect
                      </Button>
                    )}
                  </div>
                </div>
                {auxSources &&
                  auxSources.length > 0 &&
                  auxSources.map((aux, i) => (
                    <div
                      key={`${aux.entityType}-${i}`}
                      className="gba:rounded gba:border gba:border-border gba:p-2 gba:flex gba:items-center gba:justify-between"
                      data-testid={`${testId}-aux-source-${i}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-1.5">
                        <span className="gba:text-xs gba:font-medium">{aux.entityDisplayName}</span>
                        <Badge variant="secondary" className="gba:text-[10px]">
                          Options
                        </Badge>
                      </div>
                      <span className="gba:text-[10px] gba:text-muted-foreground gba:truncate gba:max-w-32">
                        → {aux.targetColumn}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="gba:text-xs gba:text-muted-foreground gba:py-2 gba:text-center">
                No data sources connected. Use the Import button to add one.
              </p>
            )}
          </div>
        </div>

        <SheetFooter className="gba:flex gba:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            data-testid={`${testId}-cancel`}
          >
            Close
          </Button>
          <Button onClick={handleSave} disabled={!canSave} data-testid={`${testId}-save`}>
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
