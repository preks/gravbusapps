import { useCallback, useEffect, useMemo, useState } from 'react'
import { FunctionsServiceClient } from '@/common/network/functions/FunctionsServiceClient'
import type { StoredSecretOption } from '../components/editor/SettingsEditor'

/** Lists and creates tenant-scoped stored credentials (same backing store as function Settings bindings). */
export function useTenantSecrets(accessToken: string) {
  const client = useMemo(() => new FunctionsServiceClient(accessToken), [accessToken])
  const [storedSecrets, setStoredSecrets] = useState<StoredSecretOption[]>([])

  const refreshSecrets = useCallback(async () => {
    try {
      const list = await client.listSecrets()
      setStoredSecrets(
        (list || []).map(s => ({
          id: s.id,
          displayName: s.displayName
        }))
      )
    } catch {
      setStoredSecrets([])
    }
  }, [client])

  useEffect(() => {
    void refreshSecrets()
  }, [refreshSecrets])

  const onCreateStoredSecret = useCallback(
    async (input: { displayName: string; value: string }) => {
      await client.createSecret({
        displayName: input.displayName,
        value: input.value
      })
      await refreshSecrets()
    },
    [client, refreshSecrets]
  )

  const updateDisplayName = useCallback(
    async (secretId: string, displayName: string) => {
      await client.updateSecretMetadata(secretId, { displayName })
      await refreshSecrets()
    },
    [client, refreshSecrets]
  )

  const appendSecretValue = useCallback(
    async (secretId: string, value: string) => {
      await client.appendSecretValue(secretId, { value })
      await refreshSecrets()
    },
    [client, refreshSecrets]
  )

  const deleteSecret = useCallback(
    async (secretId: string) => {
      await client.deleteSecret(secretId)
      await refreshSecrets()
    },
    [client, refreshSecrets]
  )

  return {
    storedSecrets,
    refreshSecrets,
    onCreateStoredSecret,
    updateDisplayName,
    appendSecretValue,
    deleteSecret
  }
}
