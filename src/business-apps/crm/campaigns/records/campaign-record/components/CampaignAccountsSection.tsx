import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  DataTable,
  Input,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { AppAction } from '@/components/app-action'
import { useAppActionData } from '@/common/hooks/useAppActionData'
import { useCampaignEntityList } from '@/common/data/customer/hooks/useCampaignEntityData'
import { GET_CAMPAIGN_ACCOUNTS } from '@/common/data/customer/queries/customerCampaignAccountQueries'
import type { CustomerCampaignAccount } from '@/common/data/customer/types/customerCampaignAccountTypes'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { getCustomerEngagementLevelBadgeVariant } from '@/common/utils/badgeUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import translations from '@/business-apps/crm/campaigns/_i18n'

type OrderByDirection = 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST' | 'ASC' | 'DESC'
type CampaignAccountOrderBy = Record<
  string,
  OrderByDirection | Record<string, OrderByDirection | Record<string, OrderByDirection>>
>

const DEFAULT_CAMPAIGN_ACCOUNT_ORDER_BY: CampaignAccountOrderBy[] = [{ createdAt: 'DESC' }]

interface CampaignAccountsSectionProps extends BusinessAppContextProps {
  campaignId: string
}

type CampaignAccountRow = { original: CustomerCampaignAccount }

interface CampaignAccountRowActionsProps {
  row: CampaignAccountRow
  accessToken: string | undefined
}

const CampaignAccountRowActions: React.FC<CampaignAccountRowActionsProps> = ({ row, accessToken }) => {
  const config = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerCampaignAccountDelete] as FlowContextName[],
      externalContextData: { campaignAccountId: row.original.id },
      accessToken,
      deferMainContextRequestsUntilClick: true,
      emptyStateBehavior: 'enable' as const
    }),
    [row.original.id, accessToken]
  )
  const { combinedData, handleDeferredFetch } = useAppActionData(config, `campaign-accounts-row-${row.original.id}`)

  return (
    <AppAction
      variant="table-row"
      contextsArray={[]}
      staticFlowData={combinedData}
      prefixDataTestId={`campaign-accounts-row-${row.original.id}`}
      accessToken={accessToken}
      emptyStateBehavior="enable"
      deferMainContextRequestsUntilClick
      onDropdownOpen={handleDeferredFetch}
    />
  )
}

const CampaignAccountNameCell: React.FC<{ row: CampaignAccountRow }> = ({ row }) => {
  const account = row.original.customerAccount
  const accountId = account?.id ?? row.original.customerAccountId
  const name = account?.name || '-'

  if (!accountId) {
    return <span>{name}</span>
  }

  return (
    <button
      type="button"
      onClick={() => navigateTo(buildPlatformUrl('/platform/crm/account-record', { accountId }))}
      className="gba:text-primary gba:font-medium gba:text-left gba:hover:underline"
      data-testid={`campaign-account-name-${row.original.id}`}
    >
      {name}
    </button>
  )
}

const CampaignAccountEngagementCell: React.FC<{ row: CampaignAccountRow }> = ({ row }) => {
  if (!row.original.customerEngagementLevel) {
    return '-'
  }
  return (
    <Badge
      variant={getCustomerEngagementLevelBadgeVariant(row.original.customerEngagementLevel)}
      data-testid={`campaign-account-engagement-${row.original.id}`}
    >
      {row.original.customerEngagementLevel.value}
    </Badge>
  )
}

const CampaignAccountActionsCell: React.FC<{
  row: CampaignAccountRow
  accessToken: string | undefined
}> = ({ row, accessToken }) => <CampaignAccountRowActions row={row} accessToken={accessToken} />

const createCampaignAccountActionsColumnCell = (
  accessToken: string | undefined
): React.FC<{ row: CampaignAccountRow }> => {
  const CampaignAccountActionsColumnCell = ({ row }: { row: CampaignAccountRow }) => (
    <CampaignAccountActionsCell row={row} accessToken={accessToken} />
  )
  return CampaignAccountActionsColumnCell
}

