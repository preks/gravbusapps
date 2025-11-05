import { AccountFormValues } from '../../account-form/types'
import { ContactFormValues } from '../../contact-form/types'
import { OpportunityFormValues } from '../../opportunity-form/types'

// Get initial values for Account form from lead data
export const getAccountInitialValues = (leadData: any): Partial<AccountFormValues> => {
  if (!leadData) return {}

  const firstAddress = leadData.addresses?.[0]

  return {
    accountName: leadData.companyName || '',
    email: leadData.companyEmail || leadData.email || '',
    phone: leadData.companyPhone || leadData.phoneNumber || '',
    website: leadData.companyWebsite || '',
    // REQUIRED: Owner - inherit from lead's owner
    owner: leadData.ownerEmployeeId || leadData.ownerEmployee || '',
    // Address information from lead
    addressLine1: firstAddress?.addressLine || '',
    city: firstAddress?.city || '',
    postalCode: firstAddress?.postalCode || '',
    country: firstAddress?.country?.id || '',
    region: firstAddress?.region?.id || ''
  }
}

// Get initial values for Contact form from lead data
export const getContactInitialValues = (leadData: any): Partial<ContactFormValues> => {
  if (!leadData) return {}

  return {
    firstName: leadData.firstName || '',
    lastName: leadData.lastName || '',
    email: leadData.email || '',
    phone: leadData.phoneNumber || '',
    jobTitle: leadData.position || '',
    academicTitle: leadData.academicTitleRef || leadData.academicTitle?.id || '',
    // REQUIRED: Owner - inherit from lead's owner
    ownerEmployeeId: leadData.ownerEmployeeId || leadData.ownerEmployee || ''
  }
}

// Get initial values for Opportunity form from lead data
export const getOpportunityInitialValues = (leadData: any): Partial<OpportunityFormValues> => {
  if (!leadData) return {}

  return {
    name: leadData.companyName ? `Opportunity for ${leadData.companyName}` : '',
    // REQUIRED: Owner - inherit from lead's owner
    owner: leadData.ownerEmployeeId || leadData.ownerEmployee || ''
  }
}
