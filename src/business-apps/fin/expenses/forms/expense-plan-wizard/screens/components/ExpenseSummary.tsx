import React from 'react'
import { Divider } from 'antd'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import { useExpensePlanWizardTranslation } from '../../useExpensePlanWizardTranslation'

interface ExpenseSummaryProps {
  planData: any
}

/**
 * ExpenseSummary component displays financial summary information for an expense plan
 * including expenses, non-reimbursable amount, reimbursable amount, and advance payment
 */
const ExpenseSummary: React.FC<ExpenseSummaryProps> = ({ planData }) => {
  const { t } = useExpensePlanWizardTranslation()

  if (!planData) return null

  /**
   * Determines which summary sections to display based on plan data
   */
  const whatToDisplay = () => {
    const displayObject = {
      displayExpenses: true,
      displayNonReimbursable: false,
      displayReimbursable: false,
      displayAdvance: false
    }

    if (planData && planData.nonReimbursableAmount && planData.nonReimbursableAmount !== 0) {
      displayObject.displayNonReimbursable = true
    }

    if (planData && planData.reimbursableAmount && planData.reimbursableAmount !== 0) {
      displayObject.displayReimbursable = true
    }

    if (
      planData &&
      planData.advancePayment &&
      planData.advancePayment.length > 0 &&
      planData.advancePayment[0].amount &&
      planData.advancePayment[0].amount !== 0
    ) {
      displayObject.displayAdvance = true
    }
    return displayObject
  }

  /**
   * Gets all financial values from plan data
   */
  const getValues = () => {
    const zeroValue = 0
    let returnValues: any = {}
    const addDataPayload = planData ? planData : ''
    const addDataPayloadCurrency =
      addDataPayload && addDataPayload.currency && addDataPayload.currency.code ? addDataPayload.currency.code : ''

    const expensesValue = {
      currency: addDataPayloadCurrency,
      amount: addDataPayload.totalAmount ? addDataPayload.totalAmount : zeroValue
    }

    returnValues = {
      ...returnValues,
      expenses: expensesValue
    }

    const nonReimbursableValue = {
      currency: addDataPayloadCurrency,
      amount: addDataPayload.nonReimbursableAmount ? addDataPayload.nonReimbursableAmount : zeroValue
    }

    returnValues = {
      ...returnValues,
      nonReimbursable: nonReimbursableValue
    }

    const reimbursableValue = {
      currency: addDataPayloadCurrency,
      amount: addDataPayload.reimbursableAmount ? addDataPayload.reimbursableAmount : zeroValue
    }

    returnValues = {
      ...returnValues,
      reimbursable: reimbursableValue
    }

    const advancePaymentValue = {
      currency: addDataPayloadCurrency,
      amount: planData.advancePayment[0]?.amount ? planData.advancePayment[0].amount : zeroValue
    }

    returnValues = {
      ...returnValues,
      advancePayment: advancePaymentValue
    }

    return returnValues
  }

  // Get display configuration and values
  const displayObject = whatToDisplay()
  const values = getValues()

  // Determine which sections are visible to properly place dividers
  const visibleSections = [
    displayObject.displayExpenses,
    displayObject.displayNonReimbursable,
    displayObject.displayReimbursable,
    displayObject.displayAdvance
  ].filter(Boolean)

  const sectionCount = visibleSections.length
  let currentSectionIndex = 0

  return (
    <div className="gba:px-2 [&_.ant-divider-horizontal]:my-6" data-testid="expense-summary-container">
      {(displayObject.displayExpenses ||
        displayObject.displayNonReimbursable ||
        displayObject.displayReimbursable ||
        displayObject.displayAdvance) && <Divider className="gba:mb-4" data-testid="expense-summary-divider" />}

      {displayObject.displayExpenses && (
        <>
          <div className="gba:min-h-[40px] gba:py-4" data-testid="expense-summary-expenses">
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-normal">{t('payment-estimated-expenses-label')}</span>
              <span className="gba:text-3xl gba:font-bold">
                {formatNumberFunction(values.expenses.amount, '0.00[,]00')} {values.expenses.currency}
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
              <span className="gba:text-sm gba:font-normal">{t('summary-non-reimbursable-amount')}</span>
              <span className="gba:text-sm gba:font-bold gba:text-primary">
                {formatNumberFunction(values.nonReimbursable.amount, '0.00[,]00')} {values.nonReimbursable.currency}
              </span>
            </div>
          </div>
          {++currentSectionIndex < sectionCount && <Divider className="gba:my-0" />}
        </>
      )}

      {displayObject.displayReimbursable && (
        <>
          <div className="gba:min-h-[40px] gba:py-4" data-testid="expense-summary-reimbursable">
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-normal">{t('summary-reimbursable-amount')}</span>
              <span className="gba:text-sm gba:font-bold gba:text-success">
                {formatNumberFunction(values.reimbursable.amount, '0.00[,]00')} {values.reimbursable.currency}
              </span>
            </div>
          </div>
          {++currentSectionIndex < sectionCount && <Divider className="gba:my-0" />}
        </>
      )}

      {displayObject.displayAdvance && (
        <>
          <div className="gba:min-h-[40px] gba:py-4" data-testid="expense-summary-advance">
            <div className="gba:flex gba:justify-between gba:items-center">
              <span className="gba:text-sm gba:font-normal">{t('payment-advance-payment-label')}</span>
              <span className="gba:text-sm gba:font-bold gba:text-foreground">
                {formatNumberFunction(values.advancePayment.amount, '0.00[,]00')} {values.advancePayment.currency}
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
