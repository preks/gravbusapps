import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface CampaignFormValues {
  id?: string
  version?: number
  name: string
  typeRef: string
  startDate: string // ISO or YYYY-MM-DD
  endDate: string // ISO or YYYY-MM-DD
  description?: string
}

export interface CampaignFormContextValue {
  businessAppContext: BusinessAppContextProps
  formValues: CampaignFormValues
  onSubmit: (values: CampaignFormValues) => Promise<void>
  onCancel: () => Promise<void>
  isLoading: boolean
  error: string | null
  isUpdateMode: boolean
}
