// Customer Lead Mapper - Transform base type to enhanced type with computed fields

import { BaseCustomerLead, CustomerLead } from '../types';

/**
 * Transform BaseCustomerLead (GraphQL response) to CustomerLead (enhanced with computed fields)
 */
export function toCustomerLead(base: BaseCustomerLead): CustomerLead {
  // Extract labels from catalog entries
  const salutationLabel = base.salutation?.value || base.salutation?.code;
  const academicTitleLabel = base.academicTitle?.value || base.academicTitle?.code;
  const leadRatingLabel = base.leadRating?.value || base.leadRating?.code;
  const leadStatusLabel = base.leadStatus?.value || base.leadStatus?.code;
  const leadSourceLabel = base.leadSource?.value || base.leadSource?.code;
  const industryClassLabel = base.industryClass?.value || base.industryClass?.code;
  const companySizeLabel = base.companySize?.value || base.companySize?.code;
  const ownerDisplayName = base.ownerEmployee?.displayName || 
    `${base.ownerEmployee?.firstName || ''} ${base.ownerEmployee?.lastName || ''}`.trim();

  // Create computed names
  const fullName = `${base.firstName || ''} ${base.lastName || ''}`.trim();
  const displayName = fullName || base.email || base.code || `Lead ${base.id}`;

  return {
    ...base,
    
    // Computed UI fields (only those defined in CustomerLead interface)
    displayName,
    fullName,
    salutationLabel,
    academicTitleLabel,
    leadRatingLabel,
    leadStatusLabel,
    leadSourceLabel,
    industryClassLabel,
    companySizeLabel,
    ownerDisplayName
  };
}
