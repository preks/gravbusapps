import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { ConvertLeadFormData, ConvertLeadFormDataLegacy } from '../types'
import { AccountFormValues } from '../../account-form/types'
import { ContactFormValues } from '../../contact-form/types'
import { OpportunityFormValues } from '../../opportunity-form/types'

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
    return {
      sourceApp: 'CRM',
      name: completeAccountData.accountName || legacyFormData.accountData.accountName,
      code: completeAccountData.code || null,
      legalFormRef: completeAccountData.legalForm || null,
      industryRef: completeAccountData.industry || null,
      website: completeAccountData.website || null,
      phone: completeAccountData.phone || null,
      email: completeAccountData.email || null,
      annualRevenueRef: completeAccountData.annualRevenue || null,
      employeeSizeRef: completeAccountData.employeeSize || null,
      ownerEmployee:
        completeAccountData.ownerEmployeeId ||
        legacyFormData.accountData.owner ||
        leadData?.ownerEmployeeId ||
        leadData?.ownerEmployee ||
        null,
      salesCampaign: legacyFormData.accountData.salesCampaign || null,
      tags: [],
      additionalProperties: {}
    }
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
    return {
      sourceApp: 'CRM',
      firstName: completeContactData.firstName || legacyFormData.contactData.firstName,
      lastName: completeContactData.lastName || legacyFormData.contactData.lastName,
      email: completeContactData.email || legacyFormData.contactData.email || null,
      phone: completeContactData.phone || null,
      jobTitle: completeContactData.jobTitle || null,
      ownerEmployee:
        completeContactData.ownerEmployeeId ||
        legacyFormData.contactData.ownerEmployeeId ||
        leadData?.ownerEmployeeId ||
        leadData?.ownerEmployee ||
        null,
      salesCampaign: legacyFormData.contactData.salesCampaign || null,
      tags: [],
      additionalProperties: {}
    }
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

  return {
    sourceApp: 'CRM',
    name: completeOpportunityData.name || legacyFormData.opportunityData.name,
    estimatedAmount: completeOpportunityData.estimatedAmount || null,
    currencyRef: completeOpportunityData.currency || legacyFormData.opportunityData.currency || null,
    salesPipelineRef: completeOpportunityData.pipeline || legacyFormData.opportunityData.pipeline || null,
    salesPipelineStageRef:
      completeOpportunityData.salesPipelineStage || legacyFormData.opportunityData.pipelineStage || null,
    ownerEmployee:
      completeOpportunityData.ownerEmployeeId ||
      legacyFormData.opportunityData.owner ||
      leadData?.ownerEmployeeId ||
      leadData?.ownerEmployee ||
      null,
    salesCampaign: legacyFormData.opportunityData.salesCampaign || null,
    tags: [],
    additionalProperties: {}
  }
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
