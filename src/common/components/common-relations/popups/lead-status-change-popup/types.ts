import { BusinessAppContextProps } from '@/common/BusinessAppContext'

/**
 * Base interface for lead data used in status change popup
 * Supports both CRM CustomerLead and IRM InvestmentLead
 */
export interface BaseLeadData {
  id: string
  version: number | string
  // Dynamic status field access (leadStatus, investmentLeadStatus, etc.)
  [key: string]: any
}

export interface LeadStatusChangePopupConfig {
  translationPrefix: string
  entityKey: string
  testIdPrefix: string
  statusFieldName: string
  useLeadDataHook: (
    leadId: string,
    accessToken: string
  ) => {
    lead: BaseLeadData | null
    loading: boolean
    error: string | null
    refetch?: () => void
  }
}

export interface LeadStatusChangePopupProps extends BusinessAppContextProps {
  initialValues?: {
    leadId?: string
  }
  config: LeadStatusChangePopupConfig
}
