import React from 'react'
import { Button, TableCell, TableRow } from '@newwork/nw-design-system'
import { PiMapPin, PiTrash } from 'react-icons/pi'
import { MatrixRuleCell } from './MatrixRuleCell'
import type { MatrixCellCallbacks, MatrixCellState, MatrixCellDataProps } from '../types'

interface MatrixRegionRowProps extends MatrixCellCallbacks, MatrixCellState, MatrixCellDataProps {
  region: {
    id: string
    code: string
    value: string
  }
  onDeleteRegionClick: (region: any, e: React.MouseEvent) => void
  regionHasSavedDetails: (regionId: string) => boolean
}

/**
 * Component for rendering a single region row in the matrix table
 * Extracted to reduce nesting in TravelRegionMatrixView
 */
export const MatrixRegionRow: React.FC<MatrixRegionRowProps> = ({
  region,
  allowanceRegionRules,
  editableCells,
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
  onDeleteRegionClick,
  regionHasSavedDetails,
  currencies,
  countries,
  setAllowanceRegionRules,
  setEditableCells,
  getExpenseSettingsClient,
  prefixDataTestId
}) => {
  return (
    <TableRow key={region.id}>
      <TableCell className="gba:sticky gba:left-0 gba:bg-white gba:z-10 gba:border-r gba:w-48">
        <div className="gba:p-3">
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiMapPin className="gba:text-primary gba:w-5 gba:h-5" />
            <div className="gba:flex-1">
              <div className="gba:mb-1">
                <div className="gba:text-xs gba:text-muted-foreground gba:px-1 gba:py-0.5">{region.code}</div>
              </div>
              <div>
                <div className="gba:font-medium gba:text-sm gba:px-1 gba:py-0.5">{region.value}</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={e => onDeleteRegionClick(region, e)}
              className="gba:h-6 gba:w-6 gba:p-0 gba:text-destructive hover:gba:text-destructive hover:gba:bg-destructive-secondary"
              title={
                regionHasSavedDetails(region.id)
                  ? 'Cannot delete - region has allowance details'
                  : 'Delete travel region'
              }
              disabled={regionHasSavedDetails(region.id)}
              data-testid={`${prefixDataTestId}-delete-region-button-${region.id}`}
            >
              <PiTrash className="gba:w-4 gba:h-4" />
            </Button>
          </div>
        </div>
      </TableCell>
      {allowanceRegionRules.map(rule => {
        const ruleCells = editableCells.filter(
          c => c.allowanceRegionRuleId === rule.id && c.travelRegionId === region.id
        )

        return (
          <MatrixRuleCell
            key={`${rule.id}-${region.id}`}
            rule={rule}
            region={region}
            ruleCells={ruleCells}
            editingCellId={editingCellId}
            editingCellUsageInfo={editingCellUsageInfo}
            isCheckingCellUsage={isCheckingCellUsage}
            isSavingCell={isSavingCell}
            onEnterCellEdit={onEnterCellEdit}
            onExitCellEdit={onExitCellEdit}
            onRemoveNewCell={onRemoveNewCell}
            onUpdateCellField={onUpdateCellField}
            onSaveSingleCell={onSaveSingleCell}
            onDeleteCell={onDeleteCell}
            onAddNewCell={onAddNewCell}
            currencies={currencies}
            countries={countries}
            editableCells={editableCells}
            setAllowanceRegionRules={setAllowanceRegionRules}
            setEditableCells={setEditableCells}
            allowanceRegionRules={allowanceRegionRules}
            getExpenseSettingsClient={getExpenseSettingsClient}
            prefixDataTestId={prefixDataTestId}
          />
        )
      })}
      <TableCell className="gba:w-16 gba:text-center gba:text-muted"></TableCell>
    </TableRow>
  )
}
