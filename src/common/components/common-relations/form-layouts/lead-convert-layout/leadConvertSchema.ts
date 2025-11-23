import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

/**
 * Lead Convert Schema - ONLY Step 1 Selection Fields
 * Used for validating the first wizard step in both CRM and IRM
 *
 * Entity-specific fields are handled by nested forms in subsequent steps
 * using the base schemas from account-layout, contact-layout, and opportunity-layout
 */
export const leadConvertSchema = z
  .object({
    // Account selection
    accountOption: z.enum(['match', 'create']),
    selectedAccountId: z.string().optional(),
    selectedAccountName: z.string().optional(),

    // Contact selection
    contactOption: z.enum(['match', 'create']),
    selectedContactId: z.string().optional(),
    selectedContactName: z.string().optional(),

    // Opportunity creation
    createOpportunity: z.boolean()
  })
  .refine(
    data => {
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
