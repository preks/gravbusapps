/**
 * Investment Lead Types
 * IRM-specific lead interfaces
 */

import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { CommonLead } from '@/common/data/relations/types/commonLeadTypes'
import type { InvestmentAccount } from './investmentAccountTypes'
import type { InvestmentContact } from './investmentContactTypes'
import type { InvestmentTask } from './investmentTaskTypes'
import type {
  InvestmentDocument,
  InvestmentOpportunity,
  InvestmentActivity,
  InvestmentNote
} from './investmentRelationTypes'
/**
 * Investment Lead (from GraphQL/Database)
 * Extends CommonLead with IRM-specific investment fields
 */
export interface InvestmentLead extends CommonLead {
  // Related entity references (Investment-specific)
  convertedAccount?: InvestmentAccount
  convertedContact?: InvestmentContact
  convertedOpportunity?: InvestmentOpportunity

  activities?: InvestmentActivity[]
  notes?: InvestmentNote[]
  documents?: InvestmentDocument[]
  tasks?: InvestmentTask[]

  // ============================================
  // IRM-SPECIFIC INVESTMENT FIELDS
  // ============================================
  // Investment identification
  investmentName?: string
  investmentGroup?: CatalogEntry
  investmentGroupRef?: string
  investmentType?: CatalogEntry
  investmentTypeRef?: string
  investmentRole?: CatalogEntry
  investmentRoleRef?: string
  investmentStakeType?: CatalogEntry
  investmentStakeTypeRef?: string

  // Financial metrics
  stakePercentage?: number
  marketValue?: number
  initialInvestmentAmount?: number
  loanAmount?: number
  loanInterestRate?: number
  requiredCapitalAmount?: number
  forecastedProfitAmount?: number

  // Real estate specific
  annualNetColdRent?: number
  buildingYear?: string
  size?: number
  sizeMeasurementUnit?: CatalogEntry
  sizeMeasurementUnitRef?: string

  // Rejection tracking
  rejectionReasons?: any[]

  // ============================================
  // COMPUTED FIELDS (for display/UI purposes)
  // ============================================
  displayName?: string
}
