import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { useEmployeeById } from '@/common/data/employee/hooks/useEmployeeById'
import { useEmployeeByUserId } from '@/common/data/employee/hooks/useEmployeeByUserId'
import { resolveProcessId } from './useNominatedPeersFromProcess'
import type { EmployeeForHeader } from '../context/PerformanceEvaluationPeerApproveContext'

interface ProcessGetResponse {
  employeePerformanceEvaluation?: {
    employee?: string
  }
}

export interface UseEmployeeForPeerApproveHeaderReturn {
  employeeForHeader: EmployeeForHeader | null
  evaluatedEmployeeId: string | null
  loading: boolean
  error: string | null
}

/**
 * Resolves the evaluated employee for the Peer Approve form header.
 *
 * Priority:
 * 1. Read `employeeUserId` directly from the task payload (primary — added by the BE)
 *    and resolve it to an employeeId via GraphQL.
 * 2. Fallback: GET /processes/employee/performanceEvaluation/{processId} and read
 *    `employeePerformanceEvaluation.employee` from the response. This fallback is kept
 *    only for tasks whose payload does not yet expose `employeeUserId`.
 */
export function useEmployeeForPeerApproveHeader(
  accessToken: string | undefined,
  additionalData: Record<string, unknown> | undefined
): UseEmployeeForPeerApproveHeaderReturn {
  const [employeeIdFromProcess, setEmployeeIdFromProcess] = useState<string | null>(null)
  const [processFetchError, setProcessFetchError] = useState<string | null>(null)
  const [processLoading, setProcessLoading] = useState(false)

  const baseUrl = env('NEXT_PUBLIC_BASE_URL') ?? ''
  const restClient = useRestClient(baseUrl)

  const employeeUserIdFromPayload = useMemo(() => {
    const taskPayload = additionalData?.psi_taskPayload as Record<string, unknown> | undefined
    const initialParams = taskPayload?.psi_initialParameters as Record<string, unknown> | undefined
    const processInputs = (additionalData?.psi_processMetadata as Record<string, unknown> | undefined)?.inputs as
      | Record<string, unknown>
      | undefined

    const candidate =
      (taskPayload?.employeeUserId as string | undefined) ??
      (initialParams?.employeeUserId as string | undefined) ??
      (processInputs?.employeeUserId as string | undefined)

    return typeof candidate === 'string' && candidate.length > 0 ? candidate : null
  }, [additionalData])

  const {
    employee: employeeByUserId,
    employeeId: employeeIdFromUserIdLookup,
    loading: employeeByUserIdLoading,
    error: employeeByUserIdError
  } = useEmployeeByUserId({
    accessToken: accessToken ?? '',
    userId: employeeUserIdFromPayload ?? undefined
  })

  const shouldUseRestFallback = employeeUserIdFromPayload == null

  const fetchProcessAndSetEmployeeId = useCallback(async () => {
    if (!accessToken) {
      setProcessLoading(false)
      return
    }

    if (!shouldUseRestFallback) {
      // Payload already provides employeeUserId — no need for the REST call.
      setEmployeeIdFromProcess(null)
      setProcessLoading(false)
      setProcessFetchError(null)
      return
    }

    const processId = resolveProcessId(additionalData)

    if (!processId) {
      setEmployeeIdFromProcess(null)
      setProcessLoading(false)
      setProcessFetchError('Could not determine process ID from payload or endpoint')
      return
    }

    setProcessLoading(true)
    setProcessFetchError(null)

    try {
      const path = `/processes/employee/performanceEvaluation/${processId}`
      const response = await restClient.get<ProcessGetResponse>(path, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })
      const employeeId = response?.employeePerformanceEvaluation?.employee ?? null
      setEmployeeIdFromProcess(employeeId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch process'
      setProcessFetchError(message)
      setEmployeeIdFromProcess(null)
    } finally {
      setProcessLoading(false)
    }
  }, [accessToken, additionalData, restClient, shouldUseRestFallback])

  useEffect(() => {
    fetchProcessAndSetEmployeeId()
  }, [fetchProcessAndSetEmployeeId])

  const employeeIdForHeaderLookup = employeeUserIdFromPayload ? employeeIdFromUserIdLookup : employeeIdFromProcess

  const { employee: employeeByIdForHeader, loading: employeeByIdForHeaderLoading } = useEmployeeById({
    accessToken: accessToken ?? '',
    employeeId: employeeIdForHeaderLookup ?? undefined
  })

  const employeeForHeader = useMemo((): EmployeeForHeader | null => {
    if (employeeByIdForHeader) {
      return {
        firstName: employeeByIdForHeader.firstName ?? '',
        lastName: employeeByIdForHeader.lastName ?? '',
        pictureThumbnail: employeeByIdForHeader.employee?.pictureThumbnail ?? undefined,
        jobTitle: employeeByIdForHeader.jobPosition?.name ?? undefined
      }
    }
    if (employeeUserIdFromPayload && employeeByUserId) {
      return {
        firstName: employeeByUserId.firstName ?? '',
        lastName: employeeByUserId.lastName ?? '',
        pictureThumbnail: undefined,
        jobTitle: undefined
      }
    }
    return null
  }, [employeeByIdForHeader, employeeUserIdFromPayload, employeeByUserId])

  const evaluatedEmployeeId = employeeUserIdFromPayload ? employeeIdFromUserIdLookup : employeeIdFromProcess

  const loading = shouldUseRestFallback
    ? processLoading || (employeeIdFromProcess != null && employeeByIdForHeaderLoading)
    : employeeByUserIdLoading || (employeeIdFromUserIdLookup != null && employeeByIdForHeaderLoading)

  const error = shouldUseRestFallback ? processFetchError : (employeeByUserIdError ?? null)

  return {
    employeeForHeader,
    evaluatedEmployeeId: evaluatedEmployeeId ?? null,
    loading,
    error
  }
}
