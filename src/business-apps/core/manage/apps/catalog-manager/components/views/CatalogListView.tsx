import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Spinner,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { Plus, Database, Calendar, MoreHorizontal, Pencil, Trash2, Check } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogs, Catalog, useCreateCatalog, useDeleteCatalog, useUpdateCatalog } from '@/common/data/catalog'
import { DebouncedInput } from '@/components/debounced-input'
import { CatalogDialog, CatalogFormData } from '../forms/CatalogDialog'

interface CatalogListViewProps extends BusinessAppContextProps {
  onViewCatalog: (catalog: Catalog) => void
  'data-testid'?: string
}

interface CatalogListState {
  pagination: {
    current: number
    pageSize: number
  }
  filters: {
    search: string
  }
}

export const CatalogListView: React.FC<CatalogListViewProps> = ({
  onViewCatalog,
  'data-testid': dataTestId = 'CatalogListView',
  ...context
}) => {
  const [state, setState] = useState<CatalogListState>({
    pagination: {
      current: 1,
      pageSize: 20
    },
    filters: {
      search: ''
    }
  })

  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const { fetchCatalogs } = useCatalogs(context)

  // CRUD operations (centralized hooks)
  const { createCatalog } = useCreateCatalog(context)
  const { deleteCatalog } = useDeleteCatalog(context)
  const { updateCatalog } = useUpdateCatalog(context)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isUpdateOpen, setIsUpdateOpen] = useState(false)
  const [editingCatalog, setEditingCatalog] = useState<Catalog | null>(null)

  const loadCatalogs = useCallback(
    async (page: number = 1, search: string = '') => {
      const variables = {
        limit: state.pagination.pageSize,
        offset: (page - 1) * state.pagination.pageSize,
        search: search.trim() || undefined
      }

      setState(prev => ({
        ...prev,
        pagination: { ...prev.pagination, current: page },
        filters: { search }
      }))

      try {
        const list = await fetchCatalogs(variables)
        setCatalogs(list.items)
        setTotalCount(list.total)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    },
    [fetchCatalogs, state.pagination.pageSize]
  )

  useEffect(() => {
    setIsLoading(true)
    loadCatalogs(1, state.filters.search).finally(() => setIsLoading(false))
  }, [])

  const handleSearchChange = useCallback(
    (value: string) => {
      setState(prev => ({
        ...prev,
        filters: { ...prev.filters, search: value },
        pagination: { ...prev.pagination, current: 1 }
      }))
      loadCatalogs(1, value)
    },
    [loadCatalogs]
  )

  const handlePageChange = useCallback(
    (page: number) => {
      loadCatalogs(page, state.filters.search)
    },
    [loadCatalogs, state.filters.search]
  )

  const handleCreateCatalog = useCallback(() => {
    setIsCreateOpen(true)
  }, [])

  // Helper to format date to YYYY-MM-DDTHH:mm:ss
  const formatDateTimeForAPI = (dateStr?: string): string | undefined => {
    if (!dateStr) return undefined
    // If already has time portion, extract just the date and time without milliseconds/timezone
    if (dateStr.includes('T')) {
      return dateStr.slice(0, 19)
    }
    // If just a date (YYYY-MM-DD), append time
    return `${dateStr}T00:00:00`
  }

  const handleSubmitCreate = useCallback(
    async (data: CatalogFormData) => {
      const payload = {
        parentId: data.parentId || undefined,
        parentName: data.parentName || undefined,
        identifier: data.identifier,
        name: data.name,
        version: 'v1',
        validFrom: formatDateTimeForAPI(data.validFrom),
        validTo: formatDateTimeForAPI(data.validTo),
        defaultLocale: data.defaultLocale,
        description: data.description || undefined,
        isCustomerManaged: data.isCustomerManaged ?? false
      } as any
      const created = await createCatalog(payload)
      if (created) {
        // Open newly created catalog in detail view as a new tab
        const newCatalog = {
          id: created.id || `${created.identifier}:${created.version || 'v1'}`,
          identifier: created.identifier,
          version: created.version || 'v1',
          name: created.name
        } as unknown as Catalog
        handleViewCatalog(newCatalog)
        await loadCatalogs(1, state.filters.search)
      }
    },
    [createCatalog, loadCatalogs, state.filters.search]
  )

  const handleViewCatalog = useCallback(
    (catalog: Catalog) => {
      onViewCatalog(catalog)
    },
    [onViewCatalog]
  )

  const handleDeleteCatalog = useCallback(
    async (catalog: Catalog) => {
      if (!window.confirm(`Delete catalog "${catalog.name}" (${catalog.identifier})?`)) return
      await deleteCatalog(catalog.identifier, catalog.version || 'v1')
      await loadCatalogs(state.pagination.current, state.filters.search)
    },
    [deleteCatalog, loadCatalogs, state.pagination.current, state.filters.search]
  )

  const renderCatalogRow = (catalog: Catalog) => (
    <TableRow
      key={catalog.id}
      data-testid={`${dataTestId}-CatalogRow-${catalog.id}`}
      onClick={() => handleViewCatalog(catalog)}
      className="gba:cursor-pointer"
      style={{
        transition: 'background-color 0.2s ease'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = 'var(--nw-color-surface-secondary)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      <TableCell className="gba:font-medium">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Database className="gba:h-4 gba:w-4" style={{ color: catalog.color || 'var(--nw-color-primary-500)' }} />
          {catalog.displayName}
        </div>
        <div className="gba:text-xs gba:mt-1" style={{ color: 'var(--nw-color-text-secondary)' }}>
          {catalog.entriesCount} entries
        </div>
      </TableCell>
      <TableCell>
        <code
          className="gba:text-sm"
          style={{
            backgroundColor: 'var(--nw-color-surface-secondary)',
            padding: 'var(--nw-spacing-xs)',
            borderRadius: 'var(--nw-border-radius-sm)'
          }}
        >
          {catalog.identifier}
        </code>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          style={{
            backgroundColor:
              catalog.status === 'active'
                ? 'var(--nw-color-success-50)'
                : catalog.status === 'draft'
                  ? 'var(--nw-color-warning-50)'
                  : 'var(--nw-color-surface-secondary)',
            borderColor:
              catalog.status === 'active'
                ? 'var(--nw-color-success-200)'
                : catalog.status === 'draft'
                  ? 'var(--nw-color-warning-200)'
                  : 'var(--nw-color-border-default)'
          }}
        >
          {catalog.status}
        </Badge>
      </TableCell>
      <TableCell className="gba:max-w-xs gba:truncate">
        {catalog.description || <span style={{ color: 'var(--nw-color-text-secondary)' }}>No description</span>}
      </TableCell>
      <TableCell>
        {catalog.lastUpdated ? (
          <div
            className="gba:flex gba:items-center gba:gap-1 gba:text-sm"
            style={{ color: 'var(--nw-color-text-secondary)' }}
          >
            <Calendar className="gba:h-3 gba:w-3" />
            {new Date(catalog.lastUpdated).toLocaleDateString()}
          </div>
        ) : (
          <span style={{ color: 'var(--nw-color-text-secondary)' }}>—</span>
        )}
      </TableCell>
      <TableCell>
        <div className="gba:flex gba:items-center gba:justify-center">
          {catalog.isCustomerManaged ? <Check className="gba:h-4 gba:w-4 gba:text-success" /> : null}
        </div>
      </TableCell>
      <TableCell className="gba:w-[60px]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={e => e.stopPropagation()}
              data-testid={`${dataTestId}-RowActions-${catalog.id}`}
            >
              <MoreHorizontal className="gba:h-4 gba:w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation()
                setEditingCatalog(catalog)
                setIsUpdateOpen(true)
              }}
              data-testid={`${dataTestId}-RowAction-Update-${catalog.id}`}
            >
              <Pencil className="gba:h-3 gba:w-3 gba:mr-2" />
              Update Catalog
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation()
                handleDeleteCatalog(catalog)
              }}
              data-testid={`${dataTestId}-RowAction-Delete-${catalog.id}`}
            >
              <Trash2 className="gba:h-3 gba:w-3 gba:mr-2" />
              Delete Catalog
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )

  if (error) {
    return (
      <div className="gba:p-6" data-testid={`${dataTestId}-Error`}>
        <Alert variant="destructive">
          <h4 className="gba:font-semibold">Error Loading Catalogs</h4>
          <p className="gba:text-sm">{error}</p>
          <Button
            size="sm"
            onClick={() => loadCatalogs(state.pagination.current, state.filters.search)}
            className="gba:mt-2"
          >
            Retry
          </Button>
        </Alert>
      </div>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid={dataTestId}>
      {/* Header Actions */}
      <div className="gba:flex gba:justify-between gba:items-center gba:flex-wrap gba:gap-4">
        <div className="gba:flex gba:items-center gba:gap-4 gba:flex-1">
          <DebouncedInput
            placeholder="Search catalogs by name..."
            value={state.filters.search}
            onChange={handleSearchChange}
            className="gba:max-w-md"
            data-testid={`${dataTestId}-SearchInput`}
          />
        </div>

        <Button onClick={handleCreateCatalog} data-testid={`${dataTestId}-CreateButton`}>
          <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
          Create Catalog
        </Button>
      </div>

      <CatalogDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onSubmit={handleSubmitCreate} {...context} />

      {/* Update Catalog Dialog */}
      <CatalogDialog
        open={isUpdateOpen}
        onOpenChange={setIsUpdateOpen}
        mode="update"
        initialData={
          editingCatalog
            ? {
                parentId: editingCatalog.parentId,
                parentName: (editingCatalog as any).parentName,
                name: editingCatalog.name,
                identifier: editingCatalog.identifier,
                version: editingCatalog.version,
                validFrom: editingCatalog.validFrom,
                validTo: editingCatalog.validTo,
                defaultLocale: editingCatalog.defaultLocale as any,
                description: editingCatalog.description,
                id: editingCatalog.id,
                isCustomerManaged: editingCatalog.isCustomerManaged
              }
            : undefined
        }
        title="Update Catalog"
        submitLabel="Save"
        onSubmit={async data => {
          if (!editingCatalog) return
          await updateCatalog(editingCatalog.identifier, editingCatalog.version || 'v1', {
            id: editingCatalog.id,
            identifier: data.identifier,
            name: data.name,
            version: editingCatalog.version || 'v1',
            parentId: data.parentId,
            parentName: data.parentName,
            validFrom: formatDateTimeForAPI(data.validFrom),
            validTo: formatDateTimeForAPI(data.validTo),
            defaultLocale: data.defaultLocale as any,
            description: data.description,
            isCustomerManaged: data.isCustomerManaged ?? false
          } as any)
          setIsUpdateOpen(false)
          setEditingCatalog(null)
          await loadCatalogs(state.pagination.current, state.filters.search)
        }}
        {...context}
      />

      {/* Catalogs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Catalog Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="gba:flex gba:justify-center gba:py-8" data-testid={`${dataTestId}-Loading`}>
              <Spinner size="lg" />
            </div>
          ) : catalogs.length === 0 ? (
            <div
              className="gba:text-center gba:py-8"
              style={{ color: 'var(--nw-color-text-secondary)' }}
              data-testid={`${dataTestId}-EmptyState`}
            >
              <Database className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4" />
              <p className="gba:text-lg gba:font-medium">No catalogs found</p>
              <p className="gba:text-sm">
                {state.filters.search
                  ? 'Try adjusting your search criteria'
                  : 'Get started by creating your first catalog'}
              </p>
              {!state.filters.search && (
                <Button
                  onClick={handleCreateCatalog}
                  className="gba:mt-4"
                  data-testid={`${dataTestId}-EmptyCreateButton`}
                >
                  <Plus className="gba:h-4 gba:w-4 gba:mr-2" />
                  Create First Catalog
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table data-testid={`${dataTestId}-Table`}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Identifier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Customer Managed</TableHead>
                    <TableHead className="gba:w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{catalogs.map(renderCatalogRow)}</TableBody>
              </Table>

              {/* Pagination */}
              {totalCount > state.pagination.pageSize && (
                <div className="gba:flex gba:items-center gba:justify-between gba:mt-6">
                  <div className="gba:text-sm" style={{ color: 'var(--nw-color-text-secondary)' }}>
                    Showing {(state.pagination.current - 1) * state.pagination.pageSize + 1} to{' '}
                    {Math.min(state.pagination.current * state.pagination.pageSize, totalCount)} of {totalCount}{' '}
                    catalogs
                  </div>
                  <div className="gba:flex gba:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={state.pagination.current === 1}
                      onClick={() => handlePageChange(state.pagination.current - 1)}
                      data-testid={`${dataTestId}-PrevPageButton`}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={state.pagination.current * state.pagination.pageSize >= totalCount}
                      onClick={() => handlePageChange(state.pagination.current + 1)}
                      data-testid={`${dataTestId}-NextPageButton`}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default CatalogListView
