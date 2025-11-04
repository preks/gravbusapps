import { UseFormReturn } from 'react-hook-form'
import { ConvertLeadFormData } from '../types'

// Check if form is ready for conversion (lenient validation to allow wizard progression)
export const checkFormReadiness = (formValues: ConvertLeadFormData): boolean => {
  // Account validation - only check for "match" option
  if (formValues.accountOption === 'match' && !formValues.selectedAccountId) {
    return false
  }
  // For "create" option, we allow progression even if accountName is not yet filled
  // The nested form will handle its own validation

  // Contact validation - only check for "match" option
  if (formValues.contactOption === 'match' && !formValues.selectedContactId) {
    return false
  }
  // For "create" option, we allow progression even if names are not yet filled
  // The nested form will handle its own validation

  // Opportunity validation - allow progression, nested form handles validation
  // We don't block on opportunityName anymore

  return true
}

// Set validation errors on form
export const setValidationErrors = (form: UseFormReturn<ConvertLeadFormData>, formValues: ConvertLeadFormData) => {
  // Account errors
  if (formValues.accountOption === 'match' && !formValues.selectedAccountId) {
    form.setError('selectedAccountId', {
      type: 'manual',
      message: 'Please select an account'
    })
  }
  if (formValues.accountOption === 'create' && !formValues.accountName?.trim()) {
    form.setError('accountName', {
      type: 'manual',
      message: 'Account name is required'
    })
  }

  // Contact errors
  if (formValues.contactOption === 'match' && !formValues.selectedContactId) {
    form.setError('selectedContactId', {
      type: 'manual',
      message: 'Please select a contact'
    })
  }
  if (formValues.contactOption === 'create') {
    if (!formValues.contactFirstName?.trim()) {
      form.setError('contactFirstName', {
        type: 'manual',
        message: 'First name is required'
      })
    }
    if (!formValues.contactLastName?.trim()) {
      form.setError('contactLastName', {
        type: 'manual',
        message: 'Last name is required'
      })
    }
  }

  // Opportunity errors
  if (formValues.createOpportunity && !formValues.opportunityName?.trim()) {
    form.setError('opportunityName', {
      type: 'manual',
      message: 'Opportunity name is required'
    })
  }
}
