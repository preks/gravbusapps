import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { DataDisplay, DataTable } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { ContextDTO } from '@/common/data/resources/types/context.types'
import type { ActionAssignmentDTO } from '@/common/data/resources/types/assignment.types'

interface DebugTabProps extends BusinessAppContextProps {
  'data-testid'?: string
  onCountChange?: (count: number) => void
  isActive?: boolean
  shouldInitialLoad?: boolean
}

export const DebugTab: React.FC<DebugTabProps> = ({
  'data-testid': dataTestId = 'debug-tab',
  onCountChange,
  isActive = true,
  shouldInitialLoad = false,
  ...context
}) => {
  const resourceClient = useResourceClient(context.accessToken)
  const [allContexts, setAllContexts] = useState<ContextDTO[]>([])
  const [allAssignments, setAllAssignments] = useState<ActionAssignmentDTO[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedRef = useRef(false)
  const [searchValue, setSearchValue] = useState<string>('')
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })

  // Fetch all contexts and assignments
  const fetchAllData = useCallback(async () => {
    if (!context.accessToken) {
      setError('Access token not available')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch contexts with default pagination (no limit/offset to avoid 500 errors)
      const contextsPage = await resourceClient.action.getContexts({
        // No params - use API defaults
      })

      // Fetch assignments with default pagination (no limit/offset to avoid 500 errors)
      const assignmentsPage = await resourceClient.action.getActionAssignments({
        // No params - use API defaults
      })

      setAllContexts(contextsPage?.data || [])
      setAllAssignments(assignmentsPage?.data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch debug data'
      setError(errorMessage)
      console.error('Error fetching debug data:', err)
      setAllContexts([])
      setAllAssignments([])
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, resourceClient])

  // Initial load or when tab becomes active
  useEffect(() => {
    if ((shouldInitialLoad || isActive) && !loadedRef.current && context.accessToken) {
      loadedRef.current = true
      fetchAllData()
    }
  }, [shouldInitialLoad, isActive, context.accessToken, fetchAllData])

  // Find contexts that are NOT in assignments
  const orphanedContexts = useMemo(() => {
    const contextIdsInAssignments = new Set<string>()

    allAssignments.forEach(assignment => {
      if (assignment.context?.id) {
        contextIdsInAssignments.add(assignment.context.id)
      }
    })

    return allContexts.filter(context => !contextIdsInAssignments.has(context.id))
  }, [allContexts, allAssignments])

  // Update parent count
  useEffect(() => {
    if (onCountChange) {
      onCountChange(orphanedContexts.length)
    }
  }, [orphanedContexts.length, onCountChange])

  // Filter and sort data
  const safeData = useMemo(() => {
    let filtered = orphanedContexts.map(ctx => ({
      ...ctx,
      id: ctx.id
    }))

    // Apply search filter
    if (searchValue.trim()) {
      const searchLower = searchValue.toLowerCase()
      filtered = filtered.filter(ctx => ctx.contextName?.toLowerCase().includes(searchLower))
    }

    // Apply sorting
    if (sorting.length > 0) {
      const sort = sorting[0]
      filtered = [...filtered].sort((a, b) => {
        let aValue: any
        let bValue: any

        if (sort.id === 'contextName') {
          aValue = a.contextName || ''
          bValue = b.contextName || ''
        } else {
          return 0
        }

        const aStr = String(aValue).toLowerCase()
        const bStr = String(bValue).toLowerCase()
        const comparison = aStr.localeCompare(bStr)
        return sort.desc ? -comparison : comparison
      })
    }

    return filtered
  }, [orphanedContexts, searchValue, sorting])

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = pagination.pageIndex * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    return safeData.slice(startIndex, endIndex)
  }, [safeData, pagination.pageIndex, pagination.pageSize])

  const columns = useMemo(
    () => [
      {
        id: 'contextName',
        accessorKey: 'contextName',
        header: 'Context Name',
        cell: ({ row }: { row: { original: ContextDTO } }) => (
          <div className="gba:font-medium">{row.original.contextName || '-'}</div>
        )
      },
      {
        id: 'contextData',
        header: 'Context Data',
        cell: ({ row }: { row: { original: ContextDTO } }) => (
          <span className="gba:text-sm">{row.original.contextData?.length || 0} data fields</span>
        )
      }
    ],
    []
  )

  const getRowId = useCallback((row: ContextDTO) => {
    return row.id || `fallback-${Math.random()}`
  }, [])

  const sortableColumns = useMemo(() => [{ id: 'contextName', label: 'Context Name' }], [])

  return (
    <DataDisplay
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      searchPlaceholder="Search by context name..."
      sorting={sorting}
      sortableColumns={sortableColumns}
      onSortingChange={setSorting}
      data-testid={dataTestId}
    >
      <DataTable<ContextDTO>
        variant="compact"
        data={paginatedData}
        columns={columns}
        getRowId={getRowId}
        loading={isLoading}
        error={error || undefined}
        totalCount={safeData.length}
        enablePagination
        pagination={pagination}
        onPaginationChange={setPagination}
        enableSorting
        enableSelection={false}
        sorting={sorting}
        onSortingChange={setSorting}
        globalFilter={searchValue}
        onGlobalFilterChange={setSearchValue}
        enableGlobalFilter
        rowsPerPageOptions={[10, 20, 50, 100]}
        tableLayout="fixed"
        enableResizing={true}
        enableColumnPinning
        emptyMessage="No orphaned contexts found (all contexts are assigned)"
        data-testid={`${dataTestId}-table`}
      />
    </DataDisplay>
  )
}
