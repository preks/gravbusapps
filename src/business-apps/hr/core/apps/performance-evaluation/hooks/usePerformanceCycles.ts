import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_PERFORMANCE_CYCLES,
  type GetPerformanceCyclesResponse,
  type PerformanceCycleApi
} from '../queries/performanceCycleQueries'

export type FrequencyType = 'Annual' | 'Quarterly' | 'Custom'
export type ParticipantType = 'Self' | 'Peer' | 'Manager'
export type CycleStatus = 'Active' | 'Upcoming' | 'Inactive' | 'Completed'

export interface EvaluationStage {
  id: string
  type: ParticipantType
  label: string
}

export interface PerformanceCycleFromApi {
  id: string
  version: number
  name: string
  startDate: string
  endDate: string
  evaluationPeriodStartDate?: string
  evaluationPeriodEndDate?: string
  frequency: FrequencyType
  participants: ParticipantType[]
  stages: EvaluationStage[]
  status: CycleStatus
  deactivated?: boolean
  recordState?: string
  ratingScaleId?: string
  valueIds?: string[]
  /** true when loaded from Hasura (read-only for now) */
  fromApi?: boolean
  /** Raw API participants with id/version for updates */
  _apiParticipants?: PerformanceCycleParticipantApi[]
  /** Raw API company values with id/version for updates */
  _apiCompanyValues?: PerformanceCycleCompanyValueApi[]
}

/** Map API participant type to UI ParticipantType */
function apiParticipantToUi(apiParticipant: string | null): ParticipantType | null {
  const participant = String(apiParticipant || '').toUpperCase()
  if (participant.includes('SELF')) return 'Self'
  if (participant.includes('PEER')) return 'Peer'
  if (participant.includes('MANAGER')) return 'Manager'
  return null
}

/** Map API frequency enum to UI FrequencyType */
function apiFrequencyToUi(apiFrequency: string | null): FrequencyType {
  const freq = String(apiFrequency || '').toUpperCase()
  if (freq.includes('QUARTERLY')) return 'Quarterly'
  if (freq.includes('CUSTOM')) return 'Custom'
  return 'Annual'
}

function formatDateOnly(isoOrTimestamp: string | null): string {
  if (!isoOrTimestamp) return ''
  const d = new Date(isoOrTimestamp)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Map API status to UI CycleStatus. Check recordState, then status, then dates. */
function apiStatusToUiStatus(
  apiStatus: string | null,
  recordState: string | null,
  startDate: string,
  endDate: string,
  active: boolean | null
): CycleStatus {
  // Check recordState first - inactive/deleted cycles are always Inactive
  if (recordState && recordState.toLowerCase() !== 'active') return 'Inactive'

  // Check explicit status - map status enum to UI status
  if (apiStatus === 'ACTIVE_PERFORMANCE_CYCLE_STATUS') return 'Active'
  if (apiStatus === 'DRAFT_PERFORMANCE_CYCLE_STATUS') return 'Active'
  if (apiStatus === 'DEACTIVATED_PERFORMANCE_CYCLE_STATUS') return 'Inactive'
  if (apiStatus === 'COMPLETED_PERFORMANCE_CYCLE_STATUS') return 'Completed'
  if (active === false) return 'Inactive'

  // For other statuses, use date-based determination
  const today = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (today < start) return 'Upcoming'
  if (today >= start && today <= end) return 'Active'
  return 'Inactive'
}

function mapApiCycleToUi(api: PerformanceCycleApi): PerformanceCycleFromApi {
  const startDate = formatDateOnly(api.startDate ?? '')
  const endDate = formatDateOnly(api.endDate ?? '')
  const participants = (api.performanceCycleParticipant ?? [])
    .filter(p => p.enabled === true)
    .map(p => apiParticipantToUi(p.participantType))
    .filter((p): p is ParticipantType => p !== null)
  const active = true
  const status = apiStatusToUiStatus(api.status, api.recordState, startDate, endDate, active)
  const valueIds = (api.performanceCycleCompanyValue ?? [])
    .map(pc => pc.companyValueId)
    .filter((id): id is string => id != null && id !== '')
  const evaluationPeriodStartDate = formatDateOnly(api.evaluationPeriodStartDate ?? '')
  const evaluationPeriodEndDate = formatDateOnly(api.evaluationPeriodEndDate ?? '')
  return {
    id: api.id,
    version: api.version ?? 0,
    name: api.name ?? '',
    startDate,
    endDate,
    evaluationPeriodStartDate: evaluationPeriodStartDate || undefined,
    evaluationPeriodEndDate: evaluationPeriodEndDate || undefined,
    frequency: apiFrequencyToUi(api.frequency),
    participants: participants.length ? participants : ['Self', 'Manager'],
    stages: [],
    status,
    deactivated: status === 'Inactive' || status === 'Completed',
    recordState: api.recordState ?? undefined,
    ratingScaleId: api.ratingScaleId ?? undefined,
    valueIds,
    fromApi: true,
    _apiParticipants: api.performanceCycleParticipant ?? [],
    _apiCompanyValues: api.performanceCycleCompanyValue ?? []
  }
}

export interface UsePerformanceCyclesResult {
  cycles: PerformanceCycleFromApi[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePerformanceCycles(accessToken: string | undefined): UsePerformanceCyclesResult {
  const graphqlClient = useGraphqlClient(accessToken)
  const [cycles, setCycles] = useState<PerformanceCycleFromApi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCycles = useCallback(async () => {
    if (!accessToken) {
      setCycles([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const result = await graphqlClient.request<GetPerformanceCyclesResponse>(GET_PERFORMANCE_CYCLES)
      const list = result?.PerformanceCycle ?? []
      setCycles(list.map(mapApiCycleToUi))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load performance cycles'
      setError(message)
      setCycles([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, graphqlClient])

  useEffect(() => {
    fetchCycles()
  }, [fetchCycles])

  return { cycles, loading, error, refetch: fetchCycles }
}
