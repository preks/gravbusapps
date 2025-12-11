export interface RealEstateAnalyticsFilters {
  startDate?: string
  endDate?: string
  currency?: string
  currencyIds?: string[]
  propertyType?: string
  investmentType?: string // Added for dynamic filtering by investment type
  fundManagerName?: string
}

export interface RealEstateAnalyticsRowData {
  id: string
  date: string
  propertyName: string
  propertyCode?: string
  propertyType: string
  annualNetColdRent: number
  occupancyPercent: number
  numberOfUnits?: number
  actualAnnualExpenses?: number
  funding?: number
  currency: string
  fundManagerName?: string
  // Investment information for linking
  investmentId?: string
  investmentName?: string
}

export interface RealEstateAnalyticsTableProps {
  accessToken: string
  userInfo: any
  filters: RealEstateAnalyticsFilters
  propertyType: string
  title: string
  'data-testid'?: string
}

export interface RealEstateAnalyticsResponse {
  data: RealEstateAnalyticsRowData[]
  totalCount: number
  error?: string
}
