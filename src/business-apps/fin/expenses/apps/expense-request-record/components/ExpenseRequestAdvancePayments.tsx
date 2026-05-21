import React from 'react'
import ExpenseRecordAdvancePayments from '../../../common/components/record/ExpenseRecordAdvancePayments'
import type { AdvancePayment } from '../types/expenseRequestRecord.types'
import expenseRequestRecordTranslations from '../_i18n'

interface ExpenseRequestAdvancePaymentsProps {
  advancePayments: AdvancePayment[]
}

const ExpenseRequestAdvancePayments: React.FC<ExpenseRequestAdvancePaymentsProps> = ({ advancePayments }) => (
  <ExpenseRecordAdvancePayments
    advancePayments={advancePayments}
    i18nPrefix="expense-request-record"
    translations={expenseRequestRecordTranslations}
    cardClassName="gba:mb-6"
    dataTestId="expense-request-advance-payments-card"
  />
)

export default ExpenseRequestAdvancePayments
