// Investment Contact Mappers - Transform base type to enhanced type with computed fields

import { BaseInvestmentContact, InvestmentContact } from '../types';

/**
 * Transform BaseInvestmentContact (GraphQL response) to InvestmentContact (enhanced with computed fields)
 */
export function toInvestmentContact(base: BaseInvestmentContact): InvestmentContact {
  // Extract labels from catalog entries (only using fields that exist in BaseInvestmentContact)
  const salutationLabel = base.salutation?.value || base.salutation?.code;
  const academicTitleLabel = base.academicTitle?.value || base.academicTitle?.code;
  const languageLabel = base.language?.value || base.language?.code;
  
  // Employee label
  const ownerDisplayName = base.ownerEmployee?.displayName || 
    `${base.ownerEmployee?.firstName || ''} ${base.ownerEmployee?.lastName || ''}`.trim();

  // Create computed fields (only using fields that exist in BaseInvestmentContact)
  const fullName = [
    salutationLabel,
    academicTitleLabel,
    base.firstName,
    base.lastName
  ].filter(Boolean).join(' ').trim();
  
  const displayName = fullName || base.email || `Contact ${base.id}`;

  return {
    ...base,
    
    // Only include fields defined in InvestmentContact interface
    displayName,
    fullName,
    salutationLabel,
    academicTitleLabel,
    languageLabel,
    ownerDisplayName
  };
}