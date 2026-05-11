import type { CancelEmployeeAbsenceSnapshot } from './cancelEmployeeAbsence'

type NullableNumericString = number | string | null

interface EmployeeAbsenceSnapshotSource {
  id?: string
  version?: NullableNumericString
  businessKey?: string | null
  recordState?: string | null
  activeTo?: string | null
  additionalProperties?: unknown
  employeeId?: string | null
  employee?: {
    id?: string | null
  } | null
  typeRef?: string | null
  startDate?: string
  endDate?: string
  cutHalfDayStart?: boolean | null
  cutHalfDayEnd?: boolean | null
  workingHours?: NullableNumericString
  workingDays?: NullableNumericString
  calendarDays?: NullableNumericString
  effectiveDays?: NullableNumericString
  balance?: NullableNumericString
  reason?: string | null
  relative?: string | null
  attachment?: string | null
  description?: string | null
  status?: string | null
  approverId?: string | null
  approvalNote?: string | null
  substituteEmployeeId?: string | null
  employeeDocumentId?: string | null
}

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

export const buildCancelEmployeeAbsenceSnapshot = (
  absence: EmployeeAbsenceSnapshotSource
): CancelEmployeeAbsenceSnapshot => ({
  id: absence.id || '',
  version: Number(absence.version ?? 0),
  businessKey: absence.businessKey ?? null,
  recordState: absence.recordState ?? null,
  activeTo: absence.activeTo ?? null,
  additionalProperties: absence.additionalProperties ?? null,
  employeeId: absence.employeeId || absence.employee?.id || '',
  typeRef: absence.typeRef || '',
  startDate: absence.startDate || '',
  endDate: absence.endDate || '',
  cutHalfDayStart: absence.cutHalfDayStart ?? false,
  cutHalfDayEnd: absence.cutHalfDayEnd ?? false,
  workingHours: toNullableNumber(absence.workingHours),
  workingDays: toNullableNumber(absence.workingDays),
  calendarDays: toNullableNumber(absence.calendarDays),
  effectiveDays: toNullableNumber(absence.effectiveDays),
  balance: toNullableNumber(absence.balance),
  reason: absence.reason ?? null,
  relative: absence.relative ?? null,
  attachment: absence.attachment ?? null,
  description: absence.description ?? '',
  status: absence.status || '',
  approverId: absence.approverId ?? null,
  approvalNote: absence.approvalNote ?? null,
  substituteEmployee: absence.substituteEmployeeId ?? null,
  employeeDocument: absence.employeeDocumentId ?? null
})
