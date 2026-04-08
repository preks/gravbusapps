import React, { useCallback, useMemo } from 'react'
import { DateInput } from '@newwork/nw-design-system'
import type { DateRange } from '../../utils/dateRangeFilterUtils'
import { dateRangeToNwDateInputValue, nwDateInputValueToDateRange } from '../../utils/nwDateRangeInputMapping'

export interface ExpenseDateTupleRangeInputProps {
  value?: DateRange | null
  onChange: (range: DateRange) => void
  dataTestId: string
  placeholder?: [string, string]
  className?: string
  /** Extra content below the input (e.g. filter hints). */
  footer?: React.ReactNode
}

/**
 * NW design-system range date input bound to expense filter state: `[Date | null, Date | null] | null`.
 * Use anywhere in fin/expenses that needs the same UX as personal-expenses plan date filters.
 */
export const ExpenseDateTupleRangeInput: React.FC<ExpenseDateTupleRangeInputProps> = ({
  value,
  onChange,
  dataTestId,
  placeholder = ['Start date', 'End date'],
  className = 'gba:w-full',
  footer
}) => {
  const inputValue = useMemo(() => dateRangeToNwDateInputValue(value ?? null), [value])

  const handleChange = useCallback(
    (raw: string | [string | null, string | null] | null) => {
      if (raw === null) {
        onChange(null)
        return
      }
      if (typeof raw === 'string') {
        return
      }
      onChange(nwDateInputValueToDateRange(raw))
    },
    [onChange]
  )

  const [placeholderStart, placeholderEnd] = placeholder

  return (
    <div className="gba:w-full" data-testid={dataTestId}>
      <DateInput
        type="date"
        mode="range"
        value={inputValue}
        onChange={handleChange}
        placeholder={placeholderStart}
        placeholderEnd={placeholderEnd}
        className={className}
        outputFormat="local"
        showClearButton
      />
      {footer}
    </div>
  )
}
