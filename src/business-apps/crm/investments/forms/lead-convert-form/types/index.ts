import * as z from 'zod';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { AccountFormValues } from '../account-form/types';
import { ContactFormValues } from '../contact-form/types';
import { InvestmentOpportunityFormValues } from '../opportunity-form/types';

// Types for dropdown options
export interface AccountOption {
  id: string;
  value: string;
  label: string;
  name: string;
  email?: string;
  website?: string;
}

export interface ContactOption {
  id: string;
  value: string;
  label: string;
  name: string;
  email?: string;
  jobPosition?: string;
}

// Zod schema for form validation
export const convertLeadSchema = z.object({
  // Account step
  accountOption: z.enum(['match', 'create']),
  selectedAccountId: z.string().optional(),
  selectedAccountName: z.string().optional(),
  accountName: z.string().optional(),
  accountOwner: z.string().optional(),
  accountLegalForm: z.string().optional(),
  accountIndustry: z.string().optional(),

  // Contact step
  contactOption: z.enum(['match', 'create']),
  selectedContactId: z.string().optional(),
  selectedContactName: z.string().optional(),
  contactFirstName: z.string().optional(),
  contactLastName: z.string().optional(),
  contactEmail: z.string().optional(),
  contactOwnerEmployeeId: z.string().optional(),

  // Opportunity step
  createOpportunity: z.boolean(),
  opportunityName: z.string().optional(),
  opportunityOwner: z.string().optional(),
  opportunityPipeline: z.string().optional(),
  opportunityPipelineStage: z.string().optional(),
  opportunityEstimatedAmount: z.string().optional(),
  opportunityCurrency: z.string().optional(),

  // Review step
  reviewed: z.boolean().optional(),
}).refine((data) => {
  // If "match existing account" is selected, selectedAccountId is required
  if (data.accountOption === 'match' && !data.selectedAccountId) {
    return false;
  }
  return true;
}, {
  message: "Please select an account when matching existing account",
  path: ["selectedAccountId"],
}).refine((data) => {
  // If "match existing contact" is selected, selectedContactId is required
  if (data.contactOption === 'match' && !data.selectedContactId) {
    return false;
  }
  return true;
}, {
  message: "Please select a contact when matching existing contact",
  path: ["selectedContactId"],
}).refine((data) => {
  // Account validation
  if (data.accountOption === 'match' && !data.selectedAccountId) {
    return false;
  }
  if (data.accountOption === 'create' && !data.accountName?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Please complete account requirements",
  path: ["accountName"],
}).refine((data) => {
  // Contact validation
  if (data.contactOption === 'match' && !data.selectedContactId) {
    return false;
  }
  if (data.contactOption === 'create' && (!data.contactFirstName?.trim() || !data.contactLastName?.trim())) {
    return false;
  }
  return true;
}, {
  message: "Please complete contact requirements",
  path: ["contactFirstName"],
}).refine((data) => {
  // Opportunity validation (if creating)
  if (data.createOpportunity && !data.opportunityName?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Please provide opportunity name when creating opportunity",
  path: ["opportunityName"],
});

export type ConvertLeadFormData = z.infer<typeof convertLeadSchema>;

// Legacy interface for compatibility
export interface ConvertLeadFormDataLegacy {
  // Account data
  accountOption: 'match' | 'create';
  selectedAccountId?: string;
  selectedAccountName?: string;
  accountData: Partial<AccountFormValues>;

  // Contact data
  contactOption: 'match' | 'create';
  selectedContactId?: string;
  selectedContactName?: string;
  contactData: Partial<ContactFormValues>;

  // Opportunity data
  createOpportunity: boolean;
  opportunityData: Partial<InvestmentOpportunityFormValues>;
}

// Investment-specific interface for converting InvestmentLead (not regular Lead like in CRM)
export interface ConvertInvestmentLeadFormProps extends BusinessAppContextProps {
  // Note: Investment leads are identified via additionalData, not direct leadId prop
  // This follows the pattern used by other investment forms
  onCancel?: () => void;
  onSuccess?: () => void;
}
