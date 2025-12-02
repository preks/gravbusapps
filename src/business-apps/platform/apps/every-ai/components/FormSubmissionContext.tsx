import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

/**
 * Form Submission Context
 * Manages form submission state to prevent duplicate submissions
 */

interface FormState {
  isSubmitted: boolean
  isCancelled: boolean
  isLoading: boolean
  isFlowCompleted: boolean
  hasError: boolean
}

interface FormSubmissionContextType {
  getFormState: (formKey: string) => FormState
  setFormState: (formKey: string, state: FormState) => void
  clearFormState: (formKey: string) => void
}

const FormSubmissionContext = createContext<FormSubmissionContextType | undefined>(undefined)

export const FormSubmissionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [formStates, setFormStates] = useState<Record<string, FormState>>({})

  const getFormState = useCallback(
    (formKey: string): FormState => {
      return (
        formStates[formKey] || {
          isSubmitted: false,
          isCancelled: false,
          isLoading: false,
          isFlowCompleted: false,
          hasError: false
        }
      )
    },
    [formStates]
  )

  const setFormState = useCallback((formKey: string, state: FormState) => {
    setFormStates(prev => ({
      ...prev,
      [formKey]: state
    }))
  }, [])

  const clearFormState = useCallback((formKey: string) => {
    setFormStates(prev => {
      const newState = { ...prev }
      delete newState[formKey]
      return newState
    })
  }, [])

  return (
    <FormSubmissionContext.Provider value={{ getFormState, setFormState, clearFormState }}>
      {children}
    </FormSubmissionContext.Provider>
  )
}

export const useFormSubmission = (): FormSubmissionContextType => {
  const context = useContext(FormSubmissionContext)
  if (!context) {
    throw new Error('useFormSubmission must be used within FormSubmissionProvider')
  }
  return context
}
