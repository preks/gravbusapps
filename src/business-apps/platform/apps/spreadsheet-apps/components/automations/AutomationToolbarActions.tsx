/**
 * AutomationToolbarActions Component
 *
 * Toolbar buttons for automation actions in the SpreadsheetAppViewer.
 * Provides quick access to run automations, view status, and open automation hub.
 */

import React, { useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Button,
  AiButton,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../_i18n'
import {
  Zap,
  Play,
  Settings,
  ChevronDown,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  Users,
  ClipboardCheck,
  FileDown,
  CheckCircle,
  Clock,
  AlertTriangle,
  Sparkles
} from 'lucide-react'
import type { SpreadsheetAutomation, WorkflowRowLink, AutomationType } from '../../types/automation'

export interface AutomationToolbarActionsProps {
  /** Available automations */
  automations: SpreadsheetAutomation[]
  /** Workflow links for status display */
  workflowLinks: WorkflowRowLink[]
  /** Currently selected row IDs */
  selectedRowIds?: string[]
  /** Callback to open automation hub */
  onOpenHub: () => void
  /** Callback to create new automation */
  onCreateAutomation: () => void
  /** Callback to run automation */
  onRunAutomation: (automationId: string, rowIds?: string[]) => Promise<void>
  /** Callback to refresh workflow statuses */
  onRefreshStatuses?: () => void
  /** Whether automation execution is in progress */
  isExecuting?: boolean
  /** Show Summarize with AI button (excel_collection with completed rows) */
  showSummarizeButton?: boolean
  /** Callback when Summarize with AI is clicked */
  onSummarizeClick?: () => void
  /** Whether summarization is in progress */
  isSummarizing?: boolean
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
    case 'excel_collection':
      return FileDown
    case 'sheet_approval':
    case 'line_approval':
      return ClipboardCheck
    default:
      return Zap
  }
}

/**
 * AutomationToolbarActions Component
 */
