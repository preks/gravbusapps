import { useCallback } from 'react'
import { useCurrentCompensation } from './useCurrentCompensation'
import { useCompensationHistory } from './useCompensationHistory'

/**
 * Main hook to fetch and manage employee compensation data
 *
 * This is an orchestrator hook that combines:
 * - useCurrentCompensation: Current salary, bonuses YTD, and active benefits
 * - useCompensationHistory: Historical salary records, bonus history, and payslip history
 *
 * ✅ CONNECTED TO DATABASE:
 * - Fetches salary data from EmployeeSalary table (latest active approved salary, or most recent approved as fallback)
 * - Fetches compensation bands from CompensationBand table
 * - Fetches bonuses from EmployeeBonus table (with CompensationStatus enum)
 * - Fetches benefits from EmployeeBenefit table (with BenefitStatus enum)
 * - Fetches payslips from EmployeePayslip table (with PayslipStatus enum)
 *
 * ✅ STATUS HANDLING:
 * - Bonuses: PENDING_COMPENSATION, APPROVED_COMPENSATION (counted in YTD)
 * - Benefits: ACTIVE_BENEFIT (counted as active)
 * - Payslips: All valid status values displayed
 *
 * @param employeeId - The employee ID to fetch compensation data for
 * @param accessToken - Access token for API authentication
 * @param locale - User locale for date formatting (e.g., 'en-US', 'de-DE', 'fr-FR')
 */
export const useCompensationData = (employeeId: string, accessToken: string, locale: string = 'en-US') => {
  // Fetch current compensation data
  const {
    data: compensationData,
    loading: currentLoading,
    error: currentError,
    refetch: refetchCurrent
  } = useCurrentCompensation(employeeId, accessToken)

  // Fetch compensation history
  const {
    data: historyData,
    loading: historyLoading,
    error: historyError,
    refetch: refetchHistory
  } = useCompensationHistory(employeeId, accessToken, locale)

  // Combine loading states - show loading if either is loading
  const loading = currentLoading || historyLoading

  // Combine error states - show first error if any
  const error = currentError || historyError

  // Refetch both data sources
  const refetch = useCallback(async () => {
    await Promise.all([refetchCurrent(), refetchHistory()])
  }, [refetchCurrent, refetchHistory])

  return {
    loading,
    error,
    compensationData,
    historyData,
    refetch
  }
}
