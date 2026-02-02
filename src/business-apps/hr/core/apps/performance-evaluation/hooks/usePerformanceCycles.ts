import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_PERFORMANCE_CYCLES,
  type GetPerformanceCyclesResponse,
  type PerformanceCycleApi
} from '../queries/performanceCycleQueries'

export type FrequencyType = 'Annual' | 'Quarterly' | 'Custom'
export type ParticipantType = 'Self' | 'Peer' | 'Manager' | 'Calibration' | 'Team'
export type CycleStatus = 'Active' | 'Upcoming' | 'Inactive'

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
  frequency: FrequencyType
  participants: ParticipantType[]
  stages: EvaluationStage[]
  status: CycleStatus
  deactivated?: boolean
  ratingScaleId?: string
  valueIds?: string[]
  /** true when loaded from Hasura (read-only for now) */
  fromApi?: boolean
}

/** Map API participant type (any casing) to UI ParticipantType. API has SELF, PEER, MANAGER, TEAM, HR_ADMIN (no CALIBRATION). */
const PARTICIPANT_MAP: Record<string, ParticipantType> = {
  Self: 'Self',
  Peer: 'Peer',
  Manager: 'Manager',
  Calibration: 'Calibration',
  Team: 'Team',
  SELF: 'Self',
  PEER: 'Peer',
  MANAGER: 'Manager',
  CALIBRATION: 'Calibration',
  TEAM: 'Team',
  HR_ADMIN: 'Calibration' // API uses HR_ADMIN; UI shows as Calibration for round-trip
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

/** API status values that mean the cycle is inactive (e.g. draft). */
const INACTIVE_API_STATUSES = new Set(['DRAFT_CYCLE'])

/** Map API status to UI CycleStatus. DRAFT_CYCLE -> Inactive; ACTIVE_CYCLE -> Active; else use dates/active. */
function apiStatusToUiStatus(
  apiStatus: string | null,
  startDate: string,
  endDate: string,
  active: boolean | null
): CycleStatus {
  if (apiStatus === 'ACTIVE_CYCLE') return 'Active'
  if (apiStatus != null && INACTIVE_API_STATUSES.has(apiStatus)) return 'Inactive'
  if (active === false) return 'Inactive'
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
    .map(
      p =>
        p.participantType &&
        (PARTICIPANT_MAP[p.participantType] ?? PARTICIPANT_MAP[String(p.participantType).toUpperCase()])
    )
    .filter((p): p is ParticipantType => Boolean(p))
  const active = api.isActive ?? true
  const status = apiStatusToUiStatus(api.status, startDate, endDate, active)
  const valueIds = (api.performanceCycleCompanyValue ?? [])
    .map(pc => pc.companyValueId)
    .filter((id): id is string => id != null && id !== '')
  return {
    id: api.id,
    version: api.version ?? 0,
    name: api.name ?? '',
    startDate,
    endDate,
    frequency: (api.frequency as FrequencyType) ?? 'Annual',
    participants: participants.length ? participants : ['Self', 'Manager'],
    stages: [],
    status,
    deactivated: status === 'Inactive',
    ratingScaleId: api.ratingScaleId ?? undefined,
    valueIds,
    fromApi: true
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
