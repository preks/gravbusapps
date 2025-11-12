/**
 * Lead Data Transformers
 * Build CustomerAccount and CustomerContact objects from Lead data
 *
 * Leads store account and contact information directly (not as references)
 * to avoid generating unnecessary data before conversion.
 */

import type { CustomerAccount, CustomerContact, CustomerLead } from '@/common/data/customer/types'
import {
  type Address,
  type CommunicationChannel,
  CommunicationChannelCode,
  CommunicationChannelType
} from '@/common/data/common/types/commonTypes'

/**
 * Build CustomerAccount from Lead data
 */
export function buildCustomerAccountFromLead(lead: CustomerLead | any): CustomerAccount | null {
  if (!lead) return null

  // Build addresses array from lead addresses or direct fields
  let addresses: Address[] | undefined
  if (lead.addresses?.length > 0) {
    addresses = lead.addresses.map((addr: any) => ({
      ...addr,
      locality: addr.locality || addr.city, // Support both CRM (city) and IRM (locality)
      addressType: addr.addressType || 'PRIMARY_ADDRESS'
    }))
  } else if (lead.postalCode || lead.locality || lead.city || lead.countryRef || lead.regionRef) {
    addresses = [
      {
        id: lead.addressId || `lead-address-${Date.now()}`,
        addressLine:
          lead.addressLine || (typeof lead.addressLine === 'object' ? lead.addressLine.lines?.join(', ') : ''),
        postalCode: lead.postalCode || '',
        locality: lead.locality || lead.city || '',
        country: typeof lead.country === 'string' ? lead.country : lead.country?.value || lead.country,
        region: typeof lead.region === 'string' ? lead.region : lead.region?.value || lead.region,
        addressType: 'PRIMARY_ADDRESS'
      }
    ]
  }

  // Build communication channels from company email/phone
  const communicationChannels: CommunicationChannel[] | undefined = []
  if (lead.companyEmail) {
    communicationChannels.push({
      value: lead.companyEmail,
      communicationChannel: {
        code: CommunicationChannelCode.EMAIL,
        type: CommunicationChannelType.EMAIL
      }
    } as CommunicationChannel)
  }
  if (lead.companyPhone) {
    communicationChannels.push({
      value: lead.companyPhone,
      communicationChannel: {
        code: CommunicationChannelCode.PHONE,
        type: CommunicationChannelType.TEL
      }
    } as CommunicationChannel)
  }

  return {
    id: lead.id || `lead-account-${Date.now()}`, // Temporary ID for lead accounts
    name: lead.companyName || '',
    website: lead.companyWebsite,
    // Map CRM field names to Account standard
    industryClass: lead.industry || lead.industryClass,
    industryClassRef: lead.industryRef || lead.industryClassRef,
    companySize: lead.numberOfEmployees || lead.companySize,
    companySizeRef: lead.numberOfEmployeesRef || lead.companySizeRef,
    accountAnnualRevenueBand: lead.annualRevenue || lead.accountAnnualRevenueBand,
    accountAnnualRevenueBandRef: lead.annualRevenueRef || lead.accountAnnualRevenueBandRef,
    legalForm: lead.legalForm,
    legalFormRef: lead.legalFormRef,
    addresses,
    communicationChannels: communicationChannels.length > 0 ? communicationChannels : undefined,
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

  // Build addresses array from lead addresses
  const addresses: Address[] | undefined =
    lead.addresses?.length > 0
      ? lead.addresses.map((addr: any) => ({
          ...addr,
          locality: addr.locality || addr.city, // Support both CRM (city) and IRM (locality)
          addressType: addr.addressType || 'PRIMARY_ADDRESS'
        }))
      : undefined

  // Build communication channels from email/phone
  const communicationChannels: CommunicationChannel[] | undefined = []
  if (lead.email) {
    communicationChannels.push({
      value: lead.email,
      communicationChannel: {
        code: CommunicationChannelCode.EMAIL,
        type: CommunicationChannelType.EMAIL
      }
    } as CommunicationChannel)
  }
  if (lead.phoneNumber) {
    communicationChannels.push({
      value: lead.phoneNumber,
      communicationChannel: {
        code: CommunicationChannelCode.PHONE,
        type: CommunicationChannelType.TEL
      }
    } as CommunicationChannel)
  }

  return {
    id: lead.id || `lead-contact-${Date.now()}`, // Temporary ID for lead contacts
    firstName: lead.firstName || '',
    lastName: lead.lastName || '',
    // Map CRM field names to Contact standard
    jobPosition: lead.position || lead.jobTitle || lead.jobPosition,
    type: lead.contactType,
    academicTitle: lead.academicTitle,
    academicTitleRef: lead.academicTitleRef,
    salutation: lead.salutation,
    salutationRef: lead.salutationRef,
    language: lead.language,
    languageRef: lead.languageRef,
    addresses,
    communicationChannels: communicationChannels.length > 0 ? communicationChannels : undefined,
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
