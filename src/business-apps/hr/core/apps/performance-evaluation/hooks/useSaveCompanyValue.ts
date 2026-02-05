import { useCallback } from 'react'
import {
  saveCompanyValue as saveCompanyValueApi,
  updateCompanyValue as updateCompanyValueApi,
  type SaveCompanyValuePayload,
  type SaveCompanyValueResponse,
  type UpdateCompanyValuePayload,
  type UpdateCompanyValueResponse
} from '../services/companyValueApi'
import type { ValueEditorValues } from '../ValuesEditorModal'
import type { ValueItemStored } from '../types'

/** Build payload for saveCompanyValue (INSERT only – new value). */
function buildSavePayload(values: ValueEditorValues): SaveCompanyValuePayload {
  return {
    changeMode: 'INSERT',
    companyValue: {
      title: values.title.trim(),
      description: values.description.trim(),
      recordState: values.recordState
    }
  }
}

/** Build payload for updateCompanyValue (POST) – shape { companyValue: { id, version?, title, description, recordState } }. */
function buildUpdatePayload(values: ValueEditorValues): UpdateCompanyValuePayload {
  return {
    companyValue: {
      id: values.id!,
      ...(values.version == null ? {} : { version: values.version }),
      title: values.title.trim(),
      description: values.description.trim(),
      recordState: values.recordState
    }
  }
}

/** Build payload for DELETE (saveCompanyValue with changeMode DELETE). */
function buildDeletePayload(value: ValueItemStored): SaveCompanyValuePayload {
  return {
    changeMode: 'DELETE',
    companyValue: {
      id: value.id,
      version: value.version ?? 0,
      title: '',
      description: '',
      recordState: 'archived'
    }
  }
}

/** Build payload for activate/deactivate via updateCompanyValue – shape { companyValue: { ... } }. */
function buildUpdateRecordStatePayload(value: ValueItemStored, recordState: string): UpdateCompanyValuePayload {
  return {
    companyValue: {
      id: value.id,
      version: value.version ?? 0,
      title: value.title,
      description: value.description,
      recordState: recordState.toUpperCase()
    }
  }
}

export type CompanyValueApiResponse = SaveCompanyValueResponse | UpdateCompanyValueResponse | null

export interface UseSaveCompanyValueResult {
  saveCompanyValue: (values: ValueEditorValues) => Promise<CompanyValueApiResponse>
  deleteCompanyValue: (value: ValueItemStored) => Promise<SaveCompanyValueResponse | null>
  updateCompanyValueRecordState: (
    value: ValueItemStored,
    recordState: string
  ) => Promise<UpdateCompanyValueResponse | null>
}

export function useSaveCompanyValue(accessToken: string | undefined): UseSaveCompanyValueResult {
  const saveCompanyValue = useCallback(
    async (values: ValueEditorValues): Promise<CompanyValueApiResponse> => {
      if (!accessToken) return null
      if (values.id) {
        const payload = buildUpdatePayload(values)
        const result = await updateCompanyValueApi(accessToken, payload)
        return result ?? null
      }
      const payload = buildSavePayload(values)
      const result = await saveCompanyValueApi(accessToken, payload)
      return result ?? null
    },
    [accessToken]
  )

  const deleteCompanyValue = useCallback(
    async (value: ValueItemStored): Promise<SaveCompanyValueResponse | null> => {
      if (!accessToken) return null
      const payload = buildDeletePayload(value)
      const result = await saveCompanyValueApi(accessToken, payload)
      return result ?? null
    },
    [accessToken]
  )

  const updateCompanyValueRecordState = useCallback(
    async (value: ValueItemStored, recordState: string): Promise<UpdateCompanyValueResponse | null> => {
      if (!accessToken) return null
      const payload = buildUpdateRecordStatePayload(value, recordState)
      const result = await updateCompanyValueApi(accessToken, payload)
      return result ?? null
    },
    [accessToken]
  )

  return { saveCompanyValue, deleteCompanyValue, updateCompanyValueRecordState }
}
