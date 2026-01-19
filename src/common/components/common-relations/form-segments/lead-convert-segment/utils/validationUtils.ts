import { UseFormReturn } from 'react-hook-form'
import type { LeadConvertSchema } from '@/common/components/common-relations/form-layouts/lead-convert-layout/leadConvertSchema'

/**
 * Check if form is ready for conversion (lenient validation to allow wizard progression)
 * Context-agnostic validation logic
 */
export const checkFormReadiness = (formValues: LeadConvertSchema): boolean => {
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

/**
 * Set validation errors on form
 * Context-agnostic error handling
 */
export const setValidationErrors = (form: UseFormReturn<LeadConvertSchema>, formValues: LeadConvertSchema) => {
  // Account errors - only validate "match" option
  if (formValues.accountOption === 'match' && !formValues.selectedAccountId) {
    form.setError('selectedAccountId', {
      type: 'manual',
      message: 'Please select an account'
    })
  }
  // For "create" option, validation is handled by nested form in the Account step
  // We don't set errors here to allow wizard progression

  // Contact errors - only validate "match" option
  if (formValues.contactOption === 'match' && !formValues.selectedContactId) {
    form.setError('selectedContactId', {
      type: 'manual',
      message: 'Please select a contact'
    })
  }
  // For "create" option, validation is handled by nested form in the Contact step
  // We don't set errors here to allow wizard progression

  // Opportunity validation is handled by nested form in the Opportunity step
  // We don't set errors here to allow wizard progression
}
