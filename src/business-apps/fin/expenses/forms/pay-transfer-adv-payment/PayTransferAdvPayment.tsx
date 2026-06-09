import React, { useState, useEffect } from 'react'
import { Spinner, Alert, AlertTitle, AlertDescription, useTranslation } from '@newwork/nw-design-system'
import { Check } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { TaskDetailHeader } from '@/business-apps/core/every/apps/every-box/components/TaskDetailHeader'
import { TaskDetailFooter } from '@/business-apps/core/every/apps/every-box/components/TaskDetailFooter'
import { TaskFormLayout } from '@/business-apps/core/every/apps/every-box/components/TaskFormLayout'
import { useAdvancePaymentData } from './hooks/useAdvancePaymentData'
import { useEntityDates } from '@/common/data/common/hooks/useEntityDates'
import { formatDateToISO } from './utils/formatters'

// Component imports
import {
  RequestDetailsSection,
  ApprovedBySection,
  TransactionConfirmationSection,
  TransactionConfirmationDetailsSection
} from './components'
import translations from './_i18n'

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

interface PayTransferAdvPaymentProps extends BusinessAppContextProps {
  onClose?: () => void
}

const PayTransferAdvPaymentContent: React.FC<PayTransferAdvPaymentProps> = ({
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

  const [isConfirming, setIsConfirming] = useState(false)
  const [transactionDate, setTransactionDate] = useState<string>('')
  const [confirmationChecked, setConfirmationChecked] = useState(false)

  const { advancePayment, loading, error, refetch } = useAdvancePaymentData({ paymentId, accessToken })

  // Extract task metadata
  const taskPayload = additionalData?.psi_taskPayload || {}
  const processMetadata = additionalData?.psi_processMetadata || {}
  const taskStatus = additionalData?.psi_taskStatus || processMetadata?.status || 'IN_PROGRESS'
  const taskCompletedAt = processMetadata?.completedAt || extendedAdditionalData?.psi_taskCompletedAt
  // Task is completed if status is COMPLETED OR if completedAt exists
  const isTaskCompleted = taskStatus === 'COMPLETED' || !!taskCompletedAt
  const taskTitle = processMetadata?.referenceTaskName || processMetadata?.nodeName || t('task-title')
  const creatorName = taskPayload?.creatorName as string | undefined

  // Use generic hooks for entity dates (request created)
  const { createdAt: requestCreatedAt } = useEntityDates({
    accessToken,
    entityId: advancePayment?.id,
    entityType: 'AdvancePayment'
  })

  // Initialize transaction date to today
  useEffect(() => {
    const today = new Date()
    const todayString = today.toISOString().split('T')[0]
    setTransactionDate(todayString)
  }, [])

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

  const handleConfirm = async () => {
    if (!paymentId || !userInfo?.employeeDetails?.employeeId || !transactionDate || !confirmationChecked) {
      return
    }

    setIsConfirming(true)
    try {
      const formattedTransactionDate = formatDateToISO(transactionDate)

      const payload = {
        event: 'pse_approve',
        advancePayment: {
          id: paymentId,
          amount: advancePayment?.amount,
          transactionDate: formattedTransactionDate,
          transactionConfirmed: confirmationChecked,
          transactionConfirmedByEmployee: userInfo.employeeDetails.employeeId
        }
      }

      dispatchProcessContinueEvent('pse_approve', payload)
    } catch (err) {
      console.error('Error confirming payment transfer:', err)
    } finally {
      setIsConfirming(false)
    }
  }

  if (loading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]"
        data-testid="pay-transfer-adv-payment-loading"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="pay-transfer-adv-payment-error">
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
      <Alert data-testid="pay-transfer-adv-payment-no-data">
        <AlertTitle>{t('error-no-data-title')}</AlertTitle>
        <AlertDescription>{t('error-no-data-description')}</AlertDescription>
      </Alert>
    )
  }

  const displayName =
    `${advancePayment.expensePlan?.employee?.firstName || ''} ${advancePayment.expensePlan?.employee?.lastName || ''}`.trim() ||
    t('value-employee')

  // Check if all required fields are filled
  const isConfirmButtonDisabled = !transactionDate || !confirmationChecked || isConfirming

  return (
    <TaskFormLayout
      data-testid="pay-transfer-adv-payment-container"
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
            data-testid="pay-transfer-adv-payment-actions"
            actions={[
              {
                label: t('action-confirm'),
                onClick: handleConfirm,
                variant: 'default' as const,
                disabled: isConfirmButtonDisabled,
                loading: isConfirming,
                icon: Check,
                className: 'gba:bg-success gba:text-success-foreground hover:gba:bg-success/90',
                testId: 'confirm-transfer-button'
              }
            ]}
          />
        )
      }
      contentClassName="gba:space-y-6"
    >
      {/* 1. Request Details - Amount, Request Date, Status */}
      <RequestDetailsSection
        amount={advancePayment.amount}
        currency={advancePayment.currency}
        requestDate={advancePayment.expensePlan?.decisionDate || requestCreatedAt}
        status={advancePayment.status || 'PENDING'}
        expensePlanId={advancePayment.expensePlan?.id}
        expensePlanTitle={advancePayment.expensePlan?.title}
        expensePlanDocument={advancePayment.expensePlan?.employeeDocument}
        employeeId={advancePayment.expensePlan?.employee?.id}
        accessToken={accessToken}
        prefixDataTestId="pay-transfer-adv-payment"
      />

      {/* 2. Approved By - Supervisor Information */}
      <ApprovedBySection
        approver={advancePayment.expensePlan?.employee?.employeePosition?.supervisor}
        prefixDataTestId="pay-transfer-adv-payment"
      />

      {/* 3. Pickup Confirmation (only for non-completed tasks) */}
      {!isTaskCompleted && (
        <TransactionConfirmationSection
          transactionDate={transactionDate}
          confirmationChecked={confirmationChecked}
          onTransactionDateChange={setTransactionDate}
          onConfirmationChange={setConfirmationChecked}
          prefixDataTestId="pay-transfer-adv-payment"
        />
      )}

      {/* 4. Transaction Confirmation Details (only for completed tasks) */}
      {isTaskCompleted && advancePayment.transactionDate && (
        <TransactionConfirmationDetailsSection
          transactionDate={advancePayment.transactionDate}
          transactionNumber={advancePayment.transactionNumber}
          transactionConfirmedBy={
            advancePayment.transactionConfirmedByEmployee
              ? `${advancePayment.transactionConfirmedByEmployee.firstName} ${advancePayment.transactionConfirmedByEmployee.lastName}`
              : undefined
          }
          prefixDataTestId="pay-transfer-adv-payment"
        />
      )}
    </TaskFormLayout>
  )
}

/**
 * Pay Transfer Advance Payment component
 * @param props - Business app context props
 * @returns Pay Transfer Advance Payment component
 */
const PayTransferAdvPayment: React.FC<PayTransferAdvPaymentProps> = props => {
  const { accessToken, additionalData, userInfo, onClose } = props

  return (
    <div data-testid="pay-transfer-adv-payment-wrapper">
      <PayTransferAdvPaymentContent
        accessToken={accessToken}
        additionalData={additionalData}
        userInfo={userInfo}
        onClose={onClose}
      />
    </div>
  )
}

export default PayTransferAdvPayment
