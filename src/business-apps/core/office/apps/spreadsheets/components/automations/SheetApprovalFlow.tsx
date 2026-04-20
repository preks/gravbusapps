/**
 * SheetApprovalFlow Component
 *
 * Complete approval flow UI for sheet-level and line-item approvals.
 * Allows reviewers to approve/reject rows with comments and edits.
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Badge,
  Textarea,
  Checkbox,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ScrollArea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  CardContent,
  Spinner,
  Alert,
  AlertDescription,
  useTranslation
} from '@newwork/nw-design-system'
import {
  CheckCircle,
  XCircle,
  MessageSquare,
  Edit3,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Send,
  RotateCcw,
  FileSpreadsheet
} from 'lucide-react'
import type { SpreadsheetColumn } from '../../types/spreadsheet'
import type { SheetApprovalConfig } from '../../types/automation'
import translations from '../../_i18n'

export interface SheetApprovalFlowProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback to close the dialog */
  onClose: () => void
  /** Sheet name */
  sheetName: string
  /** Columns to display */
  columns: SpreadsheetColumn[]
  /** Data rows to review */
  rows: Array<Record<string, unknown> & { _id: string }>
  /** Approval configuration */
  approvalConfig: SheetApprovalConfig
  /** Current step index (0-based) */
  currentStepIndex: number
  /** Current user ID (reserved for future task assignment checks) */
  currentUserId?: string
  /** Whether current user can edit rows */
  canEdit: boolean
  /** Callback when rows are approved */
  onApprove: (approvedRowIds: string[], comments: string) => Promise<void>
  /** Callback when rows are rejected */
  onReject: (rejectedRowIds: string[], comments: string, reason?: string) => Promise<void>
  /** Callback when rows are edited */
  onRowEdit?: (rowId: string, updates: Record<string, unknown>) => void
  /** Data test ID */
  'data-testid'?: string
}

interface RowDecision {
  rowId: string
  decision: 'approved' | 'rejected' | 'pending'
  comments?: string
}

/**
 * SheetApprovalFlow Component
 */
