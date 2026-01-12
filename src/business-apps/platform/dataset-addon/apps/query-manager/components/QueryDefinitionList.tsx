import React from 'react'
import {
  Card,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Button,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Spinner,
  Alert
} from '@newwork/nw-design-system'
import { useTranslation } from '@newwork/nw-design-system'
import appTranslations from '@/business-apps/_i18n'
import {
  PencilSimpleIcon,
  TrashIcon,
  PlayCircleIcon,
  PauseCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  WarningCircleIcon
} from '@phosphor-icons/react'
import { QueryDefinition, QueryType, QueryStatus } from '@/common/network/dataset'

interface QueryDefinitionListProps {
  queries: QueryDefinition[]
  isLoading: boolean
  isUpdating: boolean
  isDeleting: boolean
  totalQueries: number
  currentPage: number
  pageSize: number
  onEdit: (query: QueryDefinition) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: QueryStatus) => void
  onPageChange: (page: number, size: number) => void
  filters: { status?: QueryStatus; search?: string }
  onFilter: (filters: { status?: QueryStatus; search?: string }) => void
  onCreateNew: () => void
  error?: string
  onRetry?: () => void
  formatErrorMessage?: (error: string) => string
}

export const QueryDefinitionList: React.FC<QueryDefinitionListProps> = ({
  queries,
  isLoading,
  isUpdating,
  isDeleting,
  totalQueries,
  currentPage,
  pageSize,
  onEdit,
  onDelete,
  onStatusChange,
  onPageChange,
  filters,
  onFilter,
  onCreateNew,
  error,
  onRetry,
  formatErrorMessage
}) => {
  const { t } = useTranslation(appTranslations)
  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    onFilter(newFilters)
  }

  const clearFilters = () => {
    onFilter({})
  }

  const getStatusVariant = (status: QueryStatus) => {
    return status === QueryStatus.ACTIVE ? 'default' : 'secondary'
  }

  const getTypeVariant = (type: QueryType) => {
    return type === QueryType.DATASET ? 'default' : 'outline'
  }

  const getStatusColor = (status: QueryStatus) => {
    return status === QueryStatus.ACTIVE
      ? { backgroundColor: 'var(--nw-color-success)', color: 'var(--nw-color-on-success)' }
      : { backgroundColor: 'var(--nw-color-warning)', color: 'var(--nw-color-on-warning)' }
  }

  const getTypeColor = (type: QueryType) => {
    return type === QueryType.DATASET
      ? { backgroundColor: 'var(--nw-color-primary)', color: 'var(--nw-color-on-primary)' }
      : { backgroundColor: 'var(--nw-color-secondary)', color: 'var(--nw-color-on-secondary)' }
  }

  return (
    <TooltipProvider>
      <div
        className="gba:h-full gba:w-full"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--nw-spacing-4)',
          height: '100%',
          width: '100%'
        }}
      >
        {/* Error Alert - Outside the list */}
        {error && (
          <Alert
            className="gba:border-destructive gba:bg-destructive/10 gba:w-full"
            style={{ marginBottom: 'var(--nw-spacing-4)' }}
            data-testid="load-error-alert"
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto auto 1fr auto',
                alignItems: 'center',
                width: '100%',
                gap: 'var(--nw-spacing-3)'
              }}
            >
              <WarningCircleIcon
                style={{
                  color: 'var(--nw-color-destructive)'
                }}
                size={20}
              />
              <span
                style={{
                  color: 'var(--nw-color-destructive)',
                  fontWeight: '600',
                  whiteSpace: 'nowrap'
                }}
              >
                Unable to Load Queries:
              </span>
              <span
                style={{
                  color: 'var(--nw-color-muted-foreground)',
                  fontSize: '14px',
                  whiteSpace: 'nowrap'
                }}
              >
                {formatErrorMessage ? formatErrorMessage(error) : error}
              </span>
              {onRetry && (
                <Button
                  size="sm"
                  onClick={onRetry}
                  style={{
                    justifySelf: 'end',
                    marginLeft: 'auto'
                  }}
                >
                  Retry
                </Button>
              )}
            </div>
          </Alert>
        )}

        <Card data-testid="query-definition-list" className="gba:h-full gba:w-full gba:flex gba:flex-col">
          <CardContent
            className="gba:h-full gba:w-full gba:flex gba:flex-col"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--nw-spacing-6)',
              height: '100%',
              width: '100%'
            }}
          >
            {/* Header */}
            <div className="gba:flex gba:justify-between gba:items-center gba:w-full">
              <h4
                style={{
                  color: 'var(--nw-color-foreground)',
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: '600'
                }}
              >
                Query Definitions ({totalQueries})
              </h4>
              {isLoading && (
                <div className="gba:flex gba:items-center" style={{ gap: 'var(--nw-spacing-2)' }}>
                  <Spinner />
                  <span style={{ color: 'var(--nw-color-muted-foreground)', fontSize: '0.875rem' }}>
                    {t('loading')}
                  </span>
                </div>
              )}
            </div>

            {/* Filters and Actions */}
            <div
              className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:w-full"
              style={{
                gap: 'var(--nw-spacing-3)'
              }}
            >
              <div className="gba:flex gba:flex-wrap gba:items-center" style={{ gap: 'var(--nw-spacing-3)' }}>
                <Select
                  value={filters.status || ''}
                  onValueChange={value => handleFilterChange('status', value || undefined)}
                >
                  <SelectTrigger data-testid="filter-by-status" className="gba:w-40">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={QueryStatus.ACTIVE}>Active</SelectItem>
                    <SelectItem value={QueryStatus.DRAFT}>Draft</SelectItem>
                  </SelectContent>
                </Select>

                <div className="gba:relative gba:w-64">
                  <MagnifyingGlassIcon
                    className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:pointer-events-none"
                    style={{ color: 'var(--nw-color-muted-foreground)' }}
                    size={16}
                  />
                  <Input
                    placeholder="Search queries..."
                    value={filters.search || ''}
                    onChange={e => handleFilterChange('search', e.target.value)}
                    data-testid="search-queries"
                    className="gba:pl-10"
                    style={{ paddingLeft: 'var(--nw-spacing-10)' }}
                  />
                </div>
              </div>

              <div className="gba:flex gba:items-center" style={{ gap: 'var(--nw-spacing-2)' }}>
                <Button
                  variant="default"
                  onClick={onCreateNew}
                  data-testid="create-new-query-button"
                  className="gba:flex gba:items-center gba:whitespace-nowrap"
                  style={{ gap: 'var(--nw-spacing-2)' }}
                >
                  <PlusIcon size={16} />
                  Create New Query
                </Button>
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  data-testid="clear-filters-button"
                  className="gba:flex gba:items-center gba:whitespace-nowrap"
                  style={{ gap: 'var(--nw-spacing-2)' }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="gba:border gba:rounded-md gba:flex-1 gba:min-h-0 gba:overflow-auto gba:w-full">
              <Table data-testid="query-definitions-table" className="gba:w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="gba:w-[300px]">Name</TableHead>
                    <TableHead className="gba:w-[100px]">Type</TableHead>
                    <TableHead className="gba:w-[100px]">Status</TableHead>
                    <TableHead className="gba:w-[120px]">Parameters</TableHead>
                    <TableHead className="gba:w-[120px]">Created</TableHead>
                    <TableHead className="gba:w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queries.map(record => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <div className="gba:font-bold" style={{ marginBottom: 'var(--nw-spacing-1)' }}>
                            {record.name}
                          </div>
                          <div
                            style={{
                              color: 'var(--nw-color-muted-foreground)',
                              fontSize: '0.75rem',
                              lineHeight: '1.2'
                            }}
                          >
                            {record.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTypeVariant(record.queryType)} style={getTypeColor(record.queryType)}>
                          {record.queryType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(record.status)} style={getStatusColor(record.status)}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span>{record.parameters.length} params</span>
                      </TableCell>
                      <TableCell>{record.createdAt ? new Date(record.createdAt).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>
                        <div className="gba:flex gba:items-center" style={{ gap: 'var(--nw-spacing-2)' }}>
                          <Tooltip>
                            <TooltipTrigger>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEdit(record)}
                                data-testid={`edit-query-${record.name}`}
                              >
                                <PencilSimpleIcon />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit Query</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isUpdating}
                                onClick={() =>
                                  onStatusChange(
                                    record.id!,
                                    record.status === QueryStatus.ACTIVE ? QueryStatus.DRAFT : QueryStatus.ACTIVE
                                  )
                                }
                                data-testid={`toggle-status-${record.name}`}
                              >
                                {record.status === QueryStatus.ACTIVE ? <PauseCircleIcon /> : <PlayCircleIcon />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{record.status === QueryStatus.ACTIVE ? 'Deactivate' : 'Activate'}</p>
                            </TooltipContent>
                          </Tooltip>

                          <AlertDialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isDeleting}
                                    data-testid={`delete-query-${record.name}`}
                                    style={{
                                      borderColor: 'var(--nw-color-destructive)',
                                      color: 'var(--nw-color-destructive)'
                                    }}
                                  >
                                    <TrashIcon />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete Query</p>
                              </TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Query</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this query? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onDelete(record.id!)}
                                  style={{
                                    backgroundColor: 'var(--nw-color-destructive)',
                                    color: 'var(--nw-color-on-destructive)'
                                  }}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Simple pagination info */}
              {totalQueries > 0 && (
                <div
                  style={{
                    padding: 'var(--nw-spacing-4)',
                    textAlign: 'center',
                    color: 'var(--nw-color-muted-foreground)',
                    fontSize: '0.875rem',
                    borderTop: '1px solid var(--nw-color-border)'
                  }}
                >
                  Showing {Math.min(currentPage * pageSize + 1, totalQueries)}-
                  {Math.min((currentPage + 1) * pageSize, totalQueries)} of {totalQueries} queries
                  {totalQueries > pageSize && (
                    <div
                      className="gba:flex gba:justify-center"
                      style={{
                        gap: 'var(--nw-spacing-2)',
                        marginTop: 'var(--nw-spacing-2)'
                      }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 0}
                        onClick={() => onPageChange(currentPage - 1, pageSize)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={(currentPage + 1) * pageSize >= totalQueries}
                        onClick={() => onPageChange(currentPage + 1, pageSize)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
