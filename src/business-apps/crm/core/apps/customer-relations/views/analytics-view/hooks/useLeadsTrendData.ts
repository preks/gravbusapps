/**
 * Re-export shared useLeadsTrendData hook from common location
 * This reduces code duplication between CRM and IRM modules
 */
export {
  useLeadsTrendData,
  type LeadsTrendData,
  type TimeFilter
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'
