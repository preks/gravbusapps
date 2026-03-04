import { useCallback } from 'react'
import {
  savePerformanceCycle as savePerformanceCycleApi,
  updatePerformanceCycle as updatePerformanceCycleApi,
  deletePerformanceCycle as deletePerformanceCycleApi,
  type SavePerformanceCyclePayload,
  type SavePerformanceCycleResponse,
  type UpdatePerformanceCyclePayload,
  type UpdatePerformanceCycleResponse,
  type DeletePerformanceCycleResponse,
  type PerformanceCycleCompanyValueItem,
  type PerformanceCycleParticipantItem
} from '../services/performanceCycleApi'
import type { CycleEditorValues } from '../CycleEditorModal'

/** Backend enum: ANNUAL_PERFORMANCE_CYCLE_FREQUENCY | QUARTERLY_PERFORMANCE_CYCLE_FREQUENCY | SEMI_ANNUAL_PERFORMANCE_CYCLE_FREQUENCY | CUSTOM_PERFORMANCE_CYCLE_FREQUENCY. */
const FREQUENCY_TO_API: Record<string, string> = {
  Annual: 'ANNUAL_PERFORMANCE_CYCLE_FREQUENCY',
  Quarterly: 'QUARTERLY_PERFORMANCE_CYCLE_FREQUENCY',
  Custom: 'CUSTOM_PERFORMANCE_CYCLE_FREQUENCY'
}

/** API participant type enum: SELF_EVALUATION_PARTICIPANT_TYPE, PEER_EVALUATION_PARTICIPANT_TYPE, MANAGER_EVALUATION_PARTICIPANT_TYPE, etc. */
const PARTICIPANT_TO_API: Record<string, string> = {
  SELF: 'SELF_EVALUATION_PARTICIPANT_TYPE',
  PEER: 'PEER_EVALUATION_PARTICIPANT_TYPE',
  MANAGER: 'MANAGER_EVALUATION_PARTICIPANT_TYPE',
  TEAM: 'TEAM_EVALUATION_PARTICIPANT_TYPE',
  HR_ADMIN: 'HR_ADMIN_EVALUATION_PARTICIPANT_TYPE'
}

/** Build participants array: preserve existing id/version when updating, create new when inserting. */
function buildParticipants(
  selectedParticipants: string[],
  existingParticipants?: Array<{
    id: string
    version: number | null
    participantType: string | null
    enabled: boolean | null
  }>
): PerformanceCycleParticipantItem[] {
  const selectedSet = new Set(selectedParticipants.map(p => String(p).toUpperCase()))
  const apiParticipantTypes = ['SELF', 'PEER', 'MANAGER'] as const

  return apiParticipantTypes.map(type => {
    const apiType = PARTICIPANT_TO_API[type] || type
    const existing = existingParticipants?.find(p => p.participantType?.toUpperCase().includes(type))

    // Explicitly build a clean object with ONLY the required fields
    const item: PerformanceCycleParticipantItem = {
      ...(existing?.id ? { id: existing.id } : {}),
      ...(existing?.version != null ? { version: existing.version } : {}),
      participantType: apiType,
      enabled: selectedSet.has(type)
    }

    return item
  })
}

/** True when the cycle is from local storage (client-generated id). */
function isNewCycle(id: string | undefined): boolean {
  return !id || id.startsWith('cycle_')
}

/** Build companyValues array: preserve existing id/version when updating, create new when inserting. */
function buildCompanyValues(
  valueIds: string[],
  performanceCycleId?: string,
  existingCompanyValues?: Array<{ id: string; version: number | null; companyValueId: string | null }>
): PerformanceCycleCompanyValueItem[] {
  return (valueIds ?? []).map(companyValueId => {
    const existing = existingCompanyValues?.find(cv => cv.companyValueId === companyValueId)

    // Explicitly build a clean object with ONLY the required fields
    const item: PerformanceCycleCompanyValueItem = {
      ...(existing?.id ? { id: existing.id } : {}),
      ...(existing?.version != null ? { version: existing.version } : {}),
      companyValue: companyValueId,
      ...(performanceCycleId ? { performanceCycle: performanceCycleId } : {}),
      mandatory: true
    }

    return item
  })
}

