export * from './CampaignRecordQueries'

// Re-export everything as default for wrapped entries
import * as campaignQueries from './CampaignRecordQueries'

export default {
  ...campaignQueries
}
