/**
 * IRM-specific KPI configuration
 * Customizes labels and visibility for Investment Relations Management
 */

import {
  KpiLabels,
  KpiVisibility
} from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/OverviewMetricsWidgets'

/**
 * Custom labels for IRM - uses investment terminology instead of CRM
 *
 * Examples:
 * - "Investors" instead of "Leads"
 * - "Investment Accounts" instead of "Accounts"
 * - "Investment Opportunities" instead of "Opportunities"
 */
export const IRM_KPI_LABELS: KpiLabels = {
  leads: {
    title: 'Total Investors',
    description: 'Active investors in system'
  },
  accounts: {
    title: 'Investment Accounts',
    description: 'Active investment accounts'
  },
  opportunities: {
    title: 'Investment Opportunities',
    description: 'Active investment opportunities'
  },
  contacts: {
    title: 'Investment Contacts',
    description: 'Active contacts in system'
  },
  leadToOpportunityRate: {
    title: 'Investor Conversion Rate',
    description: 'Investor to opportunity conversion'
  },
  opportunityWinRate: {
    title: 'Investment Success Rate',
    description: 'Investment closing success rate'
  },
  avgDealSize: {
    title: 'Avg Investment Size',
    description: 'Average investment opportunity value'
  },
  totalWonRevenue: {
    title: 'Total Investment Value',
    description: 'Total value from closed investments'
  }
}

/**
 * Optional: Hide specific KPIs for IRM
 * Set to false to hide a KPI
 *
 * Example: Hide "Total Investors" KPI
 * leads: false
 */
export const IRM_KPI_VISIBILITY: KpiVisibility = {
  // All KPIs shown by default
  // Uncomment to hide specific KPIs:
  // leads: false,
  // accounts: false,
  // opportunities: false,
  // contacts: false,
  // leadToOpportunityRate: false,
  // opportunityWinRate: false,
  // avgDealSize: false,
  // totalWonRevenue: false
}
