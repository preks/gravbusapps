import type { InvestmentReportTableConfig } from '../components/shared/types'
import { DEFAULT_REPORT_TABLE_CONFIG } from '../components/shared/tableConfigs'

/**
 * Configuration for an investment group's report tab.
 *
 * Generic report configuration. Dynamic derivations are produced at render time
 * by `buildReportConfiguration` from the active catalog group and section.
 */
export interface ReportGroupConfiguration {
  entityPrefix: string
  tableConfig: InvestmentReportTableConfig
}

export const DEFAULT_REPORT_GROUP_CONFIGURATION: ReportGroupConfiguration = {
  entityPrefix: 'investment',
  tableConfig: DEFAULT_REPORT_TABLE_CONFIG
}

export const getReportGroupConfiguration = (): ReportGroupConfiguration => {
  return DEFAULT_REPORT_GROUP_CONFIGURATION
}
