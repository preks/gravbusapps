import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentStatusChangePopupValues, InvestmentStatusChangeContextState } from '../types'
import { useInvestmentStatusChangeData } from '../hooks/useInvestmentStatusChangeData'

const InvestmentStatusChangePopupContext = createContext<InvestmentStatusChangeContextState | null>(null)

export const useInvestmentStatusChangePopupContext = (): InvestmentStatusChangeContextState => {
  const context = useContext(InvestmentStatusChangePopupContext)
  if (!context) {
    throw new Error('useInvestmentStatusChangePopupContext must be used within an InvestmentStatusChangePopupProvider')
  }
  return context
}

interface InvestmentStatusChangePopupProviderProps {
  children: React.ReactNode
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<InvestmentStatusChangePopupValues>
}

export const InvestmentStatusChangePopupProvider: React.FC<InvestmentStatusChangePopupProviderProps> = ({
  children,
  businessAppContext,
  initialValues
}) => {
  // Extract leadId from additionalData
  const leadId =
    initialValues?.leadId ||
    businessAppContext.additionalData?.leadId ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.leadId ||
    businessAppContext.additionalData?.id ||
    null

  // Extract status information from additionalData
  const newStatusRef =
    initialValues?.newStatusRef ||
    businessAppContext.additionalData?.newStatusRef ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.newStatusRef ||
    null

  const statusDisplayName =
    initialValues?.statusDisplayName ||
    businessAppContext.additionalData?.statusDisplayName ||
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.statusDisplayName ||
    null

  // Use the hook to load lead data
  const { leadData, isLoading, error } = useInvestmentStatusChangeData({
    context: businessAppContext,
    leadId
  })

  // Form values state
  const [formValues, setFormValues] = useState<InvestmentStatusChangePopupValues | null>(null)

  // Update form values when lead data is loaded
  useEffect(() => {
    if (leadData && leadId && newStatusRef && statusDisplayName) {
      setFormValues({
        leadId,
        leadVersion: leadData.version,
        newStatusRef,
        statusDisplayName
      })
    }
  }, [leadData, leadId, newStatusRef, statusDisplayName])

  const contextValue = useMemo(
    () => ({
      formValues,
      leadData,
      isLoading,
      error,
      businessAppContext
    }),
    [formValues, leadData, isLoading, error, businessAppContext]
  )

  return (
    <InvestmentStatusChangePopupContext.Provider value={contextValue}>
      {children}
    </InvestmentStatusChangePopupContext.Provider>
  )
}
