/**
 * Lead Data Transformers
 * Build CustomerAccount and CustomerContact objects from Lead data
 *
 * Leads store account and contact information directly (not as references)
 * to avoid generating unnecessary data before conversion.
 */

import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import type { CustomerContact } from '@/common/data/customer/types/customerContactTypes'
import type { CustomerLead } from '@/common/data/customer/types/customerLeadTypes'
import {
  type Address,
  type CommunicationChannel,
  CommunicationChannelCode,
  CommunicationChannelType
} from '@/common/data/common/types/commonTypes'

// Helper functions to reduce cognitive complexity
const buildAddressesFromLead = (lead: any): Address[] | undefined => {
  if (lead.addresses?.length > 0) {
    return lead.addresses.map((addr: any) => ({
      ...addr,
      locality: addr.locality || addr.city,
      addressType: addr.addressType || 'PRIMARY_ADDRESS'
    }))
  }

  if (lead.postalCode || lead.locality || lead.city || lead.countryRef || lead.regionRef) {
    return [
      {
        id: lead.addressId || `lead-address-${Date.now()}`,
        addressLine:
          typeof lead.addressLine === 'string' ? lead.addressLine : (lead.addressLine?.lines?.join(', ') ?? ''),
        postalCode: lead.postalCode || '',
        locality: lead.locality || lead.city || '',
        country: typeof lead.country === 'string' ? lead.country : lead.country?.value || lead.country,
        region: typeof lead.region === 'string' ? lead.region : lead.region?.value || lead.region,
        addressType: 'PRIMARY_ADDRESS'
      }
    ]
  }

  return undefined
}

const buildCommunicationChannelsFromLead = (
  lead: any,
  emailField: string,
  phoneField: string
): CommunicationChannel[] | undefined => {
  const channels: CommunicationChannel[] = []

  if (lead[emailField]) {
    channels.push({
      value: lead[emailField],
      communicationChannel: {
        code: CommunicationChannelCode.EMAIL,
        type: CommunicationChannelType.EMAIL
      }
    } as CommunicationChannel)
  }

  if (lead[phoneField]) {
    channels.push({
      value: lead[phoneField],
      communicationChannel: {
        code: CommunicationChannelCode.PHONE,
        type: CommunicationChannelType.TEL
      }
    } as CommunicationChannel)
  }

  if (lead.secondaryNumber) {
    channels.push({
      value: lead.secondaryNumber,
      communicationChannel: {
        code: CommunicationChannelCode.MOBILE,
        type: CommunicationChannelType.TEL
      }
    } as CommunicationChannel)
  }

  if (lead.linkedinUrl) {
    channels.push({
      value: lead.linkedinUrl,
      communicationChannel: {
        code: CommunicationChannelCode.LINKEDIN,
        type: CommunicationChannelType.URL
      }
    } as CommunicationChannel)
  }

  return channels.length > 0 ? channels : undefined
}

/**
 * Build CustomerAccount from Lead data
 */
export function buildCustomerAccountFromLead(lead: CustomerLead | any): CustomerAccount | null {
  if (!lead) return null

  const addresses = buildAddressesFromLead(lead)
  const communicationChannels = buildCommunicationChannelsFromLead(lead, 'companyEmail', 'companyPhone')

  return {
    id: lead.id || `lead-account-${Date.now()}`,
    name: lead.companyName || '',
    website: lead.companyWebsite,
    industryClass: lead.industry || lead.industryClass,
    industryClassRef: lead.industryRef || lead.industryClassRef,
    companySize: lead.numberOfEmployees || lead.companySize,
    companySizeRef: lead.numberOfEmployeesRef || lead.companySizeRef,
    accountAnnualRevenueBand: lead.annualRevenue || lead.accountAnnualRevenueBand,
    accountAnnualRevenueBandRef: lead.annualRevenueRef || lead.accountAnnualRevenueBandRef,
    legalForm: lead.legalForm,
    legalFormRef: lead.legalFormRef,
    addresses,
    communicationChannels,
    ownerEmployee: lead.ownerEmployee,
    ownerEmployeeId: lead.ownerEmployeeId,
    // Base entity fields
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    createdBy: lead.createdBy,
    updatedBy: lead.updatedBy,
    isDeleted: lead.isDeleted || false,
    version: lead.version,
    code: lead.code
  } as CustomerAccount
}

/**
 * Build CustomerContact from Lead data
 */
export function buildCustomerContactFromLead(lead: CustomerLead | any): CustomerContact | null {
  if (!lead) return null

  const addresses = buildAddressesFromLead(lead)
  const communicationChannels = buildCommunicationChannelsFromLead(lead, 'email', 'phoneNumber')

  return {
    id: lead.id || `lead-contact-${Date.now()}`, // Temporary ID for lead contacts
    firstName: lead.firstName || '',
    lastName: lead.lastName || '',
    // Map CRM field names to Contact standard
    jobPosition: lead.position || lead.jobTitle || lead.jobPosition,
    academicTitle: lead.academicTitle,
    academicTitleRef: lead.academicTitleRef,
    salutation: lead.salutation,
    salutationRef: lead.salutationRef,
    language: lead.language,
    languageRef: lead.languageRef,
    addresses,
    communicationChannels,
    ownerEmployee: lead.ownerEmployee,
    ownerEmployeeId: lead.ownerEmployeeId,
    // Base entity fields
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    createdBy: lead.createdBy,
    updatedBy: lead.updatedBy,
    isDeleted: lead.isDeleted || false,
    version: lead.version,
    code: lead.code
  } as CustomerContact
}
