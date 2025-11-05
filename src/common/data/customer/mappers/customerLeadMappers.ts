// Customer Lead Mappers - Transform base types to enhanced types with computed fields

import { CustomerLead } from '../types'
import type { Address, CommunicationChannel } from '@/common/data/common/types/commonTypes'

/**
 * Transform CustomerLead (GraphQL response) to CustomerLead (enhanced with computed fields)
 *
 * NOTE: This mapper handles CRM-specific field naming inconsistencies:
 * - industry → industryClass
 * - numberOfEmployees → companySize
 * - annualRevenue → accountAnnualRevenueBand
 * - city → locality
 */
export function toCustomerLead(base: CustomerLead): CustomerLead {
  // Map CRM field names to CommonLead standard (IRM naming)
  // Lead.industry → CommonLead.industryClass
  const industryClass = base.industry

  // Lead.numberOfEmployees → CommonLead.companySize
  const companySize = base.numberOfEmployees

  // Lead.annualRevenue → CommonLead.accountAnnualRevenueBand
  const accountAnnualRevenueBand = base.annualRevenue

  // Lead.city → CommonLead.locality (CRM uses "city")
  const city = (base as any).city
  const locality = city

  // Build computed address object from scalar fields
  const address: Address | undefined =
    base.addressLine || base.postalCode || city || base.country || base.region
      ? {
          id: base.id, // Use lead ID as address ID
          addressType: 'PRIMARY',
          addressLine: base.addressLine,
          locality, // Mapped from city
          postalCode: base.postalCode,
          country: base.country,
          region: base.region
        }
      : undefined

  // Build computed communication channels array from email and phoneNumber
  const communicationChannels: CommunicationChannel[] = []

  if (base.email) {
    communicationChannels.push({
      id: `${base.id}-email`,
      value: base.email,
      communicationChannel: {
        id: 'email',
        code: 'EMAIL',
        type: 'EMAIL',
        value: 'Email'
      }
    } as CommunicationChannel)
  }

  if (base.phoneNumber) {
    communicationChannels.push({
      id: `${base.id}-phone`,
      value: base.phoneNumber,
      communicationChannel: {
        id: 'phone',
        code: 'PHONE',
        type: 'PHONE',
        value: 'Phone'
      }
    } as CommunicationChannel)
  }

  return {
    ...base,
    // Map CRM fields to CommonLead standard
    industryClass,
    companySize,
    accountAnnualRevenueBand,
    locality,
    // Computed fields
    address,
    communicationChannels
  } as any
}
