import React, { useCallback, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, toast, Spinner } from '@newwork/nw-design-system'
import { GitBranch } from 'lucide-react'
import type { FlowEntityKind, FlowEngineTagFilter } from '../../services/flowEngine'
import { BoardApiService } from '../../services/BoardApiService'
import { getFlowFieldDefs, getDefaultSelectedKeys } from '../../services/flowEngine/flowFieldDefinitions'
import { FlowEntityPicker } from './FlowEntityPicker'
import { FlowTemplatePicker } from './FlowTemplatePicker'
import { FlowScopeConfig } from './FlowScopeConfig'
import { FlowFieldSelector } from './FlowFieldSelector'

type Step = 'entity' | 'templates' | 'scope' | 'fields'

export interface FlowEngineDataSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardId: string
  sheetId: string
  userId?: string
  onAfterImport?: () => void
  onSheetUpdate?: (boardId: string, sheetId: string, updates: Record<string, unknown>) => Promise<unknown>
  'data-testid'?: string
}

export const FlowEngineDataSheet: React.FC<FlowEngineDataSheetProps> = ({
  open,
  onOpenChange,
  boardId,
  sheetId,
  userId,
  onAfterImport,
  onSheetUpdate,
  'data-testid': testId = 'flow-engine-data-sheet'
}) => {
  const [step, setStep] = useState<Step>('entity')
  const [flowEntity, setFlowEntity] = useState<FlowEntityKind>('flows')
  const [templateIds, setTemplateIds] = useState<string[]>([])
  const [tags, setTags] = useState<FlowEngineTagFilter[]>([])
  const [scope, setScope] = useState<'all' | 'byUser'>('all')
  const [participationType, setParticipationType] = useState<'initiated' | 'participated'>('initiated')
  const [includeAssigned, setIncludeAssigned] = useState(true)
  const [includeClaimable, setIncludeClaimable] = useState(false)
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [limit, setLimit] = useState(200)
  const [refreshMode, setRefreshMode] = useState<'manual' | 'onOpen' | 'periodic'>('onOpen')
  const [selectedFieldKeys, setSelectedFieldKeys] = useState<string[]>([])
  const [previewRecords, setPreviewRecords] = useState<Record<string, unknown>[]>([])
  const [previewTotal, setPreviewTotal] = useState(0)
  const [isImporting, setIsImporting] = useState(false)
  const [isFetchingPreview, setIsFetchingPreview] = useState(false)

  const resetState = useCallback(() => {
    setStep('entity')
    setFlowEntity('flows')
    setTemplateIds([])
    setTags([])
    setScope('all')
    setParticipationType('initiated')
    setIncludeAssigned(true)
    setIncludeClaimable(false)
    setStatus('')
    setPriority('')
    setLimit(200)
    setRefreshMode('onOpen')
    setSelectedFieldKeys([])
    setPreviewRecords([])
    setPreviewTotal(0)
  }, [])

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) resetState()
      onOpenChange(isOpen)
    },
    [onOpenChange, resetState]
  )

  const handleScopeNext = useCallback(async () => {
    setSelectedFieldKeys(getDefaultSelectedKeys(flowEntity))
    setIsFetchingPreview(true)
    try {
      const result = await BoardApiService.syncFromFlowEngine(boardId, sheetId, {
        flowEntity,
        templateIds: templateIds.length > 0 ? templateIds : undefined,
        tags: tags.length > 0 ? tags : undefined,
        scope,
        userId: scope === 'byUser' ? userId : undefined,
        participationType: scope === 'byUser' ? participationType : undefined,
        includeAssigned: flowEntity === 'tasks' && scope === 'byUser' ? includeAssigned : undefined,
        includeClaimable: flowEntity === 'tasks' && scope === 'byUser' ? includeClaimable : undefined,
        status: status || undefined,
        priority: priority || undefined,
        limit: Math.min(limit, 20),
        mode: 'replace',
        autoColumns: false,
        dryRun: true
      })
      if (result?.previewRecords) {
        setPreviewRecords(result.previewRecords)
        setPreviewTotal(result.fetched)
      }
    } catch {
      /* preview failure is non-fatal */
    }
    setIsFetchingPreview(false)
    setStep('fields')
  }, [
    boardId,
    sheetId,
    flowEntity,
    templateIds,
    tags,
    scope,
    userId,
    participationType,
    includeAssigned,
    includeClaimable,
    status,
    priority,
    limit
  ])

  const handleImport = useCallback(async () => {
    setIsImporting(true)
    try {
      const result = await BoardApiService.syncFromFlowEngine(boardId, sheetId, {
        flowEntity,
        templateIds: templateIds.length > 0 ? templateIds : undefined,
        tags: tags.length > 0 ? tags : undefined,
        scope,
        userId: scope === 'byUser' ? userId : undefined,
        participationType: scope === 'byUser' ? participationType : undefined,
        includeAssigned: flowEntity === 'tasks' && scope === 'byUser' ? includeAssigned : undefined,
        includeClaimable: flowEntity === 'tasks' && scope === 'byUser' ? includeClaimable : undefined,
        status: status || undefined,
        priority: priority || undefined,
        limit,
        mode: 'replace',
        autoColumns: true,
        selectedFields: selectedFieldKeys
      })

      if (!result) {
        toast.error('Import failed')
        return
      }

      const displayName = flowEntity === 'flows' ? 'Flow instances' : 'Flow tasks'
      if (onSheetUpdate) {
        const dsConfig: Record<string, unknown> = {
          id: `ds-fe-${flowEntity}-${Date.now()}`,
          enabled: true,
          provider: 'flowEngine',
          entityType: `flowEngine:${flowEntity}`,
          entityDisplayName: displayName,
          flowEntity,
          templateIds: templateIds.length > 0 ? templateIds : undefined,
          tags: tags.length > 0 ? tags : undefined,
          scope,
          userId: scope === 'byUser' ? userId : undefined,
          participationType: scope === 'byUser' ? participationType : undefined,
          includeAssigned: flowEntity === 'tasks' && scope === 'byUser' ? includeAssigned : undefined,
          includeClaimable: flowEntity === 'tasks' && scope === 'byUser' ? includeClaimable : undefined,
          status: status || undefined,
          priority: priority || undefined,
          limit,
          refreshMode,
          syncMode: 'replace',
          lastSyncAt: new Date().toISOString(),
          lastSyncCount: result.fetched,
          filters: { id: 'root', logic: 'AND', conditions: [] },
          orderBy: [],
          fieldMappings: selectedFieldKeys.map(k => ({ sourceField: k, targetField: k }))
        }
        await onSheetUpdate(boardId, sheetId, { entityDataSource: dsConfig })
      }

      toast.success(`Imported ${result.fetched} ${flowEntity} (${result.synced} rows synced)`)
      onAfterImport?.()
      onOpenChange(false)
      resetState()
    } catch {
      toast.error('Import failed')
    } finally {
      setIsImporting(false)
    }
  }, [
    boardId,
    sheetId,
    userId,
    flowEntity,
    templateIds,
    tags,
    scope,
    participationType,
    includeAssigned,
    includeClaimable,
    status,
    priority,
    limit,
    refreshMode,
    selectedFieldKeys,
    onSheetUpdate,
    onAfterImport,
    onOpenChange,
    resetState
  ])

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="gba:w-full gba:sm:max-w-lg" data-testid={testId}>
        <SheetHeader>
          <SheetTitle className="gba:flex gba:items-center gba:gap-2">
            <GitBranch className="gba:w-4 gba:h-4" />
            Import flow data
          </SheetTitle>
        </SheetHeader>

        <div className="gba:overflow-y-auto gba:flex-1 gba:px-4 gba:pb-4">
          {isImporting || isFetchingPreview ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-3 gba:py-12">
              <Spinner />
              <p className="gba:text-sm gba:text-muted-foreground">
                {isImporting ? `Importing ${flowEntity}...` : 'Loading preview...'}
              </p>
            </div>
          ) : (
            <>
              {step === 'entity' && (
                <FlowEntityPicker
                  selected={flowEntity}
                  onSelect={setFlowEntity}
                  onNext={() => setStep('templates')}
                  data-testid={`${testId}-entity-picker`}
                />
              )}
              {step === 'templates' && (
                <FlowTemplatePicker
                  selectedTemplateIds={templateIds}
                  onSelectedTemplateIdsChange={setTemplateIds}
                  tags={tags}
                  onTagsChange={setTags}
                  onBack={() => setStep('entity')}
                  onNext={() => setStep('scope')}
                  data-testid={`${testId}-template-picker`}
                />
              )}
              {step === 'scope' && (
                <FlowScopeConfig
                  flowEntity={flowEntity}
                  scope={scope}
                  onScopeChange={setScope}
                  participationType={participationType}
                  onParticipationTypeChange={setParticipationType}
                  includeAssigned={includeAssigned}
                  onIncludeAssignedChange={setIncludeAssigned}
                  includeClaimable={includeClaimable}
                  onIncludeClaimableChange={setIncludeClaimable}
                  status={status}
                  onStatusChange={setStatus}
                  priority={priority}
                  onPriorityChange={setPriority}
                  limit={limit}
                  onLimitChange={setLimit}
                  refreshMode={refreshMode}
                  onRefreshModeChange={setRefreshMode}
                  onBack={() => setStep('templates')}
                  onNext={() => void handleScopeNext()}
                  data-testid={`${testId}-scope-config`}
                />
              )}
              {step === 'fields' && (
                <FlowFieldSelector
                  entityLabel={flowEntity === 'flows' ? 'flows' : 'tasks'}
                  fields={getFlowFieldDefs(flowEntity)}
                  selectedKeys={selectedFieldKeys}
                  onSelectedKeysChange={setSelectedFieldKeys}
                  previewRecords={previewRecords}
                  previewTotal={previewTotal}
                  onBack={() => setStep('scope')}
                  onNext={() => void handleImport()}
                  data-testid={`${testId}-field-selector`}
                />
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