export const AutomationToolbarActions: React.FC<AutomationToolbarActionsProps> = ({
  automations,
  workflowLinks,
  selectedRowIds = [],
  onOpenHub,
  onCreateAutomation,
  onRunAutomation,
  onRefreshStatuses,
  isExecuting = false,
  showSummarizeButton = false,
  onSummarizeClick,
  isSummarizing = false,
  'data-testid': testId = 'automation-toolbar-actions'
}) => {
  const { t } = useTranslation(translations)
  const [runningAutomationId, setRunningAutomationId] = useState<string | null>(null)

  // Filter enabled automations
  const enabledAutomations = useMemo(() => automations.filter(a => a.isEnabled), [automations])

  // Filter manual trigger automations
  const manualAutomations = useMemo(() => enabledAutomations.filter(a => a.trigger === 'manual'), [enabledAutomations])

  // Calculate workflow stats
  const workflowStats = useMemo(() => {
    const running = workflowLinks.filter(l => l.workflowStatus === 'RUNNING').length
    const pending = workflowLinks.filter(l => l.workflowStatus === 'PENDING').length
    const completed = workflowLinks.filter(l => l.workflowStatus === 'COMPLETED').length
    const failed = workflowLinks.filter(l => l.workflowStatus === 'FAILED').length

    return { running, pending, completed, failed, total: workflowLinks.length }
  }, [workflowLinks])

  // Handle run automation
  const handleRunAutomation = useCallback(
    async (automationId: string) => {
      setRunningAutomationId(automationId)
      try {
        const result = await onRunAutomation(automationId, selectedRowIds.length > 0 ? selectedRowIds : undefined)
        const r = result as { success?: boolean; error?: string } | undefined
        if (r && !r.success && r.error) {
          toast.error(r.error)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to run automation'
        toast.error(msg)
      } finally {
        setRunningAutomationId(null)
      }
    },
    [onRunAutomation, selectedRowIds]
  )

  // No automations configured
  if (automations.length === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={onCreateAutomation} data-testid={testId}>
              <Zap className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('automation-toolbar-add')}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('automation-toolbar-add-tooltip')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-2" data-testid={testId}>
      {/* Summarize with AI (excel_collection with completed rows) */}
      {showSummarizeButton && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AiButton
                size="sm"
                showIcon
                icon={
                  isSummarizing ? <Spinner className="gba:w-4 gba:h-4" /> : <Sparkles className="gba:w-4 gba:h-4" />
                }
                iconPosition="before"
                onClick={onSummarizeClick}
                disabled={isSummarizing || isExecuting}
                data-testid={`${testId}-summarize-button`}
              >
                {t('automation-toolbar-summarize')}
              </AiButton>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('automation-toolbar-summarize-tooltip')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Quick Run Button (for single manual automation) */}
      {manualAutomations.length === 1 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRunAutomation(manualAutomations[0].id)}
                disabled={isExecuting || runningAutomationId === manualAutomations[0].id}
              >
                {runningAutomationId === manualAutomations[0].id ? (
                  <Spinner size="sm" className="gba:mr-2" />
                ) : (
                  <Play className="gba:w-4 gba:h-4 gba:mr-2" />
                )}
                {t('automation-toolbar-run')} {manualAutomations[0].name}
                {selectedRowIds.length > 0 && (
                  <Badge variant="outline" className="gba:ml-2">
                    {t('automation-toolbar-selected', { count: selectedRowIds.length })}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {selectedRowIds.length > 0
                  ? t('automation-toolbar-run-for-selected', { count: selectedRowIds.length })
                  : t('automation-toolbar-run-for-all')}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Run Automation Dropdown (for multiple manual automations) */}
      {manualAutomations.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isExecuting}>
              {isExecuting ? <Spinner size="sm" className="gba:mr-2" /> : <Play className="gba:w-4 gba:h-4 gba:mr-2" />}
              {t('automation-toolbar-run')}
              {selectedRowIds.length > 0 && (
                <Badge variant="outline" className="gba:ml-2">
                  {selectedRowIds.length}
                </Badge>
              )}
              <ChevronDown className="gba:w-4 gba:h-4 gba:ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="gba:w-64">
            <DropdownMenuLabel>{t('automation-toolbar-select-automation')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {manualAutomations.map(automation => {
              const Icon = getAutomationTypeIcon(automation.type)
              const isRunning = runningAutomationId === automation.id

              return (
                <DropdownMenuItem
                  key={automation.id}
                  onClick={() => handleRunAutomation(automation.id)}
                  disabled={isRunning}
                >
                  <Icon className="gba:w-4 gba:h-4 gba:mr-2" />
                  <span className="gba:flex-1">{automation.name}</span>
                  {isRunning && <Spinner size="sm" />}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Workflow Status Indicator */}
      {workflowStats.total > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-1.5 gba:bg-muted gba:rounded-md">
                {workflowStats.running > 0 && (
                  <div className="gba:flex gba:items-center gba:gap-1 gba:text-info">
                    <RefreshCw className="gba:w-3 gba:h-3 gba:animate-spin" />
                    <span className="gba:text-xs gba:font-medium">{workflowStats.running}</span>
                  </div>
                )}
                {workflowStats.pending > 0 && (
                  <div className="gba:flex gba:items-center gba:gap-1 gba:text-muted-foreground">
                    <Clock className="gba:w-3 gba:h-3" />
                    <span className="gba:text-xs gba:font-medium">{workflowStats.pending}</span>
                  </div>
                )}
                {workflowStats.completed > 0 && (
                  <div className="gba:flex gba:items-center gba:gap-1 gba:text-success">
                    <CheckCircle className="gba:w-3 gba:h-3" />
                    <span className="gba:text-xs gba:font-medium">{workflowStats.completed}</span>
                  </div>
                )}
                {workflowStats.failed > 0 && (
                  <div className="gba:flex gba:items-center gba:gap-1 gba:text-destructive">
                    <AlertTriangle className="gba:w-3 gba:h-3" />
                    <span className="gba:text-xs gba:font-medium">{workflowStats.failed}</span>
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="gba:text-sm">
                <p className="gba:font-medium gba:mb-1">{t('automation-toolbar-workflow-status')}</p>
                {workflowStats.running > 0 && (
                  <p>{t('automation-toolbar-running', { count: workflowStats.running })}</p>
                )}
                {workflowStats.pending > 0 && (
                  <p>{t('automation-toolbar-pending', { count: workflowStats.pending })}</p>
                )}
                {workflowStats.completed > 0 && (
                  <p>{t('automation-toolbar-completed', { count: workflowStats.completed })}</p>
                )}
                {workflowStats.failed > 0 && <p>{t('automation-toolbar-failed', { count: workflowStats.failed })}</p>}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Refresh Status Button */}
      {onRefreshStatuses && workflowStats.running + workflowStats.pending > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onRefreshStatuses}>
                <RefreshCw className="gba:w-4 gba:h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('automation-toolbar-refresh-tooltip')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Automations Settings Button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <Settings className="gba:w-4 gba:h-4" />
            <ChevronDown className="gba:w-3 gba:h-3 gba:ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onOpenHub}>
            <Zap className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('automation-toolbar-manage')}
            <Badge variant="outline" className="gba:ml-auto">
              {automations.length}
            </Badge>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onCreateAutomation}>
            <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('automation-toolbar-create-new')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default AutomationToolbarActions
