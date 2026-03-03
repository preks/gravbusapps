import React from 'react'
import dayjs from 'dayjs'
import { Button, TableCell } from '@newwork/nw-design-system'
import { PlusIcon } from '@phosphor-icons/react'
import { MatrixCellContent } from './MatrixCellContent'
import type { EditableCell, MatrixCellCallbacks, MatrixCellState, MatrixCellDataProps } from '../types'

interface MatrixRuleCellProps extends MatrixCellCallbacks, MatrixCellState, MatrixCellDataProps {
  rule: {
    id: string
    activeFrom: string | null
    activeTo: string | null
  }
  region: {
    id: string
    code: string
    value: string
  }
  ruleCells: EditableCell[]
}

/**
 * Component for rendering all cells for a single rule/region combination
 * Extracted to reduce nesting in TravelRegionMatrixView
 */
export const MatrixRuleCell: React.FC<MatrixRuleCellProps> = ({
  rule,
  region,
  ruleCells,
  editingCellId,
  editingCellUsageInfo,
  isCheckingCellUsage,
  isSavingCell,
  onEnterCellEdit,
  onExitCellEdit,
  onRemoveNewCell,
  onUpdateCellField,
  onSaveSingleCell,
  onDeleteCell,
  onAddNewCell,
  currencies,
  countries,
  editableCells,
  setAllowanceRegionRules,
  setEditableCells,
  allowanceRegionRules,
  getExpenseSettingsClient,
  prefixDataTestId
}) => {
  // Sort cells by activeFrom date (newest first) to ensure consistent display
  const sortedCells = [...ruleCells].sort((a, b) => {
    if (!a.activeFrom && !b.activeFrom) return 0
    if (!a.activeFrom) return 1
    if (!b.activeFrom) return -1
    return dayjs(b.activeFrom).valueOf() - dayjs(a.activeFrom).valueOf()
  })

  return (
    <TableCell key={`${rule.id}-${region.id}`} className="gba:text-center gba:relative gba:p-2 gba:align-top">
      <div className="gba:flex gba:flex-col gba:gap-2">
        {/* Existing details - always show all details */}
        {sortedCells.map((cell, index) => {
          const isEditing = cell.isNew || editingCellId === cell.id
          const isUsedInTransactions = editingCellUsageInfo?.isUsed && editingCellId === cell.id

          // Create a truly unique key: use id if available, otherwise combine multiple fields to ensure uniqueness
          // NOTE: Do NOT include cell.amount in the key as it changes during typing and causes input to lose focus
          const uniqueKey =
            cell.id || `${cell.validityPeriodId || 'new'}-${cell.activeFrom}-${cell.activeTo || 'null'}-${index}`

          return (
            <MatrixCellContent
              key={uniqueKey}
              cell={cell}
              isEditing={isEditing}
              isUsedInTransactions={isUsedInTransactions}
              isCheckingCellUsage={isCheckingCellUsage}
              isSavingCell={isSavingCell}
              onEnterEdit={() => {
                if (!isEditing && cell.id) {
                  onEnterCellEdit(cell.id)
                }
              }}
              onExitEdit={onExitCellEdit}
              onRemoveNewCell={cell.isNew ? onRemoveNewCell : undefined}
              onUpdateCell={updates => {
                if (cell.id || cell.validityPeriodId) {
                  Object.entries(updates).forEach(([field, value]) => {
                    onUpdateCellField(cell.id!, cell.validityPeriodId!, field, value)
                  })
                }
              }}
              onSaveCell={() => onSaveSingleCell(cell)}
              onDeleteCell={async () => {
                await onDeleteCell(cell.id || '', getExpenseSettingsClient)
              }}
              currencies={currencies}
              countries={countries}
              setEditableCells={setEditableCells}
              prefixDataTestId={prefixDataTestId}
              ruleId={rule.id}
              regionId={region.id}
            />
          )
        })}

        {/* Add new detail button - always visible, allows multiple details per rule/region */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onAddNewCell(
              rule,
              region,
              editableCells,
              currencies,
              setAllowanceRegionRules,
              setEditableCells,
              allowanceRegionRules
            )
          }
          className="gba:w-full gba:h-8 gba:text-muted-foreground hover:gba:text-foreground hover:gba:bg-accent gba:border gba:border-dashed"
          title="Add new allowance detail (validity periods must not overlap)"
          disabled={isSavingCell}
          data-testid={`${prefixDataTestId}-add-cell-${rule.id}-${region.id}`}
        >
          <PlusIcon className="gba:w-4 gba:h-4 gba:mr-1" />
          <span className="gba:text-xs">Add Detail</span>
        </Button>
      </div>
    </TableCell>
  )
}
