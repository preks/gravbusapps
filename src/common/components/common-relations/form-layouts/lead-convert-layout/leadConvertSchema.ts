import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

/**
 * Central Lead Convert Schema
 * Used for validating lead conversion forms in both CRM and IRM
 *
 * Note: This schema uses lenient validation to allow wizard progression.
 * The wizard steps handle their own validation through nested forms.
 * Only critical fields for the first step are validated here.
 */
export const leadConvertSchema = z
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
    // CRM-specific: Sales Campaign (optional)
    accountSalesCampaign: z.string().optional(),

    // Contact step
    contactOption: z.enum(['match', 'create']),
    selectedContactId: z.string().optional(),
    selectedContactName: z.string().optional(),
    contactFirstName: z.string().optional(),
    contactLastName: z.string().optional(),
    contactEmail: z.string().optional(),
    contactOwnerEmployeeId: z.string().optional(),
    // CRM-specific: Sales Campaign for Contact (optional)
    contactSalesCampaign: z.string().optional(),

    // Opportunity step
    createOpportunity: z.boolean(),
    opportunityName: z.string().optional(),
    opportunityOwner: z.string().optional(),
    opportunityPipeline: z.string().optional(),
    opportunityPipelineStage: z.string().optional(),
    opportunityEstimatedAmount: z.string().optional(),
    opportunityCurrency: z.string().optional(),
    // CRM-specific: Sales Campaign for Opportunity (optional)
    opportunitySalesCampaign: z.string().optional(),

    // Review step
    reviewed: z.boolean().optional()
  })
  .refine(
    data => {
      // Only validate "match" selections on first step
      // "create" validations are handled by nested forms in subsequent steps
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
      // Only validate "match" selections on first step
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

export type LeadConvertSchema = z.infer<typeof leadConvertSchema>

export const createLeadConvertResolver = () => zodResolver(leadConvertSchema)
