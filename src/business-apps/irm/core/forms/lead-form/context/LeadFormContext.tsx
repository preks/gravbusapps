import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentLeads } from '@/common/data/investment/hooks/useInvestmentLeads'
import type { InvestmentLead } from '@/common/data/investment/types/investmentLeadTypes'

interface LeadFormContextValue {
  // Business context
  businessAppContext: BusinessAppContextProps

  // Lead data
  lead: InvestmentLead | null
  leadLoading: boolean
  leadError: Error | null

  // Actions
  onSubmit?: (lead: Partial<InvestmentLead>) => Promise<void>
  onCancel?: () => Promise<void>

  // Control flags
  hideActions?: boolean
}

const LeadFormContext = createContext<LeadFormContextValue | undefined>(undefined)

interface LeadFormProviderProps {
  children: ReactNode
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<InvestmentLead>
  onSubmit?: (lead: Partial<InvestmentLead>) => Promise<void>
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
  const [lead, setLead] = useState<InvestmentLead | null>((initialValues as InvestmentLead) || null)
  const [leadLoading, setLeadLoading] = useState(false)
  const [leadError, setLeadError] = useState<Error | null>(null)

  // Central hooks
  const { fetchInvestmentLeadById } = useInvestmentLeads(businessAppContext)

  // Load lead by ID if provided in initialValues
  useEffect(() => {
    if (initialValues?.id && !lead) {
      setLeadLoading(true)
      fetchInvestmentLeadById(initialValues.id)
        .then(result => {
          if (result?.lead) {
            setLead(result.lead as InvestmentLead)
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
  }, [initialValues?.id, lead, fetchInvestmentLeadById])

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
