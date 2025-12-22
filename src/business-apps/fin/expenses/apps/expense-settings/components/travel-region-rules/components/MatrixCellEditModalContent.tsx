import React from 'react'
import {
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  DateInput
} from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import { EditableCell, CurrencyOption, EditableAllowanceRegionRule } from '../types'

interface MatrixCellEditModalContentProps {
  cell: EditableCell
  rule: EditableAllowanceRegionRule
  region: any
  currencies: CurrencyOption[]
  countries: any[]
  isUsedInTransactions: boolean
  isSavingCell: boolean
  prefixDataTestId?: string
  onUpdateCell: (cellId: string, validityPeriodId: string, field: string, value: any) => void
  onSetEditableCells: React.Dispatch<React.SetStateAction<EditableCell[]>>
  onSaveCell: (cell: EditableCell) => Promise<void>
  onRemoveNewCell: (validityPeriodId: string, ruleId: string) => void
  onCancelEdit: () => void
  onDeleteCell: (cell: EditableCell) => void
}

export const MatrixCellEditModalContent: React.FC<MatrixCellEditModalContentProps> = ({
  cell,
  rule,
  region,
  currencies,
  countries,
  isUsedInTransactions,
  isSavingCell,
  prefixDataTestId,
  onUpdateCell,
  onSetEditableCells,
  onSaveCell,
  onRemoveNewCell,
  onCancelEdit,
  onDeleteCell
}) => {
  return (
    <div className="gba:space-y-3">
      {/* Active From */}
      <div>
        <label className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1">Active From:</label>
        <DateInput
          value={cell.activeFrom ? dayjs(cell.activeFrom).format('YYYY-MM-DD') : ''}
          onChange={date => {
            const dateValue = date ? `${date}T00:00:00+00:00` : undefined
            onUpdateCell(cell.id!, cell.validityPeriodId!, 'activeFrom', dateValue)
          }}
          disabled={isUsedInTransactions && !cell.isNew}
          data-testid={`${prefixDataTestId}-cell-active-from-${rule.id}-${region.id}`}
        />
      </div>

      {/* Active To */}
      <div>
        <label className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1">Active To:</label>
        <DateInput
          value={cell.activeTo ? dayjs(cell.activeTo).format('YYYY-MM-DD') : ''}
          onChange={date => {
            const dateValue = date ? `${date}T00:00:00+00:00` : undefined
            onUpdateCell(cell.id!, cell.validityPeriodId!, 'activeTo', dateValue)
          }}
          data-testid={`${prefixDataTestId}-cell-active-to-${rule.id}-${region.id}`}
        />
      </div>

      {/* Amount */}
      <div>
        <label className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1">Amount:</label>
        <Input
          type="number"
          step="0.01"
          value={cell.amount || ''}
          onChange={e => {
            const value = parseFloat(e.target.value) || 0
            onUpdateCell(cell.id!, cell.validityPeriodId!, 'amount', value)
          }}
          onClick={e => e.stopPropagation()}
          className="gba:w-full gba:h-7 gba:text-center gba:text-sm gba:font-semibold"
          placeholder="0.00"
          disabled={isUsedInTransactions && !cell.isNew}
          data-testid={`${prefixDataTestId}-cell-amount-${rule.id}-${region.id}`}
        />
      </div>

      {/* Currency */}
      <div>
        <label className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1">Currency:</label>
        <Select
          value={cell.currencyCode}
          onValueChange={value => {
            const selectedCurrency = currencies.find(c => c.code === value)
            onSetEditableCells(prev =>
              prev.map(c =>
                c.id === cell.id || c.validityPeriodId === cell.validityPeriodId
                  ? { ...c, currencyCode: value, currencyRef: selectedCurrency?.id, isModified: true }
                  : c
              )
            )
          }}
          disabled={isUsedInTransactions && !cell.isNew}
        >
          <SelectTrigger
            className="gba:w-full gba:h-7 gba:text-xs"
            onClick={e => e.stopPropagation()}
            data-testid={`${prefixDataTestId}-cell-currency-${rule.id}-${region.id}`}
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
        <label className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1">Country:</label>
        <Select
          value={cell.countryRef}
          onValueChange={value => {
            onSetEditableCells(prev =>
              prev.map(c =>
                c.id === cell.id || c.validityPeriodId === cell.validityPeriodId
                  ? { ...c, countryRef: value, isModified: true }
                  : c
              )
            )
          }}
          disabled={isUsedInTransactions && !cell.isNew}
        >
          <SelectTrigger
            className="gba:w-full gba:h-7 gba:text-xs"
            onClick={e => e.stopPropagation()}
            data-testid={`${prefixDataTestId}-cell-country-${rule.id}-${region.id}`}
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

      {/* Action buttons */}
      <div className="gba:flex gba:gap-2 gba:mt-2">
        {cell.isNew ? (
          <div className="gba:flex gba:gap-1 gba:w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                onRemoveNewCell(cell.validityPeriodId!, rule.id)
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
                onSaveCell(cell)
              }}
              className="gba:flex-1 gba:h-7 gba:text-xs"
              disabled={isSavingCell || cell.amount <= 0}
            >
              {isSavingCell ? 'Saving...' : 'Save'}
            </Button>
          </div>
        ) : (
          <div className="gba:flex gba:gap-1 gba:w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                onCancelEdit()
              }}
              className="gba:flex-1 gba:h-7 gba:text-xs"
              disabled={isSavingCell}
            >
              Cancel
            </Button>
            {!isUsedInTransactions && (
              <Button
                variant="destructive"
                size="sm"
                onClick={e => {
                  e.stopPropagation()
                  onDeleteCell(cell)
                }}
                className="gba:flex-1 gba:h-7 gba:text-xs"
                disabled={isSavingCell}
              >
                Delete
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                onSaveCell(cell)
              }}
              className="gba:flex-1 gba:h-7 gba:text-xs"
              disabled={isSavingCell || cell.amount <= 0 || !cell.isModified}
            >
              {isSavingCell ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
