import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface StageTransitionPopupValues {
  opportunityId: string
  opportunityName: string
  sourceStageRef?: string
  sourceStage?: {
    id: string
    value: string
    code: string
  }
  targetStageRef: string
  targetStage?: {
    id: string
    value: string
    code: string
  }
}

export interface StageTransitionContextState {
  formValues: StageTransitionPopupValues
  isLoading: boolean
  error: string | null
  setFormValues: (values: StageTransitionPopupValues) => void
  businessAppContext: BusinessAppContextProps
  currentStageConditions?: { id: string; value: string }[]
  incompleteConditionIds?: string[]
  pipelineStages?: { id: string; value: string; code: string }[]
}

export interface StageTransitionPopupComponentProps {
  businessAppContext: BusinessAppContextProps
  initialValues?: Partial<StageTransitionPopupValues>
}

export interface OpportunityQueryResult {
  id: string
  name: string
  salesPipelineStageRef?: string
  salesPipelineStage?: {
    id: string
    value: string
    code: string
  }
}

export interface SalesPipelineStageResult {
  id: string
  value: string
  code: string
  parentEntryId?: string
}
