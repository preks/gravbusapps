// Investment Opportunity Mappers - Transform base type to enhanced type with computed fields

import { BaseInvestmentOpportunity, InvestmentOpportunity, InvestmentOpportunityStageCondition } from '../types';

/**
 * Transform BaseInvestmentOpportunity (GraphQL response) to InvestmentOpportunity (enhanced with computed fields)
 */
export function toInvestmentOpportunity(base: BaseInvestmentOpportunity): InvestmentOpportunity {
  // Extract labels from catalog entries
  const currencyLabel = base.currency?.value || base.currency?.code;
  const opportunityPipelineLabel = base.opportunityPipeline?.value || base.opportunityPipeline?.code;
  const opportunityPipelineStageLabel = base.opportunityPipelineStage?.value || base.opportunityPipelineStage?.code;
  const opportunityStatusLabel = base.opportunityStatus?.value || base.opportunityStatus?.code;
  
  // Investment-related labels
  const investmentGroupLabel = base.investmentGroup?.value || base.investmentGroup?.code;
  const investmentTypeLabel = base.investmentType?.value || base.investmentType?.code;
  const investmentRoleLabel = base.investmentRole?.value || base.investmentRole?.code;
  const investmentStakeTypeLabel = base.investmentStakeType?.value || base.investmentStakeType?.code;
  
  // Employee/relationship labels
  const ownerDisplayName = base.ownerEmployee?.displayName || 
    `${base.ownerEmployee?.firstName || ''} ${base.ownerEmployee?.lastName || ''}`.trim();
  const accountDisplayName = base.account?.name;

  // Create computed display name
  const displayName = base.name || `Opportunity ${base.id}`;

  return {
    ...base,
    
    // Only include fields defined in InvestmentOpportunity interface
    displayName,
    currencyLabel,
    opportunityPipelineLabel,
    opportunityPipelineStageLabel,
    opportunityStatusLabel,
    investmentGroupLabel,
    investmentTypeLabel,
    investmentRoleLabel,
    investmentStakeTypeLabel,
    ownerDisplayName,
    accountDisplayName,

    // Pass through opportunityStageConditions as enhanced type (fields already compatible)
    opportunityStageConditions: (base.opportunityStageConditions as unknown as InvestmentOpportunityStageCondition[]) || []
  };
}