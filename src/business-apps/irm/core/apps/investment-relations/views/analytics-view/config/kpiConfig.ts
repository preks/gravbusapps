/**
 * IRM-specific KPI configuration
 * Customizes labels and visibility for Investment Relations Management
 */

import {
  KpiLabels,
  KpiVisibility
} from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/OverviewMetricsWidgets'

/**
 * Custom labels for IRM — entity names match GraphQL aggregates in useOverviewData
 * (InvestmentLead, InvestmentAccount, InvestmentOpportunity, InvestmentContact).
 */
export const IRM_KPI_LABELS: KpiLabels = {
  leads: {
    title: 'Total Investment Leads',
    description: 'Non-deleted investment leads in the system'
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
    title: 'Lead to Opportunity Rate',
    description: 'Opportunity count as a percentage of lead count'
  },
  opportunityWinRate: {
    title: 'Opportunity Win Rate',
    description: 'Won investment opportunities as a share of all opportunities'
  },
  avgDealSize: {
    title: 'Avg Won Opportunity Value',
    description: 'Average estimated amount on won opportunities'
  },
  totalWonRevenue: {
    title: 'Total Won Opportunity Value',
    description: 'Sum of estimated amounts on won opportunities'
  }
}

/**
 * Optional: Hide specific KPIs for IRM
 * Set to false to hide a KPI
 *
 * Example: Hide "Total Investment Leads" KPI
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
