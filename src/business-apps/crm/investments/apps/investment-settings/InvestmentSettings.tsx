import React from 'react'
import { useTranslation } from 'react-i18next'
import { PiTrendUp, PiFlowArrow, PiAddressBook, PiListChecks } from 'react-icons/pi'
import { SettingsLayout } from '@/components/layout/settings-layout'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { LeadSettings } from '@/common/components/common-relations/setting-pages/lead/LeadSettings'
import { EngagementSettings } from '@/common/components/common-relations/setting-pages/engagement/EngagementSettings'
import PipelineDataPage from './pages/pipeline-data/PipelineDataPage'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface InvestmentSettingsProps extends BusinessAppContextProps {
  className?: string
  prefixDataTestId?: string
}

const InvestmentSettings: React.FC<InvestmentSettingsProps> = ({ className, prefixDataTestId, ...context }) => {
  const { t } = useTranslation()
  const [inlinePage, setInlinePage] = React.useState<{ key: string; tab?: string } | null>(null)
  const catalogClient = useCatalogManagerClient(context.accessToken)

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
      <LeadSettings
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentLeadSettings`}
        initialTab={(inlinePage.tab as any) || 'ratings'}
        onBack={() => setInlinePage(null)}
        ratings={mkCatalogStateAndHandlers(catalogClient, 'InvestmentLeadRating')}
        statuses={mkCatalogStateAndHandlers(catalogClient, 'InvestmentLeadStatus')}
        sources={mkCatalogStateAndHandlers(catalogClient, 'InvestmentLeadSource')}
      />
    )
  }

  if (inlinePage?.key === 'engagement') {
    return (
      <EngagementSettings
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentEngagementSettings`}
        onBack={() => setInlinePage(null)}
        activityTypes={mkCatalogStateAndHandlers(catalogClient, 'InvestmentActivityType')}
        taskTypes={mkCatalogStateAndHandlers(catalogClient, 'InvestmentTaskType')}
        taskPriorities={mkCatalogStateAndHandlers(catalogClient, 'InvestmentTaskPriority')}
        taskStatuses={mkCatalogStateAndHandlers(catalogClient, 'InvestmentTaskStatus')}
      />
    )
  }

  if (inlinePage?.key === 'pipeline') {
    return (
      <PipelineDataPage
        {...context}
        prefixDataTestId={`${prefixDataTestId || ''}-InvestmentPipelineSettings`}
        onBack={() => setInlinePage(null)}
      />
    )
  }

  return (
    <SettingsLayout
      headerPhosphorIcon={{
        icon: PiTrendUp,
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

function mkCatalogStateAndHandlers(
  catalogClient: ReturnType<typeof useCatalogManagerClient>,
  catalogIdentifier: string
) {
  const [items, setItems] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')

  const load = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier, version: 'v1' },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: false,
          ...(search && { searchCriteria: search })
        }
      )
      const entries = (response.data || []).map((entry: any) => ({
        id: entry.id,
        code: entry.code,
        value: entry.value,
        alternativeCode: entry.alternativeCode,
        additionalValue1: entry.additionalValue1,
        additionalValue2: entry.additionalValue2,
        additionalValue3: entry.additionalValue3
      }))
      setItems(entries)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    load()
  }, [catalogIdentifier, catalogClient, search])

  const create = async (data: any) => {
    await catalogClient.createCatalogEntry(catalogIdentifier, 'v1', {
      code: data.code,
      value: data.value,
      alternativeCode: data.alternativeCode,
      additionalValue1: data.additionalValue1,
      objectValue: {},
      translations: []
    })
    await load()
  }
  const update = async (id: string, data: any) => {
    await catalogClient.updateCatalogEntry(id, {
      code: data.code,
      value: data.value,
      alternativeCode: data.alternativeCode,
      additionalValue1: data.additionalValue1,
      objectValue: {},
      translations: []
    })
    await load()
  }
  const remove = async (id: string) => {
    await catalogClient.deleteCatalogEntry(id)
    await load()
  }

  return {
    items,
    isLoading,
    error,
    onRetry: load,
    onCreate: create,
    onUpdate: update,
    onDelete: remove,
    onSearchChange: setSearch
  }
}
