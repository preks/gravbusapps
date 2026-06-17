import { Badge, type FilterConfiguration } from '@newwork/nw-design-system'
import type { RevenueAlignmentRow } from '@/common/data/customer/queries/campaignDashboardQueries'
import type { CampaignCatalogOption } from '@/common/data/customer/hooks/useCampaignCatalogOptions'

const REVENUE_ALIGNMENT_COLUMN_LABELS: Record<string, string> = {
  name: 'Campaign',
  status: 'Status',
  segment: 'Segment',
  budgetAllocated: 'Budget',
  pipelineTarget: 'Pipeline Target',
  pipelineGenerated: 'Pipeline Generated',
  opportunitiesCreated: 'Opportunities Created',
  costPerOpportunity: 'Cost per Opportunity',
  totalEventBudget: 'Total Event Budget',
  totalPipelineFromEvents: 'Pipeline from Events',
  revenueClosed: 'Revenue Closed',
  percentToGoal: '% to Goal'
}

export const REVENUE_ALIGNMENT_COLUMN_IDS = Object.keys(REVENUE_ALIGNMENT_COLUMN_LABELS)

export const getInitialRevenueAlignmentVisibleColumns = () => [...REVENUE_ALIGNMENT_COLUMN_IDS]

export const formatRevenueAlignmentCurrency = (value?: number | null): string => {
  const numericValue = Number(value) || 0
  return `$${numericValue.toLocaleString()}`
}

