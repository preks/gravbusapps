import React from 'react'
import { TableRow, TableCell, Button, ButtonGroup } from '@newwork/nw-design-system'
import { ChevronRight, ChevronDown, Save, X, Trash } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { ContextWithActions, ContextDTO, ContextDataDTO } from '@/common/data/resources/types/context.types'
import { EditableCell } from '@/components/editable-cell'
import type { UseEditableStateResult } from '../../../../../../hooks/useEditableState'
import { useEditableRow } from '../../../../../../hooks/useEditableRow'

interface ContextTableRowProps extends BusinessAppContextProps {
  context: ContextWithActions
  editableState: UseEditableStateResult<ContextDTO>
  onFieldEdit: (contextId: string, field: keyof ContextDTO, value: any) => void
  onSaveEntry: (contextId: string) => Promise<void>
  onDiscardEntry: (contextId: string) => void
  onDelete: (context: ContextWithActions) => void
  onToggleExpansion: (contextId: string) => void
  isExpanded: boolean
  isDeleting: boolean
  setContextDataDialogOpen: (id: string | null) => void
  dataTestId: string
}

const ContextTableRowComponent: React.FC<ContextTableRowProps> = ({
  context,
  editableState,
  onFieldEdit,
  onSaveEntry,
  onDiscardEntry,
  onDelete,
  onToggleExpansion,
  isExpanded,
  isDeleting,
  setContextDataDialogOpen,
  dataTestId
}) => {
  const {
    entryId: contextId,
    hasEdits,
    isSaving,
    getFieldValue,
    isFieldEdited
  } = useEditableRow(context.context, editableState)

  return (
    <TableRow data-testid={`${dataTestId}-context-row-${contextId}`}>
      {/* Expansion Toggle */}
      <TableCell className="gba:w-8 gba:px-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onToggleExpansion(contextId)}
          data-testid={`${dataTestId}-expand-${contextId}`}
          className="gba:h-6 gba:w-6 gba:p-0"
        >
          {isExpanded ? <ChevronDown className="gba:h-4 gba:w-4" /> : <ChevronRight className="gba:h-4 gba:w-4" />}
        </Button>
      </TableCell>

      {/* Context Name */}
      <TableCell className="gba:px-2">
        <EditableCell
          value={getFieldValue('contextName') as string}
          onChange={value => onFieldEdit(contextId, 'contextName', value)}
          testId={`${dataTestId}-contextName-${contextId}`}
          isEdited={isFieldEdited('contextName')}
          disabled={isSaving}
          placeholder="Enter context name"
        />
      </TableCell>

      {/* Permission Schema */}
      <TableCell className="gba:px-2">
        <EditableCell
          value={(getFieldValue('permissionSchema') as string) || ''}
          onChange={value => onFieldEdit(contextId, 'permissionSchema', value)}
          testId={`${dataTestId}-permissionSchema-${contextId}`}
          isEdited={isFieldEdited('permissionSchema')}
          disabled={isSaving}
          placeholder="Enter permission schema"
        />
      </TableCell>

      {/* Actions Count */}
      <TableCell className="gba:text-center gba:px-2">
        <span className="gba:text-sm gba:text-muted-foreground">{context.actions?.length || 0}</span>
      </TableCell>

      {/* Context Data */}
      <TableCell className="gba:px-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setContextDataDialogOpen(contextId)}
          data-testid={`${dataTestId}-context-data-button-${contextId}`}
          className={`gba:[&&]:h-6 ${isFieldEdited('contextData') ? 'gba:border-info' : 'gba:border-primary'}`}
        >
          Context Data (
          {((getFieldValue('contextData') as ContextDataDTO[]) || context.context.contextData || []).length})
        </Button>
      </TableCell>

      {/* Actions */}
      <TableCell className="gba:sticky gba:right-0 gba:bg-background gba:z-10 gba:px-2">
        <div className="gba:flex gba:justify-end">
          <ButtonGroup onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} className="gba:h-6">
            <Button
              size="iconSm"
              variant="secondary"
              className="gba:h-6"
              onClick={e => {
                e.stopPropagation()
                onSaveEntry(contextId)
              }}
              disabled={!hasEdits || isSaving || isDeleting}
              data-testid={`${dataTestId}-save-context-${contextId}`}
              title="Save changes"
            >
              <Save className="gba:h-4 gba:w-4" />
            </Button>
            <Button
              size="iconSm"
              variant="secondary"
              className="gba:h-6"
              onClick={e => {
                e.stopPropagation()
                onDiscardEntry(contextId)
              }}
              disabled={!hasEdits || isSaving || isDeleting}
              data-testid={`${dataTestId}-discard-context-${contextId}`}
              title="Discard changes"
            >
              <X className="gba:h-4 gba:w-4" />
            </Button>
            <Button
              size="iconSm"
              variant="secondary"
              className="gba:h-6"
              onClick={e => {
                e.stopPropagation()
                onDelete(context)
              }}
              disabled={isDeleting}
              data-testid={`${dataTestId}-delete-context-${contextId}`}
              title="Delete"
            >
              <Trash className="gba:h-4 gba:w-4" />
            </Button>
          </ButtonGroup>
        </div>
      </TableCell>
    </TableRow>
  )
}

