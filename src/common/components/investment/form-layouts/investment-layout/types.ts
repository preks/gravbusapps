import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import type { EquityInvestment } from '@/common/data/investment/types/equityInvestmentTypes'
import type { RealEstateInvestment } from '@/common/data/investment/types/realEstateInvestmentTypes'
import type { LiquidFundInvestment } from '@/common/data/investment/types/liquidFundInvestmentTypes'

// Nested form structure matching API payload structure exactly
// react-hook-form handles nested structures perfectly with dot notation (e.g., "investment.name")
export interface InvestmentFormValues {
  // Main investment data - matches Investment interface
  investment: Partial<Investment>

  // Group-specific data - exactly one must be present based on investmentGroup
  equityInvestment?: Partial<EquityInvestment>
  realEstateInvestment?: Partial<RealEstateInvestment>
  liquidFundInvestment?: Partial<LiquidFundInvestment>
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
  // Note: accounts now accessed via centralized fetchInvestmentAccounts function
  // Note: employee positions are handled by EmployeeSelect component automatically via businessAppContext
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
