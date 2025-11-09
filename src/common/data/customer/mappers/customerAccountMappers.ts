/**
 * Customer Account Mappers
 * Transform raw GraphQL responses to CustomerAccount
 */

import type { CustomerAccount } from '../types/customerAccountTypes'
import type { Address } from '@/common/data/common/types/commonTypes'

/**
 * Transform raw GraphQL response to CustomerAccount
 *
 * NOTE: This mapper handles CRM-specific field naming inconsistencies:
 * - industry → industryClass
 * - numberOfEmployees → companySize
 * - annualRevenue → accountAnnualRevenueBand
 * - city → locality (in addresses)
 * - salesCampaign → customerCampaign
 * - pictureUrl → picture
 * - pictureThumbnailUrl → pictureThumbnail
 * - contact → contacts (singular to plural, if needed)
 * - opportunity → opportunities (singular to plural)
 * - lead → leads (singular to plural)
 */
export function toCustomerAccount(raw: any): CustomerAccount {
  // Map CRM catalog field names to Account standard (IRM naming)
  const industryClass = raw.industry
  const industryClassRef = raw.industryRef

  const companySize = raw.numberOfEmployees
  const companySizeRef = raw.numberOfEmployeesRef

  const accountAnnualRevenueBand = raw.annualRevenue
  const accountAnnualRevenueBandRef = raw.annualRevenueRef

  // Map CRM picture fields
  const picture = raw.pictureUrl
  const pictureThumbnail = raw.pictureThumbnailUrl

  // Map addresses with city → locality transformation
  const addresses: Address[] | undefined = raw.addresses?.map((addr: any) => ({
    ...addr,
    locality: addr.city // CRM uses 'city', Account uses 'locality'
  }))

  // Map CRM sales campaign to common naming
  const customerCampaign = raw.salesCampaign
  const customerCampaignId = raw.salesCampaignId

  // Map singular/plural GraphQL field names to plural for common naming
  const accountContacts = raw.accountContacts
  const contacts = raw.contact ? (Array.isArray(raw.contact) ? raw.contact : [raw.contact]) : raw.contacts
  const opportunities = raw.opportunity
  const leads = raw.lead

  return {
    ...raw,
    // Map CRM catalog fields to Account standard
    industryClass,
    industryClassRef,
    companySize,
    companySizeRef,
    accountAnnualRevenueBand,
    accountAnnualRevenueBandRef,
    picture,
    pictureThumbnail,
    addresses,
    // Map CRM-specific fields to common naming
    customerCampaign,
    customerCampaignId,
    accountContacts,
    contacts,
    opportunities,
    leads
  } as CustomerAccount
}
