/**
 * Opportunity-specific import types for CRM
 */

import { ConvertedEntity } from '@/common/components/common-relations/apps/data-import/types'

// Converted opportunity structure ready for API (CRM)
export interface ConvertedOpportunity extends ConvertedEntity {
  // Basic Information
  name?: string | null
  description?: string | null

  // Status & Pipeline (CRM field names)
  opportunityStatusRef?: string | null
  opportunityForecastRef?: string | null
  salesPipelineRef?: string | null
  salesPipelineStageRef?: string | null

  // Financial Information
  estimatedAmount?: number | null
  currencyRef?: string | null
  closeDate?: string | null
  probability?: number | null

  // CRM-Specific
  salesCampaignId?: string | null

  // Owner & Additional
  ownerEmployeeId?: string | null
  source?: string | null
}
