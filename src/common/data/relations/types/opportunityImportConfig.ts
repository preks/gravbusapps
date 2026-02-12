/**
 * Base Opportunity Import Configuration
 * Common fields shared between IRM and CRM opportunity imports
 * Following the same pattern as Opportunity → InvestmentOpportunity / CustomerOpportunity entity types
 */

import { TargetFieldDefinition } from '@/common/components/common-relations/apps/data-import/types'

export const baseOpportunityImportFields: TargetFieldDefinition[] = [
  // Basic Information
  { value: 'name', label: 'Opportunity Name', type: 'direct' },
  { value: 'description', label: 'Description', type: 'direct' },

  // Status & Forecast (common)
  { value: 'opportunityStatusRef', label: 'Status (Catalog)', type: 'catalog', catalog: 'OpportunityStatus' },
  { value: 'opportunityForecastRef', label: 'Forecast (Catalog)', type: 'catalog', catalog: 'OpportunityForecast' },

  // Financial Information
  { value: 'estimatedAmount', label: 'Estimated Amount', type: 'direct' },
  { value: 'currencyRef', label: 'Currency (Catalog)', type: 'catalog', catalog: 'Currency' },
  { value: 'closeDate', label: 'Expected Close Date', type: 'direct' },
  { value: 'probability', label: 'Probability (%)', type: 'direct' },

  // Owner & Additional
  { value: 'ownerEmployeeId', label: 'Owner Employee ID', type: 'direct' },
  { value: 'source', label: 'Source', type: 'direct' }
]
