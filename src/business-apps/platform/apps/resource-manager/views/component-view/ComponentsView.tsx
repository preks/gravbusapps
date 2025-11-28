import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { DataDisplay, DataTable, Button, Badge } from '@newwork/nw-design-system'
import { Check, X } from '@phosphor-icons/react'
import { RefreshCw } from 'lucide-react'
import type { ExpandedState, Row } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useComponentResources } from '@/common/data/resources/hooks/useComponentResources'
import type { ComponentResource } from '@/common/data/resources/types/component.types'

interface ComponentsViewProps extends BusinessAppContextProps {
  'data-testid'?: string
}

export const ComponentsView: React.FC<ComponentsViewProps> = ({
  'data-testid': dataTestId = 'components-view',
  ...context
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'name', desc: false }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [expanded, setExpanded] = useState<ExpandedState>({})

  // Calculate limit and offset from pagination
  const limit = pagination.pageSize
  const offset = pagination.pageIndex * pagination.pageSize

  const { resources, totalCount, isLoading, error, refetch } = useComponentResources(context, { limit, offset })

  // Track last fetched pagination to prevent duplicate requests
  const lastFetchedRef = useRef<{ limit: number; offset: number } | null>(null)
  const isInitialMount = useRef(true)

  // Load data when pagination changes
  useEffect(() => {
    // Only fetch if pagination actually changed
    const paginationKey = `${limit}-${offset}`
    const lastKey = lastFetchedRef.current ? `${lastFetchedRef.current.limit}-${lastFetchedRef.current.offset}` : null

    if (paginationKey !== lastKey) {
      lastFetchedRef.current = { limit, offset }
      // Only show loading on initial mount
      refetch({ limit, offset }, isInitialMount.current)
      isInitialMount.current = false
    }
  }, [limit, offset]) // Don't include refetch to avoid infinite loops

  // Note: Search should be API-based in the future
  // For now, we use client-side filtering as a temporary solution
  // API handles pagination, so we use resources directly
  const filteredResources = useMemo(() => {
    if (!searchTerm.trim()) {
      return resources
    }

    const search = searchTerm.toLowerCase()
    return resources.filter(resource => {
      return (
        resource.name.toLowerCase().includes(search) ||
        resource.screenKey.toLowerCase().includes(search) ||
        resource.screenComponents?.formDefinition?.componentPath?.toLowerCase().includes(search) ||
        resource.screenComponents?.formDefinition?.version?.toLowerCase().includes(search)
      )
    })
  }, [resources, searchTerm])

  // Use filtered resources (API handles pagination, we only filter client-side for search)
  const displayResources = filteredResources

  const formatComponentPath = (path: string | undefined): string => {
    if (!path) return '-'
    return path.startsWith('/') ? path.substring(1) : path
  }

  const getRowId = useCallback((row: ComponentResource) => {
    return row.id || `fallback-${Math.random()}`
  }, [])

  const getRowCanExpand = useCallback(() => {
    // All rows can be expanded to show version details
    return true
  }, [])

  const renderExpandedRow = useCallback(
    (row: Row<ComponentResource>) => {
      const resource = row.original
      const prodVersions = resource.azureVersions.prod?.versions || []
      // Sort descending (newest first)
      const prodSortedVersions = [...prodVersions].sort((a, b) => parseInt(b) - parseInt(a))

      return (
        <div data-testid={`${dataTestId}-expanded-row-${resource.id}`}>
          <h4 className="gba:font-semibold gba:mb-3 gba:text-sm">Available PROD Versions</h4>
          {prodSortedVersions.length > 0 ? (
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              {prodSortedVersions.map(version => (
                <span
                  key={version}
                  className="gba:inline-flex gba:items-center gba:px-2.5 gba:py-1 gba:rounded gba:text-xs gba:bg-muted"
                >
                  {version}
                </span>
              ))}
            </div>
          ) : (
            <span className="gba:text-sm gba:text-muted-foreground">No PROD versions found</span>
          )}
        </div>
      )
    },
    [dataTestId]
  )

  // Define columns for DataTable
  const columns = useMemo(
    () => [
      {
        id: 'namespace',
        accessorKey: 'namespaceCode',
        header: 'Namespace',
        size: 120,
        cell: ({ row }: { row: { original: ComponentResource } }) => (
          <span className="gba:inline-flex gba:items-center gba:px-2 gba:py-1 gba:rounded gba:text-xs gba:border">
            {row.original.namespaceCode}
          </span>
        )
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Name',
        size: 300,
        cell: ({ row }: { row: { original: ComponentResource } }) => (
          <div>
            <div className="gba:font-medium">{row.original.name}</div>
            <code className="gba:text-xs gba:text-muted-foreground">{row.original.screenKey}</code>
          </div>
        )
      },
      {
        id: 'componentPath',
        accessorKey: 'componentPath',
        header: 'Component Path',
        size: 300,
        cell: ({ row }: { row: { original: ComponentResource } }) => {
          const hasUnversioned = row.original.azureVersions.dev.hasUnversioned
          return (
            <div className="gba:flex gba:items-center gba:gap-2">
              <code className="gba:text-xs gba:bg-muted gba:px-2 gba:py-1 gba:rounded">
                {formatComponentPath(row.original.screenComponents?.formDefinition?.componentPath)}
              </code>
              {hasUnversioned ? (
                <Check className="gba:w-4 gba:h-4 gba:text-success" weight="bold" title="index.js exists" />
              ) : (
                <X className="gba:w-4 gba:h-4 gba:text-destructive" weight="bold" title="index.js not found" />
              )}
            </div>
          )
        }
      },
      {
        id: 'prodVersion',
        accessorKey: 'prodVersion',
        header: 'PROD Version',
        size: 150,
        cell: ({ row }: { row: { original: ComponentResource } }) => {
          const prodVersions = row.original.azureVersions.prod?.versions || []
          if (prodVersions.length === 0) {
            return <span className="gba:text-muted-foreground gba:text-sm">-</span>
          }
          // Get most recent version (highest number)
          const sortedVersions = [...prodVersions].sort((a, b) => parseInt(b) - parseInt(a))
          const mostRecent = sortedVersions[0]
          return (
            <div className="gba:relative gba:inline-flex gba:items-center">
              <span className="gba:inline-flex gba:items-center gba:px-2 gba:py-1 gba:rounded gba:text-xs gba:border">
                {mostRecent}
              </span>
              <Badge variant="info" size="sm" className="gba:absolute gba:-top-2 gba:-right-2">
                {prodVersions.length}
              </Badge>
            </div>
          )
        }
      },
      {
        id: 'updatedAt',
        accessorKey: 'updatedAt',
        header: 'Updated',
        size: 120,
        cell: ({ row }: { row: { original: ComponentResource } }) => {
          const date = row.original.updatedAt || row.original.createdAt
          return (
            <span className="gba:text-sm gba:text-muted-foreground">
              {date ? new Date(date).toLocaleDateString() : '-'}
            </span>
          )
        }
      }
    ],
    [dataTestId]
  )

  const handleSortingChange = useCallback((newSorting: Array<{ id: string; desc: boolean }>) => {
    setSorting(newSorting)
  }, [])

  const sortableColumns = useMemo(
    () => [
      { id: 'name', label: 'Name' },
      { id: 'screenKey', label: 'Screen Key' },
      { id: 'namespaceCode', label: 'Namespace' },
      { id: 'updatedAt', label: 'Updated' }
    ],
    []
  )

  const availableColumns = useMemo(() => columns.map(col => ({ id: col.id, label: col.header as string })), [columns])

  const visibleColumns = useMemo(() => columns.map(col => col.id), [columns])

  // Determine initial loading state (only when data hasn't been loaded yet)
  const isInitialLoading = isLoading && isInitialMount.current

  return (
    <div data-testid={dataTestId}>
      <DataDisplay
        titleSections={[
          {
            id: 'components',
            label: 'Components',
            metadata: {
              count: totalCount,
              isLoading: isInitialLoading
            }
          }
        ]}
        currentSection="components"
        searchValue={searchTerm}
        searchPlaceholder="Search screens..."
        onSearchChange={setSearchTerm}
        sorting={sorting}
        sortableColumns={sortableColumns}
        onSortingChange={handleSortingChange}
        availableColumns={availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={() => {}}
        primaryAction={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`gba:h-4 gba:w-4 ${isLoading ? 'gba:animate-spin' : ''}`} />
          </Button>
        }
        toolbarDensity="default"
        enableLiveFiltering
      >
        <DataTable<ComponentResource>
          variant="compact"
          data={displayResources}
          columns={columns}
          getRowId={getRowId}
          loading={isInitialLoading}
          error={error || undefined}
          totalCount={totalCount}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          pagination={pagination}
          onPaginationChange={setPagination}
          enablePagination
          enableSorting
          enableSelection={false}
          enableExpansion
          expanded={expanded}
          onExpandedChange={setExpanded}
          getRowCanExpand={getRowCanExpand}
          renderExpandedRow={renderExpandedRow}
          rowsPerPageOptions={[10, 20, 50, 100]}
          showPageNumbers
          maxVisiblePages={7}
          tableLayout="fixed"
          enableResizing={true}
          enableColumnPinning
          emptyMessage="No screens found"
          data-testid={`${dataTestId}-table`}
        />
      </DataDisplay>
    </div>
  )
}
