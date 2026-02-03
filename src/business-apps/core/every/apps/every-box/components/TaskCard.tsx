/**
 * TaskCard Component
 * Individual task card with priority badges and quick actions
 */

import React, { memo, useMemo } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
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
import { EmployeeAvatarData } from '../hooks/useEmployeeAvatarsBatch'
import { base64ToObjectURL } from '../utils/avatarUtils'

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

// Helper to get creator name with fallback logic
const getCreatorDisplayName = (
  task: UnifiedTask,
  employeeData: EmployeeAvatarData | null | undefined,
  areAvatarsLoading: boolean,
  t: (key: string) => string
): string => {
  if (areAvatarsLoading) return ''

  // Priority 1: displayName from employee data (most reliable and consistent)
  if (employeeData?.displayName) return employeeData.displayName

  // Priority 2: creatorName from task metadata (might be cached/older)
  if (task.sourceMetadata?.creatorName) return task.sourceMetadata.creatorName
  if (task.sourceMetadata?.ownerName) return task.sourceMetadata.ownerName
  // Backwards-compatible fallbacks for CFlow initiator fields
  if ((task.sourceMetadata as any)?.flowInitiatedByName) return (task.sourceMetadata as any).flowInitiatedByName
  if (
    (task.sourceMetadata as any)?.flowInitiatedBy &&
    typeof (task.sourceMetadata as any).flowInitiatedBy === 'string'
  ) {
    return (task.sourceMetadata as any).flowInitiatedBy
  }

  // Priority 3: Construct from firstName + lastName (fallback)
  if (employeeData) {
    const firstName = employeeData.firstName || ''
    const lastName = employeeData.lastName || ''
    const fullName = `${firstName} ${lastName}`.trim()
    if (fullName) return fullName
  }

  // Final fallback
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
// Helper to get initials from name
const getInitials = (employeeData: EmployeeAvatarData | null | undefined, name: string): string => {
  if (employeeData) {
    const first = employeeData.firstName?.[0] || ''
    const last = employeeData.lastName?.[0] || ''
    if (first || last) return `${first}${last}`.toUpperCase()
  }
  // Fallback: get initials from display name
  const parts = name.split(' ').filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

export const TaskCard: React.FC<TaskCardProps> = memo(
  ({ task, onView, employeeMap, isSelected = false, areAvatarsLoading = false, t, locale }) => {
    // Module and task metadata
    const taskTitle = getTaskTitle(task, t)

    // Creator data
    const creatorId = getCreatorId(task)
    const employeeData = creatorId ? employeeMap.get(creatorId) : null

    // Display data
    const creatorName = getCreatorDisplayName(task, employeeData, areAvatarsLoading, t)
    const createdAt = task.createdAt || task.scheduledAt || task.sourceMetadata?.createdAt

    // Avatar URL from base64
    const avatarUrl = useMemo(() => {
      if (employeeData?.pictureThumbnail) {
        return base64ToObjectURL(employeeData.pictureThumbnail)
      }
      return undefined
    }, [employeeData?.pictureThumbnail])

    const initials = getInitials(employeeData, creatorName)

    // Always use compact split view layout (since detail panel is always visible)
    return (
      <div
        className={`gba:relative gba:cursor-pointer gba:transition-all gba:duration-150 gba:pl-10 gba:pr-3 gba:py-2.5 gba:bg-card gba:rounded-lg gba:mb-2 gba:border-2 gba:overflow-hidden ${
          isSelected ? 'gba:border-foreground gba:shadow-sm' : 'gba:border-transparent gba:hover:bg-accent/50'
        }`}
        onClick={() => onView(task)}
        data-testid={`task-card-${task.id}`}
      >
        {/* Corner Avatar */}
        <div className="gba:absolute gba:left-2 gba:top-0 gba:bottom-0 gba:w-8 gba:flex gba:items-center gba:justify-center">
          <Avatar className="gba:h-6 gba:w-6">
            {avatarUrl && !areAvatarsLoading && <AvatarImage src={avatarUrl} alt={creatorName} />}
            <AvatarFallback className="gba:text-[10px] gba:font-medium">{initials}</AvatarFallback>
          </Avatar>
        </div>

        <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
          {/* Left: Name and Title */}
          <div className="gba:flex gba:flex-col gba:gap-0.5 gba:flex-1 gba:min-w-0">
            {/* Creator Name */}
            <span
              className="gba:text-sm gba:font-semibold gba:text-foreground gba:truncate gba:leading-tight"
              data-testid="task-creator-name"
            >
              {creatorName}
            </span>

            {/* Task Title - single line truncated */}
            <span
              className="gba:text-xs gba:text-muted-foreground gba:truncate gba:leading-tight"
              data-testid="task-title"
            >
              {taskTitle}
            </span>
          </div>

          {/* Right: Timestamp */}
          <span
            className="gba:text-xs gba:text-muted-foreground gba:whitespace-nowrap gba:flex-shrink-0"
            data-testid="task-created-at"
          >
            {task.status === 'COMPLETED' && task.completedAt
              ? formatDateTimeWithRelative(task.completedAt, locale, t)
              : createdAt && formatDateTimeWithRelative(createdAt, locale, t)}
          </span>
        </div>
      </div>
    )
  }
)
