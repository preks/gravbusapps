import * as z from 'zod'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AccountFormValues } from '../account-form/types'
import { ContactFormValues } from '../contact-form/types'
import { OpportunityFormValues } from '../opportunity-form/types'

// Types for dropdown options
export interface AccountOption {
  id: string
  value: string
  label: string
  name: string
  email?: string
  website?: string
  ownerEmployeeId?: string
}

export interface ContactOption {
  id: string
  value: string
  label: string
  name: string
  email?: string
  jobPosition?: string
}

// Zod schema for form validation (CRM-specific)
export const convertLeadSchema = z
  .object({
    // Account step
    accountOption: z.enum(['match', 'create']),
    selectedAccountId: z.string().optional(),
    selectedAccountName: z.string().optional(),
    selectedAccountOwnerEmployeeId: z.string().optional(), // Store selected account's owner
    accountName: z.string().optional(),
    accountOwner: z.string().optional(),
    accountLegalForm: z.string().optional(),
    accountIndustry: z.string().optional(),
    // CRM-specific: Sales Campaign
    accountSalesCampaign: z.string().optional(),

    // Contact step
    contactOption: z.enum(['match', 'create']),
    selectedContactId: z.string().optional(),
    selectedContactName: z.string().optional(),
    contactFirstName: z.string().optional(),
    contactLastName: z.string().optional(),
    contactEmail: z.string().optional(),
    contactOwnerEmployeeId: z.string().optional(),
    // CRM-specific: Sales Campaign for Contact
    contactSalesCampaign: z.string().optional(),

    // Opportunity step
    createOpportunity: z.boolean(),
    opportunityName: z.string().optional(),
    opportunityOwner: z.string().optional(),
    opportunityPipeline: z.string().optional(),
    opportunityPipelineStage: z.string().optional(),
    opportunityEstimatedAmount: z.string().optional(),
    opportunityCurrency: z.string().optional(),
    // CRM-specific: Sales Campaign for Opportunity
    opportunitySalesCampaign: z.string().optional(),

    // Review step
    reviewed: z.boolean().optional()
  })
  .refine(
    data => {
      // If "match existing account" is selected, selectedAccountId is required
      if (data.accountOption === 'match' && !data.selectedAccountId) {
        return false
      }
      return true
    },
    {
      message: 'Please select an account when matching existing account',
      path: ['selectedAccountId']
    }
  )
  .refine(
    data => {
      // If "match existing contact" is selected, selectedContactId is required
      if (data.contactOption === 'match' && !data.selectedContactId) {
        return false
      }
      return true
    },
    {
      message: 'Please select a contact when matching existing contact',
      path: ['selectedContactId']
    }
  )
  .refine(
    data => {
      // Account validation
      if (data.accountOption === 'match' && !data.selectedAccountId) {
        return false
      }
      if (data.accountOption === 'create' && !data.accountName?.trim()) {
        return false
      }
      return true
    },
    {
      message: 'Please complete account requirements',
      path: ['accountName']
    }
  )
  .refine(
    data => {
      // Contact validation
      if (data.contactOption === 'match' && !data.selectedContactId) {
        return false
      }
      if (data.contactOption === 'create' && (!data.contactFirstName?.trim() || !data.contactLastName?.trim())) {
        return false
      }
      return true
    },
    {
      message: 'Please complete contact requirements',
      path: ['contactFirstName']
    }
  )
  .refine(
    data => {
      // Opportunity validation (if creating)
      if (data.createOpportunity && !data.opportunityName?.trim()) {
        return false
      }
      return true
    },
    {
      message: 'Please provide opportunity name when creating opportunity',
      path: ['opportunityName']
    }
  )

export type ConvertLeadFormData = z.infer<typeof convertLeadSchema>

// Legacy interface for compatibility
export interface ConvertLeadFormDataLegacy {
  // Account data
  accountOption: 'match' | 'create'
  selectedAccountId?: string
  selectedAccountName?: string
  accountData: Partial<AccountFormValues>

  // Contact data
  contactOption: 'match' | 'create'
  selectedContactId?: string
  selectedContactName?: string
  contactData: Partial<ContactFormValues>

  // Opportunity data
  createOpportunity: boolean
  opportunityData: Partial<OpportunityFormValues>
}

// CRM-specific interface for converting Lead
export interface ConvertLeadFormProps extends BusinessAppContextProps {
  onCancel?: () => void
  onSuccess?: () => void
}
