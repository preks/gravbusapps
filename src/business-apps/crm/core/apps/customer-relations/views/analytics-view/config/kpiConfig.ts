/**
 * CRM-specific KPI configuration
 * Uses default labels from OverviewMetricsWidgets (CRM terminology)
 */

import {
  KpiLabels,
  KpiVisibility
} from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/OverviewMetricsWidgets'

/**
 * CRM uses default labels:
 * - Total Leads
 * - Total Accounts
 * - Total Opportunities
 * - Total Contacts
 * - Lead to Opportunity Rate
 * - Opportunity Win Rate
 * - Avg Opportunity Size
 * - Total Won Revenue
 *
 * No customization needed - pass undefined or {} to use defaults
 */
export const CRM_KPI_LABELS: KpiLabels | undefined = undefined

/**
 * CRM shows all KPIs by default
 * No customization needed - pass undefined or {} to show all
 */
export const CRM_KPI_VISIBILITY: KpiVisibility | undefined = undefined

/**
 * Example: Custom labels if needed for specific CRM scenarios
 */
export const CRM_CUSTOM_KPI_LABELS: KpiLabels = {
  // Uncomment to customize specific labels:
  // leads: {
  //   title: 'Sales Leads',
  //   description: 'Active sales leads in pipeline'
  // },
  // accounts: {
  //   title: 'Customer Accounts',
  //   description: 'Active customer accounts'
  // }
}
