/**
 * ApproveEmployeeWorkLeave Component
 * Standalone form for approving employee work leave requests from Kogito processes
 * Based on ApproveEmployeeVacation with adapted UI for work leave approval
 */

import React, { useState, useEffect, useMemo, useRef } from 'react'
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
import { useVacationApprovalData } from '../approve-employee-vacation/hooks/useVacationApprovalData'
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
import translations from './_i18n'

interface ApproveEmployeeWorkLeaveProps extends BusinessAppContextProps {
  // Additional props from task payload
  onClose?: () => void // Optional callback to close the modal
}

const ApproveEmployeeWorkLeave: React.FC<ApproveEmployeeWorkLeaveProps> = ({
  accessToken,
  additionalData,
  userInfo,
  onClose
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
  const taskTitle = t('task-title-approve-work-leave')

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

  // Extract approval data from task outputs/inputs (for completed tasks)
  const taskOutputApprovalStatus = useMemo(() => {
    if (!isTaskCompleted) return null

    // Check outputs first (most reliable for completed tasks)
    if (processMetadata?.outputs?.approval) {
      return processMetadata.outputs.approval
    }

    // Check if stored directly in processMetadata
    if (processMetadata?.approval) {
      return processMetadata.approval
    }

    // Check taskPayload
    if (taskPayload?.approval) {
      return taskPayload.approval
    }

    // Check formData
    if (extendedAdditionalData?.formData?.approval) {
      return extendedAdditionalData.formData.approval
    }

    return null
  }, [isTaskCompleted, processMetadata, taskPayload, additionalData])

  const taskOutputApprovalNote = useMemo(() => {
    if (!isTaskCompleted) return null

    // Check outputs first
    if (processMetadata?.outputs?.approvalNote) {
      return processMetadata.outputs.approvalNote
    }

    // Check if stored directly in processMetadata
    if (processMetadata?.approvalNote) {
      return processMetadata.approvalNote
    }

    // Check taskPayload
    if (taskPayload?.approvalNote) {
      return taskPayload.approvalNote
    }

    // Check formData
    if (extendedAdditionalData?.formData?.approvalNote) {
      return extendedAdditionalData.formData.approvalNote
    }

    return null
  }, [isTaskCompleted, processMetadata, taskPayload, additionalData])

  const completedAt = processMetadata?.completedAt || extendedAdditionalData?.psi_taskCompletedAt || null

  // Use custom hook for data fetching (reuse from vacation approval)
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

  const handleApprove = async () => {
    setIsApproving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // Dispatch process continue event
      dispatchProcessContinueEvent('pse_submit', {
        approval: 'APPROVED',
        approvalNote: comment || '',
        event: 'pse_submit'
      })

      setSuccessMessage(t('success-work-leave-approved'))

      // Allow time for user to see success message before closing
      setTimeout(() => {
        // Platform will handle closing the modal
      }, 1500)
    } catch (err) {
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
      // Dispatch process continue event
      dispatchProcessContinueEvent('pse_submit', {
        approval: 'REJECTED',
        approvalNote: comment,
        event: 'pse_submit'
      })

      setSuccessMessage(t('success-work-leave-rejected'))

      // Allow time for user to see success message before closing
      setTimeout(() => {
        // Platform will handle closing the modal
      }, 1500)
    } catch (err) {
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
      data-testid="approve-employee-work-leave"
      header={
        <TaskDetailHeader
          title={taskTitle}
          showEmployeeInfo={true}
          employeeData={
            employeeData
              ? {
                  displayName: employeeData.displayName,
                  firstName: employeeData.firstName,
                  lastName: employeeData.lastName,
                  avatarUrl: employeeData.avatarUrl,
                  position: employeeData.position
                }
              : undefined
          }
          isLoadingEmployee={isLoadingEmployee}
          creatorName={creatorName}
          onClose={isEveryBoxContext ? handleClose : undefined}
        />
      }
      footer={
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

      {/* Request Details */}
      {employeeAbsence && typeof employeeAbsence === 'object' && (
        <>
          <div data-testid="request-details-section">
            <h4 className="gba:font-semibold gba:mb-4 gba:text-lg">{t('section-request-details')}</h4>
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

              {/* Working Days */}
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

                  {/* Comment - Only show if there is a comment */}
                  {approvalNote?.trim() && (
                    <div className="gba:flex gba:items-start gba:gap-3">
                      <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                        {t('label-comment')}:
                      </span>
                      <span className="gba:text-sm gba:flex-1 gba:text-muted-foreground">{approvalNote.trim()}</span>
                    </div>
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

export default ApproveEmployeeWorkLeave
