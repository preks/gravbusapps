/**
 * Customer Lead Types
 * CRM-specific lead interfaces
 */

import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { CommonLead } from '@/common/data/relations/types/commonLeadTypes'
import { CustomerAccount } from './customerAccountTypes'
import { CustomerContact } from './customerContactTypes'
import { CustomerTask } from './customerTaskTypes'
import { CustomerDocument, CustomerOpportunity, CustomerActivity, CustomerNote } from './customerRelationTypes'

/**
 * Customer Lead (from GraphQL/Database)
 * Extends CommonLead with CRM-specific fields and naming inconsistencies
 */
export interface CustomerLead extends CommonLead {
  // Related entity references (Investment-specific)
  convertedAccount?: CustomerAccount
  convertedContact?: CustomerContact
  convertedOpportunity?: CustomerOpportunity

  activities?: CustomerActivity[]
  notes?: CustomerNote[]
  documents?: CustomerDocument[]
  tasks?: CustomerTask[]

  // ============================================
  // CRM-SPECIFIC FIELD NAMING INCONSISTENCIES
  // ============================================
  // NOTE: CRM (Lead) uses different field names than IRM (InvestmentLead)
  // These fields are kept for GraphQL compatibility and mapped in the mapper

  // CRM uses "industry", CommonLead uses "industryClass" (IRM standard)
  industry?: CatalogEntry // Raw field from GraphQL (Lead.industry)
  industryRef?: string

  // CRM uses "numberOfEmployees", CommonLead uses "companySize" (IRM standard)
  numberOfEmployees?: CatalogEntry // Raw field from GraphQL (Lead.numberOfEmployees)
  numberOfEmployeesRef?: string

  // CRM uses "annualRevenue", CommonLead uses "accountAnnualRevenueBand" (IRM standard)
  annualRevenue?: CatalogEntry // Raw field from GraphQL (Lead.annualRevenue)
  annualRevenueRef?: string

  // CRM uses "city", CommonLead uses "locality" (IRM standard)
  city?: string // Raw field from GraphQL (Lead.city)

  // ============================================
  // CRM-SPECIFIC FIELDS
  // ============================================
  // Fields that only exist in CRM and not in IRM

  accountId?: string
  account?: any // CustomerAccount (Lead can belong to an Account in CRM)
  contactId?: string
  contact?: any // CustomerContact (Lead can belong to a Contact in CRM)
  salesCampaignId?: string
  salesCampaign?: any
  tags?: any[]
}
