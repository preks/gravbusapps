import { useState, useEffect, useMemo } from 'react'
import { OrgDirectoryClient } from '@/common/network/org-directory/OrgDirectoryClient'
import type { SelectOption, BoardColumn } from '../types/columns'

export interface PeopleOptionsResult {
  options: SelectOption[]
  isLoading: boolean
  lookupMap: Map<string, SelectOption>
}

/**
 * Fetches employees from the active organizational unit and returns
 * them as SelectOption[] ready to be injected into people columns.
 * Uses Keycloak userId as the option value to match the OrgDirectoryClient convention.
 */
export function usePeopleColumnOptions(accessToken: string | undefined, columns: BoardColumn[]): PeopleOptionsResult {
  const [options, setOptions] = useState<SelectOption[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const hasPeopleColumn = useMemo(() => columns.some(c => c.type === 'people'), [columns])

  useEffect(() => {
    if (!accessToken || !hasPeopleColumn) return

    let cancelled = false
    setIsLoading(true)

    void (async () => {
      try {
        const client = new OrgDirectoryClient(accessToken)
        const users = await client.getAllUsersBasic()

        if (cancelled) return

        const mapped: SelectOption[] = users
          .filter(u => u.id && u.name)
          .map(u => ({
            value: u.id,
            label: u.name,
            avatarUrl: u.avatarUrl
          }))

        setOptions(mapped)
      } catch (err) {
        console.error('[usePeopleColumnOptions] Failed to load employees:', err instanceof Error ? err.message : err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [accessToken, hasPeopleColumn])

  const lookupMap = useMemo(() => {
    const map = new Map<string, SelectOption>()
    for (const o of options) map.set(o.value, o)
    return map
  }, [options])

  return { options, isLoading, lookupMap }
}
