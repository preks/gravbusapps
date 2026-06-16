import { useEffect, useState } from 'react'
import { env } from '@/common/env/EnvUtils'

export interface PrevalidateResult {
  effectiveDays: number | null
  workingDays: number | null
  calendarDays: number | null
  errorCode: string | null
  errorTitle: string | null
  errorDetail: string | null
  isLoading: boolean
}

export interface UseAbsencePrevalidateParams {
  accessToken: string | undefined
  employeeId: string | undefined
  typeRef: string | undefined
  startDate: string | null
  endDate: string | null
  absenceRequestId?: string
}

const IDLE_RESULT: PrevalidateResult = {
  effectiveDays: null,
  workingDays: null,
  calendarDays: null,
  errorCode: null,
  errorTitle: null,
  errorDetail: null,
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

type ParsedPrevalidateError = {
  errorCode: string
  errorTitle: string | null
  errorDetail: string | null
}

const extractErrorInfo = (errorData: any, status: number): ParsedPrevalidateError => {
  const nestedError = errorData?.errors?.[0] ?? errorData?.error ?? errorData?.details ?? errorData
  const nestedCode = nestedError?.code ?? errorData?.code ?? errorData?.messageCode
  const errorCode =
    typeof nestedCode === 'string' && nestedCode.trim() !== ''
      ? nestedCode
      : (STATUS_TO_ERROR_CODE[status] ?? 'UNKNOWN_ERROR')
  const errorTitle =
    typeof nestedError?.title === 'string' && nestedError.title.trim() !== '' ? nestedError.title : null
  const errorDetail =
    typeof nestedError?.detail === 'string' && nestedError.detail.trim() !== ''
      ? nestedError.detail
      : typeof errorData?.message === 'string' && errorData.message.trim() !== ''
        ? errorData.message
        : null

  return {
    errorCode,
    errorTitle,
    errorDetail
  }
}

const trimTrailingSlashes = (url: string): string => {
  let normalized = url
  while (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1)
  }
  return normalized
}

const parseErrorInfoFromResponse = async (response: Response): Promise<ParsedPrevalidateError> => {
  const fallbackError: ParsedPrevalidateError = {
    errorCode: STATUS_TO_ERROR_CODE[response.status] ?? 'UNKNOWN_ERROR',
    errorTitle: null,
    errorDetail: null
  }
  try {
    const errorData = await response.json()
    return extractErrorInfo(errorData, response.status)
  } catch {
    try {
      const errorText = await response.text()
      if (typeof errorText === 'string' && errorText.trim() !== '') {
        const parsed = JSON.parse(errorText)
        return extractErrorInfo(parsed, response.status)
      }
    } catch {
      // Keep status-mapped fallback.
    }
  }

  return fallbackError
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
  endDate,
  absenceRequestId
}: UseAbsencePrevalidateParams): PrevalidateResult => {
  const [result, setResult] = useState<PrevalidateResult>(IDLE_RESULT)

  useEffect(() => {
    if (!accessToken || !employeeId || !startDate || !endDate || !typeRef) {
      setResult(IDLE_RESULT)
      return
    }

    setResult(prev => ({ ...prev, isLoading: true, errorCode: null, errorTitle: null, errorDetail: null }))
    const controller = new AbortController()

    const timer = setTimeout(async () => {
      try {
        const baseUrl = trimTrailingSlashes(
          env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT') ?? env('NEXT_PUBLIC_BASE_URL') ?? ''
        )
        const requestPayload = {
          employeeId,
          typeRef,
          startDate,
          endDate,
          ...(absenceRequestId ? { absenceRequestId } : {})
        }
        const requestBody = JSON.stringify(requestPayload)

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
            calendarDays: null,
            errorCode: 'INTERNAL_ERROR',
            errorTitle: null,
            errorDetail: null,
            isLoading: false
          })
          return
        }

        if (response.ok) {
          const data = await response.json()
          setResult({
            effectiveDays: toFiniteNumber(data?.effectiveDays),
            workingDays: toFiniteNumber(data?.workingDays),
            calendarDays: toFiniteNumber(data?.calendarDays),
            errorCode: null,
            errorTitle: null,
            errorDetail: null,
            isLoading: false
          })
          return
        }

        const errorInfo = await parseErrorInfoFromResponse(response)

        setResult({
          effectiveDays: null,
          workingDays: null,
          calendarDays: null,
          errorCode: errorInfo.errorCode,
          errorTitle: errorInfo.errorTitle,
          errorDetail: errorInfo.errorDetail,
          isLoading: false
        })
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return
        setResult({
          effectiveDays: null,
          workingDays: null,
          calendarDays: null,
          errorCode: 'INTERNAL_ERROR',
          errorTitle: null,
          errorDetail: null,
          isLoading: false
        })
      }
    }, REQUEST_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [accessToken, employeeId, typeRef, startDate, endDate, absenceRequestId])

  return result
}
