import type { Lead } from '@/common/data/relations/types/leadTypes'
import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import type { InvestmentAccount } from '@/common/data/investment/types/investmentAccountTypes'
import type { CustomerContact } from '@/common/data/customer/types/customerContactTypes'
import type { InvestmentContact } from '@/common/data/investment/types/investmentContactTypes'
import type { InvestmentOpportunity } from '@/common/data/investment/types/investmentOpportunityTypes'
import { opportunitySchema } from '@/common/components/common-relations/form-layouts/opportunity-layout'
import { z } from 'zod'
import { mapLeadAddresses, mapLeadCommunicationChannels } from './index'

/**
 * Map Lead data to Account initial values
 * Works for both CustomerAccount and InvestmentAccount
 */
export function mapLeadToAccount<T extends CustomerAccount | InvestmentAccount>(
  leadData: Lead | Record<string, unknown>
): Partial<T> {
  if (!leadData) return {}

  const addressData = mapLeadAddresses(leadData)
  const communicationData = mapLeadCommunicationChannels(leadData, 'companyEmail', 'companyPhone')

  // Convert flat address fields to addresses array format for Account
  const addresses: Partial<T>['addresses'] =
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
          } as Partial<T>['addresses'] extends (infer U)[] ? U : never
        ]
      : undefined

  // Convert flat communication fields to communicationChannels array format for Account
  const communicationChannels: Array<{
    communicationChannelRef: string
    value: string
    valueExtension: string | null
  }> = []
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
  } as Partial<T>
}

/**
 * Map Lead data to Contact initial values
 * Works for both CustomerContact and InvestmentContact
 */
export function mapLeadToContact<T extends CustomerContact | InvestmentContact>(
  leadData: Lead | Record<string, unknown>
): Partial<T> {
  if (!leadData) return {}

  const communicationData = mapLeadCommunicationChannels(leadData, 'email', 'phoneNumber')

  // Convert flat communication fields to communicationChannels array format for Contact
  const communicationChannels: Array<{
    communicationChannelRef: string
    value: string
    valueExtension: string | null
  }> = []
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
    salutationRef: leadData.salutationRef || '',
    description: leadData.description || '',
    ownerEmployeeId: leadData.ownerEmployeeId || '',
    communicationChannels: communicationChannels.length > 0 ? communicationChannels : undefined
  } as Partial<T>
}

/**
 * Map Lead data to Customer Opportunity initial values
 */
export function mapLeadToCustomerOpportunity(
  leadData: Lead | Record<string, unknown>
): Partial<z.infer<typeof opportunitySchema>> {
  if (!leadData) return {}

  return {
    name: leadData.companyName || '',
    estimatedAmount: leadData.initialInvestmentAmount ? String(leadData.initialInvestmentAmount) : undefined,
    ownerEmployeeId: leadData.ownerEmployeeId || '',
    notesSummary: leadData.description || '',
    accountId: leadData.convertedAccountId || undefined
  }
}

/**
 * Map Lead data to Investment Opportunity initial values
 */
export function mapLeadToInvestmentOpportunity(
  leadData: Lead | Record<string, unknown>
): Partial<InvestmentOpportunity> {
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
    accountId: leadData.convertedAccountId || undefined
  }
}
