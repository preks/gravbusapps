import { ActivityNavigationConfig } from '@/common/components/common-relations/view-layouts/dashboard-layout/overview/widgets/ActivitySummary'

export const crmActivityNavigationConfig: ActivityNavigationConfig = {
  opportunityUrl: '/platform/crm/opportunity-record',
  leadUrl: '/platform/crm/lead-record',
  contactUrl: '/platform/crm/contact-record',
  accountUrl: '/platform/crm/account-record',
  sourceParam: 'customer-relations'
}
