import { useEffect, useState } from 'react'
import { env } from '@/common/env/EnvUtils'

export interface PrevalidateResult {
  effectiveDays: number | null
  workingDays: number | null
  errorCode: string | null
  isLoading: boolean
}

const IDLE: PrevalidateResult = {
  effectiveDays: null,
  workingDays: null,
  errorCode: null,
  isLoading: false
}

const DEBOUNCE_MS = 400
const PREVALIDATE_PATHS = [
  '/employee-time/api/v1/absences/prevalidate',
  '/processes/employee-time/api/v1/absences/prevalidate',
  '/api/v1/absences/prevalidate'
]

const STATUS_TO_ERROR_CODE: Record<number, string> = {
  400: 'INVALID_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'INTERNAL_ERROR',
  500: 'INTERNAL_ERROR'
}

const extractErrorCode = (errorData: any, status: number): string => {
  const nestedCode =
    errorData?.errors?.[0]?.code ??
    errorData?.error?.code ??
    errorData?.code ??
    errorData?.details?.code ??
    errorData?.messageCode

  if (typeof nestedCode === 'string' && nestedCode.trim() !== '') {
    return nestedCode
  }

  return STATUS_TO_ERROR_CODE[status] ?? 'UNKNOWN_ERROR'
}

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
  const [result, setResult] = useState<PrevalidateResult>(IDLE)

  useEffect(() => {
    if (!accessToken || !employeeId || !startDate || !endDate) {
      setResult(IDLE)
      return
    }

    setResult(prev => ({ ...prev, isLoading: true, errorCode: null }))

    const controller = new AbortController()

    const timer = setTimeout(async () => {
      try {
        const baseUrl = (env('NEXT_PUBLIC_BASE_URL') ?? '').replace(/\/+$/, '')
        const requestBody = JSON.stringify({
          employeeId,
          typeRef,
          startDate,
          endDate
        })

        let response: Response | null = null
        for (const path of PREVALIDATE_PATHS) {
          const candidate = await fetch(`${baseUrl}${path}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`
            },
            body: requestBody,
            signal: controller.signal
          })

          response = candidate
          if (candidate.status !== 404) break
        }

        if (controller.signal.aborted) return
        if (!response) {
          setResult({ effectiveDays: null, workingDays: null, errorCode: 'INTERNAL_ERROR', isLoading: false })
          return
        }

        if (response.ok) {
          const data = await response.json()
          setResult({
            effectiveDays: data.effectiveDays ?? null,
            workingDays: data.workingDays ?? null,
            errorCode: null,
            isLoading: false
          })
        } else {
          let errorCode = STATUS_TO_ERROR_CODE[response.status] ?? 'UNKNOWN_ERROR'
          try {
            const errorData = await response.json()
            errorCode = extractErrorCode(errorData, response.status)
          } catch {
            try {
              const errorText = await response.text()
              if (typeof errorText === 'string' && errorText.trim() !== '') {
                const parsed = JSON.parse(errorText)
                errorCode = extractErrorCode(parsed, response.status)
              }
            } catch {
              // Keep status-mapped fallback.
            }
          }
          setResult({ effectiveDays: null, workingDays: null, errorCode, isLoading: false })
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        setResult({ effectiveDays: null, workingDays: null, errorCode: 'INTERNAL_ERROR', isLoading: false })
      }
    }, DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [accessToken, employeeId, startDate, endDate, typeRef])

  return result
}
