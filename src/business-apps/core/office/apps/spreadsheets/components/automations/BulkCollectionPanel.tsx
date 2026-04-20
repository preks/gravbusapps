/**
 * BulkCollectionPanel Component
 *
 * Panel for managing bulk data collection workflows.
 * Shows collection progress, responses, and aggregation controls.
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Progress,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ScrollArea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Checkbox,
  Spinner,
  Alert,
  AlertDescription,
  useTranslation
} from '@newwork/nw-design-system'
import {
  Users,
  Send,
  RefreshCw,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  Eye,
  BarChart3
} from 'lucide-react'
import type { SpreadsheetColumn } from '../../types/spreadsheet'
import type { SpreadsheetAutomation, WorkflowRowLink, WorkflowStatus } from '../../types/automation'
import translations from '../../_i18n'

export interface BulkCollectionPanelProps {
  /** Bulk collection automation */
  automation: SpreadsheetAutomation
  /** Columns in the target sheet */
  columns: SpreadsheetColumn[]
  /** Existing workflow links */
  workflowLinks: WorkflowRowLink[]
  /** Collected data rows */
  collectedData: Array<Record<string, unknown>>
  /** Whether collection is in progress */
  isCollecting: boolean
  /** Callback to start collection */
  onStartCollection: (targetUsers: string[], options?: { anonymize?: boolean }) => Promise<void>
  /** Callback to stop collection */
  onStopCollection: () => Promise<void>
  /** Callback to send reminders */
  onSendReminders: (userIds: string[]) => Promise<void>
  /** Callback to export data */
  onExportData: () => void
  /** Callback to refresh data */
  onRefresh: () => void
  /** Data test ID */
  'data-testid'?: string
}

interface ResponseEntry {
  userId: string
  userName?: string
  status: WorkflowStatus
  submittedAt?: string
  responseData?: Record<string, unknown>
}

/**
 * BulkCollectionPanel Component
 */
