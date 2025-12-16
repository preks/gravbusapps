/**
 * TaskCard Component
 * Individual task card with priority badges and quick actions
 */

import React, { memo, useEffect, useState } from 'react'
import { Badge, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { Clock, AlertTriangle, Zap } from 'lucide-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import isToday from 'dayjs/plugin/isToday'
import isYesterday from 'dayjs/plugin/isYesterday'
import 'dayjs/locale/de'
import 'dayjs/locale/en'
import 'dayjs/locale/ro'
import 'dayjs/locale/fr'
import 'dayjs/locale/es'
import 'dayjs/locale/it'
import { UnifiedTask } from '../types'
import { isOverdue, isDueSoon } from '../utils/taskFormatters'
import { EmployeeAvatarData } from '../hooks/useEmployeeAvatarsBatch'
import { getModuleInfo } from '../utils/moduleIcons'

dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)
dayjs.extend(isToday)
dayjs.extend(isYesterday)

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
  /** Translation function passed from parent to avoid useTranslation in each card */
  t: (key: string, params?: Record<string, any>) => string
  /** Locale string for date formatting (e.g., 'en-US', 'de-DE') */
  locale: string
}

// Helper function to get due date text
const getDueDateText = (
  overdue: boolean,
  dueSoon: boolean,
  dueDate: string | null | undefined,
  locale: string,
  t: (key: string, params?: Record<string, any>) => string
): string => {
  if (overdue) return t('task-card-overdue')
  if (dueSoon) return t('task-card-due-soon')
  const baseLocale = locale?.split('-')[0]?.toLowerCase() || 'en'
  return dueDate ? t('task-card-due', { date: dayjs(dueDate).locale(baseLocale).fromNow() }) : ''
}

// Helper function to get due date styling class
const getDueDateClass = (overdue: boolean, dueSoon: boolean): string => {
  if (overdue) return 'gba:text-destructive gba:font-semibold'
  if (dueSoon) return 'gba:text-warning gba:font-semibold'
  return 'gba:text-muted-foreground'
}

