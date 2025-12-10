// Re-export shared dashboard utilities from common location
// The shared utils handle both CRM and IRM entity config differences
export {
  extractCurrencyCode,
  formatCurrency,
  formatLargeNumber,
  calculateWinRateMetrics,
  calculateActivityVolumeMetrics,
  calculateSalesRepPerformance,
  calculateFunnelData,
  calculatePipelineMetrics,
  transformPipelineData,
  getDateRange,
  formatDate,
  formatPercentage
} from '@/common/components/common-relations/view-layouts/dashboard-layout/utils/dashboardUtils'

// Re-export the IRM config for convenience
export { IRM_DASHBOARD_CONFIG } from '@/common/components/common-relations/view-layouts/dashboard-layout/types/dashboardTypes'
