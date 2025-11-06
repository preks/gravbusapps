import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { LeadStatusChangePopupValues, LeadStatusChangeContextState } from '../types'
import { useLeadStatusChangeData } from '../hooks/useLeadStatusChangeData'

const LeadStatusChangePopupContext = createContext<LeadStatusChangeContextState | null>(null)

export const useLeadStatusChangePopupContext = () => {
  const context = useContext(LeadStatusChangePopupContext)
  if (!context) {
    throw new Error('useLeadStatusChangePopupContext must be used within LeadStatusChangePopupProvider')
  }
  return context
}

interface LeadStatusChangePopupProviderProps {
  children: React.ReactNode
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<LeadStatusChangePopupValues>
}

export const LeadStatusChangePopupProvider: React.FC<LeadStatusChangePopupProviderProps> = ({
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
  const { leadData, isLoading, error } = useLeadStatusChangeData({
    context: businessAppContext,
    leadId
  })

  // Form values state
  const [formValues, setFormValues] = useState<LeadStatusChangePopupValues | null>(null)

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

  return <LeadStatusChangePopupContext.Provider value={contextValue}>{children}</LeadStatusChangePopupContext.Provider>
}
