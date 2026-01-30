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

/** Backend enum: ANNUAL | QUARTERLY | SEMI_ANNUAL. */
const FREQUENCY_TO_API: Record<string, string> = {
  Annual: 'ANNUAL',
  Quarterly: 'QUARTERLY',
  Custom: 'ANNUAL'
}

/** API participant type enum: SELF, PEER, MANAGER, TEAM, HR_ADMIN (no CALIBRATION). */
const API_PARTICIPANT_TYPES = ['SELF', 'PEER', 'MANAGER', 'TEAM', 'HR_ADMIN'] as const

/** Map UI participant label to API participantType (e.g. Calibration -> HR_ADMIN). */
const UI_TO_API_PARTICIPANT: Record<string, string> = {
  CALIBRATION: 'HR_ADMIN'
}

/** Build participants array: each type with enabled true if selected in form. */
function buildParticipants(selectedParticipants: string[]): PerformanceCycleParticipantItem[] {
  const selectedSet = new Set(
    selectedParticipants.map(p => UI_TO_API_PARTICIPANT[String(p).toUpperCase()] ?? String(p).toUpperCase())
  )
  return API_PARTICIPANT_TYPES.map(participantType => ({
    participantType,
    enabled: selectedSet.has(participantType)
  }))
}

/** True when the cycle is from local storage (client-generated id). */
function isNewCycle(id: string | undefined): boolean {
  return !id || id.startsWith('cycle_')
}

/** Build companyValues array from selected value ids (API shape: companyValue, version, performanceCycle, etc.). */
function buildCompanyValues(valueIds: string[], performanceCycleId?: string): PerformanceCycleCompanyValueItem[] {
  return (valueIds ?? []).map(companyValueId => {
    const item: PerformanceCycleCompanyValueItem = {
      companyValue: companyValueId,
      mandatory: true
    }
    if (performanceCycleId) {
      item.performanceCycle = performanceCycleId
    }
    return item
  })
}

/** Build REST API payload from cycle editor form. */
function buildSavePayload(values: CycleEditorValues): SavePerformanceCyclePayload {
  const changeMode = isNewCycle(values.id) ? 'INSERT' : 'UPDATE'
  const frequencyApi = FREQUENCY_TO_API[values.frequency] ?? 'ANNUAL'
  const valueIds = values.valueIds ?? []
  const companyValues = buildCompanyValues(valueIds, changeMode === 'UPDATE' && values.id ? values.id : undefined)
  return {
    changeMode,
    performanceCycle: {
      ...(values.id && !isNewCycle(values.id) ? { id: values.id } : {}),
      ...(changeMode === 'UPDATE' && values.version != null ? { version: values.version } : {}),
      name: values.name.trim(),
      startDate: values.startDate,
      endDate: values.endDate,
      frequency: frequencyApi,
      ratingScale: values.ratingScaleId ?? null,
      // participants: buildParticipants(values.participants ?? []),
      participants: buildParticipants([]),
      ...(changeMode === 'INSERT' ? { status: 'DRAFT_CYCLE' } : {}),
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
  const status = isActive ? 'ACTIVE_CYCLE' : 'DRAFT_CYCLE'
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
