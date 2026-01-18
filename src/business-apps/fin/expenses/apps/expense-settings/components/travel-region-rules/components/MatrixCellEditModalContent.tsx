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

/**
 * Helper to render a date input field
 */
const DateField: React.FC<{
  label: string
  fieldName: 'activeFrom' | 'activeTo'
  value: string | undefined
  disabled?: boolean
  testId: string
  onUpdate: (field: string, value: any) => void
}> = ({ label, fieldName, value, disabled, testId, onUpdate }) => (
  <div>
    <label htmlFor={`${fieldName}-field`} className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1">
      {label}:
    </label>
    <DateInput
      id={`${fieldName}-field`}
      value={value ? dayjs(value).format('YYYY-MM-DD') : ''}
      onChange={date => {
        const dateValue = date ? `${date}T00:00:00+00:00` : undefined
        onUpdate(fieldName, dateValue)
      }}
      disabled={disabled}
      data-testid={testId}
    />
  </div>
)

/**
 * Helper to render a select field with options
 */
const SelectField: React.FC<{
  label: string
  fieldName: string
  value: string | undefined
  options: Array<{ id: string; code: string; value: string }>
  placeholder?: string
  disabled?: boolean
  testId: string
  onUpdate: (value: string) => void
}> = ({ label, fieldName, value, options, placeholder, disabled, testId, onUpdate }) => (
  <div>
    <label htmlFor={`${fieldName}-field`} className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1">
      {label}:
    </label>
    <Select value={value} onValueChange={onUpdate} disabled={disabled}>
      <SelectTrigger
        id={`${fieldName}-field`}
        className="gba:w-full gba:h-7 gba:text-xs"
        onClick={e => e.stopPropagation()}
        data-testid={testId}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(option => (
          <SelectItem key={option.id} value={option.code || option.id}>
            {option.code} - {option.value}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)

/**
 * Helper to render action button
 */
const ActionButton: React.FC<{
  variant: 'outline' | 'default' | 'destructive'
  label: string
  onClick: (e: React.MouseEvent) => void
  disabled?: boolean
}> = ({ variant, label, onClick, disabled }) => (
  <Button
    variant={variant}
    size="sm"
    onClick={e => {
      e.stopPropagation()
      onClick(e)
    }}
    className="gba:flex-1 gba:h-7 gba:text-xs"
    disabled={disabled}
  >
    {label}
  </Button>
)

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
  const handleFieldUpdate = (field: string, value: any) => {
    onUpdateCell(cell.id!, cell.validityPeriodId!, field, value)
  }

  const handleCurrencyChange = (value: string) => {
    const selectedCurrency = currencies.find(c => c.code === value)
    onSetEditableCells(prev =>
      prev.map(c =>
        c.id === cell.id || c.validityPeriodId === cell.validityPeriodId
          ? { ...c, currencyCode: value, currencyRef: selectedCurrency?.id, isModified: true }
          : c
      )
    )
  }

  const handleCountryChange = (value: string) => {
    onSetEditableCells(prev =>
      prev.map(c =>
        c.id === cell.id || c.validityPeriodId === cell.validityPeriodId
          ? { ...c, countryRef: value, isModified: true }
          : c
      )
    )
  }

  return (
    <div className="gba:space-y-3">
      {/* Date Fields */}
      <DateField
        label="Active From"
        fieldName="activeFrom"
        value={cell.activeFrom}
        disabled={isUsedInTransactions && !cell.isNew}
        testId={`${prefixDataTestId}-cell-active-from-${rule.id}-${region.id}`}
        onUpdate={handleFieldUpdate}
      />

      <DateField
        label="Active To"
        fieldName="activeTo"
        value={cell.activeTo}
        testId={`${prefixDataTestId}-cell-active-to-${rule.id}-${region.id}`}
        onUpdate={handleFieldUpdate}
      />

      {/* Amount */}
      <div>
        <label
          htmlFor={`amount-${cell.validityPeriodId}`}
          className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1"
        >
          Amount:
        </label>
        <Input
          id={`amount-${cell.validityPeriodId}`}
          type="number"
          step="0.01"
          value={cell.amount || ''}
          onChange={e => {
            const value = Number.parseFloat(e.target.value) || 0
            handleFieldUpdate('amount', value)
          }}
          onClick={e => e.stopPropagation()}
          className="gba:w-full gba:h-7 gba:text-center gba:text-sm gba:font-semibold"
          placeholder="0.00"
          disabled={isUsedInTransactions && !cell.isNew}
          data-testid={`${prefixDataTestId}-cell-amount-${rule.id}-${region.id}`}
        />
      </div>

      {/* Currency and Country Selects */}
      <SelectField
        label="Currency"
        fieldName="currency"
        value={cell.currencyCode}
        options={currencies}
        disabled={isUsedInTransactions && !cell.isNew}
        testId={`${prefixDataTestId}-cell-currency-${rule.id}-${region.id}`}
        onUpdate={handleCurrencyChange}
      />

      <SelectField
        label="Country"
        fieldName="country"
        value={cell.countryRef}
        options={countries}
        placeholder="Select country"
        disabled={isUsedInTransactions && !cell.isNew}
        testId={`${prefixDataTestId}-cell-country-${rule.id}-${region.id}`}
        onUpdate={handleCountryChange}
      />

      {/* Action buttons */}
      <div className="gba:flex gba:gap-2 gba:mt-2">
        {cell.isNew ? (
          <div className="gba:flex gba:gap-1 gba:w-full">
            <ActionButton
              variant="outline"
              label="Cancel"
              onClick={() => onRemoveNewCell(cell.validityPeriodId!, rule.id)}
              disabled={isSavingCell}
            />
            <ActionButton
              variant="default"
              label={isSavingCell ? 'Saving...' : 'Save'}
              onClick={() => onSaveCell(cell)}
              disabled={isSavingCell || cell.amount <= 0}
            />
          </div>
        ) : (
          <div className="gba:flex gba:gap-1 gba:w-full">
            <ActionButton variant="outline" label="Cancel" onClick={onCancelEdit} disabled={isSavingCell} />
            {!isUsedInTransactions && (
              <ActionButton
                variant="destructive"
                label="Delete"
                onClick={() => onDeleteCell(cell)}
                disabled={isSavingCell}
              />
            )}
            <ActionButton
              variant="default"
              label={isSavingCell ? 'Saving...' : 'Save'}
              onClick={() => onSaveCell(cell)}
              disabled={isSavingCell || cell.amount <= 0 || !cell.isModified}
            />
          </div>
        )}
      </div>
    </div>
  )
}
