/**
 * IRM-specific KPI configuration
 * Customizes labels and visibility for Investment Relations Management
 */

import {
  KpiLabels,
  KpiVisibility
} from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/OverviewMetricsWidgets'
import type { TabKpiLabel } from '@/common/components/common-relations/view-layouts/analytics-layout/types/tabKpiLabels'
import type { LeadsTabKpiLabels } from '@/common/components/common-relations/view-layouts/analytics-layout/leads/LeadsTabLayout'
import type { AccountsTabKpiLabels } from '@/common/components/common-relations/view-layouts/analytics-layout/accounts/AccountsTabLayout'
import type { OpportunitiesTabKpiLabels } from '@/common/components/common-relations/view-layouts/analytics-layout/opportunities/OpportunitiesTabLayout'
import type { ContactsTabKpiLabels } from '@/common/components/common-relations/view-layouts/analytics-layout/contacts/ContactsTabLayout'

/** Shared copy reused across overview and entity tabs */
const IRM_SHARED: Record<string, TabKpiLabel> = {
  allLeads: { title: 'Total Investment Leads', description: 'All investment leads' },
  allAccounts: { title: 'Investment Accounts', description: 'All investment accounts' },
  allOpportunities: { title: 'Investment Opportunities', description: 'All pipeline opportunities' },
  allContacts: { title: 'Investment Contacts', description: 'All investment contacts' },
  leadsConverted: { title: 'Lead to Opportunity Rate', description: 'Leads converted to opportunities' },
  winRate: { title: 'Opportunity Win Rate', description: 'Won share of all opportunities' },
  avgWonDealValue: { title: 'Avg Won Opportunity Value', description: 'Average won deal value' },
  totalWonDealValue: { title: 'Total Won Opportunity Value', description: 'Total won deal value' }
}

/**
 * Custom labels for IRM overview — entity names match GraphQL aggregates in useOverviewData
 * (InvestmentLead, InvestmentAccount, InvestmentOpportunity, InvestmentContact).
 */
export const IRM_KPI_LABELS: KpiLabels = {
  leads: IRM_SHARED.allLeads,
  accounts: IRM_SHARED.allAccounts,
  opportunities: IRM_SHARED.allOpportunities,
  contacts: IRM_SHARED.allContacts,
  leadToOpportunityRate: IRM_SHARED.leadsConverted,
  opportunityWinRate: IRM_SHARED.winRate,
  avgDealSize: IRM_SHARED.avgWonDealValue,
  totalWonRevenue: IRM_SHARED.totalWonDealValue
}

export const IRM_LEADS_TAB_KPI_LABELS: LeadsTabKpiLabels = {
  totalLeads: IRM_SHARED.allLeads,
  convertedLeads: { title: 'Converted Leads', description: 'Leads that became opportunities' },
  conversionRate: { title: 'Conversion Rate', description: IRM_SHARED.leadsConverted.description },
  newThisMonth: { title: 'New This Month', description: 'New investment leads this month' }
}

export const IRM_ACCOUNTS_TAB_KPI_LABELS: AccountsTabKpiLabels = {
  totalAccounts: IRM_SHARED.allAccounts,
  accountsWithOpportunities: { title: 'Accounts with Opportunities', description: 'Accounts with pipeline deals' },
  avgOpportunitiesPerAccount: { title: 'Avg. Opportunities', description: 'Pipeline deals per account' },
  newThisMonth: { title: 'New This Month', description: 'New investment accounts this month' }
}

export const IRM_OPPORTUNITIES_TAB_KPI_LABELS: OpportunitiesTabKpiLabels = {
  totalOpportunities: IRM_SHARED.allOpportunities,
  totalValue: { title: 'Total Pipeline Value', description: 'Combined pipeline value' },
  wonOpportunities: { title: 'Won Opportunities', description: 'Closed-won investment deals' },
  winRate: { title: 'Win Rate', description: IRM_SHARED.winRate.description },
  avgDealSize: { title: 'Avg. Deal Size', description: IRM_SHARED.avgWonDealValue.description },
  newThisPeriod: { title: 'New This Period', description: 'New pipeline opportunities' },
  avgOpportunityValue: { title: 'Avg. Opportunity Value', description: 'Average deal value' },
  conversionRate: { title: 'Conversion Rate', description: IRM_SHARED.leadsConverted.description }
}

export const IRM_CONTACTS_TAB_KPI_LABELS: ContactsTabKpiLabels = {
  totalContacts: IRM_SHARED.allContacts,
  newThisMonth: { title: 'New This Month', description: 'New investment contacts this month' },
  growthRate: { title: 'Monthly Growth', description: 'Month-over-month contact growth' },
  avgPerAccount: { title: 'Average per Account', description: 'Contacts per investment account' }
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
