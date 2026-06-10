import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  DataTable,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { AppAction } from '@/components/app-action'
import { useAppActionData } from '@/common/hooks/useAppActionData'
import { useCampaignEntityList } from '@/common/data/customer/hooks/useCampaignEntityData'
import { GET_CAMPAIGN_CONTENTS } from '@/common/data/customer/queries/customerCampaignContentQueries'
import type { CustomerCampaignContent } from '@/common/data/customer/types/customerCampaignContentTypes'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { getMarketingFunnelStageBadgeVariant } from '@/common/utils/badgeUtils'
import dayjs from 'dayjs'
import translations from '@/business-apps/crm/campaigns/_i18n'
import {
  formatEngagementMetricsSummary,
  isStandardEngagementMetricKey
} from '@/business-apps/crm/campaigns/forms/campaign-content-form/engagementMetricsUtils'

type OrderByDirection = 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST' | 'ASC' | 'DESC'
type CampaignContentOrderBy = Record<string, OrderByDirection | Record<string, OrderByDirection>>

const DEFAULT_CAMPAIGN_CONTENT_ORDER_BY: CampaignContentOrderBy[] = [{ publishDate: 'DESC' }]

interface CampaignContentSectionProps extends BusinessAppContextProps {
  campaignId: string
}

type CampaignContentRow = { original: CustomerCampaignContent }

interface CampaignContentRowActionsProps {
  row: CampaignContentRow
  accessToken: string | undefined
}

const CampaignContentRowActions: React.FC<CampaignContentRowActionsProps> = ({ row, accessToken }) => {
  const config = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerCampaignContentEntity] as FlowContextName[],
      externalContextData: { contentId: row.original.id },
      accessToken,
      deferMainContextRequestsUntilClick: true,
      emptyStateBehavior: 'enable' as const
    }),
    [row.original.id, accessToken]
  )
  const { combinedData, handleDeferredFetch } = useAppActionData(config, `campaign-content-row-${row.original.id}`)

  return (
    <AppAction
      variant="table-row"
      contextsArray={[]}
      staticFlowData={combinedData}
      prefixDataTestId={`campaign-content-row-${row.original.id}`}
      accessToken={accessToken}
      emptyStateBehavior="enable"
      deferMainContextRequestsUntilClick
      onDropdownOpen={handleDeferredFetch}
    />
  )
}

const CampaignContentFunnelStageCell: React.FC<{ row: CampaignContentRow }> = ({ row }) => {
  if (!row.original.marketingFunnelStage) {
    return '-'
  }
  return (
    <Badge
      variant={getMarketingFunnelStageBadgeVariant(row.original.marketingFunnelStage)}
      data-testid={`content-funnel-${row.original.id}`}
    >
      {row.original.marketingFunnelStage.value}
    </Badge>
  )
}

const CampaignContentActionsCell: React.FC<{
  row: CampaignContentRow
  accessToken: string | undefined
}> = ({ row, accessToken }) => <CampaignContentRowActions row={row} accessToken={accessToken} />

const createCampaignContentActionsColumnCell = (
  accessToken: string | undefined
): React.FC<{ row: CampaignContentRow }> => {
  const CampaignContentActionsColumnCell = ({ row }: { row: CampaignContentRow }) => (
    <CampaignContentActionsCell row={row} accessToken={accessToken} />
  )
  return CampaignContentActionsColumnCell
}

