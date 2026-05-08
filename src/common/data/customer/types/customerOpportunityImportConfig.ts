/**
 * Customer Opportunity Import Configuration
 * Extends base opportunity fields with customer-specific fields
 * Used by CRM (Customer Relations Management) domain
 */

import { baseOpportunityImportFields } from '@/common/data/relations/types/opportunityImportConfig'
import { opportunityPreviewConfig } from '@/common/data/relations/types/entityPreviewConfigs'
import { ImportConfig, TargetFieldDefinition } from '@/common/components/common-relations/apps/data-import/types'

// CRM-specific: sales pipeline
const customerOpportunityFields: TargetFieldDefinition[] = [
  { value: 'salesPipelineRef', label: 'Sales Pipeline (Catalog)', type: 'catalog', catalog: 'SalesPipeline' },
  {
    value: 'salesPipelineStageRef',
    label: 'Pipeline Stage (Catalog)',
    type: 'catalog',
    catalog: 'SalesPipelineStage'
  },
  { value: 'salesCampaignId', label: 'Sales Campaign ID', type: 'direct' }
]

export const customerOpportunityImportConfig: ImportConfig = {
  entityType: 'opportunity',
  domain: 'customer',
  targetFields: [...baseOpportunityImportFields, ...customerOpportunityFields],
  preview: opportunityPreviewConfig
}
