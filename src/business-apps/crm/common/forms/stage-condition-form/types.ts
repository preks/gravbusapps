export interface StageConditionFormValues {
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
  formValues: StageConditionFormValues
  isLoading: boolean
  error: string | null
  setFormValues: (values: StageConditionFormValues) => void
  businessAppContext: BusinessAppContextProps
}
