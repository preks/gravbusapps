/**
 * FlowCard Component
 * Individual flow card with status and progress indicators
 */

import React, { memo, useMemo, useState, useEffect } from 'react'
import { Card, CardContent, Badge, Progress, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { Calendar, Users, Zap, ArrowRight, FileText, DollarSign } from 'lucide-react'
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
import { Flow } from '../types'
import { getFlowStatusBadgeVariant, formatFlowStatus } from '../utils/taskFormatters'
import { useEmployeeAvatar } from '../hooks/useEmployeeAvatar'
import { base64ToObjectURL, getInitials, getDisplayName } from '../utils/avatarUtils'
import { EmployeeAvatarData } from '../hooks/useEmployeeAvatarsBatch'

dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)
dayjs.extend(isToday)
dayjs.extend(isYesterday)

interface FlowCardProps {
  flow: Flow
  onView: (flow: Flow) => void
  accessToken: string
  isSelected?: boolean
  /** Pre-fetched employee data map - if provided, uses this instead of individual fetches */
  employeeMap?: Map<string, EmployeeAvatarData>
  /** Translation function passed from parent to avoid useTranslation in each card */
  t: (key: string, params?: Record<string, any>) => string
  /** Locale string for date formatting (e.g., 'en-US', 'de-DE') */
  locale: string
}

/**
 * AssigneeAvatar - Shows a single assignee avatar with hover tooltip
 * Uses pre-fetched data from employeeMap if available, otherwise falls back to individual fetch
 */
interface AssigneeAvatarProps {
  userId: string
  accessToken: string
  /** Pre-fetched employee data from batch request */
  prefetchedData?: EmployeeAvatarData
}

