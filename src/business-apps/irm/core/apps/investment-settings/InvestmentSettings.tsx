import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  TrendUpIcon,
  FlowArrowIcon,
  AddressBookIcon,
  ListChecksIcon,
  DatabaseIcon,
  FileHtmlIcon
} from '@phosphor-icons/react'
import { SettingsLayout } from '@/components/layout/settings-layout'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import LeadDataPage from './pages/lead-data/LeadDataPage'
import EngagementDataPage from './pages/engagement-data/EngagementDataPage'
import PipelineDataPage from './pages/pipeline-data/PipelineDataPage'
import InvestmentDataPage from './pages/investment-data/InvestmentDataPage'
import TemplateDataPage from './pages/template-data/TemplateDataPage'
import TaskTemplateDataPage from './pages/task-template-data/TaskTemplateDataPage'
import { FolderTemplateDataPage, ModuleType } from '@/common/components/common-relations/setting-pages/folder-templates'

export interface InvestmentSettingsProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
}

type LeadDataTab = 'ratings' | 'statuses' | 'sources'

function isValidLeadTab(value: unknown): value is LeadDataTab {
  return value === 'ratings' || value === 'statuses' || value === 'sources'
}

const InvestmentSettings: React.FC<InvestmentSettingsProps> = ({ className, prefixDataTestId, ...context }) => {
  const { t } = useTranslation()
  const [inlinePage, setInlinePage] = React.useState<{ key: string; tab?: string } | null>(null)

  // Handle query parameters on component mount and browser back/forward
  React.useEffect(() => {
    const parseUrlAndSetPage = () => {
      const urlParams = new URLSearchParams(window.location.search)
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

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  // Update URL when inline page changes
  const handleInlinePageChange = (page: { key: string; tab?: string } | null) => {
    setInlinePage(page)

    const newSearchParams = new URLSearchParams(window.location.search)

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
    const newURL = `${window.location.pathname}${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`
    window.history.replaceState({}, '', newURL)
  }

  const cards = [
    {
      title: t('crm.investment_data', 'Investment Data'),
      description: t(
        'crm.investment_data_description',
        'Configure form fields, record fields, and tile fields for investments'
      ),
      icon: DatabaseIcon,
      iconSize: 'md' as const,
      entries: [
        {
          label: t('crm.investment_configuration', 'Investment Configuration'),
          onClick: () => handleInlinePageChange({ key: 'investment-data' })
        }
      ]
    },
    {
      title: t('crm.templates', 'Templates'),
      description: t('crm.templates_description', 'Manage document and task templates for investments'),
      icon: FileHtmlIcon,
      iconSize: 'md' as const,
      entries: [
        {
          label: t('crm.document_templates', 'Document Templates'),
          onClick: () => handleInlinePageChange({ key: 'template-data' })
        },
        {
          label: t('crm.folder_templates', 'Folder Templates'),
          onClick: () => handleInlinePageChange({ key: 'folder-templates' })
        },
        {
          label: t('crm.task_templates', 'Task Templates'),
          onClick: () => handleInlinePageChange({ key: 'task-template-data' })
        }
      ]
    },
    {
      title: t('crm.opportunity_pipelines', 'Opportunity Pipelines'),
      description: t('crm.opportunity_pipelines_description', 'Manage opportunity pipelines and sales processes'),
      icon: FlowArrowIcon,
      iconSize: 'md' as const,
      entries: [
        {
          label: t('crm.pipelines', 'Pipelines'),
          onClick: () => handleInlinePageChange({ key: 'pipeline' })
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
      description: t('crm.engagement_description', 'Manage activity types, task types, priorities, and statuses'),
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
        },
        {
          label: t('crm.task_statuses', 'Task Statuses'),
          onClick: () => handleInlinePageChange({ key: 'engagement', tab: 'task-statuses' })
        }
      ]
    }
  ]

  if (inlinePage?.key === 'investment-data') {
    return (
      <InvestmentDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentDataSettings`}
        onBack={() => handleInlinePageChange(null)}
      />
    )
  }

  if (inlinePage?.key === 'template-data') {
    return (
      <TemplateDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentTemplateSettings`}
        onBack={() => handleInlinePageChange(null)}
      />
    )
  }

  if (inlinePage?.key === 'task-template-data') {
    return (
      <TaskTemplateDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentTaskTemplateSettings`}
        onBack={() => handleInlinePageChange(null)}
      />
    )
  }

  if (inlinePage?.key === 'lead') {
    const initialTab: LeadDataTab = isValidLeadTab(inlinePage.tab) ? inlinePage.tab : 'ratings'

    return (
      <LeadDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentLeadSettings`}
        initialTab={initialTab}
        onBack={() => handleInlinePageChange(null)}
      />
    )
  }

  if (inlinePage?.key === 'engagement') {
    return (
      <EngagementDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentEngagementSettings`}
        onBack={() => handleInlinePageChange(null)}
      />
    )
  }

  if (inlinePage?.key === 'pipeline') {
    return (
      <PipelineDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentPipelineSettings`}
        onBack={() => handleInlinePageChange(null)}
      />
    )
  }

  if (inlinePage?.key === 'folder-templates') {
    return (
      <FolderTemplateDataPage
        accessToken={context.accessToken}
        moduleType={ModuleType.IRM}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentFolderTemplateSettings`}
        onBack={() => handleInlinePageChange(null)}
      />
    )
  }

  return (
    <SettingsLayout
      headerPhosphorIcon={{
        icon: TrendUpIcon,
        variant: 'premium',
        size: 'lg',
        label: 'Investment Settings'
      }}
      headerLabel={t('crm.investment_settings', 'Investment Settings')}
      cards={cards}
      className={className}
      prefixDataTestId={prefixDataTestId}
      searchPlaceholder={t('common.search_placeholder', 'Search settings...')}
    />
  )
}

export default InvestmentSettings
export { InvestmentSettings }
