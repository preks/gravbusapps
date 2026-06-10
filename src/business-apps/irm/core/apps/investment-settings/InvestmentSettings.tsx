import React from 'react'
import { useTranslation } from 'react-i18next'
import { useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import investmentSettingsI18n from './_i18n'
import {
  GearIcon,
  TrendUpIcon,
  FlowArrowIcon,
  AddressBookIcon,
  ListChecksIcon,
  DatabaseIcon,
  FileHtmlIcon,
  BuildingsIcon,
  FileTextIcon,
  FileArrowDownIcon
} from '@phosphor-icons/react'
import { SettingsLayout } from '@/components/layout/settings-layout'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo } from '@/common/utils/navigationUtils'
import { renderInvestmentSettingsInlinePage } from './renderInvestmentSettingsInlinePage'

export interface InvestmentSettingsProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
}

const InvestmentSettings: React.FC<InvestmentSettingsProps> = ({ className, prefixDataTestId, ...context }) => {
  const { t } = useTranslation()
  const { t: tExport } = useFluentTranslation(investmentSettingsI18n)
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

  const handleBack = () => handleInlinePageChange(null)

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
    },
    {
      title: t('crm.permissions', 'Permissions'),
      description: t('crm.permissions_description', 'Manage permissions by investment group'),
      icon: FileHtmlIcon,
      iconSize: 'md' as const,
      entries: [
        {
          label: t('crm.investment_group_permissions', 'Investment Group Permissions'),
          onClick: () => handleInlinePageChange({ key: 'investment-permissions' })
        }
      ]
    },
    {
      title: tExport('data-export-settings-card-title'),
      description: tExport('data-export-settings-card-description'),
      icon: FileArrowDownIcon,
      iconSize: 'md' as const,
      entries: [
        {
          label: tExport('data-export-settings-card-entry'),
          onClick: () => handleInlinePageChange({ key: 'data-export' })
        }
      ]
    }
  ]

  if (inlinePage) {
    const inlinePageContent = renderInvestmentSettingsInlinePage({
      inlinePage,
      context,
      prefixDataTestId,
      onBack: handleBack
    })

    if (inlinePageContent) {
      return inlinePageContent
    }
  }

  return (
    <SettingsLayout
      headerPhosphorIcon={{
        icon: GearIcon,
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
