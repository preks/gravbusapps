import { FileInfo } from '@/common/types/FileTypes'
import type { CatalogEntry } from '@/common/network/graphql/commonTypes'

export interface TaskEmployee {
  id: string
  firstName: string
  lastName: string
  displayName: string
  department?: string
  avatar?: string
  initials?: string
  pictureThumbnail?: string
}

export interface TaskReference {
  type: 'opportunity' | 'account' | 'lead' | 'contact' | 'investment'
  id: string
  name: string
  description?: string
}

export interface TaskDocument {
  id: string
  name: string
  mimeType?: string
  fileSize?: number
  version?: number
  description?: string
  documentGroupRef?: string
  documentTypeRef?: string
  envelopeId?: string
  envelopeStatus?: string
  fileInfo?: FileInfo
}

export interface Task {
  id: string
  name: string
  code?: string
  description?: string
  assignedTo?: TaskEmployee | TaskEmployee[] // Optional - can be single or array of assignees
  type?: string // Optional - may not always have a type
  priority?: 'high' | 'medium' | 'urgent' | 'low' // Optional
  status?: 'in_progress' | 'pending' | 'completed' | 'overdue' // Optional
  // CatalogEntry objects for taskType, taskPriority, taskStatus (used by TaskDetailSheet)
  taskType?: CatalogEntry
  taskPriority?: CatalogEntry
  taskStatus?: CatalogEntry
  taskPriorityRef?: string
  taskStatusRef?: string
  taskTypeRef?: string
  reference?: TaskReference
  dueDate?: string // Optional
  scheduleDate?: string
  timingType?: 'DEADLINE' | 'SCHEDULED' | 'UNKNOWN_TIMING_TYPE'
  taskTiming?: string
  createdAt?: string
  updatedAt?: string
  version?: number
  createdBy?: string
  creatorEmployeeId?: string
  creatorUserId?: string
  assignedEmployeeId?: string
  assignedUserId?: string
  investmentId?: string
  accountId?: string
  contactId?: string
  opportunityId?: string
  leadId?: string
  templateStartDate?: string
  startDate?: string
  endDate?: string
  creatorEmployee?: TaskEmployee
  documents?: TaskDocument[]
  rawSalesTask?: any // Legacy field for backwards compatibility
  rawInvestmentTask?: any
}

export interface TaskStatisticItem {
  value: number
  previousValue?: number
  growth?: number
  growthDirection?: 'up' | 'down' | 'stable'
}

export interface TaskStatistics {
  totalTasks: TaskStatisticItem
  inProgress: TaskStatisticItem
  completed: TaskStatisticItem
  overdue: TaskStatisticItem
}