const CampaignContentSection: React.FC<CampaignContentSectionProps> = ({ campaignId, accessToken, ...context }) => {
  const { t } = useTranslation(translations)

  const engagementMetricsLabel = useCallback(
    (key: string) => {
      if (isStandardEngagementMetricKey(key)) {
        return t(`campaign-content-metric-${key}`)
      }
      return key
    },
    [t]
  )
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([])

  const orderBy = useMemo<CampaignContentOrderBy[] | undefined>(() => {
    const sort = sorting[0]
    if (!sort) return undefined
    const dir = sort.desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
    switch (sort.id) {
      case 'title':
        return [{ title: dir }]
      case 'marketingFunnelStage':
        return [{ marketingFunnelStage: { value: dir } }]
      case 'marketingChannel':
        return [{ marketingChannel: { value: dir } }]
      case 'publishDate':
        return [{ publishDate: dir }]
      case 'marketingDistributionType':
        return [{ marketingDistributionType: { value: dir } }]
      case 'assistedOpportunities':
        return [{ assistedOpportunities: dir }]
      default:
        return undefined
    }
  }, [sorting])

  const handleSortingChange = useCallback((updater: unknown) => {
    setSorting(prev => (typeof updater === 'function' ? updater(prev) : updater))
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const ctxProps = { ...context, accessToken } as BusinessAppContextProps
  const {
    items: contents,
    totalCount,
    loading: isLoading,
    error,
    refetch
  } = useCampaignEntityList<CustomerCampaignContent>({
    context: ctxProps,
    campaignId,
    query: GET_CAMPAIGN_CONTENTS(),
    itemsKey: 'CustomerCampaignContent',
    aggregateKey: 'CustomerCampaignContentAggregate',
    errorMessage: 'Failed to load campaign contents',
    pagination,
    orderBy,
    defaultOrderBy: DEFAULT_CAMPAIGN_CONTENT_ORDER_BY
  })

  useProcessCompletion({ onSuccess: refetch })

  useEffect(() => {
    const lastPageIndex = Math.max(0, Math.ceil(totalCount / pagination.pageSize) - 1)
    if (pagination.pageIndex > lastPageIndex) {
      setPagination(prev => ({ ...prev, pageIndex: lastPageIndex }))
    }
  }, [totalCount, pagination.pageIndex, pagination.pageSize])

  const columns = useMemo(
    () => [
      {
        id: 'title',
        accessorKey: 'title',
        header: t('campaign-content-title')
      },
      {
        id: 'marketingFunnelStage',
        accessorKey: 'marketingFunnelStage',
        header: t('campaign-content-funnelStage'),
        cell: CampaignContentFunnelStageCell
      },
      {
        id: 'marketingChannel',
        accessorKey: 'marketingChannel',
        header: t('campaign-content-channel'),
        cell: ({ row }: { row: { original: CustomerCampaignContent } }) => row.original.marketingChannel?.value || '-'
      },
      {
        id: 'publishDate',
        accessorKey: 'publishDate',
        header: t('campaign-content-publishDate'),
        cell: ({ row }: { row: { original: CustomerCampaignContent } }) =>
          row.original.publishDate ? dayjs(row.original.publishDate).format('DD MMM YYYY') : '-'
      },
      {
        id: 'marketingDistributionType',
        accessorKey: 'marketingDistributionType',
        header: t('campaign-content-distribution'),
        cell: ({ row }: { row: { original: CustomerCampaignContent } }) =>
          row.original.marketingDistributionType?.value || '-'
      },
      {
        id: 'assistedOpportunities',
        accessorKey: 'assistedOpportunities',
        header: t('campaign-content-assistedOpps'),
        cell: ({ row }: { row: { original: CustomerCampaignContent } }) =>
          String(row.original.assistedOpportunities ?? 0)
      },
      {
        id: 'engagementMetrics',
        accessorKey: 'engagementMetrics',
        header: t('campaign-content-engagementMetrics'),
        enableSorting: false,
        cell: ({ row }: { row: { original: CustomerCampaignContent } }) =>
          formatEngagementMetricsSummary(row.original.engagementMetrics, engagementMetricsLabel)
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: createCampaignContentActionsColumnCell(accessToken)
      }
    ],
    [t, accessToken, engagementMetricsLabel]
  )

  if (isLoading && contents.length === 0) {
    return (
      <Card className="gba:bg-muted">
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:py-12">
          <Spinner size="md" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gba:bg-muted" data-testid="campaign-content-section">
      <CardHeader>
        <div className="gba:flex gba:flex-col gba:sm:flex-row gba:sm:items-center gba:sm:justify-between gba:gap-3 gba:w-full gba:min-w-0">
          <CardTitle className="gba:min-w-0 gba:wrap-break-word">{t('campaign-content-sectionTitle')}</CardTitle>
          <div className="gba:sm:ml-auto gba:flex gba:items-center gba:flex-wrap gba:w-full gba:sm:w-auto gba:justify-end gba:min-w-0">
            <AppAction
              accessToken={accessToken}
              variant="create-primary"
              contextsArray={[FlowContextName.customerCampaignContentCreate]}
              externalContextData={{ campaignId }}
              prefixDataTestId="campaign-content-add"
              emptyStateBehavior="hide"
              className="gba:h-8"
              data-testid="campaign-content-add-button"
            >
              {t('campaign-content-add')}
            </AppAction>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="gba:text-destructive gba:text-sm gba:mb-4">{error}</p>}
        {totalCount === 0 && !error ? (
          <p className="gba:text-muted-foreground gba:text-sm gba:text-center gba:py-8">
            {t('campaign-content-empty')}
          </p>
        ) : (
          <DataTable
            columns={columns}
            data={contents}
            enablePagination
            pagination={pagination}
            onPaginationChange={setPagination}
            totalCount={totalCount}
            rowsPerPageOptions={[10, 20, 50, 100]}
            enableSorting
            sorting={sorting}
            onSortingChange={handleSortingChange}
            data-testid="campaign-content-table"
          />
        )}
      </CardContent>
    </Card>
  )
}

export default CampaignContentSection
