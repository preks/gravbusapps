import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import type { CustomerContact } from '@/common/data/customer/types/customerContactTypes'
import type { CustomerOpportunity } from '@/common/data/customer/types/customerOpportunityTypes'
import {
  mapLeadAddresses,
  mapLeadCommunicationChannels
} from '@/common/components/common-relations/form-layouts/lead-convert-layout/utils'

// Get initial values for Account form from lead data
export const getAccountInitialValues = (leadData: any): Partial<CustomerAccount> => {
  if (!leadData) return {}

  const addressData = mapLeadAddresses(leadData)
  const communicationData = mapLeadCommunicationChannels(leadData, 'companyEmail', 'companyPhone')

  // Convert flat address fields to addresses array format for Account
  const addresses: Partial<CustomerAccount>['addresses'] =
    addressData.addressLines.length > 0 ||
    addressData.postalCode ||
    addressData.locality ||
    addressData.regionRef ||
    addressData.countryRef
      ? [
          {
            addressType: 'PRIMARY_ADDRESS',
            addressLines: addressData.addressLines.length > 0 ? addressData.addressLines : [''],
            postalCode: addressData.postalCode || '',
            locality: addressData.locality || '',
            regionRef: addressData.regionRef || '',
            countryRef: addressData.countryRef || ''
          } as any
        ]
      : undefined

  // Convert flat communication fields to communicationChannels array format for Account
  const communicationChannels: any[] = []
  if (communicationData.email) {
    communicationChannels.push({
      communicationChannelRef: 'CommunicationChannel:v1:EMAIL',
      value: communicationData.email,
      valueExtension: null
    })
  }
  if (communicationData.phoneNumber) {
    communicationChannels.push({
      communicationChannelRef: 'CommunicationChannel:v1:PHONE',
      value: communicationData.phoneNumber,
      valueExtension: null
    })
  }

  return {
    name: leadData.companyName || '',
    code: leadData.code || '',
    ownerEmployeeId: leadData.ownerEmployeeId || '',
    website: leadData.companyWebsite || '',
    legalFormRef: leadData.legalFormRef || '',
    industryClassRef: leadData.industryClassRef || '',
    companySizeRef: leadData.companySizeRef || '',
    accountAnnualRevenueBandRef: leadData.accountAnnualRevenueBandRef || '',
    notesSummary: leadData.description || '',
    addresses: addresses,
    communicationChannels: communicationChannels.length > 0 ? communicationChannels : undefined
  }
}

// Get initial values for Contact form from lead data
export const getContactInitialValues = (leadData: any): Partial<CustomerContact> => {
  if (!leadData) return {}

  const communicationData = mapLeadCommunicationChannels(leadData, 'email', 'phoneNumber')

  // Convert flat communication fields to communicationChannels array format for Contact
  const communicationChannels: any[] = []
  if (communicationData.email) {
    communicationChannels.push({
      communicationChannelRef: 'CommunicationChannel:v1:EMAIL',
      value: communicationData.email,
      valueExtension: null
    })
  }
  if (communicationData.phoneNumber) {
    communicationChannels.push({
      communicationChannelRef: 'CommunicationChannel:v1:PHONE',
      value: communicationData.phoneNumber,
      valueExtension: null
    })
  }

  return {
    firstName: leadData.firstName || '',
    lastName: leadData.lastName || '',
    code: leadData.code || '',
    jobPosition: leadData.position || '',
    academicTitleRef: leadData.academicTitleRef || '',
    description: leadData.description || '',
    notesSummary: leadData.description || '',
    ownerEmployeeId: leadData.ownerEmployeeId || '',
    communicationChannels: communicationChannels.length > 0 ? communicationChannels : undefined
  }
}

// Get initial values for Opportunity form from lead data
export const getOpportunityInitialValues = (leadData: any): Partial<CustomerOpportunity> => {
  if (!leadData) return {}

  return {
    name: leadData.companyName ? `Opportunity for ${leadData.companyName}` : '',
    ownerEmployeeId: leadData.ownerEmployeeId || '',
    // If lead was already converted, use the converted account
    accountId: leadData.convertedAccountId || undefined
  }
}
