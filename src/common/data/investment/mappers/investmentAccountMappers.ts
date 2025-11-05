/**
 * Investment Account Mappers
 * Transform raw GraphQL responses to InvestmentAccount
 */

import type { InvestmentAccount } from '../types/investmentAccountTypes'

/**
 * Transform raw GraphQL response to InvestmentAccount
 *
 * NOTE: IRM field naming already matches CommonAccount standards:
 * - industryClass (IRM) ✓
 * - companySize (IRM) ✓
 * - accountAnnualRevenueBand (IRM) ✓
 * - locality (IRM) ✓
 *
 * This mapper handles array naming transformations:
 * - investment → investments
 * - investmentReport → investmentReports
 * - investmentAccountContact → accountContacts (common naming)
 * - investmentOpportunity → opportunities (common naming)
 * - investmentLead → leads (common naming)
 */
export function toInvestmentAccount(raw: any): InvestmentAccount {
  // Map singular GraphQL field names to plural arrays for consistent usage
  const investments = raw.investment
  const investmentReports = raw.investmentReport

  // Map investmentAccountContact to accountContacts (common naming)
  const accountContacts = raw.investmentAccountContact

  // Map IRM-prefixed relations to common plural naming
  const opportunities = raw.investmentOpportunity
  const leads = raw.investmentLead
  const tasks = raw.investmentTask
  const activities = raw.investmentActivity
  const documents = raw.investmentDocument
  const notes = raw.investmentNote

  return {
    ...raw,
    // Add mapped array fields
    investments,
    investmentReports,
    accountContacts,
    opportunities,
    leads,
    tasks,
    activities,
    documents,
    notes
  } as InvestmentAccount
}
