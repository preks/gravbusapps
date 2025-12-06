import React from 'react'
import { Input } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

type NumberFieldProps = React.ComponentProps<typeof Input> & {
  fieldName: string
  testIdPrefix: string
}

export function NumberField({
  fieldName,
  testIdPrefix,
  type = 'number',
  step = '0.01',
  min = '0',
  placeholder = 'Enter number',
  value,
  onChange,
  ...props
}: NumberFieldProps) {
  return (
    <Input
      {...props}
      type={type}
      step={step}
      min={min}
      placeholder={placeholder}
      value={value || ''}
      onChange={e => {
        const newValue = e.target.value === '' ? '' : e.target.value
        const syntheticEvent = {
          ...e,
          target: { ...e.target, value: newValue }
        } as React.ChangeEvent<HTMLInputElement>
        onChange?.(syntheticEvent)
      }}
      data-testid={formatDataTestId(testIdPrefix, `${fieldName}Input`)}
    />
  )
}
