// Type definitions for HomeView component
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { AppActionCommonProps } from '@/common/hooks/useAppActionData'
import type { Contact } from '../../hooks/useContactData'
import type { InvestmentContact } from '@/common/data/investment/types'
import type { TaskReference } from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import type { DocumentItem } from '@/common/components/common-relations/record-sections/document-section/DocumentSection'

// =====================================================
// CORE ENTITY TYPES
// =====================================================

// Note: Contact type is imported from useContactData.ts as it's the central interface

export type { Contact } from '../../hooks/useContactData'

// Raw contact data type (GraphQL response)
export type RawContactData = InvestmentContact

// =====================================================
// CATALOG ENTRY TYPE
// =====================================================

export interface CatalogEntry {
  id?: string
  code?: string
  value?: string
  type?: string
}

// =====================================================
// EMPLOYEE TYPE
// =====================================================

export interface EmployeeRef {
  id: string
  firstName?: string
  lastName?: string
  displayName?: string
  fullName?: string
  pictureThumbnail?: string
  department?: string
}

// =====================================================
// ACTIVITY TYPE
// =====================================================

export interface Activity {
  id: string
  title: string
  description?: string
  occurredAt?: string
  createdAt?: string
  ownerEmployee?: EmployeeRef
  createdBy?: string
  activityType?: CatalogEntry
}

// =====================================================
// NOTE TYPE
// =====================================================

export interface Note {
  id: string
  title?: string
  displayName?: string
  text?: string
  createdAt: string
  authorDisplayName?: string
  authorEmployee?: EmployeeRef
  reminderDate?: string
}

// =====================================================
// TASK AND APPROVAL TYPES
// =====================================================

export interface TaskOrApproval {
  id: string
  name?: string
  displayName?: string
  description?: string
  createdAt?: string
  dueDate?: string
  assignedEmployee?: EmployeeRef
  taskStatus?: CatalogEntry
  taskPriority?: CatalogEntry
  taskTiming?: 'DEADLINE' | 'SCHEDULED' | 'UNKNOWN_TIMING_TYPE'
  startDate?: string
  creatorEmployee?: EmployeeRef
  documents?: DocumentItem[]
  // Entity relationships for reference building
  lead?: {
    id: string
    firstName?: string
    lastName?: string
    code?: string
  }
  account?: {
    id: string
    name?: string
    code?: string
  }
  contact?: {
    id: string
    firstName?: string
    lastName?: string
    code?: string
  }
  opportunity?: {
    id: string
    name?: string
    code?: string
  }
  investment?: {
    id: string
    name?: string
    code?: string
  }
}

export type Task = TaskOrApproval
export type Approval = TaskOrApproval

// =====================================================
// MAPPED TASK ITEM (for UI consumption)
// =====================================================

export interface MappedTaskItem {
  id: string
  title: string
  description?: string
  createdAt?: string
  due?: string
  assignee?: string
  statusCode?: 'PENDING' | 'IN_PROGRESS' | 'OVERDUE' | 'COMPLETED'
  taskStatus?: CatalogEntry
  taskPriority?: CatalogEntry
  assigneeEmployee?: EmployeeRef
  taskTiming?: 'DEADLINE' | 'SCHEDULED' | 'UNKNOWN_TIMING_TYPE'
  startDate?: string
  creatorEmployee?: EmployeeRef
  documents?: DocumentItem[]
  reference?: TaskReference
}

// =====================================================
// ACTION PROPS TYPES
// =====================================================

export type ActivityActionProps = Omit<AppActionCommonProps, 'accessToken'>
export type NoteActionProps = Omit<AppActionCommonProps, 'accessToken'>
export type TaskActionProps = Omit<AppActionCommonProps, 'accessToken'>
export type ApprovalActionProps = Omit<AppActionCommonProps, 'accessToken'>

// =====================================================
// HOME VIEW PROPS
// =====================================================

export interface HomeViewProps extends BusinessAppContextProps {
  contactId: string
  contact: Contact
  rawContactData: RawContactData
  activities: Activity[]
  notes: Note[]
  tasks: Task[]
  approvals: Approval[]
  sectionsLoading: boolean
  sectionsError: string | null
  loadSectionData: () => void
  activityActionProps: ActivityActionProps
  noteActionProps: NoteActionProps
  taskActionProps: TaskActionProps
  approvalActionProps: ApprovalActionProps
}
