import React from 'react'
import { Textarea } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

type TextAreaFieldProps = React.ComponentProps<typeof Textarea> & {
  fieldName: string
  testIdPrefix: string
}

export function TextAreaField({ fieldName, testIdPrefix, value, placeholder, ...props }: TextAreaFieldProps) {
  return (
    <Textarea
      {...props}
      value={value || ''}
      placeholder={placeholder}
      data-testid={formatDataTestId(testIdPrefix, `${fieldName}Textarea`)}
    />
  )
}
