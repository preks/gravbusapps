import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  UsersIcon,
  FlowArrowIcon,
  AddressBookIcon,
  ListChecksIcon,
  CalendarIcon,
  BuildingsIcon,
  FileTextIcon
} from '@phosphor-icons/react'
import { SettingsLayout } from '@/components/layout/settings-layout'
// inline pipeline card rendering moved to PipelineDataPage
import LeadDataPage from './pages/lead-data/LeadDataPage'
import EngagementDataPage from './pages/engagement-data/EngagementDataPage'
import OpportunityDataPage from './pages/opportunity-data/OpportunityDataPage'
import AccountDataPage from './pages/account-data/AccountDataPage'
import TaskTemplateDataPage from './pages/task-template-data/TaskTemplateDataPage'
import DocumentDataPage from './pages/document-data/DocumentDataPage'
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

  // Handle query parameters on component mount and browser back/forward
  React.useEffect(() => {
    const parseUrlAndSetPage = () => {
      const urlParams = new URLSearchParams(globalThis.location.search)
      const page = urlParams.get('page')
      const tab = urlParams.get('tab')

      if (page) {
        setInlinePage({ key: page, tab: tab || undefined })
      } else {
        setInlinePage(null)
      }
    }

    // Initial mount
    parseUrlAndSetPage()

    // Handle browser back/forward navigation
    const handlePopState = () => {
      parseUrlAndSetPage()
    }

    globalThis.addEventListener('popstate', handlePopState)

    return () => {
      globalThis.removeEventListener('popstate', handlePopState)
    }
  }, [])

  // Update URL when inline page changes
  const handleInlinePageChange = (page: { key: string; tab?: string } | null) => {
    setInlinePage(page)

    const newSearchParams = new URLSearchParams(globalThis.location.search)

    if (page) {
      newSearchParams.set('page', page.key)
      if (page.tab) {
        newSearchParams.set('tab', page.tab)
      } else {
        newSearchParams.delete('tab')
      }
    } else {
      newSearchParams.delete('page')
      newSearchParams.delete('tab')
    }

    // Update URL without page reload
    const newURL = `${globalThis.location.pathname}${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`
    globalThis.history.replaceState({}, '', newURL)
  }

  const cards = [
    {
      title: t('crm.opportunity_data', 'Opportunity Data'),
      description: t('crm.opportunity_data_description', 'Manage opportunity pipelines, statuses, and forecasts'),
      icon: FlowArrowIcon,
      iconSize: 'md' as const,
      entries: [
        {
          label: t('crm.pipelines', 'Pipelines'),
          onClick: () => handleInlinePageChange({ key: 'opportunity-data', tab: 'pipelines' })
        },
        {
          label: t('crm.opportunity_statuses', 'Statuses'),
          onClick: () => handleInlinePageChange({ key: 'opportunity-data', tab: 'statuses' })
        },
        {
          label: t('crm.opportunity_forecasts', 'Forecasts'),
          onClick: () => handleInlinePageChange({ key: 'opportunity-data', tab: 'forecasts' })
        }
      ]
    },
    {
      title: t('crm.account_data', 'Account Data'),
      description: t('crm.account_data_description', 'Manage account priorities and types'),
      icon: BuildingsIcon,
      iconSize: 'md' as const,
      entries: [
        {
          label: t('crm.account_priorities', 'Priorities'),
          onClick: () => handleInlinePageChange({ key: 'account-data', tab: 'priorities' })
        },
        {
          label: t('crm.account_types', 'Types'),
          onClick: () => handleInlinePageChange({ key: 'account-data', tab: 'types' })
        }
      ]
    },
    {
      title: t('crm.templates', 'Templates'),
      description: t('crm.templates_description', 'Manage folder and task templates for customers'),
      icon: CalendarIcon,
      iconSize: 'md' as const,
      entries: [
        {
          label: t('crm.folder_templates', 'Folder Templates'),
          onClick: () => handleInlinePageChange({ key: 'folder-templates' })
        },
        {
          label: t('crm.task_templates', 'Task Templates'),
          onClick: () => handleInlinePageChange({ key: 'task-templates' })
        }
      ]
    },
    {
      title: t('crm.document_data', 'Document Data'),
      description: t('crm.document_data_description', 'Manage document groups and types'),
      icon: FileTextIcon,
      iconSize: 'md' as const,
      entries: [
        {
          label: t('crm.document_groups_and_types', 'Groups & Types'),
          onClick: () => handleInlinePageChange({ key: 'document-data' })
        }
      ]
    },
    {
      title: t('crm.lead_data', 'Lead Data'),
      description: t('crm.lead_data_description', 'Manage lead ratings, statuses, and sources'),
      icon: AddressBookIcon,
      iconSize: 'md' as const,
      entries: [
        {
          label: t('crm.lead_ratings', 'Ratings'),
          onClick: () => handleInlinePageChange({ key: 'lead', tab: 'ratings' })
        },
        {
          label: t('crm.lead_statuses', 'Statuses'),
          onClick: () => handleInlinePageChange({ key: 'lead', tab: 'statuses' })
        },
        {
          label: t('crm.lead_sources', 'Sources'),
          onClick: () => handleInlinePageChange({ key: 'lead', tab: 'sources' })
        }
      ]
    },
    {
      title: t('crm.engagement_data', 'Engagement Data'),
      description: t('crm.engagement_description', 'Manage activity types, task types, and priorities'),
      icon: ListChecksIcon,
      iconSize: 'md' as const,
      entries: [
        {
          label: t('crm.activity_types', 'Activity Types'),
          onClick: () => handleInlinePageChange({ key: 'engagement', tab: 'activity-types' })
        },
        {
          label: t('crm.task_types', 'Task Types'),
          onClick: () => handleInlinePageChange({ key: 'engagement', tab: 'task-types' })
        },
        {
          label: t('crm.task_priorities', 'Task Priorities'),
          onClick: () => handleInlinePageChange({ key: 'engagement', tab: 'task-priorities' })
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
        onBack={() => handleInlinePageChange(null)}
      />
    )
  }

  if (inlinePage?.key === 'engagement') {
    return (
      <EngagementDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-CustomerEngagementSettings`}
        onBack={() => handleInlinePageChange(null)}
      />
    )
  }

  if (inlinePage?.key === 'opportunity-data') {
    const initialTab = inlinePage.tab as 'pipelines' | 'statuses' | 'forecasts' | undefined
    return (
      <OpportunityDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-CustomerOpportunitySettings`}
        onBack={() => handleInlinePageChange(null)}
        initialTab={initialTab || 'pipelines'}
      />
    )
  }

  if (inlinePage?.key === 'account-data') {
    const initialTab = inlinePage.tab as 'priorities' | 'types' | undefined
    return (
      <AccountDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-CustomerAccountSettings`}
        onBack={() => handleInlinePageChange(null)}
        initialTab={initialTab || 'priorities'}
      />
    )
  }

  if (inlinePage?.key === 'task-templates') {
    return (
      <TaskTemplateDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-CustomerTaskTemplateSettings`}
        onBack={() => handleInlinePageChange(null)}
      />
    )
  }

  if (inlinePage?.key === 'folder-templates') {
    return (
      <FolderTemplateDataPage
        accessToken={context.accessToken}
        moduleType={ModuleType.CRM}
        prefixDataTestId={`${prefixDataTestId || ''}-CustomerFolderTemplateSettings`}
        onBack={() => handleInlinePageChange(null)}
      />
    )
  }

  if (inlinePage?.key === 'document-data') {
    return (
      <DocumentDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-CustomerDocumentSettings`}
        onBack={() => handleInlinePageChange(null)}
      />
    )
  }

  return (
    <SettingsLayout
      headerPhosphorIcon={{
        icon: UsersIcon,
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
