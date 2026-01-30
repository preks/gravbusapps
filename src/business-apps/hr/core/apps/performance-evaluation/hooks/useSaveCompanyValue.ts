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
      active: values.active
    }
  }
}

/** Build payload for updateCompanyValue (POST) – shape { companyValue: { id, version?, title, description, active } }. */
function buildUpdatePayload(values: ValueEditorValues): UpdateCompanyValuePayload {
  return {
    companyValue: {
      id: values.id!,
      ...(values.version != null ? { version: values.version } : {}),
      title: values.title.trim(),
      description: values.description.trim(),
      active: values.active
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
      active: false
    }
  }
}

/** Build payload for activate/deactivate via updateCompanyValue – shape { companyValue: { ... } }. */
function buildUpdateActivePayload(value: ValueItemStored, active: boolean): UpdateCompanyValuePayload {
  return {
    companyValue: {
      id: value.id,
      version: value.version ?? 0,
      title: value.title,
      description: value.description,
      active
    }
  }
}

export type CompanyValueApiResponse = SaveCompanyValueResponse | UpdateCompanyValueResponse | null

export interface UseSaveCompanyValueResult {
  saveCompanyValue: (values: ValueEditorValues) => Promise<CompanyValueApiResponse>
  deleteCompanyValue: (value: ValueItemStored) => Promise<SaveCompanyValueResponse | null>
  updateCompanyValueActive: (value: ValueItemStored, active: boolean) => Promise<UpdateCompanyValueResponse | null>
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

  const updateCompanyValueActive = useCallback(
    async (value: ValueItemStored, active: boolean): Promise<UpdateCompanyValueResponse | null> => {
      if (!accessToken) return null
      const payload = buildUpdateActivePayload(value, active)
      const result = await updateCompanyValueApi(accessToken, payload)
      return result ?? null
    },
    [accessToken]
  )

  return { saveCompanyValue, deleteCompanyValue, updateCompanyValueActive }
}
