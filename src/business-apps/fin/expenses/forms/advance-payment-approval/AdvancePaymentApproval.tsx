import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Switch,
  Textarea,
  Label,
  useTranslation
} from '@newwork/nw-design-system'
import { ThumbsUp, XCircle, MessageSquare } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { useAdvancePaymentData } from './hooks/useAdvancePaymentData'
import { useEntityDates } from '@/common/data/common/hooks/useEntityDates'
import { useApproverData } from '@/common/data/employee/hooks/useApproverData'

/**
 * Extended interface for additionalData with form-specific properties
 */
interface ExtendedAdditionalData {
  [k: string]: unknown
  formData?: {
    approval?: string
    approvalNote?: string
  }
  psi_taskCompletedAt?: string
  psi_taskPayload?: {
    [k: string]: unknown
  }
  psi_processMetadata?: {
    [k: string]: unknown
  }
  psi_taskStatus?: string
}

// Component imports
import { AdvancePaymentDetailsSection, ExpensePlanInfoSection, ApprovalDetailsSection } from './components'
import translations from './_i18n'

interface AdvancePaymentApprovalProps extends BusinessAppContextProps {
  onClose?: () => void
}

const AdvancePaymentApprovalContent: React.FC<AdvancePaymentApprovalProps> = ({
  accessToken,
  additionalData,
  userInfo,
  onClose
}) => {
  const { t } = useTranslation(translations)

  // Cast additionalData to extended interface for proper typing
  const extendedAdditionalData = additionalData as ExtendedAdditionalData | undefined

  // Extract paymentId from additionalData or URL parameters
  const paymentId =
    additionalData?.paymentId ||
    additionalData?.psi_taskPayload?.advancePayment?.id ||
    new URLSearchParams(globalThis.location.search).get('paymentId')

  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')

  // Ref for scrolling to comment section
  const commentSectionRef = useRef<HTMLDivElement>(null)

  // Scroll to comment section when it becomes visible
  useEffect(() => {
    if (showComment && commentSectionRef.current) {
      requestAnimationFrame(() => {
        commentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    }
  }, [showComment])

  const { advancePayment, loading, error, refetch } = useAdvancePaymentData({ paymentId, accessToken })

  // Extract task metadata
  const taskPayload = additionalData?.psi_taskPayload || {}
  const processMetadata = additionalData?.psi_processMetadata || {}
  const taskStatus = additionalData?.psi_taskStatus || processMetadata?.status || 'IN_PROGRESS'
  const taskCompletedAt = processMetadata?.completedAt || extendedAdditionalData?.psi_taskCompletedAt
  // Task is completed if status is COMPLETED OR if completedAt exists (matching InboxView logic)
  const isTaskCompleted = taskStatus === 'COMPLETED' || !!taskCompletedAt
  const taskTitle = t('task-title')
  const creatorName = taskPayload?.creatorName as string | undefined

  // Use generic hooks for entity dates (request created)
  const { createdAt: requestCreatedAt, isLoading: isLoadingRequestDate } = useEntityDates({
    accessToken,
    entityId: advancePayment?.id,
    entityType: 'AdvancePayment'
  })

  // For completed tasks, try to extract approver from comments
  const approverId = useMemo(() => {
    if (!isTaskCompleted || !advancePayment?.advancePaymentComment) return null

    // Find the most recent APPROVE_COMMENT or REJECT_COMMENT with an authorEmployee
    const approvalComment = advancePayment.advancePaymentComment.find(
      comment =>
        (comment.commentType === 'APPROVE_COMMENT' || comment.commentType === 'REJECT_COMMENT') &&
        comment.authorEmployee
    )

    return approvalComment?.authorEmployee || null
  }, [isTaskCompleted, advancePayment?.advancePaymentComment])

  // For completed tasks, fetch approver name
  const { approverName, isLoading: isLoadingApproverName } = useApproverData({
    accessToken,
    approverId
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
        data-testid="advance-payment-approval-loading"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="advance-payment-approval-error">
        <AlertTitle>{t('error-loading-title')}</AlertTitle>
        <AlertDescription>
          {error}
          <button
            onClick={refetch}
            className="gba:mt-2 gba:px-3 gba:py-1 gba:bg-destructive gba:text-destructive-foreground gba:rounded gba:text-sm"
          >
            {t('action-retry')}
          </button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!advancePayment) {
    return (
      <Alert data-testid="advance-payment-approval-no-data">
        <AlertTitle>{t('error-no-data-title')}</AlertTitle>
        <AlertDescription>{t('error-no-data-description')}</AlertDescription>
      </Alert>
    )
  }

  const displayName =
    `${advancePayment.expensePlan?.employee?.firstName || ''} ${advancePayment.expensePlan?.employee?.lastName || ''}`.trim() ||
    t('value-employee')

  return (
    <TaskFormLayout
      data-testid="advance-payment-approval-container"
      header={
        <TaskDetailHeader
          title={taskTitle}
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
        />
      }
      footer={
        isTaskCompleted ? undefined : (
          <TaskDetailFooter
            data-testid="advance-payment-approval-actions"
            actions={[
              {
                label: t('action-return'),
                onClick: handleReject,
                variant: 'outline' as const,
                disabled: isRejecting || isApproving,
                loading: isRejecting,
                icon: XCircle,
                testId: 'return-button'
              },
              {
                label: t('action-approve'),
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
        )
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
          prefixDataTestId="advance-payment-approval"
          t={t}
        />
      )}

      {/* 2. Expense Plan Info */}
      {advancePayment.expensePlan && (
        <ExpensePlanInfoSection
          expensePlan={advancePayment.expensePlan}
          prefixDataTestId="advance-payment-approval"
          t={t}
        />
      )}

      {/* 3. Advance Payment Details */}
      <AdvancePaymentDetailsSection
        advancePayment={advancePayment}
        requestCreatedAt={requestCreatedAt}
        isLoadingRequestDate={isLoadingRequestDate}
        prefixDataTestId="advance-payment-approval"
        t={t}
      />

      {/* 4. Comment Section - Only for active tasks */}
      {!isTaskCompleted && (
        <div ref={commentSectionRef} data-testid="advance-payment-approval-comment-section">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
            <Switch id="show-comment" checked={showComment} onCheckedChange={setShowComment} />
            <Label
              htmlFor="show-comment"
              className="gba:text-sm gba:font-medium gba:cursor-pointer gba:flex gba:items-center gba:gap-2"
            >
              <MessageSquare className="gba:h-4 gba:w-4" />
              {t('comment-toggle-label')}
            </Label>
          </div>

          {showComment && (
            <Textarea
              id="comment"
              placeholder={t('comment-placeholder')}
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
 * Advance Payment Approval component
 * @param props - Business app context props
 * @returns Advance Payment Approval component
 */
const AdvancePaymentApproval: React.FC<AdvancePaymentApprovalProps> = props => {
  const { accessToken, additionalData, userInfo, onClose } = props

  return (
    <div data-testid="advance-payment-approval-wrapper">
      <AdvancePaymentApprovalContent
        accessToken={accessToken}
        additionalData={additionalData}
        userInfo={userInfo}
        onClose={onClose}
      />
    </div>
  )
}

export default AdvancePaymentApproval
