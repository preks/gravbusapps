/**
 * AcknowledgeEmployeeSickLeaveHR Component
 * Standalone form for acknowledging employee sick leave requests by HR team
 * Based on AcknowledgeEmployeeSickLeaveManager with adapted UI for HR acknowledgment
 */

import React, { useState } from 'react'
import { Separator, Spinner, Alert } from '@newwork/nw-design-system'
import { CheckCircle } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { useVacationApprovalData } from '../approve-employee-vacation/hooks/useVacationApprovalData'
import { TeamAbsenceCalendar } from '@/business-apps/core/every/apps/every-box/components/TeamAbsenceCalendar'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { formatDateTime } from '@/business-apps/core/every/apps/every-box/utils/taskFormatters'
import { useEntityDates } from '@/common/data/common/hooks/useEntityDates'
import dayjs from 'dayjs'

/**
 * Formats working days and hours into a readable string
 */
const formatWorkingDaysAndHours = (workingDays?: number, workingHours?: number): string => {
  const parts: string[] = []

  if (workingDays !== undefined) {
    parts.push(`${workingDays} ${workingDays === 1 ? 'day' : 'days'}`)
  }

  if (workingHours !== undefined) {
    const hoursText = `(${workingHours} ${workingHours === 1 ? 'hour' : 'hours'})`
    if (parts.length > 0) {
      parts.push(` ${hoursText}`)
    } else {
      parts.push(hoursText)
    }
  }

  return parts.join('')
}

interface AcknowledgeEmployeeSickLeaveHRProps extends BusinessAppContextProps {
  // Additional props from task payload
  onClose?: () => void // Optional callback to close the modal
}

const AcknowledgeEmployeeSickLeaveHR: React.FC<AcknowledgeEmployeeSickLeaveHRProps> = ({
  accessToken,
  additionalData,
  userInfo,
  onClose
}) => {
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

  // Get task title from process metadata or use default
  const taskTitle = processMetadata?.referenceTaskName || processMetadata?.nodeName || 'Acknowledge Sick Leave'

  // Use generic hooks for entity dates (request created)
  const { createdAt: requestCreatedAt, isLoading: isLoadingRequestDate } = useEntityDates({
    accessToken,
    entityId: employeeAbsence?.id,
    entityType: 'EmployeeAbsence'
  })

  // Get task source from process metadata (fallback to 'kogito' if not available)
  const taskSource: 'kogito' | 'cflow' = processMetadata?.source || 'kogito'

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

  // Get supervisor ID for TeamAbsenceCalendar (HR can view team calendar)
  const supervisorId = userInfo?.employeeDetails?.employeeId

  const handleAcknowledge = async () => {
    setIsAcknowledging(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // Dispatch process continue event for acknowledgment
      dispatchProcessContinueEvent('pse_submit', {
        event: 'pse_submit'
      })

      setSuccessMessage('Sick leave acknowledged successfully!')

      // Allow time for user to see success message before closing
      setTimeout(() => {
        // Platform will handle closing the modal
      }, 1500)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to acknowledge'
      setErrorMessage(`Failed to acknowledge: ${errorMsg}`)
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

  // Get submission date (use createdAt or startDate as fallback)
  const submissionDate = employeeAbsence?.createdAt || employeeAbsence?.startDate || null

  return (
    <TaskFormLayout
      data-testid="acknowledge-employee-sick-leave-hr"
      header={
        <TaskDetailHeader
          title={taskTitle}
          status={taskStatus}
          source={taskSource}
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
                label: 'Acknowledge',
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

      {/* Request Details */}
      {employeeAbsence && typeof employeeAbsence === 'object' && (
        <>
          <div data-testid="request-details-section">
            <h4 className="gba:font-semibold gba:mb-4 gba:text-lg">Request Details</h4>
            <div className="gba:bg-muted gba:p-4 gba:rounded-lg gba:space-y-3">
              {/* Type */}
              {absenceTypeName && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">Type:</span>
                  <span className="gba:text-sm gba:flex-1">{absenceTypeName}</span>
                </div>
              )}

              {/* Submission Date */}
              {submissionDate && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    Submission Date:
                  </span>
                  <span className="gba:text-sm gba:flex-1">{dayjs(submissionDate).format('MMM D, YYYY')}</span>
                </div>
              )}

              {/* Absence Duration */}
              {employeeAbsence.startDate && employeeAbsence.endDate && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    Absence Duration:
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
                    Working Days:
                  </span>
                  <span className="gba:text-sm gba:flex-1">
                    {formatWorkingDaysAndHours(employeeAbsence.workingDays, employeeAbsence.workingHours)}
                  </span>
                </div>
              )}

              {/* Substitute Employee - Only show if there is a substitute */}
              {employeeAbsence.substituteEmployee && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    Substitute:
                  </span>
                  <span className="gba:text-sm gba:flex-1 gba:text-muted-foreground">
                    {isLoadingSubstitute ? <Spinner size="sm" /> : substituteEmployeeName || 'Loading...'}
                  </span>
                </div>
              )}

              {/* Description - Only show if there is a description */}
              {employeeAbsence.description?.trim() && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    Description:
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
                    Request Created:
                  </span>
                  <span className="gba:text-sm gba:flex-1">
                    {isLoadingRequestDate ? <Spinner size="sm" /> : formatDateTime(requestCreatedAt)}
                  </span>
                </div>
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
              employeeName: employeeData?.displayName || creatorName || 'Unknown',
              position: employeeData?.position || undefined,
              type: absenceTypeName,
              status: 'PENDING_APPROVAL'
            }}
          />
          <Separator />
        </>
      )}
    </TaskFormLayout>
  )
}

export default AcknowledgeEmployeeSickLeaveHR
