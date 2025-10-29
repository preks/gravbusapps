/**
 * TaskCard Component
 * Individual task card with priority badges and quick actions
 */

import React, { memo } from 'react';
import {
  Card,
  CardContent,
  Badge,
  Button
} from '@newwork/nw-design-system';
import { Clock, AlertTriangle, Eye } from 'lucide-react';
import { UnifiedTask } from '../types';
import {
  formatRelativeTime,
  isOverdue,
  isDueSoon,
  getPriorityBadgeVariant,
  getTaskStatusBadgeVariant,
  formatTaskStatus,
  formatPriority
} from '../utils/taskFormatters';

interface TaskCardProps {
  task: UnifiedTask;
  onView: (task: UnifiedTask) => void;
}

export const TaskCard: React.FC<TaskCardProps> = memo(({ task, onView }) => {
  const overdue = isOverdue(task.dueDate);
  const dueSoon = isDueSoon(task.dueDate);

  const getSourceBadgeText = (source: UnifiedTask['source']): string => {
    switch (source) {
      case 'cflow':
        return 'CFlow';
      case 'kogito':
        return 'Kogito';
      default:
        return 'Task';
    }
  };

  // Get task name/title - unified API provides both name and title
  const taskTitle = task.title || task.name || 'Untitled Task';
  
  // Get flow name from workflowMeta
  const flowName = task.workflowMeta?.rootWorkflowId || task.flowId;

  return (
    <Card
      className="gba:cursor-pointer gba:hover:shadow-md gba:transition-shadow"
      onClick={() => onView(task)}
      data-testid={`task-card-${task.id}`}
    >
      <CardContent className="gba:p-4">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
          <div className="gba:flex-1 gba:min-w-0">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <Badge variant={getPriorityBadgeVariant(task.priority)} data-testid="task-priority-badge">
                {formatPriority(task.priority)}
              </Badge>
              <Badge variant="outline" data-testid="task-source-badge">
                {getSourceBadgeText(task.source)}
              </Badge>
              <Badge variant={getTaskStatusBadgeVariant(task.status)} data-testid="task-status-badge">
                {formatTaskStatus(task.status)}
              </Badge>
            </div>

            <h3
              className="gba:font-semibold gba:text-base gba:mb-1 gba:truncate"
              data-testid="task-title"
            >
              {taskTitle}
            </h3>

            {(task.description || task.message) && (
              <p
                className="gba:text-sm gba:text-muted-foreground gba:line-clamp-2 gba:mb-2"
                data-testid="task-description"
              >
                {task.description || task.message}
              </p>
            )}

            <div className="gba:flex gba:items-center gba:gap-4 gba:text-xs gba:text-muted-foreground">
              {flowName && (
                <span data-testid="task-flow-name">
                  {flowName}
                </span>
              )}
              {task.dueDate && (
                <div className="gba:flex gba:items-center gba:gap-1">
                  {overdue || dueSoon ? (
                    <AlertTriangle className="gba:h-3 gba:w-3" />
                  ) : (
                    <Clock className="gba:h-3 gba:w-3" />
                  )}
                  <span
                    className={
                      overdue
                        ? 'gba:text-destructive gba:font-semibold'
                        : dueSoon
                        ? 'gba:text-warning gba:font-semibold'
                        : ''
                    }
                    data-testid="task-due-date"
                  >
                    {overdue ? 'Overdue' : dueSoon ? 'Due soon' : `Due ${formatRelativeTime(task.dueDate)}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onView(task);
            }}
            data-testid={`task-view-button-${task.id}`}
          >
            <Eye className="gba:h-4 gba:w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

