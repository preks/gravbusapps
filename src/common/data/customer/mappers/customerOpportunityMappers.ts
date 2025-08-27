// Customer Opportunity Mapper - Transform base type to enhanced type with computed fields

import { BaseCustomerOpportunity, CustomerOpportunity } from '../types';

/**
 * Transform BaseCustomerOpportunity (GraphQL response) to CustomerOpportunity (enhanced with computed fields)
 */
export function toCustomerOpportunity(base: BaseCustomerOpportunity): CustomerOpportunity {
  // Extract labels from catalog entries
  const currencyLabel = base.currency?.value || base.currency?.code;
  const normalizedPipeline = (base as any).opportunityPipeline
    ?? (base as any).pipeline
    ?? (base as any).salesPipeline
    ?? undefined;
  const normalizedStage = (base as any).opportunityPipelineStage
    ?? (base as any).salesPipelineStage
    ?? undefined;
  const normalizedStatus = (base as any).opportunityStatus
    ?? ((base as any).status ? { id: '', code: (base as any).status, value: (base as any).status } : undefined);

  const opportunityPipelineLabel = normalizedPipeline?.value || normalizedPipeline?.code;
  const opportunityPipelineStageLabel = normalizedStage?.value || normalizedStage?.code;
  const opportunityStatusLabel = normalizedStatus?.value || normalizedStatus?.code;
  const ownerDisplayName = base.ownerEmployee?.displayName || 
    `${base.ownerEmployee?.firstName || ''} ${base.ownerEmployee?.lastName || ''}`.trim();

  // Create computed display name
  const displayName = base.name || base.code || `Opportunity ${base.id}`;

  return {
    ...base,
    // Ensure numeric fields are present for UI list
    estimatedAmount: base.estimatedAmount,
    winningChance: (base as any).winningChance ?? (base as any).probability ?? undefined,
    // Normalize fields so UI can consume consistent names
    opportunityPipeline: normalizedPipeline,
    opportunityPipelineStage: normalizedStage,
    opportunityStatus: normalizedStatus,
    
    // Computed UI fields (only those defined in CustomerOpportunity interface)
    displayName,
    currencyLabel,
    opportunityPipelineLabel,
    opportunityPipelineStageLabel,
    opportunityStatusLabel,
    ownerDisplayName
  };
}
