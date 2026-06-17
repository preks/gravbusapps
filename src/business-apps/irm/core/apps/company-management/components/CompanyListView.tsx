import React, { useMemo, useState, useCallback } from 'react'
import { Button, DataDisplay, DataTable, useTranslation } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentCompanies } from '@/common/data/investment/hooks/useInvestmentCompanies'
import type { InvestmentCompanyQueryVariables } from '@/common/data/investment/queries/investmentCompanyQueries'
import {
  INVESTMENT_COMPANY_DESCRIPTORS,
  type InvestmentCompany
} from '@/common/data/investment/types/investmentCompanyTypes'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { buildDynamicFilterConfig } from '@/common/components/common-relations/view-layouts/account-layout/utils/filterHelpers'
import { deriveAvailableColumns, deriveSortableColumns } from '@/common/network/graphql/descriptorUtils'
import { useViewPreferencesStorage } from '@/common/hooks/useViewPreferencesStorage'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { companyFilterConfig, createCompanyColumns, createCompanyRowActions } from './companyTableDefinitions'
import translations from '../_i18n'

export type CompanyListViewProps = BusinessAppContextProps

const getBooleanFilterValue = (value: unknown): boolean | undefined => {
  const normalizedValue = Array.isArray(value) ? (value.length === 1 ? value[0] : undefined) : value

  if (typeof normalizedValue === 'boolean') return normalizedValue
  if (normalizedValue === 'true') return true
  if (normalizedValue === 'false') return false
  return undefined
}

const normalizeCompanyFilters = (filters: Record<string, any>): Record<string, any> => {
  if (!('ownsProperty' in filters)) {
    return filters
  }

  const ownsProperty = getBooleanFilterValue(filters.ownsProperty)
  const normalizedFilters = { ...filters }

  if (ownsProperty === undefined) {
    delete normalizedFilters.ownsProperty
    return normalizedFilters
  }

  normalizedFilters.ownsProperty = ownsProperty
  return normalizedFilters
}

export const CompanyListView: React.FC<CompanyListViewProps> = context => {
  const { t } = useTranslation(translations)
  const { initialFilters, saveFilters, initialSorting, saveSorting, initialVisibleColumns, saveVisibleColumns } =
    useViewPreferencesStorage('irm:investment-company-preferences:v1')

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>(initialFilters)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>(
    initialSorting ?? [{ id: 'createdAt', desc: true }]
  )

  const columns = useMemo(() => createCompanyColumns(t), [t])

  const availableColumns = useMemo(() => deriveAvailableColumns(columns), [columns])
  const defaultVisibleColumns = useMemo(() => availableColumns.map(column => column.id), [availableColumns])
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    initialVisibleColumns && initialVisibleColumns.length > 0 ? initialVisibleColumns : defaultVisibleColumns
  )

  const queryVariables = useMemo<InvestmentCompanyQueryVariables>(() => {
    const trimmedSearch = searchTerm.trim()
    return {
      ...selectedFilters,
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      search: trimmedSearch || undefined,
      // Scope free-text search to the visible table columns (mirrors the other list views) so the
      // generated `_or` only targets displayed columns. Left unset without a search term so toggling
      // columns alone does not trigger a refetch.
      ...(trimmedSearch && visibleColumns.length > 0 ? { searchDescriptorKeys: visibleColumns } : {}),
      orderBy: sorting.length
        ? sorting.map(sort => ({
            field: sort.id,
            direction: sort.desc ? ('DESC_NULLS_LAST' as const) : ('ASC_NULLS_LAST' as const)
          }))
        : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' as const }]
    }
  }, [pagination.pageIndex, pagination.pageSize, searchTerm, selectedFilters, sorting, visibleColumns])

  const { companies, total, loading, error, refetch } = useInvestmentCompanies(
    context.accessToken || '',
    queryVariables
  )
  const rowActions = useMemo(() => createCompanyRowActions(context.accessToken), [context.accessToken])

  useProcessCompletion({
    onSuccess: () => {
      void refetch()
    }
  })

  const filterGroups = useFilterGroups(context, 'InvestmentCompany', INVESTMENT_COMPANY_DESCRIPTORS, { limit: 100 })
  const dynamicFilterConfig = useMemo(
    () => buildDynamicFilterConfig(companyFilterConfig, INVESTMENT_COMPANY_DESCRIPTORS, filterGroups),
    [filterGroups]
  )

  const sortableColumns = useMemo(
    () =>
      deriveSortableColumns(
        INVESTMENT_COMPANY_DESCRIPTORS,
        {
          name: t('investment-company-column'),
          commercialRegistrationNumber: t('registration-number-column'),
          taxIdentificationNumber: t('tax-id-column'),
          ownerEmployee: t('owner-column'),
          ownsProperty: t('owns-property-column'),
          currency: t('currency-column'),
          createdAt: t('created-column')
        },
        availableColumns.map(column => column.id)
      ),
    [availableColumns, t]
  )

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleFilterChange = useCallback(
    (filters: Record<string, any>) => {
      setSelectedFilters(filters)
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
      saveFilters(filters)
    },
    [saveFilters]
  )

  const handleSortingChange = useCallback(
    (nextSorting: Array<{ id: string; desc: boolean }>) => {
      setSorting(nextSorting)
      saveSorting(nextSorting)
    },
    [saveSorting]
  )

  const handleVisibleColumnsChange = useCallback(
    (nextVisibleColumns: string[]) => {
      setVisibleColumns(nextVisibleColumns)
      saveVisibleColumns(nextVisibleColumns)
    },
    [saveVisibleColumns]
  )

  return (
    <div className="gba:h-full gba:overflow-auto gba:pr-6 gba:pt-6" data-testid="company-management-companies-view">
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: 'All Companies',
            metadata: {
              count: total,
              isLoading: loading
            }
          }
        ]}
        currentSection="all"
        searchValue={searchTerm}
        searchPlaceholder="Search companies..."
        onSearchChange={handleSearchChange}
        filters={selectedFilters}
        filterConfiguration={dynamicFilterConfig}
        onFilterChange={handleFilterChange}
        sorting={sorting}
        sortableColumns={sortableColumns}
        onSortingChange={handleSortingChange}
        availableColumns={availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={handleVisibleColumnsChange}
        primaryAction={
          <AppAction
            contexts={[
              {
                context: FlowContextName.investmentCompanyCreate,
                contextData: {}
              }
            ]}
            accessToken={context.accessToken}
            emptyState="hide"
            data-testid="add-company-action"
          >
            <Button size="sm" variant="default" data-testid="add-company-button" type="button">
              {t('create-company-button')}
            </Button>
          </AppAction>
        }
        toolbarDensity="default"
        enableLiveFiltering
        filterSheetTitle="Filter Companies"
        filterSheetDescription="Apply filters to narrow down the company list"
      >
        <DataTable<InvestmentCompany>
          data={companies}
          columns={columns.filter(column => visibleColumns.includes(column.id as string))}
          loading={loading}
          error={error || undefined}
          totalCount={total}
          pagination={pagination}
          onPaginationChange={setPagination}
          sorting={sorting}
          onSortingChange={handleSortingChange}
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
      </DataDisplay>
    </div>
  )
}

export default CompanyListView
