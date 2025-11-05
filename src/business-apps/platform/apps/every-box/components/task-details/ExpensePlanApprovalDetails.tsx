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

interface ExpensePlanApprovalDetailsProps {
  task: UnifiedTask
  taskDetails: any
  accessToken: string
  onClose: () => void
  onTaskCompleted: (taskId: string) => void
  onTaskUpdated: () => void
  employeeId?: string // Current user's employee ID for approval comments
}

export const ExpensePlanApprovalDetails: React.FC<ExpensePlanApprovalDetailsProps> = ({
  task,
  taskDetails,
  accessToken,
  onClose,
  onTaskCompleted,
  onTaskUpdated: _onTaskUpdated,
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

  // Extract expense plan from task parameters
  const expensePlan = taskDetails?.parameters?.expensePlan

  // Fetch related entities (employee, cost center, project)
  const { entities, isLoading: isLoadingEntities } = useExpenseRelatedEntities({
    employeeId: expensePlan?.employee,
    costCenterId: expensePlan?.costCenter,
    projectId: expensePlan?.project,
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

  if (!expensePlan) {
    return (
      <div className="gba:p-6">
        <p className="gba:text-sm gba:text-muted-foreground">No expense plan data available</p>
      </div>
    )
  }

  // Extract currency code from API format (e.g., "Currency:v1:EUR" -> "EUR")
  const extractCurrencyCode = (currencyRef: string): string => {
    return currencyRef?.split(':').pop() || 'EUR'
  }

  const currencyCode = extractCurrencyCode(expensePlan.currencyRef)

  // Format currency values
  const formatCurrency = (amount: number): string => {
    return formatCurrencyDisplay(amount, currencyCode)
  }

  // Get status display information
  const statusDisplay = getExpenseRequestStatusDisplay(expensePlan.status)
  const moduleInfo = getModuleInfo(task.name, task.type)

  // Handle approve action
  const handleApprove = async () => {
    if (!employeeId) {
      message.error('Employee ID is required for approval')
      return
    }

    try {
      setIsApproving(true)

      await continueProcess({
        event: 'pse_approve',
        expensePlanComment: {
          commentDate: new Date().toISOString().slice(0, 19), // Format: YYYY-MM-DDTHH:mm:ss (without timezone)
          comment: comment || '',
          commentType: 'APPROVE_COMMENT',
          authorEmployee: employeeId,
          expensePlan: expensePlan?.id
        }
      })

      message.success('Expense plan approved successfully')
      onTaskCompleted(task.id)
      onClose()
    } catch (_error) {
      message.error('Failed to approve expense plan')
    } finally {
      setIsApproving(false)
    }
  }

  // Handle reject action
  const handleReject = async () => {
    if (!comment.trim()) {
      message.warning('Please provide a reason for rejection')
      return
    }

    if (!employeeId) {
      message.error('Employee ID is required for rejection')
      return
    }

    try {
      setIsRejecting(true)

      await continueProcess({
        event: 'pse_reject',
        expensePlanComment: {
          commentDate: new Date().toISOString().slice(0, 19), // Format: YYYY-MM-DDTHH:mm:ss (without timezone)
          comment: comment,
          commentType: 'REJECT_COMMENT',
          authorEmployee: employeeId,
          expensePlan: expensePlan?.id
        }
      })

      message.success('Expense plan rejected')
      onTaskCompleted(task.id)
      onClose()
    } catch (_error) {
      message.error('Failed to reject expense plan')
    } finally {
      setIsRejecting(false)
    }
  }

  const ModuleIcon = moduleInfo.icon

  return (
    <div className="gba:space-y-6" data-testid="expense-plan-approval-details">
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
            <h2 className="gba:text-xl gba:font-semibold gba:text-foreground" data-testid="expense-plan-title">
              {expensePlan.title || 'Expense Plan'}
            </h2>
          </div>
          <p className="gba:text-sm gba:text-muted-foreground gba:ml-7" data-testid="expense-plan-code">
            Code: {expensePlan.code}
          </p>
        </div>
        <Badge variant={statusDisplay.variant} data-testid="expense-plan-status-badge">
          {statusDisplay.label}
        </Badge>
      </div>

      {expensePlan.description && (
        <>
          <div>
            <p className="gba:text-sm gba:text-muted-foreground gba:italic" data-testid="expense-plan-description">
              {expensePlan.description}
            </p>
          </div>
          <Separator />
        </>
      )}

      {/* Employee Information */}
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
            <p className="gba:text-sm gba:text-muted-foreground">Employee: {expensePlan.employee}</p>
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
                <p className="gba:text-sm gba:text-muted-foreground">{expensePlan.costCenter}</p>
              )}
            </div>
          </div>

          {/* Project */}
          {expensePlan.project && (
            <div className="gba:flex gba:items-start gba:gap-2">
              <PiFolder className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mt-0.5" />
              <div className="gba:flex-1">
                <Label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Project</Label>
                {entities.project ? (
                  <p className="gba:text-sm">{entities.project.name}</p>
                ) : (
                  <p className="gba:text-sm gba:text-muted-foreground">{expensePlan.project}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trip Details */}
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
                <p className="gba:text-sm">{formatDate(expensePlan.startDate)}</p>
              </div>
            </div>
            <div className="gba:flex gba:items-start gba:gap-2">
              <PiClock className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mt-0.5" />
              <div>
                <Label className="gba:text-sm gba:font-medium gba:text-muted-foreground">End Date</Label>
                <p className="gba:text-sm">{formatDate(expensePlan.endDate)}</p>
              </div>
            </div>
          </div>

          {/* Transportation Means */}
          {expensePlan.additionalProperties?.transportationMeans &&
            expensePlan.additionalProperties.transportationMeans.length > 0 && (
              <div>
                <Label className="gba:text-sm gba:font-medium gba:text-muted-foreground">Transportation</Label>
                <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mt-1">
                  {expensePlan.additionalProperties.transportationMeans.map((mean: string, index: number) => {
                    const displayMean = mean.split(':').pop() || mean
                    return (
                      <Badge key={index} variant="outline">
                        {displayMean.replace(/_/g, ' ')}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Financial Details */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <PiWallet className="gba:h-5 gba:w-5" />
            Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-3">
          <div className="gba:flex gba:justify-between gba:items-center">
            <Label className="gba:text-sm gba:text-muted-foreground">Total Amount</Label>
            <p className="gba:text-lg gba:font-bold">{formatCurrency(expensePlan.totalAmount)}</p>
          </div>

          <Separator />

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">Expenses</Label>
              <p className="gba:text-sm gba:font-medium">{formatCurrency(expensePlan.totalAmountExpense)}</p>
            </div>
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">Allowances</Label>
              <p className="gba:text-sm gba:font-medium">{formatCurrency(expensePlan.totalAmountAllowance)}</p>
            </div>
          </div>

          <Separator />

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">Reimbursable</Label>
              <p className="gba:text-sm gba:font-medium gba:text-success">
                {formatCurrency(expensePlan.reimbursableAmount)}
              </p>
            </div>
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">Non-Reimbursable</Label>
              <p className="gba:text-sm gba:font-medium gba:text-destructive">
                {formatCurrency(expensePlan.nonReimbursableAmount)}
              </p>
            </div>
          </div>

          <Separator />

          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">Deductible</Label>
              <p className="gba:text-sm gba:font-medium">{formatCurrency(expensePlan.deductibleAmount)}</p>
            </div>
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">Non-Deductible</Label>
              <p className="gba:text-sm gba:font-medium">{formatCurrency(expensePlan.nonDeductibleAmount)}</p>
            </div>
          </div>

          {expensePlan.advancePaymentTotalAmount > 0 && (
            <>
              <Separator />
              <div>
                <Label className="gba:text-sm gba:text-muted-foreground">Advance Payment</Label>
                <p className="gba:text-sm gba:font-medium">{formatCurrency(expensePlan.advancePaymentTotalAmount)}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Comment Section and Action Buttons (only for non-completed tasks) */}
      {task.status !== 'COMPLETED' && (
        <>
          {/* Comment Section */}
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
                placeholder="Enter your approval comment or rejection reason..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={4}
                className="gba:w-full"
                data-testid="expense-plan-approval-comment"
              />
            )}
          </div>

          {/* Action Buttons */}
          <div
            className="gba:flex gba:gap-2 gba:flex-wrap gba:justify-end gba:pt-4 gba:border-t"
            style={{ borderColor: 'var(--color-border-default)' }}
          >
            <Button
              variant="default"
              onClick={handleApprove}
              disabled={isApproving || isRejecting}
              className="gba:flex gba:items-center gba:gap-2"
              data-testid="expense-plan-approve-button"
            >
              {isApproving ? (
                <>Processing...</>
              ) : (
                <>
                  <ThumbsUp className="gba:h-4 gba:w-4" />
                  Approve
                </>
              )}
            </Button>

            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isApproving || isRejecting}
              className="gba:flex gba:items-center gba:gap-2"
              data-testid="expense-plan-reject-button"
            >
              {isRejecting ? (
                <>Processing...</>
              ) : (
                <>
                  <XCircle className="gba:h-4 gba:w-4" />
                  Reject
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

