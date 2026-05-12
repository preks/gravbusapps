import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Button, Badge, Input, Textarea, Alert, AlertDescription, Spinner } from '@newwork/nw-design-system'
import { X, Database, Rocket, Save, ChevronDown, ChevronUp } from 'lucide-react'
import type { CustomDataDefinition, RowMutationResult, UpdateDefinitionDto } from '../types'
import { DataTablePanel } from './DataTablePanel'
import { ColumnEditor } from './ColumnEditor'
import { ensureColumnUiIds, stripColumnUiIds, type UiColumnDefinition } from '../utils/columnUiIds'
import {
  prepareColumnsForPersistence,
  prepareColumnsForEditing,
  validateDefinitionForm
} from '../utils/definitionFormUtils'

interface EntityDetailPanelProps {
  definition: CustomDataDefinition
  allDefinitions?: CustomDataDefinition[]
  accessToken: string
  onClose: () => void
  onSave: (dto: UpdateDefinitionDto, definition: CustomDataDefinition) => Promise<void>
  onOpenPromote: () => void
  onCreateRow: (ns: string, entityName: string, values: Record<string, unknown>) => Promise<RowMutationResult>
  onUpdateRow: (
    ns: string,
    entityName: string,
    rowId: string,
    values: Record<string, unknown>
  ) => Promise<RowMutationResult>
  onDeleteRow: (ns: string, entityName: string, rowId: string) => Promise<RowMutationResult>
  'data-testid'?: string
}

