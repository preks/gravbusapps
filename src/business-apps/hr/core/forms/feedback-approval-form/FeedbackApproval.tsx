/**
 * FeedbackApproval Component
 * Standalone form for approving feedback requests from Kogito processes
 *
 * Refactored to use:
 * - TaskFormLayout: Proper layout wrapper with sticky header/footer
 * - Auto-fetching: TaskDetailHeader automatically fetches employee data
 */

import React, { useState, useMemo } from 'react'
import { Separator, Alert, Badge, Textarea, Switch, Label } from '@newwork/nw-design-system'
import { XCircle, CheckCircle, Calendar, Lock, Globe, MessageSquare, AlertCircle } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { formatDateTime } from '@/common/utils/dateFormatter'
import { useEntityDates } from '@/common/data/common/hooks/useEntityDates'
import { useApproverData } from '@/common/data/employee/hooks/useApproverData'
import dayjs from 'dayjs'

type AnyObject = Record<string, any>

interface FeedbackApprovalProps extends BusinessAppContextProps {
  // Additional props from task payload
  onClose?: () => void // Optional callback to close the modal
}

const FeedbackApproval: React.FC<FeedbackApprovalProps> = ({ accessToken, additionalData, onClose }) => {
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [isAccepting, setIsAccepting] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Extract task data from additionalData
  const taskPayload = additionalData?.psi_taskPayload || {}
  const processMetadata = additionalData?.psi_processMetadata || {}

  // Extract task status
  const taskStatus = additionalData?.psi_taskStatus || processMetadata?.status || 'IN_PROGRESS'
  const isTaskCompleted = taskStatus === 'COMPLETED'

  // Get task title from process metadata or use default
  const taskTitle = processMetadata?.referenceTaskName || processMetadata?.nodeName || 'Approve Feedback'

  // Extract feedback data from the actual structure
  // Data structure:
  // - psi_taskPayload = task.sourceMetadata.inputs (which contains feedback object)
  // - psi_processMetadata = task.sourceMetadata (which also contains inputs)
  // So feedback is in: psi_taskPayload.feedback OR psi_processMetadata.inputs.feedback
  const feedbackData = useMemo(() => {
    const psiTaskPayload = (additionalData as AnyObject)?.psi_taskPayload || {}
    const processMetadata = additionalData?.psi_processMetadata || {}

    // Try psi_taskPayload.feedback first (this is task.sourceMetadata.inputs.feedback)
    // Then try psi_processMetadata.inputs.feedback as fallback
    const feedback = psiTaskPayload?.feedback || processMetadata?.inputs?.feedback

    if (!feedback) {
      return null
    }

    return {
      id: feedback.id,
      text: feedback.feedback,
      feedbackDate: feedback.feedbackDate,
      senderEmployeeId: feedback.senderEmployeeId,
      employeeId: feedback.employeeId,
      typeRef: feedback.typeRef,
      // Use feedbackPublic (from Kogito) or fallback to public
      public: feedback.feedbackPublic !== undefined ? feedback.feedbackPublic : feedback.public,
      // Include approverId for completed task lookup
      approverId: feedback.approverId as string | undefined
    }
  }, [additionalData])

  // NOTE: No need to manually fetch employee data anymore!
  // TaskDetailHeader will auto-fetch using employeeId prop + accessToken

  // Use generic hooks for entity dates (request created)
  const { createdAt: requestCreatedAt, isLoading: isLoadingRequestDate } = useEntityDates({
    accessToken,
    entityId: feedbackData?.id,
    entityType: 'Feedback'
  })

  // For completed tasks, fetch approver name (assuming feedback has approverId field)
  const { approverName, isLoading: isLoadingApproverName } = useApproverData({
    accessToken,
    approverId: isTaskCompleted && feedbackData ? feedbackData.approverId : null
  })

  // Format feedback date
  const formattedDate = feedbackData?.feedbackDate
    ? dayjs(feedbackData.feedbackDate).format('MMMM D, YYYY [at] h:mm A')
    : null

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

    // Check inputs (fallback)
    if (processMetadata?.inputs?.approval) {
      return processMetadata.inputs.approval
    }

    return null
  }, [isTaskCompleted, processMetadata, taskPayload])

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

    // Check inputs (fallback)
    if (processMetadata?.inputs?.approvalNote) {
      return processMetadata.inputs.approvalNote
    }

    // Check for comment field (alternative name)
    if (processMetadata?.outputs?.comment) {
      return processMetadata.outputs.comment
    }

    if (processMetadata?.inputs?.comment) {
      return processMetadata.inputs.comment
    }

    return null
  }, [isTaskCompleted, processMetadata, taskPayload])

  const completedAt = processMetadata?.completedAt || (additionalData as AnyObject)?.psi_taskCompletedAt || null

  const handleAccept = async () => {
    setIsAccepting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // Dispatch process continue event - same structure as ApproveFeedbackDetails
      dispatchProcessContinueEvent('pse_submit', {
        approval: 'approved',
        comment: comment || undefined,
        event: 'pse_submit'
      })

      setSuccessMessage('Feedback approved successfully!')

      // Allow time for user to see success message before closing
      setTimeout(() => {
        // Platform will handle closing the modal
      }, 1500)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to approve'
      setErrorMessage(`Failed to approve: ${errorMsg}`)
    } finally {
      setIsAccepting(false)
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
      // Dispatch process continue event - same structure as ApproveFeedbackDetails
      dispatchProcessContinueEvent('pse_submit', {
        approval: 'rejected',
        comment: comment,
        event: 'pse_submit'
      })

      setSuccessMessage('Feedback rejected successfully!')

      // Allow time for user to see success message before closing
      setTimeout(() => {
        // Platform will handle closing the modal
      }, 1500)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to reject'
      setErrorMessage(`Failed to reject: ${errorMsg}`)
    } finally {
      setIsRejecting(false)
    }
  }

  const handleCancel = () => {
    // Simply close the modal using the onClose callback if available
    // This avoids aborting the process - just closes the UI
    if (onClose) {
      onClose()
    } else {
      // Fallback: if onClose is not provided, use pse_pause (shouldn't happen in normal flow)
      dispatchProcessContinueEvent('pse_pause', {})
    }
  }

  // Detect if we're in every-box context (has onClose callback)
  const isEveryBoxContext = !!onClose

  // If we don't have feedback data, show error
  if (!feedbackData) {
    return (
      <TaskFormLayout
        data-testid="feedback-approval"
        header={<TaskDetailHeader title={taskTitle} onClose={isEveryBoxContext ? handleCancel : undefined} />}
      >
        <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
          <Alert variant="destructive" data-testid="error-message">
            No feedback data available
          </Alert>
        </div>
      </TaskFormLayout>
    )
  }

  return (
    <TaskFormLayout
      data-testid="feedback-approval"
      header={
        <TaskDetailHeader
          title={taskTitle}
          showEmployeeInfo={true}
          employeeId={feedbackData.senderEmployeeId}
          accessToken={accessToken}
          onClose={isEveryBoxContext ? handleCancel : undefined}
        />
      }
      footer={
        // Action Footer - Only show when task is not completed
        !isTaskCompleted ? (
          <TaskDetailFooter
            data-testid="action-footer"
            actions={[
              {
                label: 'Cancel',
                onClick: handleCancel,
                variant: 'outline' as const,
                disabled: isRejecting || isAccepting || !!successMessage,
                testId: 'cancel-button'
              },
              {
                label: 'Reject',
                onClick: handleReject,
                variant: 'destructive' as const,
                disabled: isRejecting || isAccepting || !!successMessage,
                loading: isRejecting,
                icon: XCircle,
                testId: 'reject-button'
              },
              {
                label: 'Accept',
                onClick: handleAccept,
                variant: 'default' as const,
                disabled: isAccepting || isRejecting || !!successMessage,
                loading: isAccepting,
                icon: CheckCircle,
                className: 'gba:bg-success gba:text-success-foreground hover:gba:bg-success/90',
                testId: 'accept-button'
              }
            ]}
          />
        ) : undefined
      }
      contentClassName="gba:space-y-6"
    >
      {/* Error Messages */}
      {errorMessage && (
        <Alert variant="destructive" data-testid="error-message">
          {errorMessage}
        </Alert>
      )}

      {/* Feedback Details */}
      {feedbackData && (
        <>
          <div data-testid="feedback-details-section">
            <h4 className="gba:font-semibold gba:mb-4 gba:text-lg">Feedback Details</h4>

            {/* SECTION 1: Meta Information (Date + Visibility) */}
            <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:mb-6">
              {/* Date Card */}
              {formattedDate && (
                <div className="gba:bg-muted gba:border gba:border-border gba:rounded-lg gba:p-4">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                    <Calendar className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                    <span className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                      DATE
                    </span>
                  </div>
                  <p className="gba:text-sm gba:font-semibold gba:text-foreground gba:leading-tight">{formattedDate}</p>
                </div>
              )}

              {/* Visibility Card */}
              {feedbackData.public !== undefined && (
                <div className="gba:bg-muted gba:border gba:border-border gba:rounded-lg gba:p-4">
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                    {feedbackData.public ? (
                      <Globe className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                    ) : (
                      <Lock className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                    )}
                    <span className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                      VISIBILITY
                    </span>
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    {feedbackData.public ? (
                      <Badge variant="default" className="gba:bg-blue-500 gba:text-white gba:font-semibold">
                        <Globe className="gba:h-3 gba:w-3 gba:mr-1" />
                        Public
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gba:font-semibold">
                        <Lock className="gba:h-3 gba:w-3 gba:mr-1" />
                        Private
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: Feedback Content */}
            <div>
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
                <MessageSquare className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                <span className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide">
                  FEEDBACK
                </span>
              </div>
              <div className="gba:bg-card gba:border gba:border-border gba:rounded-lg gba:p-5">
                <p className="gba:text-sm gba:text-foreground gba:whitespace-pre-wrap gba:leading-relaxed">
                  {feedbackData.text || 'No feedback text available'}
                </p>
              </div>
            </div>

            {/* Request Created - Show when available */}
            {requestCreatedAt && (
              <div className="gba:mt-6">
                <div className="gba:bg-muted gba:border gba:border-border gba:rounded-lg gba:p-4">
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">Request Created</span>
                    <span className="gba:text-sm gba:font-semibold gba:text-foreground">
                      {isLoadingRequestDate ? '...' : formatDateTime(requestCreatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <Separator />
        </>
      )}

      {/* Approval Details - Only show when task is completed */}
      {isTaskCompleted && taskOutputApprovalStatus && (
        <>
          <div data-testid="approval-details-section">
            <h4 className="gba:font-semibold gba:mb-4 gba:text-lg">Approval Details</h4>
            <div className="gba:bg-muted gba:p-4 gba:rounded-lg gba:space-y-3">
              {/* Approval Status */}
              <div className="gba:flex gba:items-start gba:gap-3">
                <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                  Approval Status:
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

              {/* Approved By - Show approver name when available */}
              {approverName && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    Approved By:
                  </span>
                  <span className="gba:text-sm gba:flex-1">{isLoadingApproverName ? '...' : approverName}</span>
                </div>
              )}

              {/* Approval Time */}
              {completedAt && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    Approval Time:
                  </span>
                  <span className="gba:text-sm gba:flex-1">{dayjs(completedAt).format('MMM D, YYYY [at] h:mm A')}</span>
                </div>
              )}

              {/* Approval Comment - Only show if there is a comment */}
              {taskOutputApprovalNote?.trim() && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                    Approval Comment:
                  </span>
                  <span className="gba:text-sm gba:flex-1 gba:text-muted-foreground">
                    {taskOutputApprovalNote.trim()}
                  </span>
                </div>
              )}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Comment Section - Only show for non-completed tasks */}
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
    </TaskFormLayout>
  )
}

export default FeedbackApproval
