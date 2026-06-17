import type { Descriptor } from '@/common/network/graphql/queryHelpers'

type OrderByValue = 'ASC' | 'DESC' | 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
type OrderByField = OrderByValue | { [key: string]: OrderByValue }

export interface SalesCampaignQueryVariables {
  id?: string
  offset?: number
  limit?: number
  search?: string
  searchColumns?: string[]
  orderBy?: Array<{ [key: string]: OrderByField }>
  sortField?: string
  sortOrder?: 'ASC' | 'DESC' | ''
  campaignTypes?: string[]
  campaignStatuses?: string[]
  startDateAfter?: string
  startDateBefore?: string
  endDateAfter?: string
  endDateBefore?: string
  createdAfter?: string
  createdBefore?: string
}

interface CatalogEntry {
  id: string
  value: string
  code: string
}

export const SalesCampaignFields = {
  name: 'name',
  description: 'description',
  type: 'type',
  customerCampaignStatus: 'customerCampaignStatus',
  startDate: 'startDate',
  endDate: 'endDate',
  createdAt: 'createdAt'
} as const

/**
 * Create Sales Campaign search descriptors keyed by the table's column ids.
 *
 * Mirrors the lead/account/contact/activity descriptor factories so campaign search reuses the
 * shared `buildSearch` helper: text columns become `_ilike` predicates, date columns become an
 * inclusive range (bare numbers are never treated as dates), and catalog columns search both the
 * displayed value and the code (codes can differ from the value). Search is scoped to the currently
 * visible columns by filtering on `key`.
 */
export const createSalesCampaignDescriptors = (
  fields: Record<keyof typeof SalesCampaignFields, string> = SalesCampaignFields
): Descriptor[] => [
  // The name column also renders the description as a subtitle, so search both under this key.
  { key: 'name', searchPaths: [fields.name, fields.description], sortPath: fields.name, type: 'text' },
  {
    key: 'type',
    searchPaths: [`${fields.type}.value`, `${fields.type}.code`],
    sortPath: `${fields.type}.value`,
    type: 'text'
  },
  {
    key: 'status',
    searchPaths: [`${fields.customerCampaignStatus}.value`, `${fields.customerCampaignStatus}.code`],
    sortPath: `${fields.customerCampaignStatus}.value`,
    type: 'text'
  },
  { key: 'startDate', searchPaths: [fields.startDate], sortPath: fields.startDate, type: 'date' },
  { key: 'endDate', searchPaths: [fields.endDate], sortPath: fields.endDate, type: 'date' },
  { key: 'createdAt', searchPaths: [fields.createdAt], sortPath: fields.createdAt, type: 'date' }
]

export interface SalesCampaign {
  id: string
  name?: string
  description?: string
  createdAt: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
  version?: number
  startDate?: string
  endDate?: string
  type?: CatalogEntry
  typeRef?: string
  isDeleted?: boolean
  recordState?: string
  customerCampaignSegment?: CatalogEntry
  customerCampaignSegmentRef?: string
  customerPersona?: CatalogEntry
  customerPersonaRef?: string
  customerValuePackFocus?: CatalogEntry
  customerValuePackFocusRef?: string
  customerIndustryFocus?: CatalogEntry
  customerIndustryFocusRef?: string
  country?: CatalogEntry
  countryRef?: string
  budgetAllocated?: number
  pipelineTarget?: number
  expectedWinRate?: number
  expectedRevenueContribution?: number
  ownerEmployee?: {
    id: string
    displayName: string
  }
  customerCampaignStatus?: CatalogEntry
  customerCampaignStatusRef?: string
}

export interface SalesCampaignResponse {
  SalesCampaign: SalesCampaign[]
}

export interface SalesCampaignWithCountResponse {
  SalesCampaign: SalesCampaign[]
  SalesCampaignAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface SalesCampaignStatistics {
  totalCampaigns: number
  activeCampaigns: number
  completedCampaigns: number
  averageDuration: number
  previousPeriod?: {
    totalCampaigns: number
    activeCampaigns: number
    completedCampaigns: number
    averageDuration: number
  }
}

export interface SalesCampaignStatisticsResponse {
  totalCampaigns: {
    aggregate: {
      count: number
    }
  }
  activeCampaigns: {
    aggregate: {
      count: number
    }
  }
  completedCampaigns: {
    aggregate: {
      count: number
    }
  }
  campaignsWithDuration: Array<{
    startDate: string
    endDate: string
  }>
  previousTotalCampaigns: {
    aggregate: {
      count: number
    }
  }
  previousActiveCampaigns: {
    aggregate: {
      count: number
    }
  }
  previousCompletedCampaigns: {
    aggregate: {
      count: number
    }
  }
  previousCampaignsWithDuration: Array<{
    startDate: string
    endDate: string
  }>
}
