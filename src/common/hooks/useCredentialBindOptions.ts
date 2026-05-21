import { useCallback, useEffect, useState } from 'react'
import { FunctionsServiceClient } from '@/common/network/functions/FunctionsServiceClient'
import { buildCredentialBindOptionsFromList, type CredentialBindOption } from '@/common/utils/credentialBindOptions'

/** Loads credential field refs for shared pickers (functions, connections, tools). */
export function useCredentialBindOptions(accessToken: string | undefined) {
  const [credentialBindOptions, setCredentialBindOptions] = useState<CredentialBindOption[]>([])

  const refreshCredentialBindOptions = useCallback(async () => {
    if (!accessToken?.trim()) {
      setCredentialBindOptions([])
      return
    }
    const client = new FunctionsServiceClient(accessToken)
    let list: Awaited<ReturnType<FunctionsServiceClient['listCredentials']>> = []
    try {
      list = await client.listCredentials(undefined, true)
    } catch {
      list = []
    }
    setCredentialBindOptions(buildCredentialBindOptionsFromList(list || []))
  }, [accessToken])

  useEffect(() => {
    void refreshCredentialBindOptions()
  }, [refreshCredentialBindOptions])

  return { credentialBindOptions, refreshCredentialBindOptions }
}
