import { AccountFormValues } from '../../account-form/types'
import { ContactFormValues } from '../../contact-form/types'
import { InvestmentOpportunityFormValues } from '../../opportunity-form/types'
import { extractAddressFromObject } from '../../../../../crm/common/utils/addressUtils'

export const getAccountInitialValues = (leadData: any): Partial<AccountFormValues> => {
  if (!leadData) {
    return {}
  }

  const initialValues = {
    // ===== COMPANY INFORMATION (from InvestmentLead company* fields) =====
    accountName: leadData.companyName || leadData.sourceCompanyName || '',
    website: leadData.companyWebsite || '',
    description: leadData.description || '',

    // ===== CONTACT INFORMATION (from InvestmentLead company* fields) =====
    email: leadData.companyEmail || '',
    phone: leadData.companyPhone || '',

    // ===== CATALOG REFERENCES (from InvestmentLead) =====
    legalForm: leadData.legalFormRef || leadData.legalForm?.id || '',
    industry: leadData.industryClassRef || leadData.industryClass?.id || '',
    numberOfEmployees: leadData.companySizeRef || leadData.companySize?.id || '',
    annualRevenue: leadData.accountAnnualRevenueBandRef || leadData.accountAnnualRevenueBand?.id || '',

    // ===== OWNER INFORMATION (from InvestmentLead) =====
    owner: leadData.ownerEmployeeId || leadData.ownerEmployee?.id || '',

    // ===== GEOGRAPHIC INFORMATION (from InvestmentLead direct fields) =====
    geographicPresence: leadData.locality || leadData.region?.value || '',
    country: leadData.countryRef || leadData.country?.id || '',
    region: leadData.regionRef || leadData.region?.id || '',
    addressLine1: extractAddressFromObject(leadData.addressLine) || '',
    addressLine2: '', // Not available in InvestmentLead
    addressLine3: '', // Not available in InvestmentLead
    addressLine4: '', // Not available in InvestmentLead
    postalCode: leadData.postalCode || '',
    city: leadData.locality || '',
    state: '', // Not available in InvestmentLead
    address: leadData.locality || '', // Legacy field

    // ===== ADDRESS ARRAY (new structure for account form) =====
    addresses: (() => {
      // Only create address if we have meaningful address data
      const hasAddressData =
        leadData.addressLine || leadData.postalCode || leadData.locality || leadData.countryRef || leadData.regionRef

      if (!hasAddressData) {
        // Return default empty address structure without ID (backend will generate UUID)
        return [
          {
            addressType: 'PRIMARY_ADDRESS',
            addressLines: [''],
            postalCode: '',
            locality: '',
            regionRef: '',
            countryRef: ''
          }
        ]
      }

      // Create address with lead data (without ID for new accounts)
      return [
        {
          addressType: 'PRIMARY_ADDRESS',
          addressLines: leadData.addressLine
            ? typeof leadData.addressLine === 'string'
              ? [leadData.addressLine]
              : leadData.addressLine.lines || [leadData.addressLine.toString()]
            : [extractAddressFromObject(leadData.addressLine) || ''],
          postalCode: leadData.postalCode || '',
          locality: leadData.locality || '',
          regionRef: leadData.regionRef || leadData.region?.id || '',
          countryRef: leadData.countryRef || leadData.country?.id || ''
        }
      ]
    })(),

    // ===== ADDITIONAL FIELDS (from InvestmentLead) =====
    foundationDate: '', // Not available in InvestmentLead, user will fill
    tickerSymbol: leadData.code || '', // Use lead code as ticker symbol

    // ===== PARENT ACCOUNT (not available in InvestmentLead) =====
    parentAccount: '',

    // ===== SYSTEM FIELDS =====
    id: undefined, // New account
    version: undefined // New account
  }

  return initialValues
}

