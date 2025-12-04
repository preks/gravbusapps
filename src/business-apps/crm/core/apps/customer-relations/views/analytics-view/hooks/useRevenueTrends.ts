/**
 * Re-export shared useRevenueTrends hook from common location
 * This reduces code duplication between CRM and IRM modules
 */
export { useRevenueTrends, type RevenueTrendData, type TimeFilter } from '@/common/hooks/analytics/useRevenueTrends'
