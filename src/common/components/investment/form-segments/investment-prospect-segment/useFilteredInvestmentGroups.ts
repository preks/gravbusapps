import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogEntries } from '@/common/data/catalog'

interface FilteredGroup {
  id: string
  value: string
  label: string
}

interface UseFilteredInvestmentGroupsReturn {
  groups: FilteredGroup[]
  loading: boolean
  error: string | null
}

/**
 * Check if a catalog entry has referenceFields (either directly or in child types)
 */
const hasReferenceFields = (entry: any, childEntries?: any[]): boolean => {
  // Parse objectValue
  let objectValue: any = null
  if (entry.objectValue) {
    try {
      objectValue = typeof entry.objectValue === 'string' ? JSON.parse(entry.objectValue) : entry.objectValue
    } catch {
      objectValue = entry.objectValue
    }
  }

  // Check if group itself has referenceFields
  if (
    objectValue?.referenceFields &&
    Array.isArray(objectValue.referenceFields) &&
    objectValue.referenceFields.length > 0
  ) {
    return true
  }

  // Check child entries (types) if provided
  if (childEntries && childEntries.length > 0) {
    for (const child of childEntries) {
      let childObjectValue: any = null
      if (child.objectValue) {
        try {
          childObjectValue = typeof child.objectValue === 'string' ? JSON.parse(child.objectValue) : child.objectValue
        } catch {
          childObjectValue = child.objectValue
        }
      }
      if (
        childObjectValue?.referenceFields &&
        Array.isArray(childObjectValue.referenceFields) &&
        childObjectValue.referenceFields.length > 0
      ) {
        return true
      }
    }
  }

  return false
}

/**
 * Hook to fetch and filter Investment Groups - only those with referenceFields
 * (either directly in the group or in any of its child types)
 */
export const useFilteredInvestmentGroups = (
  businessAppContext?: BusinessAppContextProps
): UseFilteredInvestmentGroupsReturn => {
  const [groups, setGroups] = useState<FilteredGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchCatalogEntries } = useCatalogEntries({
    accessToken: businessAppContext?.accessToken || ''
  })

  const fetchFilteredGroups = useCallback(async () => {
    if (!businessAppContext?.accessToken) {
      setGroups([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch all investment groups with child entries
      const result = await fetchCatalogEntries({
        catalogIdentifier: 'InvestmentGroup',
        version: 'v1',
        limit: 100,
        offset: 0,
        includeChildCatalogEntries: true
      } as any)

      const entries = result.entries

      // Filter groups that have referenceFields (directly or in any child type)
      const filteredGroups: FilteredGroup[] = []

      for (const entry of entries) {
        // Get child entries from the entry (now mapped if includeChildCatalogEntries was true)
        const childEntries = entry.childEntries || []
        const hasFields = hasReferenceFields(entry, childEntries)
        if (hasFields) {
          filteredGroups.push({
            id: entry.id,
            value: `InvestmentGroup:v1:${entry.code || entry.id}`,
            label: entry.value || entry.displayValue || 'Unknown'
          })
        }
      }

      setGroups(filteredGroups)
    } catch (err) {
      console.error('useFilteredInvestmentGroups: Error fetching groups:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [businessAppContext?.accessToken, fetchCatalogEntries])

  useEffect(() => {
    fetchFilteredGroups()
  }, [fetchFilteredGroups])

  return {
    groups,
    loading,
    error
  }
}