export const getContactInitialValues = (leadData: any): Partial<ContactFormValues> => {
  if (!leadData) {
    return {}
  }

  const initialValues = {
    // ===== PERSONAL INFORMATION (from InvestmentLead) =====
    firstName: leadData.firstName || leadData.sourceIndividualName || '', // ✅ Direct mapping
    lastName: leadData.lastName || '', // ✅ Direct mapping
    fullName:
      leadData.firstName && leadData.lastName
        ? `${leadData.firstName} ${leadData.lastName}`
        : leadData.firstName || leadData.lastName || leadData.sourceIndividualName || '',
    email: leadData.email || '', // ✅ Direct mapping

    // ===== PROFESSIONAL INFORMATION (from InvestmentLead) =====
    jobPosition: leadData.position || '', // ✅ position -> jobPosition mapping
    code: leadData.code || '',
    department: '', // Not available in InvestmentLead - user will need to fill

    // ===== CONTACT INFORMATION (from InvestmentLead) =====
    phone: leadData.phoneNumber || '', // ✅ phoneNumber -> phone mapping

    // ===== CATALOG REFERENCES (from InvestmentLead) =====
    academicTitleRef: leadData.academicTitleRef || leadData.academicTitle?.id || '', // ✅ academicTitle{id,value} -> academicTitleRef mapping
    languageRef: '', // Not available in InvestmentLead - user will need to select

    // ===== CONTACT TYPE (default for lead conversion) =====
    type: 'UNKNOWN_CONTACT', // Default contact type for lead conversion

    // ===== SOCIAL MEDIA INFORMATION (extracted from communication channels) =====
    linkedinUrl:
      leadData.communicationChannels?.find(
        (channel: any) => channel.communicationChannelRef === 'CommunicationChannel:v1:LinkedIn'
      )?.value || '',
    xingUrl:
      leadData.communicationChannels?.find(
        (channel: any) => channel.communicationChannelRef === 'CommunicationChannel:v1:Xing'
      )?.value || '',

    // ===== OWNER INFORMATION (from InvestmentLead) =====
    ownerEmployeeId: leadData.ownerEmployeeId || leadData.ownerEmployee?.id || '',
    owner: leadData.ownerEmployeeId || leadData.ownerEmployee?.id || '',

    // ===== ADDITIONAL INFORMATION (from InvestmentLead) =====
    description: leadData.description || '',
    notesSummary: leadData.description || '', // Use lead description as initial notes
    businessKey: leadData.businessKey || leadData.code || '', // Use businessKey first, fallback to code

    // ===== DATE INFORMATION =====
    birthDate: '', // Not available in InvestmentLead - user will need to fill

    // ===== SYSTEM FIELDS =====
    additionalProperties: {},
    id: undefined, // New contact
    version: undefined, // New contact
    createdAt: '', // New contact
    createdBy: '' // New contact
  }

  return initialValues
}

export const getOpportunityInitialValues = (leadData: any): Partial<InvestmentOpportunityFormValues> => {
  if (!leadData) {
    return {}
  }

  const initialValues = {
    // Investment Information (directly from InvestmentLead)
    name: leadData.investmentName || leadData.companyName || '',
    investmentName: leadData.investmentName || '',
    dealType: 'INVESTMENT_DEAL', // Default investment deal type
    code: leadData.code || '',
    businessKey: leadData.businessKey || leadData.code || '',

    // Financial Information (directly from InvestmentLead)
    estimatedAmount: leadData.initialInvestmentAmount?.toString() || '',
    forecastedProfitAmount: leadData.forecastedProfitAmount?.toString() || '',
    initialInvestmentAmount: leadData.initialInvestmentAmount?.toString() || '',
    stakePercentage: leadData.stakePercentage?.toString() || '',
    loanAmount: leadData.loanAmount?.toString() || '',
    loanInterestRate: leadData.loanInterestRate?.toString() || '',
    marketValue: leadData.marketValue?.toString() || '',
    requiredCapitalAmount: leadData.requiredCapitalAmount?.toString() || '',
    annualNetColdRent: leadData.annualNetColdRent?.toString() || '',

    // Catalog references (use both Ref and ID for maximum compatibility)
    investmentGroupRef: leadData.investmentGroupRef || leadData.investmentGroup?.id || '',
    investmentRoleRef: leadData.investmentRoleRef || leadData.investmentRole?.id || '',
    investmentStakeTypeRef: leadData.investmentStakeTypeRef || leadData.investmentStakeType?.id || '',
    investmentTypeRef: leadData.investmentTypeRef || leadData.investmentType?.id || '',

    // Owner information (use ownerEmployeeId for consistency)
    owner: leadData.ownerEmployeeId || leadData.ownerEmployee?.id || '',

    // Additional information
    notesSummary: leadData.description || '',
    description: leadData.description || '',

    // System fields
    sourceApp: 'IRM',
    recordState: 'ACTIVE',
    additionalProperties: {},

    // Fields that need to be filled by user
    currency: '',
    currencyRef: '',
    closeDate: '',
    pipeline: '',
    pipelineStage: '',
    account: '', // Will be filled with created/selected account
    accountId: '' // Will be filled with created/selected account
  }

  return initialValues
}
