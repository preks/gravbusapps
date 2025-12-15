/**
 * SyncHistoryTable Component
 * Displays past sync operations with filtering and search
 */

import React, { useState, useMemo } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from '@newwork/nw-design-system'
import { SyncOperation } from '../../types/sync'
import { Eye, RotateCcw, Search, Filter, FileJson, FileSpreadsheet } from 'lucide-react'

// Simple date formatting function
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

const formatTime = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date)
}

interface SyncHistoryTableProps {
  syncHistory: SyncOperation[]
  onViewDetails: (sync: SyncOperation) => void
  onRetrySync?: (sync: SyncOperation) => void
  onExportJSON?: (sync: SyncOperation) => void
  onExportCSV?: (sync: SyncOperation) => void
}

export const SyncHistoryTable: React.FC<SyncHistoryTableProps> = ({
  syncHistory,
  onViewDetails,
  onRetrySync,
  onExportJSON,
  onExportCSV
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [instanceFilter, setInstanceFilter] = useState<string>('all')

  // Get unique instances for filter
  const uniqueInstances = useMemo(() => {
    const instances = new Set<string>()
    syncHistory.forEach(sync => {
      instances.add(sync.sourceInstance.name)
      instances.add(sync.targetInstance.name)
    })
    return Array.from(instances).sort()
  }, [syncHistory])

  // Filter sync history
  const filteredHistory = useMemo(() => {
    return syncHistory.filter(sync => {
      // Search filter
      const matchesSearch =
        sync.sourceInstance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sync.targetInstance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sync.templates.some(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))

      // Status filter
      const matchesStatus = statusFilter === 'all' || sync.status === statusFilter

      // Instance filter
      const matchesInstance =
        instanceFilter === 'all' ||
        sync.sourceInstance.name === instanceFilter ||
        sync.targetInstance.name === instanceFilter

      return matchesSearch && matchesStatus && matchesInstance
    })
  }, [syncHistory, searchTerm, statusFilter, instanceFilter])

  // Sort by timestamp (newest first)
  const sortedHistory = useMemo(() => {
    return [...filteredHistory].sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
  }, [filteredHistory])

  const getStatusColor = (status: string): 'default' | 'success' | 'destructive' | 'warning' => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'failed':
        return 'destructive'
      case 'in_progress':
        return 'warning'
      default:
        return 'default'
    }
  }

  const getSyncSummary = (sync: SyncOperation) => {
    const successful = sync.results?.filter(r => r.success).length || 0
    const failed = sync.results?.filter(r => !r.success).length || 0
    const total = sync.templates.length

    return { successful, failed, total }
  }

  if (syncHistory.length === 0) {
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:text-center">
        <div className="gba:text-muted-foreground gba:mb-4">
          <RotateCcw className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-2 gba:opacity-50" />
          <p className="gba:text-lg gba:font-medium">No sync history yet</p>
          <p className="gba:text-sm">Sync operations will appear here after you perform your first sync.</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="gba:space-y-4">
        {/* Filters */}
        <div className="gba:flex gba:flex-wrap gba:gap-4">
          <div className="gba:flex-1 gba:min-w-64">
            <div className="gba:relative">
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-muted-foreground" />
              <Input
                placeholder="Search by instance or template name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="gba:pl-10"
              />
            </div>
          </div>
          <div className="gba:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <Filter className="gba:h-4 gba:w-4 gba:mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="gba:w-48">
            <Select value={instanceFilter} onValueChange={setInstanceFilter}>
              <SelectTrigger>
                <Filter className="gba:h-4 gba:w-4 gba:mr-2" />
                <SelectValue placeholder="Instance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Instances</SelectItem>
                {uniqueInstances.map(instance => (
                  <SelectItem key={instance} value={instance}>
                    {instance}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="gba:border gba:rounded-lg gba:overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Source → Target</TableHead>
                <TableHead>Templates</TableHead>
                <TableHead>Results</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="gba:text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="gba:text-center gba:text-muted-foreground gba:py-8">
                    No sync operations found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                sortedHistory.map(sync => {
                  const summary = getSyncSummary(sync)
                  return (
                    <TableRow key={sync.id}>
                      <TableCell>
                        <div className="gba:flex gba:flex-col">
                          <span className="gba:font-medium">{formatDate(new Date(sync.timestamp))}</span>
                          <span className="gba:text-xs gba:text-muted-foreground">
                            {formatTime(new Date(sync.timestamp))}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <span className="gba:font-medium">{sync.sourceInstance.name}</span>
                          <span className="gba:text-muted-foreground">→</span>
                          <span className="gba:font-medium">{sync.targetInstance.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="gba:font-medium">{summary.total}</span>
                        <span className="gba:text-muted-foreground gba:text-sm">
                          {' '}
                          template{summary.total === 1 ? '' : 's'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:gap-2">
                          {summary.successful > 0 && (
                            <Badge variant="success" className="gba:text-xs">
                              ✓ {summary.successful}
                            </Badge>
                          )}
                          {summary.failed > 0 && (
                            <Badge variant="destructive" className="gba:text-xs">
                              ✗ {summary.failed}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(sync.status)}>{sync.status.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:justify-end gba:gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onViewDetails(sync)}
                                data-testid={`sync-history-view-${sync.id}`}
                              >
                                <Eye className="gba:h-4 gba:w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View details</TooltipContent>
                          </Tooltip>
                          {onRetrySync && summary.failed > 0 && sync.status === 'completed' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onRetrySync(sync)}
                                  data-testid={`sync-history-retry-${sync.id}`}
                                >
                                  <RotateCcw className="gba:h-4 gba:w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Retry failed templates</TooltipContent>
                            </Tooltip>
                          )}
                          {onExportJSON && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onExportJSON(sync)}
                                  data-testid={`sync-history-export-json-${sync.id}`}
                                >
                                  <FileJson className="gba:h-4 gba:w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Export as JSON (detailed)</TooltipContent>
                            </Tooltip>
                          )}
                          {onExportCSV && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onExportCSV(sync)}
                                  data-testid={`sync-history-export-csv-${sync.id}`}
                                >
                                  <FileSpreadsheet className="gba:h-4 gba:w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Export as CSV (spreadsheet)</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Results count */}
        <div className="gba:text-sm gba:text-muted-foreground">
          Showing {sortedHistory.length} of {syncHistory.length} sync operations
        </div>
      </div>
    </TooltipProvider>
  )
}
