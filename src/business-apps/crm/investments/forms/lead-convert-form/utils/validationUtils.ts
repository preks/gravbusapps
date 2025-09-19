import { UseFormReturn } from 'react-hook-form';
import { ConvertLeadFormData } from '../types';

export const checkFormReadiness = (formValues: ConvertLeadFormData): boolean => {
  console.log('🔍 Checking form readiness:', {
    accountOption: formValues.accountOption,
    selectedAccountId: formValues.selectedAccountId,
    accountName: formValues.accountName,
    contactOption: formValues.contactOption,
    selectedContactId: formValues.selectedContactId,
    contactFirstName: formValues.contactFirstName,
    contactLastName: formValues.contactLastName,
    createOpportunity: formValues.createOpportunity,
    opportunityName: formValues.opportunityName
  });
  
  // Check account requirements
  let accountValid = false;
  if (formValues.accountOption === 'match') {
    // For matching: must have selected an account
    accountValid = !!formValues.selectedAccountId;
    console.log('🔍 Account match validation:', { selectedAccountId: formValues.selectedAccountId, accountValid });
  } else if (formValues.accountOption === 'create') {
    // For creation: must have required fields completed
    accountValid = !!(formValues.accountName?.trim());
    console.log('🔍 Account create validation:', { accountName: formValues.accountName, accountValid });
  }
  
  // Check contact requirements  
  let contactValid = false;
  if (formValues.contactOption === 'match') {
    // For matching: must have selected a contact
    contactValid = !!formValues.selectedContactId;
    console.log('🔍 Contact match validation:', { selectedContactId: formValues.selectedContactId, contactValid });
  } else if (formValues.contactOption === 'create') {
    // For creation: must have required fields completed
    contactValid = !!(formValues.contactFirstName?.trim() && formValues.contactLastName?.trim());
    console.log('🔍 Contact create validation:', { 
      contactFirstName: formValues.contactFirstName, 
      contactLastName: formValues.contactLastName, 
      contactValid 
    });
  }
  
  // Optional: Check opportunity requirements if creating one
  let opportunityValid = true;
  if (formValues.createOpportunity) {
    opportunityValid = !!(formValues.opportunityName?.trim());
    console.log('🔍 Opportunity validation:', { opportunityName: formValues.opportunityName, opportunityValid });
  }
  
  const finalResult = accountValid && contactValid && opportunityValid;
  console.log('🔍 Final validation result:', { accountValid, contactValid, opportunityValid, finalResult });
  
  return finalResult;
};

export const setValidationErrors = (form: UseFormReturn<ConvertLeadFormData>, formValues: ConvertLeadFormData) => {
  console.log('🚫 Form is not ready for conversion - missing required selections');
  
  // Show specific validation errors
  if (formValues.accountOption === 'match' && !formValues.selectedAccountId) {
    console.log('❌ Account selection missing');
    form.setError('selectedAccountId', { 
      message: 'Please select an account when matching existing account' 
    });
  }
  if (formValues.accountOption === 'create' && !formValues.accountName?.trim()) {
    console.log('❌ Account name missing');
    form.setError('accountName', { 
      message: 'Please enter account name when creating new account' 
    });
  }
  if (formValues.contactOption === 'match' && !formValues.selectedContactId) {
    console.log('❌ Contact selection missing');
    form.setError('selectedContactId', { 
      message: 'Please select a contact when matching existing contact' 
    });
  }
  if (formValues.contactOption === 'create' && (!formValues.contactFirstName?.trim() || !formValues.contactLastName?.trim())) {
    console.log('❌ Contact name missing');
    if (!formValues.contactFirstName?.trim()) {
      form.setError('contactFirstName', { 
        message: 'Please enter first name when creating new contact' 
      });
    }
    if (!formValues.contactLastName?.trim()) {
      form.setError('contactLastName', { 
        message: 'Please enter last name when creating new contact' 
      });
    }
  }
  if (formValues.createOpportunity && !formValues.opportunityName?.trim()) {
    console.log('❌ Opportunity name missing');
    form.setError('opportunityName', { 
      message: 'Please enter opportunity name when creating opportunity' 
    });
  }
};
