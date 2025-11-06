import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface LeadStatusChangePopupValues {
  leadId: string
  leadVersion: number
  newStatusRef: string
  statusDisplayName: string
}

export interface LeadStatusChangeContextState {
  formValues: LeadStatusChangePopupValues | null
  leadData: any
  isLoading: boolean
  error: string | null
  businessAppContext: BusinessAppContextProps
}

export interface LeadStatusChangePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<LeadStatusChangePopupValues>
}
