// Shared types for compensation data will be added here
// e.g., common interfaces, enums, type utilities

import { CatalogEntry } from '@/common/types/CatalogTypes'

// Compensation Band interfaces
export interface CompensationBand {
  id: string
  description?: string
  currency?: {
    id: string
    value: string
  }
  currencyRef?: string
  name?: string
  version?: number
  payGrade?: number
  minSalary?: number
  maxSalary?: number
  nameI18n?: {
    [key: string]: string
  }
  descriptionI18n?: {
    [key: string]: string
  }
}

// Pay Grade interfaces for visualization
export interface PayGrade {
  id: string
  code: string
  name: string
  payGrade: number
  minSalary: number
  maxSalary: number
  standardSalary: number // Calculated as middle of min-max if not provided
  currency: {
    id: string
    value: string
  }
  order: number
}

// Job Level Group for compensation context
export interface JobLevelGroup {
  id: string
  name: string
  code: string
  description?: string
  category: string
  color: string
  jobLevels: JobLevel[]
}

// Job Level for compensation context
export interface JobLevel {
  id: string
  name: string
  code?: string
  description?: string
  level: number
  jobLevelGroupId: string
  compensationBandId?: string
  payGrade?: PayGrade
  jobLevelGroup?: JobLevelGroup
  displayName: string
}

// Visualization data structure
export interface PayGradeVisualizationData {
  payGrades: PayGradeVisualization[]
  jobLevelGroups: JobLevelGroupVisualization[]
  jobLevels: JobLevelVisualization[]
  isLoading: boolean
  error: string | null
}

// Job Level Group Data from catalog
export interface JobLevelGroupData {
  data: CatalogEntry[]
  paging: {
    limit: number
    offset: number
    totalRecords: number
    returnTotalRecords: boolean
  }
  query?: Record<string, any>
}

// Visualization interfaces for UI components
export interface PayGradeVisualization {
  id: string
  code: string
  name: string
  payGrade: number
  minSalary: number
  maxSalary: number
  standardSalary: number // Calculated as middle of min-max if not provided
  currency: {
    id: string
    value: string
  }
  order: number
  version: number
}

export interface JobLevelGroupVisualization {
  id: string
  code: string
  value: string
  name: string // Will use value as name
  category: string // Will map from code or use default
  color: string // Will assign colors based on order
  order: number
  description?: string
  additionalValue2?: string
  additionalValue3?: string
}

export interface JobLevelVisualization {
  id: string
  name: string
  code: string
  jobLevelGroupId: string
  payGradeId: string
  compensationBandId: string
  level: number
  hierarchyOrder: number
  version: number
}
