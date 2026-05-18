import React from 'react'
import { TableBody, TableCell, TableRow } from '@newwork/nw-design-system'
import { SpinnerGap } from '@phosphor-icons/react'
import type { ColumnDefinition } from '../types'
import type { EntityRow } from '../hooks/useEntityData'
import type { EntityDataEditValues } from '../utils/entityDataRowValues'
import { EntityDataRowActions } from './EntityDataRowActions'

export interface EntityDataDraftRow {
  mode: 'create'
  rowId: string
  values: EntityDataEditValues
}

interface EntityDataTableBodyProps {
  rows: EntityRow[]
  draftRows: EntityDataDraftRow[]
  editableColumns: ColumnDefinition[]
  editedRows: Map<string, EntityDataEditValues>
  loading: boolean
  mutating: boolean
  columnCount: number
  renderDataCell: (params: { row: EntityRow | EntityDataDraftRow; fieldName: string; isDraft: boolean }) => React.ReactNode
  onSaveRow: (rowId: string) => void
  onDiscardRow: (rowId: string) => void
  onDeleteRow: (rowId: string) => void
  testId: string
}

export const EntityDataTableBody: React.FC<EntityDataTableBodyProps> = ({
  rows,
  draftRows,
  editableColumns,
  editedRows,
  loading,
  mutating,
  columnCount,
  renderDataCell,
  onSaveRow,
  onDiscardRow,
  onDeleteRow,
  testId
}) => (
  <TableBody>
    {draftRows.map(draftRow => (
      <TableRow key={draftRow.rowId} data-testid={`${testId}-new-row`}>
        <TableCell className="gba:px-1.5 gba:text-xs gba:text-muted-foreground">auto</TableCell>
        {editableColumns.map(column => (
          <TableCell key={column.fieldName} className="gba:px-1.5 gba:py-1">
            {renderDataCell({ row: draftRow, fieldName: column.fieldName, isDraft: true })}
          </TableCell>
        ))}
        <TableCell className="gba:px-1.5 gba:py-1">
          <EntityDataRowActions
            mode="editing"
            mutating={mutating}
            onSave={() => onSaveRow(draftRow.rowId)}
            onCancel={() => onDiscardRow(draftRow.rowId)}
            testId={`${testId}-${draftRow.rowId}`}
          />
        </TableCell>
      </TableRow>
    ))}

    {loading && rows.length === 0 && (
      <TableRow>
        <TableCell colSpan={columnCount} className="gba:py-8 gba:text-center gba:text-muted-foreground">
          <SpinnerGap className="gba:mx-auto gba:h-5 gba:w-5 gba:animate-spin" />
        </TableCell>
      </TableRow>
    )}

    {!loading && rows.length === 0 && draftRows.length === 0 && (
      <TableRow>
        <TableCell colSpan={columnCount} className="gba:py-8 gba:text-center gba:text-muted-foreground">
          No data yet. Click "Add Row" to insert the first record.
        </TableCell>
      </TableRow>
    )}

    {rows.map(row => {
      const rowId = String(row.id)
      const hasEdits = editedRows.has(rowId)
      return (
        <TableRow key={rowId} data-testid={`${testId}-row-${rowId}`}>
          <TableCell className="gba:truncate gba:px-1.5 gba:py-1 gba:font-mono gba:text-xs gba:text-muted-foreground">
            {rowId.slice(0, 8)}...
          </TableCell>
          {editableColumns.map(column => (
            <TableCell key={column.fieldName} className="gba:px-1.5 gba:py-1">
              {renderDataCell({ row, fieldName: column.fieldName, isDraft: false })}
            </TableCell>
          ))}
          <TableCell className="gba:px-1.5 gba:py-1">
            {hasEdits ? (
              <EntityDataRowActions
                mode="editing"
                mutating={mutating}
                onSave={() => onSaveRow(rowId)}
                onCancel={() => onDiscardRow(rowId)}
                testId={`${testId}-${rowId}`}
              />
            ) : (
              <EntityDataRowActions
                mode="viewing"
                disabled={mutating}
                onDelete={() => onDeleteRow(rowId)}
                testId={`${testId}-${rowId}`}
              />
            )}
          </TableCell>
        </TableRow>
      )
    })}
  </TableBody>
)
