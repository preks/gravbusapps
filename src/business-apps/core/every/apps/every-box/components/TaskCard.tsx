/**
 * TaskCard Component
 * Individual task card with priority badges and quick actions
 */

import React, { memo, useMemo } from 'react'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from '@newwork/nw-design-system'
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
import { Pin } from 'lucide-react'
import { UnifiedTask } from '../types'
import { EmployeeAvatarData } from '../hooks/useEmployeeAvatarsBatch'
import { base64ToDataURL } from '../utils/avatarUtils'
import { resolveAbsenceCancellationTitleInfo } from '@/business-apps/hr/absences/utils/absenceCancellationTitle'

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

const TYPE_REF_KEYS = new Set(['typeref', 'absencetyperef', 'absencetype', 'type_ref'])
const TYPE_NAME_KEYS = new Set([
  'typename',
  'absencetypename',
  'absencename',
  'absencetypevalue',
  'absencetypelabel',
  'type_name'
])

const looksLikeTypeRefValue = (value: string): boolean => {
  return /^A\d{3}$/i.test(value.trim())
}

const deepFindString = (
  value: unknown,
  matcher: (key: string, value: string) => boolean,
  visited: Set<unknown> = new Set()
): string => {
  if (!value || typeof value !== 'object') return ''
  if (visited.has(value)) return ''
  visited.add(value)

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = deepFindString(item, matcher, visited)
      if (found) return found
    }
    return ''
  }

  const record = value as Record<string, unknown>
  for (const [key, raw] of Object.entries(record)) {
    const normalizedKey = key.toLowerCase()
    if (typeof raw === 'string' && raw && matcher(normalizedKey, raw)) {
      return raw
    }
    if (raw && typeof raw === 'object') {
      const nested = deepFindString(raw, matcher, visited)
      if (nested) return nested
    }
  }
  return ''
}

const deepFindAbsenceTypeValue = (value: unknown, visited: Set<unknown> = new Set()): string => {
  if (!value || typeof value !== 'object') return ''
  if (visited.has(value)) return ''
  visited.add(value)

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = deepFindAbsenceTypeValue(item, visited)
      if (found) return found
    }
    return ''
  }

  const record = value as Record<string, unknown>
  const rawTypeRef = record.typeRef
  const typeRef = typeof rawTypeRef === 'string' ? rawTypeRef.trim() : ''
  const type = record.type
  const typeRecord = type && typeof type === 'object' ? (type as Record<string, unknown>) : null
  const typeValue = typeRecord && typeof typeRecord.value === 'string' ? typeRecord.value.trim() : ''
  if (typeRef && typeValue) {
    return typeValue
  }

  for (const nestedValue of Object.values(record)) {
    if (nestedValue && typeof nestedValue === 'object') {
      const nested = deepFindAbsenceTypeValue(nestedValue, visited)
      if (nested) return nested
    }
  }

  return ''
}

const collectPayloadCandidates = (task: UnifiedTask): unknown[] => {
  const meta = (task.sourceMetadata || {}) as Record<string, unknown>
  return [
    task.inputs,
    meta.inputs,
    meta.variables,
    meta.processVariables,
    meta.taskPayload,
    meta.payload,
    meta.data,
    meta.context,
    meta
  ]
}

const extractCancellationTypeRef = (task: UnifiedTask): string => {
  for (const candidate of collectPayloadCandidates(task)) {
    const found = deepFindString(candidate, (key, val) => {
      if (TYPE_REF_KEYS.has(key)) return true
      return key.endsWith('typeref') && looksLikeTypeRefValue(val)
    })
    if (found) return found
  }
  return ''
}

const extractCancellationTypeName = (task: UnifiedTask): string => {
  for (const candidate of collectPayloadCandidates(task)) {
    const absenceTypeValue = deepFindAbsenceTypeValue(candidate)
    if (absenceTypeValue) return absenceTypeValue

    const found = deepFindString(candidate, key => TYPE_NAME_KEYS.has(key))
    if (found) return found
  }
  return ''
}

