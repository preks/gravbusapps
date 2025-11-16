import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerLeads } from '@/common/data/customer/hooks/useCustomerLeads'
import type { CustomerLead } from '@/common/data/customer/types/customerLeadTypes'

interface LeadFormContextValue {
  // Business context
  businessAppContext: BusinessAppContextProps

  // Lead data
  lead: CustomerLead | null
  leadLoading: boolean
  leadError: Error | null

  // Actions
  onSubmit?: (lead: Partial<CustomerLead>) => Promise<void>
  onCancel?: () => Promise<void>

  // Control flags
  hideActions?: boolean
}

const LeadFormContext = createContext<LeadFormContextValue | undefined>(undefined)

interface LeadFormProviderProps {
  children: ReactNode
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<CustomerLead>
  onSubmit?: (lead: Partial<CustomerLead>) => Promise<void>
  onCancel?: () => Promise<void>
  hideActions?: boolean
}

export const LeadFormProvider: React.FC<LeadFormProviderProps> = ({
  children,
  businessAppContext,
  initialValues,
  onSubmit,
  onCancel,
  hideActions
}) => {
  // Lead state
  const [lead, setLead] = useState<CustomerLead | null>((initialValues as CustomerLead) || null)
  const [leadLoading, setLeadLoading] = useState(false)
  const [leadError, setLeadError] = useState<Error | null>(null)

  // Central hooks
  const { fetchCustomerLeadById } = useCustomerLeads(businessAppContext)

  // Load lead by ID if provided in initialValues
  useEffect(() => {
    if (initialValues?.id && !lead) {
      setLeadLoading(true)
      fetchCustomerLeadById(initialValues.id)
        .then(fetchedLead => {
          if (fetchedLead) {
            setLead(fetchedLead as CustomerLead)
          }
        })
        .catch(err => {
          console.error('Error loading lead:', err)
          setLeadError(err)
        })
        .finally(() => {
          setLeadLoading(false)
        })
    }
  }, [initialValues?.id, lead, fetchCustomerLeadById])

  const value: LeadFormContextValue = {
    businessAppContext,
    lead,
    leadLoading,
    leadError,
    onSubmit,
    onCancel,
    hideActions
  }

  return <LeadFormContext.Provider value={value}>{children}</LeadFormContext.Provider>
}

export const useLeadFormContext = () => {
  const context = useContext(LeadFormContext)
  if (!context) {
    throw new Error('useLeadFormContext must be used within LeadFormProvider')
  }
  return context
}
