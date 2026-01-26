/**
 * AutomationsHub Component
 *
 * Main panel for managing spreadsheet automations.
 * Lists all automations, allows enable/disable, and shows execution history.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Switch,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Spinner
} from '@newwork/nw-design-system'
import {
  Zap,
  Plus,
  Search,
  MoreVertical,
  Play,
  Pause,
  Pencil,
  Trash2,
  Copy,
  History,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  Users,
  ClipboardCheck,
  BarChart3,
  ChevronRight
} from 'lucide-react'
import type {
  SpreadsheetAutomation,
  AutomationType,
  AutomationTrigger,
  AutomationExecutionHistory,
  WorkflowRowLink
} from '../../types/automation'

export interface AutomationsHubProps {
  /** List of automations for this sheet */
  automations: SpreadsheetAutomation[]
  /** Execution history */
  executionHistory?: AutomationExecutionHistory[]
  /** Active workflow links */
  workflowLinks?: WorkflowRowLink[]
  /** Loading state */
  isLoading?: boolean
  /** Callback when creating new automation */
  onCreateAutomation: () => void
  /** Callback when editing an automation */
  onEditAutomation: (automation: SpreadsheetAutomation) => void
  /** Callback when deleting an automation */
  onDeleteAutomation: (automationId: string) => Promise<void>
  /** Callback when toggling automation enabled state */
  onToggleAutomation: (automationId: string, enabled: boolean) => Promise<void>
  /** Callback when duplicating an automation */
  onDuplicateAutomation: (automationId: string) => Promise<void>
  /** Callback when running an automation manually */
  onRunAutomation: (automationId: string) => Promise<void>
  /** Callback when refreshing automations list */
  onRefresh?: () => void
  /** Data test ID */
  'data-testid'?: string
}

/**
 * Get icon for automation type
 */
function getAutomationTypeIcon(type: AutomationType) {
  switch (type) {
    case 'row_workflow':
      return FileSpreadsheet
    case 'bulk_collection':
      return Users
    case 'sheet_approval':
    case 'line_approval':
      return ClipboardCheck
    default:
      return Zap
  }
}

/**
 * Get label for automation type
 */
function getAutomationTypeLabel(type: AutomationType): string {
  const labels: Record<AutomationType, string> = {
    row_workflow: 'Row Workflow',
    bulk_collection: 'Bulk Collection',
    sheet_approval: 'Sheet Approval',
    line_approval: 'Line Approval'
  }
  return labels[type] || type
}

/**
 * Get label for trigger type
 */
function getTriggerLabel(trigger: AutomationTrigger): string {
  const labels: Record<AutomationTrigger, string> = {
    manual: 'Manual',
    onRowAdd: 'On Row Add',
    onFieldChange: 'On Field Change',
    scheduled: 'Scheduled',
    onApprovalRequest: 'On Approval Request'
  }
  return labels[trigger] || trigger
}

/**
 * Format relative time
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}

/**
 * AutomationCard Component
 */
interface AutomationCardProps {
  automation: SpreadsheetAutomation
  activeWorkflows?: number
  onEdit: () => void
  onDelete: () => void
  onToggle: (enabled: boolean) => void
  onDuplicate: () => void
  onRun: () => void
  isRunning?: boolean
}

