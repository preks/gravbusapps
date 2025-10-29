/**
 * TaskDetailDialog Component
 * Displays detailed task information for both Kogito and CFlow tasks
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Badge,
  Button,
  Separator,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system';
import { CheckCircle, User, Calendar, Info } from 'lucide-react';
import { UnifiedTask } from '../types';
import {
  formatDateTime,
  getPriorityBadgeVariant,
  getTaskStatusBadgeVariant,
  formatTaskStatus,
  formatPriority
} from '../utils/taskFormatters';
import { navigateTo } from '@/common/utils/navigationUtils';

interface TaskDetailDialogProps {
  task: UnifiedTask | null;
  open: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
  task,
  open,
  onClose
}) => {
  if (!task) return null;

  const handleOpenTask = () => {
    // For Kogito tasks, navigate to the endpoint path
    if (task.source === 'kogito' && task.sourceMetadata?.endpoint) {
      try {
        const endpoint = task.sourceMetadata.endpoint as string;
        console.log('[EveryBox] Opening Kogito task via endpoint:', endpoint);
        
        // Extract just the path from the endpoint URL
        // Format: /processes/{domain}/{processName}/{processInstanceId}/{taskName}/{taskId}
        const url = new URL(endpoint);
        const endpointPath = url.pathname;
        
        console.log('[EveryBox] Navigating to path:', endpointPath);
        
        // Navigate to the endpoint path - platform's routing should handle it
        navigateTo(endpointPath);
        onClose();
      } catch (err) {
        console.error('[EveryBox] Error opening Kogito task:', err);
      }
      return;
    }

    // For CFlow tasks with endpoint
    if (task.source === 'cflow' && task.sourceMetadata?.endpoint) {
      try {
        const endpoint = task.sourceMetadata.endpoint as string;
        console.log('[EveryBox] Opening CFlow task via endpoint:', endpoint);
        
        const url = new URL(endpoint);
        navigateTo(url.pathname);
        onClose();
      } catch (err) {
        console.error('[EveryBox] Error opening CFlow task:', err);
      }
      return;
    }

    console.warn('[EveryBox] No endpoint available for task:', task);
  };

  // Get task title
  const taskTitle = task.title || task.name || 'Untitled Task';

  // Get task description/message
  const taskDescription = task.description || task.message;

  // Get assignee info
  const assignedTo = task.assignment?.assignedTo || 
    (task.source === 'kogito' && task.sourceMetadata?.ownerName) || 
    'Unassigned';

  // Get creation/scheduled date
  const scheduledDate = task.scheduledAt || task.createdAt;

  // Get task inputs/context data
  const taskInputs = task.sourceMetadata?.inputs || task.inputs;

  // Check if task has an endpoint to open
  const hasEndpoint = !!(task.sourceMetadata?.endpoint);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="gba:max-w-2xl gba:max-h-[80vh] gba:overflow-y-auto" data-testid="task-detail-dialog">
        <DialogHeader>
          <DialogTitle data-testid="task-detail-title">{taskTitle}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4">
          {/* Badges */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
            <Badge variant={getPriorityBadgeVariant(task.priority)} data-testid="task-detail-priority">
              {formatPriority(task.priority)}
            </Badge>
            <Badge variant={getTaskStatusBadgeVariant(task.status)} data-testid="task-detail-status">
              {formatTaskStatus(task.status)}
            </Badge>
            <Badge variant="outline" data-testid="task-detail-source">
              {task.source === 'kogito' ? 'Kogito' : 'CFlow'}
            </Badge>
          </div>

          {/* Description/Message */}
          {taskDescription && (
            <div>
              <h4 className="gba:font-semibold gba:mb-2">Description</h4>
              <p className="gba:text-sm gba:text-muted-foreground">{taskDescription}</p>
            </div>
          )}

          <Separator />

          {/* Task Details Grid */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            {/* Assignee */}
            <div>
              <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:mb-1">
                <User className="gba:h-4 gba:w-4" />
                <span>Assigned To</span>
              </div>
              <p className="gba:font-medium" data-testid="task-detail-assignee">
                {assignedTo}
              </p>
            </div>

            {/* Scheduled/Created Date */}
            {scheduledDate && (
              <div>
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:mb-1">
                  <Calendar className="gba:h-4 gba:w-4" />
                  <span>Scheduled</span>
                </div>
                <p className="gba:font-medium" data-testid="task-detail-scheduled">
                  {formatDateTime(scheduledDate)}
                </p>
              </div>
            )}

            {/* Due Date */}
            {task.dueDate && (
              <div>
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:mb-1">
                  <Calendar className="gba:h-4 gba:w-4" />
                  <span>Due Date</span>
                </div>
                <p className="gba:font-medium" data-testid="task-detail-due-date">
                  {formatDateTime(task.dueDate)}
                </p>
              </div>
            )}

            {/* Flow/Process ID */}
            {task.flowId && (
              <div>
                <div className="gba:text-sm gba:text-muted-foreground gba:mb-1">
                  Flow ID
                </div>
                <p className="gba:font-medium gba:text-xs gba:font-mono" data-testid="task-detail-flow-id">
                  {task.flowId}
                </p>
              </div>
            )}
          </div>

          {/* Task inputs/context data */}
          {taskInputs && typeof taskInputs === 'object' && Object.keys(taskInputs).length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="gba:font-semibold gba:mb-2">Task Context</h4>
                <div className="gba:bg-muted gba:p-3 gba:rounded-md gba:space-y-2">
                  {Object.entries(taskInputs).map(([key, value]) => (
                    <div key={key} className="gba:flex gba:gap-2">
                      <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[120px]">
                        {key}:
                      </span>
                      <span className="gba:text-sm gba:flex-1">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Available Actions Info */}
          {task.availableActions && (
            <>
              <Separator />
              <div>
                <h4 className="gba:font-semibold gba:mb-2">Available Actions</h4>
                <div className="gba:flex gba:gap-2 gba:flex-wrap">
                  {task.availableActions.canClaim && (
                    <Badge variant="outline">Can Claim</Badge>
                  )}
                  {task.availableActions.canComplete && (
                    <Badge variant="outline">Can Complete</Badge>
                  )}
                  {task.availableActions.canReassign && (
                    <Badge variant="outline">Can Reassign</Badge>
                  )}
                  {task.availableActions.canUnclaim && (
                    <Badge variant="outline">Can Unclaim</Badge>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Info Alert */}
          {!hasEndpoint && (
            <Alert>
              <Info className="gba:h-4 gba:w-4" />
              <AlertDescription className="gba:text-sm">
                This task can be viewed and managed from here. Use the task list to perform actions on it.
              </AlertDescription>
            </Alert>
          )}

          {/* Action buttons */}
          <div className="gba:flex gba:gap-2 gba:justify-end">
            <Button variant="outline" onClick={onClose} data-testid="task-detail-cancel-button">
              Close
            </Button>

            {/* Primary action: Open task in dedicated screen */}
            {hasEndpoint && task.status !== 'COMPLETED' && (
              <Button onClick={handleOpenTask} data-testid="task-detail-open-button">
                <CheckCircle className="gba:mr-2 gba:h-4 gba:w-4" />
                Open Task
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
