/**
 * FlowDetailContent Component
 * Reusable flow detail content that can be used in both dialog and panel layouts
 */

import React, { useMemo, useState, useEffect } from 'react'
import {
  Badge,
  Button,
  Separator,
  Progress,
  Avatar,
  AvatarImage,
  AvatarFallback,
  useTranslation,
  useLocale
} from '@newwork/nw-design-system'
import { Calendar, CheckCircle, Circle, Users, Clock, X } from 'lucide-react'
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
import { base64ToObjectURL } from '../utils/avatarUtils'
import translations from '../_i18n'

dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)
dayjs.extend(isToday)
dayjs.extend(isYesterday)

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

interface FlowDetailContentProps {
  flow: Flow
  onClose?: () => void
  accessToken: string
  /** Whether to show the close button */
  showCloseButton?: boolean
  /** Additional className for the container */
  className?: string
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
  const { t } = useTranslation(translations)
  const { locale } = useLocale()

  const assigneeUserId = assigneeFlow.assignedUserId || ''
  const { employeeData, isLoading } = useEmployeeAvatar(accessToken, assigneeUserId)

  const isCompleted = assigneeFlow.status === 'COMPLETED'

  const baseLocale = locale?.split('-')[0]?.toLowerCase() || 'en'
  const formatRelativeTime = (date: string | Date): string => {
    return dayjs(date).locale(baseLocale).fromNow()
  }

  const displayName =
    employeeData?.displayName ||
    `${employeeData?.firstName || ''} ${employeeData?.lastName || ''}`.trim() ||
    t('flow-detail-loading')
  const initials = employeeData
    ? `${employeeData.firstName?.[0] || ''}${employeeData.lastName?.[0] || ''}`.toUpperCase()
    : '?'

  const avatarUrl = useMemo(() => {
    if (employeeData?.pictureThumbnail) {
      return base64ToObjectURL(employeeData.pictureThumbnail)
    }
    return undefined
  }, [employeeData?.pictureThumbnail])

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
      <Avatar className="gba:h-10 gba:w-10">
        {showAvatarImage && <AvatarImage src={avatarUrl} alt={displayName} />}
        {showAvatarFallback && <AvatarFallback>{initials}</AvatarFallback>}
      </Avatar>

      <div className="gba:flex-shrink-0">
        {isCompleted ? (
          <CheckCircle className="gba:h-5 gba:w-5 gba:text-success" />
        ) : (
          <Clock className="gba:h-5 gba:w-5 gba:text-warning" />
        )}
      </div>

      <div className="gba:flex-1 gba:min-w-0">
        <div className="gba:font-medium gba:text-sm gba:truncate">{displayName}</div>
        <div className="gba:text-xs gba:text-muted-foreground">
          {isCompleted ? (
            <>
              {t('flow-detail-completed-at', {
                date: assigneeFlow.completedAt ? formatRelativeTime(assigneeFlow.completedAt) : ''
              })}
            </>
          ) : (
            <>{t('flow-detail-in-progress', { date: formatRelativeTime(assigneeFlow.startedAt) })}</>
          )}
        </div>
      </div>

      <Badge variant={getFlowStatusBadgeVariant(assigneeFlow.status)} className="gba:text-xs gba:flex-shrink-0">
        {formatFlowStatus(assigneeFlow.status, t)}
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
  const { t } = useTranslation(translations)
  const { employeeData, isLoading } = useEmployeeAvatar(accessToken, initiatorUserId)

  const displayName =
    employeeData?.displayName ||
    `${employeeData?.firstName || ''} ${employeeData?.lastName || ''}`.trim() ||
    t('flow-detail-loading')
  const initials = employeeData
    ? `${employeeData.firstName?.[0] || ''}${employeeData.lastName?.[0] || ''}`.toUpperCase()
    : '?'

  const avatarUrl = useMemo(() => {
    if (employeeData?.pictureThumbnail) {
      return base64ToObjectURL(employeeData.pictureThumbnail)
    }
    return undefined
  }, [employeeData?.pictureThumbnail])

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
      <span className="gba:font-medium gba:text-sm">{displayName}</span>
    </div>
  )
}

