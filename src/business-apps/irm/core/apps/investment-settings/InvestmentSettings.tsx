import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  TrendUpIcon,
  FlowArrowIcon,
  AddressBookIcon,
  ListChecksIcon,
  DatabaseIcon,
  FileHtmlIcon,
  BuildingsIcon,
  FileTextIcon
} from '@phosphor-icons/react'
import { SettingsLayout } from '@/components/layout/settings-layout'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo } from '@/common/utils/navigationUtils'
import LeadDataPage from './pages/lead-data/LeadDataPage'
import ActivityDataPage from './pages/activity-data/ActivityDataPage'
import OpportunityDataPage from './pages/opportunity-data/OpportunityDataPage'
import AccountDataPage from './pages/account-data/AccountDataPage'
import InvestmentDataPage from './pages/investment-data/InvestmentDataPage'
import InvestmentGroupsTypesPage from './pages/investment-groups-types/InvestmentGroupsTypesPage'
import InvestmentLiquidFundTypesPage from './pages/investment-liquid-fund-types/InvestmentLiquidFundTypesPage'
import InvestmentSpecificDataPage from './pages/investment-specific-data/InvestmentSpecificDataPage'
import InvestmentCompanyExecutiveTypesPage from './pages/investment-company-executive-types'
import TaskTemplateDataPage from './pages/task-template-data/TaskTemplateDataPage'
import DocumentDataPage from './pages/document-data/DocumentDataPage'
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

  // Navigate to child page (forward) or back to settings home
  const handleInlinePageChange = (page: { key: string; tab?: string } | null) => {
    if (page === null) {
      // Going back to settings home - use replaceState to avoid creating new history entry
      setInlinePage(null)
      const settingsUrl = globalThis.location.pathname
      globalThis.history.replaceState({}, '', settingsUrl)
      return
    }

    // Going forward to child page - create new history entry
    setInlinePage(page)

    const newSearchParams = new URLSearchParams(globalThis.location.search)
    newSearchParams.set('page', page.key)
    if (page.tab) {
      newSearchParams.set('tab', page.tab)
    } else {
      newSearchParams.delete('tab')
    }

    const newURL = `${globalThis.location.pathname}?${newSearchParams.toString()}`
    globalThis.history.pushState({}, '', newURL)
  }

  const cards = [
    {
      title: t('crm.investment_structure', 'Investment Structure'),
      description: t(
        'crm.investment_structure_description',
        'Manage investment groups, types, and field configuration'
      ),
      icon: DatabaseIcon,
      iconSize: 'md' as const,
      entries: [
        {
          label: t('crm.investment_groups_and_types', 'Groups & Types'),
          onClick: () => handleInlinePageChange({ key: 'investment-groups-types' })
        },
        {
          label: t('crm.investment_liquid_fund_types', 'Liquid Fund Types'),
          onClick: () => handleInlinePageChange({ key: 'investment-liquid-fund-types' })
        },
        {
          label: t('crm.investment_configuration', 'Field Configuration'),
          onClick: () => handleInlinePageChange({ key: 'investment-data' })
        }
      ]
    },
    {
      title: t('crm.investment_reference_data', 'Investment Reference Data'),
      description: t('crm.investment_reference_data_description', 'Manage investment roles, statuses, and stake types'),
      icon: TrendUpIcon,
      iconSize: 'md' as const,
      entries: [
        {
          label: t('crm.investment_roles', 'Roles'),
          onClick: () => handleInlinePageChange({ key: 'investment-specific-data', tab: 'roles' })
        },
        {
          label: t('crm.investment_statuses', 'Statuses'),
          onClick: () => handleInlinePageChange({ key: 'investment-specific-data', tab: 'statuses' })
        },
        {
          label: t('crm.investment_stake_types', 'Stake Types'),
          onClick: () => handleInlinePageChange({ key: 'investment-specific-data', tab: 'stake-types' })
        },
        {
          label: t('crm.investment_company_executive_types', 'Executive Types'),
          onClick: () => handleInlinePageChange({ key: 'investment-company-executive-types' })
        }
      ]
    },
    {
      title: t('crm.templates', 'Templates'),
      description: t('crm.templates_description', 'Manage folder and task templates for investments'),
      icon: FileHtmlIcon,
      iconSize: 'md' as const,
      entries: [
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
        },
        {
          label: t('crm.pipeline_stage_types', 'Stage Types'),
          onClick: () => handleInlinePageChange({ key: 'opportunity-data', tab: 'stage-types' })
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
          onClick: () => handleInlinePageChange({ key: 'activity', tab: 'activity-types' })
        },
        {
          label: t('crm.task_types', 'Task Types'),
          onClick: () => handleInlinePageChange({ key: 'activity', tab: 'task-types' })
        },
        {
          label: t('crm.task_priorities', 'Task Priorities'),
          onClick: () => handleInlinePageChange({ key: 'activity', tab: 'task-priorities' })
        }
      ]
    }
  ]

  if (inlinePage?.key === 'investment-groups-types') {
    return (
      <InvestmentGroupsTypesPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentGroupsTypesSettings`}
        onBack={() => handleInlinePageChange(null)}
      />
    )
  }

  if (inlinePage?.key === 'investment-liquid-fund-types') {
    return (
      <InvestmentLiquidFundTypesPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentLiquidFundTypesSettings`}
        onBack={() => handleInlinePageChange(null)}
      />
    )
  }

  if (inlinePage?.key === 'investment-data') {
    return (
      <InvestmentDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentDataSettings`}
        onBack={() => handleInlinePageChange(null)}
      />
    )
  }

  if (inlinePage?.key === 'investment-specific-data') {
    const initialTab = inlinePage.tab as 'roles' | 'statuses' | 'stake-types' | undefined
    return (
      <InvestmentSpecificDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentSpecificSettings`}
        onBack={() => handleInlinePageChange(null)}
        initialTab={initialTab || 'roles'}
      />
    )
  }

  if (inlinePage?.key === 'investment-company-executive-types') {
    return (
      <InvestmentCompanyExecutiveTypesPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentCompanyExecutiveTypesSettings`}
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

  if (inlinePage?.key === 'activity') {
    return (
      <ActivityDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentActivitySettings`}
        onBack={() => handleInlinePageChange(null)}
      />
    )
  }

  if (inlinePage?.key === 'opportunity-data') {
    const initialTab = inlinePage.tab as 'pipelines' | 'statuses' | 'forecasts' | 'stage-types' | undefined
    return (
      <OpportunityDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentOpportunitySettings`}
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
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentAccountSettings`}
        onBack={() => handleInlinePageChange(null)}
        initialTab={initialTab || 'priorities'}
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

  if (inlinePage?.key === 'document-data') {
    return (
      <DocumentDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentDocumentSettings`}
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
      headerDescription={t(
        'crm.investment_settings_description',
        'Configure and manage all investment relations management settings'
      )}
      cards={cards}
      className={className}
      prefixDataTestId={prefixDataTestId}
      searchPlaceholder={t('common.search_placeholder', 'Search settings...')}
      onBack={() => navigateTo('/platform/use')}
    />
  )
}

export default InvestmentSettings
export { InvestmentSettings }
