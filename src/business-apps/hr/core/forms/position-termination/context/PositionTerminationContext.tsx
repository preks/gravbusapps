import React, { createContext, useContext, useState, useCallback } from 'react'
import { usePositionTerminationData, PositionTerminationData } from '../hooks/usePositionTerminationData'
import dayjs, { Dayjs } from 'dayjs'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'

export interface PositionTerminationFormValues {
  jobPositionId: string
  terminationDate: Dayjs
  terminationReason?: string
}

export interface PositionTerminationContextState {
  formValues: PositionTerminationFormValues
  setFormValues: (values: Partial<PositionTerminationFormValues>) => void
  position: PositionTerminationData | null
  loading: boolean
  error: string | null
  submit: () => void
  cancel: () => void
}

const PositionTerminationContext = createContext<PositionTerminationContextState | undefined>(undefined)

export const usePositionTerminationContext = () => {
  const context = useContext(PositionTerminationContext)
  if (!context) {
    throw new Error('usePositionTerminationContext must be used within a PositionTerminationProvider')
  }
  return context
}

export const PositionTerminationProvider: React.FC<{
  jobPositionId: string
  accessToken: string
  children: React.ReactNode
}> = ({ jobPositionId, accessToken, children }) => {
  // Use GraphQL hook to fetch position data
  const {
    data: position,
    loading: positionLoading,
    error: positionError
  } = usePositionTerminationData({
    jobPositionId,
    accessToken
  })

  // Form state
  const [formValuesState, setFormValuesState] = useState<PositionTerminationFormValues>({
    jobPositionId,
    terminationDate: dayjs(),
    terminationReason: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update form values
  const setFormValues = useCallback((values: Partial<PositionTerminationFormValues>) => {
    setFormValuesState(prev => ({ ...prev, ...values }))
  }, [])

  // Submit handler
  const submit = useCallback(() => {
    setLoading(true)
    setError(null)

    // Dispatch process continue event for position termination
    const payload = {
      jobPositionId: formValuesState.jobPositionId,
      terminationDate: formValuesState.terminationDate?.isValid() ? formValuesState.terminationDate : undefined,
      terminationReason: formValuesState.terminationReason || ''
    }

    dispatchProcessContinueEvent('pse_submit', payload)

    setLoading(false)
  }, [formValuesState])

  // Cancel handler
  const cancel = useCallback(() => {
    // Reset form to initial state
    setFormValuesState({
      jobPositionId,
      terminationDate: dayjs(),
      terminationReason: ''
    })

    // Dispatch cancel event
    dispatchProcessContinueEvent('pse_cancel', {})
  }, [jobPositionId])

  // Combine errors
  const combinedError = error || positionError
  const combinedLoading = loading || positionLoading

  const contextValue: PositionTerminationContextState = {
    formValues: formValuesState,
    setFormValues,
    position,
    loading: combinedLoading,
    error: combinedError,
    submit,
    cancel
  }

  return <PositionTerminationContext.Provider value={contextValue}>{children}</PositionTerminationContext.Provider>
}
