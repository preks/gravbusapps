import { useEffect, useState } from 'react'
import { env } from '@/common/env/EnvUtils'

export interface PrevalidateResult {
  effectiveDays: number | null
  workingDays: number | null
  errorCode: string | null
  isLoading: boolean
}

export interface UseAbsencePrevalidateParams {
  accessToken: string | undefined
  employeeId: string | undefined
  typeRef: string | undefined
  startDate: string | null
  endDate: string | null
}

const IDLE_RESULT: PrevalidateResult = {
  effectiveDays: null,
  workingDays: null,
  errorCode: null,
  isLoading: false
}

const REQUEST_DEBOUNCE_MS = 400
const PREVALIDATE_PATHS = ['/employee-time/api/v1/absences/prevalidate']

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

const trimTrailingSlashes = (url: string): string => {
  let normalized = url
  while (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1)
  }
  return normalized
}

const parseErrorCodeFromResponse = async (response: Response): Promise<string> => {
  const errorCode = STATUS_TO_ERROR_CODE[response.status] ?? 'UNKNOWN_ERROR'
  try {
    const errorData = await response.json()
    return extractErrorCode(errorData, response.status)
  } catch {
    try {
      const errorText = await response.text()
      if (typeof errorText === 'string' && errorText.trim() !== '') {
        const parsed = JSON.parse(errorText)
        return extractErrorCode(parsed, response.status)
      }
    } catch {
      // Keep status-mapped fallback.
    }
  }

  return errorCode
}

const toFiniteNumber = (value: unknown): number | null => {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export const useAbsencePrevalidateShared = ({
  accessToken,
  employeeId,
  typeRef,
  startDate,
  endDate
}: UseAbsencePrevalidateParams): PrevalidateResult => {
  const [result, setResult] = useState<PrevalidateResult>(IDLE_RESULT)

  useEffect(() => {
    if (!accessToken || !employeeId || !startDate || !endDate || !typeRef) {
      setResult(IDLE_RESULT)
      return
    }

    setResult(prev => ({ ...prev, isLoading: true, errorCode: null }))
    const controller = new AbortController()

    const timer = setTimeout(async () => {
      try {
        const baseUrl = trimTrailingSlashes(
          env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT') ?? env('NEXT_PUBLIC_BASE_URL') ?? ''
        )
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
          setResult({
            effectiveDays: null,
            workingDays: null,
            errorCode: 'INTERNAL_ERROR',
            isLoading: false
          })
          return
        }

        if (response.ok) {
          const data = await response.json()
          setResult({
            effectiveDays: toFiniteNumber(data?.effectiveDays),
            workingDays: toFiniteNumber(data?.workingDays),
            errorCode: null,
            isLoading: false
          })
          return
        }

        const errorCode = await parseErrorCodeFromResponse(response)

        setResult({
          effectiveDays: null,
          workingDays: null,
          errorCode,
          isLoading: false
        })
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return
        setResult({
          effectiveDays: null,
          workingDays: null,
          errorCode: 'INTERNAL_ERROR',
          isLoading: false
        })
      }
    }, REQUEST_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [accessToken, employeeId, typeRef, startDate, endDate])

  return result
}
