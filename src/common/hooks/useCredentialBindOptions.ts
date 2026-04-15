import { useCallback, useEffect, useState } from 'react'
import { FunctionsServiceClient } from '@/common/network/functions/FunctionsServiceClient'
import { buildCredentialBindOptions, type CredentialBindOption } from '@/common/utils/credentialBindOptions'

/** Loads standalone credentials + credential bundle slots for shared pickers (functions, connections, tools). */
export function useCredentialBindOptions(accessToken: string | undefined) {
  const [credentialBindOptions, setCredentialBindOptions] = useState<CredentialBindOption[]>([])

  const refreshCredentialBindOptions = useCallback(async () => {
    if (!accessToken?.trim()) {
      setCredentialBindOptions([])
      return
    }
    const client = new FunctionsServiceClient(accessToken)
    let secrets: Awaited<ReturnType<FunctionsServiceClient['listSecrets']>> = []
    try {
      secrets = await client.listSecrets()
    } catch {
      secrets = []
    }
    let bundleItems: Awaited<ReturnType<FunctionsServiceClient['listSecretBundles']>>['items'] = []
    try {
      const bundlesPage = await client.listSecretBundles({ limit: 100, offset: 0, includeSlots: true })
      bundleItems = bundlesPage?.items || []
    } catch {
      bundleItems = []
    }
    setCredentialBindOptions(
      buildCredentialBindOptions(
        (secrets || []).map(s => ({ id: s.id, displayName: s.displayName })),
        bundleItems
      )
    )
  }, [accessToken])

  useEffect(() => {
    void refreshCredentialBindOptions()
  }, [refreshCredentialBindOptions])

  return { credentialBindOptions, refreshCredentialBindOptions }
}