const resolveCancellationTaskTitle = (
  task: UnifiedTask,
  t: (key: string, params?: Record<string, any>) => string
): string | null => {
  const identityText =
    `${task.title || ''} ${task.name || ''} ${task.referenceTaskName || ''} ${task.sourceMetadata?.endpoint || ''}`.toLowerCase()
  if (!identityText.includes('cancel')) {
    return null
  }

  const typeRef = extractCancellationTypeRef(task)
  const typeName = extractCancellationTypeName(task)
  const titleInfo = resolveAbsenceCancellationTitleInfo(typeRef, typeName)
  if (!titleInfo) {
    const rawTitle = `${task.title || ''}`.toLowerCase()
    if (rawTitle.includes('vacation') || rawTitle.includes('special leave') || rawTitle.includes('sick')) {
      return t('task-card-cancel-absence-request')
    }
    return null
  }

  if (titleInfo.variant === 'vacation') {
    return t('task-card-cancel-vacation-request')
  }
  if (titleInfo.variant === 'sickLeave') {
    return t('task-card-cancel-sick-leave-request')
  }
  if (titleInfo.variant === 'specialLeave') {
    return t('task-card-cancel-special-leave-request')
  }
  if (titleInfo.variant === 'requestForType' && titleInfo.absenceTypeName) {
    return t('task-card-cancel-request-for-type', { absenceType: titleInfo.absenceTypeName })
  }

  return null
}

const normalizeCancellationTitleText = (title: string): string => {
  return title.replace(/^Cancel Absence Request for\s+/i, 'Cancel Request for ')
}

