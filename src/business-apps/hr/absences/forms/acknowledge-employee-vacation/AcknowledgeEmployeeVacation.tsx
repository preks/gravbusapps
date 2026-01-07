/**
 * AcknowledgeEmployeeVacation Component
 * Standalone form for HR team to acknowledge already-approved employee vacation requests
 * Based on ApproveEmployeeVacation with adapted UI for acknowledgment (no approve/reject actions)
 */

import React, { useState, useMemo } from 'react'
import { Separator, Spinner, Alert, useTranslation, useLocale } from '@newwork/nw-design-system'
import { CheckCircle, AlertCircle } from 'lucide-react'
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
import { formatDate } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'
import translations from './_i18n'

interface AcknowledgeEmployeeVacationProps extends BusinessAppContextProps {
  // Additional props from task payload
  onClose?: () => void // Optional callback to close the modal
}

const AcknowledgeEmployeeVacation: React.FC<AcknowledgeEmployeeVacationProps> = ({
  accessToken,
  additionalData,
  userInfo,
  onClose
}) => {
  const { t } = useTranslation(translations)
  const { locale } = useLocale()

  const [isAcknowledging, setIsAcknowledging] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Extract task data from additionalData
  const taskPayload = additionalData?.psi_taskPayload || {}
  const employeeAbsence = taskPayload?.employeeAbsence
  const creatorName = taskPayload?.creatorName as string | undefined
  const processMetadata = additionalData?.psi_processMetadata || {}

  // Extract task status
  const taskStatus = additionalData?.psi_taskStatus || processMetadata?.status || 'IN_PROGRESS'
  const isTaskCompleted = taskStatus === 'COMPLETED'

  // Get task title (translated)
  const taskTitle = t('task-title-acknowledge-vacation')

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

  // Extract requester info for chat (need userId, not employeeId!)
  // First try explicit fields from taskPayload, then fall back to fetched employee data userId
  const requesterUserId = (taskPayload as any)?.requester?.id || (taskPayload as any)?.creatorId || employeeData?.userId
  const requesterName =
    creatorName ||
    employeeData?.displayName ||
    `${employeeData?.firstName || ''} ${employeeData?.lastName || ''}`.trim()

  // Determine if this is a business trip (A101)
  const isBusinessTrip = employeeAbsence?.typeRef?.includes('A101')

  // Get supervisor ID for TeamAbsenceCalendar
  const supervisorId = userInfo?.employeeDetails?.employeeId

  // Extract approval data from employeeAbsence (already approved)
  const approvalStatus = employeeAbsence?.status || 'APPROVED'
  const approvalNote = employeeAbsence?.approvalNote || null
  const approverId = employeeAbsence?.approverId || null
  const absenceId = employeeAbsence?.id

  // Use generic hooks for approver name and entity dates
  const { approverName, isLoading: isLoadingApprover } = useApproverData({
    accessToken,
    approverId
  })

  const {
    createdAt: requestCreatedAt,
    updatedAt: approvalDate,
    isLoading: isLoadingDates
  } = useEntityDates({
    accessToken,
    entityId: absenceId,
    entityType: 'EmployeeAbsence'
  })

  const handleAcknowledge = async () => {
    setIsAcknowledging(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // Dispatch process continue event for acknowledgment
      dispatchProcessContinueEvent('pse_submit', {
        event: 'pse_submit'
      })

      setSuccessMessage(t('success-vacation-acknowledged'))

      // Allow time for user to see success message before closing
      setTimeout(() => {
        // Platform will handle closing the modal
      }, 1500)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t('error-failed-to-acknowledge')
      setErrorMessage(`${t('error-failed-to-acknowledge')}: ${errorMsg}`)
    } finally {
      setIsAcknowledging(false)
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

  // Prepare chat context (only if task is not completed and we have requester info)
  const chatWithRequester = useMemo(() => {
    const shouldShowChat = !isTaskCompleted && requesterUserId && employeeAbsence?.startDate && employeeAbsence?.endDate

    if (!shouldShowChat) {
      return undefined
    }

    const startDate =
      formatDate(employeeAbsence.startDate, 'date.short') || dayjs(employeeAbsence.startDate).format('MMM D')
    const endDate =
      formatDate(employeeAbsence.endDate, 'date.short') || dayjs(employeeAbsence.endDate).format('MMM D, YYYY')

    return {
      requesterId: requesterUserId,
      requesterName,
      prefilledMessage: t('chat-prefilled-message', {
        requesterName: requesterName || t('chat-fallback-name'),
        startDate,
        endDate
      }),
      taskContext: {
        taskType: 'vacation-acknowledgment',
        absenceId: employeeAbsence.id,
        startDate: employeeAbsence.startDate,
        endDate: employeeAbsence.endDate
      }
    }
  }, [
    isTaskCompleted,
    requesterUserId,
    requesterName,
    employeeAbsence?.startDate,
    employeeAbsence?.endDate,
    employeeAbsence?.id,
    t
  ])

  return (
    <TaskFormLayout
      data-testid="acknowledge-employee-vacation"
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
          chatWithRequester={chatWithRequester}
          onClose={isEveryBoxContext ? handleClose : undefined}
        />
      }
      footer={
        isTaskCompleted ? undefined : (
          <TaskDetailFooter
            data-testid="action-footer"
            actions={[
              {
                label: t('action-acknowledge'),
                onClick: handleAcknowledge,
                variant: 'default' as const,
                disabled: isAcknowledging || !!successMessage,
                loading: isAcknowledging,
                icon: CheckCircle,
                className: 'gba:bg-success gba:text-success-foreground hover:gba:bg-success/90',
                testId: 'acknowledge-button'
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
                  <span className="gba:text-sm gba:flex-1 gba:text-muted-foreground gba:whitespace-pre-wrap">
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
                    {isLoadingDates ? <Spinner size="sm" /> : formatDateTime(requestCreatedAt, locale)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Approval Details Section - Show who approved and when */}
      {approvalStatus && (
        <>
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
                      {approvalStatus}
                    </span>
                  )}
                </span>
              </div>

              {/* Approver Name - Show if available */}
              {(approverId || approverName) && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    {t('label-approved-by')}:
                  </span>
                  <span className="gba:text-sm gba:flex-1">
                    {isLoadingApprover ? <Spinner size="sm" /> : approverName || t('unknown')}
                  </span>
                </div>
              )}

              {/* Approval Date - Show when available */}
              {approvalDate && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    {t('label-approval-date')}:
                  </span>
                  <span className="gba:text-sm gba:flex-1">
                    {isLoadingDates ? <Spinner size="sm" /> : formatDateTime(approvalDate, locale)}
                  </span>
                </div>
              )}

              {/* Comment - Show if there is a comment */}
              {approvalNote?.trim() && (
                <>
                  <Separator />
                  <div className="gba:flex gba:items-start gba:gap-3">
                    <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                      {t('label-comment')}:
                    </span>
                    <span className="gba:text-sm gba:flex-1 gba:text-muted-foreground gba:whitespace-pre-wrap">
                      {approvalNote.trim()}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
          <Separator />
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
              status: approvalStatus
            }}
          />
          <Separator />
        </>
      )}
    </TaskFormLayout>
  )
}

export default AcknowledgeEmployeeVacation
