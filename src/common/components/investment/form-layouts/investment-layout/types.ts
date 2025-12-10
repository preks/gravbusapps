import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import type { EquityInvestment } from '@/common/data/investment/types/equityInvestmentTypes'
import type { RealEstateInvestment } from '@/common/data/investment/types/realEstateInvestmentTypes'
import type { LiquidFundInvestment } from '@/common/data/investment/types/liquidFundInvestmentTypes'

// Nested form structure matching API payload structure exactly
// react-hook-form handles nested structures perfectly with dot notation (e.g., "investment.name")
export interface InvestmentFormValues {
  // Main investment data - matches Investment interface
  investment: Partial<
    Investment & {
      // Investment type field (leaf InvestmentType ID)
      investmentTypeId?: string | null
    }
  >

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
