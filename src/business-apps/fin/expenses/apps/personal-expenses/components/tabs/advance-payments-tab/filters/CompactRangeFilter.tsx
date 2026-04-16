import React, { useCallback, useState, useEffect } from 'react'
import { Input } from '@newwork/nw-design-system'

interface CompactRangeFilterProps {
  range?: { min?: number; max?: number } | null
  onRangeChange: (range: { min?: number; max?: number } | null) => void
  className?: string
  placeholder?: [string, string]
  label: string
  dataTestIdPrefix: string
}

export const CompactRangeFilter: React.FC<CompactRangeFilterProps> = ({
  range,
  onRangeChange,
  className = '',
  placeholder = ['Min', 'Max'],
  dataTestIdPrefix
}) => {
  const [minValue, setMinValue] = useState<string>(range?.min?.toString() || '')
  const [maxValue, setMaxValue] = useState<string>(range?.max?.toString() || '')

  // Update local state when prop changes
  useEffect(() => {
    setMinValue(range?.min?.toString() || '')
    setMaxValue(range?.max?.toString() || '')
  }, [range])

  const handleMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setMinValue(value)

      const numValue = value ? parseFloat(value) : undefined

      // Only trigger change if we have a valid range or clearing
      if (numValue !== undefined || maxValue) {
        onRangeChange({
          min: numValue,
          max: maxValue ? parseFloat(maxValue) : undefined
        })
      }
    },
    [maxValue, onRangeChange]
  )

  const handleMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setMaxValue(value)

      const numValue = value ? parseFloat(value) : undefined

      // Only trigger change if we have a valid range or clearing
      if (minValue || numValue !== undefined) {
        onRangeChange({
          min: minValue ? parseFloat(minValue) : undefined,
          max: numValue
        })
      }
    },
    [minValue, onRangeChange]
  )

  const handleClear = useCallback(() => {
    setMinValue('')
    setMaxValue('')
    // Always trigger the change callback with null to clear the filter
    onRangeChange(null)
  }, [onRangeChange])

  return (
    <div className={`gba:flex gba:flex-col gba:gap-2 gba:p-2 ${className}`}>
      <div className="gba:flex gba:items-center gba:gap-2">
        <div className="gba:flex gba:flex-col gba:gap-1 gba:flex-1">
          <label className="gba:text-xs gba:text-gray-600">Min</label>
          <Input
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
          <label className="gba:text-xs gba:text-gray-600">Max</label>
          <Input
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
          onClick={handleClear}
          className="gba:px-2 gba:py-1 gba:text-xs gba:text-gray-500 gba:hover:text-gray-700 gba:border gba:border-gray-300 gba:rounded gba:hover:bg-gray-50 gba:self-start"
          data-testid={`${dataTestIdPrefix}-clear-button`}
        >
          Clear
        </button>
      )}
    </div>
  )
}

export default CompactRangeFilter
