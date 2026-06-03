import React from 'react'
import { Divider } from 'antd'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import { useExpenseRequestWizardTranslation } from '../../useExpenseRequestWizardTranslation'

interface ExpenseSummaryProps {
  requestData: any
}

/**
 * ExpenseSummary component displays financial summary information for an expense request
 * including expenses, advance payment, non-reimbursable amount, and remaining amount
 */
const ExpenseSummary: React.FC<ExpenseSummaryProps> = ({ requestData }) => {
  const { t } = useExpenseRequestWizardTranslation()

  if (!requestData) return null

  /**
   * Determines which summary sections to display based on request data
   */
  const whatToDisplay = () => {
    const displayObject = {
      displayExpenses: true,
      displayAdvance: false,
      displayNonReimbursable: false,
      displayRemaining: false
    }

    if (
      requestData &&
      requestData.expensePlan &&
      requestData.expensePlan.advancePaymentTotalAmount &&
      requestData.expensePlan.advancePaymentTotalAmount !== 0
    ) {
      displayObject.displayAdvance = true
    }
    if (requestData && requestData.nonReimbursableAmount && requestData.nonReimbursableAmount !== 0) {
      displayObject.displayNonReimbursable = true
    }

    if (
      requestData &&
      requestData.totalAmount &&
      requestData.totalRemainingAmount &&
      requestData.totalAmount !== requestData.totalRemainingAmount
    ) {
      displayObject.displayRemaining = true
    }

    return displayObject
  }

  /**
   * Gets all financial values from request data
   */
  const getValues = () => {
    const zeroValue = 0
    let returnValues: any = {}
    const addDataPayload = requestData ? requestData : ''
    const addDataPayloadCurrency =
      addDataPayload && addDataPayload.currency && addDataPayload.currency.code ? addDataPayload.currency.code : ''
    const addDataPlan = addDataPayload ? addDataPayload.expensePlan : ''

    const expensesValue = {
      currency: addDataPayloadCurrency,
      amount: addDataPayload.totalAmount ? addDataPayload.totalAmount : zeroValue
    }

    returnValues = {
      ...returnValues,
      expenses: expensesValue
    }

    const advancePaymentValue = {
      currency: addDataPlan && addDataPlan.currency && addDataPlan.currency.code ? addDataPlan.currency.code : '',
      amount: addDataPlan && addDataPlan.advancePaymentTotalAmount ? addDataPlan.advancePaymentTotalAmount : zeroValue
    }

    returnValues = {
      ...returnValues,
      advancePayment: advancePaymentValue
    }

    const nonReimbursableValue = {
      currency: addDataPayloadCurrency,
      amount: addDataPayload.nonReimbursableAmount ? addDataPayload.nonReimbursableAmount : zeroValue
    }

    returnValues = {
      ...returnValues,
      nonReimbursable: nonReimbursableValue
    }

    const remainingAmountValue = {
      currency: addDataPayloadCurrency,
      amount: addDataPayload.totalRemainingAmount ? addDataPayload.totalRemainingAmount : zeroValue
    }

    returnValues = {
      ...returnValues,
      remainingAmount: remainingAmountValue
    }

    const differenceRequestPlanAmount =
      parseFloat(addDataPayload.totalAmount ? addDataPayload.totalAmount : zeroValue) -
      parseFloat(addDataPlan && addDataPlan.totalAmount ? addDataPlan.totalAmount : zeroValue)

    returnValues = {
      ...returnValues,
      differenceRequestPlan: differenceRequestPlanAmount,
      differenceCurrency: addDataPayloadCurrency
    }

    return returnValues
  }

  // Get display configuration and values
  const displayObject = whatToDisplay()
  const values = getValues()

  // Determine which sections are visible to properly place dividers
  const visibleSections = [
    displayObject.displayExpenses,
    displayObject.displayAdvance,
    displayObject.displayNonReimbursable,
    displayObject.displayRemaining
  ].filter(Boolean)

  const sectionCount = visibleSections.length
  let currentSectionIndex = 0

  return (
    <div className="gba:px-2 [&_.ant-divider-horizontal]:my-6" data-testid="expense-summary-container">
      {(displayObject.displayExpenses ||
        displayObject.displayAdvance ||
        displayObject.displayNonReimbursable ||
        displayObject.displayRemaining) && <Divider className="gba:mb-4" data-testid="expense-summary-divider" />}
      {displayObject.displayExpenses && (
        <>
          <div className="gba:min-h-[40px] gba:py-4" data-testid="expense-summary-expenses">
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-normal">{t('summary-expenses-label')}</span>
              <span className="gba:text-3xl gba:font-bold">
                {formatNumberFunction(values.expenses.amount, '0.00[,]00')} {values.expenses.currency}
              </span>
            </div>

            {requestData.expensePlan && (
              <div className="gba:text-right">
                {parseFloat(values.differenceRequestPlan) > 0 && (
                  <span className="gba:text-sm gba:font-bold gba:text-warning">
                    {formatNumberFunction(Math.abs(values.differenceRequestPlan).toString(), '0.00[,]00')}{' '}
                    {values.differenceCurrency} {t('summary-comparison-more')}
                  </span>
                )}

                {parseFloat(values.differenceRequestPlan) < 0 && (
                  <span className="gba:text-sm gba:font-bold gba:text-success">
                    {formatNumberFunction(Math.abs(values.differenceRequestPlan).toString(), '0.00[,]00')}{' '}
                    {values.differenceCurrency} {t('summary-comparison-less')}
                  </span>
                )}

                {parseFloat(values.differenceRequestPlan) === 0 && (
                  <span className="gba:text-sm gba:font-bold gba:text-success">
                    {formatNumberFunction(Math.abs(values.differenceRequestPlan).toString(), '0.00[,]00')}{' '}
                    {values.differenceCurrency} {t('summary-comparison-equal')}
                  </span>
                )}
              </div>
            )}
          </div>
          {++currentSectionIndex < sectionCount && <Divider className="gba:my-0" />}
        </>
      )}

      {displayObject.displayAdvance && (
        <>
          <div className="gba:min-h-[40px] gba:py-4" data-testid="expense-summary-advance">
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-normal">{t('summary-advance-payment')}</span>
              <span className="gba:text-sm gba:font-bold gba:text-primary">
                {values.advancePayment.amount != 0 && '-'}
                {formatNumberFunction(values.advancePayment.amount, '0.00[,]00')} {values.advancePayment.currency}
              </span>
            </div>
          </div>
          {++currentSectionIndex < sectionCount && <Divider className="gba:my-0" />}
        </>
      )}

      {displayObject.displayNonReimbursable && (
        <>
          <div className="gba:min-h-[40px] gba:py-4" data-testid="expense-summary-non-reimbursable">
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-normal">{t('summary-non-reimbursable')}</span>
              <span className="gba:text-sm gba:font-bold gba:text-primary">
                {values.nonReimbursable.amount != 0 && '-'}
                {formatNumberFunction(values.nonReimbursable.amount, '0.00[,]00')} {values.nonReimbursable.currency}
              </span>
            </div>
          </div>
          {++currentSectionIndex < sectionCount && <Divider className="gba:my-0" />}
        </>
      )}

      {displayObject.displayRemaining && (
        <>
          <div className="gba:min-h-[40px] gba:py-4" data-testid="expense-summary-remaining">
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-normal">{t('summary-remaining')}</span>
              <span className="gba:text-sm gba:font-bold gba:text-success">
                {formatNumberFunction(values.remainingAmount.amount, '0.00[,]00')} {values.remainingAmount.currency}
              </span>
            </div>
          </div>
          {++currentSectionIndex < sectionCount && <Divider className="gba:my-0" />}
        </>
      )}
    </div>
  )
}

export default ExpenseSummary
