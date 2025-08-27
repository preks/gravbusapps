// Customer Opportunity Mapper - Transform base type to enhanced type with computed fields

import { BaseCustomerOpportunity, CustomerOpportunity } from '../types';

/**
 * Transform BaseCustomerOpportunity (GraphQL response) to CustomerOpportunity (enhanced with computed fields)
 */
export function toCustomerOpportunity(base: BaseCustomerOpportunity): CustomerOpportunity {
  // Extract labels from catalog entries
  const currencyLabel = base.currency?.value || base.currency?.code;
  const opportunityPipelineLabel = base.opportunityPipeline?.value || base.opportunityPipeline?.code;
  const opportunityPipelineStageLabel = base.opportunityPipelineStage?.value || base.opportunityPipelineStage?.code;
  const opportunityStatusLabel = base.opportunityStatus?.value || base.opportunityStatus?.code;
  const ownerDisplayName = base.ownerEmployee?.displayName || 
    `${base.ownerEmployee?.firstName || ''} ${base.ownerEmployee?.lastName || ''}`.trim();

  // Create computed display name
  const displayName = base.name || base.code || `Opportunity ${base.id}`;

  return {
    ...base,
    
    // Computed UI fields (only those defined in CustomerOpportunity interface)
    displayName,
    currencyLabel,
    opportunityPipelineLabel,
    opportunityPipelineStageLabel,
    opportunityStatusLabel,
    ownerDisplayName
  };
}
