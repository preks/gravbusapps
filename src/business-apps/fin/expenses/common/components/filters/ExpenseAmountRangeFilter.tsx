import React, { useCallback, useState, useEffect } from 'react'
import { Input, useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'

export interface ExpenseAmountRangeFilterProps {
  amountRange?: { min?: number; max?: number } | null
  onAmountRangeChange: (range: { min?: number; max?: number } | null) => void
  className?: string
  placeholder?: [string, string]
  dataTestIdPrefix: string
}

export const ExpenseAmountRangeFilter: React.FC<ExpenseAmountRangeFilterProps> = ({
  amountRange,
  onAmountRangeChange,
  className = '',
  placeholder: placeholderProp,
  dataTestIdPrefix
}) => {
  const { t } = useTranslation(translations)
  const placeholder = placeholderProp ?? [t('filter-min-amount'), t('filter-max-amount')]

  const minFieldId = `${dataTestIdPrefix}-min-field`
  const maxFieldId = `${dataTestIdPrefix}-max-field`

  const [minValue, setMinValue] = useState<string>(amountRange?.min?.toString() || '')
  const [maxValue, setMaxValue] = useState<string>(amountRange?.max?.toString() || '')

  useEffect(() => {
    setMinValue(amountRange?.min?.toString() || '')
    setMaxValue(amountRange?.max?.toString() || '')
  }, [amountRange])

  const handleMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setMinValue(value)

      const numValue = value ? Number.parseFloat(value) : undefined

      if (numValue !== undefined || maxValue) {
        onAmountRangeChange({
          min: numValue,
          max: maxValue ? Number.parseFloat(maxValue) : undefined
        })
      }
    },
    [maxValue, onAmountRangeChange]
  )

  const handleMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setMaxValue(value)

      const numValue = value ? Number.parseFloat(value) : undefined

      if (minValue || numValue !== undefined) {
        onAmountRangeChange({
          min: minValue ? Number.parseFloat(minValue) : undefined,
          max: numValue
        })
      }
    },
    [minValue, onAmountRangeChange]
  )

  const handleClear = useCallback(() => {
    setMinValue('')
    setMaxValue('')
    onAmountRangeChange(null)
  }, [onAmountRangeChange])

  return (
    <div className={`gba:flex gba:flex-col gba:gap-2 gba:p-2 ${className}`}>
      <div className="gba:flex gba:items-center gba:gap-2">
        <div className="gba:flex gba:flex-col gba:gap-1 gba:flex-1">
          <label htmlFor={minFieldId} className="gba:text-xs gba:text-muted-foreground">
            {t('filter-min-amount')}
          </label>
          <Input
            id={minFieldId}
            type="number"
            value={minValue}
            onChange={handleMinChange}
            placeholder={placeholder[0]}
            min={0}
            step={0.01}
            className="gba:h-8 gba:text-sm"
            data-testid={`${dataTestIdPrefix}-min-input`}
          />
        </div>
        <div className="gba:flex gba:flex-col gba:gap-1 gba:flex-1">
          <label htmlFor={maxFieldId} className="gba:text-xs gba:text-muted-foreground">
            {t('filter-max-amount')}
          </label>
          <Input
            id={maxFieldId}
            type="number"
            value={maxValue}
            onChange={handleMaxChange}
            placeholder={placeholder[1]}
            min={0}
            step={0.01}
            className="gba:h-8 gba:text-sm"
            data-testid={`${dataTestIdPrefix}-max-input`}
          />
        </div>
      </div>
      {(minValue || maxValue) && (
        <button
          type="button"
          onClick={handleClear}
          className="gba:px-2 gba:py-1 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:border gba:border-border gba:rounded-md gba:hover:bg-muted gba:self-start"
          data-testid={`${dataTestIdPrefix}-clear-button`}
        >
          {t('filter-amount-clear')}
        </button>
      )}
    </div>
  )
}

export default ExpenseAmountRangeFilter
