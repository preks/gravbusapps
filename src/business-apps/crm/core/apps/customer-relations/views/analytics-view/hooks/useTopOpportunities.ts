/**
 * Re-export shared useTopOpportunities hook from common location
 * This reduces code duplication between CRM and IRM modules
 */
export {
  useTopOpportunities,
  type TopOpportunity
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'
