/**
 * FlowDetailDialog Component
 * Displays detailed flow information with step-by-step progress
 */

import React, { useMemo, useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  Badge,
  Button,
  Separator,
  Progress,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { Calendar, CheckCircle, Circle, Users, Clock, X } from 'lucide-react'
import { Flow } from '../types'
import {
  formatDateTime,
  formatRelativeTime,
  getFlowStatusBadgeVariant,
  formatFlowStatus
} from '../utils/taskFormatters'
import { useEmployeeAvatar } from '../hooks/useEmployeeAvatar'
import { base64ToObjectURL } from '../utils/avatarUtils'

// Helper function to get step status icon color class
const getStepStatusIconClass = (status: string): { className: string; filled: boolean } => {
  switch (status) {
    case 'COMPLETED':
      return { className: 'gba:text-success', filled: false }
    case 'IN_PROGRESS':
      return { className: 'gba:text-info gba:fill-current', filled: true }
    case 'FAILED':
      return { className: 'gba:text-destructive gba:fill-current', filled: true }
    default:
      return { className: 'gba:text-muted-foreground', filled: false }
  }
}

interface FlowDetailDialogProps {
  flow: Flow | null
  onClose: () => void
  accessToken: string
}

/**
 * AssigneeItem - Shows individual assignee with avatar and status
 */
interface AssigneeItemProps {
  assigneeFlow: Flow
  index: number
  accessToken: string
}

const AssigneeItem: React.FC<AssigneeItemProps> = ({ assigneeFlow, index, accessToken }) => {
  // Get assignee user ID from the flow tags (set when workflow was created)
  const assigneeUserId = assigneeFlow.assignedUserId || ''
  const { employeeData, isLoading } = useEmployeeAvatar(accessToken, assigneeUserId)

  const isCompleted = assigneeFlow.status === 'COMPLETED'

  // Get display name and initials
  const displayName =
    employeeData?.displayName ||
    `${employeeData?.firstName || ''} ${employeeData?.lastName || ''}`.trim() ||
    'Loading...'
  const initials = employeeData
    ? `${employeeData.firstName?.[0] || ''}${employeeData.lastName?.[0] || ''}`.toUpperCase()
    : '?'

  // Convert base64 avatar to URL
  const avatarUrl = useMemo(() => {
    if (employeeData?.pictureThumbnail) {
      return base64ToObjectURL(employeeData.pictureThumbnail)
    }
    return undefined
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
    <div className="gba:flex gba:items-center gba:gap-3" data-testid={`assignee-${index}`}>
      {/* Avatar */}
      <Avatar className="gba:h-10 gba:w-10">
        {showAvatarImage && <AvatarImage src={avatarUrl} alt={displayName} />}
        {showAvatarFallback && <AvatarFallback>{initials}</AvatarFallback>}
      </Avatar>

      {/* Status Icon */}
      <div className="gba:flex-shrink-0">
        {isCompleted ? (
          <CheckCircle className="gba:h-5 gba:w-5 gba:text-success" />
        ) : (
          <Clock className="gba:h-5 gba:w-5 gba:text-warning" />
        )}
      </div>

      {/* Name and Status */}
      <div className="gba:flex-1 gba:min-w-0">
        <div className="gba:font-medium gba:text-sm gba:truncate">{displayName}</div>
        <div className="gba:text-xs gba:text-muted-foreground">
          {isCompleted ? (
            <>Completed {assigneeFlow.completedAt && formatRelativeTime(assigneeFlow.completedAt)}</>
          ) : (
            <>In Progress • Started {formatRelativeTime(assigneeFlow.startedAt)}</>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <Badge variant={getFlowStatusBadgeVariant(assigneeFlow.status)} className="gba:text-xs gba:flex-shrink-0">
        {formatFlowStatus(assigneeFlow.status)}
      </Badge>
    </div>
  )
}

/**
 * InitiatorInfo - Shows flow initiator with avatar and name
 */
interface InitiatorInfoProps {
  initiatorUserId: string
  accessToken: string
}

const InitiatorInfo: React.FC<InitiatorInfoProps> = ({ initiatorUserId, accessToken }) => {
  const { employeeData, isLoading } = useEmployeeAvatar(accessToken, initiatorUserId)

  // Get display name and initials
  const displayName =
    employeeData?.displayName ||
    `${employeeData?.firstName || ''} ${employeeData?.lastName || ''}`.trim() ||
    'Loading...'
  const initials = employeeData
    ? `${employeeData.firstName?.[0] || ''}${employeeData.lastName?.[0] || ''}`.toUpperCase()
    : '?'

  // Convert base64 avatar to URL
  const avatarUrl = useMemo(() => {
    if (employeeData?.pictureThumbnail) {
      return base64ToObjectURL(employeeData.pictureThumbnail)
    }
    return undefined
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
    <div className="gba:flex gba:items-center gba:gap-2">
      <Avatar className="gba:h-8 gba:w-8">
        {showAvatarImage && <AvatarImage src={avatarUrl} alt={displayName} />}
        {showAvatarFallback && <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>}
      </Avatar>
      <div className="gba:font-medium">{displayName}</div>
    </div>
  )
}

export const FlowDetailDialog: React.FC<FlowDetailDialogProps> = ({ flow, onClose, accessToken }) => {
  if (!flow) return null

  const progressPercentage = flow.totalSteps > 0 ? Math.round((flow.currentStep / flow.totalSteps) * 100) : 0

  return (
    <Card className="gba:h-full gba:flex gba:flex-col gba:shadow-lg" data-testid="flow-detail-dialog">
      {/* Header with Close Button */}
      <CardHeader className="gba:border-b gba:pb-4">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
          <div className="gba:flex-1">
            <h2 className="gba:text-2xl gba:font-bold gba:mb-3" data-testid="flow-detail-title">
              {flow.templateName}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="gba:rounded-full gba:hover:bg-muted gba:flex-shrink-0"
            data-testid="flow-detail-close-button"
          >
            <X className="gba:h-5 gba:w-5" />
          </Button>
        </div>
      </CardHeader>

      {/* Scrollable Content */}
      <CardContent className="gba:flex-1 gba:overflow-y-auto gba:pt-6">
        <div className="gba:space-y-4">
          {/* Status Badge */}
          <div className="gba:flex gba:items-center gba:gap-2">
            <Badge variant={getFlowStatusBadgeVariant(flow.status)}>{formatFlowStatus(flow.status)}</Badge>
            <span className="gba:text-sm gba:text-muted-foreground">ID: {flow.id}</span>
          </div>

          {/* Assignee Progress (for grouped multi-user blinks) */}
          {flow.isGrouped && flow.assigneeCount && (
            <div>
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Users className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                  <span className="gba:text-sm gba:font-medium">Assignee Progress</span>
                </div>
                <span className="gba:text-sm gba:text-muted-foreground">
                  {flow.completedAssignees} of {flow.assigneeCount} completed
                </span>
              </div>
              <Progress value={((flow.completedAssignees || 0) / flow.assigneeCount) * 100} className="gba:h-2" />
            </div>
          )}

          {/* Assignee Progress (for single-user blinks) */}
          {!flow.isGrouped && flow.assignedUserId && (
            <div>
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <Users className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                  <span className="gba:text-sm gba:font-medium">Assignee Progress</span>
                </div>
                <span className="gba:text-sm gba:text-muted-foreground">
                  {flow.status === 'COMPLETED' ? '1' : '0'} of 1 completed
                </span>
              </div>
              <Progress value={flow.status === 'COMPLETED' ? 100 : 0} className="gba:h-2" />
            </div>
          )}

          {/* Step Progress (for non-blink flows) */}
          {!flow.isGrouped && !flow.assignedUserId && flow.totalSteps > 0 && (
            <div>
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                <span className="gba:text-sm gba:font-medium">Overall Progress</span>
                <span className="gba:text-sm gba:text-muted-foreground">
                  {flow.currentStep} of {flow.totalSteps} steps
                </span>
              </div>
              <Progress value={progressPercentage} className="gba:h-2" />
            </div>
          )}

          <Separator />

          {/* Flow Information */}
          <div className="gba:space-y-3 gba:text-sm">
            <div className="gba:flex gba:items-center gba:gap-2">
              <Calendar className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
              <div>
                <div className="gba:text-xs gba:text-muted-foreground">Started</div>
                <div className="gba:font-medium">
                  {formatDateTime(flow.startedAt)} ({formatRelativeTime(flow.startedAt)})
                </div>
              </div>
            </div>

            {flow.completedAt && (
              <div className="gba:flex gba:items-center gba:gap-2">
                <CheckCircle className="gba:h-4 gba:w-4 gba:text-success" />
                <div>
                  <div className="gba:text-xs gba:text-muted-foreground">Completed</div>
                  <div className="gba:font-medium">
                    {formatDateTime(flow.completedAt)} ({formatRelativeTime(flow.completedAt)})
                  </div>
                </div>
              </div>
            )}

            {flow.initiatedBy && (
              <div>
                <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">Initiated By</div>
                <InitiatorInfo initiatorUserId={flow.initiatedBy} accessToken={accessToken} />
              </div>
            )}

            <div>
              <div className="gba:text-xs gba:text-muted-foreground">Template</div>
              <div className="gba:font-medium">{flow.templateId}</div>
            </div>
          </div>

          {/* Assignee Status List (for grouped multi-user blinks) */}
          {flow.isGrouped && flow.groupedFlows && flow.groupedFlows.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="gba:font-semibold gba:mb-3">Assignee Status</h4>
                <div className="gba:space-y-3">
                  {flow.groupedFlows.map((assigneeFlow, index) => (
                    <AssigneeItem
                      key={assigneeFlow.id}
                      assigneeFlow={assigneeFlow}
                      index={index}
                      accessToken={accessToken}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Assignee (for single-user blinks) */}
          {!flow.isGrouped && flow.assignedUserId && (
            <>
              <Separator />
              <div>
                <h4 className="gba:font-semibold gba:mb-3">Assignee</h4>
                <AssigneeItem assigneeFlow={flow} index={0} accessToken={accessToken} />
              </div>
            </>
          )}

          {/* Steps Timeline (for non-grouped flows) */}
          {!flow.isGrouped && flow.steps && flow.steps.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="gba:font-semibold gba:mb-3">Flow Steps</h4>
                <div className="gba:space-y-3">
                  {flow.steps.map(step => {
                    const statusIconClass = getStepStatusIconClass(step.status)
                    const stepKey = `step-${step.stepIndex}-${step.title}`
                    return (
                      <div
                        key={stepKey}
                        className="gba:flex gba:items-start gba:gap-3"
                        data-testid={`flow-step-${step.stepIndex}`}
                      >
                        <div className="gba:mt-1">
                          {step.status === 'COMPLETED' ? (
                            <CheckCircle className={`gba:h-5 gba:w-5 ${statusIconClass.className}`} />
                          ) : (
                            <Circle className={`gba:h-5 gba:w-5 ${statusIconClass.className}`} />
                          )}
                        </div>
                        <div className="gba:flex-1">
                          <div className="gba:font-medium gba:text-sm">
                            Step {step.stepIndex + 1}: {step.title}
                          </div>
                          <div className="gba:text-xs gba:text-muted-foreground">
                            {step.type}
                            {step.assignedTo && ` • Assigned to: ${step.assignedTo}`}
                            {step.completedBy && ` • Completed by: ${step.completedBy}`}
                          </div>
                          {step.completedAt && (
                            <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                              Completed {formatRelativeTime(step.completedAt)}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
