import { Icon as PhosphorIcon } from '@phosphor-icons/react'

// Project status enums
export enum ProjectStatusBE {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

export enum ProjectTypeBE {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL'
}

export enum ProjectStatusUI {
  Planned = 'Planned',
  InProgress = 'In Progress',
  OnHold = 'On Hold',
  Canceled = 'Canceled',
  Completed = 'Completed'
}

// Project data types
export interface ProjectManager {
  id: string
  displayName?: string
  firstName?: string
  lastName?: string
  pictureThumbnail?: string
}

export interface MatrixTeam {
  matrixId?: string
  matrixName?: string
  teamMembersCount?: number
}

export interface ProjectData {
  id: string
  name: string
  description?: string
  validFrom?: string
  validTo?: string
  closureDate?: string
  structureId: string
  projectType: ProjectTypeBE
  customerId?: string
  projectManagerId?: string
  status?: ProjectStatusBE | null
  matrixUnitId?: string
  hoursBudget?: number | null
}

export interface Project {
  id: string
  name: string
  description?: string
  validFrom?: string
  validTo?: string
  structureId: string
  projectType: string
  customerId?: string
  projectManagerId?: string
  managerPicture?: string
  projectManagerName?: string
  hoursBudget?: number | null
  manager?: ProjectManager
  matrixTeam?: MatrixTeam
  status: ProjectStatusUI
  isActive: boolean
  daysUntilExpiry?: number
  daysUntilStart?: number
  daysDelayed?: number
  formattedValidTo?: string
  formattedValidFrom?: string
}

// Launcher types
export interface ProjectArea {
  id: string
  title: string
  description: string
  icon: PhosphorIcon
  category: 'setup' | 'allocation' | 'management'
  links?: Array<{
    label: string
    action: string
  }>
  buttonLabel?: string
  buttonAction?: string
}
