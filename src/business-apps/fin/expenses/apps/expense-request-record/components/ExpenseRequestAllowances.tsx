import React from 'react'
import ExpenseRecordAllowances from '../../../common/components/record/ExpenseRecordAllowances'
import type { ExpenseAllowance } from '../types/expenseRequestRecord.types'
import expenseRequestRecordTranslations from '../_i18n'

interface ExpenseRequestAllowancesProps {
  expenseAllowances: ExpenseAllowance[]
  currencyCode?: string
}

const ExpenseRequestAllowances: React.FC<ExpenseRequestAllowancesProps> = ({ expenseAllowances, currencyCode }) => (
  <ExpenseRecordAllowances
    expenseAllowances={expenseAllowances}
    i18nPrefix="expense-request-record"
    translations={expenseRequestRecordTranslations}
    dataTestId="expense-request-allowances"
    currencyCode={currencyCode}
  />
)

export default ExpenseRequestAllowances
