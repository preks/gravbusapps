import { createCampaignColumns, createCampaignSortableColumns } from './campaignColumns'
import { campaignFilterConfig } from './campaignFilters'

// Re-export as named exports
export { createCampaignColumns, createCampaignSortableColumns, campaignFilterConfig }

// Default export for wrapper compatibility
export default {
  createCampaignColumns,
  createCampaignSortableColumns,
  campaignFilterConfig
}