const AutomationCard: React.FC<AutomationCardProps> = ({
  automation,
  activeWorkflows = 0,
  onEdit,
  onDelete,
  onToggle,
  onDuplicate,
  onRun,
  isRunning = false
}) => {
  const Icon = getAutomationTypeIcon(automation.type)

  return (
    <Card
      className="gba:hover:border-primary/50 gba:transition-colors"
      data-testid={`automation-card-${automation.id}`}
    >
      <CardContent className="gba:p-4">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
          {/* Left: Icon and info */}
          <div className="gba:flex gba:items-start gba:gap-3 gba:flex-1 gba:min-w-0">
            <div className="gba:w-10 gba:h-10 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
              <Icon className="gba:w-5 gba:h-5 gba:text-primary" />
            </div>
            <div className="gba:flex-1 gba:min-w-0">
              <div className="gba:flex gba:items-center gba:gap-2">
                <h3 className="gba:font-semibold gba:text-foreground gba:truncate">{automation.name}</h3>
                {!automation.isEnabled && (
                  <Badge variant="outline" className="gba:text-xs">
                    Disabled
                  </Badge>
                )}
              </div>
              <div className="gba:flex gba:items-center gba:gap-3 gba:mt-1 gba:text-sm gba:text-muted-foreground">
                <span>{getAutomationTypeLabel(automation.type)}</span>
                <span className="gba:text-muted-foreground/50">•</span>
                <span>{getTriggerLabel(automation.trigger)}</span>
              </div>
              {automation.description && (
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:line-clamp-1">
                  {automation.description}
                </p>
              )}
              <div className="gba:flex gba:items-center gba:gap-4 gba:mt-2 gba:text-xs gba:text-muted-foreground">
                {automation.lastRunAt && (
                  <span className="gba:flex gba:items-center gba:gap-1">
                    <Clock className="gba:w-3 gba:h-3" />
                    Last run: {formatRelativeTime(automation.lastRunAt)}
                  </span>
                )}
                <span className="gba:flex gba:items-center gba:gap-1">
                  <History className="gba:w-3 gba:h-3" />
                  {automation.runCount} executions
                </span>
                {activeWorkflows > 0 && (
                  <span className="gba:flex gba:items-center gba:gap-1 gba:text-info">
                    <RefreshCw className="gba:w-3 gba:h-3 gba:animate-spin" />
                    {activeWorkflows} active
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="gba:flex gba:items-center gba:gap-2">
            <Switch
              checked={automation.isEnabled}
              onCheckedChange={onToggle}
              aria-label="Toggle automation"
            />

            {automation.trigger === 'manual' && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRun}
                disabled={!automation.isEnabled || isRunning}
              >
                {isRunning ? (
                  <Spinner size="sm" className="gba:mr-1" />
                ) : (
                  <Play className="gba:w-4 gba:h-4 gba:mr-1" />
                )}
                Run
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  <MoreVertical className="gba:w-4 gba:h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" style={{ zIndex: 1000002 }}>
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="gba:w-4 gba:h-4 gba:mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="gba:w-4 gba:h-4 gba:mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="gba:text-destructive">
                  <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * ExecutionHistoryRow Component
 */
interface ExecutionHistoryRowProps {
  entry: AutomationExecutionHistory
  automationName?: string
}

const ExecutionHistoryRow: React.FC<ExecutionHistoryRowProps> = ({ entry, automationName }) => {
  const isSuccess = entry.failedCount === 0
  const StatusIcon = isSuccess ? CheckCircle : entry.failedCount < entry.rowCount ? AlertTriangle : XCircle
  const statusColor = isSuccess ? 'gba:text-success' : entry.failedCount < entry.rowCount ? 'gba:text-warning' : 'gba:text-destructive'

  return (
    <div className="gba:flex gba:items-center gba:justify-between gba:py-3 gba:border-b gba:last:border-b-0">
      <div className="gba:flex gba:items-center gba:gap-3">
        <StatusIcon className={`gba:w-5 gba:h-5 ${statusColor}`} />
        <div>
          <div className="gba:text-sm gba:font-medium gba:text-foreground">
            {automationName || 'Automation'}
          </div>
          <div className="gba:text-xs gba:text-muted-foreground">
            {formatRelativeTime(entry.executedAt)} • {entry.rowCount} rows
          </div>
        </div>
      </div>
      <div className="gba:text-right">
        <div className="gba:text-sm">
          <span className="gba:text-success">{entry.successCount} succeeded</span>
          {entry.failedCount > 0 && (
            <span className="gba:text-destructive gba:ml-2">{entry.failedCount} failed</span>
          )}
        </div>
        <div className="gba:text-xs gba:text-muted-foreground">{entry.durationMs}ms</div>
      </div>
    </div>
  )
}

/**
 * AutomationsHub Component
 */
export const AutomationsHub: React.FC<AutomationsHubProps> = ({
  automations,
  executionHistory = [],
  workflowLinks = [],
  isLoading = false,
  onCreateAutomation,
  onEditAutomation,
  onDeleteAutomation,
  onToggleAutomation,
  onDuplicateAutomation,
  onRunAutomation,
  onRefresh,
  'data-testid': testId = 'automations-hub'
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('automations')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [automationToDelete, setAutomationToDelete] = useState<SpreadsheetAutomation | null>(null)
  const [runningAutomations, setRunningAutomations] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  // Inject z-index styles for dropdowns in the hub (higher than parent portal)
  useEffect(() => {
    const styleId = 'automations-hub-dropdown-z-index'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        [data-radix-popper-content-wrapper] {
          z-index: 1000002 !important;
        }
      `
      document.head.appendChild(style)
    }
    return () => {
      const existingStyle = document.getElementById(styleId)
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [])

  // Filter automations by search
  const filteredAutomations = useMemo(() => {
    if (!searchQuery.trim()) return automations
    const query = searchQuery.toLowerCase()
    return automations.filter(
      a => a.name.toLowerCase().includes(query) || a.description?.toLowerCase().includes(query)
    )
  }, [automations, searchQuery])

  // Count active workflows per automation
  const activeWorkflowCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    workflowLinks.forEach(link => {
      if (link.workflowStatus === 'RUNNING' || link.workflowStatus === 'PENDING') {
        counts[link.automationId] = (counts[link.automationId] || 0) + 1
      }
    })
    return counts
  }, [workflowLinks])

  // Get automation name by ID for history display
  const getAutomationName = useCallback(
    (automationId: string) => {
      return automations.find(a => a.id === automationId)?.name
    },
    [automations]
  )

  // Handle delete confirmation
  const handleDeleteClick = useCallback((automation: SpreadsheetAutomation) => {
    setAutomationToDelete(automation)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!automationToDelete) return
    setIsDeleting(true)
    try {
      await onDeleteAutomation(automationToDelete.id)
      setDeleteDialogOpen(false)
      setAutomationToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }, [automationToDelete, onDeleteAutomation])

  // Handle run automation
  const handleRunAutomation = useCallback(
    async (automationId: string) => {
      setRunningAutomations(prev => new Set(prev).add(automationId))
      try {
        await onRunAutomation(automationId)
      } finally {
        setRunningAutomations(prev => {
          const next = new Set(prev)
          next.delete(automationId)
          return next
        })
      }
    },
    [onRunAutomation]
  )

  // Stats
  const stats = useMemo(() => {
    const enabled = automations.filter(a => a.isEnabled).length
    const totalExecutions = automations.reduce((sum, a) => sum + a.runCount, 0)
    const activeWorkflows = workflowLinks.filter(
      l => l.workflowStatus === 'RUNNING' || l.workflowStatus === 'PENDING'
    ).length

    return { total: automations.length, enabled, totalExecutions, activeWorkflows }
  }, [automations, workflowLinks])

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0" data-testid={testId}>
      {/* Header */}
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-4 gba:mb-6">
        <div className="gba:flex-1 gba:min-w-0">
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground gba:flex gba:items-center gba:gap-2">
            <Zap className="gba:w-5 gba:h-5 gba:text-primary" />
            Automations
          </h2>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
            Automate workflows for your spreadsheet data
          </p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-shrink-0">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="gba:w-4 gba:h-4" />
            </Button>
          )}
          <Button size="sm" onClick={onCreateAutomation}>
            <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
            New
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-3 gba:mb-6">
        <Card>
          <CardContent className="gba:p-3">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:text-xs gba:text-muted-foreground">Total</div>
              <div className="gba:text-lg gba:font-bold gba:text-foreground">{stats.total}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="gba:p-3">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:text-xs gba:text-muted-foreground">Enabled</div>
              <div className="gba:text-lg gba:font-bold gba:text-success">{stats.enabled}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="gba:p-3">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:text-xs gba:text-muted-foreground">Executions</div>
              <div className="gba:text-lg gba:font-bold gba:text-foreground">{stats.totalExecutions}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="gba:p-3">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:text-xs gba:text-muted-foreground">Active</div>
              <div className="gba:text-lg gba:font-bold gba:text-info">{stats.activeWorkflows}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="gba:flex-1 gba:flex gba:flex-col gba:min-h-0">
        <div className="gba:flex gba:flex-col gba:gap-3 gba:mb-4">
          <TabsList className="gba:w-full">
            <TabsTrigger value="automations" className="gba:flex-1">Automations</TabsTrigger>
            <TabsTrigger value="history" className="gba:flex-1">History</TabsTrigger>
          </TabsList>

          {activeTab === 'automations' && (
            <div className="gba:relative">
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <Input
                placeholder="Search automations..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="gba:pl-10"
              />
            </div>
          )}
        </div>

        {/* Automations Tab */}
        <TabsContent value="automations" className="gba:flex-1">
          {isLoading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
              <Spinner size="lg" />
            </div>
          ) : filteredAutomations.length === 0 ? (
            <Card className="gba:border-dashed">
              <CardContent className="gba:py-16 gba:text-center">
                <Zap className="gba:w-12 gba:h-12 gba:text-muted-foreground gba:mx-auto gba:mb-4" />
                <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-2">
                  {automations.length === 0 ? 'No automations yet' : 'No matching automations'}
                </h3>
                <p className="gba:text-muted-foreground gba:mb-4">
                  {automations.length === 0
                    ? 'Create your first automation to start processing rows with workflows.'
                    : 'Try adjusting your search query.'}
                </p>
                {automations.length === 0 && (
                  <Button onClick={onCreateAutomation}>
                    <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                    Create Automation
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="gba:space-y-3">
              {filteredAutomations.map(automation => (
                <AutomationCard
                  key={automation.id}
                  automation={automation}
                  activeWorkflows={activeWorkflowCounts[automation.id] || 0}
                  onEdit={() => onEditAutomation(automation)}
                  onDelete={() => handleDeleteClick(automation)}
                  onToggle={enabled => onToggleAutomation(automation.id, enabled)}
                  onDuplicate={() => onDuplicateAutomation(automation.id)}
                  onRun={() => handleRunAutomation(automation.id)}
                  isRunning={runningAutomations.has(automation.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="gba:flex-1">
          {executionHistory.length === 0 ? (
            <Card className="gba:border-dashed">
              <CardContent className="gba:py-16 gba:text-center">
                <History className="gba:w-12 gba:h-12 gba:text-muted-foreground gba:mx-auto gba:mb-4" />
                <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-2">No execution history</h3>
                <p className="gba:text-muted-foreground">
                  Run an automation to see execution history here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="gba:p-4">
                {executionHistory.map(entry => (
                  <ExecutionHistoryRow
                    key={entry.id}
                    entry={entry}
                    automationName={getAutomationName(entry.automationId)}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent style={{ zIndex: 1000003 }}>
          <DialogHeader>
            <DialogTitle>Delete Automation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{automationToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? <Spinner size="sm" className="gba:mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AutomationsHub
