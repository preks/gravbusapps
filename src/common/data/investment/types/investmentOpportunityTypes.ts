/**
 * Investment Opportunity Types
 */

import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { ContactType } from './investmentEnums'

/**
 * InvestmentOpportunity
 * Main opportunity entity for IRM
 */
export interface InvestmentOpportunity extends BaseEntity {
  id: string
  code?: string
  name: string
  notesSummary?: string
  description?: string
  probability?: number
  lastInteraction?: string
  closeDate?: string

  // Catalog references
  currency?: CatalogEntry
  currencyRef?: string
  opportunityPipeline?: CatalogEntry & { childEntries?: CatalogEntry[] }
  opportunityPipelineStage?: CatalogEntry
  stage?: CatalogEntry // Alternative field name in some queries
  opportunityStatus?: CatalogEntry

  // Employee reference
  ownerEmployee?: Employee
  ownerEmployeeId?: string

  // Entity references
  account?: any // InvestmentAccount
  accountId?: string

  // Contact relationships
  investmentOpportunityContact?: Array<{
    id: string
    contactType?: ContactType
    contact?: any // InvestmentContact
  }>

  // Related investments
  investment?: any[] // Investment[]

  // Domain-specific fields
  dealType?: string
  investmentName?: string
  investmentGroup?: CatalogEntry
  investmentType?: CatalogEntry
  investmentRole?: CatalogEntry
  investmentStakeType?: CatalogEntry
  stakePercentage?: number
  marketValue?: number
  initialInvestmentAmount?: number
  estimatedAmount?: number
  loanAmount?: number
  loanInterestRate?: number
  requiredCapitalAmount?: number
  forecastedProfitAmount?: number
  annualNetColdRent?: number
  buildingYear?: string
  size?: number
  sizeMeasurementUnit?: CatalogEntry
  sizeMeasurementUnitRef?: string

  // Stage conditions
  opportunityStageConditions?: any[] // InvestmentOpportunityStageCondition[]
}
