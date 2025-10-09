import { CatalogEntry } from '@/common/types/CatalogTypes'

// Enum for sales pipeline stage types
export enum StageType {
  DISCOVERY = 'DISCOVERY',
  QUALIFICATION = 'QUALIFICATION',
  NEGOTIATION = 'NEGOTIATION',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST'
}

// Interface for Sales Pipeline (parent catalog entry)
export interface SalesPipeline {
  id: string
  code: string
  value: string
  objectValue?: Record<string, any>
}

// Interface for Sales Pipeline Stage (child catalog entry)
export interface SalesPipelineStage {
  id: string
  parentEntryId: string
  code: string
  alternativeCode: StageType
  value: string
  additionalValue1: string // Rank as string (e.g., "01", "02")
  objectValue?: Record<string, any>
}

// Enhanced interfaces for visualization
export interface EnhancedSalesPipeline extends SalesPipeline {
  stages: EnhancedSalesPipelineStage[]
  stageCount: number
  displayName: string
  description: string // From additionalValue1
  type: string // Pipeline type (CRM or IRM) - from catalog entry type field
}

export interface EnhancedSalesPipelineStage extends SalesPipelineStage {
  pipeline?: SalesPipeline
  rank: number // Parsed from additionalValue1
  stageTypeName: string // Human readable stage type
  stageTypeColor: string // Color for UI display
  isFirst: boolean
  isLast: boolean
}

// Data response types for catalog APIs
export interface SalesPipelineData {
  data: CatalogEntry[]
  paging: {
    limit: number
    offset: number
    totalRecords: number
    returnTotalRecords: boolean
  }
  query?: Record<string, any>
}

export interface SalesPipelineStageData {
  data: CatalogEntry[]
  paging: {
    limit: number
    offset: number
    totalRecords: number
    returnTotalRecords: boolean
  }
  query?: Record<string, any>
}

// Integration data structure
export interface PipelineDataIntegration {
  pipelines: EnhancedSalesPipeline[]
  stages: EnhancedSalesPipelineStage[]
  isLoading: boolean
  error: string | null
}

// Stage type configuration for UI
export interface StageTypeConfig {
  type: StageType
  label: string
  color: string
  description: string
}

// Form interfaces for modals
export interface PipelineFormData {
  code: string
  value: string
  description: string // Maps to additionalValue1
  type: string // Pipeline type (CRM or IRM)
}

export interface StageFormData {
  code: string
  value: string
  alternativeCode: StageType
  parentEntryId: string
  rank: number
}

// Constants for stage type configurations
export const STAGE_TYPE_CONFIGS: Record<StageType, StageTypeConfig> = {
  [StageType.DISCOVERY]: {
    type: StageType.DISCOVERY,
    label: 'Discovery',
    color: 'blue',
    description: 'Initial discovery and prospecting phase'
  },
  [StageType.QUALIFICATION]: {
    type: StageType.QUALIFICATION,
    label: 'Qualification',
    color: 'cyan',
    description: 'Qualifying the opportunity and requirements'
  },
  [StageType.NEGOTIATION]: {
    type: StageType.NEGOTIATION,
    label: 'Negotiation',
    color: 'orange',
    description: 'Negotiating terms and conditions'
  },
  [StageType.CLOSED_WON]: {
    type: StageType.CLOSED_WON,
    label: 'Closed Won',
    color: 'green',
    description: 'Successfully closed opportunity'
  },
  [StageType.CLOSED_LOST]: {
    type: StageType.CLOSED_LOST,
    label: 'Closed Lost',
    color: 'red',
    description: 'Opportunity closed unsuccessfully'
  }
}

export {}
