import React from 'react'
import { DateInput } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

type DateFieldProps = React.ComponentProps<typeof DateInput> & {
  fieldName: string
  testIdPrefix: string
}

export function DateField({
  fieldName,
  testIdPrefix,
  type = 'date',
  outputFormat = 'iso',
  value,
  onChange,
  ...props
}: DateFieldProps) {
  return (
    <DateInput
      {...props}
      type={type}
      outputFormat={outputFormat}
      value={value || ''}
      onChange={value => onChange?.(value || '')}
      data-testid={formatDataTestId(testIdPrefix, `${fieldName}Input`)}
    />
  )
}