const AssigneeAvatar: React.FC<AssigneeAvatarProps> = memo(({ userId, accessToken, prefetchedData }) => {
  // Use prefetched data if available, otherwise fall back to individual fetch
  const { employeeData: fetchedData, isLoading: isFetching } = useEmployeeAvatar(
    accessToken,
    prefetchedData ? undefined : userId // Skip fetch if we have prefetched data
  )

  const employeeData = prefetchedData || fetchedData
  // If we have prefetched data, we're not loading
  const isLoading = prefetchedData ? false : isFetching

  const displayName = getDisplayName(employeeData?.displayName, employeeData?.firstName, employeeData?.lastName)
  const initials = getInitials(employeeData?.firstName, employeeData?.lastName)
  const avatarUrl = useMemo(() => {
    return employeeData?.pictureThumbnail ? base64ToObjectURL(employeeData.pictureThumbnail) : undefined
  }, [employeeData?.pictureThumbnail])

  // Avatar image preload state to prevent initials flicker
  const [avatarStatus, setAvatarStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')

  useEffect(() => {
    if (typeof window === 'undefined') return

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
  }, [avatarUrl])

  const showAvatarImage = avatarStatus === 'loaded' && !!avatarUrl
  const showAvatarFallback = !isLoading && (!avatarUrl || avatarStatus === 'error')

  return (
    <Avatar className="gba:h-6 gba:w-6 gba:border-2 gba:border-white" title={displayName}>
      {showAvatarImage && <AvatarImage src={avatarUrl} alt={displayName} />}
      {showAvatarFallback && <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>}
    </Avatar>
  )
})

export const FlowCard: React.FC<FlowCardProps> = memo(
  ({ flow, onView, accessToken, isSelected = false, employeeMap, t, locale }) => {
    const progressPercentage = flow.totalSteps > 0 ? Math.round((flow.currentStep / flow.totalSteps) * 100) : 0

    // Date formatting functions
    const baseLocale = locale?.split('-')[0]?.toLowerCase() || 'en'

    const formatRelativeTime = (date: string | Date): string => {
      return dayjs(date).locale(baseLocale).fromNow()
    }

    const formatDateTime = (date: string | Date): string => {
      const d = dayjs(date)
      const time = d.locale(baseLocale).format('LT')

      if (d.isToday()) {
        return `${t('formatter-today')}, ${time}`
      }
      if (d.isYesterday()) {
        return `${t('formatter-yesterday')}, ${time}`
      }

      return d.locale(baseLocale).format('L LT')
    }

    // Check if this is a blink flow (has blinkGroupId or is grouped)
    const isBlinkFlow = !!(flow.blinkGroupId || flow.isGrouped)

    // Check if this is a service request
    const isServiceRequest = flow.tags?.app === 'AppCatalog:1:SVC'

    // Check if this is an expense flow
    const isExpenseFlow = (() => {
      const templateName = flow.templateName.toLowerCase()
      const templateId = flow.templateId?.toLowerCase() || ''
      return templateName.includes('expense') || templateId.includes('expense') || templateId.includes('reimbursement')
    })()

    // Check if this is an absence request
    const isAbsenceRequest = (() => {
      const templateName = flow.templateName.toLowerCase()
      const templateId = flow.templateId?.toLowerCase() || ''
      return (
        templateName.includes('absence') ||
        templateName.includes('vacation') ||
        templateName.includes('leave') ||
        templateName.includes('time off') ||
        templateId.includes('absence') ||
        templateId.includes('vacation') ||
        templateId.includes('leave')
      )
    })()

    // For blinks, calculate assignee progress (for single-user blinks, it's 1 assignee)
    const shouldShowAssigneeProgress = isBlinkFlow
    const assigneeCount = flow.isGrouped ? flow.assigneeCount || 1 : 1
    // Calculate completed assignees based on flow type
    const getCompletedAssignees = (): number => {
      if (flow.isGrouped) return flow.completedAssignees || 0
      return flow.status === 'COMPLETED' ? 1 : 0
    }
    const completedAssignees = getCompletedAssignees()

    // Get assignee user IDs for displaying avatars
    const assigneeUserIds = useMemo(() => {
      if (!isBlinkFlow) return []

      if (flow.isGrouped && flow.groupedFlows) {
        // For grouped blinks, get all assignee user IDs from grouped flows
        return flow.groupedFlows.map(f => f.assignedUserId).filter((id): id is string => !!id)
      } else if (flow.assignedUserId) {
        // For single-user blinks, just the one assignee
        return [flow.assignedUserId]
      }

      return []
    }, [isBlinkFlow, flow.isGrouped, flow.groupedFlows, flow.assignedUserId])

    // Limit to showing first 3 avatars
    const visibleAssigneeIds = assigneeUserIds.slice(0, 3)
    const remainingCount = assigneeUserIds.length - visibleAssigneeIds.length

    return (
      <Card
        className={`gba:cursor-pointer gba:hover:shadow-md gba:transition-all gba:duration-300 ${
          isSelected
            ? 'gba:border-primary gba:border-2 gba:shadow-lg gba:bg-primary/5'
            : 'gba:border gba:hover:border-primary/50'
        }`}
        onClick={() => onView(flow)}
        data-testid={`flow-card-${flow.id}`}
      >
        <CardContent className="gba:p-3">
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
            <div className="gba:flex-1 gba:min-w-0">
              <div className="gba:flex gba:items-center gba:gap-1.5 gba:mb-1.5 gba:flex-wrap">
                {isBlinkFlow && (
                  <>
                    <Badge
                      variant="default"
                      className="gba:bg-gradient-to-r gba:from-blue-600 gba:to-indigo-600"
                      data-testid="flow-blink-badge"
                    >
                      <Zap className="gba:h-3 gba:w-3 gba:mr-1" />
                      {t('flow-card-blink')}
                    </Badge>
                    {visibleAssigneeIds.length > 0 && (
                      <div className="gba:flex gba:items-center gba:gap-1.5" data-testid="flow-blink-assignees">
                        <ArrowRight className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                        <div className="gba:flex gba:items-center gba:-space-x-2">
                          {visibleAssigneeIds.map(userId => (
                            <AssigneeAvatar
                              key={userId}
                              userId={userId}
                              accessToken={accessToken}
                              prefetchedData={employeeMap?.get(userId)}
                            />
                          ))}
                          {remainingCount > 0 && (
                            <div
                              className="gba:h-6 gba:w-6 gba:rounded-full gba:bg-muted gba:border-2 gba:border-white gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-medium gba:relative gba:z-10"
                              title={`+${remainingCount} more`}
                            >
                              +{remainingCount}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
                {isServiceRequest && (
                  <Badge variant="secondary" data-testid="flow-service-badge">
                    <FileText className="gba:h-3 gba:w-3 gba:mr-1" />
                    {t('flow-card-service-request')}
                  </Badge>
                )}
                {isExpenseFlow && (
                  <Badge variant="secondary" data-testid="flow-expense-badge">
                    <DollarSign className="gba:h-3 gba:w-3 gba:mr-1" />
                    {t('flow-card-expenses')}
                  </Badge>
                )}
                {isAbsenceRequest && (
                  <Badge variant="secondary" data-testid="flow-absence-badge">
                    <Calendar className="gba:h-3 gba:w-3 gba:mr-1" />
                    {t('flow-card-absences')}
                  </Badge>
                )}
                <Badge variant={getFlowStatusBadgeVariant(flow.status)} data-testid="flow-status-badge">
                  {formatFlowStatus(flow.status, t)}
                </Badge>
              </div>

              <h3 className="gba:font-semibold gba:text-sm gba:mb-1 gba:line-clamp-2" data-testid="flow-title">
                {flow.templateName}
              </h3>

              {/* Show assignee completion for all blinks (both single and multi-user) */}
              {shouldShowAssigneeProgress && (
                <div className="gba:mb-1.5">
                  <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:mb-0.5">
                    <Users className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
                    <span data-testid="flow-assignee-progress">
                      {t('flow-card-assignee-progress', { completed: completedAssignees, total: assigneeCount })}
                    </span>
                  </div>
                  <Progress
                    value={(completedAssignees / assigneeCount) * 100}
                    className="gba:h-1.5"
                    data-testid="flow-assignee-progress-bar"
                  />
                </div>
              )}

              {/* Show step progress for non-blink flows only */}
              {!shouldShowAssigneeProgress && flow.totalSteps > 0 && (
                <div className="gba:mb-1.5">
                  <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground gba:mb-0.5">
                    <span>{t('flow-card-progress')}</span>
                    <span data-testid="flow-progress-text">
                      {t('flow-card-steps', { current: flow.currentStep, total: flow.totalSteps })}
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="gba:h-1.5" data-testid="flow-progress-bar" />
                </div>
              )}

              <div className="gba:flex gba:flex-col sm:gba:flex-row gba:items-start sm:gba:items-center gba:gap-1 sm:gba:gap-4 gba:text-xs gba:text-muted-foreground">
                <div className="gba:flex gba:items-center gba:gap-1">
                  <Calendar className="gba:h-3 gba:w-3 gba:flex-shrink-0" />
                  <span data-testid="flow-started-at" className="gba:break-words">
                    {t('flow-card-started', { date: formatRelativeTime(flow.startedAt) })}
                  </span>
                </div>
                {flow.completedAt && (
                  <span data-testid="flow-completed-at" className="gba:break-words">
                    {t('flow-card-completed', { date: formatDateTime(flow.completedAt) })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
)
