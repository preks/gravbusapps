import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
import { SalaryType, PaymentFrequency, SalaryData, CompensationComponent } from '../types/salaryTypes'

// Initialize dayjs plugins
dayjs.extend(weekday)
dayjs.extend(localeData)

/**
 * Calculate the monthly equivalent of a salary based on its type and payment frequency
 * @param salary The salary data
 * @returns The monthly equivalent amount
 */
export const calculateMonthlyEquivalent = (salary: SalaryData): number => {
  const { amount, salaryType, paymentFrequency } = salary

  if (salaryType === SalaryType.MONTHLY) {
    switch (paymentFrequency) {
      case PaymentFrequency.MONTHLY:
        return amount
      case PaymentFrequency.BI_WEEKLY:
        return (amount * 26) / 12
      case PaymentFrequency.WEEKLY:
        return (amount * 52) / 12
      case PaymentFrequency.QUARTERLY:
        return amount / 3
      case PaymentFrequency.ANNUALLY:
        return amount / 12
      default:
        return amount
    }
  } else if (salaryType === SalaryType.HOURLY) {
    // Assuming 40 hours per week, 4.33 weeks per month
    return amount * 40 * 4.33
  }

  return amount
}

/**
 * Calculate the monthly equivalent of a compensation component based on its payment frequency
 * @param component The compensation component
 * @returns The monthly equivalent amount
 */
export const calculateComponentMonthlyEquivalent = (component: CompensationComponent): number => {
  const { amount, paymentFrequency } = component

  switch (paymentFrequency) {
    case PaymentFrequency.MONTHLY:
      return amount
    case PaymentFrequency.BI_WEEKLY:
      return (amount * 26) / 12
    case PaymentFrequency.WEEKLY:
      return (amount * 52) / 12
    case PaymentFrequency.QUARTERLY:
      return amount / 3
    case PaymentFrequency.ANNUALLY:
      return amount / 12
    case PaymentFrequency.ONE_TIME:
      // For one-time payments, we don't calculate a monthly equivalent
      return 0
    default:
      return amount
  }
}

/**
 * Calculate the total monthly compensation including salary and all active components
 * @param salary The base salary data
 * @param components Array of compensation components
 * @returns The total monthly compensation
 */
export const calculateTotalMonthlyCompensation = (salary: SalaryData, components: CompensationComponent[]): number => {
  const baseMonthlySalary = calculateMonthlyEquivalent(salary)

  // Filter active components and calculate their monthly equivalent
  const activeComponents = components.filter(component => component.isActive)
  const componentsMonthlyTotal = activeComponents.reduce(
    (total, component) => total + calculateComponentMonthlyEquivalent(component),
    0
  )

  return baseMonthlySalary + componentsMonthlyTotal
}

/**
 * Format currency amount according to locale
 * @param amount The amount to format
 * @param currency The currency code (e.g., 'USD', 'EUR')
 * @param locale The locale to use for formatting
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency: string, locale = 'en-US'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}
