import React, { useState, useEffect, useMemo } from 'react'
import {
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@newwork/nw-design-system'
import { CheckCircle } from 'lucide-react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

dayjs.extend(utc)
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { useGetAdvancePaymentForApproval } from './queries'
import { AdvancePaymentData } from './types'

// Component imports
import EmployeeInfoSection from './components/EmployeeInfoSection'
import SupervisorInfoSection from './components/SupervisorInfoSection'
import TransactionSection from './components/TransactionSection'
import TransactionConfirmationDetailsSection from './components/TransactionConfirmationDetailsSection'

/**
 * Extended interface for additionalData with form-specific properties
 */
interface ExtendedAdditionalData {
  [k: string]: unknown
  psi_taskCompletedAt?: string
  psi_taskPayload?: {
    [k: string]: unknown
  }
  psi_processMetadata?: {
    [k: string]: unknown
  }
  psi_taskStatus?: string
}

interface ConfirmTransferAdvPaymentProps extends BusinessAppContextProps {
  onClose?: () => void
}

const ConfirmTransferAdvPaymentContent: React.FC<ConfirmTransferAdvPaymentProps> = ({
  additionalData,
  accessToken,
  userInfo,
  onClose
}) => {
  // Cast additionalData to extended interface for proper typing
  const extendedAdditionalData = additionalData as ExtendedAdditionalData | undefined

  const [paymentData, setPaymentData] = useState<AdvancePaymentData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transactionDate, setTransactionDate] = useState<string>('')
  const [transactionId, setTransactionId] = useState<string>('')
  const [confirmationChecked, setConfirmationChecked] = useState(false)
  const [extractedPaymentId, setExtractedPaymentId] = useState<string>('')
  const [isConfirming, setIsConfirming] = useState(false)

  const { fetchAdvancePaymentData } = useGetAdvancePaymentForApproval(accessToken)

  // Extract task metadata
  const processMetadata = additionalData?.psi_processMetadata || {}
  const taskStatus = additionalData?.psi_taskStatus || processMetadata?.status || 'IN_PROGRESS'
  const taskCompletedAt = processMetadata?.completedAt || extendedAdditionalData?.psi_taskCompletedAt
  const isTaskCompleted = taskStatus === 'COMPLETED' || !!taskCompletedAt
  const taskTitle =
    processMetadata?.referenceTaskName || processMetadata?.nodeName || 'Confirm Advance Payment Transfer'
  const taskSource: 'kogito' | 'cflow' = processMetadata?.source || 'kogito'

  const formatDateToISO = (dateString: string): string => {
    if (!dateString) {
      return dayjs().utc().startOf('day').toISOString()
    }

    try {
      // Parse the date string (should be YYYY-MM-DD format from date input)
      const parsed = dayjs(dateString)

      if (!parsed.isValid()) {
        return dayjs().utc().startOf('day').toISOString()
      }

      // Return ISO format string with time set to start of day in UTC
      // This ensures consistent date handling regardless of user's timezone
      return parsed.utc().startOf('day').toISOString()
    } catch {
      return dayjs().utc().startOf('day').toISOString()
    }
  }

  useEffect(() => {
    if (!extractedPaymentId) {
      const paymentId = additionalData?.psi_taskPayload?.advancePayment?.id
      if (paymentId) {
        setExtractedPaymentId(paymentId)
      }
    }
  }, [extractedPaymentId, additionalData])

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

      if (data) {
        setPaymentData(data)
      } else {
        setError('No payment data received from server')
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('429')) {
        setError('API rate limit exceeded. Please wait a moment and try again.')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch payment data')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Set today's date in YYYY-MM-DD format for the date input
    const todayString = dayjs().format('YYYY-MM-DD')
    setTransactionDate(todayString)
  }, [])

  const handleConfirm = async () => {
    if (!userInfo?.employeeDetails?.employeeId) {
      return
    }

    if (!transactionDate) {
      setError('Transaction date is required')
      return
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(transactionDate)) {
      setError('Please enter a valid transaction date (YYYY-MM-DD)')
      return
    }

    if (!confirmationChecked) {
      setError('Please confirm the payment transfer')
      return
    }

    try {
      setIsConfirming(true)
      setError(null)

      const formattedTransactionDate = formatDateToISO(transactionDate)

      const payload = {
        advancePayment: {
          id: extractedPaymentId,
          version: paymentData?.version,
          amount: paymentData?.amount,
          transactionDate: formattedTransactionDate,
          transactionNumber: transactionId,
          transactionConfirmed: confirmationChecked,
          transactionConfirmedByEmployee: userInfo.employeeDetails.employeeId
        }
      }

      dispatchProcessContinueEvent('pse_approve', payload)
    } catch {
      setError('Failed to confirm payment. Please try again.')
    } finally {
      setIsConfirming(false)
    }
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      dispatchProcessContinueEvent('pse_abort', {
        event: 'pse_abort'
      })
    }
  }

  // Detect if we're in every-box context (has onClose callback)
  const isEveryBoxContext = !!onClose

  // Prepare employee data for header
  const employeeDataForHeader = useMemo(() => {
    if (!paymentData?.expensePlan?.employee) {
      return undefined
    }

    const employee = paymentData.expensePlan.employee

    return {
      displayName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee',
      firstName: employee.firstName,
      lastName: employee.lastName,
      avatarUrl: employee.pictureThumbnail ? `data:image/jpeg;base64,${employee.pictureThumbnail}` : undefined,
      position: employee.employeePosition?.jobPosition?.name
    }
  }, [paymentData])

  // Get status display
  const getStatusDisplay = (status?: string) => {
    if (!status) return { label: 'Pending', variant: 'default' as const }
    const statusUpper = status.toUpperCase()
    if (statusUpper === 'BOOKED' || statusUpper === 'APPROVED') {
      return { label: status, variant: 'default' as const }
    }
    return { label: status, variant: 'default' as const }
  }

  const statusDisplay = useMemo(() => getStatusDisplay(paymentData?.status), [paymentData?.status])

  if (isLoading) {
    return (
      <div className="gba:flex gba:flex-col gba:h-full gba:px-6" data-testid="confirm-transfer-adv-payment-container">
        <TaskDetailHeader
          title={taskTitle}
          status={taskStatus}
          source={taskSource}
          onClose={isEveryBoxContext ? handleClose : undefined}
        />
        <div
          className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px] gba:flex-1"
          data-testid="confirm-transfer-adv-payment-loading"
        >
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:flex gba:flex-col gba:h-full gba:px-6" data-testid="confirm-transfer-adv-payment-container">
        <TaskDetailHeader
          title={taskTitle}
          status={taskStatus}
          source={taskSource}
          onClose={isEveryBoxContext ? handleClose : undefined}
        />
        <div className="gba:flex-1 gba:overflow-y-auto gba:py-6">
          <Alert variant="destructive" data-testid="confirm-transfer-adv-payment-error">
            <AlertTitle>Error Loading Payment Data</AlertTitle>
            <AlertDescription>
              {error}
              {error.includes('rate limit') && (
                <div style={{ marginTop: 'var(--nw-spacing-md)' }}>
                  <button
                    onClick={() => {
                      fetchPaymentData()
                    }}
                    className="gba:px-3 gba:py-1 gba:bg-destructive gba:text-destructive-foreground gba:rounded gba:text-sm"
                    data-testid="retry-button"
                  >
                    Retry
                  </button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!paymentData) {
    return (
      <div className="gba:flex gba:flex-col gba:h-full gba:px-6" data-testid="confirm-transfer-adv-payment-container">
        <TaskDetailHeader
          title={taskTitle}
          status={taskStatus}
          source={taskSource}
          onClose={isEveryBoxContext ? handleClose : undefined}
        />
        <div className="gba:flex-1 gba:overflow-y-auto gba:flex gba:items-center gba:justify-center gba:py-6">
          <Alert data-testid="confirm-transfer-adv-payment-no-data">
            <AlertTitle>No Payment Data</AlertTitle>
            <AlertDescription>Unable to load payment information. Please try refreshing the page.</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const { expensePlan } = paymentData
  const { employee } = expensePlan

  const handleTransactionDateChange = (value: string) => {
    setTransactionDate(value)
  }

  const handleTransactionIdChange = (value: string) => {
    setTransactionId(value)
  }

  const handleConfirmationChange = (checked: boolean) => {
    setConfirmationChecked(checked)
  }

  return (
    <TaskFormLayout
      data-testid="confirm-transfer-adv-payment-container"
      header={
        <TaskDetailHeader
          title={taskTitle}
          status={taskStatus}
          source={taskSource}
          showEmployeeInfo={true}
          employeeData={employeeDataForHeader}
          isLoadingEmployee={isLoading}
          onClose={isEveryBoxContext ? handleClose : undefined}
          customBadges={
            <Badge variant={statusDisplay.variant} data-testid="payment-status-badge">
              {statusDisplay.label}
            </Badge>
          }
        />
      }
      footer={
        isTaskCompleted ? undefined : (
          <TaskDetailFooter
            data-testid="confirm-transfer-adv-payment-actions"
            actions={[
              {
                label: 'Confirm',
                onClick: handleConfirm,
                variant: 'default' as const,
                disabled: isConfirming || !confirmationChecked,
                loading: isConfirming,
                icon: CheckCircle,
                className: 'gba:bg-success gba:text-success-foreground hover:gba:bg-success/90',
                testId: 'confirm-button'
              }
            ]}
          />
        )
      }
      contentClassName="gba:space-y-4"
    >
      {/* Error Messages */}
      {error && (
        <Alert variant="destructive" data-testid="error-message">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Request Details Section */}
      <Card>
        <CardHeader>
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:confirm_transfer_advance_payment.request_details',
              'Request Details'
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeeInfoSection
            employee={employee}
            amount={paymentData.amount}
            currency={paymentData.currency}
            status={paymentData.status}
            expensePlan={expensePlan}
            accessToken={accessToken}
          />
        </CardContent>
      </Card>

      {/* Approved By Section */}
      {employee.employeePosition?.supervisor && (
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:confirm_transfer_advance_payment.approved_by',
                'Approved By'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SupervisorInfoSection supervisor={employee.employeePosition.supervisor} />
          </CardContent>
        </Card>
      )}

      {/* Transaction Confirmation Section - Only for non-completed tasks */}
      {!isTaskCompleted && (
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:confirm_transfer_advance_payment.transaction_confirmation_text',
                'Transaction Confirmation'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionSection
              transactionDate={transactionDate}
              transactionId={transactionId}
              confirmationChecked={confirmationChecked}
              onTransactionDateChange={handleTransactionDateChange}
              onTransactionIdChange={handleTransactionIdChange}
              onConfirmationChange={handleConfirmationChange}
            />
          </CardContent>
        </Card>
      )}

      {/* Transaction Confirmation Details - Only for completed tasks */}
      {isTaskCompleted && paymentData.transactionDate && (
        <Card>
          <CardHeader>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:confirm_transfer_advance_payment.transaction_confirmation_details',
                'Transaction Confirmation Details'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionConfirmationDetailsSection
              transactionDate={paymentData.transactionDate}
              transactionId={paymentData.transactionNumber}
              transactionConfirmedBy={
                paymentData.transactionConfirmedByEmployee
                  ? `${paymentData.transactionConfirmedByEmployee.firstName} ${paymentData.transactionConfirmedByEmployee.lastName}`
                  : undefined
              }
            />
          </CardContent>
        </Card>
      )}
    </TaskFormLayout>
  )
}

/**
 * Confirm Transfer Advance Payment component
 * @param props - Business app context props
 * @returns Confirm Transfer Advance Payment component
 */
const ConfirmTransferAdvPayment: React.FC<ConfirmTransferAdvPaymentProps> = props => {
  return (
    <div data-testid="confirm-transfer-adv-payment-wrapper">
      <ConfirmTransferAdvPaymentContent {...props} />
    </div>
  )
}

export default ConfirmTransferAdvPayment
