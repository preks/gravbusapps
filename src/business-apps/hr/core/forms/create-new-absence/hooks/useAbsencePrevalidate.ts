import { PrevalidateResult, useAbsencePrevalidateShared } from '@/business-apps/hr/core/hooks/useAbsencePrevalidate'

export const useAbsencePrevalidate = (
  accessToken: string | undefined,
  employeeId: string | undefined,
  typeRef: string | undefined,
  startDate: string | null,
  endDate: string | null,
  absenceRequestId?: string
): PrevalidateResult => {
  return useAbsencePrevalidateShared({
    accessToken,
    employeeId,
    typeRef,
    startDate,
    endDate,
    absenceRequestId
  })
}