export const SheetApprovalFlow: React.FC<SheetApprovalFlowProps> = ({
  isOpen,
  onClose,
  sheetName,
  columns,
  rows,
  approvalConfig,
  currentStepIndex,
  canEdit,
  onApprove,
  onReject,
  onRowEdit,
  'data-testid': testId = 'sheet-approval-flow'
}) => {
  const { t } = useTranslation(translations)
  const isLineItemMode = approvalConfig.mode === 'line_item'
  const currentStep = approvalConfig.approvalSteps[currentStepIndex]

  // State
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set())
  const [rowDecisions, setRowDecisions] = useState<Map<string, RowDecision>>(new Map())
  const [globalComments, setGlobalComments] = useState('')
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, unknown>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending')

  // Get visible columns (required columns or all if not specified)
  const visibleColumns = useMemo(() => {
    if (currentStep?.requiredColumns && currentStep.requiredColumns.length > 0) {
      return columns.filter(c => currentStep.requiredColumns?.includes(c.id))
    }
    return columns.filter(c => c.isVisible !== false)
  }, [columns, currentStep])

  // Categorize rows by decision
  const categorizedRows = useMemo(() => {
    const pending: typeof rows = []
    const approved: typeof rows = []
    const rejected: typeof rows = []

    rows.forEach(row => {
      const decision = rowDecisions.get(row._id)
      if (!decision || decision.decision === 'pending') {
        pending.push(row)
      } else if (decision.decision === 'approved') {
        approved.push(row)
      } else {
        rejected.push(row)
      }
    })

    return { pending, approved, rejected }
  }, [rows, rowDecisions])

  // Handle select all rows
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedRowIds(new Set(rows.map(r => r._id)))
      } else {
        setSelectedRowIds(new Set())
      }
    },
    [rows]
  )

  // Handle row selection
  const handleRowSelect = useCallback((rowId: string, checked: boolean) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev)
      if (checked) {
        next.add(rowId)
      } else {
        next.delete(rowId)
      }
      return next
    })
  }, [])

  // Handle row decision (line item mode)
  const handleRowDecision = useCallback((rowId: string, decision: 'approved' | 'rejected', comments?: string) => {
    setRowDecisions(prev => {
      const next = new Map(prev)
      next.set(rowId, { rowId, decision, comments })
      return next
    })
  }, [])

  // Handle start editing row
  const handleStartEdit = useCallback((row: Record<string, unknown>) => {
    setEditingRowId(row._id as string)
    setEditValues({ ...row })
  }, [])

  // Handle save edit
  const handleSaveEdit = useCallback(() => {
    if (editingRowId && onRowEdit) {
      onRowEdit(editingRowId, editValues)
    }
    setEditingRowId(null)
    setEditValues({})
  }, [editingRowId, editValues, onRowEdit])

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingRowId(null)
    setEditValues({})
  }, [])

  // Handle approve all/selected
  const handleApproveAll = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const rowIds = isLineItemMode
        ? Array.from(rowDecisions.entries())
            .filter(([, d]) => d.decision === 'approved')
            .map(([id]) => id)
        : selectedRowIds.size > 0
          ? Array.from(selectedRowIds)
          : rows.map(r => r._id)

      await onApprove(rowIds, globalComments)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }, [isLineItemMode, rowDecisions, selectedRowIds, rows, globalComments, onApprove, onClose])

  // Handle reject all/selected
  const handleRejectAll = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const rowIds = isLineItemMode
        ? Array.from(rowDecisions.entries())
            .filter(([, d]) => d.decision === 'rejected')
            .map(([id]) => id)
        : selectedRowIds.size > 0
          ? Array.from(selectedRowIds)
          : rows.map(r => r._id)

      await onReject(rowIds, globalComments)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }, [isLineItemMode, rowDecisions, selectedRowIds, rows, globalComments, onReject, onClose])

  // Handle submit decisions (line item mode)
  const handleSubmitDecisions = useCallback(async () => {
    setIsSubmitting(true)
    try {
      const approvedIds = Array.from(rowDecisions.entries())
        .filter(([, d]) => d.decision === 'approved')
        .map(([id]) => id)

      const rejectedIds = Array.from(rowDecisions.entries())
        .filter(([, d]) => d.decision === 'rejected')
        .map(([id]) => id)

      if (approvedIds.length > 0) {
        await onApprove(approvedIds, globalComments)
      }

      if (rejectedIds.length > 0) {
        await onReject(rejectedIds, globalComments)
      }

      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }, [rowDecisions, globalComments, onApprove, onReject, onClose])

  // Render cell value
  const renderCellValue = (row: Record<string, unknown>, column: SpreadsheetColumn) => {
    const value = row[column.name]

    if (editingRowId === row._id && canEdit) {
      return (
        <Input
          value={String(editValues[column.name] || '')}
          onChange={e =>
            setEditValues(prev => ({
              ...prev,
              [column.name]: e.target.value
            }))
          }
          className="gba:h-8"
        />
      )
    }

    if (value === null || value === undefined) {
      return <span className="gba:text-muted-foreground">—</span>
    }

    return String(value)
  }

  // Render row actions (line item mode)
  const renderRowActions = (row: Record<string, unknown>) => {
    const decision = rowDecisions.get(row._id as string)
    const isExpanded = expandedRowId === row._id

    if (editingRowId === row._id) {
      return (
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button size="sm" onClick={handleSaveEdit}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
            Cancel
          </Button>
        </div>
      )
    }

    return (
      <div className="gba:flex gba:items-center gba:gap-1">
        {isLineItemMode && currentStep?.canRejectRows && (
          <>
            <Button
              size="sm"
              variant={decision?.decision === 'approved' ? 'default' : 'ghost'}
              className={decision?.decision === 'approved' ? 'gba:bg-success gba:text-success-foreground' : ''}
              onClick={() => handleRowDecision(row._id as string, 'approved')}
            >
              <CheckCircle className="gba:w-4 gba:h-4" />
            </Button>
            <Button
              size="sm"
              variant={decision?.decision === 'rejected' ? 'destructive' : 'ghost'}
              onClick={() => handleRowDecision(row._id as string, 'rejected')}
            >
              <XCircle className="gba:w-4 gba:h-4" />
            </Button>
          </>
        )}

        {canEdit && (
          <Button size="sm" variant="ghost" onClick={() => handleStartEdit(row)}>
            <Edit3 className="gba:w-4 gba:h-4" />
          </Button>
        )}

        <Button size="sm" variant="ghost" onClick={() => setExpandedRowId(isExpanded ? null : (row._id as string))}>
          {isExpanded ? <ChevronDown className="gba:w-4 gba:h-4" /> : <ChevronRight className="gba:w-4 gba:h-4" />}
        </Button>
      </div>
    )
  }

  // Statistics
  const stats = useMemo(
    () => ({
      total: rows.length,
      pending: categorizedRows.pending.length,
      approved: categorizedRows.approved.length,
      rejected: categorizedRows.rejected.length,
      selected: selectedRowIds.size
    }),
    [rows.length, categorizedRows, selectedRowIds.size]
  )

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="gba:max-w-5xl gba:max-h-[90vh] gba:flex gba:flex-col" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <FileSpreadsheet className="gba:w-5 gba:h-5" />
            {isLineItemMode ? t('sheet-approval-line-item-title') : t('sheet-approval-sheet-title')}
          </DialogTitle>
          <DialogDescription>
            {currentStep?.message ||
              (isLineItemMode
                ? t('sheet-approval-line-item-description', { sheetName })
                : t('sheet-approval-sheet-description', { sheetName }))}
          </DialogDescription>
        </DialogHeader>

        {/* Step Progress */}
        <div className="gba:flex gba:items-center gba:gap-4 gba:py-2 gba:border-b">
          {approvalConfig.approvalSteps.map((step, index) => {
            const isActive = index === currentStepIndex
            const isCompleted = index < currentStepIndex

            return (
              <div key={index} className="gba:flex gba:items-center gba:gap-2">
                <div
                  className={`gba:w-8 gba:h-8 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-sm gba:font-medium ${
                    isActive
                      ? 'gba:bg-primary gba:text-primary-foreground'
                      : isCompleted
                        ? 'gba:bg-success gba:text-success-foreground'
                        : 'gba:bg-muted gba:text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <CheckCircle className="gba:w-4 gba:h-4" /> : index + 1}
                </div>
                <span className={`gba:text-sm ${isActive ? 'gba:font-medium' : 'gba:text-muted-foreground'}`}>
                  {step.title}
                </span>
                {index < approvalConfig.approvalSteps.length - 1 && <div className="gba:w-8 gba:h-0.5 gba:bg-muted" />}
              </div>
            )
          })}
        </div>

        {/* Statistics */}
        <div className="gba:flex gba:items-center gba:gap-4 gba:py-2">
          <div className="gba:text-sm">
            <span className="gba:text-muted-foreground">{t('sheet-approval-total')}:</span>{' '}
            <span className="gba:font-medium">{t('sheet-approval-rows-count', { count: stats.total })}</span>
          </div>
          {isLineItemMode && (
            <>
              <div className="gba:text-sm">
                <Badge variant="outline" className="gba:gap-1">
                  <Clock className="gba:w-3 gba:h-3" />
                  {t('sheet-approval-pending-count', { count: stats.pending })}
                </Badge>
              </div>
              <div className="gba:text-sm">
                <Badge variant="success" className="gba:gap-1">
                  <CheckCircle className="gba:w-3 gba:h-3" />
                  {t('sheet-approval-approved-count', { count: stats.approved })}
                </Badge>
              </div>
              <div className="gba:text-sm">
                <Badge variant="destructive" className="gba:gap-1">
                  <XCircle className="gba:w-3 gba:h-3" />
                  {t('sheet-approval-rejected-count', { count: stats.rejected })}
                </Badge>
              </div>
            </>
          )}
          {!isLineItemMode && stats.selected > 0 && (
            <div className="gba:text-sm">
              <Badge variant="info">{stats.selected} selected</Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="gba:flex-1 gba:overflow-hidden gba:flex gba:flex-col">
          {isLineItemMode ? (
            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)}>
              <TabsList>
                <TabsTrigger value="pending">
                  {t('tasks-pending')} ({stats.pending})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  {t('sheet-approval-approved')} ({stats.approved})
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  {t('sheet-approval-rejected')} ({stats.rejected})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="gba:flex-1 gba:overflow-hidden">
                <ScrollArea className="gba:h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {visibleColumns.map(column => (
                          <TableHead key={column.id}>{column.label}</TableHead>
                        ))}
                        <TableHead className="gba:w-32">{t('bulk-collection-actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categorizedRows.pending.map(row => (
                        <React.Fragment key={row._id}>
                          <TableRow>
                            {visibleColumns.map(column => (
                              <TableCell key={column.id}>{renderCellValue(row, column)}</TableCell>
                            ))}
                            <TableCell>{renderRowActions(row)}</TableCell>
                          </TableRow>
                          {expandedRowId === row._id && (
                            <TableRow>
                              <TableCell colSpan={visibleColumns.length + 1}>
                                <Card className="gba:border-dashed">
                                  <CardContent className="gba:p-4">
                                    <Label className="gba:mb-2 gba:block">{t('sheet-approval-comments-row')}</Label>
                                    <Textarea
                                      placeholder={t('sheet-approval-comments-row-placeholder')}
                                      value={rowDecisions.get(row._id)?.comments || ''}
                                      onChange={e => {
                                        const current = rowDecisions.get(row._id)
                                        setRowDecisions(prev => {
                                          const next = new Map(prev)
                                          next.set(row._id, {
                                            ...(current || { rowId: row._id, decision: 'pending' }),
                                            comments: e.target.value
                                          })
                                          return next
                                        })
                                      }}
                                      rows={2}
                                    />
                                  </CardContent>
                                </Card>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                      {categorizedRows.pending.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={visibleColumns.length + 1}
                            className="gba:text-center gba:py-8 gba:text-muted-foreground"
                          >
                            {t('sheet-approval-all-reviewed')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="approved" className="gba:flex-1 gba:overflow-hidden">
                <ScrollArea className="gba:h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {visibleColumns.map(column => (
                          <TableHead key={column.id}>{column.label}</TableHead>
                        ))}
                        <TableHead className="gba:w-32">{t('bulk-collection-actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categorizedRows.approved.map(row => (
                        <TableRow key={row._id} className="gba:bg-success/5">
                          {visibleColumns.map(column => (
                            <TableCell key={column.id}>{renderCellValue(row, column)}</TableCell>
                          ))}
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRowDecisions(prev => {
                                  const next = new Map(prev)
                                  next.delete(row._id)
                                  return next
                                })
                              }}
                            >
                              <RotateCcw className="gba:w-4 gba:h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {categorizedRows.approved.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={visibleColumns.length + 1}
                            className="gba:text-center gba:py-8 gba:text-muted-foreground"
                          >
                            {t('sheet-approval-no-approved')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="rejected" className="gba:flex-1 gba:overflow-hidden">
                <ScrollArea className="gba:h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {visibleColumns.map(column => (
                          <TableHead key={column.id}>{column.label}</TableHead>
                        ))}
                        <TableHead className="gba:w-32">{t('bulk-collection-actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categorizedRows.rejected.map(row => (
                        <TableRow key={row._id} className="gba:bg-destructive/5">
                          {visibleColumns.map(column => (
                            <TableCell key={column.id}>{renderCellValue(row, column)}</TableCell>
                          ))}
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRowDecisions(prev => {
                                  const next = new Map(prev)
                                  next.delete(row._id)
                                  return next
                                })
                              }}
                            >
                              <RotateCcw className="gba:w-4 gba:h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {categorizedRows.rejected.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={visibleColumns.length + 1}
                            className="gba:text-center gba:py-8 gba:text-muted-foreground"
                          >
                            {t('sheet-approval-no-rejected')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          ) : (
            // Full sheet mode
            <ScrollArea className="gba:h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="gba:w-12">
                      <Checkbox checked={selectedRowIds.size === rows.length} onCheckedChange={handleSelectAll} />
                    </TableHead>
                    {visibleColumns.map(column => (
                      <TableHead key={column.id}>{column.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(row => (
                    <TableRow key={row._id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedRowIds.has(row._id)}
                          onCheckedChange={checked => handleRowSelect(row._id, !!checked)}
                        />
                      </TableCell>
                      {visibleColumns.map(column => (
                        <TableCell key={column.id}>{renderCellValue(row, column)}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>

        {/* Comments */}
        <div className="gba:border-t gba:pt-4">
          <Label className="gba:mb-2 gba:block gba:flex gba:items-center gba:gap-2">
            <MessageSquare className="gba:w-4 gba:h-4" />
            {t('header-comments')}
          </Label>
          <Textarea
            placeholder={t('sheet-approval-comments-placeholder')}
            value={globalComments}
            onChange={e => setGlobalComments(e.target.value)}
            rows={2}
          />
        </div>

        {/* Warning if there are pending items in line item mode */}
        {isLineItemMode && stats.pending > 0 && stats.approved + stats.rejected > 0 && (
          <Alert className="gba:mt-4 gba:bg-warning/10 gba:border-warning">
            <AlertTriangle className="gba:w-4 gba:h-4 gba:text-warning" />
            <AlertDescription>
              {stats.pending} row(s) have not been reviewed yet. You can submit your current decisions and come back
              later.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gba:flex gba:justify-between gba:gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('checkpoint-cancel')}
          </Button>

          <div className="gba:flex gba:gap-2">
            {isLineItemMode ? (
              <Button
                onClick={handleSubmitDecisions}
                disabled={isSubmitting || (stats.approved === 0 && stats.rejected === 0)}
              >
                {isSubmitting ? (
                  <Spinner size="sm" className="gba:mr-2" />
                ) : (
                  <Send className="gba:w-4 gba:h-4 gba:mr-2" />
                )}
                {t('sheet-approval-submit-decisions', { count: stats.approved + stats.rejected })}
              </Button>
            ) : (
              <>
                <Button variant="destructive" onClick={handleRejectAll} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Spinner size="sm" className="gba:mr-2" />
                  ) : (
                    <XCircle className="gba:w-4 gba:h-4 gba:mr-2" />
                  )}
                  {stats.selected > 0
                    ? t('sheet-approval-reject-selected', { count: stats.selected })
                    : t('sheet-approval-reject-all')}
                </Button>
                <Button
                  onClick={handleApproveAll}
                  disabled={isSubmitting}
                  className="gba:bg-success gba:text-success-foreground gba:hover:bg-success/90"
                >
                  {isSubmitting ? (
                    <Spinner size="sm" className="gba:mr-2" />
                  ) : (
                    <CheckCircle className="gba:w-4 gba:h-4 gba:mr-2" />
                  )}
                  {stats.selected > 0
                    ? t('sheet-approval-approve-selected', { count: stats.selected })
                    : t('sheet-approval-approve-all')}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SheetApprovalFlow
