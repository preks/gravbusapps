import React, { useState, useEffect, useMemo } from 'react'
import { Spinner, Alert, AlertTitle, AlertDescription, Badge } from '@newwork/nw-design-system'
import { ThumbsUp, XCircle } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { splitExpenseItems } from './utils/expenseItemUtils'
import { useExpenseRequestData } from './hooks/useExpenseRequestData'
import { formatCurrency, getCatalogValue } from './utils/formatters'
import { TaskDetailHeader } from '@/business-apps/platform/apps/every-box-2/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/platform/apps/every-box-2/components/TaskDetailFooter'

// Component imports
import {
  ExpenseRequestTotalsSection,
  ApprovalDetailsSection,
  ExpenseRequestDetailsSection,
  EnhancedTripSection
} from './components'
import ExpensesSection from '../../reusable-components/approval/ExpensesSection'
import { AllowancesSection } from '../../reusable-components/approval'

interface ApproveExpenseRequestV2Props extends BusinessAppContextProps {
  onClose?: () => void // Optional callback to close the modal
}

const ApproveExpenseRequestV2Content: React.FC<ApproveExpenseRequestV2Props> = ({
  accessToken,
  additionalData,
  userInfo,
  onClose
}) => {
  // Extract expenseId from additionalData or URL parameters
  const expenseId =
    additionalData?.expenseId ||
    additionalData?.psi_taskPayload?.expenseRequest?.id ||
    new URLSearchParams(window.location.search).get('expenseId')

  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const { expenseRequest, loading, error, refetch } = useExpenseRequestData({ expenseId, accessToken })

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
    expenseRequest?.title ||
    'Approve Expense Request'
  const taskSource: 'kogito' | 'cflow' = processMetadata?.source || (processMetadata?.endpoint ? 'kogito' : 'kogito')
  const creatorName = taskPayload?.creatorName as string | undefined

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

  // Extract approval data from expenseRequestComment (for completed tasks)
  const approvalCommentFromRequest = useMemo(() => {
    if (
      !isTaskCompleted ||
      !expenseRequest?.expenseRequestComment ||
      expenseRequest.expenseRequestComment.length === 0
    ) {
      return null
    }

    // Find the most recent APPROVE_COMMENT or REJECT_COMMENT
    const approvalComment = expenseRequest.expenseRequestComment.find(
      comment => comment.commentType === 'APPROVE_COMMENT' || comment.commentType === 'REJECT_COMMENT'
    )

    return approvalComment?.comment || null
  }, [isTaskCompleted, expenseRequest?.expenseRequestComment])

  const approvalDateFromRequest = useMemo(() => {
    if (
      !isTaskCompleted ||
      !expenseRequest?.expenseRequestComment ||
      expenseRequest.expenseRequestComment.length === 0
    ) {
      return null
    }

    // Find the most recent APPROVE_COMMENT or REJECT_COMMENT
    const approvalComment = expenseRequest.expenseRequestComment.find(
      comment => comment.commentType === 'APPROVE_COMMENT' || comment.commentType === 'REJECT_COMMENT'
    )

    return approvalComment?.commentDate || null
  }, [isTaskCompleted, expenseRequest?.expenseRequestComment])

  // Determine approval status from task outputs or expense request comments
  const approvalStatus = useMemo(() => {
    if (!isTaskCompleted) return null

    // Priority order:
    // 1. Task outputs (most reliable for completed tasks)
    if (taskOutputApprovalStatus) {
      return taskOutputApprovalStatus
    }

    // If we have approval comments, infer status from comment type
    if (expenseRequest?.expenseRequestComment && expenseRequest.expenseRequestComment.length > 0) {
      const approvalComment = expenseRequest.expenseRequestComment.find(
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
  }, [isTaskCompleted, taskOutputApprovalStatus, expenseRequest?.expenseRequestComment])

  // Determine approval comment (priority: task outputs > expenseRequestComment)
  const approvalComment = taskOutputApprovalNote || approvalCommentFromRequest

  // Determine approval date (priority: completedAt > expenseRequestComment date)
  const approvalDate = completedAt || approvalDateFromRequest

  // Detect if we're in every-box-2 context (has onClose callback)
  const isEveryBox2Context = !!onClose

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
      // Dispatch cancel event when user closes/refreshes the page
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

    // Listen for beforeunload event (browser close, refresh, navigation)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      // Create approval payload
      const approvalPayload = {
        event: 'pse_approve',
        expenseRequestComment: {
          commentDate: new Date().toISOString().slice(0, 19),
          comment: '',
          commentType: 'APPROVE_COMMENT',
          authorEmployee: userInfo?.employeeDetails?.employeeId,
          expenseRequest: expenseRequest?.id
        }
      }

      dispatchProcessContinueEvent('pse_approve', approvalPayload)
    } catch (err) {
      console.error('Error approving expense request:', err)
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    setIsRejecting(true)
    try {
      // Create rejection payload
      const rejectionPayload = {
        event: 'pse_reject',
        expenseRequestComment: {
          commentDate: new Date().toISOString().slice(0, 19),
          comment: '',
          commentType: 'REJECT_COMMENT',
          authorEmployee: userInfo?.employeeDetails?.employeeId,
          expenseRequest: expenseRequest?.id
        }
      }

      dispatchProcessContinueEvent('pse_reject', rejectionPayload)
    } catch (err) {
      console.error('Error returning expense request:', err)
    } finally {
      setIsRejecting(false)
    }
  }

  if (loading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]"
        data-testid="approve-expense-request-v2-loading"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="approve-expense-request-v2-error">
        <AlertTitle>Error Loading Expense Request</AlertTitle>
        <AlertDescription>
          <div>
            <p>
              <strong>Error:</strong> {error}
            </p>
            <p>
              <strong>Expense ID:</strong> {expenseId}
            </p>
            <p>
              <strong>Access Token:</strong> {accessToken ? 'Present' : 'Missing'}
            </p>
            <p>
              <strong>Environment:</strong> {process.env.NODE_ENV}
            </p>
          </div>
          <button
            onClick={refetch}
            style={{ marginTop: 'var(--nw-spacing-2)' }}
            className="gba:px-3 gba:py-1 gba:bg-red-600 gba:text-background gba:rounded gba:text-sm"
          >
            Retry
          </button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!expenseRequest) {
    return (
      <Alert data-testid="approve-expense-request-v2-no-data">
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>Expense request not found</AlertDescription>
      </Alert>
    )
  }

  const currencyCode = expenseRequest.currency?.code || 'EUR'
  const totalAmount = Number(expenseRequest.totalAmount ?? 0)
  const reimbursableAmount = Number(expenseRequest.reimbursableAmount ?? 0)
  const remainingAmount = Number(expenseRequest.totalRemainingAmount ?? 0)
  const nonReimbursableAmount = Number(expenseRequest.nonReimbursableAmount ?? 0)
  const advancePaymentAmount = Number(expenseRequest.expensePlan?.advancePaymentTotalAmount ?? 0)

  // Transform expense request items to match expense plan format for component compatibility
  const transformedExpenseItems =
    expenseRequest.expenseItem?.map(item => ({
      ...item,
      expenseGroup: item.expensePosition?.[0]?.expenseGroup || {
        value: '',
        translations: [],
        catalog: { defaultLocale: 'en' }
      }
    })) || []

  const { expenseAllowances: itemAllowances, expenseItems } = splitExpenseItems(transformedExpenseItems as any)

  // Transform expense allowances to match component expectations
  const allowanceItems =
    expenseRequest.expenseAllowance?.map((allowance, index) => ({
      id: `allowance-${index}`,
      expenseDate: allowance.allowanceDate,
      totalAmount: allowance.dayRate
    })) || []

  // Combine allowances from both sources
  const allAllowances = [...allowanceItems, ...itemAllowances]

  // Get status display
  const getStatusDisplay = (status?: string) => {
    if (!status) return { label: 'Pending', variant: 'default' as const }
    const statusLower = status.toLowerCase()
    if (statusLower.includes('approved')) return { label: 'Approved', variant: 'success' as const }
    if (statusLower.includes('rejected')) return { label: 'Rejected', variant: 'destructive' as const }
    return { label: status, variant: 'default' as const }
  }

  const statusDisplay = getStatusDisplay(approvalStatus || undefined)
  const displayName =
    `${expenseRequest.employee?.firstName || ''} ${expenseRequest.employee?.lastName || ''}`.trim() || 'Employee'

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:relative" data-testid="approve-expense-request-v2-container">
      {/* Task Header with Employee Info */}
      <TaskDetailHeader
        title={taskTitle}
        status={taskStatus}
        source={taskSource}
        showEmployeeInfo={true}
        employeeData={
          expenseRequest?.employee
            ? {
                displayName,
                firstName: expenseRequest.employee.firstName,
                lastName: expenseRequest.employee.lastName,
                avatarUrl: expenseRequest.employee.pictureThumbnail
                  ? `data:image/jpeg;base64,${expenseRequest.employee.pictureThumbnail}`
                  : undefined,
                position: expenseRequest.employee.employeePosition?.jobPosition?.name
              }
            : undefined
        }
        isLoadingEmployee={loading}
        creatorName={creatorName}
        onClose={isEveryBox2Context ? handleClose : undefined}
        customBadges={
          approvalStatus && (
            <Badge variant={statusDisplay.variant} data-testid="expense-request-status-badge">
              {statusDisplay.label}
            </Badge>
          )
        }
      />

      {/* Content with padding - matches header padding for alignment */}
      <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-4 gba:min-h-0 gba:p-6">
        {/* 1. Approval Details (only for completed tasks) */}
        {isTaskCompleted && (
          <ApprovalDetailsSection
            approvalStatus={approvalStatus}
            approvalComment={approvalComment}
            approvalDate={approvalDate}
            isLoading={loading}
            prefixDataTestId="approve-expense-request-v2"
          />
        )}

        {/* 2. Expense Request Details */}
        <ExpenseRequestDetailsSection expenseRequest={expenseRequest} prefixDataTestId="approve-expense-request-v2" />

        {/* 3. Financial Overview */}
        <ExpenseRequestTotalsSection
          totalAmount={totalAmount}
          reimbursableAmount={reimbursableAmount}
          nonReimbursableAmount={nonReimbursableAmount}
          advancePaymentAmount={advancePaymentAmount}
          currencyCode={currencyCode}
          formatCurrency={formatCurrency}
          expensePlanTotalAmount={expenseRequest.expensePlan?.totalAmount}
          remainingAmount={remainingAmount}
          isExpensePlan={expenseRequest.expensePlan !== null}
        />

        {/* 4. Items */}
        {expenseItems && expenseItems.length > 0 && (
          <ExpensesSection
            expenseItems={expenseItems}
            currencyCode={currencyCode}
            formatCurrency={formatCurrency}
            getCatalogValue={getCatalogValue}
          />
        )}

        {/* 5. Trip Details (only if has trips) */}
        {expenseRequest.expenseRequestTrip && expenseRequest.expenseRequestTrip.length > 0 && (
          <EnhancedTripSection
            expenseRequestTrip={expenseRequest.expenseRequestTrip}
            prefixDataTestId="approve-expense-request-v2"
          />
        )}

        {/* 6. Allowances (only if has allowances) */}
        {allAllowances && allAllowances.length > 0 && (
          <AllowancesSection
            allowanceItems={allAllowances}
            currencyCode={currencyCode}
            formatCurrency={formatCurrency}
            prefixDataTestId="approve-expense-request-v2"
          />
        )}
      </div>

      {/* Action Footer - Fixed at bottom */}
      {!isTaskCompleted && (
        <TaskDetailFooter
          data-testid="approve-expense-request-v2-actions"
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
      )}
    </div>
  )
}

/**
 * Approve Expense Request V2 component
 * @param props - Business app context props
 * @returns Approve Expense Request V2 component
 */
const ApproveExpenseRequestV2: React.FC<ApproveExpenseRequestV2Props> = props => {
  const { accessToken, additionalData, userInfo, onClose } = props

  // Fallback additional data for testing when none is provided
  const fallbackAdditionalData = additionalData || {
    expenseId: '8f760576-8587-4822-ae03-a2ffc45f9b80'
  }

  return (
    <div data-testid="approve-expense-request-v2-wrapper">
      <ApproveExpenseRequestV2Content
        accessToken={accessToken}
        additionalData={fallbackAdditionalData}
        userInfo={userInfo}
        onClose={onClose}
      />
    </div>
  )
}

export default ApproveExpenseRequestV2