// Helper to get module name from process definition ID
const getModuleName = (processDefId?: string): string | null => {
  if (!processDefId) return null
  return processDefId
    .split(/[_-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Helper to get task title based on source
const getTaskTitle = (task: UnifiedTask, t: (key: string) => string): string => {
  if (task.source === 'kogito') {
    return task.referenceTaskName || task.sourceMetadata?.nodeName || task.name || t('task-card-untitled')
  }
  return task.title || task.name || t('task-card-untitled')
}

// Helper to get creator ID from task metadata
const getCreatorId = (task: UnifiedTask): string | undefined => {
  return (
    task.sourceMetadata?.creatorUserId ||
    task.sourceMetadata?.creatorEmployeeId ||
    task.sourceMetadata?.createdBy ||
    task.sourceMetadata?.initiatedBy
  )
}

// Helper to check if task is completed
const checkTaskCompleted = (task: UnifiedTask): boolean => {
  return task.status === 'COMPLETED' || !!task.completedAt
}

// Helper to check if task is a Blink task
const checkIsBlinkTask = (task: UnifiedTask): boolean => {
  return task.source === 'cflow' && task.tags?.app === 'quick-task'
}

// Helper to determine avatar display state
const getAvatarDisplayState = (
  avatarStatus: 'idle' | 'loading' | 'loaded' | 'error',
  employeeData: EmployeeAvatarData | null | undefined,
  areAvatarsLoading: boolean
): { showImage: boolean; showFallback: boolean } => {
  const showImage = avatarStatus === 'loaded' && !!employeeData?.avatarUrl
  const noAvatarAvailable = avatarStatus === 'idle' && !employeeData?.avatarUrl
  const showFallback = !areAvatarsLoading && (avatarStatus === 'error' || noAvatarAvailable)

  return { showImage, showFallback }
}

// Helper to get creator name with fallback logic
const getCreatorDisplayName = (
  task: UnifiedTask,
  employeeData: EmployeeAvatarData | null | undefined,
  areAvatarsLoading: boolean,
  t: (key: string) => string
): string => {
  if (task.sourceMetadata?.creatorName) return task.sourceMetadata.creatorName
  if (task.sourceMetadata?.ownerName) return task.sourceMetadata.ownerName
  if (areAvatarsLoading) return ''
  if (employeeData) {
    const firstName = employeeData.firstName || ''
    const lastName = employeeData.lastName || ''
    const fullName = `${firstName} ${lastName}`.trim()
    return fullName || t('task-card-unknown-creator')
  }
  return t('task-card-unknown-creator')
}

// Helper to format date/time with Today/Yesterday support
const formatDateTimeWithRelative = (date: string | Date, locale: string, t: (key: string) => string): string => {
  const d = dayjs(date)
  const baseLocale = locale?.split('-')[0]?.toLowerCase() || 'en'
  const time = d.locale(baseLocale).format('LT')

  if (d.isToday()) {
    return `${t('formatter-today')}, ${time}`
  }
  if (d.isYesterday()) {
    return `${t('formatter-yesterday')}, ${time}`
  }

  return d.locale(baseLocale).format('L LT')
}

// Helper to generate user initials
const generateInitials = (name: string): string => {
  const trimmed = name.trim()

  // Return placeholder for empty or whitespace-only names
  if (!trimmed) {
    return '??'
  }

  const parts = trimmed.split(/\s+/).filter(part => part.length > 0)

  // Handle multiple parts (first and last name)
  if (parts.length >= 2) {
    const firstInitial = parts[0][0] || ''
    const lastInitial = parts[parts.length - 1][0] || ''
    return `${firstInitial}${lastInitial}`.toUpperCase()
  }

  // Handle single part - take up to 2 characters, pad with second char if only 1
  const singlePart = parts[0] || ''
  if (singlePart.length === 1) {
    return (singlePart + singlePart).toUpperCase()
  }
  return singlePart.substring(0, 2).toUpperCase()
}

export const TaskCard: React.FC<TaskCardProps> = memo(
  ({
    task,
    onView,
    employeeMap,
    isSelected = false,
    isDetailViewOpen = false,
    areAvatarsLoading = false,
    t,
    locale
  }) => {
    // Task status checks
    const isCompleted = checkTaskCompleted(task)
    const overdue = !isCompleted && isOverdue(task.dueDate)
    const dueSoon = !isCompleted && isDueSoon(task.dueDate)
    const isBlinkTask = checkIsBlinkTask(task)

    // Module and task metadata
    const moduleName = task.source === 'kogito' ? getModuleName(task.type) : null
    const moduleInfo = getModuleInfo(task.name, task.type)
    const ModuleIcon = moduleInfo.icon
    const taskTitle = getTaskTitle(task, t)

    // Creator data
    const creatorId = getCreatorId(task)
    const employeeData = creatorId ? employeeMap.get(creatorId) : null

    // Avatar loading state
    const [avatarStatus, setAvatarStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')

    useEffect(() => {
      if (typeof window === 'undefined') return

      const avatarUrl = employeeData?.avatarUrl

      if (!avatarUrl) {
        setAvatarStatus('error')
        return
      }

      setAvatarStatus('loading')

      const img = new Image()
      img.src = avatarUrl

      const handleLoad = () => setAvatarStatus('loaded')
      const handleError = () => setAvatarStatus('error')

      img.addEventListener('load', handleLoad)
      img.addEventListener('error', handleError)

      return () => {
        img.removeEventListener('load', handleLoad)
        img.removeEventListener('error', handleError)
      }
    }, [employeeData?.avatarUrl])

    // Display data
    const creatorName = getCreatorDisplayName(task, employeeData, areAvatarsLoading, t)
    const createdAt = task.createdAt || task.scheduledAt || task.sourceMetadata?.createdAt
    const avatarDisplay = getAvatarDisplayState(avatarStatus, employeeData, areAvatarsLoading)
    const showAvatarImage = avatarDisplay.showImage
    const showAvatarFallback = avatarDisplay.showFallback

    // Full list view (no task selected) - single row layout with fixed columns
    if (!isDetailViewOpen) {
      return (
        <div
          className="gba:cursor-pointer gba:transition-all gba:duration-200 gba:rounded-md gba:px-4 gba:py-2.5 gba:hover:bg-muted/50"
          onClick={() => onView(task)}
          data-testid={`task-card-${task.id}`}
        >
          <div className="gba:flex gba:items-center gba:gap-4">
            {/* 1. Date - fixed 140px */}
            <span
              className="gba:text-xs gba:text-muted-foreground gba:w-[140px] gba:flex-shrink-0"
              data-testid="task-created-at"
            >
              {task.status === 'COMPLETED' && task.completedAt ? (
                <span className="gba:text-success">✓ {formatDateTimeWithRelative(task.completedAt, locale, t)}</span>
              ) : (
                createdAt && formatDateTimeWithRelative(createdAt, locale, t)
              )}
            </span>

            {/* 2. Avatar */}
            <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0" data-testid="task-creator-avatar">
              {showAvatarImage && <AvatarImage src={employeeData?.avatarUrl} alt={creatorName} />}
              {showAvatarFallback && (
                <AvatarFallback className="gba:text-xs gba:font-medium gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:text-white">
                  {generateInitials(creatorName)}
                </AvatarFallback>
              )}
            </Avatar>

            {/* 3. Creator name */}
            <span
              className="gba:text-sm gba:font-medium gba:truncate gba:text-foreground gba:w-[160px] gba:flex-shrink-0"
              data-testid="task-creator-name"
            >
              {creatorName}
            </span>

            {/* 4. Module Icon */}
            <span title={moduleInfo.name} className="gba:w-5 gba:flex-shrink-0">
              <ModuleIcon className={`gba:h-5 gba:w-5 ${moduleInfo.color}`} />
            </span>

            {/* 5. Task title + Blink indicator */}
            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
              <span className="gba:text-base gba:font-medium gba:truncate gba:text-foreground" data-testid="task-title">
                {taskTitle}
              </span>
              {isBlinkTask && (
                <div
                  className="gba:flex gba:items-center gba:gap-0.5 gba:flex-shrink-0"
                  data-testid="task-blink-indicator"
                >
                  <Zap className="gba:h-4 gba:w-4 gba:text-blue-500" strokeWidth={2.5} />
                  <span className="gba:text-sm gba:font-medium gba:text-blue-500">{t('task-card-blink')}</span>
                </div>
              )}
            </div>

            {/* 6. Right side: Module badge + Due date */}
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-shrink-0">
              {moduleName && (
                <Badge variant="secondary" data-testid="task-module-badge">
                  {moduleName}
                </Badge>
              )}
              {!isCompleted && task.dueDate && (
                <div className="gba:flex gba:items-center gba:gap-1">
                  {overdue || dueSoon ? (
                    <AlertTriangle className="gba:h-4 gba:w-4" />
                  ) : (
                    <Clock className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                  )}
                  <span className={`gba:text-sm ${getDueDateClass(overdue, dueSoon)}`} data-testid="task-due-date">
                    {getDueDateText(overdue, dueSoon, task.dueDate, locale, t)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }

    // Split view (task selected) - Date | Avatar | Name | Icon | Task
    return (
      <div
        className={`gba:cursor-pointer gba:transition-all gba:duration-200 gba:rounded-md gba:px-3 gba:py-2.5 ${
          isSelected
            ? 'gba:bg-primary/10 gba:border-l-2 gba:border-l-primary'
            : 'gba:hover:bg-muted/50 gba:border-l-2 gba:border-l-transparent'
        }`}
        onClick={() => onView(task)}
        data-testid={`task-card-${task.id}`}
      >
        <div className="gba:flex gba:items-center gba:gap-2">
          {/* 1. Date (compact) */}
          <span
            className="gba:text-[11px] gba:text-muted-foreground gba:w-[85px] gba:flex-shrink-0"
            data-testid="task-created-at"
          >
            {task.status === 'COMPLETED' && task.completedAt ? (
              <span className="gba:text-success">✓ {formatDateTimeWithRelative(task.completedAt, locale, t)}</span>
            ) : (
              createdAt && formatDateTimeWithRelative(createdAt, locale, t)
            )}
          </span>

          {/* 2. Avatar */}
          <Avatar className="gba:h-6 gba:w-6 gba:flex-shrink-0" data-testid="task-creator-avatar">
            {showAvatarImage && <AvatarImage src={employeeData?.avatarUrl} alt={creatorName} />}
            {showAvatarFallback && (
              <AvatarFallback className="gba:text-[9px] gba:font-medium gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:text-white">
                {generateInitials(creatorName)}
              </AvatarFallback>
            )}
          </Avatar>

          {/* 3. Creator name - 2 lines allowed */}
          <span
            className="gba:text-xs gba:font-medium gba:text-foreground gba:w-[140px] gba:flex-shrink-0 gba:line-clamp-2 gba:leading-tight"
            data-testid="task-creator-name"
          >
            {creatorName}
          </span>

          {/* 4. Module Icon */}
          <span title={moduleInfo.name} className="gba:flex-shrink-0">
            <ModuleIcon className={`gba:h-4 gba:w-4 ${moduleInfo.color}`} />
          </span>

          {/* 5. Task title + Blink */}
          <div className="gba:flex gba:items-center gba:gap-1 gba:flex-1 gba:min-w-0">
            <span className="gba:text-sm gba:font-medium gba:truncate gba:text-foreground" data-testid="task-title">
              {taskTitle}
            </span>
            {isBlinkTask && (
              <Zap className="gba:h-3.5 gba:w-3.5 gba:text-blue-500 gba:flex-shrink-0" strokeWidth={2.5} />
            )}
          </div>
        </div>
      </div>
    )
  }
)
