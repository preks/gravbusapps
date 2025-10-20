// Local types for the Investment Relations Contact View
export interface ContactViewFilters {
  contactType?: string[]
  isPrimaryContact?: boolean
  isDecisionMaker?: boolean
  isActive?: boolean
  ownerEmployee?: string[]
  account?: string[]
  dateRange?: {
    from: string
    to: string
  }
}

export interface ContactViewSortConfig {
  field: string
  direction: 'ASC' | 'DESC'
}

export interface ContactViewPagination {
  page: number
  pageSize: number
  total: number
}
