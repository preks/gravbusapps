/**
 * Re-export shared useTopDeals hook from common location
 * This reduces code duplication between CRM and IRM modules
 */
export { useTopDeals, type TopDeal } from '@/common/hooks/analytics/useTopDeals'
