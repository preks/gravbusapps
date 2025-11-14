import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { ConvertLeadFormData, ConvertLeadFormDataLegacy } from '../types'
import { AccountFormValues } from '../../account-form/types'
import { ContactFormValues } from '../../contact-form/types'
import { OpportunityFormValues } from '../../opportunity-form/types'
import {
  buildCustomerAccountPayload,
  buildCustomerContactPayload,
  buildCustomerOpportunityPayload
} from '@/common/data/customer/payloads'

/**
 * Helper: Build account payload based on option (match vs create)
 */
const buildAccountPayload = (
  legacyFormData: ConvertLeadFormDataLegacy,
  completeAccountData: Partial<AccountFormValues>,
  leadData?: any
) => {
  if (legacyFormData.accountOption === 'match' && legacyFormData.selectedAccountId) {
    const selectedAccount = completeAccountData as any
    return {
      id: legacyFormData.selectedAccountId,
      ownerEmployee:
        selectedAccount.ownerEmployeeId ||
        legacyFormData.accountData.owner ||
        completeAccountData.owner ||
        leadData?.ownerEmployeeId ||
        leadData?.ownerEmployee ||
        null
    }
  }

  if (legacyFormData.accountOption === 'create') {
    // ✅ Use centralized payload builder - pass ALL available fields
    const { customerAccount } = buildCustomerAccountPayload({
      // Basic Information
      accountName: completeAccountData.accountName || legacyFormData.accountData.accountName,
      code: completeAccountData.code,
      businessKey: completeAccountData.businessKey,

      // Company Information
      legalForm: completeAccountData.legalForm,
      industry: completeAccountData.industry,
      website: completeAccountData.website,

      // Contact Information
      email: completeAccountData.email,
      phone: completeAccountData.phone,

      // Financial Information
      annualRevenue: completeAccountData.annualRevenue,
      companySize: completeAccountData.numberOfEmployees || completeAccountData.employeeSize, // maps to numberOfEmployeesRef
      foundationDate: completeAccountData.foundationDate,

      // Relationships
      owner:
        completeAccountData.owner ||
        completeAccountData.ownerEmployeeId ||
        legacyFormData.accountData.owner ||
        leadData?.ownerEmployeeId ||
        leadData?.ownerEmployee,

      // CRM-specific fields
      salesCampaignId: legacyFormData.accountData.salesCampaign,

      // Complex fields
      addresses: completeAccountData.addresses,

      // System fields
      id: completeAccountData.id,
      version: completeAccountData.version
    })

    return customerAccount
  }

  return null
}

/**
 * Helper: Build contact payload based on option (match vs create)
 */
const buildContactPayload = (
  legacyFormData: ConvertLeadFormDataLegacy,
  completeContactData: Partial<ContactFormValues>,
  leadData?: any
) => {
  if (legacyFormData.contactOption === 'match' && legacyFormData.selectedContactId) {
    return { id: legacyFormData.selectedContactId }
  }

  if (legacyFormData.contactOption === 'create') {
    // ✅ Use centralized payload builder - pass ALL available fields
    const { customerContact } = buildCustomerContactPayload({
      // Personal Information
      firstName: completeContactData.firstName || legacyFormData.contactData.firstName,
      lastName: completeContactData.lastName || legacyFormData.contactData.lastName,
      birthDate: completeContactData.birthDate,
      bio: completeContactData.bio,

      // Professional Information
      jobTitle: completeContactData.jobTitle,
      department: completeContactData.department,
      contactType: completeContactData.contactType,
      workExperienceYears: completeContactData.workExperienceYears,

      // Contact Information
      email: completeContactData.email || legacyFormData.contactData.email,
      phone: completeContactData.phone,
      fax: completeContactData.fax,
      linkedinUrl: completeContactData.linkedinUrl,
      xingUrl: completeContactData.xingUrl,

      // Titles
      academicTitle: completeContactData.academicTitleRef || completeContactData.academicTitle,
      language: completeContactData.languageRef,

      // Picture
      pictureUrl: completeContactData.pictureUrl,

      // Account Relationships
      accountId: completeContactData.accountId || completeContactData.account,
      accountIds: completeContactData.accountIds,

      // Ownership
      owner:
        completeContactData.owner ||
        completeContactData.ownerEmployeeId ||
        legacyFormData.contactData.ownerEmployeeId ||
        leadData?.ownerEmployeeId ||
        leadData?.ownerEmployee,
      ownerOrganizationId: completeContactData.ownerOrganizationId,

      // Additional Information
      notesSummary: completeContactData.notesSummary,

      // CRM-specific fields
      salesCampaignId: legacyFormData.contactData.salesCampaign,

      // System fields
      businessKey: completeContactData.businessKey,
      code: completeContactData.code,
      id: completeContactData.id,
      version: completeContactData.version,
      sourceApp: completeContactData.sourceApp,
      recordState: completeContactData.recordState
    })

    return customerContact
  }

  return null
}

/**
 * Helper: Build opportunity payload if requested
 */
