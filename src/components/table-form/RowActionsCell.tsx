import React from 'react'
import { TableCell, Button } from '@newwork/nw-design-system'
import { PencilSimpleLineIcon, TrashIcon, CheckIcon, XIcon } from '@phosphor-icons/react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

export interface RowActionsCellProps {
  /** Whether the row is currently in edit mode */
  isEditing: boolean
  /** Whether the row is currently saving */
  isSaving: boolean
  /** Whether the form values are valid (for edit mode) */
  isValid?: boolean
  /** Whether the form values have changed from original (for edit mode) */
  isDirty?: boolean
  /** Whether this is a new row being added */
  isNewRow?: boolean
  /** Callback when save button is clicked */
  onSave: () => void
  /** Callback when cancel button is clicked */
  onCancel: () => void
  /** Callback when edit button is clicked */
  onEdit: () => void
  /** Callback when delete button is clicked */
  onDelete: () => void
  /** Base data-testid prefix */
  dataTestId: string
  /** Row identifier for data-testid */
  rowId: string
  /** Optional className for the TableCell */
  className?: string
}

/**
 * Reusable Actions cell for inline table editing.
 * Shows Edit/Delete buttons in view mode and Save/Cancel buttons in edit mode.
 */
export const RowActionsCell: React.FC<RowActionsCellProps> = ({
  isEditing,
  isSaving,
  isValid = true,
  isDirty = true,
  isNewRow = false,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  dataTestId,
  rowId,
  className
}) => {
  // For new rows, isDirty check is not needed (any valid data should be saveable)
  const canSave = isNewRow ? isValid && !isSaving : isValid && isDirty && !isSaving

  if (isEditing) {
    return (
      <TableCell className={className}>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSave}
            disabled={!canSave}
            data-testid={formatDataTestId(dataTestId, isNewRow ? 'create-row-button' : `save-row-button-${rowId}`)}
          >
            <CheckIcon className="gba:h-4 gba:w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSaving}
            data-testid={formatDataTestId(
              dataTestId,
              isNewRow ? 'cancel-new-row-button' : `cancel-row-button-${rowId}`
            )}
          >
            <XIcon className="gba:h-4 gba:w-4" />
          </Button>
        </div>
      </TableCell>
    )
  }

  return (
    <TableCell className={className}>
      <div className="gba:flex gba:items-center gba:gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          data-testid={formatDataTestId(dataTestId, `edit-row-button-${rowId}`)}
        >
          <PencilSimpleLineIcon className="gba:h-4 gba:w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          data-testid={formatDataTestId(dataTestId, `delete-row-button-${rowId}`)}
        >
          <TrashIcon className="gba:h-4 gba:w-4" />
        </Button>
      </div>
    </TableCell>
  )
}
