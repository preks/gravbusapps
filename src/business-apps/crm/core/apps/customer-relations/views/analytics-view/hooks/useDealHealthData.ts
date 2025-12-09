/**
 * Re-export shared useDealHealthData hook from common location
 * This reduces code duplication between CRM and IRM modules
 */
export { useDealHealthData, type DealHealthData, type DealHealthItem } from '@/common/hooks/analytics/useDealHealthData'