const buildOpportunityPayload = (
  legacyFormData: ConvertLeadFormDataLegacy,
  completeOpportunityData: Partial<OpportunityFormValues>,
  leadData?: any
) => {
  if (!legacyFormData.createOpportunity) {
    return null
  }

  // ✅ Use centralized payload builder - pass ALL available fields
  const { customerOpportunity } = buildCustomerOpportunityPayload({
    // Basic Information
    name: completeOpportunityData.name || legacyFormData.opportunityData.name,
    code: completeOpportunityData.code,
    businessKey: completeOpportunityData.businessKey,

    // Status Information
    opportunityStatus: completeOpportunityData.opportunityStatus,
    stage: completeOpportunityData.stage,
    status: completeOpportunityData.status,

    // Sales Information
    estimatedAmount: completeOpportunityData.estimatedAmount,
    currency: completeOpportunityData.currency || legacyFormData.opportunityData.currency,
    winningChance: completeOpportunityData.winningChance,
    closeDate: completeOpportunityData.closeDate,

    // Pipeline Information (CRM-specific field mapping)
    pipeline: completeOpportunityData.pipeline || legacyFormData.opportunityData.pipeline,
    pipelineStage: completeOpportunityData.salesPipelineStage || legacyFormData.opportunityData.pipelineStage,

    // Relationship Information
    account: completeOpportunityData.account,
    lead: completeOpportunityData.lead,
    companyName: completeOpportunityData.companyName,
    contactIds: completeOpportunityData.contactIds,

    // Ownership
    owner:
      completeOpportunityData.owner ||
      completeOpportunityData.ownerEmployeeId ||
      legacyFormData.opportunityData.owner ||
      leadData?.ownerEmployeeId ||
      leadData?.ownerEmployee,
    ownerOrganizationId: completeOpportunityData.ownerOrganizationId,

    // Additional Information
    notesSummary: completeOpportunityData.notesSummary,
    lastInteraction: completeOpportunityData.lastInteraction,
    personal: completeOpportunityData.personal,

    // CRM-specific fields
    salesCampaignId: legacyFormData.opportunityData.salesCampaign,

    // Complex fields
    addresses: completeOpportunityData.addresses,
    communicationChannels: completeOpportunityData.communicationChannels,
    tags: completeOpportunityData.tags,
    additionalProperties: completeOpportunityData.additionalProperties,
    express1: completeOpportunityData.express1,
    express2: completeOpportunityData.express2,

    // System fields
    sourceApp: completeOpportunityData.sourceApp,
    recordState: completeOpportunityData.recordState,
    processInstanceId: completeOpportunityData.processInstanceId,
    id: completeOpportunityData.id,
    version: completeOpportunityData.version
  })

  return customerOpportunity
}

export const createSubmissionPayload = (
  data: ConvertLeadFormData,
  completeAccountData: Partial<AccountFormValues>,
  completeContactData: Partial<ContactFormValues>,
  completeOpportunityData: Partial<OpportunityFormValues>,
  actualLeadId: string,
  leadData?: any
) => {
  // Convert new form data to legacy format for submission
  const legacyFormData: ConvertLeadFormDataLegacy = {
    accountOption: data.accountOption,
    selectedAccountId: data.selectedAccountId,
    selectedAccountName: data.selectedAccountName,
    accountData: {
      accountName: data.accountName,
      owner: data.accountOwner || data.selectedAccountOwnerEmployeeId, // Include selected account's owner
      legalForm: data.accountLegalForm,
      industry: data.accountIndustry,
      // CRM-specific: Sales Campaign
      salesCampaign: data.accountSalesCampaign
    },
    contactOption: data.contactOption,
    selectedContactId: data.selectedContactId,
    selectedContactName: data.selectedContactName,
    contactData: {
      firstName: data.contactFirstName,
      lastName: data.contactLastName,
      email: data.contactEmail,
      ownerEmployeeId: data.contactOwnerEmployeeId,
      // CRM-specific: Sales Campaign
      salesCampaign: data.contactSalesCampaign
    },
    createOpportunity: data.createOpportunity,
    opportunityData: {
      name: data.opportunityName,
      owner: data.opportunityOwner,
      pipeline: data.opportunityPipeline,
      pipelineStage: data.opportunityPipelineStage,
      estimatedAmount: data.opportunityEstimatedAmount,
      currency: data.opportunityCurrency,
      // CRM-specific: Sales Campaign
      salesCampaign: data.opportunitySalesCampaign
    }
  }

  // Build the payload following the CRM API structure using helper functions
  const payload: any = {
    leadId: actualLeadId
  }

  // Use helper functions to build payloads (reduces cognitive complexity)
  const accountPayload = buildAccountPayload(legacyFormData, completeAccountData, leadData)
  if (accountPayload) {
    payload.account = accountPayload
  }

  const contactPayload = buildContactPayload(legacyFormData, completeContactData, leadData)
  if (contactPayload) {
    payload.contact = contactPayload
  }

  const opportunityPayload = buildOpportunityPayload(legacyFormData, completeOpportunityData, leadData)
  if (opportunityPayload) {
    payload.opportunity = opportunityPayload
  }

  return payload
}

export const submitConversionForm = (payload: any, onSuccess?: (payload: any) => void) => {
  console.log('📤 submitConversionForm called with payload:', payload)

  // NOTE: AppActionForm will handle dispatchProcessContinueEvent automatically
  // We don't need to call it here to avoid double execution
  // The AppActionForm component will dispatch the process event based on processType

  console.log('✅ Submission complete - AppActionForm will handle process event')

  // Trigger onSuccess callback if provided (for modal closing)
  if (onSuccess) {
    console.log('Calling onSuccess callback')
    onSuccess(payload)
  }
}

export const cancelConversionForm = () => {
  console.log('Cancel conversion form - dispatching pse_pause event')
  dispatchProcessContinueEvent('pse_pause', {})
}
