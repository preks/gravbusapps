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
import { Database, RefreshCw, Unlink, Plus } from 'lucide-react'
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
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSyncNow = useCallback(async () => {
    if (!activeSheet || !dataSource) return
    setIsSyncing(true)
    const dsAny = dataSource as Record<string, unknown>
    try {
      let syncCount = 0
      if (dsAny.mergeStrategy === 'populateOptions' && dsAny.populateTargetCol && dsAny.populateSourceField) {
        const result = await BoardApiService.populateColumnOptions(
          board.id,
          activeSheet.id,
          dataSource.entityType,
          dsAny.populateSourceField as string,
          dsAny.populateTargetCol as string,
          dataSource.limit || 200
        )
        if (!result) {
          toast.error('Sync failed')
          return
        }
        syncCount = result.optionCount
        toast.success(
          `Updated ${syncCount} options for "${dsAny.populateTargetCol}" from ${dataSource.entityDisplayName || dataSource.entityType}`
        )
      } else {
        const result = await BoardApiService.syncFromGraphQL(board.id, activeSheet.id, {
          entity: dataSource.entityType,
          limit: dataSource.limit || 200,
          mode: dataSource.syncMode || 'replace',
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
                  <Plus className="gba:w-3 gba:h-3" /> Add source
                </Button>
              )}
            </div>

            {dataSource ? (
              <div className="gba:rounded gba:border gba:border-border gba:p-2.5 gba:space-y-2">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <span className="gba:text-xs gba:font-medium">
                    {dataSource.entityDisplayName || dataSource.entityType}
                  </span>
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
