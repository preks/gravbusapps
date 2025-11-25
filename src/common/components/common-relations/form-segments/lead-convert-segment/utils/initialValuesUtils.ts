/**
 * Initial values utilities for Lead Convert Segment (Context-Agnostic)
 * Extracts common field mappings from lead data to form values
 */

// Get initial values for Account from lead data
export const getAccountInitialValues = (leadData: any) => {
  if (!leadData) return {}

  const firstAddress = leadData.addresses?.[0]

  return {
    accountName: leadData.companyName || '',
    email: leadData.companyEmail || leadData.email || '',
    phone: leadData.companyPhone || leadData.phoneNumber || '',
    website: leadData.companyWebsite || '',
    // Owner - inherit from lead's owner
    owner: leadData.ownerEmployeeId || leadData.ownerEmployee || '',
    // Address information from lead
    addressLine1: firstAddress?.addressLine || '',
    city: firstAddress?.city || '',
    postalCode: firstAddress?.postalCode || '',
    country: firstAddress?.country?.id || firstAddress?.countryRef || '',
    region: firstAddress?.region?.id || firstAddress?.regionRef || ''
  }
}

// Get initial values for Contact from lead data
export const getContactInitialValues = (leadData: any) => {
  if (!leadData) return {}

  return {
    firstName: leadData.firstName || '',
    lastName: leadData.lastName || '',
    email: leadData.email || '',
    phone: leadData.phoneNumber || leadData.phone || '',
    jobTitle: leadData.jobPosition || '',
    academicTitle: leadData.academicTitleRef || leadData.academicTitle?.id || '',
    // Owner - inherit from lead's owner
    ownerEmployeeId: leadData.ownerEmployeeId || leadData.ownerEmployee || ''
  }
}

// Get initial values for Opportunity from lead data
export const getOpportunityInitialValues = (leadData: any) => {
  if (!leadData) return {}

  const companyName = leadData.companyName || ''
  const opportunityName = companyName ? `Opportunity for ${companyName}` : ''

  return {
    name: opportunityName,
    // Owner - inherit from lead's owner
    owner: leadData.ownerEmployeeId || leadData.ownerEmployee || ''
  }
}
