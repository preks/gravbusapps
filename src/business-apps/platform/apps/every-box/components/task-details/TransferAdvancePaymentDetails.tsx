import React, { useState } from 'react'
import { UnifiedTask } from '../../types'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Textarea,
  Label,
  Separator,
  Alert,
  AlertDescription,
  Spinner,
  Badge,
  Switch
} from '@newwork/nw-design-system'
import { PiCheckCircle, PiCurrencyCircleDollar, PiReceipt, PiCalendar, PiBank } from 'react-icons/pi'
import { useKogitoProcess } from '../../hooks/useKogitoProcess'
import dayjs from 'dayjs'

interface TransferAdvancePaymentDetailsProps {
  task: UnifiedTask
  taskDetails: any
  accessToken: string
  onClose: () => void
  onTaskCompleted: (taskId: string) => void
  onTaskUpdated: () => void
}

interface AdvancePayment {
  id: string
  amount: number
  currencyRef: string
  paymentMethod: string
  status: string
  decisionDate: string
  transactionDate?: string | null
  transactionNumber?: string | null
  transactionConfirmed: boolean
  description?: string
}

interface ExpensePlan {
  id: string
  code: string
  title: string
  description?: string
  requestTypeRef: string
  planDate: string
  totalAmount: number
  currencyRef: string
  advancePaymentTotalAmount: number
  advancePaymentPaidAmount: number
  status: string
  startDate: string
  endDate: string
}

