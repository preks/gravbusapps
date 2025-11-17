import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface LeadStatusChangePopupConfig {
  translationPrefix: string
  entityKey: string
  testIdPrefix: string
  statusFieldName: string
  useLeadDataHook: (
    leadId: string,
    accessToken: string
  ) => {
    lead: unknown
    loading: boolean
    error: string | null
    refetch?: () => void
    refetchLeadData?: () => void
  }
}

export interface LeadStatusChangePopupProps extends BusinessAppContextProps {
  initialValues?: {
    leadId?: string
  }
  config: LeadStatusChangePopupConfig
}
