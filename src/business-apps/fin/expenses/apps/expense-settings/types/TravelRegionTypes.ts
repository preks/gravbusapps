// Travel Region Set Types
export interface TravelRegionSet {
  id: string
  code: string
  value: string
  description?: string
  childCount?: number
}

// Travel Region Types
export interface TravelRegion {
  id: string
  code: string
  value: string
  description?: string
  parentId?: string // Reference to TravelRegionSet
}

// Enhanced Allowance Region Rule for Matrix View
export interface MatrixAllowanceRegionRule {
  id: string
  code: string
  name: string
  activeFrom: string
  activeTo?: string
  travelRegionSetRef?: string
  details: MatrixAllowanceRegionRuleDetail[]
}

// Enhanced Allowance Region Rule Detail for Matrix View
export interface MatrixAllowanceRegionRuleDetail {
  id: string
  amount: number
  activeFrom: string
  activeTo?: string
  country?: {
    id: string
    code: string
    value: string
  }
  currency?: {
    id: string
    code: string
    value: string
  }
  travelRegionRef?: string
  travelRegion?: {
    id: string
    code: string
    value: string
  }
}

// Matrix Cell Type
export interface MatrixCell {
  travelRegionId: string
  allowanceRegionRuleId: string
  details: MatrixAllowanceRegionRuleDetail[]
  hasData: boolean
}

// View State Types
export type TravelRegionViewMode = 'sets' | 'matrix' | 'unassigned' | 'legacy'

export interface SelectedTravelRegionSet {
  id: string
  name: string
}

// Catalog Entry Types (for consistency)
export interface CatalogTravelRegionSet {
  id: string
  code: string
  value: string
  description?: string
  parentCatalogEntryId?: string
  childCatalogEntries?: CatalogTravelRegion[]
  objectValue?: any
}

export interface CatalogTravelRegion {
  id: string
  code: string
  value: string
  description?: string
  parentCatalogEntryId: string // Reference to TravelRegionSet
  objectValue?: any
}

// API Response Types
export interface TravelRegionSetResponse {
  data: CatalogTravelRegionSet[]
  totalRecords: number
}

export interface TravelRegionResponse {
  data: CatalogTravelRegion[]
  totalRecords: number
}

// GraphQL Query Response Types
export interface AllowanceRegionRuleWithTravelRegionSetResponse {
  AllowanceRegionRule: MatrixAllowanceRegionRule[]
}

export interface UnassignedAllowanceRegionRuleResponse {
  AllowanceRegionRule: {
    id: string
    code: string
    name: string
    activeFrom: string
    activeTo?: string
    ruleOrder?: number
    allowanceRegionRuleDetailAggregate: {
      aggregate: {
        count: number
      }
    }
  }[]
}
