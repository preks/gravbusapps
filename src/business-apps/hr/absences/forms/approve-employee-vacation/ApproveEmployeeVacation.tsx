/**
 * ApproveEmployeeVacation Component
 * Standalone form for approving employee vacation requests from Kogito processes
 *
 * Refactored to use:
 * - TaskFormLayout: Proper layout wrapper with sticky header/footer
 * - Auto-fetching: TaskDetailHeader automatically fetches employee data
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import {
  Separator,
  Textarea,
  Switch,
  Label,
  Spinner,
  Alert,
  useTranslation,
  useLocale,
  Button
} from '@newwork/nw-design-system'
import { ThumbsUp, XCircle, MessageSquare, CheckCircle, AlertCircle, ExternalLink, Users } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useVacationApprovalData } from './hooks/useVacationApprovalData'
import { env } from '@/common/env/EnvUtils'
import { TeamAbsenceCalendar } from '@/business-apps/core/every/apps/every-box/components/TeamAbsenceCalendar'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { useEntityDates } from '@/common/data/common/hooks/useEntityDates'
import { useApproverData } from '@/common/data/employee/hooks/useApproverData'
import { formatWorkingDaysAndHours } from '@/business-apps/hr/absences/utils/absenceDurationFormatter'
import { formatDateTime } from '@/common/utils/dateFormatter'
import { ExtendedAdditionalData } from '@/business-apps/hr/absences/types/taskTypes'
import { useApprovalData } from '@/business-apps/hr/absences/hooks/useApprovalData'
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import translations from './_i18n'

// Extend dayjs with plugins
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)
import { useVacationMetrics } from './hooks/useVacationMetrics'
import { VacationHistory } from './components/VacationHistory'
import { EmployeeYearlyCalendar } from './components/EmployeeYearlyCalendar'
import { usePublicHolidays } from '../../hooks/usePublicHolidays'
import { calculateWorkingDays } from '../../utils/vacationCalculations'

interface ApproveEmployeeVacationProps extends BusinessAppContextProps {
  // Additional props from task payload
  onClose?: () => void // Optional callback to close the modal
  onTaskUpdated?: () => void // Optional callback to refresh the task list
}

// Helper: Extract endpoint from metadata
const extractEndpoint = (processMetadata: any, extendedAdditionalData: any): string | null => {
  return (
    processMetadata?.endpoint ||
    extendedAdditionalData?.psi_taskPayload?.endpoint ||
    extendedAdditionalData?.endpoint ||
    null
  )
}

// Helper: Build approval payload
const buildApprovalPayload = (approval: 'APPROVED' | 'REJECTED', comment: string) => {
  return {
    approval,
    approvalNote: comment || '',
    event: 'pse_submit'
  }
}

// Helper: Extract user ID from JWT token
const extractUserIdFromToken = (accessToken: string): string => {
  try {
    const tokenParts = accessToken.split('.')
    if (tokenParts.length === 3) {
      // Convert base64url to base64 before decoding
      const base64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
      const tokenPayload = JSON.parse(atob(padded))
      return tokenPayload.sub || ''
    }
  } catch {
    // Ignore token parsing errors
  }
  return ''
}

// Helper: Build completion endpoint URL
const buildCompletionEndpoint = (endpoint: string, userId: string): string => {
  const kogitoBaseUrl = env('NEXT_PUBLIC_BASE_URL')

  // Validate kogitoBaseUrl before using it
  if (!kogitoBaseUrl || typeof kogitoBaseUrl !== 'string') {
    throw new Error('NEXT_PUBLIC_BASE_URL is not defined or invalid')
  }

  let completionEndpoint = ''

  // Parse the endpoint to ensure it's a proper URL
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    try {
      const parsedUrl = new URL(endpoint)
      completionEndpoint = parsedUrl.pathname
    } catch {
      // Fallback: treat as pathname if URL parsing fails
      completionEndpoint = endpoint.replace(/^https?:\/\/[^/]+/, '')
    }
  } else {
    completionEndpoint = endpoint
  }

  // Ensure the endpoint starts with /
  if (!completionEndpoint.startsWith('/')) {
    completionEndpoint = `/${completionEndpoint}`
  }

  // Build full URL
  completionEndpoint = `${kogitoBaseUrl}${completionEndpoint}`
  const userParam = userId ? `&user=${userId}` : ''
  return `${completionEndpoint}?phase=complete${userParam}`
}

// Helper: Submit approval to Kogito API
const submitToKogitoApi = async (
  endpoint: string,
  accessToken: string,
  approval: 'APPROVED' | 'REJECTED',
  comment: string
): Promise<void> => {
  const userId = extractUserIdFromToken(accessToken)
  const fullUrl = buildCompletionEndpoint(endpoint, userId)
  const payload = buildApprovalPayload(approval, comment)

  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }

  // Dispatch process completion event
  globalThis.dispatchEvent(
    new CustomEvent('com.newwork.process.processCompletion', {
      detail: { resolution: 'success' }
    })
  )
}

const ApproveEmployeeVacation: React.FC<ApproveEmployeeVacationProps> = ({
  accessToken,
  additionalData,
  userInfo,
  onClose,
  onTaskUpdated
}) => {
  const { t } = useTranslation(translations)
  const { locale } = useLocale()

  // Cast additionalData to extended interface for proper typing
  const extendedAdditionalData = additionalData as ExtendedAdditionalData | undefined

  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Ref for comment section to scroll into view
  const commentSectionRef = useRef<HTMLDivElement>(null)

  // Extract task data from additionalData
  const taskPayload = additionalData?.psi_taskPayload || {}
  const employeeAbsence = taskPayload?.employeeAbsence
  const creatorName = taskPayload?.creatorName as string | undefined
  const processMetadata = additionalData?.psi_processMetadata || {}

  // Extract task status
  const taskStatus = additionalData?.psi_taskStatus || processMetadata?.status || 'IN_PROGRESS'
  const isTaskCompleted = taskStatus === 'COMPLETED'

  // Get task title (translated)
  const taskTitle = t('task-title-approve-vacation')

  // Use generic hooks for entity dates (request created)
  const { createdAt: requestCreatedAt, isLoading: isLoadingRequestDate } = useEntityDates({
    accessToken,
    entityId: employeeAbsence?.id,
    entityType: 'EmployeeAbsence'
  })

  // For completed tasks, fetch approver name
  const { approverName, isLoading: isLoadingApproverName } = useApproverData({
    accessToken,
    approverId: isTaskCompleted ? employeeAbsence?.approverId : null
  })

  // Helper: Extract approval status from various sources
  const getApprovalStatus = useCallback((): string | null => {
    if (!isTaskCompleted) return null

    return (
      processMetadata?.outputs?.approval ||
      processMetadata?.approval ||
      taskPayload?.approval ||
      extendedAdditionalData?.formData?.approval ||
      null
    )
  }, [isTaskCompleted, processMetadata, taskPayload, extendedAdditionalData])

  // Helper: Extract approval note from various sources
  const getApprovalNote = useCallback((): string | null => {
    if (!isTaskCompleted) return null

    return (
      processMetadata?.outputs?.approvalNote ||
      processMetadata?.approvalNote ||
      taskPayload?.approvalNote ||
      extendedAdditionalData?.formData?.approvalNote ||
      null
    )
  }, [isTaskCompleted, processMetadata, taskPayload, extendedAdditionalData])

  const taskOutputApprovalStatus = useMemo(() => getApprovalStatus(), [getApprovalStatus])
  const taskOutputApprovalNote = useMemo(() => getApprovalNote(), [getApprovalNote])

  const completedAt = processMetadata?.completedAt || extendedAdditionalData?.psi_taskCompletedAt || null

  // Use custom hook for data fetching
  const {
    employeeData,
    substituteEmployeeName,
    absenceTypeName,
    isLoadingEmployee,
    isLoadingSubstitute,
    error: dataError
  } = useVacationApprovalData({
    accessToken,
    employeeId: employeeAbsence?.employeeId,
    substituteEmployeeId: employeeAbsence?.substituteEmployee,
    absenceTypeRef: employeeAbsence?.typeRef
  })

  // Get supervisor ID for TeamAbsenceCalendar
  const supervisorId = userInfo?.employeeDetails?.employeeId

  // Auto-scroll to comment section when toggle is enabled
  useEffect(() => {
    if (showComment && commentSectionRef.current) {
      requestAnimationFrame(() => {
        commentSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      })
    }
  }, [showComment])

  // Use custom hook for approval data fetching
  const { approvalStatus, approvalNote, approvalDate, isLoadingApprovalData } = useApprovalData({
    accessToken,
    absenceId: employeeAbsence?.id,
    isTaskCompleted,
    taskOutputApprovalStatus,
    taskOutputApprovalNote,
    completedAt,
    fallbackStatus: employeeAbsence?.status,
    fallbackNote: employeeAbsence?.approvalNote
  })

  // Use vacation metrics hook for comprehensive vacation data
  const {
    entitlement,
    approvedAbsences,
    pendingAbsences,
    totalApprovedDays,
    totalPendingDays,
    remainingBeforeRequest,
    remainingAfterApproval,
    isLoading: isLoadingVacationMetrics,
    error: vacationMetricsError
  } = useVacationMetrics({
    accessToken,
    employeeId: employeeAbsence?.employeeId,
    currentAbsenceId: employeeAbsence?.id,
    currentRequestDays: employeeAbsence?.workingDays || 0
  })

  // Fetch public holidays for accurate working days calculation
  const {
    holidayDateSet,
    holidays,
    isLoading: holidaysLoading
  } = usePublicHolidays({
    accessToken,
    employeeId: employeeAbsence?.employeeId
  })

  // Calculate accurate working days excluding public holidays
  const workingDaysWithHolidays = useMemo(() => {
    if (!employeeAbsence?.startDate || !employeeAbsence?.endDate || holidaysLoading) {
      return employeeAbsence?.workingDays || 0
    }

    return calculateWorkingDays(employeeAbsence.startDate, employeeAbsence.endDate, holidayDateSet)
  }, [
    employeeAbsence?.startDate,
    employeeAbsence?.endDate,
    employeeAbsence?.workingDays,
    holidayDateSet,
    holidaysLoading
  ])

  // Find holidays that fall within the request period
  const holidaysInPeriod = useMemo(() => {
    if (!employeeAbsence?.startDate || !employeeAbsence?.endDate || !holidays || holidays.length === 0) {
      return []
    }

    const start = dayjs(employeeAbsence.startDate)
    const end = dayjs(employeeAbsence.endDate)

    return holidays.filter(holiday => {
      const code = holiday.alternativeCode || holiday.code || ''
      const match = /^(\d{4})(\d{2})(\d{2})$/.exec(code)
      if (!match) return false

      const holidayDate = dayjs(`${match[1]}-${match[2]}-${match[3]}`)

      // Ensure the holiday date is valid before calling methods
      if (!holidayDate.isValid()) return false

      return holidayDate.isSameOrAfter(start, 'day') && holidayDate.isSameOrBefore(end, 'day')
    })
  }, [employeeAbsence?.startDate, employeeAbsence?.endDate, holidays])

  const handleApprove = async () => {
    setIsApproving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const endpoint = extractEndpoint(processMetadata, extendedAdditionalData)

      if (!endpoint) {
        console.warn('⚠️ No endpoint found, using dispatchProcessContinueEvent fallback')
        dispatchProcessContinueEvent('pse_submit', buildApprovalPayload('APPROVED', comment))
        setSuccessMessage(t('success-absence-approved'))
        return
      }

      await submitToKogitoApi(endpoint, accessToken, 'APPROVED', comment)
      setSuccessMessage(t('success-absence-approved'))

      // Allow time for user to see success message before closing
      setTimeout(() => {
        onClose?.()
        onTaskUpdated?.()
      }, 1500)
    } catch (err) {
      console.error('❌ Approve - Error:', err)
      const errorMsg = err instanceof Error ? err.message : t('error-failed-to-approve')
      setErrorMessage(`${t('error-failed-to-approve')}: ${errorMsg}`)
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!comment.trim()) {
      setErrorMessage(t('error-provide-rejection-reason'))
      setShowComment(true)
      return
    }

    setIsRejecting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const endpoint = extractEndpoint(processMetadata, extendedAdditionalData)

      if (!endpoint) {
        console.warn('⚠️ No endpoint found, using dispatchProcessContinueEvent fallback')
        dispatchProcessContinueEvent('pse_submit', buildApprovalPayload('REJECTED', comment))
        setSuccessMessage(t('success-absence-rejected'))
        return
      }

      await submitToKogitoApi(endpoint, accessToken, 'REJECTED', comment)
      setSuccessMessage(t('success-absence-rejected'))

      // Allow time for user to see success message before closing
      setTimeout(() => {
        if (onClose) {
          onClose()
        }
        if (onTaskUpdated) {
          onTaskUpdated()
        }
      }, 1500)
    } catch (err) {
      console.error('❌ Reject - Error:', err)
      const errorMsg = err instanceof Error ? err.message : t('error-failed-to-reject')
      setErrorMessage(`${t('error-failed-to-reject')}: ${errorMsg}`)
    } finally {
      setIsRejecting(false)
    }
  }

  const handleClose = () => {
    // Simply close the modal using the onClose callback if available
    // This avoids aborting the process - just closes the UI
    if (onClose) {
      onClose()
    } else {
      // Fallback: if onClose is not provided, use pse_abort (shouldn't happen in normal flow)
      dispatchProcessContinueEvent('pse_abort', {
        event: 'pse_abort'
      })
    }
  }

  // Detect if we're in every-box context (has onClose callback)
  const isEveryBoxContext = !!onClose

  return (
    <TaskFormLayout
      data-testid="approve-employee-vacation"
      header={
        <TaskDetailHeader
          title={taskTitle}
          showEmployeeInfo={true}
          employeeId={employeeAbsence?.employeeId}
          accessToken={accessToken}
          creatorName={creatorName}
          onClose={isEveryBoxContext ? handleClose : undefined}
        />
      }
      footer={
        // Action Footer - Only show when task is not completed
        isTaskCompleted ? undefined : (
          <TaskDetailFooter
            data-testid="action-footer"
            actions={[
              {
                label: t('action-reject'),
                onClick: handleReject,
                variant: 'destructive' as const,
                disabled: isRejecting || isApproving || !!successMessage,
                loading: isRejecting,
                icon: XCircle,
                testId: 'reject-button'
              },
              {
                label: t('action-approve'),
                onClick: handleApprove,
                variant: 'default' as const,
                disabled: isApproving || isRejecting || !!successMessage,
                loading: isApproving,
                icon: ThumbsUp,
                className: 'gba:bg-success gba:text-success-foreground hover:gba:bg-success/90',
                testId: 'approve-button'
              }
            ]}
          />
        )
      }
      contentClassName="gba:space-y-6"
    >
      {/* Error Messages */}
      {errorMessage && (
        <Alert variant="destructive" data-testid="error-message">
          {errorMessage}
        </Alert>
      )}
      {dataError && (
        <Alert variant="destructive" data-testid="data-error-message">
          {dataError}
        </Alert>
      )}
      {vacationMetricsError && (
        <Alert variant="destructive" data-testid="vacation-metrics-error-message">
          {vacationMetricsError}
        </Alert>
      )}

      {/* Vacation Request Details */}
      {employeeAbsence && typeof employeeAbsence === 'object' && (
        <>
          <div data-testid="vacation-details-section">
            <h4 className="gba:font-semibold gba:mb-4 gba:text-lg">{t('section-vacation-request-details')}</h4>
            <div className="gba:bg-muted gba:p-4 gba:rounded-lg gba:space-y-3">
              {/* Type */}
              {absenceTypeName && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    {t('label-type')}:
                  </span>
                  <span className="gba:text-sm gba:flex-1">{absenceTypeName}</span>
                </div>
              )}

              {/* Request Created - Show during loading or when available */}
              {(isLoadingRequestDate || requestCreatedAt) && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    {t('label-request-created')}:
                  </span>
                  <span className="gba:text-sm gba:flex-1">
                    {isLoadingRequestDate ? <Spinner size="sm" /> : dayjs(requestCreatedAt).format('MMM D, YYYY')}
                  </span>
                </div>
              )}

              {/* Duration */}
              {employeeAbsence.startDate && employeeAbsence.endDate && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    {t('label-duration')}:
                  </span>
                  <span className="gba:text-sm gba:flex-1">
                    {(() => {
                      const startDate = dayjs(employeeAbsence.startDate)
                      const endDate = dayjs(employeeAbsence.endDate)
                      const isSameDay = startDate.isSame(endDate, 'day')

                      if (isSameDay) {
                        return startDate.format('MMM D, YYYY')
                      }
                      return `${startDate.format('MMM D, YYYY')} → ${endDate.format('MMM D, YYYY')}`
                    })()}
                  </span>
                </div>
              )}

              {/* Working Days and Hours (combined) */}
              {(employeeAbsence.workingDays !== undefined || employeeAbsence.workingHours !== undefined) && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    {t('label-working-days')}:
                  </span>
                  <span className="gba:text-sm gba:flex-1">
                    {formatWorkingDaysAndHours(employeeAbsence.workingDays, employeeAbsence.workingHours, t)}
                    {!holidaysLoading && workingDaysWithHolidays !== employeeAbsence.workingDays && (
                      <span className="gba:text-xs gba:text-muted-foreground gba:ml-2">
                        ({workingDaysWithHolidays} {t('days-unit')} {t('label-excluding-holidays')})
                      </span>
                    )}
                  </span>
                </div>
              )}

              {/* Public Holidays in Period */}
              {holidaysInPeriod.length > 0 && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    {t('label-public-holidays')}:
                  </span>
                  <div className="gba:text-sm gba:flex-1 gba:space-y-1">
                    {holidaysInPeriod.map((holiday, index) => {
                      const code = holiday.alternativeCode || holiday.code || ''
                      const match = /^(\d{4})(\d{2})(\d{2})$/.exec(code)
                      const dateStr = match ? `${match[1]}-${match[2]}-${match[3]}` : ''
                      return (
                        <div key={holiday.id || index} className="gba:flex gba:items-center gba:gap-2">
                          <span className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-purple-500" />
                          <span>{dayjs(dateStr).format('MMM D, YYYY')}</span>
                          <span className="gba:text-muted-foreground">- {holiday.value}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Substitute Employee - Only show if there is a substitute */}
              {employeeAbsence.substituteEmployee && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    {t('label-substitute')}:
                  </span>
                  <span className="gba:text-sm gba:flex-1 gba:text-muted-foreground">
                    {isLoadingSubstitute ? <Spinner size="sm" /> : substituteEmployeeName || t('loading')}
                  </span>
                </div>
              )}

              {/* Description - Only show if there is a description */}
              {employeeAbsence.description?.trim() && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    {t('label-description')}:
                  </span>
                  <span className="gba:text-sm gba:flex-1 gba:text-muted-foreground">
                    {employeeAbsence.description.trim()}
                  </span>
                </div>
              )}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Vacation Balance - Only for non-completed tasks */}
      {!isTaskCompleted && employeeAbsence && entitlement && (
        <>
          <div data-testid="vacation-balance-section">
            <h4 className="gba:font-semibold gba:mb-4 gba:text-lg">{t('section-vacation-balance')}</h4>
            <div className="gba:bg-muted gba:p-4 gba:rounded-lg gba:space-y-3">
              {/* Entitlement */}
              <div className="gba:flex gba:items-start gba:gap-3">
                <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                  {t('vacation-balance-entitlement')}:
                </span>
                <span className="gba:text-sm gba:flex-1 gba:font-medium">
                  {entitlement.total} {t('days-unit')}
                </span>
              </div>

              {/* Taken */}
              <div className="gba:flex gba:items-start gba:gap-3">
                <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                  {t('vacation-balance-taken')}:
                </span>
                <span className="gba:text-sm gba:flex-1">
                  {totalApprovedDays} {t('days-unit')}
                </span>
              </div>

              {/* Current balance */}
              <div className="gba:flex gba:items-start gba:gap-3">
                <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                  {t('vacation-balance-current')}:
                </span>
                <span className="gba:text-sm gba:flex-1 gba:font-medium gba:text-success">
                  {remainingBeforeRequest} {t('days-unit')}
                </span>
              </div>

              {/* Requested */}
              <div className="gba:flex gba:items-start gba:gap-3">
                <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                  {t('vacation-balance-requested')}:
                </span>
                <span className="gba:text-sm gba:flex-1 gba:font-medium gba:text-info">
                  {employeeAbsence.workingDays || 0} {t('days-unit')}
                </span>
              </div>

              {/* After approval */}
              <div className="gba:flex gba:items-start gba:gap-3">
                <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                  {t('vacation-balance-after-approval')}:
                </span>
                <span className="gba:text-sm gba:flex-1 gba:font-medium gba:text-primary">
                  {remainingAfterApproval} {t('days-unit')}
                </span>
              </div>

              {/* Other pending */}
              {totalPendingDays > 0 && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    {t('vacation-balance-pending')}:
                  </span>
                  <span className="gba:text-sm gba:flex-1 gba:font-medium gba:text-warning">
                    {totalPendingDays} {t('days-unit')}
                  </span>
                </div>
              )}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Approval Details - Only show when task is completed */}
      {isTaskCompleted && (
        <>
          {isLoadingApprovalData ? (
            <div className="gba:flex gba:justify-center gba:p-6">
              <Spinner size="lg" />
            </div>
          ) : (
            approvalStatus && (
              <div data-testid="approval-details-section">
                <h4 className="gba:font-semibold gba:mb-4 gba:text-lg">{t('section-approval-details')}</h4>
                <div className="gba:bg-muted gba:p-4 gba:rounded-lg gba:space-y-3">
                  {/* Status */}
                  <div className="gba:flex gba:items-start gba:gap-3">
                    <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                      {t('label-status')}:
                    </span>
                    <span
                      className={`gba:text-sm gba:flex-1 gba:font-medium ${
                        approvalStatus === 'APPROVED' ||
                        approvalStatus === 'APPROVED_BY_MANAGER' ||
                        approvalStatus === 'APPROVED_BY_HR'
                          ? 'gba:text-success'
                          : 'gba:text-destructive'
                      }`}
                    >
                      {approvalStatus === 'APPROVED' ||
                      approvalStatus === 'APPROVED_BY_MANAGER' ||
                      approvalStatus === 'APPROVED_BY_HR' ? (
                        <span className="gba:flex gba:items-center gba:gap-2">
                          <CheckCircle className="gba:h-4 gba:w-4" />
                          {t('status-approved')}
                        </span>
                      ) : (
                        <span className="gba:flex gba:items-center gba:gap-2">
                          <AlertCircle className="gba:h-4 gba:w-4" />
                          {t('status-rejected')}
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Approved By - Show approver name when available */}
                  {approverName && (
                    <div className="gba:flex gba:items-start gba:gap-3">
                      <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                        {t('label-approved-by')}:
                      </span>
                      <span className="gba:text-sm gba:flex-1">
                        {isLoadingApproverName ? <Spinner size="sm" /> : approverName}
                      </span>
                    </div>
                  )}

                  {/* Date */}
                  {approvalDate && (
                    <div className="gba:flex gba:items-start gba:gap-3">
                      <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                        {t('label-date')}:
                      </span>
                      <span className="gba:text-sm gba:flex-1">{formatDateTime(approvalDate, locale)}</span>
                    </div>
                  )}

                  {/* Comment - Show if there is a comment (regardless of status), or always show for rejected status */}
                  {(approvalNote?.trim() ||
                    approvalStatus === 'REJECTED' ||
                    approvalStatus === 'REJECTED_BY_MANAGER' ||
                    approvalStatus === 'REJECTED_BY_HR') && (
                    <>
                      {approvalDate && <Separator />}
                      <div className="gba:flex gba:items-start gba:gap-3">
                        <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                          {t('label-comment')}:
                        </span>
                        <span className="gba:text-sm gba:flex-1 gba:text-muted-foreground gba:whitespace-pre-wrap">
                          {approvalNote?.trim() ||
                            (approvalStatus === 'REJECTED' ||
                            approvalStatus === 'REJECTED_BY_MANAGER' ||
                            approvalStatus === 'REJECTED_BY_HR'
                              ? t('no-comment-provided')
                              : '')}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          )}
          {approvalStatus && <Separator />}
        </>
      )}

      {/* Vacation History - NEW */}
      {!isTaskCompleted && employeeAbsence && (
        <>
          <VacationHistory
            approvedAbsences={approvedAbsences}
            pendingAbsences={pendingAbsences}
            totalApprovedDays={totalApprovedDays}
            totalPendingDays={totalPendingDays}
            isLoading={isLoadingVacationMetrics}
            error={vacationMetricsError}
          />
          <Separator />
        </>
      )}

      {/* Employee Yearly Calendar - NEW */}
      {!isTaskCompleted && employeeAbsence && (
        <>
          <EmployeeYearlyCalendar
            accessToken={accessToken}
            employeeId={employeeAbsence.employeeId}
            currentRequestStartDate={employeeAbsence.startDate}
            currentRequestEndDate={employeeAbsence.endDate}
          />
          <Separator />
        </>
      )}

      {/* Team Absence Calendar with Dashboard Link */}
      {employeeAbsence?.startDate && employeeAbsence?.endDate && supervisorId && !isLoadingEmployee && (
        <>
          <div data-testid="team-absence-calendar-section">
            {/* Quick access link to full dashboard */}
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Users className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                <span className="gba:text-sm gba:text-muted-foreground">{t('team-absences-need-details')}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Use proper navigation utilities with URL mapping
                  const url = buildPlatformUrl('/platform/hr/absences/manager-absences', {
                    tab: 'team-calendar'
                  })
                  // Open in new window with security attributes
                  window.open(url, '_blank', 'noopener,noreferrer')
                }}
                data-testid="open-full-dashboard-button"
              >
                <span>{t('team-absences-full-dashboard')}</span>
                <ExternalLink className="gba:h-4 gba:w-4 gba:ml-2" />
              </Button>
            </div>

            {/* Team calendar component with its own header */}
            <TeamAbsenceCalendar
              accessToken={accessToken}
              supervisorId={supervisorId}
              startDate={employeeAbsence.startDate}
              endDate={employeeAbsence.endDate}
              currentAbsence={{
                employeeId: employeeAbsence.employeeId || employeeData?.id || '',
                employeeName: employeeData?.displayName || creatorName || t('unknown'),
                position: employeeData?.position || undefined,
                type: absenceTypeName,
                status: 'PENDING_APPROVAL'
              }}
            />
          </div>
          <Separator />
        </>
      )}

      {/* Comment Section - Only show for non-completed tasks */}
      {!isTaskCompleted && (
        <div ref={commentSectionRef} data-testid="comment-section">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
            <MessageSquare className="gba:h-4 gba:w-4" />
            <Label htmlFor="approval-comment" className="gba:text-sm gba:font-medium">
              {t('comment-label')}
            </Label>
            <Switch
              id="approval-comment"
              checked={showComment}
              onCheckedChange={checked => {
                setShowComment(checked)
                if (!checked) {
                  setComment('')
                }
              }}
              data-testid="comment-toggle"
            />
          </div>
          {showComment && (
            <Textarea
              rows={3}
              placeholder={t('comment-placeholder')}
              value={comment}
              onChange={e => setComment(e.target.value)}
              maxLength={500}
              className="gba:w-full"
              data-testid="approval-comment-input"
            />
          )}
        </div>
      )}
    </TaskFormLayout>
  )
}

export default ApproveEmployeeVacation