// Helper function to compare arrays by reference and length
const arraysEqual = (a: any[] | undefined, b: any[] | undefined): boolean => {
  if (a === b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false
  return true // Assume arrays are stable references
}

// Helper to check if editableState changed for this specific entry
const editableStateChanged = (
  prevState: UseEditableStateResult<ContextDTO>,
  nextState: UseEditableStateResult<ContextDTO>,
  entryId: string
): boolean => {
  const prevEdited = prevState.state.editedEntries.get(entryId)
  const nextEdited = nextState.state.editedEntries.get(entryId)
  const prevIsDraft = prevState.state.draftEntryIds.has(entryId)
  const nextIsDraft = nextState.state.draftEntryIds.has(entryId)
  const prevIsSaving = prevState.state.savingEntryId === entryId
  const nextIsSaving = nextState.state.savingEntryId === entryId

  if (prevIsDraft !== nextIsDraft || prevIsSaving !== nextIsSaving) return true

  if (prevEdited === nextEdited) return false
  if (!prevEdited && !nextEdited) return false
  if (!prevEdited || !nextEdited) return true

  // Deep compare edited entries
  const prevKeys = Object.keys(prevEdited)
  const nextKeys = Object.keys(nextEdited)
  if (prevKeys.length !== nextKeys.length) return true

  for (const key of prevKeys) {
    if (prevEdited[key] !== nextEdited[key]) {
      // For arrays, compare by reference (they should be stable)
      if (Array.isArray(prevEdited[key]) && Array.isArray(nextEdited[key])) {
        if (!arraysEqual(prevEdited[key], nextEdited[key])) return true
      } else {
        return true
      }
    }
  }

  return false
}

export const ContextTableRow = React.memo(ContextTableRowComponent, (prevProps, nextProps) => {
  // Compare context data
  const prevContext = prevProps.context.context
  const nextContext = nextProps.context.context

  if (
    prevContext.id !== nextContext.id ||
    prevContext.contextName !== nextContext.contextName ||
    prevContext.permissionSchema !== nextContext.permissionSchema
  ) {
    return false
  }

  // Compare contextData array length
  const prevContextDataLength = (prevContext.contextData || []).length
  const nextContextDataLength = (nextContext.contextData || []).length
  if (prevContextDataLength !== nextContextDataLength) return false

  // Compare actions count
  const prevActionsCount = prevProps.context.actions?.length || 0
  const nextActionsCount = nextProps.context.actions?.length || 0
  if (prevActionsCount !== nextActionsCount) return false

  // Compare editable state for this specific entry
  if (editableStateChanged(prevProps.editableState, nextProps.editableState, prevContext.id)) {
    return false
  }

  // Compare simple props
  if (
    prevProps.isExpanded !== nextProps.isExpanded ||
    prevProps.isDeleting !== nextProps.isDeleting ||
    prevProps.dataTestId !== nextProps.dataTestId
  ) {
    return false
  }

  // Callbacks are assumed to be stable (wrapped in useCallback)
  // If they change, we want to re-render anyway

  return true
})
