import React from 'react'
import dayjs from 'dayjs'
import { Button, TableCell } from '@newwork/nw-design-system'
import { PiPlus } from 'react-icons/pi'
import { MatrixCellContent } from './MatrixCellContent'
import type { EditableCell } from '../types'

interface MatrixRuleCellProps {
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
  editingCellId: string | null
  editingCellUsageInfo: { isUsed: boolean; usedIn: Record<string, unknown>; message: string } | null
  isCheckingCellUsage: boolean
  isSavingCell: boolean
  onEnterCellEdit: (cellId: string) => void
  onExitCellEdit: () => void
  onRemoveNewCell: (validityPeriodId: string, ruleId: string) => void
  onUpdateCellField: (cellId: string, validityPeriodId: string, field: string, value: any) => void
  onSaveSingleCell: (cell: EditableCell) => void
  onDeleteCell: (cellId: string, getExpenseSettingsClient: () => any, loadData: () => Promise<void>) => Promise<void>
  onAddNewCell: (
    rule: any,
    region: any,
    editableCells: EditableCell[],
    currencies: any[],
    setAllowanceRegionRules: React.Dispatch<React.SetStateAction<any[]>>,
    setEditableCells: React.Dispatch<React.SetStateAction<EditableCell[]>>
  ) => void
  currencies: Array<{ id: string; code: string; value: string }>
  countries: Array<{ id: string; code: string; value: string }>
  editableCells: EditableCell[]
  setAllowanceRegionRules: React.Dispatch<React.SetStateAction<any[]>>
  setEditableCells: React.Dispatch<React.SetStateAction<EditableCell[]>>
  getExpenseSettingsClient: () => any
  loadData: () => Promise<void>
  prefixDataTestId: string
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
  getExpenseSettingsClient,
  loadData,
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
          const uniqueKey =
            cell.id ||
            `${cell.validityPeriodId || 'new'}-${cell.activeFrom}-${cell.activeTo || 'null'}-${index}-${cell.amount}`

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
                await onDeleteCell(cell.id || '', getExpenseSettingsClient, loadData)
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
            onAddNewCell(rule, region, editableCells, currencies, setAllowanceRegionRules, setEditableCells)
          }
          className="gba:w-full gba:h-8 gba:text-muted-foreground hover:gba:text-foreground hover:gba:bg-accent gba:border gba:border-dashed"
          title="Add new allowance detail (validity periods must not overlap)"
          disabled={isSavingCell}
          data-testid={`${prefixDataTestId}-add-cell-${rule.id}-${region.id}`}
        >
          <PiPlus className="gba:w-4 gba:h-4 gba:mr-1" />
          <span className="gba:text-xs">Add Detail</span>
        </Button>
      </div>
    </TableCell>
  )
}
