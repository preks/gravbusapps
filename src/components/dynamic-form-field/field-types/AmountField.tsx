import React from 'react'
import { Input } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

type AmountFieldProps = React.ComponentProps<typeof Input> & {
  currencySymbol?: string
  fieldName: string
  testIdPrefix: string
}

/**
 * Format a number to exactly 2 decimal places
 */
function formatAmount(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') {
    return ''
  }

  const num = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(num)) {
    return ''
  }

  // Format to exactly 2 decimal places
  return num.toFixed(2)
}

export function AmountField({
  currencySymbol,
  fieldName,
  testIdPrefix,
  type = 'number',
  step = '0.01',
  min = '0',
  placeholder = '0.00',
  value,
  onChange,
  onBlur,
  ...props
}: AmountFieldProps) {
  return (
    <Input
      {...props}
      type={type}
      step={step}
      min={min}
      placeholder={placeholder}
      value={value || ''}
      endAddOn={
        currencySymbol ? (
          <span
            className="gba:text-muted-foreground gba:font-mono"
            data-testid={formatDataTestId(testIdPrefix, `${fieldName}Currency`)}
            title={`Currency: ${currencySymbol}`}
          >
            {currencySymbol}
          </span>
        ) : (
          <span
            className="gba:text-muted-foreground gba:opacity-50"
            data-testid={formatDataTestId(testIdPrefix, `${fieldName}CurrencyPlaceholder`)}
            title="Select a currency to see symbol"
          >
            ?
          </span>
        )
      }
      data-testid={formatDataTestId(testIdPrefix, `${fieldName}Input`)}
      onChange={e => {
        // Store the raw value while typing
        onChange?.(e)
      }}
      onBlur={e => {
        // Format to 2 decimal places when user leaves the field
        const formatted = formatAmount(e.target.value)
        if (formatted !== '') {
          const syntheticEvent = {
            ...e,
            target: { ...e.target, value: formatted }
          } as React.ChangeEvent<HTMLInputElement>
          onChange?.(syntheticEvent)
        }
        onBlur?.(e)
      }}
    />
  )
}
