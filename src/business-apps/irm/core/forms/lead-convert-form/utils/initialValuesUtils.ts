import type { InvestmentAccount } from '@/common/data/investment/types/investmentAccountTypes'
import type { InvestmentContact } from '@/common/data/investment/types/investmentContactTypes'
import type { InvestmentOpportunity } from '@/common/data/investment/types/investmentOpportunityTypes'
import {
  mapLeadAddresses,
  mapLeadCommunicationChannels
} from '@/common/components/common-relations/form-layouts/lead-convert-layout/utils'

export const getAccountInitialValues = (leadData: any): Partial<InvestmentAccount> => {
  if (!leadData) return {}

  const addressData = mapLeadAddresses(leadData)
  const communicationData = mapLeadCommunicationChannels(leadData, 'companyEmail', 'companyPhone')

  // Convert flat address fields to addresses array format for Account
  const addresses: Partial<InvestmentAccount>['addresses'] =
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

export const getContactInitialValues = (leadData: any): Partial<InvestmentContact> => {
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
    jobPosition: leadData.jobPosition || '',
    academicTitleRef: leadData.academicTitleRef || '',
    description: leadData.description || '',
    ownerEmployeeId: leadData.ownerEmployeeId || '',
    communicationChannels: communicationChannels.length > 0 ? communicationChannels : undefined
  }
}

export const getOpportunityInitialValues = (leadData: any): Partial<InvestmentOpportunity> => {
  if (!leadData) return {}

  return {
    name: leadData.investmentName || leadData.companyName || '',
    investmentName: leadData.investmentName || '',
    dealType: 'INVESTMENT_DEAL',
    code: leadData.code || '',
    estimatedAmount: leadData.initialInvestmentAmount || undefined,
    forecastedProfitAmount: leadData.forecastedProfitAmount || undefined,
    initialInvestmentAmount: leadData.initialInvestmentAmount || undefined,
    stakePercentage: leadData.stakePercentage || undefined,
    loanAmount: leadData.loanAmount || undefined,
    loanInterestRate: leadData.loanInterestRate || undefined,
    marketValue: leadData.marketValue || undefined,
    requiredCapitalAmount: leadData.requiredCapitalAmount || undefined,
    annualNetColdRent: leadData.annualNetColdRent || undefined,
    buildingYear: leadData.buildingYear || undefined,
    size: leadData.size || undefined,
    sizeMeasurementUnitRef: leadData.sizeMeasurementUnitRef || '',
    investmentGroupRef: leadData.investmentGroupRef || '',
    investmentRoleRef: leadData.investmentRoleRef || '',
    investmentStakeTypeRef: leadData.investmentStakeTypeRef || '',
    investmentTypeRef: leadData.investmentTypeRef || '',
    ownerEmployeeId: leadData.ownerEmployeeId || '',
    notesSummary: leadData.description || '',
    description: leadData.description || '',
    // If lead was already converted, use the converted account
    accountId: leadData.convertedAccountId || undefined
  }
}
