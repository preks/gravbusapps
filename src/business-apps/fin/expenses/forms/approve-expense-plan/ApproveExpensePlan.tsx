import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Label,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Switch,
  Textarea
} from '@newwork/nw-design-system'
import { PiCalendarDuotone, PiClock, PiMapPin } from 'react-icons/pi'
import { ThumbsUp, XCircle, MessageSquare } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { formatDateTime } from '@/business-apps/core/every/apps/every-box/utils/taskFormatters'
import { splitExpenseItems } from './utils/expenseItemUtils'
import { useExpensePlanData } from './hooks/useExpensePlanData'
import { formatCurrency, getCatalogValue } from './utils/formatters'
import { REQUEST_TYPES } from '../expense-request/constants/constants'
import { useEntityDates } from '@/common/data/common/hooks/useEntityDates'
import { useApproverData } from '@/common/data/employee/hooks/useApproverData'

// Component imports
import {
  ExpensePlanTotalsSection,
  EnhancedTripSection,
  ExpensePlanItemsSection,
  AdvancePaymentSection,
  ExpensePlanRequestDetailsSection,
  ApprovalDetailsSection
} from './components'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'

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

interface ApproveExpensePlanProps extends BusinessAppContextProps {
  onClose?: () => void
}

const ApproveExpensePlanContent: React.FC<ApproveExpensePlanProps> = ({
  accessToken,
  additionalData,
  userInfo,
  onClose
}) => {
  // Cast additionalData to extended interface for proper typing
  const extendedAdditionalData = additionalData as ExtendedAdditionalData | undefined

  // Extract planId from additionalData or URL parameters
  const planId =
    additionalData?.planId ||
    additionalData?.psi_taskPayload?.expensePlan?.id ||
    new URLSearchParams(globalThis.location.search).get('planId')

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

  const { expensePlan, loading, error, refetch } = useExpensePlanData({ planId, accessToken })

  // Extract task metadata
  const taskPayload = additionalData?.psi_taskPayload || {}
  const processMetadata = additionalData?.psi_processMetadata || {}
  const taskStatus = additionalData?.psi_taskStatus || processMetadata?.status || 'IN_PROGRESS'
  const taskCompletedAt = processMetadata?.completedAt || extendedAdditionalData?.psi_taskCompletedAt
  // Task is completed if status is COMPLETED OR if completedAt exists (matching InboxView logic)
  const isTaskCompleted = taskStatus === 'COMPLETED' || !!taskCompletedAt
  const taskTitle =
    processMetadata?.referenceTaskName || processMetadata?.nodeName || expensePlan?.title || 'Approve Expense Plan'
  const taskSource: 'kogito' | 'cflow' = processMetadata?.source || 'kogito'
  const creatorName = taskPayload?.creatorName as string | undefined

  // Use generic hooks for entity dates (request created)
  const { createdAt: requestCreatedAt, isLoading: isLoadingRequestDate } = useEntityDates({
    accessToken,
    entityId: expensePlan?.id,
    entityType: 'ExpensePlan'
  })

  // For completed tasks, fetch approver name
  const approverId = isTaskCompleted
    ? processMetadata?.outputs?.approverId || processMetadata?.inputs?.approverId || null
    : null

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

  // Extract approval data from expensePlanComment (for completed tasks)
  const approvalCommentFromPlan = useMemo(() => {
    if (!isTaskCompleted || !expensePlan?.expensePlanComment || expensePlan.expensePlanComment.length === 0) {
      return null
    }

    // Find the most recent APPROVE_COMMENT or REJECT_COMMENT
    const approvalComment = expensePlan.expensePlanComment.find(
      comment => comment.commentType === 'APPROVE_COMMENT' || comment.commentType === 'REJECT_COMMENT'
    )

    return approvalComment?.comment || null
  }, [isTaskCompleted, expensePlan?.expensePlanComment])

  const approvalDateFromPlan = useMemo(() => {
    if (!isTaskCompleted || !expensePlan?.expensePlanComment || expensePlan.expensePlanComment.length === 0) {
      return null
    }

    // Find the most recent APPROVE_COMMENT or REJECT_COMMENT
    const approvalComment = expensePlan.expensePlanComment.find(
      comment => comment.commentType === 'APPROVE_COMMENT' || comment.commentType === 'REJECT_COMMENT'
    )

    return approvalComment?.commentDate || null
  }, [isTaskCompleted, expensePlan?.expensePlanComment])

  // Determine approval status from expense plan status or task outputs
  const approvalStatus = useMemo(() => {
    if (!isTaskCompleted) return null

    // Priority order:
    // 1. Task outputs (most reliable for completed tasks)
    // 2. ExpensePlan.status (but only if it's an approval status, not PENDING)
    if (taskOutputApprovalStatus) {
      return taskOutputApprovalStatus
    }

    // Only use expensePlan.status if it's an actual approval status (APPROVED, REJECTED, etc.)
    // Don't use PENDING as that's the initial status, not an approval status
    if (expensePlan?.status && expensePlan.status !== 'PENDING') {
      return expensePlan.status
    }

    // If we have approval comments, infer status from comment type
    if (expensePlan?.expensePlanComment && expensePlan.expensePlanComment.length > 0) {
      const approvalComment = expensePlan.expensePlanComment.find(
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
  }, [isTaskCompleted, taskOutputApprovalStatus, expensePlan?.status, expensePlan?.expensePlanComment])

  // Determine approval comment (priority: task outputs > expensePlanComment)
  const approvalComment = taskOutputApprovalNote || approvalCommentFromPlan

  // Determine approval date (priority: completedAt > expensePlanComment date)
  const approvalDate = completedAt || approvalDateFromPlan

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
    setIsApproving(true)
    try {
      const isTrip = expensePlan?.requestType?.code.toLowerCase() === REQUEST_TYPES.TRIP
      const approvalPayload = {
        event: 'pse_approve',
        expensePlanComment: {
          commentDate: new Date().toISOString().slice(0, 19),
          comment: (showComment && comment.trim()) || '',
          commentType: 'APPROVE_COMMENT',
          authorEmployee: userInfo?.employeeDetails?.employeeId,
          expensePlan: expensePlan?.id
        },
        ...(isTrip
          ? {
              employeeAbsence: {
                typeRef: 'AbsenceType:v1:A101',
                employeeId: expensePlan?.employee?.id,
                startDate: expensePlan?.startDate,
                endDate: expensePlan?.endDate,
                description: expensePlan?.description,
                substituteEmployee: '',
                status: 'APPROVED'
              }
            }
          : {})
      }

      dispatchProcessContinueEvent('pse_approve', approvalPayload)
    } catch (err) {
      console.error('Error approving expense plan:', err)
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    // Require comment for rejection
    if (!comment.trim()) {
      setShowComment(true)
      return
    }

    setIsRejecting(true)
    try {
      const rejectionPayload = {
        event: 'pse_reject',
        expensePlanComment: {
          commentDate: new Date().toISOString().slice(0, 19),
          comment: comment.trim(),
          commentType: 'REJECT_COMMENT',
          authorEmployee: userInfo?.employeeDetails?.employeeId,
          expensePlan: expensePlan?.id
        }
      }

      dispatchProcessContinueEvent('pse_reject', rejectionPayload)
    } catch (err) {
      console.error('Error returning expense plan:', err)
    } finally {
      setIsRejecting(false)
    }
  }

  if (loading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]"
        data-testid="approve-expense-plan-loading"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="approve-expense-plan-error">
        <AlertTitle>Error Loading Expense Plan</AlertTitle>
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

  if (!expensePlan) {
    return (
      <Alert data-testid="approve-expense-plan-no-data">
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>Expense plan not found</AlertDescription>
      </Alert>
    )
  }

  // Extract currency code
  const currencyCode = expensePlan.currency?.code || 'EUR'
  const totalAmount = Number(expensePlan.totalAmount ?? 0)
  const reimbursableAmount = Number(expensePlan.reimbursableAmount ?? 0)
  const nonReimbursableAmount = Number(expensePlan.nonReimbursableAmount ?? 0)
  const deductibleAmount = Number(expensePlan.deductibleAmount ?? 0)
  const nonDeductibleAmount = Number(expensePlan.nonDeductibleAmount ?? 0)
  const advancePaymentAmount = Number(expensePlan?.advancePaymentAggregate?.aggregate?.sum?.amount ?? 0)
  const { expenseItems } = splitExpenseItems(expensePlan.expensePlanItem)

  // Use expenseAllowance if available
  const allowances =
    expensePlan.expenseAllowance && expensePlan.expenseAllowance.length > 0 ? expensePlan.expenseAllowance : []

  // Calculate expenses and allowances totals
  const totalAmountExpense = expenseItems.reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0)
  const totalAmountAllowance =
    allowances.length > 0
      ? allowances.reduce((sum, allowance) => sum + Number(allowance.dayRate ?? 0), 0)
      : splitExpenseItems(expensePlan.expensePlanItem).expenseAllowances.reduce(
          (sum, item) => sum + Number(item.totalAmount ?? 0),
          0
        )

  // Get status display
  const getStatusDisplay = (status?: string) => {
    if (!status) return { label: 'Pending', variant: 'default' as const }
    const statusLower = status.toLowerCase()
    if (statusLower.includes('approved')) return { label: 'Approved', variant: 'success' as const }
    if (statusLower.includes('rejected')) return { label: 'Rejected', variant: 'destructive' as const }
    return { label: status, variant: 'default' as const }
  }

  const statusDisplay = getStatusDisplay(expensePlan.status)
  const displayName =
    `${expensePlan.employee?.firstName || ''} ${expensePlan.employee?.lastName || ''}`.trim() || 'Employee'

  return (
    <TaskFormLayout
      data-testid="approve-expense-plan-container"
      header={
        <TaskDetailHeader
          title={taskTitle}
          status={taskStatus}
          source={taskSource}
          showEmployeeInfo={true}
          employeeData={
            expensePlan?.employee
              ? {
                  displayName,
                  firstName: expensePlan.employee.firstName,
                  lastName: expensePlan.employee.lastName,
                  avatarUrl: expensePlan.employee.pictureThumbnail
                    ? `data:image/jpeg;base64,${expensePlan.employee.pictureThumbnail}`
                    : undefined,
                  position: expensePlan.employee.employeePosition?.jobPosition?.name
                }
              : undefined
          }
          isLoadingEmployee={loading}
          creatorName={creatorName}
          onClose={isEveryBoxContext ? handleClose : undefined}
          customBadges={
            <Badge variant={statusDisplay.variant} data-testid="expense-plan-status-badge">
              {statusDisplay.label}
            </Badge>
          }
        />
      }
      footer={
        isTaskCompleted ? undefined : (
          <TaskDetailFooter
            data-testid="approve-expense-plan-actions"
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
          prefixDataTestId="approve-expense-plan"
        />
      )}

      {/* 2. Expense Plan Request Details */}
      <ExpensePlanRequestDetailsSection
        expensePlan={expensePlan}
        requestCreatedAt={requestCreatedAt}
        isLoadingRequestDate={isLoadingRequestDate}
        prefixDataTestId="approve-expense-plan"
      />

      {/* 3. Financial Overview */}
      <ExpensePlanTotalsSection
        totalAmount={totalAmount}
        totalAmountExpense={totalAmountExpense}
        totalAmountAllowance={totalAmountAllowance}
        reimbursableAmount={reimbursableAmount}
        nonReimbursableAmount={nonReimbursableAmount}
        deductibleAmount={deductibleAmount}
        nonDeductibleAmount={nonDeductibleAmount}
        advancePaymentAmount={advancePaymentAmount}
        currencyCode={currencyCode}
        formatCurrency={formatCurrency}
      />

      {/* 4. Items */}
      {expensePlan.expensePlanItem && expensePlan.expensePlanItem.length > 0 && (
        <ExpensePlanItemsSection
          expensePlanItems={expensePlan.expensePlanItem}
          currencyCode={currencyCode}
          formatCurrency={formatCurrency}
          getCatalogValue={getCatalogValue}
          prefixDataTestId="approve-expense-plan"
        />
      )}

      {/* 5. Trip Details (only if has trips) */}
      {expensePlan.expenseRequestTrip && expensePlan.expenseRequestTrip.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <PiMapPin className="gba:h-5 gba:w-5" />
              Trip Details
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-4">
            {/* Dates */}
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div className="gba:flex gba:items-start gba:gap-2">
                <PiCalendarDuotone className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mt-0.5" />
                <div>
                  <Label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Start Date</Label>
                  <p className="gba:text-sm">{formatDateTime(expensePlan.startDate)}</p>
                </div>
              </div>
              <div className="gba:flex gba:items-start gba:gap-2">
                <PiClock className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mt-0.5" />
                <div>
                  <Label className="gba:text-sm gba:font-medium gba:text-muted-foreground">End Date</Label>
                  <p className="gba:text-sm">{formatDateTime(expensePlan.endDate)}</p>
                </div>
              </div>
            </div>

            {/* Trip Table/Timeline */}
            <EnhancedTripSection
              expenseRequestTrip={expensePlan.expenseRequestTrip}
              startDate={expensePlan.startDate}
              endDate={expensePlan.endDate}
              prefixDataTestId="approve-expense-plan"
            />
          </CardContent>
        </Card>
      )}

      {/* 6. Advance Payment (only if has advance payments) */}
      {expensePlan.advancePayment && expensePlan.advancePayment.length > 0 && (
        <AdvancePaymentSection
          advancePayments={expensePlan.advancePayment}
          currencyCode={currencyCode}
          formatCurrency={formatCurrency}
          prefixDataTestId="approve-expense-plan"
        />
      )}

      {/* 7. Comment Section - Only for active tasks */}
      {!isTaskCompleted && (
        <div ref={commentSectionRef} data-testid="approve-expense-plan-comment-section">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
            <Switch id="show-comment" checked={showComment} onCheckedChange={setShowComment} />
            <Label
              htmlFor="show-comment"
              className="gba:text-sm gba:font-medium gba:cursor-pointer gba:flex gba:items-center gba:gap-2"
            >
              <MessageSquare className="gba:h-4 gba:w-4" />
              Add Comment (Required for rejection)
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
              data-testid="approve-expense-plan-comment-input"
            />
          )}
        </div>
      )}
    </TaskFormLayout>
  )
}

/**
 * Approve Expense Plan component
 * @param props - Business app context props
 * @returns Approve Expense Plan component
 */
const ApproveExpensePlan: React.FC<ApproveExpensePlanProps> = props => {
  const { accessToken, additionalData, userInfo, onClose } = props

  // Fallback additional data for testing when none is provided
  const fallbackAdditionalData = additionalData || {
    planId: '954d93df-4b5b-4da9-9a22-914be14541d7'
  }

  return (
    <div data-testid="approve-expense-plan-wrapper">
      <ApproveExpensePlanContent
        accessToken={accessToken}
        additionalData={fallbackAdditionalData}
        userInfo={userInfo}
        onClose={onClose}
      />
    </div>
  )
}

export default ApproveExpensePlan
