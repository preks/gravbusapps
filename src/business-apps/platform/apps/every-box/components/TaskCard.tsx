/**
 * TaskCard Component
 * Individual task card with priority badges and quick actions
 */

import React, { memo } from 'react';
import {
  Card,
  CardContent,
  Badge,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system';
import { Clock, AlertTriangle, Eye, User } from 'lucide-react';
import { UnifiedTask } from '../types';
import {
  formatRelativeTime,
  formatDateTime,
  isOverdue,
  isDueSoon,
  getPriorityBadgeVariant,
  getTaskStatusBadgeVariant,
  formatTaskStatus,
  formatPriority
} from '../utils/taskFormatters';
import { useEmployeeAvatar } from '../hooks/useEmployeeAvatar';

interface TaskCardProps {
  task: UnifiedTask;
  onView: (task: UnifiedTask) => void;
  accessToken: string;
}

export const TaskCard: React.FC<TaskCardProps> = memo(({ task, onView, accessToken }) => {
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

  // Extract creator employee ID from different sources
  // For Kogito tasks: creatorUserId is the employee ID
  // For CFlow tasks: check various possible fields for creator ID
  const creatorEmployeeId = task.sourceMetadata?.creatorUserId || 
                           task.sourceMetadata?.createdBy ||
                           task.sourceMetadata?.initiatedBy ||
                           task.assignment?.assignedTo;

  // Fetch employee avatar data
  const { employeeData } = useEmployeeAvatar(accessToken, creatorEmployeeId);

  // Get creator name - prefer fetched data, fallback to metadata
  const creatorName = employeeData 
    ? `${employeeData.firstName} ${employeeData.lastName}`.trim()
    : task.sourceMetadata?.creatorName || task.sourceMetadata?.ownerName || 'Unknown';
  
  const createdAt = task.createdAt || task.scheduledAt || task.sourceMetadata?.createdAt;
  
  // Generate initials from creator name
  const getInitials = (name: string): string => {
    if (employeeData) {
      return `${employeeData.firstName?.[0] || ''}${employeeData.lastName?.[0] || ''}`.toUpperCase();
    }
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Card
      className="gba:cursor-pointer gba:hover:shadow-md gba:transition-shadow"
      onClick={() => onView(task)}
      data-testid={`task-card-${task.id}`}
    >
      <CardContent className="gba:p-4">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
          <div className="gba:flex-1 gba:min-w-0">
            {/* Creator info section */}
            <div className="gba:flex gba:items-center gba:gap-3 gba:mb-3" data-testid="task-creator-section">
              <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0" data-testid="task-creator-avatar">
                {employeeData?.pictureThumbnail && (
                  <AvatarImage
                    src={`data:image/jpeg;base64,${employeeData.pictureThumbnail}`}
                    alt={creatorName}
                  />
                )}
                <AvatarFallback className="gba:text-xs gba:font-medium gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:text-white">
                  {getInitials(creatorName)}
                </AvatarFallback>
              </Avatar>
              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <User className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
                  <span className="gba:text-xs gba:font-medium gba:truncate" data-testid="task-creator-name">
                    {creatorName}
                  </span>
                </div>
                {createdAt && (
                  <div className="gba:flex gba:items-center gba:gap-1 gba:mt-0.5">
                    <Clock className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
                    <span className="gba:text-xs gba:text-muted-foreground" data-testid="task-created-at">
                      {formatDateTime(createdAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>

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

