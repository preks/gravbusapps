import React, { useEffect, useRef } from 'react'
import { useOpportunityFormContext } from '../../opportunity-form/context/OpportunityFormContext'
import { OpportunityFormValues } from '../../opportunity-form/types'

interface OpportunityFormChangeMonitorProps {
  onFormChange?: (values: Partial<OpportunityFormValues>) => void
}

const OpportunityFormChangeMonitor: React.FC<OpportunityFormChangeMonitorProps> = ({ onFormChange }) => {
  const { formValues } = useOpportunityFormContext()
  const previousValues = useRef<Partial<OpportunityFormValues>>({})

  useEffect(() => {
    // Check if form values have changed
    const hasChanged = Object.keys(formValues).some(key => {
      const currentValue = formValues[key as keyof OpportunityFormValues]
      const previousValue = previousValues.current[key as keyof OpportunityFormValues]
      return currentValue !== previousValue
    })

    if (hasChanged && onFormChange) {
      // Only send meaningful fields (non-empty values)
      const meaningfulValues = {} as Record<string, unknown>

      // Type-safe iteration over form values
      for (const key of Object.keys(formValues) as (keyof OpportunityFormValues)[]) {
        const value = formValues[key]

        // Include non-empty strings and any non-string truthy values
        if (value !== null && value !== undefined && (typeof value !== 'string' || value.trim())) {
          meaningfulValues[key] = value
        }
      }

      // Only call onChange if we have meaningful data
      if (Object.keys(meaningfulValues).length > 0) {
        onFormChange(meaningfulValues as Partial<OpportunityFormValues>)
      }

      // Update previous values
      previousValues.current = { ...formValues }
    }
  }, [formValues, onFormChange])

  return null // This component doesn't render anything
}

export default OpportunityFormChangeMonitor
