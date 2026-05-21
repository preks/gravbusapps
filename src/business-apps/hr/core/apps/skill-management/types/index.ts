import type { FlowExecutionTask } from '@/common/network/flow-metrics/FlowMetricsClient'

export interface SkillDirectoryRecord {
  id: string
  version?: number | null
  name: string
  description?: string | null
  activeTo?: string | null
  employeeSkillsAggregate?: {
    aggregate: { count: number }
  }
}

export interface SkillRecord extends SkillDirectoryRecord {
  levelScale?: number | null
  mandatory?: boolean | null
  orgUnits?: unknown
  additionalProperties?: unknown
  businessKey?: string | null
  isDeleted: boolean
  activeFrom?: string | null
  recordState?: string | null
  processInstanceId?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  createdBy?: string | null
}

export interface SkillCategoryRecord {
  id: string
  name: string
  description?: string | null
  businessKey?: string | null
  isDeleted: boolean
  activeFrom?: string | null
  activeTo?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  version?: number
}

export interface SkillCategoryWithCount extends SkillCategoryRecord {
  skillCount: number
}

export interface SkillCategorySkillRecord {
  id: string
  skillCategoryId: string
  skillId: string
  skillCategory?: SkillCategoryRecord
  skill?: SkillRecord
  isDeleted: boolean
}

export interface EmployeeSkillRecord {
  id: string
  businessKey?: string | null
  level?: number | null
  validFrom?: string | null
  recordState?: string | null
  processInstanceId?: string | null
  flowTask?: FlowExecutionTask | null
  flowTaskLookupStatus?: 'found' | 'no-task' | 'not-authorized' | 'not-open' | 'lookup-failed'
  employeeSkillStatus?: string | null
  isDeleted: boolean
  createdAt?: string | null
  updatedAt?: string | null
  employee: {
    id: string
    firstName?: string | null
    lastName?: string | null
    displayName?: string | null
    pictureThumbnail?: string | null
    userId?: string | null
  }
  skill?: {
    id: string
    name: string
    description?: string | null
  }
}

export enum EmployeeSkillStatus {
  UNKNOWN = 'UNKNOWN_SKILL_STATUS',
  PENDING = 'PENDING_SKILL_STATUS',
  APPROVED = 'APPROVED_SKILL_STATUS',
  REJECTED = 'REJECTED_SKILL_STATUS'
}

export type SkillStatusFilter = 'all' | 'active' | 'inactive'

export interface SkillFormValues {
  name: string
  description?: string
  levelScale?: number
  mandatory?: boolean
  version?: number | null
}

export interface CategoryFormValues {
  name: string
  description?: string
}

export const SkillManagementTabs = {
  DIRECTORY: 'directory',
  PENDING: 'pending',
  CATEGORIES: 'categories'
} as const

export type SkillManagementTab = (typeof SkillManagementTabs)[keyof typeof SkillManagementTabs]
