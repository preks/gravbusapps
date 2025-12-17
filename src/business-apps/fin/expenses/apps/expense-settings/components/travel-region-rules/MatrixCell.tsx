import React from 'react'
import {
  Input,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Button,
  DateInput
} from '@newwork/nw-design-system'
import { PiFloppyDisk, PiX } from 'react-icons/pi'
import dayjs from 'dayjs'
import { EditableCell, CurrencyOption, UsageInfo } from './types'

interface MatrixCellProps {
  cell: EditableCell
  isEditing: boolean
  isUsedInTransactions: boolean
  isCheckingCellUsage: boolean
  currencies: CurrencyOption[]
  prefixDataTestId: string
  ruleId: string
  regionId: string
  editingCellId: string | null
  handleEnterCellEdit: (cellId: string) => void
  updateCellField: (cellId: string, validityPeriodId: string, field: keyof EditableCell, value: any) => void
  handleSaveSingleCell: (cell: EditableCell) => void
  handleRemoveNewCell: (validityPeriodId: string) => void
  setEditingCellId: (id: string | null) => void
  setEditingCellUsageInfo: (info: UsageInfo | null) => void
}

export const MatrixCell: React.FC<MatrixCellProps> = ({
  cell,
  isEditing,
  isUsedInTransactions,
  isCheckingCellUsage,
  currencies,
  prefixDataTestId,
  ruleId,
  regionId,
  editingCellId,
  handleEnterCellEdit,
  updateCellField,
  handleSaveSingleCell,
  handleRemoveNewCell,
  setEditingCellId,
  setEditingCellUsageInfo
}) => {
  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return ''
    const date = dayjs(dateStr)
    return date.isValid() ? date.format('DD.MM.YYYY') : ''
  }

  return (
    <div
      key={cell.id || cell.validityPeriodId}
      className={`gba:border gba:rounded gba:p-2 gba:relative ${
        cell.isModified
          ? 'gba:bg-info-secondary gba:border-info'
          : isEditing
            ? 'gba:bg-accent gba:border-primary'
            : 'gba:bg-white gba:border-border gba:cursor-pointer hover:gba:bg-accent'
      }`}
      onClick={() => {
        if (!isEditing && cell.id) {
          handleEnterCellEdit(cell.id)
        }
      }}
    >
      {/* Modification Indicator */}
      {cell.isModified && (
        <div className="gba:absolute gba:top-1 gba:right-1">
          <div className="gba:w-2 gba:h-2 gba:bg-info gba:rounded-full"></div>
        </div>
      )}

      {/* Editable fields when editing or new */}
      {isEditing ? (
        <div className="gba:space-y-2">
          {/* Usage Warning */}
          {isUsedInTransactions && !cell.isNew && (
            <div className="gba:text-xs gba:text-warning gba:bg-warning-secondary gba:p-1 gba:rounded gba:mb-2">
              ⚠️ Used in transactions - only "To" date can be edited
            </div>
          )}

          {/* Loading indicator for usage check */}
          {isCheckingCellUsage && editingCellId === cell.id && (
            <div className="gba:text-xs gba:text-muted-foreground gba:text-center">Checking usage...</div>
          )}

          {/* Active From - disabled if used in transactions */}
          <div>
            <label className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1">From:</label>
            <DateInput
              value={cell.activeFrom ? dayjs(cell.activeFrom).format('YYYY-MM-DD') : ''}
              onChange={date => {
                const dateValue = date ? `${date}T00:00:00+00:00` : ''
                updateCellField(cell.id!, cell.validityPeriodId!, 'activeFrom', dateValue)
              }}
              disabled={isUsedInTransactions && !cell.isNew}
              data-testid={`${prefixDataTestId}-cell-active-from-${ruleId}-${regionId}`}
            />
          </div>

          {/* Active To - always editable */}
          <div>
            <label className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1">To:</label>
            <DateInput
              value={cell.activeTo ? dayjs(cell.activeTo).format('YYYY-MM-DD') : ''}
              onChange={date => {
                const dateValue = date ? `${date}T00:00:00+00:00` : undefined
                updateCellField(cell.id!, cell.validityPeriodId!, 'activeTo', dateValue)
              }}
              data-testid={`${prefixDataTestId}-cell-active-to-${ruleId}-${regionId}`}
            />
          </div>

          {/* Amount - disabled if used in transactions */}
          <div>
            <label className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1">Amount:</label>
            <Input
              type="number"
              step="0.01"
              value={cell.amount || ''}
              onChange={e => {
                const value = parseFloat(e.target.value) || 0
                updateCellField(cell.id!, cell.validityPeriodId!, 'amount', value)
              }}
              onClick={e => e.stopPropagation()}
              className="gba:w-full gba:h-7 gba:text-center gba:text-sm gba:font-semibold"
              placeholder="0.00"
              disabled={isUsedInTransactions && !cell.isNew}
              data-testid={`${prefixDataTestId}-cell-amount-${ruleId}-${regionId}`}
            />
          </div>

          {/* Currency - disabled if used in transactions */}
          <div>
            <label className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1">Currency:</label>
            <Select
              value={cell.currencyCode}
              onValueChange={value => {
                updateCellField(cell.id!, cell.validityPeriodId!, 'currencyCode', value)
              }}
              disabled={isUsedInTransactions && !cell.isNew}
            >
              <SelectTrigger
                className="gba:w-full gba:h-7 gba:text-sm"
                data-testid={`${prefixDataTestId}-cell-currency-${ruleId}-${regionId}`}
              >
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map(currency => (
                  <SelectItem key={currency.id} value={currency.code}>
                    {currency.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="gba:flex gba:gap-1 gba:mt-2">
            {cell.isNew ? (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={e => {
                    e.stopPropagation()
                    handleSaveSingleCell(cell)
                  }}
                  className="gba:flex-1 gba:h-7 gba:text-xs"
                  disabled={!cell.amount || cell.amount <= 0}
                  data-testid={`${prefixDataTestId}-cell-save-${ruleId}-${regionId}`}
                >
                  <PiFloppyDisk className="gba:w-3 gba:h-3 gba:mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={e => {
                    e.stopPropagation()
                    handleRemoveNewCell(cell.validityPeriodId!)
                  }}
                  className="gba:h-7 gba:w-7 gba:p-0"
                  data-testid={`${prefixDataTestId}-cell-cancel-${ruleId}-${regionId}`}
                >
                  <PiX className="gba:w-3 gba:h-3" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={e => {
                    e.stopPropagation()
                    handleSaveSingleCell(cell)
                  }}
                  className="gba:flex-1 gba:h-7 gba:text-xs"
                  disabled={!cell.isModified || !cell.amount || cell.amount <= 0}
                  data-testid={`${prefixDataTestId}-cell-save-${ruleId}-${regionId}`}
                >
                  <PiFloppyDisk className="gba:w-3 gba:h-3 gba:mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={e => {
                    e.stopPropagation()
                    setEditingCellId(null)
                    setEditingCellUsageInfo(null)
                  }}
                  className="gba:h-7 gba:w-7 gba:p-0"
                  data-testid={`${prefixDataTestId}-cell-cancel-${ruleId}-${regionId}`}
                >
                  <PiX className="gba:w-3 gba:h-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Read-only display */
        <div className="gba:text-center gba:text-sm">
          <div className="gba:font-semibold gba:text-base">
            {cell.amount ? cell.amount.toFixed(2) : '—'} {cell.currencyCode}
          </div>
          <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
            {formatDate(cell.activeFrom)} - {cell.activeTo ? formatDate(cell.activeTo) : '∞'}
          </div>
        </div>
      )}
    </div>
  )
}
