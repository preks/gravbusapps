import { useState, useCallback, useEffect } from 'react'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { NominatedPeer } from '../types'

const PROCESS_NAME = 'performanceEvaluation'
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/**
 * Extracts the process instance ID from the endpoint URL.
 * The processId is the first UUID after the process name (e.g. performanceEvaluation) in the path.
 * Example: .../processes/employee/performanceEvaluation/5a86f06a-2f5c-47b8-a88e-8d44d29c49a2/approvePeerReviewers/...
 * -> 5a86f06a-2f5c-47b8-a88e-8d44d29c49a2
 */
export function getProcessIdFromEndpoint(endpoint: string | undefined): string | null {
  if (!endpoint || typeof endpoint !== 'string') return null
  const index = endpoint.indexOf(PROCESS_NAME)
  if (index === -1) return null
  const afterProcess = endpoint.slice(index + PROCESS_NAME.length)
  const match = afterProcess.match(UUID_REGEX)
  return match && match[0] ? match[0] : null
}

function parseNominatedPeersFromResponse(data: unknown): NominatedPeer[] {
  if (!data || typeof data !== 'object') return []
  const obj = data as Record<string, unknown>

  const variables = obj.variables as Record<string, unknown> | undefined
  const peerNomination = (obj.peerNominationRequest as Record<string, unknown>) ?? variables?.peerNominationRequest

  const nomination = peerNomination as
    | {
        nominatedEmployeeIds?: string[]
        nominatedEmployeeNames?: string[]
        peerEmployeeIds?: string[]
        peerEmployeeNames?: string[]
      }
    | undefined

  if (!nomination) return []

  const ids = nomination.nominatedEmployeeIds ?? nomination.peerEmployeeIds ?? ([] as string[])
  const names = (nomination.nominatedEmployeeNames ?? nomination.peerEmployeeNames ?? []) as string[]

  if (!Array.isArray(ids) || ids.length === 0) return []
  return ids.map((id, index) => ({
    id,
    name: Array.isArray(names) && names[index] ? String(names[index]) : id
  }))
}

export function useNominatedPeersFromProcess(
  accessToken: string | undefined,
  additionalData: Record<string, unknown> | undefined
) {
  const [peers, setPeers] = useState<NominatedPeer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const baseUrl = env('NEXT_PUBLIC_BASE_URL') ?? ''
  const restClient = useRestClient(baseUrl)

  const fetchPeers = useCallback(async () => {
    if (!accessToken) {
      setLoading(false)
      return
    }

    const metadata = additionalData?.psi_processMetadata as Record<string, unknown> | undefined
    const endpoint = metadata?.endpoint as string | undefined
    const processId = getProcessIdFromEndpoint(endpoint)

    if (!processId) {
      setPeers([])
      setLoading(false)
      setError('Could not determine process ID from endpoint')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const path = `/processes/employee/performanceEvaluation/${processId}`
      const response = await restClient.get<unknown>(path, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })
      const nominated = parseNominatedPeersFromResponse(response)
      setPeers(nominated)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch nominated peers'
      setError(message)
      setPeers([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, additionalData, restClient])

  useEffect(() => {
    fetchPeers()
  }, [fetchPeers])

  return { peers, loading, error, refetch: fetchPeers }
}
