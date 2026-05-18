import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Button, Badge, Input, Textarea, Alert, AlertDescription, Spinner } from '@newwork/nw-design-system'
import { X, Database, Rocket, Save, ChevronDown, ChevronUp } from 'lucide-react'
import { TrashIcon } from '@phosphor-icons/react'
import type { ColumnDefinition, CustomDataDefinition, RowMutationResult, UpdateDefinitionDto } from '../types'
import { DataTablePanel } from './DataTablePanel'
import { ColumnEditor } from './ColumnEditor'
import { DeleteEntityDialog } from './DeleteEntityDialog'
import type { SchemaEditorMode } from './SchemaEditorModeToggle'
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
  onDelete: (definition: CustomDataDefinition) => Promise<void>
  onOpenPromote: () => void
  onCreateRow: (ns: string, entityName: string, values: Record<string, unknown>) => Promise<RowMutationResult>
  onUpdateRow: (
    ns: string,
    entityName: string,
    rowId: string,
    values: Record<string, unknown>
  ) => Promise<RowMutationResult>
  onDeleteRow: (ns: string, entityName: string, rowId: string) => Promise<RowMutationResult>
  schemaEditorMode: SchemaEditorMode
  'data-testid'?: string
}

function arePersistedColumnsEqual(
  formColumns: ColumnDefinition[] | undefined,
  definitionColumns: ColumnDefinition[] | undefined
): boolean {
  return JSON.stringify(formColumns ?? []) === JSON.stringify(definitionColumns ?? [])
}

export const EntityDetailPanel: React.FC<EntityDetailPanelProps> = ({
  definition,
  allDefinitions,
  accessToken,
  onClose,
  onSave,
  onDelete,
  onOpenPromote,
  onCreateRow,
  onUpdateRow,
  onDeleteRow,
  schemaEditorMode,
  'data-testid': testId = 'entity-detail-panel'
}) => {
  const [displayName, setDisplayName] = useState(definition.displayName || '')
  const [description, setDescription] = useState(definition.description || '')
  const [columns, setColumns] = useState<UiColumnDefinition[]>(() =>
    ensureColumnUiIds(prepareColumnsForEditing(definition.columns ?? []))
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [settingsExpanded, setSettingsExpanded] = useState(false)
  const definitionIdRef = useRef(definition.id)

  const isPromoted = definition.publishState === 'PROMOTED_TRACKED'
  useEffect(() => {
    if (definition.id !== definitionIdRef.current) {
      definitionIdRef.current = definition.id
      setDisplayName(definition.displayName || '')
      setDescription(definition.description || '')
      setColumns(ensureColumnUiIds(prepareColumnsForEditing(definition.columns ?? [])))
      setDeleteError(null)
      setError(null)
      setSettingsExpanded(false)
    }
  }, [definition])

  const hasChanges = useMemo(() => {
    if ((definition.displayName || '') !== (displayName || '')) {
      return true
    }
    if ((definition.description || '') !== (description || '')) {
      return true
    }
    const definitionColumnsForForm = prepareColumnsForEditing(definition.columns ?? [])
    return !arePersistedColumnsEqual(stripColumnUiIds(columns), definitionColumnsForForm)
  }, [columns, definition, description, displayName])

  const handleDisplayNameChange = useCallback((value: string) => {
    setDisplayName(value)
  }, [])

  const handleDescriptionChange = useCallback((value: string) => {
    setDescription(value)
  }, [])

  const handleColumnsChange = useCallback((cols: UiColumnDefinition[]) => {
    setColumns(cols)
  }, [])

  const handleSave = useCallback(async () => {
    const normalizedDisplayName = String(displayName || '').trim()
    const validationError = validateDefinitionForm({
      displayName: isPromoted ? normalizedDisplayName || definition.entityName : normalizedDisplayName,
      columns,
      namespace: definition.namespace,
      definitions: isPromoted ? undefined : (allDefinitions ?? []),
      currentDefinitionId: definition.id
    })
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const persistedColumns = stripColumnUiIds(prepareColumnsForPersistence(columns))
      const dto: UpdateDefinitionDto = {
        description: description || undefined,
        columns: persistedColumns
      }
      if (!isPromoted) {
        dto.displayName = normalizedDisplayName
      }
      await onSave(dto, definition)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [allDefinitions, columns, definition, displayName, description, isPromoted, onSave])

  const handleDelete = useCallback(async () => {
    setIsDeleting(true)
    setDeleteError(null)

    try {
      await onDelete(definition)
      setIsDeleteDialogOpen(false)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setIsDeleting(false)
    }
  }, [definition, onDelete])

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
    <>
      <div
        className="gba:h-full gba:w-[420px] gba:max-w-full gba:bg-background gba:border-l gba:border-border gba:shadow-xl gba:flex gba:flex-col gba:animate-in gba:slide-in-from-right gba:duration-200"
        data-testid={testId}
      >
        <div className="gba:px-4 gba:py-3 gba:border-b gba:border-border gba:shrink-0">
          <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
            <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0 gba:flex-1">
              <Database className="gba:h-4 gba:w-4 gba:text-primary gba:shrink-0" />
              {isPromoted ? (
                <h2 className="gba:truncate gba:text-sm gba:font-semibold" data-testid={`${testId}-display-name`}>
                  {displayName || publicEntityName}
                </h2>
              ) : (
                <Input
                  value={displayName}
                  onChange={e => handleDisplayNameChange(e.target.value)}
                  placeholder="Entity name..."
                  className="gba:h-7 gba:text-sm gba:font-semibold gba:border-none gba:bg-transparent gba:px-1 gba:focus-visible:bg-muted/50"
                  data-testid={`${testId}-display-name`}
                />
              )}
            </div>
            <Button variant="ghost" size="iconSm" onClick={onClose} data-testid={`${testId}-close`}>
              <X className="gba:h-3.5 gba:w-3.5" />
            </Button>
          </div>

          {schemaEditorMode === 'advanced' && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-[10px] gba:text-muted-foreground gba:mb-2">
              <span>NS</span>
              <span className="gba:font-mono">{definition.namespace}</span>
            </div>
          )}

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

          <div className="gba:flex gba:items-center gba:gap-2">
            <Badge variant={isPromoted ? 'success' : 'warning'} className="gba:text-[10px] gba:px-1.5 gba:py-0">
              {isPromoted ? 'Promoted' : 'Draft'}
            </Badge>
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
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteError(null)
                setIsDeleteDialogOpen(true)
              }}
              disabled={isDeleting || hasChanges}
              data-testid={`${testId}-delete`}
              className="gba:h-7 gba:text-xs"
            >
              <TrashIcon className="gba:h-3 gba:w-3 gba:mr-1" />
              Delete
            </Button>
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

        <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:p-4 gba:space-y-4">
          <ColumnEditor
            columns={columns}
            onChange={handleColumnsChange}
            accessToken={accessToken}
            currentNamespace={definition.namespace}
            availableNamespaces={availableNamespaces}
            customEntityOptions={customEntityOptions}
            showTechnicalFieldNames={schemaEditorMode === 'advanced'}
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
      <DeleteEntityDialog
        open={isDeleteDialogOpen}
        entityName={displayName || publicEntityName}
        namespace={definition.namespace}
        isDeleting={isDeleting}
        error={deleteError}
        onOpenChange={open => {
          setIsDeleteDialogOpen(open)
          if (!open) {
            setDeleteError(null)
          }
        }}
        onConfirm={handleDelete}
        data-testid={`${testId}-delete-dialog`}
      />
    </>
  )
}
