/**
 * Lead Data Transformers
 * Build InvestmentAccount and InvestmentContact objects from Lead data
 *
 * Leads store account and contact information directly (not as references)
 * to avoid generating unnecessary data before conversion.
 */

import type { InvestmentAccount } from '@/common/data/investment/types/investmentAccountTypes'
import type { InvestmentContact } from '@/common/data/investment/types/investmentContactTypes'
import type { InvestmentLead } from '@/common/data/investment/types/investmentLeadTypes'
import type { Investment } from '@/common/data/investment/types/investmentTypes'
import {
  type Address,
  type CommunicationChannel,
  CommunicationChannelCode,
  CommunicationChannelType
} from '@/common/data/common/types/commonTypes'

/**
 * Build InvestmentAccount from Lead data
 */
export function buildInvestmentAccountFromLead(lead: InvestmentLead | any): InvestmentAccount | null {
  if (!lead) return null

  // Build addresses array from lead addresses or direct fields
  const addresses: Address[] | undefined =
    lead.addresses?.length > 0
      ? lead.addresses.map((addr: any) => ({
          ...addr,
          locality: addr.locality || addr.city, // Support both CRM (city) and IRM (locality)
          addressType: addr.addressType || 'PRIMARY_ADDRESS'
        }))
      : lead.postalCode || lead.locality || lead.city || lead.countryRef || lead.regionRef
        ? [
            {
              addressLine:
                lead.addressLine || (typeof lead.addressLine === 'object' ? lead.addressLine.lines?.join(', ') : ''),
              postalCode: lead.postalCode || '',
              locality: lead.locality || lead.city || '',
              country: typeof lead.country === 'string' ? lead.country : lead.country?.value || lead.country,
              region: typeof lead.region === 'string' ? lead.region : lead.region?.value || lead.region,
              addressType: 'PRIMARY_ADDRESS'
            }
          ]
        : undefined

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
    // IRM field names already match Account standard
    industryClass: lead.industryClass,
    industryClassRef: lead.industryClassRef,
    companySize: lead.companySize,
    companySizeRef: lead.companySizeRef,
    accountAnnualRevenueBand: lead.accountAnnualRevenueBand,
    accountAnnualRevenueBandRef: lead.accountAnnualRevenueBandRef,
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
  } as InvestmentAccount
}

/**
 * Build InvestmentContact from Lead data
 */
export function buildInvestmentContactFromLead(lead: InvestmentLead | any): InvestmentContact | null {
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

  if (lead.secondaryNumber) {
    communicationChannels.push({
      value: lead.secondaryNumber,
      communicationChannel: {
        code: CommunicationChannelCode.MOBILE,
        type: CommunicationChannelType.TEL
      }
    } as CommunicationChannel)
  }

  if (lead.linkedinUrl) {
    communicationChannels.push({
      value: lead.linkedinUrl,
      communicationChannel: {
        code: CommunicationChannelCode.LINKEDIN,
        type: CommunicationChannelType.URL
      }
    } as CommunicationChannel)
  }

  return {
    id: lead.id || `lead-contact-${Date.now()}`, // Temporary ID for lead contacts
    firstName: lead.firstName || '',
    lastName: lead.lastName || '',
    // IRM field names already match Contact standard
    jobPosition: lead.jobPosition,
    type: lead.type,
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
  } as InvestmentContact
}

/**
 * Build Investment from Lead data
 */
export function buildInvestmentFromLead(lead: InvestmentLead | any): Investment | null {
  if (!lead) return null

  return {
    id: lead.id || `lead-investment-${Date.now()}`, // Temporary ID for lead investments
    name: lead.investmentName || lead.companyName || '',
    code: lead.code,

    // Investment catalog fields
    investmentGroup: lead.investmentGroup,
    investmentGroupRef: lead.investmentGroupRef,
    investmentType: lead.investmentType,
    investmentTypeRef: lead.investmentTypeRef,
    investmentStakeType: lead.investmentStakeType,
    investmentStakeTypeRef: lead.investmentStakeTypeRef,
    investmentRole: lead.investmentRole,
    investmentRoleRef: lead.investmentRoleRef,

    // Financial fields
    initialInvestmentAmount: lead.initialInvestmentAmount,
    forecastedProfitAmount: lead.forecastedProfitAmount,
    requiredCapitalAmount: lead.requiredCapitalAmount,
    marketValue: lead.marketValue,
    loanAmount: lead.loanAmount,
    loanInterestRate: lead.loanInterestRate,
    stakePercentage: lead.stakePercentage,

    // Real Estate specific fields
    annualNetColdRent: lead.annualNetColdRent,
    buildingYear: lead.buildingYear,
    size: lead.size,
    sizeMeasurementUnit: lead.sizeMeasurementUnit,
    sizeMeasurementUnitRef: lead.sizeMeasurementUnitRef,

    // Entity references
    ownerEmployee: lead.ownerEmployee,
    ownerEmployeeId: lead.ownerEmployeeId,
    currency: lead.currency,
    currencyRef: lead.currencyRef,

    // Base entity fields
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    createdBy: lead.createdBy,
    updatedBy: lead.updatedBy,
    isDeleted: lead.isDeleted || false,
    version: lead.version,

    // Computed fields for Investment interface
    displayName: lead.investmentName || lead.companyName || 'Unnamed Investment'
  } as Investment
}
