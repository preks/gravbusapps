import { useState, useEffect, useCallback, useMemo } from 'react'
import { createOpportunityColumns } from '@/common/components/common-relations/view-layouts/opportunity-layout/config/opportunityColumns'
import { OpportunityListLayout } from '@/common/components/common-relations/view-layouts/opportunity-layout/components/OpportunityListLayout'
import { navigateTo } from '@/common/utils/navigationUtils'

export interface StageOpportunitiesTableProps {
  stageRef: string
  pipelineId?: string
  fetchOpportunities: (variables: {
    opportunityPipelineStageIds?: string[]
    opportunityPipelineIds?: string[]
    limit?: number
    offset?: number
    orderBy?: Array<{ field: string; direction: string }>
  }) => Promise<{ opportunities: Array<{ id?: string; [key: string]: any }>; total: number }>
  buildRecordUrl: (id: string) => string
  dataTestId?: string
}

const PAGE_SIZE = 20

export function StageOpportunitiesTable({
  stageRef,
  pipelineId,
  fetchOpportunities,
  buildRecordUrl,
  dataTestId = 'stage-opportunities-table'
}: Readonly<StageOpportunitiesTableProps>) {
  const [opportunities, setOpportunities] = useState<Array<{ id?: string; [key: string]: any }>>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: PAGE_SIZE })

  const load = useCallback(
    async (
      currentPagination: { pageIndex: number; pageSize: number },
      currentSorting: Array<{ id: string; desc: boolean }>
    ) => {
      setLoading(true)
      setError(null)
      try {
        const orderBy =
          currentSorting.length > 0
            ? [
                {
                  field: currentSorting[0].id,
                  direction: currentSorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
                }
              ]
            : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]

        const result = await fetchOpportunities({
          opportunityPipelineStageIds: [stageRef],
          ...(pipelineId ? { opportunityPipelineIds: [pipelineId] } : {}),
          limit: currentPagination.pageSize,
          offset: currentPagination.pageIndex * currentPagination.pageSize,
          orderBy
        })

        setOpportunities(result.opportunities)
        setTotal(result.total)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load opportunities')
      } finally {
        setLoading(false)
      }
    },
    [fetchOpportunities, stageRef, pipelineId]
  )

  useEffect(() => {
    load(pagination, sorting)
  }, [load, pagination, sorting])

  const handleSortingChange = useCallback((newSorting: Array<{ id: string; desc: boolean }>) => {
    setSorting(newSorting)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handlePaginationChange = useCallback((newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
  }, [])

  const handleRowClick = useCallback(
    (row: { id?: string; [key: string]: any }) => {
      if (row.id) navigateTo(buildRecordUrl(row.id))
    },
    [buildRecordUrl]
  )

  const columns = useMemo(() => createOpportunityColumns(), [])

  return (
    <OpportunityListLayout
      data={opportunities as any}
      loading={loading}
      error={error}
      totalCount={total}
      columns={columns as any}
      sorting={sorting}
      onSortingChange={handleSortingChange}
      pagination={pagination}
      onPaginationChange={handlePaginationChange}
      onRowClick={handleRowClick as any}
      dataTestId={dataTestId}
    />
  )
}

export default StageOpportunitiesTable
