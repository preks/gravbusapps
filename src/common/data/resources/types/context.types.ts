// Context Data Types
export interface ContextDataDTO {
  id: string
  contextDataName: string
  mainContext: boolean
  contextDataType:
    | 'UUID'
    | 'STRING'
    | 'NUMBER'
    | 'BOOLEAN'
    | 'DATE'
    | 'DATE_TIME'
    | 'UUID_LIST'
    | 'STRING_LIST'
    | 'NUMBER_LIST'
    | 'BOOLEAN_LIST'
    | 'DATE_LIST'
    | 'DATE_TIME_LIST'
}

// Context Types
export interface ContextDTO {
  id: string
  contextName: string
  contextData: ContextDataDTO[]
  permissionSchema?: string
  rank?: number
  version?: number
}

import { Paging } from './common.types'

// Context Page
export interface ContextPage {
  data: ContextDTO[]
  paging: Paging
}

// Query Parameters
export interface GetContextsParams {
  searchItem?: string
  sort?: string
  limit?: number
  offset?: number
  returnTotalRecords?: boolean
}

// Enhanced Context with Actions (for ContextsView)
import type { ActionDTO } from './action.types'

export interface ContextWithActions {
  assignmentId?: string
  context: ContextDTO
  actions: Array<{
    assignmentEntryId?: string
    action: ActionDTO
    permission?: string
    rank?: number
    translation?: Record<string, string>
  }>
}
