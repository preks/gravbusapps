import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { PiTrash } from 'react-icons/pi'
import {
  DateInput,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import type { EditableCell } from '../types'
import { formatPeriodShort } from '../utils/matrixFormatters'
import { formatDateForInput, normalizeDateInputValue } from '../../../utils'

/**
 * Action buttons for new cell (Cancel + Save)
 */
const NewCellActions: React.FC<{
  cell: EditableCell
  ruleId: string
  isSavingCell: boolean
  onRemoveNewCell?: (validityPeriodId: string, ruleId: string) => void
  onExitEdit: () => void
  onSaveCell: () => void
}> = ({ cell, ruleId, isSavingCell, onRemoveNewCell, onExitEdit, onSaveCell }) => (
  <div className="gba:flex gba:gap-1 gba:w-full">
    <Button
      variant="outline"
      size="sm"
      onClick={e => {
        e.stopPropagation()
        if (onRemoveNewCell && cell.validityPeriodId) {
          onRemoveNewCell(cell.validityPeriodId, ruleId)
        } else {
          onExitEdit()
        }
      }}
      className="gba:flex-1 gba:h-7 gba:text-xs"
      disabled={isSavingCell}
    >
      Cancel
    </Button>
    <Button
      variant="default"
      size="sm"
      onClick={e => {
        e.stopPropagation()
        onSaveCell()
      }}
      className="gba:flex-1 gba:h-7 gba:text-xs"
      disabled={isSavingCell || cell.amount <= 0}
    >
      {isSavingCell ? 'Saving...' : 'Save'}
    </Button>
  </div>
)

/**
 * Action buttons for existing cell (Cancel + Save + Delete)
 */
const ExistingCellActions: React.FC<{
  isSavingCell: boolean
  isCheckingCellUsage: boolean
  isUsedInTransactions: boolean
  onExitEdit: () => void
  onSaveCell: () => void
  onDeleteCell: () => Promise<void>
}> = ({ isSavingCell, isCheckingCellUsage, isUsedInTransactions, onExitEdit, onSaveCell, onDeleteCell }) => (
  <div className="gba:flex gba:gap-1 gba:w-full">
    <Button
      variant="outline"
      size="sm"
      onClick={e => {
        e.stopPropagation()
        onExitEdit()
      }}
      className="gba:flex-1 gba:h-7 gba:text-xs"
      disabled={isSavingCell}
    >
      Cancel
    </Button>
    <Button
      variant="default"
      size="sm"
      onClick={e => {
        e.stopPropagation()
        onSaveCell()
      }}
      className="gba:flex-1 gba:h-7 gba:text-xs"
      disabled={isSavingCell || isCheckingCellUsage}
    >
      {isSavingCell ? 'Saving...' : 'Save'}
    </Button>
    {!isUsedInTransactions && (
      <Button
        variant="destructive"
        size="sm"
        onClick={async e => {
          e.stopPropagation()
          await onDeleteCell()
        }}
        className="gba:h-7 gba:px-2"
        disabled={isSavingCell || isCheckingCellUsage}
        title="Delete this detail"
      >
        <PiTrash className="gba:w-4 gba:h-4" />
      </Button>
    )}
  </div>
)

interface MatrixCellContentProps {
  cell: EditableCell
  isEditing: boolean
  isUsedInTransactions: boolean
  isCheckingCellUsage: boolean
  isSavingCell: boolean
  onEnterEdit: () => void
  onExitEdit: () => void
  onRemoveNewCell?: (validityPeriodId: string, ruleId: string) => void
  onUpdateCell: (updates: Partial<EditableCell>) => void
  onSaveCell: () => void
  onDeleteCell: () => Promise<void>
  currencies: Array<{ id: string; code: string; value: string }>
  countries: Array<{ id: string; code: string; value: string }>
  setEditableCells: React.Dispatch<React.SetStateAction<EditableCell[]>>
  prefixDataTestId: string
  ruleId: string
  regionId: string
}

/**
 * Individual cell content component for rendering allowance details
 * Extracted to reduce nesting in TravelRegionMatrixView
 */
export const MatrixCellContent: React.FC<MatrixCellContentProps> = ({
  cell,
  isEditing,
  isUsedInTransactions,
  isCheckingCellUsage,
  isSavingCell,
  onEnterEdit,
  onExitEdit,
  onRemoveNewCell,
  onUpdateCell,
  onSaveCell,
  onDeleteCell,
  currencies,
  countries,
  setEditableCells,
  prefixDataTestId,
  ruleId,
  regionId
}) => {
  const cellContent = (
    <>
      {cell.isModified && (
        <div className="gba:absolute gba:top-1 gba:right-1">
          <div className="gba:w-2 gba:h-2 gba:bg-info gba:rounded-full"></div>
        </div>
      )}

      {isEditing ? (
        <div className="gba:space-y-2">
          {isUsedInTransactions && !cell.isNew && (
            <div className="gba:text-xs gba:text-warning gba:bg-warning-secondary gba:p-1 gba:rounded gba:mb-2">
              ⚠️ Used in transactions - only "To" date can be edited
            </div>
          )}

          {isCheckingCellUsage && (
            <div className="gba:text-xs gba:text-muted-foreground gba:text-center">Checking usage...</div>
          )}

          {/* Active From */}
          <div>
            <label
              htmlFor={`${prefixDataTestId}-cell-active-from-${ruleId}-${regionId}`}
              className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1"
            >
              From:
            </label>
            <DateInput
              id={`${prefixDataTestId}-cell-active-from-${ruleId}-${regionId}`}
              value={formatDateForInput(cell.activeFrom) || ''}
              onChange={date => {
                const normalized = normalizeDateInputValue(date)
                const dateValue = normalized ? `${normalized}T00:00:00+00:00` : ''
                onUpdateCell({ activeFrom: dateValue, isModified: true })
              }}
              outputFormat="iso"
              disabled={isUsedInTransactions && !cell.isNew}
              data-testid={`${prefixDataTestId}-cell-active-from-${ruleId}-${regionId}`}
            />
          </div>

          {/* Active To */}
          <div>
            <label
              htmlFor={`${prefixDataTestId}-cell-active-to-${ruleId}-${regionId}`}
              className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1"
            >
              To:
            </label>
            <DateInput
              id={`${prefixDataTestId}-cell-active-to-${ruleId}-${regionId}`}
              value={formatDateForInput(cell.activeTo) || ''}
              onChange={date => {
                const normalized = normalizeDateInputValue(date)
                const dateValue = normalized ? `${normalized}T00:00:00+00:00` : undefined
                onUpdateCell({ activeTo: dateValue, isModified: true })
              }}
              outputFormat="iso"
              data-testid={`${prefixDataTestId}-cell-active-to-${ruleId}-${regionId}`}
            />
          </div>

          {/* Amount */}
          <div>
            <label
              htmlFor={`${prefixDataTestId}-cell-amount-${ruleId}-${regionId}`}
              className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1"
            >
              Amount:
            </label>
            <Input
              id={`${prefixDataTestId}-cell-amount-${ruleId}-${regionId}`}
              type="number"
              step="0.01"
              value={cell.amount || ''}
              onChange={e => {
                const value = Number.parseFloat(e.target.value) || 0
                onUpdateCell({ amount: value, isModified: true })
              }}
              onClick={e => e.stopPropagation()}
              className="gba:w-full gba:h-7 gba:text-center gba:text-sm gba:font-semibold"
              placeholder="0.00"
              disabled={isUsedInTransactions && !cell.isNew}
              data-testid={`${prefixDataTestId}-cell-amount-${ruleId}-${regionId}`}
            />
          </div>

          {/* Currency */}
          <div>
            <label
              htmlFor={`${prefixDataTestId}-cell-currency-${ruleId}-${regionId}`}
              className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1"
            >
              Currency:
            </label>
            <Select
              value={cell.currencyCode}
              onValueChange={value => {
                const selectedCurrency = currencies.find(c => c.code === value)
                setEditableCells(prev =>
                  prev.map(c =>
                    c.id === cell.id || c.validityPeriodId === cell.validityPeriodId
                      ? {
                          ...c,
                          currencyCode: value,
                          currencyRef: selectedCurrency?.id,
                          isModified: true
                        }
                      : c
                  )
                )
              }}
              disabled={isUsedInTransactions && !cell.isNew}
            >
              <SelectTrigger
                id={`${prefixDataTestId}-cell-currency-${ruleId}-${regionId}`}
                className="gba:w-full gba:h-7 gba:text-xs"
                onClick={e => e.stopPropagation()}
                data-testid={`${prefixDataTestId}-cell-currency-${ruleId}-${regionId}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map(currency => (
                  <SelectItem key={currency.id} value={currency.code}>
                    {currency.code} - {currency.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Country */}
          <div>
            <label
              htmlFor={`${prefixDataTestId}-cell-country-${ruleId}-${regionId}`}
              className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1"
            >
              Country:
            </label>
            <Select
              value={cell.countryRef}
              onValueChange={value => {
                setEditableCells(prev =>
                  prev.map(c =>
                    c.id === cell.id || c.validityPeriodId === cell.validityPeriodId
                      ? {
                          ...c,
                          countryRef: value,
                          isModified: true
                        }
                      : c
                  )
                )
              }}
              disabled={isUsedInTransactions && !cell.isNew}
            >
              <SelectTrigger
                id={`${prefixDataTestId}-cell-country-${ruleId}-${regionId}`}
                className="gba:w-full gba:h-7 gba:text-xs"
                onClick={e => e.stopPropagation()}
                data-testid={`${prefixDataTestId}-cell-country-${ruleId}-${regionId}`}
              >
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map(country => (
                  <SelectItem key={country.id} value={country.id}>
                    {country.code} - {country.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action buttons - extracted to reduce complexity */}
          <div className="gba:flex gba:gap-2 gba:mt-2">
            {cell.isNew ? (
              <NewCellActions
                cell={cell}
                ruleId={ruleId}
                isSavingCell={isSavingCell}
                onRemoveNewCell={onRemoveNewCell}
                onExitEdit={onExitEdit}
                onSaveCell={onSaveCell}
              />
            ) : (
              <ExistingCellActions
                isSavingCell={isSavingCell}
                isCheckingCellUsage={isCheckingCellUsage}
                isUsedInTransactions={isUsedInTransactions}
                onExitEdit={onExitEdit}
                onSaveCell={onSaveCell}
                onDeleteCell={onDeleteCell}
              />
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="gba:text-xs gba:text-muted-foreground gba:mb-2 gba:text-center">
            {formatPeriodShort(cell.activeFrom, cell.activeTo)}
          </div>
          <div className="gba:text-center gba:mb-2">
            <div className="gba:text-lg gba:font-semibold gba:text-foreground">{cell.amount.toFixed(2)}</div>
          </div>
          <div className="gba:text-xs gba:text-muted-foreground gba:text-center gba:font-medium">
            {cell.currencyCode}
          </div>
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-1 gba:mt-2">
            <div className="gba:text-xs gba:text-muted-foreground gba:opacity-0 hover:gba:opacity-100">
              Click to edit
            </div>
          </div>
        </>
      )}
    </>
  )

  // Render as button when not editing (for accessibility), div when editing
  // Always render with proper spacing to ensure all details are visible
  return isEditing ? (
    <div
      className={`gba:border gba:rounded gba:p-2 gba:relative gba:flex-shrink-0 ${getCellClassName(cell, isEditing)}`}
    >
      {cellContent}
    </div>
  ) : (
    <button
      type="button"
      className={`gba:w-full gba:border gba:rounded gba:p-2 gba:relative gba:text-left gba:flex-shrink-0 ${getCellClassName(cell, isEditing)}`}
      onClick={onEnterEdit}
    >
      {cellContent}
    </button>
  )
}

/**
 * Helper to determine cell CSS classes based on state
 */
const getCellClassName = (cell: EditableCell, isEditing: boolean): string => {
  if (cell.isModified) {
    return 'gba:bg-info-secondary gba:border-info'
  }
  if (isEditing) {
    return 'gba:bg-accent gba:border-primary'
  }
  return 'gba:bg-white gba:border-border gba:cursor-pointer hover:gba:bg-accent'
}
