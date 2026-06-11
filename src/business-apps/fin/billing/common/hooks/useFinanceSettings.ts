/**
 * Finance settings hook.
 *
 * Loads the authoritative finance settings document from BLNK through the
 * NEWWORK Connect lane. There is intentionally NO sample/mock fallback: if the
 * connector is missing or the backend is unreachable, the hook surfaces an
 * error so the UI can show a real connection state instead of fake data.
 */
import { useCallback, useEffect, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  financeAdminEnabled,
  getFinanceSettings,
  saveFinanceSettings,
  type FinanceSettingsDocument
} from '../network/financeAdminClient'

export interface FinanceSettingsState {
  settings: FinanceSettingsDocument | null
  loading: boolean
  saving: boolean
  error: string | null
  /** True when the backend has no settings document yet (needs seeding). */
  notSeeded: boolean
  reload: () => Promise<void>
  save: (document: FinanceSettingsDocument) => Promise<void>
}

export function useFinanceSettings(context: BusinessAppContextProps): FinanceSettingsState {
  const [settings, setSettings] = useState<FinanceSettingsDocument | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notSeeded, setNotSeeded] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNotSeeded(false)
    if (!context.accessToken) {
      setError('Access token missing')
      setLoading(false)
      return
    }
    if (!financeAdminEnabled()) {
      setError('Finance backend connector is not configured')
      setLoading(false)
      return
    }
    try {
      const document = await getFinanceSettings(context.accessToken)
      setSettings(document)
      setNotSeeded(document === null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load finance settings')
      setSettings(null)
    } finally {
      setLoading(false)
    }
  }, [context.accessToken])

  useEffect(() => {
    reload()
  }, [reload])

  const save = useCallback(
    async (document: FinanceSettingsDocument) => {
      if (!context.accessToken) {
        throw new Error('Access token missing')
      }
      setSaving(true)
      try {
        await saveFinanceSettings(context.accessToken, document)
        setSettings(document)
        setNotSeeded(false)
      } finally {
        setSaving(false)
      }
    },
    [context.accessToken]
  )

  return { settings, loading, saving, error, notSeeded, reload, save }
}
