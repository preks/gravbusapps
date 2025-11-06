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
import { PiCheckCircle, PiCurrencyCircleDollar, PiReceipt, PiCalendar, PiHandCoins } from 'react-icons/pi'
import { useKogitoProcess } from '../../hooks/useKogitoProcess'
import dayjs from 'dayjs'

interface HandOutAdvancePaymentDetailsProps {
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
  transactionConfirmedByEmployee?: string | null
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

export const HandOutAdvancePaymentDetails: React.FC<HandOutAdvancePaymentDetailsProps> = ({
  task,
  taskDetails,
  accessToken,
  onClose,
  onTaskCompleted,
  onTaskUpdated
}) => {
  const [handoutDate, setHandoutDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [validationError, setValidationError] = useState('')

  const { continueProcess } = useKogitoProcess({
    task,
    accessToken,
    onSuccess: () => {
      console.log('Advance payment handout confirmed successfully')
      if (task.id) {
        onTaskCompleted(task.id)
      }
      onTaskUpdated()
      onClose()
    },
    onError: error => {
      console.error('Failed to confirm handout:', error)
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

  const handleConfirmHandout = async () => {
    if (!handoutDate) {
      setValidationError('Handout date is required')
      return
    }

    if (!task.sourceMetadata?.endpoint) {
      console.error('No endpoint available for task completion')
      return
    }

    // Extract domain and processName from endpoint
    let domain = 'cs-selgros'
    let processName = 'payAdvancePayment'

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
          transactionDate: dayjs(handoutDate).toISOString(),
          transactionConfirmedByEmployee: true
        },
        comment: showComment && comment.trim() ? comment.trim() : null
      }

      await continueProcess({ domain, processName, payload })
    } catch (error) {
      console.error('Failed to confirm handout:', error)
      setValidationError('Failed to confirm handout. Please try again.')
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <div className="gba:space-y-6">
      {/* Header */}
      <div className="gba:space-y-4">
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1 gba:rounded-md gba:bg-green-100 gba:text-green-700">
            <PiHandCoins className="gba:h-4 gba:w-4" />
            <span className="gba:text-xs gba:font-medium">Finance</span>
          </div>
        </div>

        <div>
          <h2 className="gba:text-2xl gba:font-semibold gba:mb-1">
            {task.referenceTaskName || 'Hand Out Advance Payment'}
          </h2>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">Requested by {creatorName}</p>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <PiHandCoins className="gba:h-4 gba:w-4" />
        <AlertDescription>
          Please confirm the physical handout of this cash advance payment to the employee.
        </AlertDescription>
      </Alert>

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
              Cash Advance Payment to Hand Out
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-4">
            <div className="gba:bg-muted gba:rounded-lg gba:p-4 gba:space-y-3">
              <div className="gba:flex gba:items-center gba:justify-between">
                <span className="gba:text-lg gba:font-semibold">Amount to Hand Out:</span>
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
                  <Badge variant={advancePayment.status === 'TRANSFERRED' ? 'success' : 'info'}>
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

                {advancePayment.description && (
                  <div className="gba:flex gba:items-start gba:gap-3">
                    <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[120px]">
                      Description:
                    </span>
                    <span className="gba:text-sm gba:flex-1">{advancePayment.description}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Handout Confirmation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-lg gba:flex gba:items-center gba:gap-2">
            <PiHandCoins className="gba:h-5 gba:w-5" />
            Confirm Cash Handout
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <div className="gba:space-y-2">
            <Label htmlFor="handout-date" className="gba:flex gba:items-center gba:gap-2">
              <PiCalendar className="gba:h-4 gba:w-4" />
              Date Handed Out <span className="gba:text-destructive">*</span>
            </Label>
            <input
              id="handout-date"
              type="date"
              value={handoutDate}
              onChange={e => {
                setHandoutDate(e.target.value)
                setValidationError('')
              }}
              className="gba:w-full gba:px-3 gba:py-2 gba:border gba:rounded-md gba:text-sm"
            />
            <p className="gba:text-xs gba:text-muted-foreground">
              Confirm the date when the cash was physically handed out to the employee
            </p>
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
              placeholder="Add any additional notes about this cash handout (optional)..."
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
        <Button onClick={handleConfirmHandout} disabled={isConfirming} className="gba:flex-1" variant="default">
          {isConfirming ? (
            <>
              <Spinner size="sm" className="gba:mr-2" />
              Confirming Handout...
            </>
          ) : (
            <>
              <PiCheckCircle className="gba:h-4 gba:w-4 gba:mr-2" />
              Confirm Cash Handed Out
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
