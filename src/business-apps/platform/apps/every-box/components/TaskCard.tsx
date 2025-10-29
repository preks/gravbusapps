/**
 * TaskCard Component
 * Individual task card with priority badges and quick actions
 */

import React, { memo } from 'react';
import {
  Card,
  CardContent,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system';
import { Clock, AlertTriangle, User } from 'lucide-react';
import { UnifiedTask } from '../types';
import {
  formatRelativeTime,
  formatDateTime,
  isOverdue,
  isDueSoon
} from '../utils/taskFormatters';
import { EmployeeAvatarData } from '../hooks/useEmployeeAvatarsBatch';

interface TaskCardProps {
  task: UnifiedTask;
  onView: (task: UnifiedTask) => void;
  employeeMap: Map<string, EmployeeAvatarData>;
}

export const TaskCard: React.FC<TaskCardProps> = memo(({ task, onView, employeeMap }) => {
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

  // Get task name/title
  // For Kogito tasks, prefer referenceName (most descriptive with context)
  // Then fallback to nodeName, title, or name
  // For CFlow tasks, use title or name
  const taskTitle = task.source === 'kogito'
    ? (task.referenceTaskName || task.sourceMetadata?.nodeName || task.name || 'Untitled Task')
    : (task.title || task.name || 'Untitled Task');

  // Extract creator user ID from different sources
  const creatorUserId = task.sourceMetadata?.creatorUserId || 
                        task.sourceMetadata?.createdBy ||
                        task.sourceMetadata?.initiatedBy;

  // Get employee data from the batch-fetched map
  const employeeData = creatorUserId ? employeeMap.get(creatorUserId) : null;

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
      <CardContent className="gba:px-4 gba:py-1">
        <div className="gba:flex gba:items-center gba:gap-4">
          {/* Left side: Avatar, creator info, task title, source badge */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0" data-testid="task-creator-section">
            <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0" data-testid="task-creator-avatar">
              <AvatarImage
                src={
                  employeeData?.pictureThumbnail && !employeeData.pictureThumbnail.startsWith('{')
                    ? `data:image/jpeg;base64,${employeeData.pictureThumbnail}`
                    : undefined
                }
                alt={creatorName}
              />
              <AvatarFallback className="gba:text-xs gba:font-medium gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:text-white">
                {getInitials(creatorName)}
              </AvatarFallback>
            </Avatar>
            <div className="gba:flex gba:flex-col gba:min-w-0 gba:flex-shrink-0 gba:leading-none gba:gap-0.5">
              <div className="gba:flex gba:items-center gba:gap-2">
                <User className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
                <span className="gba:text-xs gba:font-medium gba:truncate gba:leading-tight" data-testid="task-creator-name">
                  {creatorName}
                </span>
              </div>
              {createdAt && (
                <div className="gba:flex gba:items-center gba:gap-1">
                  <Clock className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
                  <span className="gba:text-xs gba:text-muted-foreground gba:leading-tight" data-testid="task-created-at">
                    {formatDateTime(createdAt)}
                  </span>
                </div>
              )}
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
              <span className="gba:text-base gba:font-semibold gba:truncate gba:px-2" data-testid="task-title">
                {taskTitle}
              </span>
              <Badge variant="outline" data-testid="task-source-badge" className="gba:flex-shrink-0">
                {getSourceBadgeText(task.source)}
              </Badge>
            </div>
          </div>

          {/* Right side: Description and due date */}
          <div className="gba:flex gba:flex-col gba:gap-1 gba:items-end gba:flex-shrink-0">
            {(task.description || task.message) && (
              <p
                className="gba:text-xs gba:text-muted-foreground gba:line-clamp-1 gba:max-w-xs gba:text-right"
                data-testid="task-description"
              >
                {task.description || task.message}
              </p>
            )}
            {task.dueDate && (
              <div className="gba:flex gba:items-center gba:gap-1">
                {overdue || dueSoon ? (
                  <AlertTriangle className="gba:h-3 gba:w-3" />
                ) : (
                  <Clock className="gba:h-3 gba:w-3" />
                )}
                <span
                  className={`gba:text-xs ${
                    overdue
                      ? 'gba:text-destructive gba:font-semibold'
                      : dueSoon
                      ? 'gba:text-warning gba:font-semibold'
                      : 'gba:text-muted-foreground'
                  }`}
                  data-testid="task-due-date"
                >
                  {overdue ? 'Overdue' : dueSoon ? 'Due soon' : `Due ${formatRelativeTime(task.dueDate)}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

