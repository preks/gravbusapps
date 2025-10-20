import { UseFormReturn } from 'react-hook-form'
import { ConvertLeadFormData } from '../types'

export const checkFormReadiness = (formValues: ConvertLeadFormData): boolean => {
  // Check account requirements
  let accountValid = false
  if (formValues.accountOption === 'match') {
    // For matching: must have selected an account
    accountValid = !!formValues.selectedAccountId
  } else if (formValues.accountOption === 'create') {
    // For creation: must have required fields completed
    accountValid = !!formValues.accountName?.trim()
  }

  // Check contact requirements
  let contactValid = false
  if (formValues.contactOption === 'match') {
    // For matching: must have selected a contact
    contactValid = !!formValues.selectedContactId
  } else if (formValues.contactOption === 'create') {
    // For creation: must have required fields completed
    contactValid = !!(formValues.contactFirstName?.trim() && formValues.contactLastName?.trim())
  }

  // Optional: Check opportunity requirements if creating one
  let opportunityValid = true
  if (formValues.createOpportunity) {
    opportunityValid = !!formValues.opportunityName?.trim()
  }

  return accountValid && contactValid && opportunityValid
}

export const setValidationErrors = (form: UseFormReturn<ConvertLeadFormData>, formValues: ConvertLeadFormData) => {
  // Show specific validation errors
  if (formValues.accountOption === 'match' && !formValues.selectedAccountId) {
    form.setError('selectedAccountId', {
      message: 'Please select an account when matching existing account'
    })
  }
  if (formValues.accountOption === 'create' && !formValues.accountName?.trim()) {
    form.setError('accountName', {
      message: 'Please enter account name when creating new account'
    })
  }
  if (formValues.contactOption === 'match' && !formValues.selectedContactId) {
    form.setError('selectedContactId', {
      message: 'Please select a contact when matching existing contact'
    })
  }
  if (
    formValues.contactOption === 'create' &&
    (!formValues.contactFirstName?.trim() || !formValues.contactLastName?.trim())
  ) {
    if (!formValues.contactFirstName?.trim()) {
      form.setError('contactFirstName', {
        message: 'Please enter first name when creating new contact'
      })
    }
    if (!formValues.contactLastName?.trim()) {
      form.setError('contactLastName', {
        message: 'Please enter last name when creating new contact'
      })
    }
  }
  if (formValues.createOpportunity && !formValues.opportunityName?.trim()) {
    form.setError('opportunityName', {
      message: 'Please enter opportunity name when creating opportunity'
    })
  }
}
