import React, { useEffect, useMemo, useState } from 'react'
import { DataTable, PageLayout, useTranslation } from '@newwork/nw-design-system'
import { BuildingsIcon, TreeStructureIcon } from '@phosphor-icons/react'
import type { CellContext, ColumnDef } from '@tanstack/react-table'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentCompanies } from '@/common/data/investment/hooks/useInvestmentCompanies'
import type { InvestmentCompany } from '@/common/data/investment/types/investmentCompanyTypes'
import { MODULE_COLORS } from '@/common/constants/ui'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import {
  CompanyGroupsView,
  updateCompanyGroupUrl
} from '@/business-apps/irm/investments/apps/investment-management/views/company-groups-view'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import translations from './_i18n'

export type CompanyManagementProps = BusinessAppContextProps

const getInitialView = (): string => {
  if (globalThis.window === undefined) return 'companies'
  const view = new URLSearchParams(globalThis.location.search).get('view')
  return view === 'groups' ? 'groups' : 'companies'
}

const getSelectedGroupId = (): string | undefined => {
  if (globalThis.window === undefined) return undefined
  return new URLSearchParams(globalThis.location.search).get('groupId') || undefined
}

const formatDate = (value?: string): string => {
  if (!value) return '-'
  return new Date(value).toLocaleDateString()
}

interface CompanyNameCellProps extends CellContext<InvestmentCompany, unknown> {
  t: (key: string) => string
}

type CompanyTableRow = { original: InvestmentCompany }

const CompanyNameCell = ({ row, t }: CompanyNameCellProps) => (
  <div className="gba:min-w-0">
    <div className="gba:truncate gba:font-medium">{row.original.name || t('unnamed-investment-company')}</div>
    <div className="gba:text-xs gba:text-muted-foreground">{row.original.code || t('no-code')}</div>
  </div>
)

const CompanyRowActions: React.FC<{ company: InvestmentCompany; accessToken?: string }> = ({
  company,
  accessToken
}) => (
  <AppAction
    variant="table-row"
    contexts={[
      {
        context: FlowContextName.investmentCompanyEntity,
        contextData: { investmentCompanyId: company.id }
      }
    ]}
    prefixDataTestId="investment-company-row-action"
    accessToken={accessToken}
    emptyState="enable"
    lazyLoad
    onClick={event => event.stopPropagation()}
    data-testid={`investment-company-row-action-button-${company.id}`}
  />
)

const createCompanyRowActions =
  (accessToken?: string) =>
  (row: CompanyTableRow): React.ReactElement => <CompanyRowActions company={row.original} accessToken={accessToken} />

const CompanyListView: React.FC<CompanyManagementProps> = context => {
  const { t } = useTranslation(translations)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([])

  const variables = useMemo(
    () => ({
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      orderBy: sorting.length
        ? sorting.map(sort => ({
            field: sort.id,
            direction: sort.desc ? ('DESC_NULLS_LAST' as const) : ('ASC_NULLS_LAST' as const)
          }))
        : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' as const }]
    }),
    [pagination.pageIndex, pagination.pageSize, sorting]
  )

  const { companies, total, loading, error } = useInvestmentCompanies(context.accessToken || '', variables)
  const rowActions = useMemo(() => createCompanyRowActions(context.accessToken), [context.accessToken])

  const columns = useMemo<ColumnDef<InvestmentCompany>[]>(
    () => [
      {
        id: 'name',
        header: t('investment-company-column'),
        accessorKey: 'name',
        size: 260,
        cell: cellContext => <CompanyNameCell {...cellContext} t={t} />
      },
      {
        id: 'commercialRegistrationNumber',
        header: t('registration-number-column'),
        accessorKey: 'commercialRegistrationNumber',
        cell: ({ row }) => row.original.commercialRegistrationNumber || '-'
      },
      {
        id: 'taxIdentificationNumber',
        header: t('tax-id-column'),
        accessorKey: 'taxIdentificationNumber',
        cell: ({ row }) => row.original.taxIdentificationNumber || '-'
      },
      {
        id: 'currency',
        header: t('currency-column'),
        accessorKey: 'currency.code',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.currency?.code || row.original.currency?.value || row.original.currencyRef || '-'
      },
      {
        id: 'createdAt',
        header: t('created-column'),
        accessorKey: 'createdAt',
        meta: { type: 'date' as const },
        cell: ({ row }) => formatDate(row.original.createdAt)
      }
    ],
    [t]
  )

  return (
    <div className="gba:h-full gba:overflow-auto gba:p-6" data-testid="company-management-companies-view">
      <DataTable<InvestmentCompany>
        data={companies}
        columns={columns}
        loading={loading}
        error={error || undefined}
        totalCount={total}
        pagination={pagination}
        onPaginationChange={setPagination}
        sorting={sorting}
        onSortingChange={setSorting}
        enablePagination
        enableSorting
        enableSelection={false}
        enableColumnPinning
        enableResizing={false}
        tableLayout="fixed"
        rowsPerPageOptions={[10, 20, 50, 100]}
        showPageNumbers
        maxVisiblePages={7}
        emptyMessage={t('empty-companies')}
        onRowClick={company => {
          if (!company.id) return
          navigateTo(buildPlatformUrl('/platform/irm/company-record', { investmentCompanyId: company.id }))
        }}
        actions={rowActions}
        data-testid="investment-companies-table"
      />
    </div>
  )
}

