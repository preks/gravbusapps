import React from 'react'
import { Input } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

type TextFieldProps = React.ComponentProps<typeof Input> & {
  fieldName: string
  testIdPrefix: string
}

export function TextField({ fieldName, testIdPrefix, value, placeholder, ...props }: TextFieldProps) {
  return (
    <Input
      {...props}
      value={value || ''}
      placeholder={placeholder}
      data-testid={formatDataTestId(testIdPrefix, `${fieldName}Input`)}
    />
  )
}
