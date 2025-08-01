import React, { useState } from 'react';
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
} from '@newwork/nw-design-system';
import { 
  PencilSimpleIcon, 
  TrashIcon, 
  PlayCircleIcon, 
  PauseCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  WarningCircleIcon
} from '@phosphor-icons/react';
import { QueryDefinition, QueryType, QueryStatus } from '@/common/network/dataset';

interface QueryDefinitionListProps {
  queries: QueryDefinition[];
  isLoading: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  totalQueries: number;
  currentPage: number;
  pageSize: number;
  onEdit: (query: QueryDefinition) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: QueryStatus) => void;
  onPageChange: (page: number, size: number) => void;
  onFilter: (filters: { queryType?: QueryType; status?: QueryStatus; search?: string }) => void;
  onCreateNew: () => void;
  error?: string;
  onRetry?: () => void;
  formatErrorMessage?: (error: string) => string;
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
  onFilter,
  onCreateNew,
  error,
  onRetry,
  formatErrorMessage
}) => {
  const [filters, setFilters] = useState<{
    queryType?: QueryType;
    status?: QueryStatus;
    search?: string;
  }>({});

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFilter({});
  };

  const getStatusVariant = (status: QueryStatus) => {
    return status === QueryStatus.ACTIVE ? 'default' : 'secondary';
  };

  const getTypeVariant = (type: QueryType) => {
    return type === QueryType.DATASET ? 'default' : 'outline';
  };

  const getStatusColor = (status: QueryStatus) => {
    return status === QueryStatus.ACTIVE 
      ? { backgroundColor: 'var(--color-success)', color: 'var(--color-on-success)' }
      : { backgroundColor: 'var(--color-warning)', color: 'var(--color-on-warning)' };
  };

  const getTypeColor = (type: QueryType) => {
    return type === QueryType.DATASET 
      ? { backgroundColor: 'var(--color-primary)', color: 'var(--color-on-primary)' }
      : { backgroundColor: 'var(--color-secondary)', color: 'var(--color-on-secondary)' };
  };

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center" style={{ 
        paddingTop: 'var(--spacing-12)', 
        paddingBottom: 'var(--spacing-12)' 
      }}>
        <Spinner />
        <span style={{ marginLeft: 'var(--spacing-3)' }}>Loading query definitions...</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-4)'
      }}>
        {/* Error Alert - Outside the list */}
        {error && (
          <Alert 
            className="gba:border-destructive gba:bg-destructive/10 gba:flex"
            style={{ marginBottom: 'var(--spacing-4)' }}
            data-testid="load-error-alert"
          >
            <div className="gba:flex gba:items-start gba:w-full" style={{ gap: 'var(--spacing-3)' }}>
              <WarningCircleIcon 
                className="gba:shrink-0" 
                style={{ 
                  color: 'var(--color-destructive)',
                  marginTop: 'var(--spacing-1)' 
                }}
                size={20}
              />
              <div className="gba:flex-1 gba:min-w-0" style={{ flex: '1 1 0%' }}>
                <h4 className="gba:font-semibold gba:text-lg" style={{ 
                  color: 'var(--color-destructive)',
                  margin: 'var(--spacing-0)'
                }}>
                  Unable to Load Queries
                </h4>
                <p className="gba:text-sm" style={{ 
                  color: 'var(--color-muted-foreground)',
                  margin: 'var(--spacing-0)',
                  marginTop: 'var(--spacing-1)'
                }}>
                  {formatErrorMessage ? formatErrorMessage(error) : error}
                </p>
              </div>
              {onRetry && (
                <Button size="sm" onClick={onRetry} className="gba:shrink-0" style={{ marginLeft: 'auto' }}>
                  Retry
                </Button>
              )}
            </div>
          </Alert>
        )}

        <Card data-testid="query-definition-list">
          <CardContent style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-6)'
          }}>
            {/* Header */}
            <div className="gba:flex gba:justify-between gba:items-center">
              <h4 style={{ 
                color: 'var(--color-foreground)', 
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: '600'
              }}>
                Query Definitions ({totalQueries})
              </h4>
              <Button
                variant="default"
                onClick={onCreateNew}
                data-testid="create-new-query-button"
                className="gba:flex gba:items-center"
                style={{ gap: 'var(--spacing-2)' }}
              >
                <PlusIcon />
                Create New Query
              </Button>
            </div>

            {/* Filters */}
            <div 
              className="gba:flex gba:flex-wrap gba:items-center gba:justify-end"
              style={{ 
                gap: 'var(--spacing-3)'
              }}
            >
              <Select 
                value={filters.queryType || ''} 
                onValueChange={(value) => handleFilterChange('queryType', value || undefined)}
              >
                <SelectTrigger data-testid="filter-by-type" className="gba:w-full gba:sm:w-40">
                  <SelectValue placeholder="Filter by Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={QueryType.DATASET}>Dataset</SelectItem>
                  <SelectItem value={QueryType.TIMESERIES}>Timeseries</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={filters.status || ''} 
                onValueChange={(value) => handleFilterChange('status', value || undefined)}
              >
                <SelectTrigger data-testid="filter-by-status" className="gba:w-full gba:sm:w-40">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={QueryStatus.ACTIVE}>Active</SelectItem>
                  <SelectItem value={QueryStatus.DRAFT}>Draft</SelectItem>
                </SelectContent>
              </Select>

              <div className="gba:relative gba:flex-1 gba:min-w-0 gba:sm:min-w-48">
                <MagnifyingGlassIcon 
                  className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2" 
                  style={{ color: 'var(--color-muted-foreground)' }}
                />
                <Input
                  placeholder="Search queries..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  data-testid="search-queries"
                  style={{ paddingLeft: 'var(--spacing-10)' }}
                />
              </div>

              <Button 
                variant="outline" 
                onClick={clearFilters}
                data-testid="clear-filters-button"
              >
                Clear Filters
              </Button>
            </div>

          {/* Table */}
          <div className="gba:border gba:rounded-md">
            <Table data-testid="query-definitions-table">
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
                {queries.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div>
                        <div className="gba:font-bold" style={{ marginBottom: 'var(--spacing-1)' }}>
                          {record.name}
                        </div>
                        <div style={{ 
                          color: 'var(--color-muted-foreground)', 
                          fontSize: '0.75rem',
                          lineHeight: '1.2'
                        }}>
                          {record.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={getTypeVariant(record.queryType)}
                        style={getTypeColor(record.queryType)}
                      >
                        {record.queryType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={getStatusVariant(record.status)}
                        style={getStatusColor(record.status)}
                      >
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span>{record.parameters.length} params</span>
                    </TableCell>
                    <TableCell>
                      {record.createdAt ? new Date(record.createdAt).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="gba:flex gba:items-center" style={{ gap: 'var(--spacing-2)' }}>
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
                              onClick={() => onStatusChange(
                                record.id!,
                                record.status === QueryStatus.ACTIVE ? QueryStatus.DRAFT : QueryStatus.ACTIVE
                              )}
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
                                    borderColor: 'var(--color-destructive)',
                                    color: 'var(--color-destructive)'
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
                                  backgroundColor: 'var(--color-destructive)',
                                  color: 'var(--color-on-destructive)'
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
              <div style={{ 
                padding: 'var(--spacing-4)', 
                textAlign: 'center',
                color: 'var(--color-muted-foreground)',
                fontSize: '0.875rem',
                borderTop: '1px solid var(--color-border)'
              }}>
                Showing {Math.min(currentPage * pageSize + 1, totalQueries)}-{Math.min((currentPage + 1) * pageSize, totalQueries)} of {totalQueries} queries
                {totalQueries > pageSize && (
                  <div className="gba:flex gba:justify-center" style={{ 
                    gap: 'var(--spacing-2)', 
                    marginTop: 'var(--spacing-2)' 
                  }}>
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
  );
}; 