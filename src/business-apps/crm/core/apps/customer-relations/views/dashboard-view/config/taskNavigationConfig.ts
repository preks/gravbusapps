import { TaskNavigationConfig } from '@/common/components/common-relations/view-layouts/dashboard-layout/overview/widgets/TaskSummary'

export const crmTaskNavigationConfig: TaskNavigationConfig = {
  opportunityUrl: '/platform/crm/opportunity-record',
  leadUrl: '/platform/crm/lead-record',
  contactUrl: '/platform/crm/contact-record',
  accountUrl: '/platform/crm/account-record',
  sourceParam: 'customer-relations'
}
