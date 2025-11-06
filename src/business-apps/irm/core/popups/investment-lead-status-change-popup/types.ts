import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface InvestmentStatusChangePopupValues {
  leadId: string
  leadVersion: number
  newStatusRef: string
  statusDisplayName: string
}

export interface InvestmentStatusChangeContextState {
  formValues: InvestmentStatusChangePopupValues | null
  leadData: any
  isLoading: boolean
  error: string | null
  businessAppContext: BusinessAppContextProps
}

export interface InvestmentStatusChangePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<InvestmentStatusChangePopupValues>
}
