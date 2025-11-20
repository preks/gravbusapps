/**
 * ChangePersonalDataReviewV2 Component
 * Modern form for reviewing personal data change requests from Kogito processes
 * Uses TaskDetailHeader and TaskDetailFooter for consistent HR form layout
 */

import React, { useState, useMemo } from 'react'
import { Separator, Alert, Badge, Textarea, Switch, Label, Spinner } from '@newwork/nw-design-system'
import { XCircle, CheckCircle, FileText, MessageSquare, AlertCircle } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { TaskDetailHeader } from '@/business-apps/platform/apps/every-box-2/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/platform/apps/every-box-2/components/TaskDetailFooter'
import { useChangeDataDetails } from './hooks/useChangeDataDetails'
import { formatDateTime } from '@/business-apps/platform/apps/every-box-2/utils/taskFormatters'
import dayjs from 'dayjs'

interface ChangePersonalDataReviewV2Props extends BusinessAppContextProps {
  onClose?: () => void
}

const ChangePersonalDataReviewV2: React.FC<ChangePersonalDataReviewV2Props> = ({
  accessToken,
  additionalData,
  onClose
}) => {
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Extract task data
  const taskPayload = additionalData?.psi_taskPayload || {}
  const processMetadata = additionalData?.psi_processMetadata || {}

  const taskStatus = additionalData?.psi_taskStatus || processMetadata?.status || 'IN_PROGRESS'
  const isTaskCompleted = taskStatus === 'COMPLETED'

  const taskTitle = processMetadata?.referenceTaskName || processMetadata?.nodeName || 'Review Personal Data Change'

  // Extract personal information changes
  const personalInformation = useMemo(() => {
    return taskPayload?.personalInformation || processMetadata?.inputs?.personalInformation || null
  }, [taskPayload, processMetadata])

  const oldPersonalInformation = useMemo(() => {
    return taskPayload?.oldPersonalInformation || processMetadata?.inputs?.oldPersonalInformation || null
  }, [taskPayload, processMetadata])

  // Fetch employee details
  const {
    employee,
    loading: employeeLoading,
    error: employeeError
  } = useChangeDataDetails(accessToken, personalInformation?.id || oldPersonalInformation?.id)

  // Convert employee data for header
  const employeeDataForHeader = useMemo(() => {
    if (!employee) return undefined

    return {
      displayName: employee.displayName || `${employee.firstName} ${employee.lastName}`,
      firstName: employee.firstName,
      lastName: employee.lastName,
      avatarUrl: employee.picture,
      position: employee.position
    }
  }, [employee])

  const taskSource: 'kogito' | 'cflow' = processMetadata?.source || 'kogito'

  // Extract approval data for completed tasks
  const taskOutputApprovalStatus = useMemo(() => {
    if (!isTaskCompleted) return null
    return processMetadata?.outputs?.approval || processMetadata?.approval || taskPayload?.approval || null
  }, [isTaskCompleted, processMetadata, taskPayload])

  const taskOutputApprovalNote = useMemo(() => {
    if (!isTaskCompleted) return null
    return (
      processMetadata?.outputs?.approvalNote ||
      processMetadata?.approvalNote ||
      taskPayload?.approvalNote ||
      processMetadata?.outputs?.comment ||
      null
    )
  }, [isTaskCompleted, processMetadata, taskPayload])

  const completedAt = processMetadata?.completedAt || (additionalData as any)?.psi_taskCompletedAt || null

  const handleApprove = async () => {
    setIsApproving(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      dispatchProcessContinueEvent('pse_submit', {
        approval: 'approved',
        approvalNote: comment || '',
        event: 'pse_submit'
      })

      setSuccessMessage('Personal data change approved successfully!')

      setTimeout(() => {
        // Platform will handle closing
      }, 1500)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to approve'
      setErrorMessage(`Failed to approve: ${errorMsg}`)
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!comment.trim()) {
      setErrorMessage('Please provide a reason for rejection')
      setShowComment(true)
      return
    }

    setIsRejecting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      dispatchProcessContinueEvent('pse_submit', {
        approval: 'rejected',
        approvalNote: comment,
        event: 'pse_submit'
      })

      setSuccessMessage('Personal data change rejected successfully!')

      setTimeout(() => {
        // Platform will handle closing
      }, 1500)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to reject'
      setErrorMessage(`Failed to reject: ${errorMsg}`)
    } finally {
      setIsRejecting(false)
    }
  }

  const handleCancel = () => {
    if (onClose) {
      onClose()
    } else {
      dispatchProcessContinueEvent('pse_pause', {})
    }
  }

  const isEveryBox2Context = !!onClose

  // Calculate changed fields count
  const changedFieldsCount = useMemo(() => {
    if (!personalInformation || !oldPersonalInformation) return 0

    let count = 0
    const fields = [
      'salutationRef',
      'title',
      'firstName',
      'lastName',
      'displayName',
      'preferredName',
      'birthName',
      'birthDate',
      'birthPlace',
      'genderRef',
      'nationalityRef',
      'languageRef',
      'maritalStatusRef',
      'severelyDisabilityDegree',
      'schoolQualificationRef'
    ]

    fields.forEach(field => {
      if (oldPersonalInformation[field] !== personalInformation[field]) {
        count++
      }
    })

    return count
  }, [personalInformation, oldPersonalInformation])

  // Helper function to render field changes - ONLY for changed fields
  const renderFieldChange = (label: string, oldValue: any, newValue: any, catalogLabels?: Record<string, string>) => {
    const oldDisplay = catalogLabels?.[oldValue] || oldValue || '-'
    const newDisplay = catalogLabels?.[newValue] || newValue || '-'
    const hasChanged = oldValue !== newValue

    // Return null if field hasn't changed (won't render)
    if (!hasChanged) {
      return null
    }

    return (
      <div
        className="gba:flex gba:items-start gba:gap-3"
        data-testid={`field-${label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[180px]">{label}:</span>
        <div className="gba:flex-1">
          <div className="gba:space-y-1">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-sm gba:text-muted-foreground gba:line-through">{oldDisplay}</span>
              <Badge variant="destructive" className="gba:text-xs">
                Old
              </Badge>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-sm gba:font-semibold">{newDisplay}</span>
              <Badge variant="success" className="gba:text-xs">
                New
              </Badge>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // If no data available
  if (!personalInformation && !oldPersonalInformation) {
    return (
      <div className="gba:flex gba:flex-col gba:h-full gba:relative" data-testid="change-personal-data-review-v2">
        <TaskDetailHeader
          title={taskTitle}
          status={taskStatus}
          source={taskSource}
          onClose={isEveryBox2Context ? handleCancel : undefined}
        />
        <div className="gba:flex-1 gba:overflow-y-auto gba:flex gba:items-center gba:justify-center gba:p-6">
          <Alert variant="destructive" data-testid="error-message">
            No personal data change information available
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:relative" data-testid="change-personal-data-review-v2">
      <TaskDetailHeader
        title={taskTitle}
        status={taskStatus}
        source={taskSource}
        showEmployeeInfo={true}
        employeeData={employeeDataForHeader}
        isLoadingEmployee={employeeLoading}
        onClose={isEveryBox2Context ? handleCancel : undefined}
      />

      <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-6 gba:min-h-0">
        {errorMessage && (
          <Alert variant="destructive" data-testid="error-message">
            {errorMessage}
          </Alert>
        )}

        {employeeError && (
          <Alert variant="destructive" data-testid="employee-error-message">
            {employeeError}
          </Alert>
        )}

        {employeeLoading ? (
          <div className="gba:flex gba:justify-center gba:p-6">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* Personal Information Changes */}
            {personalInformation && oldPersonalInformation && (
              <>
                <div data-testid="personal-data-changes-section">
                  <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
                    <h4 className="gba:font-semibold gba:text-lg">Requested Changes</h4>
                    <Badge variant="default" className="gba:text-xs gba:bg-info gba:text-info-foreground">
                      {changedFieldsCount} {changedFieldsCount === 1 ? 'field' : 'fields'} changed
                    </Badge>
                  </div>

                  {changedFieldsCount === 0 ? (
                    <div
                      className="gba:bg-info-secondary gba:border gba:border-info gba:rounded-lg gba:p-4"
                      data-testid="no-changes-message"
                    >
                      <p className="gba:text-sm gba:text-info-secondary-foreground">
                        No changes detected in personal data
                      </p>
                    </div>
                  ) : (
                    <div className="gba:bg-muted gba:p-4 gba:rounded-lg gba:space-y-3">
                      {/* Names Section */}
                      {renderFieldChange(
                        'Salutation',
                        oldPersonalInformation.salutationRef,
                        personalInformation.salutationRef
                      )}
                      {renderFieldChange('Title', oldPersonalInformation.title, personalInformation.title)}
                      {renderFieldChange('First Name', oldPersonalInformation.firstName, personalInformation.firstName)}
                      {renderFieldChange('Last Name', oldPersonalInformation.lastName, personalInformation.lastName)}
                      {renderFieldChange(
                        'Display Name',
                        oldPersonalInformation.displayName,
                        personalInformation.displayName
                      )}
                      {renderFieldChange(
                        'Preferred Name',
                        oldPersonalInformation.preferredName,
                        personalInformation.preferredName
                      )}
                      {renderFieldChange('Birth Name', oldPersonalInformation.birthName, personalInformation.birthName)}

                      <Separator />

                      {/* Birth and Gender Section */}
                      {renderFieldChange(
                        'Birth Date',
                        oldPersonalInformation.birthDate
                          ? dayjs(oldPersonalInformation.birthDate).format('MMM D, YYYY')
                          : '',
                        personalInformation.birthDate ? dayjs(personalInformation.birthDate).format('MMM D, YYYY') : ''
                      )}
                      {renderFieldChange(
                        'Birth Place',
                        oldPersonalInformation.birthPlace,
                        personalInformation.birthPlace
                      )}
                      {renderFieldChange('Gender', oldPersonalInformation.genderRef, personalInformation.genderRef)}

                      <Separator />

                      {/* Additional Information */}
                      {renderFieldChange(
                        'Nationality',
                        oldPersonalInformation.nationalityRef,
                        personalInformation.nationalityRef
                      )}
                      {renderFieldChange(
                        'Language',
                        oldPersonalInformation.languageRef,
                        personalInformation.languageRef
                      )}
                      {renderFieldChange(
                        'Marital Status',
                        oldPersonalInformation.maritalStatusRef,
                        personalInformation.maritalStatusRef
                      )}
                      {renderFieldChange(
                        'Disability Degree',
                        oldPersonalInformation.severelyDisabilityDegree,
                        personalInformation.severelyDisabilityDegree
                      )}
                      {renderFieldChange(
                        'School Qualification',
                        oldPersonalInformation.schoolQualificationRef,
                        personalInformation.schoolQualificationRef
                      )}
                    </div>
                  )}
                </div>

                {personalInformation.notes && (
                  <>
                    <Separator />
                    <div data-testid="notes-section">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
                        <FileText className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                        <span className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                          NOTES
                        </span>
                      </div>
                      <div className="gba:bg-card gba:border gba:border-border gba:rounded-lg gba:p-4">
                        <p className="gba:text-sm gba:text-foreground gba:whitespace-pre-wrap">
                          {personalInformation.notes}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <Separator />
              </>
            )}

            {/* Approval Details - Only for completed tasks */}
            {isTaskCompleted && taskOutputApprovalStatus && (
              <>
                <div data-testid="approval-details-section">
                  <h4 className="gba:font-semibold gba:mb-4 gba:text-lg">Approval Details</h4>
                  <div className="gba:bg-muted gba:p-4 gba:rounded-lg gba:space-y-3">
                    <div className="gba:flex gba:items-start gba:gap-3">
                      <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                        Status:
                      </span>
                      <span
                        className={`gba:text-sm gba:flex-1 gba:font-medium ${
                          taskOutputApprovalStatus === 'approved' || taskOutputApprovalStatus === 'APPROVED'
                            ? 'gba:text-success'
                            : 'gba:text-destructive'
                        }`}
                      >
                        {taskOutputApprovalStatus === 'approved' || taskOutputApprovalStatus === 'APPROVED' ? (
                          <span className="gba:flex gba:items-center gba:gap-2">
                            <CheckCircle className="gba:h-4 gba:w-4" />
                            Approved
                          </span>
                        ) : (
                          <span className="gba:flex gba:items-center gba:gap-2">
                            <AlertCircle className="gba:h-4 gba:w-4" />
                            Rejected
                          </span>
                        )}
                      </span>
                    </div>

                    {completedAt && (
                      <div className="gba:flex gba:items-start gba:gap-3">
                        <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                          Date:
                        </span>
                        <span className="gba:text-sm gba:flex-1">{formatDateTime(completedAt)}</span>
                      </div>
                    )}

                    {taskOutputApprovalNote?.trim() && (
                      <>
                        <Separator />
                        <div className="gba:flex gba:items-start gba:gap-3">
                          <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                            Comment:
                          </span>
                          <span className="gba:text-sm gba:flex-1 gba:text-muted-foreground gba:whitespace-pre-wrap">
                            {taskOutputApprovalNote.trim()}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Comment Section - Only for non-completed tasks */}
            {!isTaskCompleted && (
              <div data-testid="comment-section">
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
                  <MessageSquare className="gba:h-4 gba:w-4" />
                  <Label htmlFor="approval-comment" className="gba:text-sm gba:font-medium">
                    Add Comment (Required for rejection)
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
                    placeholder="Add your approval comment or rejection reason..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    maxLength={500}
                    className="gba:w-full"
                    data-testid="approval-comment-input"
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Footer */}
      {!isTaskCompleted && (
        <TaskDetailFooter
          data-testid="action-footer"
          actions={[
            {
              label: 'Cancel',
              onClick: handleCancel,
              variant: 'outline' as const,
              disabled: isRejecting || isApproving || !!successMessage,
              testId: 'cancel-button'
            },
            {
              label: 'Reject',
              onClick: handleReject,
              variant: 'destructive' as const,
              disabled: isRejecting || isApproving || !!successMessage,
              loading: isRejecting,
              icon: XCircle,
              testId: 'reject-button'
            },
            {
              label: 'Approve',
              onClick: handleApprove,
              variant: 'default' as const,
              disabled: isApproving || isRejecting || !!successMessage,
              loading: isApproving,
              icon: CheckCircle,
              className: 'gba:bg-success gba:text-success-foreground hover:gba:bg-success/90',
              testId: 'approve-button'
            }
          ]}
        />
      )}
    </div>
  )
}

export default ChangePersonalDataReviewV2
