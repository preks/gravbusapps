import { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, DataDisplay } from '@newwork/nw-design-system'
import { navigateTo } from '@/common/utils/navigationUtils'
import { OpportunityListLayout } from '@/common/components/common-relations/view-layouts/opportunity-layout'
import { createOpportunityColumns } from '@/common/components/common-relations/view-layouts/opportunity-layout/config/opportunityColumns'
import type { GenericOpportunity, OpportunitySectionProps } from './types'

export const OpportunitySection = <T extends GenericOpportunity = GenericOpportunity>({
  opportunities,
  isLoading = false,
  error = null,
  recordUrlBuilder,
  accountUrlBuilder,
  className = '',
  'data-testid': dataTestId = 'opportunity-section'
}: Omit<OpportunitySectionProps<T>, 'onRetry'>) => {
  // State for DataTable
  const [searchTerm, setSearchTerm] = useState('')
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'created', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'opportunity',
    'amount',
    'account',
    'stage',
    'status',
    'owner',
    'closeDate',
    'created'
  ])

  // Handle row click
  const handleRowClick = useCallback(
    (opportunity: T) => {
      const url = recordUrlBuilder(opportunity.id)
      navigateTo(url)
    },
    [recordUrlBuilder]
  )

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  // Filter opportunities based on search
  const filteredOpportunities = useMemo(() => {
    if (!searchTerm.trim()) return opportunities

    const search = searchTerm.toLowerCase()
    return opportunities.filter(opp => {
      const name = (opp.name || '').toLowerCase()
      const owner = `${opp.ownerEmployee?.firstName || ''} ${opp.ownerEmployee?.lastName || ''}`.toLowerCase()
      const stage = (opp.opportunityPipelineStage?.value || opp.opportunityPipelineStage?.code || '').toLowerCase()
      const status = (opp.opportunityStatus?.value || opp.opportunityStatus?.code || '').toLowerCase()

      return name.includes(search) || owner.includes(search) || stage.includes(search) || status.includes(search)
    })
  }, [opportunities, searchTerm])

  // Sort opportunities
  const sortedOpportunities = useMemo(() => {
    if (sorting.length === 0) return filteredOpportunities

    const { id: sortField, desc } = sorting[0]
    const sorted = [...filteredOpportunities].sort((a, b) => {
      let aVal: any
      let bVal: any

      switch (sortField) {
        case 'opportunity':
          aVal = a.name || ''
          bVal = b.name || ''
          break
        case 'amount':
          aVal = a.estimatedAmount || 0
          bVal = b.estimatedAmount || 0
          break
        case 'stage':
          aVal = a.opportunityPipelineStage?.value || a.opportunityPipelineStage?.code || ''
          bVal = b.opportunityPipelineStage?.value || b.opportunityPipelineStage?.code || ''
          break
        case 'status':
          aVal = a.opportunityStatus?.value || a.opportunityStatus?.code || ''
          bVal = b.opportunityStatus?.value || b.opportunityStatus?.code || ''
          break
        case 'account':
          aVal = a.account?.name || ''
          bVal = b.account?.name || ''
          break
        case 'owner':
          aVal = `${a.ownerEmployee?.firstName || ''} ${a.ownerEmployee?.lastName || ''}`.trim()
          bVal = `${b.ownerEmployee?.firstName || ''} ${b.ownerEmployee?.lastName || ''}`.trim()
          break
        case 'closeDate':
          aVal = a.closeDate || ''
          bVal = b.closeDate || ''
          break
        case 'created':
          aVal = a.createdAt || ''
          bVal = b.createdAt || ''
          break
        default:
          return 0
      }

      if (aVal < bVal) return desc ? 1 : -1
      if (aVal > bVal) return desc ? -1 : 1
      return 0
    })

    return sorted
  }, [filteredOpportunities, sorting])

  // Paginate opportunities
  const paginatedOpportunities = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    const end = start + pagination.pageSize
    return sortedOpportunities.slice(start, end)
  }, [sortedOpportunities, pagination])

  // Use central columns
  const columns = useMemo(() => createOpportunityColumns(accountUrlBuilder || (() => '')), [accountUrlBuilder])

  const availableColumns = useMemo(
    () => [
      { id: 'opportunity', label: 'Opportunity Name' },
      { id: 'amount', label: 'Value' },
      { id: 'account', label: 'Account' },
      { id: 'stage', label: 'Stage' },
      { id: 'status', label: 'Status' },
      { id: 'owner', label: 'Owner' },
      { id: 'closeDate', label: 'Close Date' },
      { id: 'created', label: 'Created' }
    ],
    []
  )

  const sortableColumns = useMemo(
    () => [
      { id: 'opportunity', label: 'Opportunity Name' },
      { id: 'amount', label: 'Value' },
      { id: 'account', label: 'Account' },
      { id: 'stage', label: 'Stage' },
      { id: 'status', label: 'Status' },
      { id: 'owner', label: 'Owner' },
      { id: 'closeDate', label: 'Close Date' },
      { id: 'created', label: 'Created' }
    ],
    []
  )

  return (
    <Card className={`gba:w-full ${className}`} data-testid={dataTestId}>
      <CardContent className="gba:p-0">
        <DataDisplay
          titleSections={[
            {
              id: 'opportunities',
              label: 'Opportunities',
              metadata: {
                count: filteredOpportunities.length
              }
            }
          ]}
          currentSection="opportunities"
          searchValue={searchTerm}
          searchPlaceholder="Search opportunities..."
          onSearchChange={handleSearch}
          sorting={sorting}
          sortableColumns={sortableColumns}
          onSortingChange={setSorting}
          availableColumns={availableColumns}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          toolbarDensity="compact"
        >
          <OpportunityListLayout<T>
            data={paginatedOpportunities}
            loading={isLoading}
            error={error}
            totalCount={filteredOpportunities.length}
            columns={columns.filter(col => visibleColumns.includes(col.id as string)) as any}
            sorting={sorting}
            onSortingChange={setSorting}
            pagination={pagination}
            onPaginationChange={setPagination}
            onRowClick={handleRowClick}
            dataTestId={`${dataTestId}-list`}
          />
        </DataDisplay>
      </CardContent>
    </Card>
  )
}

export default OpportunitySection
