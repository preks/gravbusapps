import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils' // Still used in cancelConversionForm
import { ConvertLeadFormData, ConvertLeadFormDataLegacy } from '../types'
import { AccountFormValues } from '../../account-form/types'
import { ContactFormValues } from '../../contact-form/types'
import { InvestmentOpportunityFormValues } from '../../opportunity-form/types'
import { buildCommunicationChannelRef } from '@/common/data/common/utils/communicationChannelHelpers'
import { CommunicationChannelCode } from '@/common/data/common/types/commonTypes'
import {
  buildInvestmentAccountPayload,
  buildInvestmentContactPayload,
  buildInvestmentOpportunityPayload
} from '@/common/data/investment/payloads'

export const createSubmissionPayload = (
  data: ConvertLeadFormData,
  completeAccountData: Partial<AccountFormValues>,
  completeContactData: Partial<ContactFormValues>,
  completeOpportunityData: Partial<InvestmentOpportunityFormValues>,
  actualLeadId: string
) => {
  // Convert new form data to legacy format for submission - only using fields that exist in schema
  const legacyFormData: ConvertLeadFormDataLegacy = {
    accountOption: data.accountOption,
    selectedAccountId: data.selectedAccountId,
    selectedAccountName: data.selectedAccountName,
    accountData: {
      accountName: data.accountName,
      owner: data.accountOwner,
      legalForm: data.accountLegalForm,
      industry: data.accountIndustry,
      // Use basic fields from schema only
      email: data.accountName, // Will be populated by form wrapper
      phone: '' // Will be populated by form wrapper
    },
    contactOption: data.contactOption,
    selectedContactId: data.selectedContactId,
    selectedContactName: data.selectedContactName,
    contactData: {
      firstName: data.contactFirstName,
      lastName: data.contactLastName,
      email: data.contactEmail,
      ownerEmployeeId: data.contactOwnerEmployeeId
      // Additional fields will be populated by form wrappers
    },
    createOpportunity: data.createOpportunity,
    opportunityData: {
      name: data.opportunityName,
      owner: data.opportunityOwner,
      pipeline: data.opportunityPipeline,
      pipelineStage: data.opportunityPipelineStage,
      estimatedAmount: data.opportunityEstimatedAmount,
      currency: data.opportunityCurrency
      // Additional fields will be populated by form wrappers
    }
  }

  // Build the payload following the Investment API structure and expected schema
  const payload: any = {
    leadId: actualLeadId
  }

  // Handle Account (following CRM pattern: minimal for match, complete for create)
  if (legacyFormData.accountOption === 'match' && legacyFormData.selectedAccountId) {
    // For matching existing account, only send id and ownerEmployee
    payload.account = {
      id: legacyFormData.selectedAccountId,
      ownerEmployee: legacyFormData.accountData.owner || null
    }
  } else if (legacyFormData.accountOption === 'create') {
    // ✅ Build addresses array first (IRM-specific structure)
    const addresses =
      completeAccountData.addresses
        ?.filter(
          addr =>
            // Only include addresses that have some content
            addr.addressLines.some(line => line.trim()) ||
            addr.postalCode.trim() ||
            addr.locality.trim() ||
            addr.regionRef.trim() ||
            addr.countryRef.trim()
        )
        .map(addr => ({
          addressType: 'PRIMARY_ADDRESS',
          addressLine:
            addr.addressLines.filter(line => line.trim()).length > 0
              ? { lines: addr.addressLines.filter(line => line.trim()) }
              : null,
          postalCode: addr.postalCode.trim() || null,
          locality: addr.locality.trim() || null,
          regionRef: addr.regionRef.trim() || null,
          countryRef: addr.countryRef.trim() || null
        })) || []

    // ✅ Use centralized payload builder - pass ALL available fields
    const { investmentAccount } = buildInvestmentAccountPayload({
      // Basic Information
      accountName: completeAccountData.accountName || legacyFormData.accountData.accountName,
      code: completeAccountData.tickerSymbol,

      // Company Information
      legalForm: completeAccountData.legalForm,
      industry: completeAccountData.industry,
      website: completeAccountData.website,
      mission: completeAccountData.description, // maps to mission field
      geographicPresence: completeAccountData.geographicPresence,

      // Contact Information
      email: completeAccountData.email,
      phone: completeAccountData.phone,

      // Financial Information
      annualRevenue: completeAccountData.annualRevenue,
      companySize: completeAccountData.numberOfEmployees, // maps to companySizeRef
      foundationDate: completeAccountData.foundationDate,

      // Relationships
      owner: completeAccountData.owner,
      parentAccount: completeAccountData.parentAccount,

      // Complex fields
      addresses: addresses.length > 0 ? addresses : undefined,
      accountContacts: completeAccountData.contactIds, // Contact associations

      // System fields
      id: completeAccountData.id,
      version: completeAccountData.version
    })

    payload.account = investmentAccount
  }

  // Handle Contact (following CRM pattern: minimal for match, complete for create)
  if (legacyFormData.contactOption === 'match' && legacyFormData.selectedContactId) {
    // For matching existing contact, only send id
    payload.contact = {
      id: legacyFormData.selectedContactId
    }
  } else if (legacyFormData.contactOption === 'create') {
    // ✅ Build communication channels first (LinkedIn and Xing)
    const communicationChannels = []

    if (completeContactData.linkedinUrl && completeContactData.linkedinUrl.trim()) {
      communicationChannels.push({
        communicationChannelRef: buildCommunicationChannelRef(CommunicationChannelCode.LINKEDIN),
        value: completeContactData.linkedinUrl.trim(),
        valueExtension: null,
        source: 'FORM_INPUT',
        activeFrom: new Date().toISOString(),
        activeTo: null
      })
    }

    if (completeContactData.xingUrl && completeContactData.xingUrl.trim()) {
      communicationChannels.push({
        communicationChannelRef: buildCommunicationChannelRef(CommunicationChannelCode.XING),
        value: completeContactData.xingUrl.trim(),
        valueExtension: null,
        source: 'FORM_INPUT',
        activeFrom: new Date().toISOString(),
        activeTo: null
      })
    }

    // ✅ Use centralized payload builder - pass ALL available fields
    const { investmentContact } = buildInvestmentContactPayload({
      // Personal Information
      firstName: completeContactData.firstName || legacyFormData.contactData.firstName,
      lastName: completeContactData.lastName || legacyFormData.contactData.lastName,
      fullName:
        completeContactData.fullName ||
        `${legacyFormData.contactData.firstName || ''} ${legacyFormData.contactData.lastName || ''}`.trim(),
      type: completeContactData.type || 'UNKNOWN_CONTACT',
      birthDate: completeContactData.birthDate,

      // Professional Information
      jobPosition: completeContactData.jobPosition,
      department: completeContactData.department,

      // Contact Information
      email: completeContactData.email || legacyFormData.contactData.email,
      phone: completeContactData.phone,

      // Titles
      academicTitle: completeContactData.academicTitleRef,
      language: completeContactData.languageRef,

      // Relationships
      owner:
        completeContactData.owner || completeContactData.ownerEmployeeId || legacyFormData.contactData.ownerEmployeeId,
      accountIds: completeContactData.accountIds, // Account associations

      // Additional Information
      notesSummary: completeContactData.notesSummary,
      businessKey: completeContactData.businessKey,
      code: completeContactData.code,

      // IRM-specific fields
      sensitive: completeContactData.sensitive,
      additionalProperties: completeContactData.additionalProperties,

      // Complex fields
      communicationChannels: communicationChannels.length > 0 ? communicationChannels : undefined,

      // System fields
      id: completeContactData.id,
      version: completeContactData.version
    })

    payload.contact = investmentContact
  }

  // Handle Opportunity (using exact fields from current OpportunityFormComponent)
  if (legacyFormData.createOpportunity) {
    // ✅ Use centralized payload builder - pass ALL available fields
    const { investmentOpportunity } = buildInvestmentOpportunityPayload({
      // Basic Information
      name: completeOpportunityData.name || legacyFormData.opportunityData.name,
      investmentName:
        completeOpportunityData.investmentName || completeOpportunityData.name || legacyFormData.opportunityData.name,
      code: completeOpportunityData.code,
      businessKey: completeOpportunityData.businessKey,
      dealType: completeOpportunityData.dealType || 'INVESTMENT_DEAL',

      // Financial Information
      estimatedAmount: completeOpportunityData.estimatedAmount || legacyFormData.opportunityData.estimatedAmount,
      currency:
        completeOpportunityData.currencyRef ||
        completeOpportunityData.currency ||
        legacyFormData.opportunityData.currency,
      closeDate: completeOpportunityData.closeDate,

      // Pipeline Information
      pipeline: completeOpportunityData.pipeline || legacyFormData.opportunityData.pipeline,
      pipelineStage: completeOpportunityData.pipelineStage || legacyFormData.opportunityData.pipelineStage,
      opportunityStatus: 'InvestmentOpportunityStatus:v1:OPEN', // Always OPEN for new opportunities

      // Investment-specific financial fields
      initialInvestmentAmount: completeOpportunityData.initialInvestmentAmount,
      forecastedProfitAmount: completeOpportunityData.forecastedProfitAmount,
      loanAmount: completeOpportunityData.loanAmount,
      loanInterestRate: completeOpportunityData.loanInterestRate,
      marketValue: completeOpportunityData.marketValue,
      requiredCapitalAmount: completeOpportunityData.requiredCapitalAmount,
      stakePercentage: completeOpportunityData.stakePercentage,
      annualNetColdRent: completeOpportunityData.annualNetColdRent,

      // Investment classification
      investmentGroupRef: completeOpportunityData.investmentGroupRef,
      investmentTypeRef: completeOpportunityData.investmentTypeRef,
      investmentRoleRef: completeOpportunityData.investmentRoleRef,
      investmentStakeTypeRef: completeOpportunityData.investmentStakeTypeRef,

      // Real estate specific fields
      buildingYear: completeOpportunityData.buildingYear,
      size: completeOpportunityData.size,
      measurementUnit: completeOpportunityData.measurementUnit, // maps to sizeMeasurementUnitRef

      // Relationships
      owner: completeOpportunityData.owner || legacyFormData.opportunityData.owner,
      ownerOrganizationId: completeOpportunityData.ownerOrganizationId,
      accountId:
        legacyFormData.selectedAccountId ||
        completeOpportunityData.accountId ||
        (typeof completeOpportunityData.account === 'object' && completeOpportunityData.account?.id
          ? completeOpportunityData.account.id
          : completeOpportunityData.account),
      contactIds: completeOpportunityData.contactIds, // Contact associations

      // Additional Information
      notesSummary: completeOpportunityData.notesSummary,
      description: completeOpportunityData.description,

      // System fields
      sourceApp: completeOpportunityData.sourceApp,
      recordState: completeOpportunityData.recordState || 'ACTIVE',
      processInstanceId: completeOpportunityData.processInstanceId,
      additionalProperties: completeOpportunityData.additionalProperties,
      id: completeOpportunityData.id,
      version: completeOpportunityData.version
    })

    payload.opportunity = investmentOpportunity
  }

  return payload
}

export const submitConversionForm = (payload: any, onSuccess?: (payload: any) => void) => {
  // NOTE: AppActionForm will handle dispatchProcessContinueEvent automatically
  // We don't need to call it here to avoid double execution

  // Trigger onSuccess to close modal
  if (onSuccess) {
    onSuccess(payload)
  }
}

export const cancelConversionForm = () => {
  // Use same cancel pattern as CRM convert lead form
  dispatchProcessContinueEvent('pse_pause', {})
}
