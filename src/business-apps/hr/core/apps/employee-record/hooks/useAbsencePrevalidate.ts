import { PrevalidateResult, useAbsencePrevalidateShared } from '@/business-apps/hr/core/hooks/useAbsencePrevalidate'

/**
 * Calls POST /employee-time/api/v1/absences/prevalidate when a full date range is selected.
 * Defaults typeRef to Annual Leave (A001) when not specified.
 * Returns effective days, working days, and any validation error code from the backend.
 */
export function useAbsencePrevalidate(
  accessToken: string | undefined,
  employeeId: string | undefined,
  startDate: string | null,
  endDate: string | null,
  typeRef = 'AbsenceType:v1:A001'
): PrevalidateResult {
  return useAbsencePrevalidateShared({
    accessToken,
    employeeId,
    typeRef,
    startDate,
    endDate
  })
}