// Helper to get task title based on source
const getTaskTitle = (task: UnifiedTask, t: (key: string, params?: Record<string, any>) => string): string => {
  const resolvedCancellationTitle = resolveCancellationTaskTitle(task, t)
  if (resolvedCancellationTitle) {
    return resolvedCancellationTitle
  }

  if (task.source === 'kogito') {
    const title = task.referenceTaskName || task.sourceMetadata?.nodeName || task.name || t('task-card-untitled')
    return normalizeCancellationTitleText(title)
  }
  const title = task.title || task.name || t('task-card-untitled')
  return normalizeCancellationTitleText(title)
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
    const isUnread = !task.userState?.isRead
    const isPinned = Boolean(task.userState?.isPinned)
    const userPriority = task.userState?.userPriority ?? null

    const priorityIndicator = useMemo(() => {
      if (userPriority === null) return null
      if (userPriority === 0) {
        return {
          label: t('task-meta-priority-high'),
          badgeClass: 'gba:bg-red-500/10 gba:text-red-700 gba:border gba:border-red-500/20 gba:dark:text-red-200'
        }
      }
      if (userPriority === 10) {
        return {
          label: t('task-meta-priority-medium'),
          badgeClass:
            'gba:bg-amber-500/10 gba:text-amber-800 gba:border gba:border-amber-500/20 gba:dark:text-amber-200'
        }
      }
      if (userPriority === 20) {
        return {
          label: t('task-meta-priority-low'),
          badgeClass:
            'gba:bg-emerald-500/10 gba:text-emerald-800 gba:border gba:border-emerald-500/20 gba:dark:text-emerald-200'
        }
      }
      return {
        label: `P${userPriority}`,
        badgeClass: 'gba:bg-muted gba:text-muted-foreground gba:border gba:border-muted-foreground/15'
      }
    }, [t, userPriority])

    // Avatar URL from base64
    const avatarUrl = useMemo(() => {
      if (employeeData?.pictureThumbnail) {
        return base64ToDataURL(employeeData.pictureThumbnail)
      }
      return undefined
    }, [employeeData?.pictureThumbnail])

    const initials = getInitials(employeeData, creatorName)

    const containerClassName = useMemo(() => {
      const base =
        'gba:relative gba:cursor-pointer gba:transition-all gba:duration-150 gba:pl-[2.75rem] gba:pr-3 gba:py-2.5 gba:rounded-lg gba:mb-2 gba:border-2 gba:overflow-hidden'

      if (isSelected) {
        return `${base} gba:bg-card gba:border-foreground gba:shadow-sm`
      }

      // Unread tasks: subtle premium highlight (background + soft border),
      // without being loud or breaking dark/light themes.
      if (isUnread) {
        return `${base} gba:bg-primary/5 gba:border-primary/10 gba:hover:bg-primary/7`
      }

      return `${base} gba:bg-card gba:border-transparent gba:hover:bg-accent/50`
    }, [isSelected, isUnread])

    const dueInline = useMemo(() => {
      const dm = task.dueMeta
      if (!dm) return null

      const isOverdue = dm.status === 'overdue'
      const days = isOverdue ? dm.daysOverdue : dm.daysRemaining
      const hours = isOverdue ? dm.hoursOverdue : dm.hoursRemaining

      if (days) {
        return {
          token: `${days}d`,
          tooltip: isOverdue
            ? t('task-card-tooltip-overdue-days', { days })
            : t('task-card-tooltip-due-days', { days }),
          className: isOverdue
            ? 'gba:text-rose-700/80 gba:dark:text-rose-200/80 gba:hover:text-rose-700/95 gba:dark:hover:text-rose-200/95'
            : 'gba:text-amber-700/75 gba:dark:text-amber-200/75 gba:hover:text-amber-700/90 gba:dark:hover:text-amber-200/90'
        }
      }

      if (hours) {
        return {
          token: `${hours}h`,
          tooltip: isOverdue
            ? t('task-card-tooltip-overdue-hours', { hours })
            : t('task-card-tooltip-due-hours', { hours }),
          className: isOverdue
            ? 'gba:text-rose-700/80 gba:dark:text-rose-200/80 gba:hover:text-rose-700/95 gba:dark:hover:text-rose-200/95'
            : 'gba:text-amber-700/75 gba:dark:text-amber-200/75 gba:hover:text-amber-700/90 gba:dark:hover:text-amber-200/90'
        }
      }

      return null
    }, [task.dueMeta, t])

    // Always use compact split view layout (since detail panel is always visible)
    return (
      <div className={containerClassName} onClick={() => onView(task)} data-testid={`task-card-${task.id}`}>
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
              className={`gba:text-sm gba:truncate gba:leading-tight ${
                isUnread ? 'gba:font-semibold gba:text-foreground' : 'gba:font-normal gba:text-muted-foreground'
              }`}
              data-testid="task-creator-name"
            >
              {isUnread && <span className="gba:inline-block gba:mr-1 gba:text-primary">•</span>}
              {creatorName}
            </span>

            {/* Task Title - single line truncated */}
            <span
              className={`gba:text-xs gba:truncate gba:leading-tight ${
                isUnread ? 'gba:text-muted-foreground' : 'gba:text-muted-foreground/70'
              }`}
              data-testid="task-title"
            >
              {taskTitle}
            </span>
          </div>

          {/* Right: Pinned + Priority + Timestamp */}
          <div className="gba:flex gba:flex-col gba:items-end gba:gap-1 gba:flex-shrink-0">
            {(isPinned || priorityIndicator || dueInline) && (
              <div className="gba:flex gba:items-center gba:justify-end gba:gap-1 gba:flex-wrap">
                {isPinned && (
                  <Badge
                    variant="secondary"
                    className="gba:h-5 gba:px-2 gba:text-xs gba:gap-1 gba:bg-sky-50 gba:text-sky-700 gba:border gba:border-sky-200/70"
                  >
                    <Pin className="gba:h-3 gba:w-3" />
                    <span>{t('task-card-pinned')}</span>
                  </Badge>
                )}

                {priorityIndicator && (
                  <Badge
                    variant="secondary"
                    className={`gba:h-5 gba:px-2 gba:text-xs gba:gap-1 ${priorityIndicator.badgeClass}`}
                    aria-label={`${t('task-meta-priority')}: ${priorityIndicator.label}`}
                  >
                    <span>{priorityIndicator.label}</span>
                  </Badge>
                )}

                {dueInline && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className={`gba:text-[11px] gba:font-medium gba:tabular-nums gba:leading-none gba:px-0.5 gba:cursor-default ${dueInline.className}`}
                        aria-label={dueInline.tooltip}
                      >
                        {dueInline.token}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{dueInline.tooltip}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
            <span className="gba:text-xs gba:text-muted-foreground gba:whitespace-nowrap" data-testid="task-created-at">
              {task.status === 'COMPLETED' && task.completedAt
                ? formatDateTimeWithRelative(task.completedAt, locale, t)
                : createdAt && formatDateTimeWithRelative(createdAt, locale, t)}
            </span>
          </div>
        </div>
      </div>
    )
  }
)