export const formatOptionalRevenueAlignmentCurrency = (value?: number | null): string => {
  const numericValue = Number(value) || 0
  return numericValue > 0 ? `$${numericValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'
}

const getGoalBadgeVariant = (percent: number): 'success' | 'warning' | 'destructive' | 'secondary' => {
  if (percent >= 100) return 'success'
  if (percent >= 70) return 'warning'
  if (percent > 0) return 'destructive'
  return 'secondary'
}

export const getCatalogFilterValue = (entry?: { id?: string; value?: string; code?: string }): string =>
  entry?.code || entry?.value || entry?.id || ''

export const createRevenueAlignmentAvailableColumns = () =>
  REVENUE_ALIGNMENT_COLUMN_IDS.map(id => ({ id, label: REVENUE_ALIGNMENT_COLUMN_LABELS[id] }))

const REVENUE_ALIGNMENT_SORTABLE_COLUMN_IDS = ['name', 'status', 'segment', 'budgetAllocated', 'pipelineTarget']

export const createRevenueAlignmentSortableColumns = () =>
  REVENUE_ALIGNMENT_SORTABLE_COLUMN_IDS.map(id => ({ id, label: REVENUE_ALIGNMENT_COLUMN_LABELS[id] }))

export const createRevenueAlignmentExportColumns = (visibleColumns: string[]) =>
  createRevenueAlignmentAvailableColumns()
    .filter(column => visibleColumns.includes(column.id))
    .map(column => ({ key: column.id, title: column.label }))

/**
 * Builds filter options from catalog entries (all possible values) rather than the loaded page.
 * Option ids use the catalog `code` because the table's where-clause filters by `code` (`_in`).
 * Any already-selected value that is missing from the catalog list is preserved so selections
 * never silently disappear.
 */
const buildCatalogFilterOptions = (
  catalogOptions: CampaignCatalogOption[],
  selectedValues: unknown
): Array<{ id: string; label: string }> => {
  const optionsMap = new Map<string, { id: string; label: string }>()

  catalogOptions.forEach(option => {
    const id = getCatalogFilterValue(option)
    if (!id) return
    optionsMap.set(id, { id, label: option.label || option.value || option.code || 'Unknown' })
  })

  const selected = Array.isArray(selectedValues) ? selectedValues : []
  selected.forEach(value => {
    if (typeof value !== 'string' || optionsMap.has(value)) return
    optionsMap.set(value, { id: value, label: value })
  })

  return Array.from(optionsMap.values())
}

export const createRevenueAlignmentFilterConfiguration = (
  statusCatalogOptions: CampaignCatalogOption[],
  segmentCatalogOptions: CampaignCatalogOption[],
  selectedFilters: Record<string, unknown>
): FilterConfiguration => {
  const statusOptions = buildCatalogFilterOptions(statusCatalogOptions, selectedFilters.status)
  const segmentOptions = buildCatalogFilterOptions(segmentCatalogOptions, selectedFilters.segment)

  return {
    id: 'revenue-alignment-filters',
    name: 'Revenue Alignment Filters',
    groups: [
      {
        id: 'status-group',
        label: 'Status',
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'status',
            field: 'status',
            label: 'Status',
            type: 'multi-select',
            config: {
              options: statusOptions,
              searchPlaceholder: 'Search statuses...'
            }
          }
        ]
      },
      {
        id: 'segment-group',
        label: 'Segment',
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'segment',
            field: 'segment',
            label: 'Segment',
            type: 'multi-select',
            config: {
              options: segmentOptions,
              searchPlaceholder: 'Search segments...'
            }
          }
        ]
      }
    ]
  }
}

export const createRevenueAlignmentColumns = (
  t: (key: string) => string,
  getStatusBadgeVariant: (status?: { value?: string; code?: string; objectValue?: any }) => any
) => [
  { id: 'name', accessorKey: 'name', header: t('dashboard-revenue-campaign') },
  {
    id: 'status',
    accessorKey: 'customerCampaignStatus',
    header: t('dashboard-revenue-status'),
    cell: ({ row }: { row: { original: RevenueAlignmentRow } }) =>
      row.original.customerCampaignStatus ? (
        <Badge
          variant={getStatusBadgeVariant(row.original.customerCampaignStatus)}
          data-testid={`revenue-status-${row.original.id}`}
        >
          {row.original.customerCampaignStatus.value}
        </Badge>
      ) : (
        '-'
      )
  },
  {
    id: 'segment',
    accessorKey: 'customerCampaignSegment',
    header: REVENUE_ALIGNMENT_COLUMN_LABELS.segment,
    cell: ({ row }: { row: { original: RevenueAlignmentRow } }) => row.original.customerCampaignSegment?.value || '-'
  },
  {
    id: 'budgetAllocated',
    accessorKey: 'budgetAllocated',
    header: t('dashboard-revenue-budget'),
    cell: ({ row }: { row: { original: RevenueAlignmentRow } }) =>
      row.original.budgetAllocated == null ? '-' : formatRevenueAlignmentCurrency(row.original.budgetAllocated)
  },
  {
    id: 'pipelineTarget',
    accessorKey: 'pipelineTarget',
    header: t('dashboard-revenue-pipelineTarget'),
    cell: ({ row }: { row: { original: RevenueAlignmentRow } }) =>
      row.original.pipelineTarget == null ? '-' : formatRevenueAlignmentCurrency(row.original.pipelineTarget)
  },
  {
    id: 'pipelineGenerated',
    accessorKey: 'pipelineGenerated',
    header: t('dashboard-revenue-pipelineGenerated'),
    cell: ({ row }: { row: { original: RevenueAlignmentRow } }) =>
      formatRevenueAlignmentCurrency(row.original.pipelineGenerated)
  },
  {
    id: 'opportunitiesCreated',
    accessorKey: 'opportunitiesCreated',
    header: t('dashboard-revenue-opportunitiesCreated'),
    cell: ({ row }: { row: { original: RevenueAlignmentRow } }) => row.original.opportunitiesCreated.toLocaleString()
  },
  {
    id: 'costPerOpportunity',
    accessorKey: 'costPerOpportunity',
    header: t('dashboard-revenue-costPerOpportunity'),
    cell: ({ row }: { row: { original: RevenueAlignmentRow } }) =>
      formatOptionalRevenueAlignmentCurrency(row.original.costPerOpportunity)
  },
  {
    id: 'totalEventBudget',
    accessorKey: 'totalEventBudget',
    header: t('dashboard-revenue-totalEventBudget'),
    cell: ({ row }: { row: { original: RevenueAlignmentRow } }) =>
      formatOptionalRevenueAlignmentCurrency(row.original.totalEventBudget)
  },
  {
    id: 'totalPipelineFromEvents',
    accessorKey: 'totalPipelineFromEvents',
    header: t('dashboard-revenue-totalPipelineFromEvents'),
    cell: ({ row }: { row: { original: RevenueAlignmentRow } }) =>
      formatOptionalRevenueAlignmentCurrency(row.original.totalPipelineFromEvents)
  },
  {
    id: 'revenueClosed',
    accessorKey: 'revenueClosed',
    header: t('dashboard-revenue-revenueClosed'),
    cell: ({ row }: { row: { original: RevenueAlignmentRow } }) =>
      formatRevenueAlignmentCurrency(row.original.revenueClosed)
  },
  {
    id: 'percentToGoal',
    accessorKey: 'percentToGoal',
    header: t('dashboard-revenue-percentGoal'),
    cell: ({ row }: { row: { original: RevenueAlignmentRow } }) => (
      <Badge variant={getGoalBadgeVariant(row.original.percentToGoal)} data-testid={`revenue-goal-${row.original.id}`}>
        {row.original.percentToGoal}%
      </Badge>
    )
  }
]
