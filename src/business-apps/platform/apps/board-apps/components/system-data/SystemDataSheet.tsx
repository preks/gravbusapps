import React, { useCallback, useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, toast } from '@newwork/nw-design-system'
import { Database } from 'lucide-react'
import { useBoardEntityData } from '../../hooks/useBoardEntityData'
import { useBoardAI, type MergePlan } from '../../hooks/useBoardAI'
import { BoardApiService } from '../../services/BoardApiService'
import { getEntityDef } from '../../queries/entityQueries'
import type { BoardColumn, BoardRow } from '../../types'
import { EntitySelector } from './EntitySelector'
import { DataPreview } from './DataPreview'
import { MergePreview } from './MergePreview'
import { ImportConfig } from './ImportConfig'

type Step = 'select' | 'preview' | 'merge' | 'import'
type MergeStrategy = MergePlan['strategy']

export interface SystemDataSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardId: string
  sheetId: string
  accessToken: string
  existingColumns?: BoardColumn[]
  existingRows?: BoardRow[]
  onAfterImport?: () => void
  onSheetUpdate?: (boardId: string, sheetId: string, updates: Record<string, unknown>) => Promise<unknown>
  'data-testid'?: string
}

export const SystemDataSheet: React.FC<SystemDataSheetProps> = ({
  open,
  onOpenChange,
  boardId,
  sheetId,
  accessToken,
  existingColumns = [],
  existingRows = [],
  onAfterImport,
  onSheetUpdate,
  'data-testid': testId = 'system-data-sheet'
}) => {
  const [step, setStep] = useState<Step>('select')
  const [entity, setEntity] = useState('Employee')
  const [limit, setLimit] = useState(200)
  const [mode, setMode] = useState<'replace' | 'append' | 'merge'>('replace')
  const [mergeKey, setMergeKey] = useState('id')
  const [isImporting, setIsImporting] = useState(false)

  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>('addRows')
  const [mergePlan, setMergePlan] = useState<MergePlan | null>(null)
  const [joinExistingCol, setJoinExistingCol] = useState('')
  const [joinNewCol, setJoinNewCol] = useState('')
  const [populateTargetCol, setPopulateTargetCol] = useState('')
  const [populateSourceField, setPopulateSourceField] = useState('')
  const [keepConnected, setKeepConnected] = useState(false)
  const [refreshMode, setRefreshMode] = useState<'manual' | 'onOpen' | 'periodic'>('manual')

  const entityData = useBoardEntityData(accessToken)
  const ai = useBoardAI(accessToken)

  const boardHasData = existingRows.length > 0 && existingColumns.length > 0

  const handlePreview = useCallback(async () => {
    await entityData.fetchPreview(entity, 50)
    setStep('preview')
  }, [entity, entityData])

  const handleGoToMergeOrImport = useCallback(async () => {
    if (boardHasData) {
      setStep('merge')
      const def = getEntityDef(entity)
      if (!def) return

      const activeFieldDefs = def.fields.filter(f => entityData.selectedFields.includes(f.key))

      const result = await ai.analyzeMerge(
        existingColumns.map(c => ({ name: c.name, type: c.type, label: c.label })),
        existingRows.slice(0, 5).map(r => r.data),
        def.displayName,
        activeFieldDefs.map(f => ({ key: f.key, label: f.label, type: f.type })),
        entityData.state.records.slice(0, 5)
      )

      if (result) {
        setMergePlan(result)
        setMergeStrategy(result.strategy)
        if (result.joinKey) {
          setJoinExistingCol(result.joinKey.existingColumn)
          setJoinNewCol(result.joinKey.newColumn)
        }
      }
    } else {
      setStep('import')
    }
  }, [boardHasData, entity, entityData, existingColumns, existingRows, ai])

  const handleImport = useCallback(async () => {
    setIsImporting(true)
    try {
      const def = getEntityDef(entity)
      if (!def) {
        toast.error('Unknown entity type')
        return
      }

      const activeFieldDefs = def.fields.filter(f => entityData.selectedFields.includes(f.key))

      const saveConnection = async (syncCount: number) => {
        if (!keepConnected || !onSheetUpdate) return
        const dsConfig: Record<string, unknown> = {
          id: `ds-${entity}-${Date.now()}`,
          enabled: true,
          entityType: entity,
          entityDisplayName: def.displayName,
          filters: { id: 'root', logic: 'AND', conditions: [] },
          orderBy: [],
          limit,
          fieldMappings: activeFieldDefs.map(f => ({
            entityField: f.key,
            entityFieldLabel: f.label,
            entityFieldType: f.type,
            columnId: f.key,
            include: true
          })),
          refreshMode,
          syncMode: mode,
          mergeStrategy,
          lastSyncAt: new Date().toISOString(),
          lastSyncCount: syncCount
        }
        if (mergeStrategy === 'populateOptions') {
          dsConfig.populateTargetCol = populateTargetCol
          dsConfig.populateSourceField = populateSourceField
        }
        await onSheetUpdate(boardId, sheetId, { entityDataSource: dsConfig })
      }

      if (mergeStrategy === 'populateOptions' && populateTargetCol && populateSourceField) {
        const result = await BoardApiService.populateColumnOptions(
          boardId,
          sheetId,
          entity,
          populateSourceField,
          populateTargetCol,
          limit,
          activeFieldDefs
        )
        if (!result) {
          toast.error('Failed to populate options.')
          return
        }
        await saveConnection(result.optionCount)
        toast.success(`Added ${result.optionCount} options to "${populateTargetCol}" from ${def.displayName}`)
        onAfterImport?.()
        onOpenChange(false)
        resetState()
        return
      }

      const effectiveMode = boardHasData && mergeStrategy === 'addRows' ? ('append' as const) : mode

      const result = await BoardApiService.syncFromGraphQL(boardId, sheetId, {
        entity,
        limit,
        mode: effectiveMode,
        mergeKey: effectiveMode === 'merge' ? mergeKey.trim() : undefined,
        autoColumns: true,
        fieldDefs: activeFieldDefs,
        mergeStrategy: boardHasData ? mergeStrategy : undefined,
        joinKey:
          mergeStrategy === 'addColumns' || mergeStrategy === 'hybrid'
            ? { existingColumn: joinExistingCol, newColumn: joinNewCol }
            : undefined
      })

      if (!result) {
        toast.error('Import failed.')
        return
      }

      await saveConnection(result.fetched)

      toast.success(`Imported ${result.fetched} ${def.displayName} records (${result.synced} rows synced)`)
      onAfterImport?.()
      onOpenChange(false)
      resetState()
    } catch {
      toast.error('Import failed')
    } finally {
      setIsImporting(false)
    }
  }, [
    entity,
    entityData,
    boardId,
    sheetId,
    limit,
    mode,
    mergeKey,
    boardHasData,
    mergeStrategy,
    joinExistingCol,
    joinNewCol,
    keepConnected,
    refreshMode,
    onSheetUpdate,
    onAfterImport,
    onOpenChange
  ])

  const resetState = useCallback(() => {
    setStep('select')
    setMergePlan(null)
    setMergeStrategy('addRows')
    setJoinExistingCol('')
    setJoinNewCol('')
    setPopulateTargetCol('')
    setPopulateSourceField('')
    setKeepConnected(false)
    entityData.clear()
    ai.reset()
  }, [entityData, ai])

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) resetState()
      onOpenChange(isOpen)
    },
    [onOpenChange, resetState]
  )

  useEffect(() => {
    if (!open) return
    if (boardHasData) setMode('append')
  }, [open, boardHasData])

  const sheetWidth = step === 'preview' || step === 'merge' ? 'gba:sm:max-w-2xl' : 'gba:sm:max-w-lg'

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className={sheetWidth} data-testid={testId}>
        <SheetHeader>
          <SheetTitle className="gba:flex gba:items-center gba:gap-2">
            <Database className="gba:w-4 gba:h-4" />
            Import system data
          </SheetTitle>
        </SheetHeader>

        <div className="gba:overflow-y-auto gba:flex-1 gba:px-4 gba:pb-4">
          {step === 'select' && (
            <EntitySelector
              entity={entity}
              onEntityChange={setEntity}
              onNext={() => void handlePreview()}
              isLoading={entityData.state.isLoading}
              data-testid={`${testId}-selector`}
            />
          )}

          {step === 'preview' && entityData.entityDef && (
            <DataPreview
              entityDef={entityData.entityDef}
              records={entityData.state.records}
              total={entityData.state.total}
              availableFields={entityData.availableFields}
              selectedFields={entityData.selectedFields}
              onSelectedFieldsChange={entityData.setSelectedFields}
              onBack={() => setStep('select')}
              onNext={() => void handleGoToMergeOrImport()}
              data-testid={`${testId}-preview`}
            />
          )}

          {step === 'merge' && entityData.entityDef && (
            <MergePreview
              entityDef={entityData.entityDef}
              existingColumns={existingColumns}
              mergePlan={mergePlan}
              isAnalyzing={ai.isProcessing}
              aiError={ai.error}
              strategy={mergeStrategy}
              onStrategyChange={setMergeStrategy}
              joinExistingCol={joinExistingCol}
              onJoinExistingColChange={setJoinExistingCol}
              joinNewCol={joinNewCol}
              onJoinNewColChange={setJoinNewCol}
              populateTargetCol={populateTargetCol}
              onPopulateTargetColChange={setPopulateTargetCol}
              populateSourceField={populateSourceField}
              onPopulateSourceFieldChange={setPopulateSourceField}
              selectedFields={entityData.selectedFields}
              onBack={() => setStep('preview')}
              onNext={() => setStep('import')}
              data-testid={`${testId}-merge`}
            />
          )}

          {step === 'import' && entityData.entityDef && (
            <ImportConfig
              entityDef={entityData.entityDef}
              total={entityData.state.total}
              selectedFieldCount={entityData.selectedFields.length}
              limit={limit}
              onLimitChange={setLimit}
              mode={mode}
              onModeChange={setMode}
              mergeKey={mergeKey}
              onMergeKeyChange={setMergeKey}
              isImporting={isImporting}
              onBack={() => setStep(boardHasData ? 'merge' : 'preview')}
              onImport={() => void handleImport()}
              keepConnected={keepConnected}
              onKeepConnectedChange={setKeepConnected}
              refreshMode={refreshMode}
              onRefreshModeChange={setRefreshMode}
              hideModeSelector={boardHasData}
              data-testid={`${testId}-config`}
            />
          )}

          {entityData.state.error && (
            <p className="gba:mt-3 gba:text-xs gba:text-destructive">{entityData.state.error}</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
