// Action Assignment Types (Backend: FlowAssignment)
// These are internal types used for data transformation
import type { ActionDTO } from './action.types'
import type { ContextDTO } from './context.types'
import { Paging } from './common.types'

export interface ActionAssignmentEntryDTO {
  id: string
  permission?: string
  flowItem: ActionDTO // Backend sends FlowItemDTO, we map to ActionDTO
  translation?: Record<string, string>
  rank?: number
}

export interface ActionAssignmentDTO {
  id: string
  context: ContextDTO
  assignments: ActionAssignmentEntryDTO[]
  rank?: number
  version?: number
}

// Action Assignment Page
export interface ActionAssignmentPage {
  data: ActionAssignmentDTO[]
  paging: Paging
}

// Query Parameters
export interface GetActionAssignmentsParams {
  searchItem?: string
  limit?: number
  offset?: number
  returnTotalRecords?: boolean
}
