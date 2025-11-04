import React, { useEffect, useRef } from 'react'
import { useAccountFormContext } from '../../account-form/context/AccountFormContext'
import { AccountFormValues } from '../../account-form/types'

interface FormChangeMonitorProps {
  onFormChange?: (values: Partial<AccountFormValues>) => void
}

const FormChangeMonitor: React.FC<FormChangeMonitorProps> = ({ onFormChange }) => {
  const { formValues } = useAccountFormContext()
  const previousValues = useRef<Partial<AccountFormValues>>({})

  useEffect(() => {
    // Check if form values have changed
    const hasChanged = Object.keys(formValues).some(key => {
      const currentValue = formValues[key as keyof AccountFormValues]
      const previousValue = previousValues.current[key as keyof AccountFormValues]
      return currentValue !== previousValue
    })

    if (hasChanged && onFormChange) {
      // Only send meaningful fields (non-empty values)
      const meaningfulValues: Partial<AccountFormValues> = {}

      for (const key of Object.keys(formValues)) {
        const value = formValues[key as keyof AccountFormValues]
        // Include non-empty strings and any non-string truthy values
        if (value && (typeof value !== 'string' || value.trim())) {
          meaningfulValues[key as keyof AccountFormValues] = value
        }
      }

      // Only call onChange if we have meaningful data
      if (Object.keys(meaningfulValues).length > 0) {
        onFormChange(meaningfulValues)
      }

      // Update previous values
      previousValues.current = { ...formValues }
    }
  }, [formValues, onFormChange])

  // Don't render anything visible
  return null
}

export default FormChangeMonitor
