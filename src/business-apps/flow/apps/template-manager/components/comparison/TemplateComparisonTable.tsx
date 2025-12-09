/**
 * TemplateComparisonTable Component
 * Table displaying template comparisons with search and filter
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
  Checkbox
} from '@newwork/nw-design-system'
import { TemplateComparison, ComparisonStatus } from '../../types/comparison'
import { StatusBadge } from '../common/StatusBadge'
import { FileCode } from 'lucide-react'

interface TemplateComparisonTableProps {
  comparisons: TemplateComparison[]
  onSyncClick: (comparison: TemplateComparison) => void
  onDiffClick: (comparison: TemplateComparison) => void
  selectedTemplateIds?: Set<string>
  onSelectionChange?: (templateId: string, selected: boolean) => void
  bulkMode?: boolean
}

export const TemplateComparisonTable: React.FC<TemplateComparisonTableProps> = ({
  comparisons,
  onSyncClick,
  onDiffClick,
  selectedTemplateIds = new Set(),
  onSelectionChange,
  bulkMode = false
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredComparisons = useMemo(() => {
    return comparisons.filter(comp => {
      // Search filter
      const matchesSearch =
        comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comp.templateId.toLowerCase().includes(searchTerm.toLowerCase())

      // Status filter
      const matchesStatus = statusFilter === 'all' || comp.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [comparisons, searchTerm, statusFilter])

  const canSync = (status: ComparisonStatus) => {
    return status !== 'IDENTICAL' && status !== 'NEW_IN_TARGET'
  }

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
                      filteredComparisons.filter(c => canSync(c.status)).length > 0 &&
                      filteredComparisons
                        .filter(c => canSync(c.status))
                        .every(c => selectedTemplateIds.has(c.templateId))
                    }
                    onCheckedChange={checked => {
                      const syncableTemplates = filteredComparisons.filter(c => canSync(c.status))
                      syncableTemplates.forEach(c => {
                        onSelectionChange?.(c.templateId, !!checked)
                      })
                    }}
                    aria-label="Select all templates"
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
              filteredComparisons.map(comparison => (
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
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      <div className="gba:text-sm gba:text-muted-foreground">
        Showing {filteredComparisons.length} of {comparisons.length} templates
      </div>
    </div>
  )
}