export const FlowDetailContent: React.FC<FlowDetailContentProps> = ({
  flow,
  onClose,
  accessToken,
  showCloseButton = true,
  className
}) => {
  const { t } = useTranslation(translations)
  const { locale } = useLocale()

  const progressPercentage = flow.totalSteps > 0 ? Math.round((flow.currentStep / flow.totalSteps) * 100) : 0

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

  return (
    <div className={className} data-testid="flow-detail-content">
      {/* Header with Close Button */}
      <div className="gba:border-b gba:pb-4 gba:mb-6">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
          <div className="gba:flex-1">
            <h2 className="gba:text-2xl gba:font-bold" data-testid="flow-detail-title">
              {flow.templateName}
            </h2>
          </div>
          {showCloseButton && onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="gba:rounded-full gba:hover:bg-muted gba:flex-shrink-0"
              data-testid="flow-detail-close-button"
            >
              <X className="gba:h-5 gba:w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="gba:space-y-4">
        {/* Status Badge */}
        <div className="gba:flex gba:items-center gba:gap-2">
          <Badge variant={getFlowStatusBadgeVariant(flow.status)}>{formatFlowStatus(flow.status, t)}</Badge>
        </div>

        {/* Assignee Progress (for grouped multi-user blinks) */}
        {flow.isGrouped && flow.assigneeCount && (
          <div>
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Users className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                <span className="gba:text-sm gba:font-medium">{t('flow-detail-assignee-progress')}</span>
              </div>
              <span className="gba:text-sm gba:text-muted-foreground">
                {t('flow-detail-completed-count', {
                  completed: flow.completedAssignees || 0,
                  total: flow.assigneeCount
                })}
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
                <span className="gba:text-sm gba:font-medium">{t('flow-detail-assignee-progress')}</span>
              </div>
              <span className="gba:text-sm gba:text-muted-foreground">
                {t('flow-detail-completed-count', { completed: flow.status === 'COMPLETED' ? 1 : 0, total: 1 })}
              </span>
            </div>
            <Progress value={flow.status === 'COMPLETED' ? 100 : 0} className="gba:h-2" />
          </div>
        )}

        {/* Step Progress (for non-blink flows) */}
        {!flow.isGrouped && !flow.assignedUserId && flow.totalSteps > 0 && (
          <div>
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
              <span className="gba:text-sm gba:font-medium">{t('flow-detail-overall-progress')}</span>
              <span className="gba:text-sm gba:text-muted-foreground">
                {t('flow-detail-steps-count', { current: flow.currentStep, total: flow.totalSteps })}
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
              <div className="gba:text-xs gba:text-muted-foreground">{t('flow-detail-started')}</div>
              <div className="gba:font-medium">
                {formatDateTime(flow.startedAt)} ({formatRelativeTime(flow.startedAt)})
              </div>
            </div>
          </div>

          {flow.completedAt && (
            <div className="gba:flex gba:items-center gba:gap-2">
              <CheckCircle className="gba:h-4 gba:w-4 gba:text-success" />
              <div>
                <div className="gba:text-xs gba:text-muted-foreground">{t('flow-detail-completed')}</div>
                <div className="gba:font-medium">
                  {formatDateTime(flow.completedAt)} ({formatRelativeTime(flow.completedAt)})
                </div>
              </div>
            </div>
          )}

          {flow.initiatedBy && (
            <div>
              <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">{t('flow-detail-initiated-by')}</div>
              <InitiatorInfo initiatorUserId={flow.initiatorUserId || flow.initiatedBy} accessToken={accessToken} />
            </div>
          )}
        </div>

        {/* Assignee Status List (for grouped multi-user blinks) */}
        {flow.isGrouped && flow.groupedFlows && flow.groupedFlows.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="gba:font-semibold gba:mb-3">{t('flow-detail-assignee-status')}</h4>
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
              <h4 className="gba:font-semibold gba:mb-3">{t('flow-detail-assignee')}</h4>
              <AssigneeItem assigneeFlow={flow} index={0} accessToken={accessToken} />
            </div>
          </>
        )}

        {/* Steps Timeline (for non-grouped flows) */}
        {!flow.isGrouped && flow.steps && flow.steps.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="gba:font-semibold gba:mb-3">{t('flow-detail-flow-steps')}</h4>
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
                          {t('flow-detail-step', { number: step.stepIndex + 1, title: step.title })}
                        </div>
                        <div className="gba:text-xs gba:text-muted-foreground">
                          {step.type}
                          {step.assignedTo && ` • ${t('flow-detail-assigned-to', { name: step.assignedTo })}`}
                          {step.completedBy && ` • ${t('flow-detail-completed-by', { name: step.completedBy })}`}
                        </div>
                        {step.completedAt && (
                          <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                            {t('flow-detail-completed-at', { date: formatRelativeTime(step.completedAt) })}
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
    </div>
  )
}
