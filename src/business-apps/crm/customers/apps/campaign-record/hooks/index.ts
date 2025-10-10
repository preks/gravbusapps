export * from './useCampaignRecord'
export * from './useCampaignKPIs'
export * from './useCampaignChart'
export * from './useCampaignEntities'
export * from './useCampaignAnalytics'

// Re-export everything as default for wrapped entries
import * as campaignHooks from './useCampaignRecord'
import * as kpiHooks from './useCampaignKPIs'
import * as chartHooks from './useCampaignChart'
import * as entityHooks from './useCampaignEntities'
import * as analyticsHooks from './useCampaignAnalytics'

export default {
  ...campaignHooks,
  ...kpiHooks,
  ...chartHooks,
  ...entityHooks,
  ...analyticsHooks
}
