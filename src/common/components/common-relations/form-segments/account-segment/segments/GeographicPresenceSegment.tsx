import React from 'react'
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Input } from '@newwork/nw-design-system'
import { useFormContext } from 'react-hook-form'

interface Props {
  label?: React.ReactNode
}

const GeographicPresenceSegment: React.FC<Props> = ({ label }) => {
  const form = useFormContext<any>()

  if (!label) return null

  return (
    <FormField
      control={form.control as any}
      name="geographicPresence"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input data-testid="account-segment-geographic-presence" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

export default GeographicPresenceSegment