/** Build REST API payload from cycle editor form. */
function buildSavePayload(values: CycleEditorValues): SavePerformanceCyclePayload {
  const changeMode = isNewCycle(values.id) ? 'INSERT' : 'UPDATE'
  const frequencyApi = FREQUENCY_TO_API[values.frequency] ?? 'ANNUAL_PERFORMANCE_CYCLE_FREQUENCY'
  const valueIds = values.valueIds ?? []
  const companyValues = buildCompanyValues(
    valueIds,
    changeMode === 'UPDATE' && values.id ? values.id : undefined,
    values._apiCompanyValues
  )
  const participants = buildParticipants(values.participants ?? [], values._apiParticipants)

  return {
    changeMode,
    performanceCycle: {
      ...(values.id && !isNewCycle(values.id) ? { id: values.id } : {}),
      ...(changeMode === 'UPDATE' && values.version != null ? { version: values.version } : {}),
      name: values.name.trim(),
      startDate: values.startDate,
      endDate: values.endDate,
      ...(values.evaluationPeriodStartDate ? { evaluationPeriodStartDate: values.evaluationPeriodStartDate } : {}),
      ...(values.evaluationPeriodEndDate ? { evaluationPeriodEndDate: values.evaluationPeriodEndDate } : {}),
      frequency: frequencyApi,
      ratingScale: values.ratingScaleId ?? null,
      participants,
      ...(changeMode === 'INSERT' ? { status: 'DEACTIVATED_PERFORMANCE_CYCLE_STATUS' } : {}),
      ...(companyValues.length > 0 ? { companyValues } : {})
    }
  }
}

/** Minimal cycle shape needed for updatePerformanceCycle (activate/deactivate). */
export interface CycleForUpdate {
  id: string
  version?: number
}

/** Build minimal payload for updatePerformanceCycle (id, version, status only). */
function buildUpdateActivePayload(cycle: CycleForUpdate, isActive: boolean): UpdatePerformanceCyclePayload {
  const status = isActive ? 'DRAFT_PERFORMANCE_CYCLE_STATUS' : 'DEACTIVATED_PERFORMANCE_CYCLE_STATUS'
  return {
    performanceCycle: {
      id: cycle.id,
      version: cycle.version ?? 0,
      status
    }
  }
}

export interface UseSavePerformanceCycleResult {
  savePerformanceCycle: (values: CycleEditorValues) => Promise<SavePerformanceCycleResponse | null>
  updateCycleActive: (cycle: CycleForUpdate, isActive: boolean) => Promise<UpdatePerformanceCycleResponse | null>
  deletePerformanceCycle: (cycle: CycleForUpdate) => Promise<DeletePerformanceCycleResponse | null>
}

export function useSavePerformanceCycle(accessToken: string | undefined): UseSavePerformanceCycleResult {
  const savePerformanceCycle = useCallback(
    async (values: CycleEditorValues): Promise<SavePerformanceCycleResponse | null> => {
      if (!accessToken) return null
      const payload = buildSavePayload(values)
      const result = await savePerformanceCycleApi(accessToken, payload)
      return result ?? null
    },
    [accessToken]
  )

  const updateCycleActive = useCallback(
    async (cycle: CycleForUpdate, isActive: boolean): Promise<UpdatePerformanceCycleResponse | null> => {
      if (!accessToken) return null
      const payload = buildUpdateActivePayload(cycle, isActive)
      const result = await updatePerformanceCycleApi(accessToken, payload)
      return result ?? null
    },
    [accessToken]
  )

  const deletePerformanceCycle = useCallback(
    async (cycle: CycleForUpdate): Promise<DeletePerformanceCycleResponse | null> => {
      if (!accessToken) return null
      const payload = {
        performanceCycle: { id: cycle.id, version: cycle.version ?? 0 }
      }
      const result = await deletePerformanceCycleApi(accessToken, payload)
      return result ?? null
    },
    [accessToken]
  )

  return { savePerformanceCycle, updateCycleActive, deletePerformanceCycle }
}
