import React, { useState } from 'react'
import { message } from 'antd'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Separator,
  Label,
  Textarea,
  Switch,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import {
  PiReceipt,
  PiCalendarDuotone,
  PiClock,
  PiMapPin,
  PiUser,
  PiBuilding,
  PiFolder,
  PiWallet
} from 'react-icons/pi'
import { ThumbsUp, XCircle, MessageSquare } from 'lucide-react'
import { UnifiedTask } from '../../types'
import { useKogitoProcess } from '../../hooks/useKogitoProcess'
import { useExpenseRelatedEntities } from '../../hooks/useExpenseRelatedEntities'
import { formatDate } from '@/common/utils/windowUtils'
import { getExpenseRequestStatusDisplay, formatCurrencyDisplay } from '@/business-apps/fin/expenses/apps/personal-expenses/utils'
import { getModuleInfo } from '../../utils/moduleIcons'

interface ExpenseApprovalDetailsProps {
  task: UnifiedTask
  taskDetails: any
  accessToken: string
  onClose: () => void
  onTaskCompleted: (taskId: string) => void
  onTaskUpdated: () => void
  employeeId?: string // Current user's employee ID for approval comments
}

export const ExpenseApprovalDetails: React.FC<ExpenseApprovalDetailsProps> = ({
  task,
  taskDetails,
  accessToken,
  onClose,
  onTaskCompleted,
  onTaskUpdated,
  employeeId
}) => {
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const { continueProcess } = useKogitoProcess({
    task,
    accessToken,
    onSuccess: () => {
    },
    onError: _error => {
    }
  })

  // Extract expense request from task parameters
  const expenseRequest = taskDetails?.parameters?.expenseRequest

  // Fetch related entities (employee, cost center, project)
  const { entities, isLoading: isLoadingEntities } = useExpenseRelatedEntities({
    employeeId: expenseRequest?.employee,
    costCenterId: expenseRequest?.costCenter,
    projectId: expenseRequest?.project,
    accessToken
  })

  // Helper to get employee initials for avatar fallback
  const getInitials = (name: string): string => {
    const parts = name.split(' ').filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  if (!expenseRequest) {
    return (
      <div className="gba:p-6">
        <p className="gba:text-sm gba:text-muted-foreground">No expense request data available</p>
      </div>
    )
  }

  // Extract currency code from API format (e.g., "Currency:v1:EUR" -> "EUR")
  const extractCurrencyCode = (currencyRef: string): string => {
    return currencyRef?.split(':').pop() || 'EUR'
  }

  const currencyCode = extractCurrencyCode(expenseRequest.currencyRef)

  // Format request type for display
  const formatRequestType = (typeRef: string): string => {
    const type = typeRef?.split(':').pop() || typeRef
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Format transportation means
  const formatTransportMeans = (means: string[]): string => {
    if (!means || means.length === 0) return 'N/A'
    return means
      .map(m => {
        const type = m.split(':').pop() || m
        return type
          .replace(/_/g, ' ')
          .toLowerCase()
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      })
      .join(', ')
  }

  const handleApprove = async () => {
    setIsApproving(true)
    try {

      // Create approval payload with correct structure
      await continueProcess({
        domain: 'employee-expense',
        processName: 'approveExpenseRequest',
        payload: {
          event: 'pse_approve',
          expenseRequestComment: {
            commentDate: new Date().toISOString().slice(0, 19), // Format: YYYY-MM-DDTHH:mm:ss (without timezone)
            comment: comment || '',
            commentType: 'APPROVE_COMMENT',
            authorEmployee: employeeId,
            expenseRequest: expenseRequest?.id
          }
        }
      })

      message.success({
        content: 'Expense request approved successfully',
        duration: 3
      })

      // Close and refresh after short delay
      setTimeout(() => {
        if (onTaskCompleted && task.id) {
          onTaskCompleted(task.id)
        }
        onTaskUpdated()
        onClose()
      }, 500)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve'
      message.error({
        content: `Failed to approve: ${errorMessage}`,
        duration: 5
      })
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!comment.trim()) {
      message.warning({
        content: 'Please provide a reason for rejection',
        duration: 3
      })
      setShowComment(true)
      return
    }

    setIsRejecting(true)
    try {

      // Create rejection payload with correct structure
      await continueProcess({
        domain: 'employee-expense',
        processName: 'approveExpenseRequest',
        payload: {
          event: 'pse_reject',
          changeMode: 'INSERT',
          expenseRequestComment: {
            commentDate: new Date().toISOString().slice(0, 19), // Format: YYYY-MM-DDTHH:mm:ss (without timezone)
            comment: comment,
            commentType: 'REJECT_COMMENT',
            authorEmployee: employeeId,
            expenseRequest: expenseRequest?.id
          }
        }
      })

      message.success({
        content: 'Expense request rejected successfully',
        duration: 3
      })

      // Close and refresh after short delay
      setTimeout(() => {
        if (onTaskCompleted && task.id) {
          onTaskCompleted(task.id)
        }
        onTaskUpdated()
        onClose()
      }, 500)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject'
      message.error({
        content: `Failed to reject: ${errorMessage}`,
        duration: 5
      })
    } finally {
      setIsRejecting(false)
    }
  }

  const statusConfig = getExpenseRequestStatusDisplay(expenseRequest.status)
  const moduleInfo = getModuleInfo(task.name, task.type)
  const ModuleIcon = moduleInfo.icon

  return (
    <div className="gba:space-y-6" data-testid="expense-approval-details">
      {/* Module Badge */}
      <div className="gba:flex gba:items-center gba:gap-2">
        <ModuleIcon className={`gba:h-5 gba:w-5 ${moduleInfo.color}`} />
        <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">{moduleInfo.name}</span>
      </div>

      {/* Header Section */}
      <div className="gba:flex gba:justify-between gba:items-start">
        <div className="gba:flex-1">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
            <PiReceipt className="gba:h-5 gba:w-5 gba:text-primary" />
            <h2 className="gba:text-xl gba:font-semibold gba:text-foreground" data-testid="expense-request-title">
              {expenseRequest.title}
            </h2>
          </div>
          <p className="gba:text-sm gba:text-muted-foreground gba:ml-7" data-testid="expense-request-code">
            Code: {expenseRequest.code}
          </p>
        </div>
        <Badge variant={(statusConfig as any).badgeVariant || 'outline'} data-testid="expense-request-status-badge">
          {statusConfig.label}
        </Badge>
      </div>

      {expenseRequest.description && (
        <>
          <div>
            <p className="gba:text-sm gba:text-muted-foreground gba:italic" data-testid="expense-request-description">
              {expenseRequest.description}
            </p>
          </div>
          <Separator />
        </>
      )}

      {/* Employee Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <PiUser className="gba:h-5 gba:w-5" />
            Employee Details
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          {isLoadingEntities ? (
            <p className="gba:text-sm gba:text-muted-foreground">Loading employee details...</p>
          ) : entities.employee ? (
            <div className="gba:flex gba:items-center gba:gap-3">
              <Avatar>
                {entities.employee.avatarUrl ? (
                  <AvatarImage src={entities.employee.avatarUrl} alt={entities.employee.displayName} />
                ) : null}
                <AvatarFallback>{getInitials(entities.employee.displayName)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="gba:font-medium">{entities.employee.displayName}</p>
                <p className="gba:text-sm gba:text-muted-foreground">
                  {entities.employee.firstName} {entities.employee.lastName}
                </p>
              </div>
            </div>
          ) : (
            <p className="gba:text-sm gba:text-muted-foreground">Employee: {expenseRequest.employee}</p>
          )}

          <Separator />

          {/* Cost Center */}
          <div className="gba:flex gba:items-start gba:gap-2">
            <PiBuilding className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mt-0.5" />
            <div className="gba:flex-1">
              <Label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Cost Center</Label>
              {entities.costCenter ? (
                <p className="gba:text-sm">
                  {entities.costCenter.name}
                  {entities.costCenter.code && (
                    <span className="gba:text-muted-foreground"> ({entities.costCenter.code})</span>
                  )}
                </p>
              ) : (
                <p className="gba:text-sm gba:text-muted-foreground">{expenseRequest.costCenter}</p>
              )}
            </div>
          </div>

          {/* Project */}
          {expenseRequest.project && (
            <div className="gba:flex gba:items-start gba:gap-2">
              <PiFolder className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mt-0.5" />
              <div className="gba:flex-1">
                <Label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Project</Label>
                {entities.project ? (
                  <p className="gba:text-sm">{entities.project.name}</p>
                ) : (
                  <p className="gba:text-sm gba:text-muted-foreground">{expenseRequest.project}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
            <PiWallet className="gba:h-4 gba:w-4" />
            Financial Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-3">
          <div className="gba:flex gba:justify-between gba:items-center">
            <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">Total Amount</span>
            <span className="gba:text-lg gba:font-bold gba:text-foreground">
              {formatCurrencyDisplay(expenseRequest.totalAmount, currencyCode)}
            </span>
          </div>
          
          <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:pt-2 gba:border-t">
            <div>
              <p className="gba:text-xs gba:text-muted-foreground gba:mb-1">Expenses</p>
              <p className="gba:text-sm gba:font-semibold gba:text-foreground">
                {formatCurrencyDisplay(expenseRequest.totalAmountExpense, currencyCode)}
              </p>
            </div>
            <div>
              <p className="gba:text-xs gba:text-muted-foreground gba:mb-1">Allowances</p>
              <p className="gba:text-sm gba:font-semibold gba:text-foreground">
                {formatCurrencyDisplay(expenseRequest.totalAmountAllowance, currencyCode)}
              </p>
            </div>
          </div>

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <p className="gba:text-xs gba:text-muted-foreground gba:mb-1">Reimbursable</p>
              <p className="gba:text-sm gba:font-semibold gba:text-success">
                {formatCurrencyDisplay(expenseRequest.reimbursableAmount, currencyCode)}
              </p>
            </div>
            <div>
              <p className="gba:text-xs gba:text-muted-foreground gba:mb-1">Deductible</p>
              <p className="gba:text-sm gba:font-semibold gba:text-info">
                {formatCurrencyDisplay(expenseRequest.deductibleAmount, currencyCode)}
              </p>
            </div>
          </div>

          {expenseRequest.totalRemainingAmount > 0 && (
            <div className="gba:pt-2 gba:border-t">
              <div className="gba:flex gba:justify-between gba:items-center">
                <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">Remaining Amount</span>
                <span className="gba:text-sm gba:font-semibold gba:text-warning">
                  {formatCurrencyDisplay(expenseRequest.totalRemainingAmount, currencyCode)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trip Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
            <PiMapPin className="gba:h-4 gba:w-4" />
            Trip Information
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-3">
          <div className="gba:flex gba:items-start gba:gap-3">
            <PiCalendarDuotone className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:mt-0.5" />
            <div className="gba:flex-1">
              <p className="gba:text-xs gba:text-muted-foreground gba:mb-1">Duration</p>
              <p className="gba:text-sm gba:font-medium gba:text-foreground">
                {formatDate(expenseRequest.startDate, 'date.short')} → {formatDate(expenseRequest.endDate, 'date.short')}
              </p>
            </div>
          </div>

          <div className="gba:flex gba:items-start gba:gap-3">
            <PiClock className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:mt-0.5" />
            <div className="gba:flex-1">
              <p className="gba:text-xs gba:text-muted-foreground gba:mb-1">Request Date</p>
              <p className="gba:text-sm gba:font-medium gba:text-foreground">
                {formatDate(expenseRequest.requestDate, 'date.short')}
              </p>
            </div>
          </div>

          <div className="gba:flex gba:items-start gba:gap-3">
            <PiReceipt className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:mt-0.5" />
            <div className="gba:flex-1">
              <p className="gba:text-xs gba:text-muted-foreground gba:mb-1">Request Type</p>
              <p className="gba:text-sm gba:font-medium gba:text-foreground">
                {formatRequestType(expenseRequest.requestTypeRef)}
              </p>
            </div>
          </div>

          {expenseRequest.additionalProperties?.transportationMeans && (
            <div className="gba:flex gba:items-start gba:gap-3">
              <PiMapPin className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:mt-0.5" />
              <div className="gba:flex-1">
                <p className="gba:text-xs gba:text-muted-foreground gba:mb-1">Transportation</p>
                <p className="gba:text-sm gba:font-medium gba:text-foreground">
                  {formatTransportMeans(expenseRequest.additionalProperties.transportationMeans)}
                </p>
              </div>
            </div>
          )}

          {expenseRequest.overnightAccommodation && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:pt-2">
              <Badge variant="info" className="gba:text-xs">
                Overnight Accommodation Included
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comment Section and Action Buttons (only for non-completed tasks) */}
      {task.status !== 'COMPLETED' && (
        <>
          {/* Comment Section */}
          <div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
              <MessageSquare className="gba:h-4 gba:w-4" />
              <Label htmlFor="approval-comment" className="gba:text-sm gba:font-medium">
                Add Comment {showComment && '(Required for rejection)'}
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
                data-testid="expense-approval-comment-input"
              />
            )}
          </div>

          {/* Action Buttons */}
          <div
            className="gba:flex gba:gap-2 gba:flex-wrap gba:justify-end gba:pt-4 gba:border-t"
            style={{ borderColor: 'var(--color-border-default)' }}
          >
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting || isApproving}
              data-testid="expense-reject-button"
              className="gba:flex gba:items-center gba:gap-2"
            >
              <XCircle className="gba:h-4 gba:w-4" />
              {isRejecting ? 'Rejecting...' : 'Reject'}
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isApproving || isRejecting}
              data-testid="expense-approve-button"
              className="gba:flex gba:items-center gba:gap-2 gba:bg-success gba:text-success-foreground hover:gba:bg-success/90"
            >
              <ThumbsUp className="gba:h-4 gba:w-4" />
              {isApproving ? 'Approving...' : 'Approve'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