export const EntityDetailPanel: React.FC<EntityDetailPanelProps> = ({
  definition,
  allDefinitions,
  accessToken,
  onClose,
  onSave,
  onOpenPromote,
  onCreateRow,
  onUpdateRow,
  onDeleteRow,
  'data-testid': testId = 'entity-detail-panel'
}) => {
  const [displayName, setDisplayName] = useState(definition.displayName || '')
  const [description, setDescription] = useState(definition.description || '')
  const [columns, setColumns] = useState<UiColumnDefinition[]>(() =>
    ensureColumnUiIds(prepareColumnsForEditing(definition.columns ?? []))
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [settingsExpanded, setSettingsExpanded] = useState(false)
  const definitionIdRef = useRef(definition.id)

  const isPromoted = definition.publishState === 'PROMOTED_TRACKED'
  useEffect(() => {
    if (definition.id !== definitionIdRef.current) {
      definitionIdRef.current = definition.id
      setDisplayName(definition.displayName || '')
      setDescription(definition.description || '')
      setColumns(ensureColumnUiIds(prepareColumnsForEditing(definition.columns ?? [])))
      setHasChanges(false)
      setError(null)
      setSettingsExpanded(false)
    }
  }, [definition])

  const markDirty = useCallback(() => setHasChanges(true), [])

  const handleDisplayNameChange = useCallback(
    (value: string) => {
      setDisplayName(value)
      markDirty()
    },
    [markDirty]
  )

  const handleDescriptionChange = useCallback(
    (value: string) => {
      setDescription(value)
      markDirty()
    },
    [markDirty]
  )

  const handleColumnsChange = useCallback(
    (cols: UiColumnDefinition[]) => {
      setColumns(cols)
      markDirty()
    },
    [markDirty]
  )

  const handleSave = useCallback(async () => {
    const validationError = validateDefinitionForm({ displayName, columns })
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const persistedColumns = stripColumnUiIds(prepareColumnsForPersistence(columns))
      const dto: UpdateDefinitionDto = {
        entityName: definition.entityName,
        displayName: displayName || undefined,
        description: description || undefined,
        columns: persistedColumns
      }
      await onSave(dto, definition)
      setHasChanges(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [columns, definition, displayName, description, onSave])

  const availableNamespaces = Array.from(
    new Set([definition.namespace, ...(allDefinitions ?? []).map(entity => entity.namespace || 'default')])
  ).sort((left, right) => left.localeCompare(right))
  const customEntityOptions = (allDefinitions ?? []).map(d => ({
    namespace: d.namespace || 'default',
    entityName: d.entityName,
    displayName: d.displayName || d.entityName
  }))
  const publicEntityName = definition.entityName

  return (
    <div
      className="gba:h-full gba:w-[420px] gba:max-w-full gba:bg-background gba:border-l gba:border-border gba:shadow-xl gba:flex gba:flex-col gba:animate-in gba:slide-in-from-right gba:duration-200"
      data-testid={testId}
    >
      {/* Header with inline settings */}
      <div className="gba:px-4 gba:py-3 gba:border-b gba:border-border gba:shrink-0">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
          <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0 gba:flex-1">
            <Database className="gba:h-4 gba:w-4 gba:text-primary gba:shrink-0" />
            <Input
              value={displayName}
              onChange={e => handleDisplayNameChange(e.target.value)}
              placeholder="Entity name..."
              className="gba:h-7 gba:text-sm gba:font-semibold gba:border-none gba:bg-transparent gba:px-1 gba:focus-visible:bg-muted/50"
              disabled={isPromoted}
              data-testid={`${testId}-display-name`}
            />
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} data-testid={`${testId}-close`}>
            <X className="gba:h-3.5 gba:w-3.5" />
          </Button>
        </div>

        <div className="gba:flex gba:items-center gba:gap-2 gba:text-[10px] gba:text-muted-foreground gba:mb-2">
          <span>Entity</span>
          <span className="gba:font-mono">{publicEntityName || '-'}</span>
          <span>|</span>
          <span>NS</span>
          <span className="gba:font-mono">{definition.namespace}</span>
        </div>
        {isPromoted && (
          <div className="gba:text-[10px] gba:text-muted-foreground gba:mb-2">Names are locked after promotion.</div>
        )}

        {/* Collapsible description */}
        <button
          type="button"
          onClick={() => setSettingsExpanded(prev => !prev)}
          className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:mb-2 gba:cursor-pointer"
          data-testid={`${testId}-toggle-description`}
        >
          {settingsExpanded ? <ChevronUp className="gba:h-3 gba:w-3" /> : <ChevronDown className="gba:h-3 gba:w-3" />}
          Description
        </button>
        {settingsExpanded && (
          <Textarea
            value={description}
            onChange={e => handleDescriptionChange(e.target.value)}
            placeholder="Describe this entity..."
            rows={2}
            className="gba:text-xs gba:mb-2"
            data-testid={`${testId}-description`}
          />
        )}

        {/* Status + actions row */}
        <div className="gba:flex gba:items-center gba:gap-2">
          <Badge variant={isPromoted ? 'success' : 'warning'} className="gba:text-[10px] gba:px-1.5 gba:py-0">
            {isPromoted ? 'Promoted' : 'Draft'}
          </Badge>
          {definition.deployState?.tableName && (
            <span className="gba:text-[10px] gba:font-mono gba:text-muted-foreground">
              {definition.deployState.tableName}
            </span>
          )}
          <div className="gba:flex-1" />
          {hasChanges && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              data-testid={`${testId}-save`}
              className="gba:h-7 gba:text-xs"
            >
              {isSaving ? <Spinner size="sm" className="gba:mr-1" /> : <Save className="gba:h-3 gba:w-3 gba:mr-1" />}
              Save
            </Button>
          )}
          <Button
            variant={isPromoted ? 'outline' : hasChanges ? 'outline' : 'default'}
            size="sm"
            onClick={onOpenPromote}
            data-testid={`${testId}-promote`}
            className="gba:h-7 gba:text-xs"
            disabled={hasChanges}
          >
            <Rocket className="gba:h-3 gba:w-3 gba:mr-1" />
            {isPromoted ? 'Re-deploy' : 'Promote'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="gba:mx-4 gba:mt-2">
          <AlertDescription className="gba:text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Scrollable body -- columns + data */}
      <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:p-4 gba:space-y-4">
        <ColumnEditor
          columns={columns}
          onChange={handleColumnsChange}
          accessToken={accessToken}
          currentNamespace={definition.namespace}
          availableNamespaces={availableNamespaces}
          customEntityOptions={customEntityOptions}
          data-testid={`${testId}-column-editor`}
        />

        {isPromoted && (
          <DataTablePanel
            definition={definition}
            accessToken={accessToken}
            onCreateRow={onCreateRow}
            onUpdateRow={onUpdateRow}
            onDeleteRow={onDeleteRow}
            data-testid={`${testId}-data`}
          />
        )}
      </div>
    </div>
  )
}
