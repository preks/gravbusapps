import type { Lead } from '@/common/data/relations/types/leadTypes'
import type { Account } from '@/common/data/relations/types/accountTypes'
import type { Contact } from '@/common/data/relations/types/contactTypes'
import type { Address, CommunicationChannel } from '@/common/data/common/types/commonTypes'
import { CommunicationChannelCode } from '@/common/data/common/types/commonTypes'
import { COMMUNICATION_CHANNEL } from '@/common/constants/commonCatalogs'
import { opportunitySchema } from '@/common/components/common-relations/form-layouts/opportunity-layout'
import { z } from 'zod'
import { mapLeadAddresses, mapLeadCommunicationChannels } from './index'

/**
 * Map Lead data to Account initial values (common fields only)
 * CRM/IRM-specific fields should be added in the respective forms
 */
export function mapLeadToAccount(leadData: Lead | Record<string, unknown> | null): Partial<Account> {
  if (!leadData) return {}

  const addressData = mapLeadAddresses(leadData)
  const communicationData = mapLeadCommunicationChannels(leadData, 'companyEmail', 'companyPhone')

  // Convert flat address fields to addresses array format for Account
  const addresses: Partial<Address>[] | undefined =
    addressData.addressLines.length > 0 ||
    addressData.postalCode ||
    addressData.locality ||
    addressData.regionRef ||
    addressData.countryRef
      ? [
          {
            addressType: 'PRIMARY_ADDRESS',
            addressLine: addressData.addressLines.length > 0 ? { lines: addressData.addressLines } : undefined,
            postalCode: addressData.postalCode || undefined,
            locality: addressData.locality || undefined,
            regionRef: addressData.regionRef || undefined,
            countryRef: addressData.countryRef || undefined
          }
        ]
      : undefined

  // Convert flat communication fields to communicationChannels array format for Account
  const communicationChannels: Partial<CommunicationChannel>[] = []
  if (communicationData.email) {
    communicationChannels.push({
      communicationChannelRef: `${COMMUNICATION_CHANNEL}:${CommunicationChannelCode.EMAIL}`,
      value: communicationData.email,
      valueExtension: undefined
    })
  }
  if (communicationData.phoneNumber) {
    communicationChannels.push({
      communicationChannelRef: `${COMMUNICATION_CHANNEL}:${CommunicationChannelCode.PHONE}`,
      value: communicationData.phoneNumber,
      valueExtension: undefined
    })
  }

  return {
    name: (leadData.companyName as string) || '',
    code: (leadData.code as string) || '',
    ownerEmployeeId: (leadData.ownerEmployeeId as string) || '',
    website: (leadData.companyWebsite as string) || '',
    legalFormRef: (leadData.legalFormRef as string) || '',
    industryClassRef: (leadData.industryClassRef as string) || '',
    companySizeRef: (leadData.companySizeRef as string) || '',
    accountAnnualRevenueBandRef: (leadData.accountAnnualRevenueBandRef as string) || '',
    notesSummary: (leadData.description as string) || '',
    addresses: addresses as Address[] | undefined,
    communicationChannels: communicationChannels.length > 0 ? (communicationChannels as CommunicationChannel[]) : []
  }
}

/**
 * Map Lead data to Contact initial values (common fields only)
 * CRM/IRM-specific fields should be added in the respective forms
 */
export function mapLeadToContact(leadData: Lead | Record<string, unknown> | null): Partial<Contact> {
  if (!leadData) return {}

  const communicationData = mapLeadCommunicationChannels(leadData, 'email', 'phoneNumber')

  // Convert flat communication fields to communicationChannels array format for Contact
  const communicationChannels: Partial<CommunicationChannel>[] = []
  if (communicationData.email) {
    communicationChannels.push({
      communicationChannelRef: `${COMMUNICATION_CHANNEL}:${CommunicationChannelCode.EMAIL}`,
      value: communicationData.email,
      valueExtension: undefined
    })
  }
  if (communicationData.phoneNumber) {
    communicationChannels.push({
      communicationChannelRef: `${COMMUNICATION_CHANNEL}:${CommunicationChannelCode.PHONE}`,
      value: communicationData.phoneNumber,
      valueExtension: undefined
    })
  }

  return {
    firstName: (leadData.firstName as string) || '',
    lastName: (leadData.lastName as string) || '',
    code: (leadData.code as string) || '',
    jobPosition: (leadData.jobPosition as string) || '',
    academicTitleRef: (leadData.academicTitleRef as string) || '',
    salutationRef: (leadData.salutationRef as string) || '',
    description: (leadData.description as string) || '',
    ownerEmployeeId: (leadData.ownerEmployeeId as string) || '',
    communicationChannels: communicationChannels.length > 0 ? (communicationChannels as CommunicationChannel[]) : []
  }
}

/**
 * Map Lead data to Opportunity initial values (common fields only)
 * CRM/IRM-specific fields should be added in the respective forms
 */
export function mapLeadToOpportunity(
  leadData: Lead | Record<string, unknown> | null
): Partial<z.infer<typeof opportunitySchema>> {
  if (!leadData) return {}

  return {
    name: (leadData.companyName as string) || '',
    estimatedAmount: (leadData as any).initialInvestmentAmount
      ? String((leadData as any).initialInvestmentAmount)
      : undefined,
    ownerEmployeeId: (leadData.ownerEmployeeId as string) || '',
    notesSummary: (leadData.description as string) || '',
    accountId: (leadData.convertedAccountId as string) || undefined
  }
}
