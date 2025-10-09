export interface Address {
  id: string // Unique identifier for the address
  addressType: string // "BILLING", "SHIPPING", "OFFICE", "UNKNOWN_ADDRESS", etc.
  addressLines: string[] // Dynamic array of address lines
  postalCode: string
  city: string
  region: string
  country: string
}

export interface AccountFormValues {
  // Account Information
  owner: string

  // Company Information
  accountName: string
  parentAccount: string
  legalForm: string
  industry: string
  website: string
  description: string

  // Campaign Information
  salesCampaignId: string // Campaign ID for backend

  // Contact Information
  phone: string
  email: string
  fax: string

  // Dynamic Addresses Information
  addresses: Address[]

  // Legacy Address Information (for backward compatibility)
  country: string
  region: string
  addressLine1: string
  addressLine2: string
  addressLine3: string
  addressLine4: string
  postalCode: string
  city: string

  // Financial Information
  annualRevenue: string
  numberOfEmployees: string
  currency: string

  // Additional Information
  timeZone: string
  foundationDate: string
  tickerSymbol: string
  sicCode: string

  // System fields
  id?: string
  version?: number

  // Legacy fields for backward compatibility
  address?: string
  state?: string
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

export interface AccountContextState {
  // Loading states
  isLoading: boolean
  error: string | null

  // Data collections
  employeePositions: SelectOption[]
  legalForms: SelectOption[]
  industries: SelectOption[]
  countries: SelectOption[]
  currencies: SelectOption[]
  timeZones: SelectOption[]
  numberOfEmployeesOptions: SelectOption[]
}
