import React from 'react'
import { Input } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

type PercentageFieldProps = React.ComponentProps<typeof Input> & {
  fieldName: string
  testIdPrefix: string
}

export function PercentageField({
  fieldName,
  testIdPrefix,
  type = 'number',
  step = '0.01',
  min = '0',
  max = '100',
  placeholder = '0',
  value,
  onChange,
  ...props
}: PercentageFieldProps) {
  return (
    <Input
      {...props}
      type={type}
      step={step}
      min={min}
      max={max}
      placeholder={placeholder}
      value={value ?? ''}
      onChange={e => {
        const newValue = e.target.value
        // Preserve 0 as valid value, but allow empty string for clearing
        // The preprocessNumber in schema will handle empty string → undefined
        const syntheticEvent = {
          ...e,
          target: { ...e.target, value: newValue === '' ? '' : newValue }
        } as React.ChangeEvent<HTMLInputElement>
        onChange?.(syntheticEvent)
      }}
      endAddOn={<span className="gba:text-muted-foreground">%</span>}
      data-testid={formatDataTestId(testIdPrefix, `${fieldName}Input`)}
    />
  )
}
