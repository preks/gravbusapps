/**
 * AcknowledgeEmployeeSickLeaveManagerV2 Component
 * Standalone form for acknowledging employee sick leave requests from Kogito processes
 * Based on ApproveEmployeeVacationV2 with adapted UI for sick leave acknowledgment
 */

import React, { useState } from 'react'
import { Separator, Spinner, Alert } from '@newwork/nw-design-system'
import { CheckCircle } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { useVacationApprovalData } from '../approve-employee-vacation-v2/hooks/useVacationApprovalData'
import { TeamAbsenceCalendar } from '@/business-apps/platform/apps/every-box/components/TeamAbsenceCalendar'
import { TaskDetailHeader } from '@/business-apps/platform/apps/every-box-2/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/platform/apps/every-box-2/components/TaskDetailFooter'
import dayjs from 'dayjs'

interface AcknowledgeEmployeeSickLeaveManagerV2Props extends BusinessAppContextProps {
  // Additional props from task payload
  onClose?: () => void // Optional callback to close the modal
}

const AcknowledgeEmployeeSickLeaveManagerV2: React.FC<AcknowledgeEmployeeSickLeaveManagerV2Props> = ({
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
  const employeeAbsence = taskPayload?.employeeAbsence as any
  const creatorName = taskPayload?.creatorName as string | undefined
  const processMetadata = additionalData?.psi_processMetadata || {}

  // Extract task status
  const taskStatus = additionalData?.psi_taskStatus || processMetadata?.status || 'IN_PROGRESS'
  const isTaskCompleted = taskStatus === 'COMPLETED'

  // Get task title from process metadata or use default
  const taskTitle = processMetadata?.referenceTaskName || processMetadata?.nodeName || 'Acknowledge Sick Leave'

  // Get task source from process metadata (fallback to 'kogito' if not available)
  // Source can be 'kogito' or 'cflow'
  // If source is not explicitly set, infer from endpoint (Kogito tasks have endpoint)
  const taskSource: 'kogito' | 'cflow' = processMetadata?.source || (processMetadata?.endpoint ? 'kogito' : 'kogito')

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

  // Detect if we're in every-box-2 context (has onClose callback)
  const isEveryBox2Context = !!onClose

  // Get submission date (use createdAt or startDate as fallback)
  const submissionDate = employeeAbsence?.createdAt || employeeAbsence?.startDate || null

  return (
    <div
      className="gba:flex gba:flex-col gba:h-full gba:relative"
      data-testid="acknowledge-employee-sick-leave-manager-v2"
    >
      {/* Task Header with Employee Info - Always full width, X button only in every-box-2 */}
      {/* Header uses absolute positioning to extend to edges of RemoteScreenLoader container */}
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
        onClose={isEveryBox2Context ? handleClose : undefined}
      />

      {/* Content with padding - matches header padding for alignment */}
      <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-6 gba:min-h-0">
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
                    <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                      Type:
                    </span>
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
                      {employeeAbsence.workingDays !== undefined
                        ? `${employeeAbsence.workingDays} ${employeeAbsence.workingDays === 1 ? 'day' : 'days'}`
                        : ''}
                      {employeeAbsence.workingDays !== undefined && employeeAbsence.workingHours !== undefined && ' '}
                      {employeeAbsence.workingHours !== undefined &&
                        `(${employeeAbsence.workingHours} ${employeeAbsence.workingHours === 1 ? 'hour' : 'hours'})`}
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
      </div>

      {/* Action Footer - Fixed at bottom */}
      {/* Only show Acknowledge button for non-completed tasks */}
      {!isTaskCompleted && (
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
      )}
    </div>
  )
}

export default AcknowledgeEmployeeSickLeaveManagerV2