export const BulkCollectionPanel: React.FC<BulkCollectionPanelProps> = ({
  automation,
  columns,
  workflowLinks,
  collectedData,
  isCollecting,
  onStartCollection,
  onStopCollection,
  onSendReminders,
  onExportData,
  onRefresh,
  'data-testid': testId = 'bulk-collection-panel'
}) => {
  const { t } = useTranslation(translations)
  const config = automation.collectionConfig

  // State
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [anonymizeResponses, setAnonymizeResponses] = useState(config?.anonymize || false)
  const [isStarting, setIsStarting] = useState(false)
  const [isSendingReminders, setIsSendingReminders] = useState(false)
  const [viewMode, setViewMode] = useState<'progress' | 'responses'>('progress')

  const removeSelectedUser = useCallback((userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u !== userId))
  }, [])

  // Calculate statistics
  const stats = useMemo(() => {
    const total = workflowLinks.length
    const completed = workflowLinks.filter(l => l.workflowStatus === 'COMPLETED').length
    const pending = workflowLinks.filter(l => l.workflowStatus === 'PENDING' || l.workflowStatus === 'RUNNING').length
    const failed = workflowLinks.filter(
      l => l.workflowStatus === 'FAILED' || l.workflowStatus === 'CANCELED' || l.workflowStatus === 'TIMED_OUT'
    ).length

    return {
      total,
      completed,
      pending,
      failed,
      responseRate: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  }, [workflowLinks])

  // Group responses by status
  const responsesByStatus = useMemo(() => {
    const responses: ResponseEntry[] = workflowLinks.map(link => ({
      userId: link.rowId, // In bulk collection, rowId often stores userId
      status: link.workflowStatus,
      submittedAt: link.completedAt,
      responseData: link.outputData
    }))

    return {
      completed: responses.filter(r => r.status === 'COMPLETED'),
      pending: responses.filter(r => r.status === 'PENDING' || r.status === 'RUNNING'),
      failed: responses.filter(r => r.status === 'FAILED' || r.status === 'CANCELED' || r.status === 'TIMED_OUT')
    }
  }, [workflowLinks])

  // Handle start collection
  const handleStartCollection = useCallback(async () => {
    if (selectedUsers.length === 0) return

    setIsStarting(true)
    try {
      await onStartCollection(selectedUsers, { anonymize: anonymizeResponses })
      setIsStartDialogOpen(false)
      setSelectedUsers([])
    } finally {
      setIsStarting(false)
    }
  }, [selectedUsers, anonymizeResponses, onStartCollection])

  // Handle send reminders
  const handleSendReminders = useCallback(async () => {
    const pendingUserIds = responsesByStatus.pending.map(r => r.userId)
    if (pendingUserIds.length === 0) return

    setIsSendingReminders(true)
    try {
      await onSendReminders(pendingUserIds)
    } finally {
      setIsSendingReminders(false)
    }
  }, [responsesByStatus.pending, onSendReminders])

  // Get visible columns for response display
  const visibleColumns = useMemo(() => {
    if (config?.fieldMappings && config.fieldMappings.length > 0) {
      return columns.filter(c => config.fieldMappings.some(m => m.targetColumnId === c.id))
    }
    return columns.filter(c => c.isVisible !== false).slice(0, 5)
  }, [columns, config?.fieldMappings])

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <div>
          <h2 className="gba:text-xl gba:font-semibold gba:flex gba:items-center gba:gap-2">
            <Users className="gba:w-5 gba:h-5 gba:text-primary" />
            {automation.name}
          </h2>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
            {automation.description || t('bulk-collection-default-description')}
          </p>
        </div>

        <div className="gba:flex gba:items-center gba:gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="gba:w-4 gba:h-4" />
          </Button>

          {isCollecting ? (
            <Button variant="destructive" size="sm" onClick={onStopCollection}>
              <Pause className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('bulk-collection-stop')}
            </Button>
          ) : (
            <Button size="sm" onClick={() => setIsStartDialogOpen(true)}>
              <Play className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('bulk-collection-start')}
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="gba:grid gba:grid-cols-4 gba:gap-4">
        <Card>
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <div className="gba:text-2xl gba:font-bold">{stats.total}</div>
                <div className="gba:text-sm gba:text-muted-foreground">{t('bulk-collection-total-sent')}</div>
              </div>
              <Send className="gba:w-8 gba:h-8 gba:text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <div className="gba:text-2xl gba:font-bold gba:text-success">{stats.completed}</div>
                <div className="gba:text-sm gba:text-muted-foreground">{t('tasks-completed')}</div>
              </div>
              <CheckCircle className="gba:w-8 gba:h-8 gba:text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <div className="gba:text-2xl gba:font-bold gba:text-warning">{stats.pending}</div>
                <div className="gba:text-sm gba:text-muted-foreground">{t('tasks-pending')}</div>
              </div>
              <Clock className="gba:w-8 gba:h-8 gba:text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <div className="gba:text-2xl gba:font-bold">{stats.responseRate}%</div>
                <div className="gba:text-sm gba:text-muted-foreground">{t('bulk-collection-response-rate')}</div>
              </div>
              <BarChart3 className="gba:w-8 gba:h-8 gba:text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      {stats.total > 0 && (
        <Card>
          <CardContent className="gba:p-4">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
              <span className="gba:text-sm gba:font-medium">{t('bulk-collection-progress')}</span>
              <span className="gba:text-sm gba:text-muted-foreground">
                {stats.completed} of {stats.total} responses
              </span>
            </div>
            <Progress value={stats.responseRate} className="gba:h-3" />
            {stats.pending > 0 && (
              <div className="gba:flex gba:items-center gba:justify-between gba:mt-3">
                <span className="gba:text-sm gba:text-muted-foreground">
                  {stats.pending} users haven't responded yet
                </span>
                <Button size="sm" variant="outline" onClick={handleSendReminders} disabled={isSendingReminders}>
                  {isSendingReminders ? (
                    <Spinner size="sm" className="gba:mr-2" />
                  ) : (
                    <Send className="gba:w-4 gba:h-4 gba:mr-2" />
                  )}
                  {t('bulk-collection-send-reminders')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* View Toggle */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button
            variant={viewMode === 'progress' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('progress')}
          >
            <Users className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('bulk-collection-response-status')}
          </Button>
          <Button
            variant={viewMode === 'responses' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('responses')}
          >
            <BarChart3 className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('bulk-collection-collected-data')}
          </Button>
        </div>

        {viewMode === 'responses' && collectedData.length > 0 && (
          <Button variant="outline" size="sm" onClick={onExportData}>
            <Download className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('bulk-collection-export-data')}
          </Button>
        )}
      </div>

      {/* Content */}
      {viewMode === 'progress' ? (
        <Card>
          <CardHeader className="gba:pb-3">
            <CardTitle className="gba:text-base">{t('bulk-collection-response-status-by-user')}</CardTitle>
          </CardHeader>
          <CardContent>
            {workflowLinks.length === 0 ? (
              <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                <Users className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-4 gba:opacity-50" />
                <p>{t('bulk-collection-no-progress')}</p>
                <p className="gba:text-sm gba:mt-1">{t('bulk-collection-no-progress-hint')}</p>
              </div>
            ) : (
              <ScrollArea className="gba:h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('bulk-collection-user')}</TableHead>
                      <TableHead>{t('bulk-collection-status')}</TableHead>
                      <TableHead>{t('bulk-collection-submitted-at')}</TableHead>
                      <TableHead className="gba:w-20">{t('bulk-collection-actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workflowLinks.map(link => (
                      <TableRow key={link.workflowId}>
                        <TableCell className="gba:font-medium">
                          {config?.anonymize ? `Respondent ${link.rowId.slice(0, 6)}` : link.rowId}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              link.workflowStatus === 'COMPLETED'
                                ? 'success'
                                : link.workflowStatus === 'FAILED'
                                  ? 'destructive'
                                  : link.workflowStatus === 'RUNNING'
                                    ? 'info'
                                    : 'outline'
                            }
                          >
                            {link.workflowStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>{link.completedAt ? new Date(link.completedAt).toLocaleString() : '—'}</TableCell>
                        <TableCell>
                          {link.workflowStatus === 'COMPLETED' && link.outputData && (
                            <Button size="sm" variant="ghost">
                              <Eye className="gba:w-4 gba:h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="gba:pb-3">
            <CardTitle className="gba:text-base">{t('bulk-collection-collected-responses')}</CardTitle>
            <CardDescription>
              {t('bulk-collection-responses-collected', { count: collectedData.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {collectedData.length === 0 ? (
              <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                <BarChart3 className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-4 gba:opacity-50" />
                <p>{t('bulk-collection-no-data')}</p>
                <p className="gba:text-sm gba:mt-1">{t('bulk-collection-no-data-hint')}</p>
              </div>
            ) : (
              <ScrollArea className="gba:h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {!config?.anonymize && <TableHead>{t('bulk-collection-respondent')}</TableHead>}
                      {visibleColumns.map(column => (
                        <TableHead key={column.id}>{column.label}</TableHead>
                      ))}
                      <TableHead>{t('bulk-collection-submitted')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collectedData.map((row, index) => (
                      <TableRow key={index}>
                        {!config?.anonymize && (
                          <TableCell className="gba:font-medium">
                            {String(row._respondentId || row._id || `Response ${index + 1}`)}
                          </TableCell>
                        )}
                        {visibleColumns.map(column => (
                          <TableCell key={column.id}>
                            {row[column.name] !== undefined ? String(row[column.name]) : '—'}
                          </TableCell>
                        ))}
                        <TableCell>
                          {row._submittedAt ? new Date(row._submittedAt as string).toLocaleString() : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* Start Collection Dialog */}
      <Dialog open={isStartDialogOpen} onOpenChange={setIsStartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('bulk-collection-start-dialog-title')}</DialogTitle>
            <DialogDescription>{t('bulk-collection-start-dialog-description')}</DialogDescription>
          </DialogHeader>

          <div className="gba:space-y-4">
            <div>
              <Label className="gba:mb-2 gba:block">{t('bulk-collection-target-users')}</Label>
              <Input
                placeholder={t('bulk-collection-target-users-placeholder')}
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
              />
              <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{t('bulk-collection-target-users-hint')}</p>
            </div>

            {/* Quick selection options */}
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedUsers(['all-employees'])}>
                <Users className="gba:w-4 gba:h-4 gba:mr-1" />
                {t('bulk-collection-all-employees')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedUsers(['my-team'])}>
                <Users className="gba:w-4 gba:h-4 gba:mr-1" />
                {t('bulk-collection-my-team')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedUsers(['department'])}>
                <Users className="gba:w-4 gba:h-4 gba:mr-1" />
                {t('bulk-collection-my-department')}
              </Button>
            </div>

            {selectedUsers.length > 0 && (
              <div className="gba:p-3 gba:bg-muted gba:rounded-lg">
                <Label className="gba:text-xs gba:text-muted-foreground">{t('bulk-collection-selected')}</Label>
                <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mt-1">
                  {selectedUsers.map(user => (
                    <Badge key={user} variant="outline" className="gba:gap-1">
                      {user}
                      <button onClick={() => removeSelectedUser(user)} className="gba:ml-1 gba:hover:text-destructive">
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="gba:flex gba:items-center gba:gap-2">
              <Checkbox
                id="anonymize"
                checked={anonymizeResponses}
                onCheckedChange={checked => setAnonymizeResponses(!!checked)}
              />
              <Label htmlFor="anonymize" className="gba:text-sm">
                {t('bulk-collection-anonymize')}
              </Label>
            </div>

            {anonymizeResponses && (
              <Alert>
                <AlertTriangle className="gba:w-4 gba:h-4" />
                <AlertDescription>{t('bulk-collection-anonymize-warning')}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStartDialogOpen(false)}>
              {t('checkpoint-cancel')}
            </Button>
            <Button onClick={handleStartCollection} disabled={selectedUsers.length === 0 || isStarting}>
              {isStarting ? <Spinner size="sm" className="gba:mr-2" /> : <Send className="gba:w-4 gba:h-4 gba:mr-2" />}
              {t('bulk-collection-start')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BulkCollectionPanel
