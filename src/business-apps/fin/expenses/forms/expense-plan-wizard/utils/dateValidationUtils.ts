import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { useExpensePlanWizardContext } from '../context/ExpensePlanWizardContext'
/**
 * Checks if a date or date-time is in the past
 * @param date - Date to check
 * @param time - Optional time component
 * @returns Boolean indicating if the date-time is in the past
 */
export const isPastDateTimeFunction = (date: string | Date, time?: string | Date): boolean => {
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
  return dayjs().isAfter(inputDateTime)
}

/**
 * Validates if expense plan dates are in the past
 * @param startDate - Start date of the expense plan
 * @param endDate - End date of the expense plan
 * @returns Boolean indicating if any date is in the past
 */
export const validateExpensePlanDates = (startDate?: string | Date, endDate?: string | Date): boolean => {
  if (startDate && endDate) {
    if (isPastDateTimeFunction(startDate) || isPastDateTimeFunction(endDate)) {
      return true
    }
    return false
  }
  return false
}

/**
 * Hook to check if expense plan dates are in the past
 * @returns Object with hasPastDates boolean and validation function
 */
export const useExpensePlanDateValidation = () => {
  const { expensePlanData } = useExpensePlanWizardContext()
  const [hasPastDates, setHasPastDates] = useState<boolean>(false)

  useEffect(() => {
    if (expensePlanData?.ExpensePlanByPk) {
      const planData = expensePlanData.ExpensePlanByPk
      const planStartDate = planData.startDate
      const planEndDate = planData.endDate

      if (planStartDate && planEndDate) {
        const PastDetected = isPastDateTimeFunction(planStartDate) || isPastDateTimeFunction(planEndDate)
        setHasPastDates(PastDetected)
      } else {
        setHasPastDates(false)
      }
    }
  }, [expensePlanData])

  return { hasPastDates }
}
