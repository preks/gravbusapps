import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { MarkAsLostFormValues, MarkAsLostContextState, LeadData } from '../types'

const LEAD_QUERY = `
  query GetLead($leadId: uuid!) {
    Lead(where: {id: {_eq: $leadId}}) {
      id
      version
      name
      firstName
      lastName
      email
      companyName
      status {
        value
      }
    }
  }
`

interface MarkAsLostFormContextType extends MarkAsLostContextState {
  // Actions
  submitForm: (values: MarkAsLostFormValues) => Promise<void>
  cancelForm: () => Promise<void>

  // Business app context
  businessAppContext: BusinessAppContextProps
}

const MarkAsLostFormContext = createContext<MarkAsLostFormContextType | undefined>(undefined)

// Reducer for state management
type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LEAD_DATA'; payload: LeadData | null }
  | { type: 'SET_SUBMITTING'; payload: boolean }

const initialState: MarkAsLostContextState = {
  isLoading: true,
  error: null,
  leadData: null,
  isSubmitting: false
}

function markAsLostReducer(state: MarkAsLostContextState, action: Action): MarkAsLostContextState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_LEAD_DATA':
      return { ...state, leadData: action.payload }
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.payload }
    default:
      return state
  }
}

interface MarkAsLostFormProviderProps {
  businessAppContext: BusinessAppContextProps
  children: ReactNode
  onSubmit?: (values: MarkAsLostFormValues) => Promise<void>
  onCancel?: () => Promise<void>
}

export const MarkAsLostFormProvider: React.FC<MarkAsLostFormProviderProps> = ({
  businessAppContext,
  children,
  onSubmit,
  onCancel
}) => {
  const [state, dispatch] = useReducer(markAsLostReducer, initialState)
  const graphqlClient = useGraphQLClient(businessAppContext.accessToken)

  // Load lead data on mount
  useEffect(() => {
    const loadLeadData = async () => {
      const leadId = businessAppContext.additionalData?.leadId
      if (!leadId) {
        dispatch({ type: 'SET_ERROR', payload: 'No lead ID provided' })
        dispatch({ type: 'SET_LOADING', payload: false })
        return
      }

      try {
        dispatch({ type: 'SET_LOADING', payload: true })
        dispatch({ type: 'SET_ERROR', payload: null })

        const response = await graphqlClient.request(LEAD_QUERY, { leadId })

        if (response.Lead && response.Lead.length > 0) {
          dispatch({ type: 'SET_LEAD_DATA', payload: response.Lead[0] })
        } else {
          dispatch({ type: 'SET_ERROR', payload: 'Lead not found' })
        }
      } catch (error) {
        console.error('Error loading lead data:', error)
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load lead data' })
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }

    loadLeadData()
  }, [businessAppContext.additionalData?.leadId, graphqlClient])

  const submitForm = async (values: MarkAsLostFormValues) => {
    try {
      dispatch({ type: 'SET_SUBMITTING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      if (onSubmit) {
        await onSubmit(values)
      } else {
        // Default submission using process events
        const payload = {
          lead: {
            id: values.id,
            version: values.version,
            leadStatusRef: values.leadStatusRef
          },
          lostReason: values.lostReason,
          lostComments: values.lostComments
        }

        dispatchProcessContinueEvent('pse_submit', payload)
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to submit form' })
    } finally {
      dispatch({ type: 'SET_SUBMITTING', payload: false })
    }
  }

  const cancelForm = async () => {
    try {
      if (onCancel) {
        await onCancel()
      } else {
        // Default cancellation using process events
        dispatchProcessContinueEvent('pse_pause', {})
      }
    } catch (error) {
      console.error('Error cancelling form:', error)
    }
  }

  const contextValue: MarkAsLostFormContextType = {
    ...state,
    submitForm,
    cancelForm,
    businessAppContext
  }

  return <MarkAsLostFormContext.Provider value={contextValue}>{children}</MarkAsLostFormContext.Provider>
}

export const useMarkAsLostFormContext = (): MarkAsLostFormContextType => {
  const context = useContext(MarkAsLostFormContext)
  if (!context) {
    throw new Error('useMarkAsLostFormContext must be used within a MarkAsLostFormProvider')
  }
  return context
}
