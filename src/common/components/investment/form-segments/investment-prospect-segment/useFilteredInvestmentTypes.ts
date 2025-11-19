import { useState, useEffect, useCallback } from 'react'
import { useCatalogEntries, useCatalogEntry } from '@/common/data/catalog'

interface FilteredType {
  id: string
  value: string
  label: string
}

interface UseFilteredInvestmentTypesReturn {
  types: FilteredType[]
  loading: boolean
  error: string | null
}

/**
 * Check if a type has referenceFields (either directly or in its parent group)
 */
const typeHasReferenceFields = (typeEntry: any, groupEntry: any | null): boolean => {
  // Check type's own referenceFields
  let typeObjectValue: any = null
  if (typeEntry.objectValue) {
    try {
      typeObjectValue =
        typeof typeEntry.objectValue === 'string' ? JSON.parse(typeEntry.objectValue) : typeEntry.objectValue
    } catch {
      typeObjectValue = typeEntry.objectValue
    }
  }

  if (
    typeObjectValue?.referenceFields &&
    Array.isArray(typeObjectValue.referenceFields) &&
    typeObjectValue.referenceFields.length > 0
  ) {
    return true
  }

  // Check group's referenceFields if provided
  if (groupEntry) {
    let groupObjectValue: any = null
    if (groupEntry.objectValue) {
      try {
        groupObjectValue =
          typeof groupEntry.objectValue === 'string' ? JSON.parse(groupEntry.objectValue) : groupEntry.objectValue
      } catch {
        groupObjectValue = groupEntry.objectValue
      }
    }

    if (
      groupObjectValue?.referenceFields &&
      Array.isArray(groupObjectValue.referenceFields) &&
      groupObjectValue.referenceFields.length > 0
    ) {
      return true
    }
  }

  return false
}

/**
 * Hook to fetch and filter Investment Types for a given group
 * Only returns types that have referenceFields (either directly in the type or in the parent group)
 */
export const useFilteredInvestmentTypes = (
  investmentGroupRef: string | null | undefined,
  accessToken: string
): UseFilteredInvestmentTypesReturn => {
  const [types, setTypes] = useState<FilteredType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchCatalogEntries } = useCatalogEntries({
    accessToken
  })
  const { fetchCatalogEntryById } = useCatalogEntry(accessToken)

  const fetchFilteredTypes = useCallback(async () => {
    if (!accessToken || !investmentGroupRef) {
      setTypes([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Extract group code from Ref (e.g., "InvestmentGroup:v1:REAL_ESTATE" -> "REAL_ESTATE")
      const groupCode = investmentGroupRef.split(':').pop() || investmentGroupRef

      // Fetch the group entry to check its referenceFields
      // investmentGroupRef is already in the correct format (e.g., "InvestmentGroup:v1:REAL_ESTATE")
      const groupId = investmentGroupRef.includes(':') ? investmentGroupRef : `InvestmentGroup:v1:${investmentGroupRef}`
      const groupEntry = await fetchCatalogEntryById(groupId).catch(() => null)

      // Fetch all investment types
      const { entries: allTypes } = await fetchCatalogEntries({
        catalogIdentifier: 'InvestmentType',
        version: 'v1',
        limit: 100,
        offset: 0
      })

      // Filter types by parent group
      const expectedParentRef = `InvestmentGroup:v1:${groupCode}`
      const typesForGroup = allTypes.filter(entry => {
        return (
          entry.parentEntryId === expectedParentRef ||
          (entry.parentEntry && entry.parentEntry.id === groupId) ||
          (entry.parentEntry && entry.parentEntry.code === groupCode)
        )
      })

      // Filter types that have referenceFields (directly or in parent group)
      const filteredTypes: FilteredType[] = []

      for (const typeEntry of typesForGroup) {
        const hasFields = typeHasReferenceFields(typeEntry, groupEntry || null)
        if (hasFields) {
          filteredTypes.push({
            id: typeEntry.id,
            value: `InvestmentType:v1:${typeEntry.code || typeEntry.id}`,
            label: typeEntry.value || typeEntry.displayValue || 'Unknown'
          })
        }
      }

      setTypes(filteredTypes)
    } catch (err) {
      console.error('useFilteredInvestmentTypes: Error fetching types:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setTypes([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, investmentGroupRef, fetchCatalogEntries, fetchCatalogEntryById])

  useEffect(() => {
    fetchFilteredTypes()
  }, [fetchFilteredTypes])

  return {
    types,
    loading,
    error
  }
}
