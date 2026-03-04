import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { Pencil, Trash2, Check, X, Loader2 } from 'lucide-react'
import type { DataModelPreviewColumn } from './dataModelPreviewTypes'
import { CellInput, type RowValues } from './DataModelPreviewCells'

interface SimpleTableRowProps {
  row: Record<string, unknown>
  rowIndex: number
  columns: DataModelPreviewColumn[]
  isEditing: boolean
  editValues: RowValues
  canEdit: boolean
  canDelete: boolean
  saving: boolean
  testId: string
  onStartEdit: () => void
  onCancelEdit: () => void
  onSave: () => void
  onDelete: () => void
  onCellChange: (name: string, value: string | boolean) => void
  formatValue: (value: unknown, type: string) => string
}

export const SimpleTableRow: React.FC<SimpleTableRowProps> = ({
  row,
  rowIndex,
  columns,
  isEditing,
  editValues,
  canEdit,
  canDelete,
  saving,
  testId,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onCellChange,
  formatValue
}) => {
  return (
    <tr className="gba:border-b gba:border-border hover:gba:bg-muted/30">
      {columns.map(col => (
        <td key={col.name} className="gba:px-3 gba:py-2 gba:align-middle">
          <div className="gba:w-full gba:overflow-hidden">
            {isEditing ? (
              <CellInput
                col={col}
                value={editValues[col.name] ?? (col.type === 'CHECKBOX' ? false : '')}
                onChange={val => onCellChange(col.name, val)}
                disabled={saving}
              />
            ) : (
              <span className="gba:block gba:truncate">{formatValue(row[col.name], col.type)}</span>
            )}
          </div>
        </td>
      ))}
      <td className="gba:px-2 gba:py-2 gba:align-middle" style={{ width: '120px' }}>
        <div className="gba:flex gba:items-center gba:gap-1 gba:justify-end gba:shrink-0">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="gba:h-7 gba:w-7 gba:shrink-0"
                onClick={onSave}
                disabled={saving}
                aria-label={`Save row ${rowIndex + 1}`}
                data-testid={`${testId}-row-${rowIndex}-save`}
              >
                {saving ? (
                  <Loader2 className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
                ) : (
                  <Check className="gba:h-3.5 gba:w-3.5 gba:text-primary" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="gba:h-7 gba:w-7 gba:shrink-0"
                onClick={onCancelEdit}
                disabled={saving}
                aria-label={`Cancel edit row ${rowIndex + 1}`}
                data-testid={`${testId}-row-${rowIndex}-cancel`}
              >
                <X className="gba:h-3.5 gba:w-3.5" />
              </Button>
            </>
          ) : (
            <>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="gba:h-7 gba:w-7 gba:shrink-0"
                  onClick={onStartEdit}
                  aria-label={`Edit row ${rowIndex + 1}`}
                  data-testid={`${testId}-row-${rowIndex}-edit`}
                >
                  <Pencil className="gba:h-3.5 gba:w-3.5" />
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="gba:h-7 gba:w-7 gba:shrink-0"
                  onClick={onDelete}
                  aria-label={`Delete row ${rowIndex + 1}`}
                  data-testid={`${testId}-row-${rowIndex}-delete`}
                >
                  <Trash2 className="gba:h-3.5 gba:w-3.5" />
                </Button>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  )
}
