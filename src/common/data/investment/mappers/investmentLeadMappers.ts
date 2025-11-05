// Investment Lead Mappers - Transform base types to enhanced types with computed fields

import { InvestmentLead } from '../types'
import type { Address, CommunicationChannel } from '@/common/data/common/types/commonTypes'

/**
 * Transform InvestmentLead (GraphQL response) to InvestmentLead (enhanced with computed fields)
 */
export function toInvestmentLead(base: InvestmentLead): InvestmentLead {
  // Create computed display name
  const displayName =
    base.firstName && base.lastName
      ? `${base.firstName} ${base.lastName}`
      : base.investmentName || base.companyName || base.code || `Lead ${base.id}`

  // Build computed address object from scalar fields
  const address: Address | undefined =
    base.addressLine || base.postalCode || base.locality || base.country || base.region
      ? {
          id: base.id, // Use lead ID as address ID
          addressType: 'PRIMARY',
          addressLine: base.addressLine,
          locality: base.locality,
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
    displayName,
    address,
    communicationChannels
  }
}
