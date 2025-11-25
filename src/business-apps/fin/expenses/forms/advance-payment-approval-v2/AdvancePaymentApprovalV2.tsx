import React, { useState, useEffect, useMemo } from 'react'
import { Spinner, Alert, AlertTitle, AlertDescription, Badge, Switch, Textarea, Label } from '@newwork/nw-design-system'
import { ThumbsUp, XCircle, MessageSquare } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TaskDetailHeader } from '@/business-apps/platform/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/platform/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/platform/apps/every-box/components/TaskFormLayout'
import { useAdvancePaymentData } from './hooks/useAdvancePaymentData'
import { useEntityDates } from '@/business-apps/common/hooks/useEntityDates'
import { useApproverData } from '@/business-apps/common/hooks/useApproverData'

// Component imports
import { AdvancePaymentDetailsSection, ExpensePlanInfoSection, ApprovalDetailsSection } from './components'

interface AdvancePaymentApprovalV2Props extends BusinessAppContextProps {
  onClose?: () => void
}

const AdvancePaymentApprovalV2Content: React.FC<AdvancePaymentApprovalV2Props> = ({
  accessToken,
  additionalData,
  userInfo,
  onClose
}) => {
  // Extract paymentId from additionalData or URL parameters
  const paymentId =
    additionalData?.paymentId ||
    additionalData?.psi_taskPayload?.advancePayment?.id ||
    new URLSearchParams(window.location.search).get('paymentId')

  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')

  const { advancePayment, loading, error, refetch } = useAdvancePaymentData({ paymentId, accessToken })

  // Extract task metadata
  const taskPayload = additionalData?.psi_taskPayload || {}
  const processMetadata = additionalData?.psi_processMetadata || {}
  const taskStatus = additionalData?.psi_taskStatus || processMetadata?.status || 'IN_PROGRESS'
  const taskCompletedAt = processMetadata?.completedAt || (additionalData as any)?.psi_taskCompletedAt
  // Task is completed if status is COMPLETED OR if completedAt exists (matching InboxView logic)
  const isTaskCompleted = taskStatus === 'COMPLETED' || !!taskCompletedAt
  const taskTitle =
    processMetadata?.referenceTaskName ||
    processMetadata?.nodeName ||
    getTranslationFromI18nKeyAndLabel('lowcoder:approve_advance_payment.title', 'Approve Advance Payment')
  const taskSource: 'kogito' | 'cflow' = processMetadata?.source || (processMetadata?.endpoint ? 'kogito' : 'kogito')
  const creatorName = taskPayload?.creatorName as string | undefined

  // Use generic hooks for entity dates (request created)
  const { createdAt: requestCreatedAt, isLoading: isLoadingRequestDate } = useEntityDates({
    accessToken,
    entityId: advancePayment?.id,
    entityType: 'AdvancePayment'
  })

  // For completed tasks, fetch approver name
  const { approverName, isLoading: isLoadingApproverName } = useApproverData({
    accessToken,
    approverId: isTaskCompleted ? advancePayment?.approverId : null
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
    if ((additionalData as any)?.formData?.approval) {
      return (additionalData as any).formData.approval
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
    if ((additionalData as any)?.formData?.approvalNote) {
      return (additionalData as any).formData.approvalNote
    }

    return null
  }, [isTaskCompleted, processMetadata, taskPayload, additionalData])

  const completedAt = processMetadata?.completedAt || (additionalData as any)?.psi_taskCompletedAt || null

  // Extract approval data from advancePaymentComment (for completed tasks)
  const approvalCommentFromPayment = useMemo(() => {
    if (
      !isTaskCompleted ||
      !advancePayment?.advancePaymentComment ||
      advancePayment.advancePaymentComment.length === 0
    ) {
      return null
    }

    // Find the most recent APPROVE_COMMENT or REJECT_COMMENT
    const approvalComment = advancePayment.advancePaymentComment.find(
      comment => comment.commentType === 'APPROVE_COMMENT' || comment.commentType === 'REJECT_COMMENT'
    )

    return approvalComment?.comment || null
  }, [isTaskCompleted, advancePayment?.advancePaymentComment])

  const approvalDateFromPayment = useMemo(() => {
    if (
      !isTaskCompleted ||
      !advancePayment?.advancePaymentComment ||
      advancePayment.advancePaymentComment.length === 0
    ) {
      return null
    }

    // Find the most recent APPROVE_COMMENT or REJECT_COMMENT
    const approvalComment = advancePayment.advancePaymentComment.find(
      comment => comment.commentType === 'APPROVE_COMMENT' || comment.commentType === 'REJECT_COMMENT'
    )

    return approvalComment?.commentDate || null
  }, [isTaskCompleted, advancePayment?.advancePaymentComment])

  // Determine approval status from advance payment status or task outputs
  const approvalStatus = useMemo(() => {
    if (!isTaskCompleted) return null

    // Priority order:
    // 1. Task outputs (most reliable for completed tasks)
    // 2. AdvancePayment.status (but only if it's an approval status, not PENDING)
    if (taskOutputApprovalStatus) {
      return taskOutputApprovalStatus
    }

    // Only use advancePayment.status if it's an actual approval status (APPROVED, REJECTED, etc.)
    // Don't use PENDING as that's the initial status, not an approval status
    if (advancePayment?.status && advancePayment.status !== 'PENDING') {
      return advancePayment.status
    }

    // If we have approval comments, infer status from comment type
    if (advancePayment?.advancePaymentComment && advancePayment.advancePaymentComment.length > 0) {
      const approvalComment = advancePayment.advancePaymentComment.find(
        comment => comment.commentType === 'APPROVE_COMMENT' || comment.commentType === 'REJECT_COMMENT'
      )
      if (approvalComment) {
        if (approvalComment.commentType === 'APPROVE_COMMENT') {
          return 'APPROVED'
        }
        if (approvalComment.commentType === 'REJECT_COMMENT') {
          return 'REJECTED'
        }
      }
    }

    return null
  }, [isTaskCompleted, taskOutputApprovalStatus, advancePayment?.status, advancePayment?.advancePaymentComment])

  // Determine approval comment (priority: task outputs > advancePaymentComment)
  const approvalComment = taskOutputApprovalNote || approvalCommentFromPayment

  // Determine approval date (priority: completedAt > advancePaymentComment date)
  const approvalDate = completedAt || approvalDateFromPayment

  // Detect if we're in every-box context (has onClose callback)
  const isEveryBoxContext = !!onClose

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      dispatchProcessContinueEvent('pse_abort', {
        event: 'pse_abort'
      })
    }
  }

  // Handle modal close events to prevent task removal
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        dispatchProcessContinueEvent('pse_cancel', {
          event: 'pse_cancel',
          pso_exitStrategy: 'cancel',
          pso_completeNotification: {
            type: 'info',
            messageKey: 'The approval process has been canceled.'
          }
        })
      } catch (err) {
        console.error('Error canceling process:', err)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  const handleApprove = async () => {
    if (!paymentId) {
      return
    }

    setIsApproving(true)
    try {
      const approvalPayload = {
        event: 'pse_approve',
        advancePaymentComment: {
          commentDate: new Date().toISOString().slice(0, 19),
          comment: showComment && comment.trim() ? comment.trim() : '',
          commentType: 'APPROVE_COMMENT',
          authorEmployee: userInfo?.employeeDetails?.employeeId,
          advancePayment: paymentId
        }
      }

      dispatchProcessContinueEvent('pse_approve', approvalPayload)

      // Refresh data after successful approval
      setTimeout(() => {
        refetch()
      }, 500)
    } catch (err) {
      console.error('Error approving advance payment:', err)
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!paymentId) {
      return
    }

    // Require comment for rejection
    if (!comment.trim()) {
      setShowComment(true)
      return
    }

    setIsRejecting(true)
    try {
      const rejectionPayload = {
        event: 'pse_reject',
        advancePaymentComment: {
          commentDate: new Date().toISOString().slice(0, 19),
          comment: comment.trim(),
          commentType: 'REJECT_COMMENT',
          authorEmployee: userInfo?.employeeDetails?.employeeId,
          advancePayment: paymentId
        }
      }

      dispatchProcessContinueEvent('pse_reject', rejectionPayload)

      // Refresh data after successful rejection
      setTimeout(() => {
        refetch()
      }, 500)
    } catch (err) {
      console.error('Error rejecting advance payment:', err)
    } finally {
      setIsRejecting(false)
    }
  }

  if (loading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]"
        data-testid="advance-payment-approval-v2-loading"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="advance-payment-approval-v2-error">
        <AlertTitle>Error Loading Advance Payment</AlertTitle>
        <AlertDescription>
          {error}
          <button
            onClick={refetch}
            className="gba:mt-2 gba:px-3 gba:py-1 gba:bg-destructive gba:text-destructive-foreground gba:rounded gba:text-sm"
          >
            Retry
          </button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!advancePayment) {
    return (
      <Alert data-testid="advance-payment-approval-v2-no-data">
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>Advance payment not found</AlertDescription>
      </Alert>
    )
  }

  // Get status display
  const getStatusDisplay = (status?: string) => {
    if (!status) return { label: 'Pending', variant: 'default' as const }
    const statusLower = status.toLowerCase()
    if (statusLower.includes('approved')) return { label: 'Approved', variant: 'success' as const }
    if (statusLower.includes('rejected')) return { label: 'Rejected', variant: 'destructive' as const }
    return { label: status, variant: 'default' as const }
  }

  const statusDisplay = getStatusDisplay(approvalStatus || advancePayment.status)
  const displayName =
    `${advancePayment.expensePlan?.employee?.firstName || ''} ${advancePayment.expensePlan?.employee?.lastName || ''}`.trim() ||
    'Employee'

  return (
    <TaskFormLayout
      data-testid="advance-payment-approval-v2-container"
      header={
        <TaskDetailHeader
          title={taskTitle}
          status={taskStatus}
          source={taskSource}
          showEmployeeInfo={true}
          employeeData={
            advancePayment?.expensePlan?.employee
              ? {
                  displayName,
                  firstName: advancePayment.expensePlan.employee.firstName,
                  lastName: advancePayment.expensePlan.employee.lastName,
                  avatarUrl: advancePayment.expensePlan.employee.pictureThumbnail
                    ? `data:image/jpeg;base64,${advancePayment.expensePlan.employee.pictureThumbnail}`
                    : undefined,
                  position: advancePayment.expensePlan.employee.employeePosition?.jobPosition?.name
                }
              : undefined
          }
          isLoadingEmployee={loading}
          creatorName={creatorName}
          onClose={isEveryBoxContext ? handleClose : undefined}
          customBadges={
            <Badge variant={statusDisplay.variant} data-testid="advance-payment-status-badge">
              {statusDisplay.label}
            </Badge>
          }
        />
      }
      footer={
        !isTaskCompleted ? (
          <TaskDetailFooter
            data-testid="advance-payment-approval-v2-actions"
            actions={[
              {
                label: 'Return',
                onClick: handleReject,
                variant: 'outline' as const,
                disabled: isRejecting || isApproving,
                loading: isRejecting,
                icon: XCircle,
                testId: 'return-button'
              },
              {
                label: 'Approve',
                onClick: handleApprove,
                variant: 'default' as const,
                disabled: isApproving || isRejecting,
                loading: isApproving,
                icon: ThumbsUp,
                className: 'gba:bg-success gba:text-success-foreground hover:gba:bg-success/90',
                testId: 'approve-button'
              }
            ]}
          />
        ) : undefined
      }
      contentClassName="gba:space-y-6"
    >
      {/* 1. Approval Details (only for completed tasks) */}
      {isTaskCompleted && (
        <ApprovalDetailsSection
          approvalStatus={approvalStatus}
          approvalComment={approvalComment}
          approvalDate={approvalDate}
          approverName={approverName}
          isLoadingApprover={isLoadingApproverName}
          isLoading={loading}
          prefixDataTestId="advance-payment-approval-v2"
        />
      )}

      {/* 2. Expense Plan Info */}
      {advancePayment.expensePlan && (
        <ExpensePlanInfoSection
          expensePlan={advancePayment.expensePlan}
          prefixDataTestId="advance-payment-approval-v2"
        />
      )}

      {/* 3. Advance Payment Details */}
      <AdvancePaymentDetailsSection
        advancePayment={advancePayment}
        requestCreatedAt={requestCreatedAt}
        isLoadingRequestDate={isLoadingRequestDate}
        prefixDataTestId="advance-payment-approval-v2"
      />

      {/* 4. Comment Section - Only for active tasks */}
      {!isTaskCompleted && (
        <div>
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
            <Switch id="show-comment" checked={showComment} onCheckedChange={setShowComment} />
            <Label
              htmlFor="show-comment"
              className="gba:text-sm gba:font-medium gba:cursor-pointer gba:flex gba:items-center gba:gap-2"
            >
              <MessageSquare className="gba:h-4 gba:w-4" />
              Add Comment {!showComment && '(Optional)'}
            </Label>
          </div>

          {showComment && (
            <Textarea
              id="comment"
              placeholder="Enter your approval comment or rejection reason..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
              className="gba:w-full"
              data-testid="advance-payment-comment-input"
            />
          )}
        </div>
      )}
    </TaskFormLayout>
  )
}

/**
 * Advance Payment Approval V2 component
 * @param props - Business app context props
 * @returns Advance Payment Approval V2 component
 */
const AdvancePaymentApprovalV2: React.FC<AdvancePaymentApprovalV2Props> = props => {
  const { accessToken, additionalData, userInfo, onClose } = props

  return (
    <div data-testid="advance-payment-approval-v2-wrapper">
      <AdvancePaymentApprovalV2Content
        accessToken={accessToken}
        additionalData={additionalData}
        userInfo={userInfo}
        onClose={onClose}
      />
    </div>
  )
}

export default AdvancePaymentApprovalV2
