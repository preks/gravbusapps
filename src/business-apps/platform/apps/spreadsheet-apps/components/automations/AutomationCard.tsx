/**
 * AutomationCard Component
 *
 * Reusable card for displaying automation summary with actions.
 */

import React from 'react'
import {
  Card,
  CardContent,
  Badge,
  Button,
  Switch,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@newwork/nw-design-system'
import {
  Zap,
  FileSpreadsheet,
  Users,
  ClipboardCheck,
  MoreVertical,
  Play,
  Pencil,
  Trash2,
  Copy,
  History,
  Clock,
  RefreshCw
} from 'lucide-react'
import type { SpreadsheetAutomation, AutomationType, AutomationTrigger } from '../../types/automation'

export interface AutomationCardProps {
  automation: SpreadsheetAutomation
  activeWorkflows?: number
  onEdit?: () => void
  onDelete?: () => void
  onToggle?: (enabled: boolean) => void
  onDuplicate?: () => void
  onRun?: () => void
  isRunning?: boolean
  compact?: boolean
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
export const AutomationCard: React.FC<AutomationCardProps> = ({
  automation,
  activeWorkflows = 0,
  onEdit,
  onDelete,
  onToggle,
  onDuplicate,
  onRun,
  isRunning = false,
  compact = false,
  'data-testid': testId
}) => {
  const Icon = getAutomationTypeIcon(automation.type)

  if (compact) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg gba:hover:border-primary/50 gba:transition-colors"
        data-testid={testId || `automation-card-${automation.id}`}
      >
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:w-8 gba:h-8 gba:rounded-md gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
            <Icon className="gba:w-4 gba:h-4 gba:text-primary" />
          </div>
          <div>
            <span className="gba:font-medium gba:text-foreground">{automation.name}</span>
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
              <span>{getAutomationTypeLabel(automation.type)}</span>
              {!automation.isEnabled && (
                <Badge variant="outline" className="gba:text-xs">
                  Disabled
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="gba:flex gba:items-center gba:gap-2">
          {onToggle && <Switch checked={automation.isEnabled} onCheckedChange={onToggle} />}
          {onEdit && (
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Pencil className="gba:w-4 gba:h-4" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card
      className="gba:hover:border-primary/50 gba:transition-colors"
      data-testid={testId || `automation-card-${automation.id}`}
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
            {onToggle && (
              <Switch checked={automation.isEnabled} onCheckedChange={onToggle} aria-label="Toggle automation" />
            )}

            {automation.trigger === 'manual' && onRun && (
              <Button size="sm" variant="outline" onClick={onRun} disabled={!automation.isEnabled || isRunning}>
                {isRunning ? (
                  <RefreshCw className="gba:w-4 gba:h-4 gba:mr-1 gba:animate-spin" />
                ) : (
                  <Play className="gba:w-4 gba:h-4 gba:mr-1" />
                )}
                Run
              </Button>
            )}

            {(onEdit || onDuplicate || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <MoreVertical className="gba:w-4 gba:h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil className="gba:w-4 gba:h-4 gba:mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDuplicate && (
                    <DropdownMenuItem onClick={onDuplicate}>
                      <Copy className="gba:w-4 gba:h-4 gba:mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onDelete} className="gba:text-destructive">
                        <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default AutomationCard
