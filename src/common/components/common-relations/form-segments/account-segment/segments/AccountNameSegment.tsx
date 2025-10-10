import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Input } from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'

interface Props {
  label: React.ReactNode
  ['data-testid']?: string
}

const AccountNameSegment: React.FC<Props> = ({ label, 'data-testid': dataTestId = 'account-segment-account-name' }) => {
  const form = useFormContext<any>()
  return (
    <FormField
      control={form.control as any}
      name="accountName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label} <span className="gba:text-destructive">*</span>
          </FormLabel>
          <FormControl>
            <Input data-testid={dataTestId} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export default AccountNameSegment
