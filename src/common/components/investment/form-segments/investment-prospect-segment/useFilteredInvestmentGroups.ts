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
 * Parse objectValue from catalog entry
 */
const parseObjectValue = (entry: any): any => {
  if (!entry.objectValue) return null
  try {
    return typeof entry.objectValue === 'string' ? JSON.parse(entry.objectValue) : entry.objectValue
  } catch {
    return entry.objectValue
  }
}

/**
 * Check if objectValue has referenceFields
 */
const hasReferenceFieldsInObject = (objectValue: any): boolean => {
  return (
    objectValue?.referenceFields && Array.isArray(objectValue.referenceFields) && objectValue.referenceFields.length > 0
  )
}

/**
 * Check if any child entry has referenceFields
 */
const hasReferenceFieldsInChildren = (childEntries: any[]): boolean => {
  for (const child of childEntries) {
    const childObjectValue = parseObjectValue(child)
    if (hasReferenceFieldsInObject(childObjectValue)) {
      return true
    }
  }
  return false
}

/**
 * Check if a catalog entry has referenceFields (either directly or in child types)
 */
const hasReferenceFields = (entry: any, childEntries?: any[]): boolean => {
  const objectValue = parseObjectValue(entry)

  // Check if group itself has referenceFields
  if (hasReferenceFieldsInObject(objectValue)) {
    return true
  }

  // Check child entries (types) if provided
  if (childEntries && childEntries.length > 0) {
    return hasReferenceFieldsInChildren(childEntries)
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
