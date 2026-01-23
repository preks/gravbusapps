// Action Types (Backend: FlowItem)
export interface ActionDTO {
  id: string
  flowName: string
  flowNameTranslation?: Record<string, string>
  flowId: string
  processName: string
  flowType: 'ACTION' | 'NAVIGATION' | 'REPORT'
  domain: string
  targetDesktop?: string
  targetMobile?: string
  roles?: string[]
  features?: string[]
  description?: string
  category?: string
  module?: string
  variant?: string
  rank?: number
  createdAt?: string
  createdBy?: string
  createdByUserName?: string
  updatedAt?: string
  updatedBy?: string
  isCustomFlow?: boolean
  searchEnabled?: boolean
  version?: number
  builderType?: string
}

import { Paging } from './common.types'

// Action Page
export interface ActionPage {
  data: ActionDTO[]
  paging: Paging
}

// Query Parameters
export interface GetActionsParams {
  flowName?: string
  sort?: string
  limit?: number
  offset?: number
  returnTotalRecords?: boolean
}

// Enhanced Action with Contexts (for FlowsView)
import type { ContextDTO } from './context.types'

export interface ActionWithContexts {
  action: ActionDTO
  contexts: Array<{
    context: ContextDTO
    permission?: string
    rank?: number
    translation?: Record<string, string>
  }>
}
