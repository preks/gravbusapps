import React from 'react'
import { DateInput } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

type DateTimeFieldProps = React.ComponentProps<typeof DateInput> & {
  fieldName: string
  testIdPrefix: string
}

export function DateTimeField({
  fieldName,
  testIdPrefix,
  type = 'datetime-local',
  outputFormat = 'iso',
  value,
  onChange,
  ...props
}: DateTimeFieldProps) {
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
