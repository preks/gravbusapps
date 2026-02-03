/**
 * AutomationRowContextMenu Component
 *
 * Context menu items for automation actions on individual rows.
 * Provides row-level workflow triggers, status viewing, and task actions.
 */

import React, { useMemo } from 'react'
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
  Badge
} from '@newwork/nw-design-system'
import {
  Zap,
  Play,
  Eye,
  Hand,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileSpreadsheet,
  Users,
  ClipboardCheck
} from 'lucide-react'
import type { SpreadsheetAutomation, WorkflowRowLink, AutomationType } from '../../types/automation'
import { getWorkflowStatusLabel, isTerminalStatus } from '../../types/automation'

export interface AutomationRowContextMenuProps {
  /** Row ID */
  rowId: string
  /** Row data */
  rowData: Record<string, unknown>
  /** Available automations */
  automations: SpreadsheetAutomation[]
  /** Workflow link for this row */
  workflowLink?: WorkflowRowLink
  /** Current user ID */
  currentUserId?: string
  /** Callback to run automation for this row */
  onRunAutomation: (automationId: string, rowId: string, rowData: Record<string, unknown>) => void
  /** Callback to view workflow details */
  onViewWorkflowDetails?: (workflowId: string) => void
  /** Callback to claim task */
  onClaimTask?: (workflowId: string, stepIndex: number) => void
  /** Callback to complete task */
  onCompleteTask?: (workflowId: string, stepIndex: number) => void
  /** Callback to cancel workflow */
  onCancelWorkflow?: (workflowId: string) => void
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
 * Get icon for workflow status
 */

/**
 * AutomationRowContextMenu Component
 *
 * Renders menu items to be used inside a DropdownMenuContent.
 * Note: This component renders DropdownMenuItem elements directly,
 * it should be used within an existing DropdownMenu.
 */
export const AutomationRowContextMenu: React.FC<AutomationRowContextMenuProps> = ({
  rowId,
  rowData,
  automations,
  workflowLink,
  currentUserId,
  onRunAutomation,
  onViewWorkflowDetails,
  onClaimTask,
  onCompleteTask,
  onCancelWorkflow,
  'data-testid': testId = 'automation-row-context-menu'
}) => {
  // Filter enabled automations that can be triggered per-row
  const triggerableAutomations = useMemo(
    () =>
      automations.filter(
        a => a.isEnabled && (a.trigger === 'manual' || a.type === 'row_workflow' || a.type === 'line_approval')
      ),
    [automations]
  )

  // Check if current user is assigned to the current task
  const isAssignedToCurrentUser = useMemo(() => {
    if (!workflowLink?.stepDetails || !currentUserId) return false
    const currentStep = workflowLink.stepDetails[workflowLink.currentStepIndex]
    return currentStep?.assignedTo === currentUserId
  }, [workflowLink, currentUserId])

  // Determine available actions based on workflow state
  const canClaim =
    workflowLink &&
    workflowLink.workflowStatus === 'RUNNING' &&
    workflowLink.stepDetails?.[workflowLink.currentStepIndex]?.status === 'PENDING' &&
    onClaimTask

  const canComplete =
    workflowLink && workflowLink.workflowStatus === 'RUNNING' && isAssignedToCurrentUser && onCompleteTask

  const canCancel = workflowLink && !isTerminalStatus(workflowLink.workflowStatus) && onCancelWorkflow

  // No automations and no workflow link - don't render anything
  if (triggerableAutomations.length === 0 && !workflowLink) {
    return null
  }

  return (
    <>
      {/* Separator before automation section */}
      <DropdownMenuSeparator />

      {/* Run Automation Sub-menu */}
      {triggerableAutomations.length > 0 && (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger data-testid={`${testId}-trigger`}>
            <Zap className="gba:w-4 gba:h-4 gba:mr-2" />
            Run Automation
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {triggerableAutomations.map(automation => {
              const Icon = getAutomationTypeIcon(automation.type)
              return (
                <DropdownMenuItem
                  key={automation.id}
                  onClick={() => onRunAutomation(automation.id, rowId, rowData)}
                  data-testid={`${testId}-run-${automation.id}`}
                >
                  <Icon className="gba:w-4 gba:h-4 gba:mr-2" />
                  {automation.name}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      )}

      {/* Single automation - show direct action */}
      {triggerableAutomations.length === 1 && (
        <DropdownMenuItem
          onClick={() => onRunAutomation(triggerableAutomations[0].id, rowId, rowData)}
          data-testid={`${testId}-run-single`}
        >
          <Play className="gba:w-4 gba:h-4 gba:mr-2" />
          Run {triggerableAutomations[0].name}
        </DropdownMenuItem>
      )}

      {/* Workflow Status Section */}
      {workflowLink && (
        <>
          <DropdownMenuSeparator />

          {/* View Workflow Details */}
          {onViewWorkflowDetails && (
            <DropdownMenuItem
              onClick={() => onViewWorkflowDetails(workflowLink.workflowId)}
              data-testid={`${testId}-view-details`}
            >
              <Eye className="gba:w-4 gba:h-4 gba:mr-2" />
              View Workflow Details
              <Badge
                variant={
                  workflowLink.workflowStatus === 'COMPLETED'
                    ? 'success'
                    : workflowLink.workflowStatus === 'FAILED'
                      ? 'destructive'
                      : workflowLink.workflowStatus === 'RUNNING'
                        ? 'info'
                        : 'outline'
                }
                className="gba:ml-auto gba:text-xs"
              >
                {getWorkflowStatusLabel(workflowLink.workflowStatus)}
              </Badge>
            </DropdownMenuItem>
          )}

          {/* Workflow Progress */}
          {!isTerminalStatus(workflowLink.workflowStatus) && (
            <DropdownMenuItem disabled className="gba:text-muted-foreground">
              <RefreshCw className="gba:w-4 gba:h-4 gba:mr-2 gba:animate-spin" />
              Step {workflowLink.currentStepIndex + 1} of {workflowLink.totalSteps}
            </DropdownMenuItem>
          )}

          {/* Task Actions */}
          {canClaim && (
            <DropdownMenuItem
              onClick={() => onClaimTask(workflowLink.workflowId, workflowLink.currentStepIndex)}
              data-testid={`${testId}-claim-task`}
            >
              <Hand className="gba:w-4 gba:h-4 gba:mr-2" />
              Claim Task
            </DropdownMenuItem>
          )}

          {canComplete && (
            <DropdownMenuItem
              onClick={() => onCompleteTask(workflowLink.workflowId, workflowLink.currentStepIndex)}
              data-testid={`${testId}-complete-task`}
            >
              <CheckCircle className="gba:w-4 gba:h-4 gba:mr-2" />
              Complete Task
            </DropdownMenuItem>
          )}

          {/* Cancel Workflow */}
          {canCancel && (
            <DropdownMenuItem
              onClick={() => onCancelWorkflow(workflowLink.workflowId)}
              className="gba:text-destructive"
              data-testid={`${testId}-cancel-workflow`}
            >
              <XCircle className="gba:w-4 gba:h-4 gba:mr-2" />
              Cancel Workflow
            </DropdownMenuItem>
          )}
        </>
      )}
    </>
  )
}

/**
 * Standalone menu items for when multiple automations exist
 * Use this when you want to render individual items instead of a sub-menu
 */
export const AutomationRowMenuItems: React.FC<{
  rowId: string
  rowData: Record<string, unknown>
  automations: SpreadsheetAutomation[]
  onRunAutomation: (automationId: string, rowId: string, rowData: Record<string, unknown>) => void
  limit?: number
}> = ({ rowId, rowData, automations, onRunAutomation, limit = 3 }) => {
  const visibleAutomations = automations.slice(0, limit)

  return (
    <>
      {visibleAutomations.map(automation => {
        const Icon = getAutomationTypeIcon(automation.type)
        return (
          <DropdownMenuItem key={automation.id} onClick={() => onRunAutomation(automation.id, rowId, rowData)}>
            <Icon className="gba:w-4 gba:h-4 gba:mr-2" />
            Run {automation.name}
          </DropdownMenuItem>
        )
      })}
      {automations.length > limit && (
        <DropdownMenuItem disabled className="gba:text-muted-foreground gba:text-xs">
          +{automations.length - limit} more automations
        </DropdownMenuItem>
      )}
    </>
  )
}

export default AutomationRowContextMenu
