import React, { useMemo } from 'react'
import { DataTable } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import type { InvestmentListAggregates } from '@/common/data/investment/hooks/useInvestments.new'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import {
  NameCell,
  createInvestmentTypeCell,
  TotalInvestmentAmountCell,
  OwnerEmployeeCell,
  InvestmentStatusCell,
  CreatedAtCell
} from './cellRenderers'
import { InvestmentListAggregatesBar } from './InvestmentListAggregatesBar'

const DEFAULT_LIST_AGGREGATES: InvestmentListAggregates = {
  count: 0,
  totalInvestmentAmount: null,
  investmentMarketValue: null,
  ebitdaAmount: null,
  avgTotalInvestmentAmount: null,
  avgInvestmentMarketValue: null,
  avgEbitdaAmount: null
}

/**
 * Configuration for an investment group list
 */
export interface InvestmentListConfig {
  /** Investment group identifier - supports both specialized groups and any generic group from catalog */
  investmentGroup: string
  /** Prefix for all data-testid attributes */
  dataTestIdPrefix: string
  /** Default label for investment type when not available */
  defaultTypeLabel: string
  /** From sub-view identifier for navigation */
  fromSubView: string
  /** Additional columns specific to this investment group */
  extraColumns?: ColumnDef<Investment>[]
  /** Position to insert extra columns: 'afterType' (after Investment Type) or 'afterAmount' (after Total Investment). Default: 'afterAmount' */
  insertExtraColumnsAfter?: 'afterType' | 'afterAmount'
  /** Custom empty message */
  emptyMessage?: string
}

/**
 * Props for GenericInvestmentsList component
 */
export interface GenericInvestmentsListProps extends BusinessAppContextProps {
  /** Configuration for this investment group */
  config: InvestmentListConfig
  /** Investment data */
  data: Investment[]
  /** Loading state */
  loading?: boolean
  /** Error message */
  error?: string | null
  /** Total count for pagination */
  totalCount: number
  /** Current sorting */
  sorting?: Array<{ id: string; desc: boolean }>
  /** Sorting change handler */
  onSortingChange?: (sorting: Array<{ id: string; desc: boolean }>) => void
  /** Current pagination */
  pagination?: { pageIndex: number; pageSize: number }
  /** Pagination change handler */
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
  /** Visible column IDs */
  visibleColumns?: string[]
  /** Server-side totals for current filters (all pages). Omit to hide the bar. */
  listAggregates?: InvestmentListAggregates
  /** Catalog-derived columns for dynamic investment group tabs. */
  catalogColumns?: ColumnDef<Investment>[]
  showAggregatesBar?: boolean
  /** Equity tab: extra EBITDA and portfolio performance from aggregates. */
  showEquityMetrics?: boolean
  /** ISO currency code for aggregate amounts (matches tab currency filter). */
  displayCurrencyCode?: string
}

/**
 * Row actions component for investment table rows
 * Extracted to prevent re-renders and improve performance
 */
const InvestmentRowActions: React.FC<{
  investment: Investment
  dataTestIdPrefix: string
  accessToken: string
}> = ({ investment, dataTestIdPrefix, accessToken }) => (
  <AppAction
    variant="table-row"
    contexts={[
      {
        context: FlowContextName.investmentEntity,
        contextData: { investmentId: investment.id, dealType: 'DIVESTMENT_DEAL' }
      }
    ]}
    prefixDataTestId={`${dataTestIdPrefix}-update`}
    accessToken={accessToken}
    emptyState="enable"
    lazyLoad
    onClick={e => e.stopPropagation()}
    data-testid={`${dataTestIdPrefix}-update-button-${investment.id}`}
  />
)

/**
 * Generic investments list component
 * Handles common list functionality for all investment groups
 */