const CampaignAccountsSection: React.FC<CampaignAccountsSectionProps> = ({ campaignId, accessToken, ...context }) => {
  const { t } = useTranslation(translations)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([])
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim())
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
    }, 300)
    return () => clearTimeout(handle)
  }, [searchInput])

  const orderBy = useMemo<CampaignAccountOrderBy[] | undefined>(() => {
    const sort = sorting[0]
    if (!sort) return undefined
    const dir = sort.desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
    switch (sort.id) {
      case 'customerAccount.name':
        return [{ customerAccount: { name: dir } }]
      case 'account.legalForm':
        return [{ customerAccount: { legalForm: { value: dir } } }]
      case 'account.industry':
        return [{ customerAccount: { industry: { value: dir } } }]
      case 'customerEngagementLevel':
        return [{ customerEngagementLevel: { value: dir } }]
      default:
        return undefined
    }
  }, [sorting])

  const handleSortingChange = useCallback((next: Array<{ id: string; desc: boolean }>) => {
    setSorting(next)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const ctxProps = { ...context, accessToken } as BusinessAppContextProps
  const {
    items: accounts,
    totalCount,
    loading: isLoading,
    error,
    refetch
  } = useCampaignEntityList<CustomerCampaignAccount>({
    context: ctxProps,
    campaignId,
    query: GET_CAMPAIGN_ACCOUNTS(),
    itemsKey: 'CustomerCampaignAccount',
    aggregateKey: 'CustomerCampaignAccountAggregate',
    errorMessage: 'Failed to load campaign accounts',
    pagination,
    orderBy,
    defaultOrderBy: DEFAULT_CAMPAIGN_ACCOUNT_ORDER_BY,
    search
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
        id: 'customerAccount.name',
        accessorKey: 'customerAccount.name',
        header: t('campaign-targets-accountName'),
        cell: CampaignAccountNameCell
      },
      {
        id: 'account.legalForm',
        accessorKey: 'account.legalForm',
        header: t('campaign-targets-legalForm'),
        cell: ({ row }: { row: { original: CustomerCampaignAccount } }) =>
          row.original.customerAccount?.legalForm?.value || '-'
      },
      {
        id: 'account.industry',
        accessorKey: 'account.industry',
        header: t('campaign-targets-industry'),
        cell: ({ row }: { row: { original: CustomerCampaignAccount } }) =>
          row.original.customerAccount?.industry?.value || '-'
      },
      {
        id: 'customerEngagementLevel',
        accessorKey: 'customerEngagementLevel',
        header: t('campaign-targets-engagement'),
        cell: CampaignAccountEngagementCell
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: createCampaignAccountActionsColumnCell(accessToken)
      }
    ],
    [t, accessToken]
  )

  if (isLoading && accounts.length === 0) {
    return (
      <Card className="gba:bg-muted">
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:py-12">
          <Spinner size="md" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gba:bg-muted" data-testid="campaign-accounts-section">
      <CardHeader>
        <div className="gba:flex gba:flex-col gba:sm:flex-row gba:sm:items-center gba:sm:justify-between gba:gap-3 gba:w-full gba:min-w-0">
          <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
            <CardTitle className="gba:min-w-0 gba:wrap-break-word">{t('campaign-targets-title')}</CardTitle>
            <span
              className="gba:text-sm gba:text-muted-foreground gba:whitespace-nowrap"
              data-testid="campaign-accounts-count"
            >
              {totalCount}{' '}
              {totalCount === 1 ? t('campaign-targets-accountSingular') : t('campaign-targets-accountPlural')}
            </span>
          </div>
          <div className="gba:flex gba:items-center gba:gap-3 gba:sm:ml-auto gba:flex-wrap gba:w-full gba:sm:w-auto gba:justify-end gba:min-w-0">
            <div className="gba:relative gba:w-full gba:sm:w-64">
              <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:text-muted-foreground gba:w-4 gba:h-4" />
              <Input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder={t('campaign-targets-searchPlaceholder')}
                className="gba:pl-9 gba:h-8"
                data-testid="campaign-accounts-search-input"
              />
            </div>
            <AppAction
              accessToken={accessToken}
              variant="create-primary"
              contextsArray={[FlowContextName.customerCampaignAccountCreate]}
              externalContextData={{ campaignId }}
              prefixDataTestId="campaign-accounts-add"
              emptyStateBehavior="hide"
              className="gba:h-8"
              data-testid="campaign-accounts-add-button"
            >
              {t('campaign-targets-add')}
            </AppAction>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && <p className="gba:text-destructive gba:text-sm gba:mb-4">{error}</p>}
        {totalCount === 0 && !error ? (
          <p className="gba:text-muted-foreground gba:text-sm gba:text-center gba:py-8">
            {search ? t('campaign-targets-noResults') : t('campaign-targets-empty')}
          </p>
        ) : (
          <DataTable
            columns={columns}
            data={accounts}
            enablePagination
            pagination={pagination}
            onPaginationChange={setPagination}
            totalCount={totalCount}
            rowsPerPageOptions={[10, 20, 50, 100]}
            enableSorting
            sorting={sorting}
            onSortingChange={handleSortingChange}
            data-testid="campaign-accounts-table"
          />
        )}
      </CardContent>
    </Card>
  )
}

export default CampaignAccountsSection
