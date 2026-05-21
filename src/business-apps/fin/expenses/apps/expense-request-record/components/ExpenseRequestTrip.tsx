import React from 'react'
import ExpenseRecordTrip from '../../../common/components/record/ExpenseRecordTrip'
import type { ExpenseRequestTripType } from '../types/expenseRequestRecord.types'
import expenseRequestRecordTranslations from '../_i18n'

interface ExpenseRequestTripProps {
  expenseRequestTrips: ExpenseRequestTripType[]
}

const ExpenseRequestTrip: React.FC<ExpenseRequestTripProps> = ({ expenseRequestTrips }) => (
  <ExpenseRecordTrip
    expenseRequestTrips={expenseRequestTrips}
    i18nPrefix="expense-request-record"
    translations={expenseRequestRecordTranslations}
    dataTestId="expense-request-trip"
  />
)

export default ExpenseRequestTrip
