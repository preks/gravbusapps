// Local types for the Investment Relations Lead View
export interface LeadViewFilters {
  leadStatus?: string[]
  leadSource?: string[]
  investmentType?: string[]
  ownerEmployee?: string[]
  dateRange?: {
    from: string
    to: string
  }
}

export interface LeadViewSortConfig {
  field: string
  direction: 'ASC' | 'DESC'
}

export interface LeadViewPagination {
  page: number
  pageSize: number
  total: number
}
