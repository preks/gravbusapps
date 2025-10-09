export interface Address {
  id: string // Unique identifier for the address
  addressType: string // "BILLING", "SHIPPING", "OFFICE", "UNKNOWN_ADDRESS", etc.
  addressLines: string[] // Dynamic array of address lines
  postalCode: string
  city: string
  region: string
  country: string
}

export interface LeadFormValues {
  // Lead Information
  owner: string
  leadStatus: string
  leadSource: string
  rating: string
  sensitive: boolean

  // Contact Information
  salutation: string
  firstName: string
  lastName: string
  jobPosition: string // Replaces title
  phone: string
  email: string

  // Company Information
  legalForm: string
  industry: string
  company: string
  website: string
  companyEmail: string
  companyPhone: string
  timeZone: string
  numberOfEmployees: string
  annualRevenue: string

  // Campaign Information
  salesCampaignId: string // Campaign ID for backend

  // Address Information (New dynamic structure)
  addresses: Address[]

  // Address Information (Legacy fields for backward compatibility)
  country: string
  region: string
  addressLine1: string
  addressLine2: string
  addressLine3: string
  addressLine4: string
  postalCode: string
  city: string

  // Notes
  notes: string

  // System fields
  id?: string
  version?: number

  // Legacy fields for backward compatibility
  followUp?: boolean
  address?: string
  state?: string
  title?: string
  accountId?: string
  contactId?: string
}

export interface SelectOption {
  id: string | number
  value: string
  label: string
  name: string
  extraInfo?: {
    email?: string
    phone?: string
    picture?: string | null
    pictureThumbnail?: string | null
    jobPosition?: string
    organizationalUnit?: string
    userId?: string | null
  }
}

export interface LeadContextState {
  // Loading states
  isLoading: boolean
  error: string | null

  // Data collections
  leadSources: SelectOption[]
  leadStatuses: SelectOption[]
  leadRatings: SelectOption[]
  employeePositions: SelectOption[]
  legalForms: SelectOption[]
  industries: SelectOption[]
  timeZones: SelectOption[]
  countries: SelectOption[]
  employeeSizes: SelectOption[]
  employeeSizesLoading: boolean
  employeeSizesError: string | null
  employeeSizesHasMore: boolean
  employeeSizesNeedsMoreData: boolean
  employeeSizesDisplayCount: number
  employeeSizesTotalFetched: number
  searchEmployeeSizes: (search: string) => void
  loadMoreEmployeeSizes: () => void
  showMoreEmployeeSizes: () => void

  // Revenue Sizes
  revenueSizes: SelectOption[]
  revenueSizesLoading: boolean
  revenueSizesError: string | null
  revenueSizesHasMore: boolean
  revenueSizesNeedsMoreData: boolean
  revenueSizesDisplayCount: number
  revenueSizesTotalFetched: number
  searchRevenueSizes: (search: string) => void
  loadMoreRevenueSizes: () => void
  showMoreRevenueSizes: () => void
}
