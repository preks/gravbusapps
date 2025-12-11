import React from 'react'
import { useTranslation } from 'react-i18next'
import { PiUsers, PiFlowArrow, PiAddressBook, PiListChecks, PiCalendar } from 'react-icons/pi'
import { SettingsLayout } from '@/components/layout/settings-layout'
// inline pipeline card rendering moved to PipelineDataPage
import LeadDataPage from './pages/lead-data/LeadDataPage'
import EngagementDataPage from './pages/engagement-data/EngagementDataPage'
import PipelineDataPage from './pages/pipeline-data/PipelineDataPage'
import TaskTemplateDataPage from './pages/task-template-data/TaskTemplateDataPage'
import { FolderTemplateDataPage, ModuleType } from '@/common/components/common-relations/setting-pages/folder-templates'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface CustomerSettingsProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
}

// Removed unused DATA_TEST_ID

const CustomerSettings: React.FC<CustomerSettingsProps> = ({ className, prefixDataTestId, ...context }) => {
  const { t } = useTranslation()
  const [inlinePage, setInlinePage] = React.useState<{ key: string; tab?: string } | null>(null)

  const cards = [
    {
      title: t('crm.opportunity_pipelines', 'Opportunity Pipelines'),
      description: t('crm.opportunity_pipelines_description', 'Manage opportunity pipelines and sales processes'),
      icon: PiFlowArrow,
      iconSize: 'md' as const,
      entries: [
        {
          label: t('crm.pipelines', 'Pipelines'),
          onClick: () => setInlinePage({ key: 'pipeline' })
        }
      ]
    },
    {
      title: t('crm.templates', 'Templates'),
      description: t('crm.templates_description', 'Manage document and task templates for customers'),
      icon: PiCalendar,
      iconSize: 'md' as const,
      entries: [
        {
          label: t('crm.document_templates', 'Document Templates'),
          onClick: () => setInlinePage({ key: 'document-templates' })
        },
        {
          label: t('crm.folder_templates', 'Folder Templates'),
          onClick: () => setInlinePage({ key: 'folder-templates' })
        },
        {
          label: t('crm.task_templates', 'Task Templates'),
          onClick: () => setInlinePage({ key: 'task-templates' })
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
          onClick: () => setInlinePage({ key: 'lead', tab: 'ratings' })
        },
        {
          label: t('crm.lead_statuses', 'Statuses'),
          onClick: () => setInlinePage({ key: 'lead', tab: 'statuses' })
        },
        {
          label: t('crm.lead_sources', 'Sources'),
          onClick: () => setInlinePage({ key: 'lead', tab: 'sources' })
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
          onClick: () => setInlinePage({ key: 'engagement', tab: 'activity-types' })
        },
        {
          label: t('crm.task_types', 'Task Types'),
          onClick: () => setInlinePage({ key: 'engagement', tab: 'task-types' })
        },
        {
          label: t('crm.task_priorities', 'Task Priorities'),
          onClick: () => setInlinePage({ key: 'engagement', tab: 'task-priorities' })
        },
        {
          label: t('crm.task_statuses', 'Task Statuses'),
          onClick: () => setInlinePage({ key: 'engagement', tab: 'task-statuses' })
        }
      ]
    }
  ]

  if (inlinePage?.key === 'lead') {
    return (
      <LeadDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-CustomerLeadSettings`}
        initialTab={(inlinePage.tab as any) || 'ratings'}
        onBack={() => setInlinePage(null)}
      />
    )
  }

  if (inlinePage?.key === 'engagement') {
    return (
      <EngagementDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-CustomerEngagementSettings`}
        onBack={() => setInlinePage(null)}
      />
    )
  }

  if (inlinePage?.key === 'pipeline') {
    return (
      <PipelineDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-CustomerPipelineSettings`}
        onBack={() => setInlinePage(null)}
      />
    )
  }

  if (inlinePage?.key === 'task-templates') {
    return (
      <TaskTemplateDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-CustomerTaskTemplateSettings`}
        onBack={() => setInlinePage(null)}
      />
    )
  }

  if (inlinePage?.key === 'folder-templates') {
    return (
      <FolderTemplateDataPage
        accessToken={context.accessToken}
        moduleType={ModuleType.CRM}
        prefixDataTestId={`${prefixDataTestId || ''}-CustomerFolderTemplateSettings`}
        onBack={() => setInlinePage(null)}
      />
    )
  }

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

// removed inlined hook bundle; moved to dedicated components to satisfy Rules of Hooks
