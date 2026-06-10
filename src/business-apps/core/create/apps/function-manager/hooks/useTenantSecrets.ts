import { useCallback, useEffect, useState } from 'react'
import { type CredentialReferenceLocation } from '@/common/network/functions/FunctionsServiceClient'
import { useFunctionsServiceClient } from '@/common/network/functions/useFunctionsServiceClient'
import type { StoredSecretOption } from '../components/editor/SettingsEditor'
import { assertValidCredentialFieldKey } from '@/common/utils/fncredRef'

/** Lists and manages tenant credentials (encrypted field maps; bind as `fncred:` from Settings). */
export function useTenantSecrets(accessToken: string) {
  const client = useFunctionsServiceClient(accessToken)
  const [storedSecrets, setStoredSecrets] = useState<StoredSecretOption[]>([])
  const [secretsLoading, setSecretsLoading] = useState(true)

  const refreshSecrets = useCallback(async () => {
    setSecretsLoading(true)
    try {
      const list = await client.listCredentials(undefined, true)
      setStoredSecrets(
        (list || []).map(s => ({
          id: s.id,
          displayName: s.displayName,
          fieldKeys: Array.isArray(s.fieldKeys) ? s.fieldKeys : []
        }))
      )
    } catch {
      setStoredSecrets([])
    } finally {
      setSecretsLoading(false)
    }
  }, [client])

  useEffect(() => {
    void refreshSecrets()
  }, [refreshSecrets])

  const fetchCredentialReferences = useCallback(
    async (credentialId: string): Promise<CredentialReferenceLocation[]> => {
      try {
        const { locations } = await client.getCredentialReferences(credentialId)
        return Array.isArray(locations) ? locations : []
      } catch {
        return []
      }
    },
    [client]
  )

  const onCreateStoredSecret = useCallback(
    async (input: { displayName: string; live: Record<string, string>; preview: Record<string, string> }) => {
      const displayName = String(input.displayName || '').trim()
      if (!displayName) throw new Error('Display name is required')
      const live = input.live || {}
      const preview = input.preview || {}
      for (const k of Object.keys(live)) {
        assertValidCredentialFieldKey(k)
      }
      for (const k of Object.keys(preview)) {
        assertValidCredentialFieldKey(k)
      }
      await client.createCredential({ displayName, live, preview })
      await refreshSecrets()
    },
    [client, refreshSecrets]
  )

  const saveCredential = useCallback(
    async (
      credentialId: string,
      input: {
        displayName: string
        removeFieldKeys: string[]
        liveToSet: Record<string, string>
        previewToSet: Record<string, string>
      }
    ) => {
      const displayName = String(input.displayName || '').trim()
      if (!displayName) throw new Error('Display name is required')
      const removeFieldKeys = (input.removeFieldKeys || []).map(k => String(k || '').trim()).filter(Boolean)
      const liveToSet = input.liveToSet || {}
      const previewToSet = input.previewToSet || {}
      for (const k of Object.keys(liveToSet)) {
        assertValidCredentialFieldKey(k)
      }
      for (const k of Object.keys(previewToSet)) {
        assertValidCredentialFieldKey(k)
      }
      for (const k of removeFieldKeys) {
        assertValidCredentialFieldKey(k)
      }
      await client.updateCredentialDisplayName(credentialId, { displayName })
      const hasRemovals = removeFieldKeys.length > 0
      const hasLive = Object.keys(liveToSet).length > 0
      const hasPreview = Object.keys(previewToSet).length > 0
      if (hasRemovals || hasLive) {
        await client.replaceCredentialFields(credentialId, liveToSet, {
          profile: 'live',
          merge: true,
          ...(hasRemovals ? { removeFieldKeys } : {})
        })
      }
      if (hasRemovals || hasPreview) {
        await client.replaceCredentialFields(credentialId, previewToSet, {
          profile: 'preview',
          merge: true,
          ...(hasRemovals ? { removeFieldKeys } : {})
        })
      }
      await refreshSecrets()
    },
    [client, refreshSecrets]
  )

  const deleteSecret = useCallback(
    async (credentialId: string) => {
      await client.deleteCredential(credentialId)
      await refreshSecrets()
    },
    [client, refreshSecrets]
  )

  return {
    storedSecrets,
    secretsLoading,
    refreshSecrets,
    fetchCredentialReferences,
    onCreateStoredSecret,
    saveCredential,
    deleteSecret
  }
}
