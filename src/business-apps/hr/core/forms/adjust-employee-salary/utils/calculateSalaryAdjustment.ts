import { calculateAmountFromPercentage, calculateAdjustmentInAnnual } from './salaryCalculator'
import type { AdjustEmployeeSalaryFormValues } from '../types'

interface SalaryAdjustmentResult {
  newAnnualSalary: number | null
  newMonthlySalary: number | null
  newHourlySalary: number | null
  adjustmentValue: number
  adjustmentType: 'amount' | 'percentage'
}

/**
 * Calculate hourly salary adjustment
 */
const calculateHourlyAdjustment = (
  values: AdjustEmployeeSalaryFormValues,
  currentSalaryHourly: number
): SalaryAdjustmentResult => {
  let newHourlySalary: number | null = null
  let adjustmentValue = 0
  const adjustmentType: 'amount' | 'percentage' =
    values.amountIncrease && values.amountIncrease > 0 ? 'amount' : 'percentage'

  if (values.amountIncrease && values.amountIncrease > 0) {
    adjustmentValue = values.amountIncrease
    newHourlySalary = currentSalaryHourly + values.amountIncrease
  } else if (values.percentageIncrease && values.percentageIncrease > 0) {
    adjustmentValue = values.percentageIncrease
    const increaseAmount = calculateAmountFromPercentage(currentSalaryHourly, values.percentageIncrease)
    newHourlySalary = currentSalaryHourly + increaseAmount
  }

  return {
    newAnnualSalary: null,
    newMonthlySalary: null,
    newHourlySalary,
    adjustmentValue,
    adjustmentType
  }
}

/**
 * Calculate annual/monthly salary adjustment
 */
const calculateAnnualMonthlyAdjustment = (
  values: AdjustEmployeeSalaryFormValues,
  currentSalaryAnnual: number,
  currentSalaryMonthly: number | null
): SalaryAdjustmentResult => {
  let newAnnualSalary: number | null = null
  let newMonthlySalary: number | null = null
  let adjustmentValue = 0
  const adjustmentType: 'amount' | 'percentage' =
    values.amountIncrease && values.amountIncrease > 0 ? 'amount' : 'percentage'

  const currentSalaryInFrequency =
    values.adjustmentFrequency === 'monthly' ? (currentSalaryMonthly ?? currentSalaryAnnual / 12) : currentSalaryAnnual

  if (values.amountIncrease && values.amountIncrease > 0) {
    adjustmentValue = values.amountIncrease
    const adjustmentAnnual = calculateAdjustmentInAnnual(values.amountIncrease, values.adjustmentFrequency)
    if (adjustmentAnnual != null) {
      newAnnualSalary = currentSalaryAnnual + adjustmentAnnual
      newMonthlySalary = newAnnualSalary / 12
    }
  } else if (values.percentageIncrease && values.percentageIncrease > 0) {
    adjustmentValue = values.percentageIncrease
    const increaseAmount = calculateAmountFromPercentage(currentSalaryInFrequency, values.percentageIncrease)
    const adjustmentAnnual = calculateAdjustmentInAnnual(increaseAmount, values.adjustmentFrequency)
    if (adjustmentAnnual != null) {
      newAnnualSalary = currentSalaryAnnual + adjustmentAnnual
      newMonthlySalary = newAnnualSalary / 12
    }
  }

  return {
    newAnnualSalary,
    newMonthlySalary,
    newHourlySalary: null,
    adjustmentValue,
    adjustmentType
  }
}

/**
 * Calculate salary adjustment based on frequency.
 *
 * Intended for "adjust" mode when the employee has existing salary data.
 * The UI should disable frequency options that lack corresponding salary data
 * (e.g., disable "hourly" when no hourly salary exists).
 *
 * Defensive behavior: If required salary data is missing for the selected frequency
 * (e.g., hourly adjustment requested but no hourly salary), this function returns
 * a no-op result (all null values, zero adjustment) and logs a warning. It does not
 * throw, so callers do not need to pre-validate salary data existence.
 */
export const calculateSalaryAdjustment = (
  values: AdjustEmployeeSalaryFormValues,
  currentSalaryAnnual: number,
  currentSalaryMonthly: number | null,
  currentSalaryHourly: number | null
): SalaryAdjustmentResult => {
  if (values.adjustmentFrequency === 'hourly') {
    // Handle missing hourly salary gracefully - return zeros instead of throwing
    // The UI should prevent this case by disabling hourly option when no hourly data exists
    if (currentSalaryHourly == null || currentSalaryHourly === 0) {
      console.warn('Attempted hourly adjustment without hourly salary data')
      return {
        newAnnualSalary: null,
        newMonthlySalary: null,
        newHourlySalary: null,
        adjustmentValue: 0,
        adjustmentType: 'amount'
      }
    }
    return calculateHourlyAdjustment(values, currentSalaryHourly)
  }

  return calculateAnnualMonthlyAdjustment(values, currentSalaryAnnual, currentSalaryMonthly)
}
