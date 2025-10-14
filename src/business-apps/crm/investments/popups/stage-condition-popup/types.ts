export interface StageConditionPopupValues {
  // System fields
  id: string
  version?: number
  completed: boolean

  // Display fields
  conditionTitle?: string
  currentStatus?: string
}

import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface StageConditionContextState {
  formValues: StageConditionPopupValues
  isLoading: boolean
  error: string | null
  setFormValues: (values: StageConditionPopupValues) => void
  businessAppContext: BusinessAppContextProps
}
