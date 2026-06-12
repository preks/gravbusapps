/**
 * TemplateComparisonTable Component
 * Table displaying template comparisons with search and filter
 */

import React, { useState, useMemo, useEffect } from 'react'
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
  Checkbox,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext
} from '@newwork/nw-design-system'
import { TemplateComparison, ComparisonStatus } from '../../types/comparison'
import { StatusBadge } from '../common/StatusBadge'
import { FileCode, Download, Trash2 } from 'lucide-react'
import { useAppCategories } from '../../hooks/useAppCategories'

interface TemplateComparisonTableProps {
  comparisons: TemplateComparison[]
  onSyncClick: (comparison: TemplateComparison) => void
  onDiffClick: (comparison: TemplateComparison) => void
  onExportClick?: (comparison: TemplateComparison, instanceType: 'source' | 'target') => void
  onDeleteClick?: (comparison: TemplateComparison) => void
  selectedTemplateIds?: Set<string>
  onSelectionChange?: (templateId: string, selected: boolean) => void
  bulkMode?: boolean
  accessToken: string
}

export const TemplateComparisonTable: React.FC<TemplateComparisonTableProps> = ({
  comparisons,
  onSyncClick,
  onDiffClick,
  onExportClick,
  onDeleteClick,
  selectedTemplateIds = new Set(),
  onSelectionChange,
  bulkMode = false,
  accessToken
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [appFilter, setAppFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  // Load app catalog for filtering by tags.app
  const { categories: appCategories, isLoading: loadingApps } = useAppCategories(accessToken)

  const filteredComparisons = useMemo(() => {
    return comparisons.filter(comp => {
      // Search filter
      const matchesSearch =
        comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comp.templateId.toLowerCase().includes(searchTerm.toLowerCase())

      // Status filter
      const matchesStatus = statusFilter === 'all' || comp.status === statusFilter

      // App filter - check if template's tags.app matches selected app
      let matchesApp = true
      if (appFilter !== 'all') {
        // Check both source and target templates for app tags
        const sourceTemplate = comp.source
        const targetTemplate = comp.target

        const hasMatchingApp = (template: any) => {
          if (!template?.tags) {
            return false // No tags at all
          }
          if (!template.tags.app) {
            return false // No app tag
          }
          // Direct comparison
          return template.tags.app === appFilter
        }

        matchesApp = hasMatchingApp(sourceTemplate) || hasMatchingApp(targetTemplate)
      }

      return matchesSearch && matchesStatus && matchesApp
    })
  }, [comparisons, searchTerm, statusFilter, appFilter])

  const totalPages = Math.max(1, Math.ceil(filteredComparisons.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, appFilter, pageSize])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedComparisons = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredComparisons.slice(start, start + pageSize)
  }, [filteredComparisons, safePage, pageSize])

  const rangeStart = filteredComparisons.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const rangeEnd = Math.min(safePage * pageSize, filteredComparisons.length)

  const canSync = (status: ComparisonStatus) => {
    return status !== 'IDENTICAL' && status !== 'NEW_IN_TARGET'
  }

  const syncableOnPage = paginatedComparisons.filter(c => canSync(c.status))

  // Helper function to determine if diff should be shown
  const canShowDiff = (status: ComparisonStatus): boolean => {
    return (
      status === 'CONTENT_DRIFT' ||
      status === 'VERSION_DRIFT' ||
      status === 'SOURCE_AHEAD' ||
      status === 'TARGET_AHEAD' ||
      status === 'NEW_IN_SOURCE' ||
      status === 'NEW_IN_TARGET'
    )
  }

  return (
    <div className="gba:space-y-4">
      {/* Filters */}
      <div className="gba:flex gba:gap-4 gba:items-end">
        <div className="gba:flex-1">
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="gba:w-full"
          />
        </div>
        <div className="gba:w-48">
          <Select value={appFilter} onValueChange={setAppFilter} disabled={loadingApps}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by app" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Apps</SelectItem>
              {appCategories.map(app => (
                <SelectItem key={app.id} value={app.catalogRef}>
                  {app.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="gba:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="IDENTICAL">Identical</SelectItem>
              <SelectItem value="VERSION_DRIFT">Version Drift</SelectItem>
              <SelectItem value="CONTENT_DRIFT">Content Drift</SelectItem>
              <SelectItem value="NEW_IN_SOURCE">New in Source</SelectItem>
              <SelectItem value="NEW_IN_TARGET">New in Target</SelectItem>
              <SelectItem value="SOURCE_AHEAD">Source Ahead</SelectItem>
              <SelectItem value="TARGET_AHEAD">Target Ahead</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="gba:border gba:rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {bulkMode && (
                <TableHead className="gba:w-12">
                  <Checkbox
                    checked={
                      syncableOnPage.length > 0 && syncableOnPage.every(c => selectedTemplateIds.has(c.templateId))
                    }
                    onCheckedChange={checked => {
                      syncableOnPage.forEach(c => {
                        onSelectionChange?.(c.templateId, !!checked)
                      })
                    }}
                    aria-label="Select all templates on this page"
                  />
                </TableHead>
              )}
              <TableHead>Template Name</TableHead>
              <TableHead>Source Version</TableHead>
              <TableHead>Target Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="gba:text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredComparisons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={bulkMode ? 6 : 5} className="gba:text-center gba:text-muted-foreground gba:py-8">
                  No templates found
                </TableCell>
              </TableRow>
            ) : (
              paginatedComparisons.map(comparison => (
                <TableRow key={comparison.templateId}>
                  {bulkMode && (
                    <TableCell>
                      <Checkbox
                        checked={selectedTemplateIds.has(comparison.templateId)}
                        onCheckedChange={checked => onSelectionChange?.(comparison.templateId, !!checked)}
                        disabled={!canSync(comparison.status)}
                        aria-label={`Select ${comparison.name}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="gba:font-medium">{comparison.name}</TableCell>
                  <TableCell>
                    {comparison.source ? (
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span>v{comparison.source.version}</span>
                        {comparison.source.isDraft && (
                          <span className="gba:text-xs gba:text-muted-foreground">(Draft)</span>
                        )}
                        {onExportClick && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onExportClick(comparison, 'source')}
                            className="gba:h-6 gba:w-6 gba:p-0"
                            title="Download from source"
                          >
                            <Download className="gba:h-3 gba:w-3" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="gba:text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {comparison.target ? (
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span>v{comparison.target.version}</span>
                        {comparison.target.isDraft && (
                          <span className="gba:text-xs gba:text-muted-foreground">(Draft)</span>
                        )}
                        {onExportClick && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onExportClick(comparison, 'target')}
                            className="gba:h-6 gba:w-6 gba:p-0"
                            title="Download from target"
                          >
                            <Download className="gba:h-3 gba:w-3" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="gba:text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={comparison.status} />
                  </TableCell>
                  <TableCell className="gba:text-right">
                    <div className="gba:flex gba:items-center gba:justify-end gba:gap-2">
                      {canShowDiff(comparison.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDiffClick(comparison)}
                          data-testid={`template-diff-button-${comparison.templateId}`}
                        >
                          <FileCode className="gba:h-4 gba:w-4 gba:mr-1" />
                          Diff
                        </Button>
                      )}
                      {canSync(comparison.status) && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => onSyncClick(comparison)}
                          data-testid={`template-sync-button-${comparison.templateId}`}
                        >
                          Sync →
                        </Button>
                      )}
                      {onDeleteClick && (comparison.source !== null || comparison.target !== null) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteClick(comparison)}
                          data-testid={`template-delete-button-${comparison.templateId}`}
                          className="gba:text-destructive gba:hover:text-destructive gba:hover:bg-destructive/10"
                        >
                          <Trash2 className="gba:h-4 gba:w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filteredComparisons.length > 0 && (
        <div className="gba:flex gba:flex-col gba:sm:flex-row gba:items-center gba:justify-between gba:gap-4">
          <div className="gba:text-sm gba:text-muted-foreground">
            Showing {rangeStart}-{rangeEnd} of {filteredComparisons.length} templates
            {filteredComparisons.length !== comparisons.length && ` (${comparisons.length} total)`}
          </div>

          <div className="gba:flex gba:items-center gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-sm gba:text-muted-foreground gba:whitespace-nowrap">Rows per page</span>
              <Select value={String(pageSize)} onValueChange={value => setPageSize(Number(value))}>
                <SelectTrigger className="gba:w-20" data-testid="template-comparison-page-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                      className={safePage === 1 ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'}
                      data-testid="template-comparison-prev-page"
                    />
                  </PaginationItem>

                  <PaginationItem>
                    <PaginationLink isActive className="gba:cursor-default">
                      {safePage} / {totalPages}
                    </PaginationLink>
                  </PaginationItem>

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                      className={
                        safePage === totalPages ? 'gba:pointer-events-none gba:opacity-50' : 'gba:cursor-pointer'
                      }
                      data-testid="template-comparison-next-page"
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