export const TransferAdvancePaymentDetails: React.FC<TransferAdvancePaymentDetailsProps> = ({
  task,
  taskDetails,
  accessToken,
  onClose,
  onTaskCompleted,
  onTaskUpdated
}) => {
  const [transactionNumber, setTransactionNumber] = useState('')
  const [transactionDate, setTransactionDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [validationError, setValidationError] = useState('')

  const { continueProcess } = useKogitoProcess({
    task,
    accessToken,
    onSuccess: () => {
      console.log('Advance payment transfer confirmed successfully')
      if (task.id) {
        onTaskCompleted(task.id)
      }
      onTaskUpdated()
      onClose()
    },
    onError: error => {
      console.error('Failed to confirm transfer:', error)
    }
  })

  // Extract data from task
  const advancePayment = taskDetails?.parameters?.advancePayment as AdvancePayment | undefined
  const expensePlan = taskDetails?.parameters?.expensePlan as ExpensePlan | undefined
  const creatorName = task.sourceMetadata?.creatorName || 'Unknown'

  const extractCurrencyCode = (currencyRef: string): string => {
    return currencyRef?.split(':').pop() || 'EUR'
  }

  const formatCurrency = (amount: number, currencyRef: string): string => {
    const currency = extractCurrencyCode(currencyRef)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatPaymentMethod = (method: string): string => {
    return method?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'
  }

  const formatRequestType = (typeRef: string): string => {
    const type = typeRef?.split(':').pop() || ''
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const handleConfirmTransfer = async () => {
    if (!transactionNumber.trim()) {
      setValidationError('Transaction number is required')
      return
    }

    if (!transactionDate) {
      setValidationError('Transaction date is required')
      return
    }

    if (!task.sourceMetadata?.endpoint) {
      console.error('No endpoint available for task completion')
      return
    }

    // Extract domain and processName from endpoint
    let domain = 'cs-selgros'
    let processName = 'transferAdvancePayment'

    try {
      const endpoint = task.sourceMetadata.endpoint as string
      const pathname = endpoint.startsWith('http') ? new URL(endpoint).pathname : endpoint
      const pathSegments = pathname.split('/').filter(Boolean)

      if (pathSegments.length >= 6 && pathSegments[0] === 'processes') {
        domain = pathSegments[1]
        processName = pathSegments[2]
      }
    } catch (error) {
      console.error('Failed to extract domain/processName from endpoint:', error)
    }

    setIsConfirming(true)
    setValidationError('')

    try {
      const payload = {
        advancePayment: {
          ...advancePayment,
          transactionNumber: transactionNumber.trim(),
          transactionDate: dayjs(transactionDate).toISOString(),
          transactionConfirmed: true
        },
        comment: showComment && comment.trim() ? comment.trim() : null
      }

      await continueProcess({ domain, processName, payload })
    } catch (error) {
      console.error('Failed to confirm transfer:', error)
      setValidationError('Failed to confirm transfer. Please try again.')
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <div className="gba:space-y-6">
      {/* Header */}
      <div className="gba:space-y-4">
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1 gba:rounded-md gba:bg-blue-100 gba:text-blue-700">
            <PiCurrencyCircleDollar className="gba:h-4 gba:w-4" />
            <span className="gba:text-xs gba:font-medium">Finance</span>
          </div>
        </div>

        <div>
          <h2 className="gba:text-2xl gba:font-semibold gba:mb-1">
            {task.referenceTaskName || 'Transfer Advance Payment'}
          </h2>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">Requested by {creatorName}</p>
        </div>
      </div>

      {/* Expense Plan Details */}
      {expensePlan && (
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-lg gba:flex gba:items-center gba:gap-2">
              <PiReceipt className="gba:h-5 gba:w-5" />
              Expense Plan Details
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-4">
            <div className="gba:bg-muted gba:rounded-lg gba:p-4 gba:space-y-3">
              <div className="gba:flex gba:items-start gba:gap-3">
                <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[120px]">Code:</span>
                <span className="gba:text-sm gba:flex-1 gba:font-medium">{expensePlan.code}</span>
              </div>

              <div className="gba:flex gba:items-start gba:gap-3">
                <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[120px]">Title:</span>
                <span className="gba:text-sm gba:flex-1 gba:font-medium">{expensePlan.title}</span>
              </div>

              {expensePlan.description && (
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[120px]">
                    Description:
                  </span>
                  <span className="gba:text-sm gba:flex-1 gba:text-muted-foreground">{expensePlan.description}</span>
                </div>
              )}

              <div className="gba:flex gba:items-start gba:gap-3">
                <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[120px]">Type:</span>
                <Badge variant="info">{formatRequestType(expensePlan.requestTypeRef)}</Badge>
              </div>

              <Separator />

              <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-3">
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[120px]">
                    Period:
                  </span>
                  <span className="gba:text-sm gba:flex-1">
                    {dayjs(expensePlan.startDate).format('MMM D, YYYY')} -{' '}
                    {dayjs(expensePlan.endDate).format('MMM D, YYYY')}
                  </span>
                </div>

                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[120px]">
                    Total Amount:
                  </span>
                  <span className="gba:text-sm gba:flex-1 gba:font-medium">
                    {formatCurrency(expensePlan.totalAmount, expensePlan.currencyRef)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advance Payment Details */}
      {advancePayment && (
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-lg gba:flex gba:items-center gba:gap-2">
              <PiCurrencyCircleDollar className="gba:h-5 gba:w-5" />
              Advance Payment to Transfer
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-4">
            <div className="gba:bg-muted gba:rounded-lg gba:p-4 gba:space-y-3">
              <div className="gba:flex gba:items-center gba:justify-between">
                <span className="gba:text-lg gba:font-semibold">Amount to Transfer:</span>
                <span className="gba:text-2xl gba:font-bold gba:text-primary">
                  {formatCurrency(advancePayment.amount, advancePayment.currencyRef)}
                </span>
              </div>

              <Separator />

              <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-3">
                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[120px]">
                    Payment Method:
                  </span>
                  <span className="gba:text-sm gba:flex-1">{formatPaymentMethod(advancePayment.paymentMethod)}</span>
                </div>

                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[120px]">
                    Status:
                  </span>
                  <Badge variant={advancePayment.status === 'BOOKED' ? 'warning' : 'info'}>
                    {advancePayment.status}
                  </Badge>
                </div>

                <div className="gba:flex gba:items-start gba:gap-3">
                  <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[120px]">
                    Decision Date:
                  </span>
                  <span className="gba:text-sm gba:flex-1">
                    {dayjs(advancePayment.decisionDate).format('MMM D, YYYY HH:mm')}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Details Form */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-lg gba:flex gba:items-center gba:gap-2">
            <PiBank className="gba:h-5 gba:w-5" />
            Transaction Details
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:space-y-2">
            <Label htmlFor="transaction-number">
              Transaction Number <span className="gba:text-destructive">*</span>
            </Label>
            <input
              id="transaction-number"
              type="text"
              value={transactionNumber}
              onChange={e => {
                setTransactionNumber(e.target.value)
                setValidationError('')
              }}
              placeholder="Enter bank transaction number..."
              className="gba:w-full gba:px-3 gba:py-2 gba:border gba:rounded-md gba:text-sm"
            />
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="transaction-date" className="gba:flex gba:items-center gba:gap-2">
              <PiCalendar className="gba:h-4 gba:w-4" />
              Transaction Date <span className="gba:text-destructive">*</span>
            </Label>
            <input
              id="transaction-date"
              type="date"
              value={transactionDate}
              onChange={e => {
                setTransactionDate(e.target.value)
                setValidationError('')
              }}
              className="gba:w-full gba:px-3 gba:py-2 gba:border gba:rounded-md gba:text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Comment Section */}
      <Card>
        <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0">
          <CardTitle className="gba:text-lg">Additional Notes</CardTitle>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Label htmlFor="show-comment" className="gba:text-sm gba:font-normal gba:cursor-pointer">
              Add comment
            </Label>
            <Switch id="show-comment" checked={showComment} onCheckedChange={setShowComment} />
          </div>
        </CardHeader>
        {showComment && (
          <CardContent>
            <Textarea
              id="comment"
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Add any additional notes about this transfer (optional)..."
              rows={4}
              className="gba:resize-none"
            />
          </CardContent>
        )}
      </Card>

      {/* Validation Error */}
      {validationError && (
        <Alert variant="destructive">
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {/* Action Button */}
      <div className="gba:flex gba:gap-3">
        <Button onClick={handleConfirmTransfer} disabled={isConfirming} className="gba:flex-1" variant="default">
          {isConfirming ? (
            <>
              <Spinner size="sm" className="gba:mr-2" />
              Confirming Transfer...
            </>
          ) : (
            <>
              <PiCheckCircle className="gba:h-4 gba:w-4 gba:mr-2" />
              Confirm Transfer Completed
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