const GenericInvestmentsList: React.FC<GenericInvestmentsListProps> = ({
  config,
  accessToken,
  data: investments,
  loading = false,
  error = null,
  totalCount,
  sorting,
  onSortingChange,
  pagination,
  onPaginationChange,
  visibleColumns,
  listAggregates = DEFAULT_LIST_AGGREGATES,
  catalogColumns,
  showAggregatesBar = false,
  showEquityMetrics = false,
  displayCurrencyCode = 'EUR'
}) => {
  // Create row actions with group-specific data-testid using extracted component
  const rowActions = useMemo(
    () =>
      (row: { original: Investment }): React.ReactNode => (
        <InvestmentRowActions
          investment={row.original}
          dataTestIdPrefix={config.dataTestIdPrefix}
          accessToken={accessToken || ''}
        />
      ),
    [config.dataTestIdPrefix, accessToken]
  )

  // Handle row click navigation
  const handleRowClick = useMemo(
    () => (investment: Investment) => {
      if (!investment.id) return
      const detailsUrl = buildPlatformUrl('/platform/irm/investment-record', {
        investmentId: investment.id,
        fromView: 'investments',
        fromSubView: config.fromSubView
      })
      navigateTo(detailsUrl)
    },
    [config.fromSubView]
  )

  // Build column definitions
  const columns = useMemo(() => {
    const nameColumn: ColumnDef<Investment> = {
      id: 'name',
      header: 'Investment',
      accessorKey: 'name',
      size: 250,
      minSize: 200,
      maxSize: 400,
      enableResizing: false,
      cell: NameCell
    }

    if (catalogColumns) {
      return [nameColumn, ...catalogColumns]
    }

    const baseColumns: ColumnDef<Investment>[] = [
      nameColumn,
      {
        id: 'investmentType',
        header: 'Investment Type',
        accessorKey: 'investmentType.value',
        size: 180,
        minSize: 150,
        maxSize: 250,
        enableResizing: false,
        cell: createInvestmentTypeCell(config.defaultTypeLabel)
      },
      {
        id: 'totalInvestmentAmount',
        header: 'Total Investment',
        accessorKey: 'totalInvestmentAmount',
        size: 160,
        minSize: 140,
        maxSize: 200,
        enableResizing: false,
        cell: TotalInvestmentAmountCell,
        meta: {
          align: 'right'
        }
      }
    ]

    // Insert extra columns at the configured position
    const columnsWithExtras = [...baseColumns]
    if (config.extraColumns && config.extraColumns.length > 0) {
      const insertPosition = config.insertExtraColumnsAfter === 'afterType' ? 2 : 3
      columnsWithExtras.splice(insertPosition, 0, ...config.extraColumns)
    }

    // Add remaining base columns
    const remainingColumns: ColumnDef<Investment>[] = [
      {
        id: 'ownerEmployee',
        header: 'Owner',
        accessorKey: 'ownerEmployee.displayName',
        size: 200,
        minSize: 180,
        maxSize: 280,
        enableResizing: false,
        cell: OwnerEmployeeCell
      },
      {
        id: 'investmentStatus',
        header: 'Status',
        accessorKey: 'investmentStatus.value',
        cell: InvestmentStatusCell
      },
      {
        id: 'createdAt',
        header: 'Created',
        accessorKey: 'createdAt',
        size: 150,
        minSize: 130,
        maxSize: 180,
        enableResizing: false,
        meta: {
          type: 'date' as const
        },
        cell: CreatedAtCell
      }
    ]

    return [...columnsWithExtras, ...remainingColumns]
  }, [catalogColumns, config.defaultTypeLabel, config.extraColumns, config.insertExtraColumnsAfter])

  // Filter columns based on visibleColumns
  const filteredColumns = useMemo(() => {
    if (!visibleColumns || visibleColumns.length === 0) {
      return columns
    }
    return columns.filter(col => col.id && visibleColumns.includes(col.id))
  }, [columns, visibleColumns])

  return (
    <>
      <DataTable<Investment>
        data={investments}
        columns={filteredColumns}
        loading={loading}
        error={error || undefined}
        totalCount={totalCount}
        sorting={sorting}
        onSortingChange={onSortingChange}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        enablePagination
        enableSorting
        enableSelection={false}
        enableColumnPinning
        enableResizing={false}
        tableLayout="fixed"
        rowsPerPageOptions={[10, 20, 50, 100]}
        showPageNumbers
        maxVisiblePages={7}
        emptyMessage={
          config.emptyMessage || `No ${config.investmentGroup.toLowerCase().replace('_', ' ')} investments found`
        }
        onRowClick={handleRowClick}
        actions={rowActions}
        data-testid={`${config.dataTestIdPrefix}-list`}
      />
      {showAggregatesBar && (
        <InvestmentListAggregatesBar
          listAggregates={listAggregates}
          showEquityMetrics={showEquityMetrics}
          dataTestIdPrefix={config.dataTestIdPrefix}
          displayCurrencyCode={displayCurrencyCode}
        />
      )}
    </>
  )
}

export default GenericInvestmentsList
