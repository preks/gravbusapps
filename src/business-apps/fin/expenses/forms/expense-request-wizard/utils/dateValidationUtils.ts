import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { useExpenseRequestWizardContext } from '../context/ExpenseRequestWizardContext'

/**
 * Checks if a date or date-time is in the future
 * @param date - Date to check
 * @param time - Optional time component
 * @returns Boolean indicating if the date-time is in the future
 */
export const isFutureDateTimeFunction = (date: string | Date, time?: string | Date): boolean => {
  if (!date) return false

  let inputDateTime = dayjs(date)

  if (time && dayjs(time).isValid()) {
    const timeObj = dayjs(time)
    inputDateTime = inputDateTime
      .set('hour', timeObj.hour())
      .set('minute', timeObj.minute())
      .set('second', timeObj.second())
  }

  if (inputDateTime.isSame(dayjs(), 'day')) {
    return false
  }
  return dayjs().isBefore(inputDateTime)
}

/**
 * Validates if expense request dates are in the future
 * @param startDate - Start date of the expense request
 * @param endDate - End date of the expense request
 * @returns Boolean indicating if any date is in the future
 */
export const validateExpenseRequestDates = (startDate?: string | Date, endDate?: string | Date): boolean => {
  if (startDate && endDate) {
    if (isFutureDateTimeFunction(startDate) || isFutureDateTimeFunction(endDate)) {
      return true
    }
    return false
  }
  return false
}

/**
 * Hook to check if expense request dates are in the future
 * @returns Object with hasFutureDates boolean and validation function
 */
export const useExpenseRequestDateValidation = () => {
  const { expenseRequestData } = useExpenseRequestWizardContext()
  const [hasFutureDates, setHasFutureDates] = useState<boolean>(false)

  useEffect(() => {
    if (expenseRequestData?.ExpenseRequestByPk) {
      const requestData = expenseRequestData.ExpenseRequestByPk
      const requestStartDate = requestData.startDate
      const requestEndDate = requestData.endDate

      if (requestStartDate && requestEndDate) {
        const futureDetected = isFutureDateTimeFunction(requestStartDate) || isFutureDateTimeFunction(requestEndDate)
        setHasFutureDates(futureDetected)
      } else {
        setHasFutureDates(false)
      }
    }
  }, [expenseRequestData])

  return { hasFutureDates }
}
