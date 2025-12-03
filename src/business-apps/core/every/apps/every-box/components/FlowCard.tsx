/**
 * FlowCard Component
 * Individual flow card with status and progress indicators
 */

import React, { memo, useMemo, useState, useEffect } from 'react'
import { Card, CardContent, Badge, Progress, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { Calendar, Users, Zap, ArrowRight, FileText, DollarSign } from 'lucide-react'
import { Flow } from '../types'
import {
  formatRelativeTime,
  formatDateTime,
  getFlowStatusBadgeVariant,
  formatFlowStatus
} from '../utils/taskFormatters'
import { useEmployeeAvatar } from '../hooks/useEmployeeAvatar'
import { base64ToObjectURL, getInitials, getDisplayName } from '../utils/avatarUtils'
import { EmployeeAvatarData } from '../hooks/useEmployeeAvatarsBatch'

interface FlowCardProps {
  flow: Flow
  onView: (flow: Flow) => void
  accessToken: string
  isSelected?: boolean
  /** Pre-fetched employee data map - if provided, uses this instead of individual fetches */
  employeeMap?: Map<string, EmployeeAvatarData>
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
  ({ flow, onView, accessToken, isSelected = false, employeeMap }) => {
    const progressPercentage = flow.totalSteps > 0 ? Math.round((flow.currentStep / flow.totalSteps) * 100) : 0

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
                      Blink
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
                    Service Request
                  </Badge>
                )}
                {isExpenseFlow && (
                  <Badge variant="secondary" data-testid="flow-expense-badge">
                    <DollarSign className="gba:h-3 gba:w-3 gba:mr-1" />
                    Expenses
                  </Badge>
                )}
                {isAbsenceRequest && (
                  <Badge variant="secondary" data-testid="flow-absence-badge">
                    <Calendar className="gba:h-3 gba:w-3 gba:mr-1" />
                    Absences
                  </Badge>
                )}
                <Badge variant={getFlowStatusBadgeVariant(flow.status)} data-testid="flow-status-badge">
                  {formatFlowStatus(flow.status)}
                </Badge>
              </div>

              <h3 className="gba:font-semibold gba:text-sm gba:mb-1 gba:truncate" data-testid="flow-title">
                {flow.templateName}
              </h3>

              {/* Show assignee completion for all blinks (both single and multi-user) */}
              {shouldShowAssigneeProgress && (
                <div className="gba:mb-1.5">
                  <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:mb-0.5">
                    <Users className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
                    <span data-testid="flow-assignee-progress">
                      {completedAssignees} of {assigneeCount} completed
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
                    <span>Progress</span>
                    <span data-testid="flow-progress-text">
                      {flow.currentStep} of {flow.totalSteps} steps
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="gba:h-1.5" data-testid="flow-progress-bar" />
                </div>
              )}

              <div className="gba:flex gba:items-center gba:gap-4 gba:text-xs gba:text-muted-foreground">
                <div className="gba:flex gba:items-center gba:gap-1">
                  <Calendar className="gba:h-3 gba:w-3" />
                  <span data-testid="flow-started-at">Started {formatRelativeTime(flow.startedAt)}</span>
                </div>
                {flow.completedAt && (
                  <span data-testid="flow-completed-at">Completed {formatDateTime(flow.completedAt)}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
)
