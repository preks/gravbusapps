import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Switch,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import { ThumbsUp, XCircle, MessageSquare } from 'lucide-react'
import { CalendarIcon, ClockIcon, MapPinIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { splitExpenseItems } from './utils/expenseItemUtils'
import { useExpenseRequestData } from './hooks/useExpenseRequestData'
import { formatCurrency, getCatalogValue } from './utils/formatters'
import { REQUEST_TYPES } from '../expense-request/constants/constants'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { useEntityDates } from '@/common/data/common/hooks/useEntityDates'
import { useApproverData } from '@/common/data/employee/hooks/useApproverData'
import { formatDateTime } from '@/common/utils/dateFormatter'
import { useExpenseRequestAnalysis } from '../../common/hooks/useExpenseRequestAnalysis'
import AIAnalysisSection from '../../common/components/ai-analysis/AIAnalysisSection'

// Component imports
import {
  ExpenseRequestTotalsSection,
  ApprovalDetailsSection,
  ExpenseRequestDetailsSection,
  EnhancedTripSection,
  ExpensesSection,
  DetailedAllowancesSection
} from './components'
import translations from './_i18n'

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

interface ApproveExpenseRequestProps extends BusinessAppContextProps {
  onClose?: () => void // Optional callback to close the modal
}

const ApproveExpenseRequestContent: React.FC<ApproveExpenseRequestProps> = ({
  accessToken,
  additionalData,
  userInfo,
  onClose
}) => {
  const { t } = useTranslation(translations)

  // Cast additionalData to extended interface for proper typing
  const extendedAdditionalData = additionalData as ExtendedAdditionalData | undefined

  // Extract task metadata first
  const taskPayload = additionalData?.psi_taskPayload || {}

  // Extract expense request data from task payload (like vacation component does)
  const payloadExpenseRequest = taskPayload?.expenseRequest

  // Extract expenseId from additionalData or URL parameters
  const expenseId =
    additionalData?.expenseId ||
    payloadExpenseRequest?.id ||
    new URLSearchParams(globalThis.location.search).get('expenseId')

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

  // Use payload data if available, otherwise fetch from GraphQL
  const { expenseRequest, loading, error, refetch } = useExpenseRequestData({
    expenseId,
    accessToken,
    payloadData: payloadExpenseRequest // Pass payload data to avoid unnecessary GraphQL query
  })

  // AI Analysis for expense request
  const {
    analysis: aiAnalysis,
    loading: aiAnalysisLoading,
    error: aiAnalysisError,
    refetch: refetchAiAnalysis
  } = useExpenseRequestAnalysis({
    expenseRequestId: expenseId || null,
    accessToken
  })

  const processMetadata = additionalData?.psi_processMetadata || {}
  const taskStatus = additionalData?.psi_taskStatus || processMetadata?.status || 'IN_PROGRESS'
  const taskCompletedAt = processMetadata?.completedAt || extendedAdditionalData?.psi_taskCompletedAt
  // Task is completed if status is COMPLETED OR if completedAt exists (matching InboxView logic)
  const isTaskCompleted = taskStatus === 'COMPLETED' || !!taskCompletedAt
  const taskTitle =
    processMetadata?.referenceTaskName || processMetadata?.nodeName || expenseRequest?.title || t('task-title')
  const creatorName = taskPayload?.creatorName as string | undefined

  // Use generic hooks for entity dates (request created)
  const { createdAt: requestCreatedAt, isLoading: isLoadingRequestDate } = useEntityDates({
    accessToken,
    entityId: expenseRequest?.id,
    entityType: 'ExpenseRequest'
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
      // Check if this is a trip-type expense request
      const isTrip = expenseRequest?.requestType?.code?.toLowerCase() === REQUEST_TYPES.TRIP

      // Create approval payload
      const approvalPayload = {
        event: 'pse_approve',
        expenseRequestComment: {
          commentDate: new Date().toISOString().slice(0, 19),
          comment: showComment && comment.trim() ? comment.trim() : '',
          commentType: 'APPROVE_COMMENT',
          authorEmployee: userInfo?.employeeDetails?.employeeId,
          expenseRequest: expenseRequest?.id
        },
        // Add employee absence for trip-type expense requests
        ...(isTrip
          ? {
              employeeAbsence: {
                typeRef: 'AbsenceType:v1:A101',
                employeeId: expenseRequest?.employee?.id,
                startDate: expenseRequest?.expensePlan?.startDate,
                endDate: expenseRequest?.expensePlan?.endDate,
                description: expenseRequest?.description,
                substituteEmployee: '',
                status: 'APPROVED'
              }
            }
          : {})
      }

      dispatchProcessContinueEvent('pse_approve', approvalPayload)
    } catch (err) {
      console.error('Error approving expense request:', err)
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    // Require comment for rejection
    if (!comment.trim()) {
      // Auto-fill comment from AI insights if available (WARNING type)
      if (aiAnalysis?.type === 'WARNING' && aiAnalysis.user_text) {
        setComment(aiAnalysis.user_text)
      }
      setShowComment(true)
      return
    }

    setIsRejecting(true)
    try {
      // Create rejection payload
      const rejectionPayload = {
        event: 'pse_reject',
        expenseRequestComment: {
          commentDate: new Date().toISOString().slice(0, 19),
          comment: comment.trim(),
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
        data-testid="approve-expense-request-loading"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="approve-expense-request-error">
        <AlertTitle>{t('error-loading-title')}</AlertTitle>
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
            {t('action-retry')}
          </button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!expenseRequest) {
    return (
      <Alert data-testid="approve-expense-request-no-data">
        <AlertTitle>{t('error-no-data-title')}</AlertTitle>
        <AlertDescription>{t('error-no-data-description')}</AlertDescription>
      </Alert>
    )
  }

  const currencyCode = expenseRequest.currency?.code || 'EUR'
  const totalAmount = Number(expenseRequest.totalAmount ?? 0)
  const remainingAmount = Number(expenseRequest.totalRemainingAmount ?? 0)
  const nonReimbursableAmount = Number(expenseRequest.nonReimbursableAmount ?? 0)
  const reimbursableAmount = Number(expenseRequest.reimbursableAmount ?? totalAmount - nonReimbursableAmount)
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

  const { expenseAllowances: itemAllowances, expenseItems } = splitExpenseItems(transformedExpenseItems)

  // Transform expense item allowances to match ExpenseRequestAllowance format
  const transformedItemAllowances = itemAllowances.map((item, index) => ({
    id: `item-allowance-${index}`,
    allowanceDate: item.expenseDate,
    dayRate: item.totalAmount,
    allowanceOrder: index + 1
  }))

  // Combine allowances from both sources (API data + expense items)
  // API data has full details (breakfast, lunch, etc.), item-based allowances are simpler
  const allAllowances = [...(expenseRequest.expenseAllowance || []), ...transformedItemAllowances]

  const displayName =
    `${expenseRequest.employee?.firstName || ''} ${expenseRequest.employee?.lastName || ''}`.trim() ||
    t('value-employee')

  return (
    <TaskFormLayout
      data-testid="approve-expense-request-container"
      header={
        <TaskDetailHeader
          title={taskTitle}
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
          onClose={isEveryBoxContext ? handleClose : undefined}
        />
      }
      footer={
        isTaskCompleted ? undefined : (
          <TaskDetailFooter
            data-testid="approve-expense-request-actions"
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
          prefixDataTestId="approve-expense-request"
          t={t}
        />
      )}

      {/* 2. Expense Request Details */}
      <ExpenseRequestDetailsSection
        expenseRequest={expenseRequest}
        requestCreatedAt={requestCreatedAt}
        isLoadingRequestDate={isLoadingRequestDate}
        prefixDataTestId="approve-expense-request"
        t={t}
      />

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
        t={t}
      />

      {/* 4. Items */}
      {expenseItems && expenseItems.length > 0 && (
        <ExpensesSection
          expenseItems={expenseItems}
          currencyCode={currencyCode}
          formatCurrency={formatCurrency}
          getCatalogValue={getCatalogValue}
          t={t}
          accessToken={accessToken}
          userInfo={userInfo}
          additionalData={additionalData}
          employeeId={expenseRequest?.employee?.id}
        />
      )}

      {/* 5. Trip Details (only if has trips) */}
      {expenseRequest.expenseRequestTrip && expenseRequest.expenseRequestTrip.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <MapPinIcon className="gba:h-5 gba:w-5" />
              {t('section-trip-details')}
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-4">
            {/* Dates - show if expense plan dates are available */}
            {(expenseRequest.expensePlan?.startDate || expenseRequest.expensePlan?.endDate) && (
              <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                {expenseRequest.expensePlan?.startDate && (
                  <div className="gba:flex gba:items-start gba:gap-2">
                    <CalendarIcon weight="duotone" className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mt-0.5" />
                    <div>
                      <Label className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                        {t('label-start-date')}
                      </Label>
                      <p className="gba:text-sm">{formatDateTime(expenseRequest.expensePlan.startDate)}</p>
                    </div>
                  </div>
                )}
                {expenseRequest.expensePlan?.endDate && (
                  <div className="gba:flex gba:items-start gba:gap-2">
                    <ClockIcon className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mt-0.5" />
                    <div>
                      <Label className="gba:text-sm gba:font-medium gba:text-muted-foreground">
                        {t('label-end-date')}
                      </Label>
                      <p className="gba:text-sm">{formatDateTime(expenseRequest.expensePlan.endDate)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Trip Table/Timeline */}
            <EnhancedTripSection
              expenseRequestTrip={expenseRequest.expenseRequestTrip}
              prefixDataTestId="approve-expense-request"
              t={t}
            />
          </CardContent>
        </Card>
      )}

      {/* 6. Allowances (only if has allowances) */}
      {allAllowances && allAllowances.length > 0 && (
        <DetailedAllowancesSection
          allowances={allAllowances}
          currencyCode={currencyCode}
          formatCurrency={formatCurrency}
          prefixDataTestId="approve-expense-request"
          t={t}
        />
      )}

      {/* 7. AI Analysis Section */}
      <AIAnalysisSection
        analysis={aiAnalysis}
        loading={aiAnalysisLoading}
        error={aiAnalysisError}
        onRefresh={refetchAiAnalysis}
      />

      {/* 8. Comment Section - Only for active tasks */}
      {!isTaskCompleted && (
        <div ref={commentSectionRef} data-testid="approve-expense-request-comment-section">
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
              data-testid="approve-expense-request-comment-input"
            />
          )}
        </div>
      )}
    </TaskFormLayout>
  )
}

/**
 * Approve Expense Request component
 * @param props - Business app context props
 * @returns Approve Expense Request component
 */
const ApproveExpenseRequest: React.FC<ApproveExpenseRequestProps> = props => {
  const { accessToken, additionalData, userInfo, onClose } = props

  // Fallback additional data for testing when none is provided
  const fallbackAdditionalData = additionalData || {
    expenseId: '8f760576-8587-4822-ae03-a2ffc45f9b80'
  }

  return (
    <div data-testid="approve-expense-request-wrapper">
      <ApproveExpenseRequestContent
        accessToken={accessToken}
        additionalData={fallbackAdditionalData}
        userInfo={userInfo}
        onClose={onClose}
      />
    </div>
  )
}

export default ApproveExpenseRequest
