/**
 * TaskCard Component
 * Individual task card with priority badges and quick actions
 */

import React, { memo, useEffect, useState } from 'react'
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
  /**
   * Indicates whether avatar data is still being loaded in the parent hook.
   * When true, we hide the fallback initials to avoid flicker before avatar URLs arrive.
   */
  areAvatarsLoading?: boolean
}

// Helper function to get due date text
const getDueDateText = (overdue: boolean, dueSoon: boolean, dueDate?: string | null): string => {
  if (overdue) return 'Overdue'
  if (dueSoon) return 'Due soon'
  return `Due ${formatRelativeTime(dueDate)}`
}

// Helper function to get due date styling class
const getDueDateClass = (overdue: boolean, dueSoon: boolean): string => {
  if (overdue) return 'gba:text-destructive gba:font-semibold'
  if (dueSoon) return 'gba:text-warning gba:font-semibold'
  return 'gba:text-muted-foreground'
}

export const TaskCard: React.FC<TaskCardProps> = memo(
  ({ task, onView, employeeMap, isSelected = false, isDetailViewOpen = false, areAvatarsLoading = false }) => {
    // Check if task is completed
    const isCompleted = task.status === 'COMPLETED' || !!task.completedAt

    // Only show overdue/due soon for non-completed tasks
    const overdue = !isCompleted && isOverdue(task.dueDate)
    const dueSoon = !isCompleted && isDueSoon(task.dueDate)

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

    // Avatar loading state to prevent initials flicker
    const [avatarStatus, setAvatarStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')

    useEffect(() => {
      // SSR/Node safety
      if (typeof window === 'undefined') return

      const avatarUrl = employeeData?.avatarUrl

      // No avatar URL – immediately fall back to initials
      if (!avatarUrl) {
        setAvatarStatus('error')
        return
      }

      setAvatarStatus('loading')

      const img = new Image()
      img.src = avatarUrl

      const handleLoad = () => {
        setAvatarStatus('loaded')
      }

      const handleError = () => {
        setAvatarStatus('error')
      }

      img.addEventListener('load', handleLoad)
      img.addEventListener('error', handleError)

      return () => {
        img.removeEventListener('load', handleLoad)
        img.removeEventListener('error', handleError)
      }
    }, [employeeData?.avatarUrl])

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

    // Show avatar image only when fully loaded
    const showAvatarImage = avatarStatus === 'loaded' && !!employeeData?.avatarUrl

    // Show fallback (initials) only when:
    // 1. Avatars batch fetch is complete (!areAvatarsLoading)
    // 2. AND one of:
    //    a) avatarStatus is 'error' (no avatar URL or image failed to load)
    //    b) avatarStatus is 'idle' AND there's no avatarUrl (employee not found or has no picture)
    //
    // Do NOT show fallback when:
    // - Still fetching employee data (areAvatarsLoading)
    // - Image is being preloaded (avatarStatus === 'loading')
    // - avatarStatus is 'idle' but avatarUrl exists (about to start preloading)
    // - Image has loaded successfully (avatarStatus === 'loaded')
    const noAvatarAvailable = avatarStatus === 'idle' && !employeeData?.avatarUrl
    const showAvatarFallback = !areAvatarsLoading && (avatarStatus === 'error' || noAvatarAvailable)

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
                {/* 
                  Avatar rendering rules:
                  - While loading: show nothing (empty avatar to avoid initials flicker)
                  - On successful load: show AvatarImage
                  - On error or missing URL: show initials in AvatarFallback
                */}
                {showAvatarImage && <AvatarImage src={employeeData?.avatarUrl} alt={creatorName} />}
                {showAvatarFallback && (
                  <AvatarFallback className="gba:text-xs gba:font-medium gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:text-white">
                    {getInitials(creatorName)}
                  </AvatarFallback>
                )}
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
                {task.status === 'COMPLETED' && task.completedAt && (
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <Clock className="gba:h-3 gba:w-3 gba:text-success" />
                    <span
                      className="gba:text-xs gba:text-success gba:leading-tight gba:whitespace-nowrap gba:font-medium"
                      data-testid="task-completed-at"
                    >
                      ✓ {formatDateTime(task.completedAt)}
                    </span>
                  </div>
                )}
                {!(task.status === 'COMPLETED' && task.completedAt) && createdAt && (
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <Clock className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
                    <span
                      className="gba:text-xs gba:text-muted-foreground gba:leading-tight gba:whitespace-nowrap"
                      data-testid="task-created-at"
                    >
                      {formatDateTime(createdAt)}
                    </span>
                  </div>
                )}
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
            {/* Don't show due date for completed tasks */}
            {!isSelected && !isCompleted && (
              <div className="gba:flex gba:flex-col gba:gap-1 gba:items-end gba:flex-shrink-0">
                {task.dueDate && (
                  <div className="gba:flex gba:items-center gba:gap-1">
                    {overdue || dueSoon ? (
                      <AlertTriangle className="gba:h-3 gba:w-3" />
                    ) : (
                      <Clock className="gba:h-3 gba:w-3" />
                    )}
                    <span className={`gba:text-xs ${getDueDateClass(overdue, dueSoon)}`} data-testid="task-due-date">
                      {getDueDateText(overdue, dueSoon, task.dueDate)}
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
