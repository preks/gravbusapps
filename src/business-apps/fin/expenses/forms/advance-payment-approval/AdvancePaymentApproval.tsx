import React, { useState, useEffect } from 'react'
import {
  Button,
  Textarea,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Avatar,
  Separator
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AdvancePaymentApprovalProps, AdvancePaymentData } from './types'
import { useGetAdvancePaymentForApproval } from './queries'
import { formatCurrency } from '../approve-expense-plan/utils/formatters'

const AdvancePaymentApproval: React.FC<AdvancePaymentApprovalProps & BusinessAppContextProps> = ({
  paymentId,
  accessToken,
  additionalData,
  onClose = () => {},
  onApprove = () => {},
  onReject = () => {},
  ...contextProps
}) => {
  const [paymentData, setPaymentData] = useState<AdvancePaymentData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [extractedPaymentId, setExtractedPaymentId] = useState<string | null>(null)

  const { fetchAdvancePaymentData } = useGetAdvancePaymentForApproval(accessToken)

  useEffect(() => {
    if (!extractedPaymentId) {
      if (paymentId) {
        setExtractedPaymentId(paymentId)
      } else if (additionalData?.psi_taskPayload?.advancePayment?.id) {
        setExtractedPaymentId(additionalData.psi_taskPayload.advancePayment.id)
      }
    }
  }, [extractedPaymentId, paymentId, additionalData])

  useEffect(() => {
    if (extractedPaymentId) {
      fetchPaymentData()
    }
  }, [extractedPaymentId])

  const fetchPaymentData = async () => {
    if (!extractedPaymentId) {
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchAdvancePaymentData(extractedPaymentId)
      setPaymentData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payment data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!extractedPaymentId) {
      return
    }

    setIsSubmitting(true)
    try {
      const today = new Date().toISOString()

      window.dispatchEvent(
        new CustomEvent('com.newwork.process.continue', {
          detail: {
            event: 'pse_approve',
            payload: {
              changeMode: 'INSERT',
              advancePaymentComment: {
                commentDate: today,
                comment: message || '',
                commentType: 'APPROVE_COMMENT',
                authorEmployee: contextProps.userInfo?.employeeDetails?.employeeId,
                advancePayment: extractedPaymentId
              }
            }
          }
        })
      )

      onClose()
    } catch (err) {
      console.error('Error approving payment:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!extractedPaymentId) {
      return
    }

    if (!message.trim()) {
      setShowWarning(true)
      return
    }

    setIsSubmitting(true)
    try {
      const today = new Date().toISOString()

      window.dispatchEvent(
        new CustomEvent('com.newwork.process.continue', {
          detail: {
            event: 'pse_reject',
            payload: {
              changeMode: 'INSERT',
              advancePaymentComment: {
                commentDate: today,
                comment: message || '',
                commentType: 'REJECT_COMMENT',
                authorEmployee: contextProps.userInfo?.employeeDetails?.employeeId,
                advancePayment: extractedPaymentId
              }
            }
          }
        })
      )

      onClose()
    } catch (err) {
      console.error('Error rejecting payment:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!extractedPaymentId || !accessToken) {
    return (
      <div data-testid="advance-payment-approval-container">
        <div className="gba:shadow-none gba:bg-background gba:rounded-lg">
          <div className="gba:p-6">
            <Alert variant="destructive">
              <AlertTitle>
                {getTranslationFromI18nKeyAndLabel('lowcoder:common.error', 'Configuration Error')}
              </AlertTitle>
              <AlertDescription>Missing payment ID. Please check the platform configuration.</AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div data-testid="advance-payment-approval-container">
        <div className="gba:shadow-none gba:bg-background gba:rounded-lg">
          <div className="gba:p-6">
            <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
              <Spinner size="lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div data-testid="advance-payment-approval-container">
        <div className="gba:shadow-none gba:bg-background gba:rounded-lg">
          <div className="gba:p-6">
            <Alert variant="destructive">
              <AlertTitle>
                {getTranslationFromI18nKeyAndLabel('lowcoder:common.error', 'Error Loading Data')}
              </AlertTitle>
              <AlertDescription>Failed to load payment data: {error}</AlertDescription>
            </Alert>
            <div className="gba:mt-4">
              <Button onClick={fetchPaymentData}>
                {getTranslationFromI18nKeyAndLabel('lowcoder:common.retry', 'Retry')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!paymentData) {
    return (
      <div data-testid="advance-payment-approval-container">
        <div className="gba:shadow-none gba:bg-background gba:rounded-lg">
          <div className="gba:p-6">
            <Alert variant="destructive">
              <AlertTitle>{getTranslationFromI18nKeyAndLabel('lowcoder:common.error', 'No Data Available')}</AlertTitle>
              <AlertDescription>No payment data available for ID: {extractedPaymentId}</AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  const { expensePlan, amount, description, currency, paymentMethod, costCenter } = paymentData
  const { employee } = expensePlan

  return (
    <div className="gba:border-0" data-testid="advance-payment-approval-container">
      <div className="gba:shadow-none gba:rounded-lg">
        <div className="gba:p-0">
          {/* Header Section */}
          <div className="gba:text-center gba:mb-2 gba:px-2 gba:pt-8" data-testid="advance-payment-approval-header">
            <h1
              className="gba:text-2xl gba:font-semibold gba:m-0 gba:text-foreground gba:mb-1"
              data-testid="advance-payment-approval-title"
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:approve_advance_payment.title', 'Approve Advance Payment')}
            </h1>
          </div>

          <Separator className="gba:h-px gba:!bg-muted gba:mb-2" />

          {/* Expense Plan and Employee Info */}
          <div className="gba:flex gba:flex-row gba:gap-6 gba:mb-1">
            <div className="gba:flex-1 gba:bg-card gba:rounded-lg gba:pt-4 gba:p-6">
              <h3 className="gba:text-base gba:font-semibold gba:mb-2 gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_request.expense_request_container.current_expense_plan_label',
                  'Expense plan'
                )}
              </h3>
              <div className="gba:space-y-0.5 gba:text-sm">
                <div className="gba:flex gba:justify-between gba:items-center">
                  <span className="gba:font-medium gba:text-muted-foreground gba:min-w-0 gba:flex-shrink-0">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:approve_advance_payment.id', 'Id')}:
                  </span>
                  <span className="gba:text-foreground gba:font-medium gba:ml-4 gba:text-right gba:break-words">
                    {expensePlan.code}
                  </span>
                </div>
                <div className="gba:flex gba:justify-between gba:items-start">
                  <span className="gba:font-medium gba:text-muted-foreground gba:min-w-0 gba:flex-shrink-0">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_request_list.expense_plan_table.title',
                      'Title'
                    )}
                    :
                  </span>
                  <span className="gba:text-foreground gba:ml-4 gba:text-right gba:break-words gba:flex-1">
                    {expensePlan.title}
                  </span>
                </div>
                <div className="gba:flex gba:justify-between gba:items-center">
                  <span className="gba:font-medium gba:text-muted-foreground gba:min-w-0 gba:flex-shrink-0">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.type', 'Type')}
                    :
                  </span>
                  <span className="gba:text-foreground gba:ml-4 gba:text-right gba:break-words">
                    {expensePlan.requestType.value}
                  </span>
                </div>
                <div className="gba:flex gba:justify-between gba:items-center">
                  <span className="gba:font-medium gba:text-muted-foreground gba:min-w-0 gba:flex-shrink-0">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_request_list.expense_plan_table.amount',
                      'Amount'
                    )}
                    :
                  </span>
                  <span className="gba:text-foreground gba:font-semibold gba:ml-4 gba:text-right gba:break-words">
                    {formatCurrency(expensePlan.totalAmount, expensePlan.currency.code)}
                  </span>
                </div>
              </div>
            </div>

            <div className="gba:flex-1 gba:bg-card gba:rounded-lg gba:pt-4 gba:p-6">
              <h3 className="gba:text-base gba:font-semibold gba:mb-4 gba:text-foreground">
                {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')}
              </h3>
              <div className="gba:flex gba:items-center gba:gap-4">
                {employee.pictureThumbnail ? (
                  <img
                    src={`data:image/jpeg;base64,${employee.pictureThumbnail}`}
                    alt={`${employee.firstName} ${employee.lastName}`}
                    className="gba:w-14 gba:h-14 gba:rounded-full gba:object-cover gba:flex-shrink-0"
                    data-testid="employee-avatar"
                  />
                ) : (
                  <Avatar className="gba:w-14 gba:h-14 gba:bg-blue-500 gba:flex-shrink-0" data-testid="employee-avatar">
                    <span className="gba:text-lg gba:text-white">{employee.firstName?.charAt(0) || 'A'}</span>
                  </Avatar>
                )}
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:font-semibold gba:text-foreground gba:break-words gba:leading-relaxed gba:text-base">
                    {`${employee.firstName} ${employee.lastName}`}
                  </div>
                  <div className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                    {employee.employeePosition?.jobPosition?.name || 'Unknown Role'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="gba:mb-4 gba:p-2 gba:rounded-sm gba:w-full" data-testid="approve-expense-plan-notes">
            <div className="gba:text-sm gba:font-semibold gba:mb-1 gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_plan.notes_area_label', 'Notes')}
            </div>
            <div className="gba:bg-muted gba:rounded-sm">
              <Textarea
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:approve_expense_plan.notes_area_placeholder',
                  'No Notes'
                )}
                value={description || ''}
                disabled
                className="gba:!bg-transparent gba:border-none gba:resize-none gba:p-2 gba:text-xs gba:rounded-none gba:w-full"
                data-testid="approve-expense-plan-notes-textarea"
              />
            </div>
          </div>

          {/* Payment Details Section */}
          <div>
            <h3 className="gba:bg-gray-100 gba:p-3 gba:rounded-sm gba:mb-4 gba:w-full gba:text-foreground gba:text-sm gba:font-semibold gba:pl-6">
              {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.advance_payment', 'Advance Payment')}
            </h3>
            <div className="gba:mb-8 gba:bg-card gba:rounded-lg gba:pt-1 gba:p-6">
              <div className="gba:space-y-4 gba:text-sm">
                <div className="gba:flex gba:justify-between gba:items-center">
                  <span className="gba:font-medium gba:text-muted-foreground gba:min-w-0 gba:flex-shrink-0">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:create_expense_request.add_request_trip_details.payment_method',
                      'Payment Method'
                    )}
                    :
                  </span>
                  <span className="gba:text-foreground gba:ml-4 gba:text-right gba:break-words gba:flex-1">
                    {paymentMethod}
                  </span>
                </div>
                <div className="gba:flex gba:justify-between gba:items-center">
                  <span className="gba:font-medium gba:text-muted-foreground gba:min-w-0 gba:flex-shrink-0">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_request_overview.side_bar.request_cost_center',
                      'Cost Center'
                    )}
                    :
                  </span>
                  <span className="gba:text-foreground gba:ml-4 gba:text-right gba:break-words gba:flex-1">
                    {costCenter.name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator className="gba:!h-3 gba:!bg-muted gba:mb-2" />
          {/* Amount Display */}
          <div className="gba:flex gba:justify-between gba:items-center gba:px-6 gba:py-6 gba:border-b gba:border-border gba:mb-8">
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:m-0">
              {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_plan.advance_payment', 'Advance Payment')}
            </h3>
            <div className="gba:text-2xl gba:font-bold gba:text-foreground">
              {formatCurrency(amount, currency.code)}
            </div>
          </div>
          {/* Message Section */}
          <div className="gba:mb-4 gba:p-2 gba:rounded-sm gba:w-full" data-testid="approve-expense-plan-message">
            <div className="gba:text-md gba:font-semibold gba:mb-1 gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_list.search_employee_list.recent_employees_table.message',
                'Message'
              )}
            </div>
            <div className="gba:bg-muted gba:rounded-sm">
              <Textarea
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:approve_expense_plan.comment_area',
                  'Write Message...'
                )}
                value={message}
                onChange={e => {
                  setMessage(e.target.value)
                  if (showWarning) setShowWarning(false)
                }}
                className="gba:!bg-transparent gba:border-none gba:resize-none gba:p-2 gba:text-xs gba:rounded-none gba:w-full"
                data-testid="advance-payment-message-input"
              />
            </div>
            {showWarning && (
              <div className="gba:text-destructive gba:text-sm gba:mt-2" data-testid="advance-payment-message-warning">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:approve_expense_plan.warning_message',
                  'Please add a message!'
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="gba:flex gba:justify-end gba:gap-4 gba:px-6 gba:pb-8">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={isSubmitting}
              data-testid="advance-payment-reject-button"
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.reject_button', 'Reject')}
            </Button>
            <Button onClick={handleApprove} disabled={isSubmitting} data-testid="advance-payment-approve-button">
              {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_plan.approve_button', 'Approve')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdvancePaymentApproval
