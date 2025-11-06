/**
 * TaskCard Component
 * Individual task card with priority badges and quick actions
 */

import React, { memo } from 'react'
import { Card, CardContent, Badge, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { Clock, AlertTriangle, User, Zap } from 'lucide-react'
import { UnifiedTask } from '../types'
import { formatRelativeTime, formatDateTime, isOverdue, isDueSoon } from '../utils/taskFormatters'
import { EmployeeAvatarData } from '../hooks/useEmployeeAvatarsBatch'
import { getModuleInfo } from '../utils/moduleIcons'

interface TaskCardProps {
  task: UnifiedTask
  onView: (task: UnifiedTask) => void
  employeeMap: Map<string, EmployeeAvatarData>
  isSelected?: boolean
  isDetailViewOpen?: boolean
}

export const TaskCard: React.FC<TaskCardProps> = memo(
  ({ task, onView, employeeMap, isSelected = false, isDetailViewOpen = false }) => {
    const overdue = isOverdue(task.dueDate)
    const dueSoon = isDueSoon(task.dueDate)

    const getSourceBadgeText = (source: UnifiedTask['source']): string => {
      switch (source) {
        case 'cflow':
          return 'CFlow'
        case 'kogito':
          return 'Kogito'
        default:
          return 'Task'
      }
    }

    // Check if this is a Blink task (quick direct task from one person to another)
    const isBlinkTask = task.source === 'cflow' && task.tags?.app === 'quick-task'

    // Format process/module name from processDefinitionId for Kogito tasks
    const getModuleName = (processDefId?: string): string | null => {
      if (!processDefId) return null
      // Convert snake_case or kebab-case to Title Case
      return processDefId
        .split(/[_-]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
    }

    const moduleName = task.source === 'kogito' ? getModuleName(task.type) : null
    const moduleInfo = getModuleInfo(task.name, task.type)
    const ModuleIcon = moduleInfo.icon

    // Get task name/title
    // For Kogito tasks, prefer referenceName (most descriptive with context)
    // Then fallback to nodeName, title, or name
    // For CFlow tasks, use title or name
    const taskTitle =
      task.source === 'kogito'
        ? task.referenceTaskName || task.sourceMetadata?.nodeName || task.name || 'Untitled Task'
        : task.title || task.name || 'Untitled Task'

    // Extract creator ID - both sources now use user ID:
    // - Kogito: creatorUserId (user ID)
    // - CFlow: creatorUserId (user ID from flowInitiatedBy)
    const creatorId =
      task.sourceMetadata?.creatorUserId || // Both Kogito & CFlow (userId)
      task.sourceMetadata?.creatorEmployeeId || // Legacy fallback (employeeId)
      task.sourceMetadata?.createdBy ||
      task.sourceMetadata?.initiatedBy

    // Get employee data from the batch-fetched map
    // The map contains both userId and employeeId as keys, so this works for both
    const employeeData = creatorId ? employeeMap.get(creatorId) : null

    // Get creator name - prefer fetched data, fallback to metadata
    const creatorName = employeeData
      ? `${employeeData.firstName} ${employeeData.lastName}`.trim()
      : task.sourceMetadata?.creatorName || task.sourceMetadata?.ownerName || 'Unknown'

    const createdAt = task.createdAt || task.scheduledAt || task.sourceMetadata?.createdAt

    // Generate initials from creator name
    const getInitials = (name: string): string => {
      if (employeeData) {
        return `${employeeData.firstName?.[0] || ''}${employeeData.lastName?.[0] || ''}`.toUpperCase()
      }
      const parts = name.trim().split(/\s+/)
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }

    return (
      <Card
        className={`gba:cursor-pointer gba:hover:shadow-md gba:transition-all gba:duration-300 nw:py-0 ${
          isSelected
            ? 'gba:border-primary gba:border-2 gba:shadow-lg gba:bg-primary/5'
            : 'gba:border gba:hover:border-primary/50'
        }`}
        onClick={() => onView(task)}
        data-testid={`task-card-${task.id}`}
      >
        <CardContent className="gba:px-4 gba:py-0">
          <div className="gba:flex gba:items-center gba:gap-4">
            {/* Left side: Avatar, creator info, task title, source badge */}
            <div
              className="gba:flex gba:items-center gba:gap-3 gba:flex-1 gba:min-w-0"
              data-testid="task-creator-section"
            >
              <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0" data-testid="task-creator-avatar">
                <AvatarImage
                  src={employeeData?.avatarUrl} // Use cached Object URL for browser-level caching
                  alt={creatorName}
                  onLoad={() => {}}
                  onError={() => {}}
                />
                <AvatarFallback className="gba:text-xs gba:font-medium gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:text-white">
                  {getInitials(creatorName)}
                </AvatarFallback>
              </Avatar>
              <div className="gba:flex gba:flex-col gba:w-48 gba:flex-shrink-0 gba:leading-none gba:gap-0.5">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <User className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
                  <span
                    className="gba:text-xs gba:font-medium gba:truncate gba:leading-tight"
                    data-testid="task-creator-name"
                  >
                    {creatorName}
                  </span>
                </div>
                {task.status === 'COMPLETED' && task.completedAt ? (
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <Clock className="gba:h-3 gba:w-3 gba:text-success" />
                    <span
                      className="gba:text-xs gba:text-success gba:leading-tight gba:whitespace-nowrap gba:font-medium"
                      data-testid="task-completed-at"
                    >
                      ✓ {formatDateTime(task.completedAt)}
                    </span>
                  </div>
                ) : createdAt ? (
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <Clock className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
                    <span
                      className="gba:text-xs gba:text-muted-foreground gba:leading-tight gba:whitespace-nowrap"
                      data-testid="task-created-at"
                    >
                      {formatDateTime(createdAt)}
                    </span>
                  </div>
                ) : null}
              </div>
              {/* Module Icon - Vertically centered with title and description */}
              <span title={moduleInfo.name} className="gba:flex-shrink-0 gba:self-center">
                <ModuleIcon className={`gba:h-5 gba:w-5 ${moduleInfo.color}`} />
              </span>
              <div className="gba:flex gba:flex-col gba:gap-0.5 gba:flex-1 gba:min-w-0">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span className="gba:text-base gba:font-semibold gba:truncate" data-testid="task-title">
                    {taskTitle}
                  </span>
                  {!isDetailViewOpen && (
                    <>
                      <Badge variant="outline" data-testid="task-source-badge" className="gba:flex-shrink-0">
                        {getSourceBadgeText(task.source)}
                      </Badge>
                      {moduleName && (
                        <Badge variant="secondary" data-testid="task-module-badge" className="gba:flex-shrink-0">
                          {moduleName}
                        </Badge>
                      )}
                      {isBlinkTask && (
                        <div
                          className="gba:flex gba:items-center gba:gap-1 gba:flex-shrink-0"
                          data-testid="task-blink-indicator"
                        >
                          <Zap className="gba:h-4 gba:w-4 gba:text-blue-500" strokeWidth={2.5} />
                          <span className="gba:text-sm gba:font-medium gba:text-blue-500">Blink</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {!isSelected && (task.description || task.message) && (
                  <p
                    className="gba:text-xs gba:text-muted-foreground gba:line-clamp-1 gba:px-2"
                    data-testid="task-description"
                  >
                    {task.description || task.message}
                  </p>
                )}
              </div>
            </div>

            {/* Right side: Due date only - Hidden when selected except for Blink icon */}
            {!isSelected && (
              <div className="gba:flex gba:flex-col gba:gap-1 gba:items-end gba:flex-shrink-0">
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
            )}

            {/* Show only Blink icon when selected */}
            {isSelected && isBlinkTask && (
              <div className="gba:flex-shrink-0 gba:ml-2">
                <Zap className="gba:h-4 gba:w-4 gba:text-blue-500" strokeWidth={2.5} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
)
