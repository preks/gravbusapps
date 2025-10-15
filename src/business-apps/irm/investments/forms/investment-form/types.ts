import {
  InvestmentData,
  EquityInvestmentData,
  RealEstateInvestmentData,
  LiquidFundInvestmentData
} from '@/common/data/investment/payloads/investmentPayloads'

// Nested form structure matching API payload structure exactly
// react-hook-form handles nested structures perfectly with dot notation (e.g., "investment.name")
export interface InvestmentFormValues {
  // Main investment data - matches InvestmentData interface exactly
  investment: InvestmentData

  // Group-specific data - exactly one must be present based on investmentGroup
  equityInvestment?: EquityInvestmentData
  realEstateInvestment?: RealEstateInvestmentData
  liquidFundInvestment?: LiquidFundInvestmentData
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
    department?: string
    position?: string
  }
}

export interface InvestmentContextState {
  // Loading states
  isLoading: boolean
  error: string | null

  // Data collections
  investmentGroups: SelectOption[]
  employeePositions: SelectOption[]
  // Note: accounts now accessed via centralized fetchInvestmentAccounts function
}

export interface InvestmentApiPayload {
  id?: string
  sourceApp?: string
  ownerEmployeeId: string
  name: string
  accountId: string
  initialInvestmentAmount: number
  group: string
  version?: number
}

export interface InvestmentApiResponse {
  success: boolean
  data?: any
  error?: string
  message?: string
}
