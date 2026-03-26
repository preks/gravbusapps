import { useState, useCallback } from 'react'
import { useEnterpriseAgentClient } from './useEnterpriseAgentClient'

export interface MemoryEntry {
  key: string
  value: string
  namespace?: string
}

export const useAgentMemory = (accessToken: string) => {
  const client = useEnterpriseAgentClient(accessToken)
  const [entries, setEntries] = useState<MemoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  const search = useCallback(
    async (query: string) => {
      if (!query.trim()) return
      setLoading(true)
      try {
        const results = await client.getMemory(query)
        setEntries(results)
      } catch {
        setEntries([])
      } finally {
        setLoading(false)
      }
    },
    [client]
  )

  const save = useCallback(
    async (key: string, value: string, namespace?: string) => {
      await client.saveMemory(key, value, namespace)
      setEntries(prev => [{ key, value, namespace }, ...prev.filter(e => e.key !== key)])
    },
    [client]
  )

  return { entries, loading, search, save }
}
