import React from 'react'
import { useTranslation } from 'react-i18next'
import { PiUsers, PiFlowArrow, PiAddressBook, PiListChecks } from 'react-icons/pi'
import { SettingsLayout } from '@/components/layout/settings-layout'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface CustomerSettingsProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
}

const DATA_TEST_ID = 'CustomerSettings'

const CustomerSettings: React.FC<CustomerSettingsProps> = ({ 
  className, 
  prefixDataTestId,
  ...context
}) => {
  const { t } = useTranslation()

  const cards = [
    {
      title: t('crm.opportunity_pipelines', 'Opportunity Pipelines'),
      description: t('crm.opportunity_pipelines_description', 'Manage opportunity pipelines and sales processes'),
      icon: PiFlowArrow,
      iconSize: 'md' as const,
      entries: [
        {
          label: t('crm.pipelines', 'Pipelines'),
          basePath: '/platform/mdm/pipeline-data',
          params: { sourceApp: 'CRM' }
        }
      ]
    },
    {
      title: t('crm.lead_data', 'Lead Data'),
      description: t('crm.lead_data_description', 'Manage lead ratings, statuses, and sources'),
      icon: PiAddressBook,
      iconSize: 'md' as const,
      entries: [
        {
          label: t('crm.lead_ratings', 'Ratings'),
          basePath: '/platform/mdm/lead-data',
          params: { tab: 'ratings', sourceApp: 'CRM' }
        },
        {
          label: t('crm.lead_statuses', 'Statuses'),
          basePath: '/platform/mdm/lead-data',
          params: { tab: 'statuses', sourceApp: 'CRM' }
        },
        {
          label: t('crm.lead_sources', 'Sources'),
          basePath: '/platform/mdm/lead-data',
          params: { tab: 'sources', sourceApp: 'CRM' }
        }
      ]
    },
    {
      title: t('crm.engagement_data', 'Engagement Data'),
      description: t('crm.engagement_description', 'Manage activity types, task types, priorities, and statuses'),
      icon: PiListChecks,
      iconSize: 'md' as const,
      entries: [
        {
          label: t('crm.activity_types', 'Activity Types'),
          basePath: '/platform/mdm/engagement-data',
          params: { tab: 'activity-types', sourceApp: 'CRM' }
        },
        {
          label: t('crm.task_types', 'Task Types'),
          basePath: '/platform/mdm/engagement-data',
          params: { tab: 'task-types', sourceApp: 'CRM' }
        },
        {
          label: t('crm.task_priorities', 'Task Priorities'),
          basePath: '/platform/mdm/engagement-data',
          params: { tab: 'task-priorities', sourceApp: 'CRM' }
        },
        {
          label: t('crm.task_statuses', 'Task Statuses'),
          basePath: '/platform/mdm/engagement-data',
          params: { tab: 'task-statuses', sourceApp: 'CRM' }
        }
      ]
    }
  ]

  return (
    <SettingsLayout
      headerPhosphorIcon={{
        icon: PiUsers,
        variant: 'info',
        size: 'lg',
        label: 'Customer Settings'
      }}
      headerLabel={t('crm.customer_settings', 'Customer Settings')}
      cards={cards}
      className={className}
      prefixDataTestId={prefixDataTestId}
      searchPlaceholder={t('common.search_placeholder', 'Search settings...')}
    />
  )
}

export default CustomerSettings
export { CustomerSettings } 