export const CompanyManagement: React.FC<CompanyManagementProps> = context => {
  const { t } = useTranslation(translations)
  const [activeView, setActiveView] = useState(getInitialView)
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(getSelectedGroupId)

  const handleViewChange = (view: string) => {
    setActiveView(view)
    setSelectedGroupId(undefined)
    if (globalThis.window === undefined) return

    const params = new URLSearchParams(globalThis.location.search)
    params.set('view', view)
    if (view !== 'groups') {
      params.delete('groupId')
    }
    globalThis.history.replaceState(null, '', `${globalThis.location.pathname}?${params.toString()}`)
  }

  useEffect(() => {
    if (globalThis.window === undefined) return

    const syncGroupIdFromUrl = () => {
      setSelectedGroupId(getSelectedGroupId())
    }

    syncGroupIdFromUrl()
    globalThis.addEventListener('popstate', syncGroupIdFromUrl)
    return () => globalThis.removeEventListener('popstate', syncGroupIdFromUrl)
  }, [])

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId)
    updateCompanyGroupUrl(groupId)
  }

  const handleBackFromGroup = () => {
    setSelectedGroupId(undefined)
    updateCompanyGroupUrl()
  }

  const headerActions =
    activeView === 'companies' ? (
      <AppAction
        variant="create-primary"
        contexts={[
          {
            context: FlowContextName.investmentCompanyCreate,
            contextData: {}
          }
        ]}
        prefixDataTestId="investment-company-create"
        accessToken={context.accessToken}
      >
        {t('create-company-button')}
      </AppAction>
    ) : null

  if (activeView === 'groups' && selectedGroupId) {
    return (
      <div className="gba:h-screen gba:overflow-hidden" data-testid="company-management-app">
        <CompanyGroupsView
          {...context}
          selectedGroupId={selectedGroupId}
          onSelectGroup={handleSelectGroup}
          onBackFromGroup={handleBackFromGroup}
        />
      </div>
    )
  }

  return (
    <div data-testid="company-management-app">
      <PageLayout
        headerIcon={BuildingsIcon}
        headerTitle={t('page-title')}
        headerDescription={t('page-description')}
        headerSubViews={{
          value: activeView,
          onValueChange: handleViewChange,
          items: [
            {
              value: 'companies',
              label: t('companies-tab'),
              icon: <BuildingsIcon />
            },
            {
              value: 'groups',
              label: t('groups-tab'),
              icon: <TreeStructureIcon />
            }
          ]
        }}
        headerActions={headerActions}
        variant={MODULE_COLORS.IRM}
        className="gba:min-h-screen"
      >
        {activeView === 'groups' ? (
          <CompanyGroupsView
            {...context}
            selectedGroupId={selectedGroupId}
            onSelectGroup={handleSelectGroup}
            onBackFromGroup={handleBackFromGroup}
          />
        ) : (
          <CompanyListView {...context} />
        )}
      </PageLayout>
    </div>
  )
}

export default CompanyManagement
