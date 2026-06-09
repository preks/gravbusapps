import React from 'react'
import { useTranslation } from 'react-i18next'
import { useTranslation as useFluentTranslation } from '@newwork/nw-design-system'
import customerSettingsI18n from './_i18n'
import {
  GearIcon,
  FlowArrowIcon,
  AddressBookIcon,
  ListChecksIcon,
  CalendarIcon,
  BuildingsIcon,
  FileTextIcon,
  MegaphoneIcon,
  GaugeIcon,
  ShieldCheckIcon,
  FileArrowDownIcon
} from '@phosphor-icons/react'
import { SettingsLayout } from '@/components/layout/settings-layout'
import { navigateTo } from '@/common/utils/navigationUtils'
// inline pipeline card rendering moved to PipelineDataPage
import LeadDataPage from './pages/lead-data/LeadDataPage'
import EngagementDataPage from './pages/engagement-data/EngagementDataPage'
import OpportunityDataPage from './pages/opportunity-data/OpportunityDataPage'
import AccountDataPage from './pages/account-data/AccountDataPage'
import TaskTemplateDataPage from './pages/task-template-data/TaskTemplateDataPage'
import DocumentDataPage from './pages/document-data/DocumentDataPage'
import CampaignDataPage from './pages/campaign-data/CampaignDataPage'
import type {
  CampaignSettingsCatalog,
  CampaignSettingsGroup
} from '@/common/components/common-relations/setting-pages/campaign'
import IdealCustomerProfilesPage from './pages/ideal-customer-profiles/IdealCustomerProfilesPage'
import MarketingComplianceDataPage from './pages/marketing-compliance-data/MarketingComplianceDataPage'
import CrmDataExportPage from './pages/data-export/DataExportPage'
import { FolderTemplateDataPage, ModuleType } from '@/common/components/common-relations/setting-pages/folder-templates'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface CustomerSettingsProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
}

const CustomerSettings: React.FC<CustomerSettingsProps> = ({ className, prefixDataTestId, ...context }) => {
  const { t } = useTranslation()
  const { t: tCustomerSettings } = useFluentTranslation(customerSettingsI18n)
  const [inlinePage, setInlinePage] = React.useState<{ key: string; tab?: string } | null>(null)

  // Handle query parameters on component mount and browser back/forward
  React.useEffect(() => {
    const parseUrlAndSetPage = () => {
      const urlParams = new URLSearchParams(globalThis.location.search)
      let page = urlParams.get('page')
      const tab = urlParams.get('tab')

      if (page === 'icp-scoring') {
        page = 'ideal-customer-profiles'
      }

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
    },
    {
      title: tCustomerSettings('campaign-data-title'),
      description: tCustomerSettings('campaign-data-description'),
      icon: MegaphoneIcon,
      iconSize: 'md' as const,
      entries: [
        {
          label: tCustomerSettings('campaign-group-setup'),
          onClick: () => handleInlinePageChange({ key: 'campaign-data', tab: 'setup' })
        },
        {
          label: tCustomerSettings('campaign-group-targeting'),
          onClick: () => handleInlinePageChange({ key: 'campaign-data', tab: 'targeting' })
        },
        {
          label: tCustomerSettings('campaign-group-distribution'),
          onClick: () => handleInlinePageChange({ key: 'campaign-data', tab: 'distribution' })
        },
        {
          label: tCustomerSettings('campaign-group-engagement'),
          onClick: () => handleInlinePageChange({ key: 'campaign-data', tab: 'engagement' })
        }
      ]
    },
    {
      title: t('crm.marketing_compliance', 'Marketing Compliance'),
      description: t('crm.marketing_compliance_description', 'Manage marketing opt-in sources and statuses'),
      icon: ShieldCheckIcon,
      iconSize: 'md' as const,
      entries: [
        {
          label: t('crm.opt_in_sources', 'Opt-in Sources'),
          onClick: () => handleInlinePageChange({ key: 'marketing-compliance', tab: 'sources' })
        },
        {
          label: t('crm.opt_in_statuses', 'Opt-in Statuses'),
          onClick: () => handleInlinePageChange({ key: 'marketing-compliance', tab: 'statuses' })
        }
      ]
    },
    {
      title: tCustomerSettings('icp-settings-card-title'),
      description: tCustomerSettings('icp-settings-card-description'),
      icon: GaugeIcon,
      iconSize: 'md' as const,
      entries: [
        {
          label: tCustomerSettings('icp-settings-card-entry'),
          onClick: () => handleInlinePageChange({ key: 'ideal-customer-profiles' })
        }
      ]
    },
    {
      title: tCustomerSettings('data-export-settings-card-title'),
      description: tCustomerSettings('data-export-settings-card-description'),
      icon: FileArrowDownIcon,
      iconSize: 'md' as const,
      entries: [
        {
          label: tCustomerSettings('data-export-settings-card-entry'),
          onClick: () => handleInlinePageChange({ key: 'data-export' })
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
    const initialTab = inlinePage.tab as 'pipelines' | 'statuses' | 'forecasts' | 'stage-types' | undefined
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

  if (inlinePage?.key === 'campaign-data') {
    const tabParam = inlinePage.tab
    const campaignGroups: CampaignSettingsGroup[] = ['setup', 'targeting', 'distribution', 'engagement']
    const isGroupTab = campaignGroups.includes(tabParam as CampaignSettingsGroup)

    return (
      <CampaignDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-CustomerCampaignSettings`}
        onBack={() => handleInlinePageChange(null)}
        initialGroup={isGroupTab ? (tabParam as CampaignSettingsGroup) : undefined}
        initialTab={isGroupTab ? undefined : (tabParam as CampaignSettingsCatalog)}
      />
    )
  }

  if (inlinePage?.key === 'marketing-compliance') {
    const initialTab = inlinePage.tab as 'sources' | 'statuses' | undefined
    return (
      <MarketingComplianceDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-CustomerMarketingComplianceSettings`}
        onBack={() => handleInlinePageChange(null)}
        initialTab={initialTab || 'sources'}
      />
    )
  }

  if (inlinePage?.key === 'ideal-customer-profiles') {
    return (
      <IdealCustomerProfilesPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-CustomerIcpSettings`}
        onBack={() => handleInlinePageChange(null)}
      />
    )
  }

  if (inlinePage?.key === 'data-export') {
    return (
      <CrmDataExportPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-CustomerDataExport`}
        onBack={() => handleInlinePageChange(null)}
      />
    )
  }

  return (
    <SettingsLayout
      headerPhosphorIcon={{
        icon: GearIcon,
        variant: 'info',
        size: 'lg',
        label: 'Customer Settings'
      }}
      headerLabel={t('crm.customer_settings', 'Customer Settings')}
      headerDescription={t(
        'crm.customer_settings_description',
        'Configure and manage all customer relationship management settings'
      )}
      cards={cards}
      className={className}
      prefixDataTestId={prefixDataTestId}
      searchPlaceholder={t('common.search_placeholder', 'Search settings...')}
      onBack={() => navigateTo('/platform/use')}
    />
  )
}

export default CustomerSettings
export { CustomerSettings }

// removed inlined hook bundle; moved to dedicated components to satisfy Rules of Hooks
