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
  useLocale
} from '@newwork/nw-design-system'
import { ThumbsUp, XCircle, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { useVacationApprovalData } from './hooks/useVacationApprovalData'
import { env } from '@/common/env/EnvUtils'
import { TeamAbsenceCalendar } from '@/business-apps/core/every/apps/every-box/components/TeamAbsenceCalendar'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { useEntityDates } from '@/common/data/common/hooks/useEntityDates'
import { useApproverData } from '@/common/data/employee/hooks/useApproverData'
import { formatWorkingDaysAndHours } from '@/business-apps/hr/absences/utils/formatters'
import { formatDateTime } from '@/common/utils/dateFormatter'
import { ExtendedAdditionalData } from '@/business-apps/hr/absences/types/taskTypes'
import { useApprovalData } from '@/business-apps/hr/absences/hooks/useApprovalData'
import dayjs from 'dayjs'
import translations from './_i18n'

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
      const base64 = tokenParts[1].replaceAll('-', '+').replaceAll('_', '/')
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

  // Determine if this is a business trip (A101)
  const isBusinessTrip = employeeAbsence?.typeRef?.includes('A101')

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
                  </span>
                </div>
              )}

              {/* Remaining Balance (not for business trips) */}
              {employeeAbsence.balance !== undefined && !isBusinessTrip && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    {t('label-remaining-balance')}:
                  </span>
                  <span className="gba:text-sm gba:flex-1 gba:font-medium gba:text-success">
                    {t('balance-days', { balance: employeeAbsence.balance })}
                  </span>
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

              {/* Request Created - Show when available */}
              {requestCreatedAt && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    {t('label-request-created')}:
                  </span>
                  <span className="gba:text-sm gba:flex-1">
                    {isLoadingRequestDate ? <Spinner size="sm" /> : formatDateTime(requestCreatedAt, locale)}
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

      {/* Team Absence Calendar - Show team coverage during this absence period */}
      {employeeAbsence?.startDate && employeeAbsence?.endDate && supervisorId && !isLoadingEmployee && (
        <>
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
