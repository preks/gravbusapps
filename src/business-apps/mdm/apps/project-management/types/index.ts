import { Icon as PhosphorIcon } from '@phosphor-icons/react'

// Project data types
export interface ProjectManager {
  firstName?: string
  lastName?: string
  pictureThumbnail?: string
}

export interface MatrixTeam {
  matrixId?: string
  matrixName?: string
}

export interface ProjectData {
  id: string
  name: string
  description?: string
  validFrom?: string
  validTo?: string
  structureId: string
  projectType: string
  customerId?: string
  projectManagerId?: string
  projectStatus?: string
  manager?: ProjectManager
  matrixTeam?: MatrixTeam
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
  projectStatus?: string
  manager?: ProjectManager
  matrixTeam?: MatrixTeam
  status: 'Active' | 'Planned' | 'Delayed' | 'Closed'
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
