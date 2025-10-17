export interface SelectOption {
  id: string
  value: string
  label: string
  name: string
  extraInfo?: {
    picture?: string
    pictureThumbnail?: string
    jobPosition?: string
    organizationalUnit?: string
    userId?: string
    // Additional fields for Account data
    businessKey?: string
    email?: string
    website?: string
    owner?: string
    firstName?: string
    lastName?: string
    companyName?: string
    jobTitle?: string
    phone?: string
    status?: string
  }
}

export interface InvestmentOpportunityFormValues {
  // Basic Information
  owner: string
  name: string // opportunity name
  investmentName: string // investment name (separate from opportunity name)
  dealType: string
  code: string
  businessKey: string
  sourceApp: string

  // Financial Information
  estimatedAmount: string
  forecastedProfitAmount: string
  initialInvestmentAmount: string
  currency: string
  currencyRef: string
  closeDate: string

  // Pipeline Information
  pipeline: string
  pipelineStage: string

  // Investment-Specific Information
  investmentGroupRef: string
  investmentRoleRef: string
  investmentStakeTypeRef: string
  investmentTypeRef: string
  stakePercentage: string

  // Loan Information (Investment-specific)
  loanAmount: string
  loanInterestRate: string
  marketValue: string
  requiredCapitalAmount: string

  // Real Estate Specific (Investment-specific)
  annualNetColdRent: string
  buildingYear: string
  size: string
  measurementUnit: string

  // Relationship Information
  account: string
  accountId: string
  contactIds: Array<string | { id: string; name: string }> // Multiple contacts can be associated

  // Additional Information
  notesSummary: string // Will use additionalProperties or express fields

  // System and Process fields
  processInstanceId: string

  // Additional Properties for custom fields
  additionalProperties: Record<string, any>

  // Audit information (readonly, for display)
  activeFrom: string
  activeTo: string
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
  synchronizedAt: string

  // System fields
  id: string | undefined
  version: number | undefined

  // Legacy fields (for backward compatibility)
  ownerEmployeeId: string
  ownerOrganizationId: string
}

export interface InvestmentOpportunityContextState {
  isLoading: boolean
  error: string | null

  // Account autocomplete state
  accountSuggestions: SelectOption[]
  searchAccounts: (search: string) => Promise<SelectOption[]>
  isSearchingAccounts: boolean
  setIsSearchingAccounts: (loading: boolean) => void
  setAccountSuggestions: (suggestions: SelectOption[]) => void
}

// Deal types for Investment Opportunities (matching backend enum values)
export const DEAL_TYPES: SelectOption[] = [
  {
    id: 'INVESTMENT_DEAL',
    value: 'INVESTMENT_DEAL',
    label: 'Investment Deal',
    name: 'Investment Deal'
  },
  {
    id: 'DIVESTMENT_DEAL',
    value: 'DIVESTMENT_DEAL',
    label: 'Divestment Deal',
    name: 'Divestment Deal'
  },
  {
    id: 'UNKOWN_DEAL_TYPE',
    value: 'UNKOWN_DEAL_TYPE',
    label: 'Unknown Deal Type',
    name: 'Unknown Deal Type'
  }
]
