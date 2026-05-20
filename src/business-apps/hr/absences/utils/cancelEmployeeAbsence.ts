import { EMPLOYEE_TIME_API_URL } from '@/common/utils/serviceResolver'

export interface CancelEmployeeAbsenceSnapshot {
  id: string
  version: number
  businessKey?: string | null
  recordState?: string | null
  activeTo?: string | null
  additionalProperties?: unknown | null
  employeeId: string
  typeRef: string
  type?: {
    id?: string | null
    value?: string | null
  } | null
  typeName?: string | null
  absenceTypeName?: string | null
  startDate: string
  endDate: string
  cutHalfDayStart?: boolean | null
  cutHalfDayEnd?: boolean | null
  workingHours?: number | null
  workingDays?: number | null
  calendarDays?: number | null
  effectiveDays?: number | null
  balance?: number | null
  reason?: string | null
  relative?: string | null
  attachment?: string | null
  description?: string | null
  status: string
  approverId?: string | null
  approvalNote?: string | null
  substituteEmployee?: string | null
  employeeDocument?: string | null
}

export interface CancelEmployeeAbsenceResponse {
  employeeAbsence?: CancelEmployeeAbsenceSnapshot
  [key: string]: unknown
}

const normalizeAbsenceStatusForCancellation = (status?: string): string => {
  if (!status) {
    return ''
  }

  const normalizedStatus = status.toUpperCase()
  if (normalizedStatus === 'TIME_PENDING' || normalizedStatus === 'PENDING') return 'PENDING'
  if (normalizedStatus === 'TIME_APPROVED' || normalizedStatus === 'APPROVED') return 'APPROVED'
  if (normalizedStatus === 'PENDING_APPROVAL' || normalizedStatus === 'IN_APPROVAL') return 'PENDING'
  if (normalizedStatus === 'TIME_CANCELLED') return 'CANCELLED'
  if (normalizedStatus === 'TIME_REJECTED') return 'REJECTED'
  return normalizedStatus
}

const parseCancelError = async (response: Response): Promise<string> => {
  const fallback = `Cancel request failed with status ${response.status}`

  try {
    const data = await response.json()
    const detail = data?.detail ?? data?.message ?? data?.error

    if (typeof detail === 'string' && detail.trim() !== '') {
      return detail
    }

    if (Array.isArray(detail)) {
      const message = detail.map(item => item?.msg || item?.message || String(item)).join('; ')
      return message || fallback
    }
  } catch {
    try {
      const text = await response.text()
      if (text.trim() !== '') {
        return text
      }
    } catch {
      // Keep the status-based fallback.
    }
  }

  return fallback
}

export const cancelEmployeeAbsence = async (
  accessToken: string | undefined,
  employeeAbsence: CancelEmployeeAbsenceSnapshot
): Promise<CancelEmployeeAbsenceResponse | null> => {
  if (!accessToken) {
    throw new Error('Access token missing')
  }

  if (!employeeAbsence.id || !employeeAbsence.employeeId || !employeeAbsence.typeRef) {
    throw new Error('Cannot cancel absence: missing required absence data')
  }

  const normalizedEmployeeAbsence: CancelEmployeeAbsenceSnapshot = {
    ...employeeAbsence,
    status: normalizeAbsenceStatusForCancellation(employeeAbsence.status)
  }

  const response = await fetch(`${EMPLOYEE_TIME_API_URL}/cancelEmployeeAbsence`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ employeeAbsence: normalizedEmployeeAbsence })
  })

  if (!response.ok) {
    throw new Error(await parseCancelError(response))
  }

  if (response.status === 204) {
    return null
  }

  return (await response.json()) as CancelEmployeeAbsenceResponse
}
