import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { JobFamily, JobFamilyHierarchyState } from '../types'
import { useGetAllJobFamilies } from '../queries/JobFamiliesQueries'

export const useJobFamilies = (context: BusinessAppContextProps) => {
  const [hierarchyState, setHierarchyState] = useState<JobFamilyHierarchyState>({
    rootFamilies: [],
    allFamilies: [],
    familyMap: new Map(),
    expandedIds: new Set()
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(context.accessToken)
  const { fetchAllJobFamilies } = useGetAllJobFamilies(catalogClient)

  // Build hierarchy from flat list
  const buildHierarchy = (families: JobFamily[]): JobFamilyHierarchyState => {
    const familyMap = new Map<string, JobFamily>()
    const rootFamilies: JobFamily[] = []

    // First pass: create map for quick lookup
    families.forEach(family => {
      familyMap.set(family.id, { ...family, children: [] })
    })

    // Second pass: build parent-child relationships
    families.forEach(family => {
      const familyWithChildren = familyMap.get(family.id)!

      if (family.parentEntryId) {
        const parent = familyMap.get(family.parentEntryId)
        if (parent) {
          parent.children.push(familyWithChildren)
          familyWithChildren.parentFamily = parent
        } else {
          // Parent not found, treat as root
          rootFamilies.push(familyWithChildren)
        }
      } else {
        // No parent, this is a root family
        rootFamilies.push(familyWithChildren)
      }
    })

    // Third pass: update hasChildren property based on actual children
    familyMap.forEach(family => {
      family.hasChildren = family.children.length > 0
    })

    // Sort children within each parent
    const sortFamilies = (families: JobFamily[]) => {
      families.sort((a, b) => a.name.localeCompare(b.name))
      families.forEach(family => {
        if (family.children.length > 0) {
          sortFamilies(family.children)
        }
      })
    }

    sortFamilies(rootFamilies)

    return {
      rootFamilies,
      allFamilies: families,
      familyMap,
      expandedIds: new Set()
    }
  }

  // Load initial data (all families for hierarchy building)
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const families = await fetchAllJobFamilies()
      const hierarchy = buildHierarchy(families)
      setHierarchyState(hierarchy)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading job families:', err)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken])

  // Toggle expansion state of a family
  const toggleFamilyExpansion = useCallback((familyId: string) => {
    setHierarchyState(prev => {
      const newExpandedIds = new Set(prev.expandedIds)

      if (newExpandedIds.has(familyId)) {
        newExpandedIds.delete(familyId)
      } else {
        newExpandedIds.add(familyId)
      }

      return {
        ...prev,
        expandedIds: newExpandedIds
      }
    })
  }, [])

  // Expand all families up to a certain level
  const expandToLevel = useCallback(
    (maxLevel: number) => {
      const newExpandedIds = new Set<string>()

      hierarchyState.allFamilies.forEach(family => {
        if (family.level < maxLevel && family.children.length > 0) {
          newExpandedIds.add(family.id)
        }
      })

      setHierarchyState(prev => ({
        ...prev,
        expandedIds: newExpandedIds
      }))
    },
    [hierarchyState.allFamilies]
  )

  // Collapse all families
  const collapseAll = useCallback(() => {
    setHierarchyState(prev => ({
      ...prev,
      expandedIds: new Set()
    }))
  }, [])

  // Set expanded IDs directly (for tree component integration)
  const setExpandedIds = useCallback((ids: Set<string>) => {
    setHierarchyState(prev => ({
      ...prev,
      expandedIds: ids
    }))
  }, [])

  // Get family by ID
  const getFamilyById = useCallback(
    (familyId: string): JobFamily | undefined => {
      return hierarchyState.familyMap.get(familyId)
    },
    [hierarchyState.familyMap]
  )

  // Get all children of a family (recursive)
  const getAllChildren = useCallback(
    (familyId: string): JobFamily[] => {
      const family = hierarchyState.familyMap.get(familyId)
      if (!family) return []

      const allChildren: JobFamily[] = []

      const collectChildren = (parent: JobFamily) => {
        parent.children.forEach(child => {
          allChildren.push(child)
          collectChildren(child)
        })
      }

      collectChildren(family)
      return allChildren
    },
    [hierarchyState.familyMap]
  )

  // Get path to root for a family
  const getFamilyPath = useCallback(
    (familyId: string): JobFamily[] => {
      const path: JobFamily[] = []
      let current = hierarchyState.familyMap.get(familyId)

      while (current) {
        path.unshift(current)
        current = current.parentFamily
      }

      return path
    },
    [hierarchyState.familyMap]
  )

  // Search families by name or code
  const searchFamilies = useCallback(
    (query: string): JobFamily[] => {
      const searchTerm = query.toLowerCase()
      return hierarchyState.allFamilies.filter(
        family =>
          family.name.toLowerCase().includes(searchTerm) ||
          family.code.toLowerCase().includes(searchTerm) ||
          (family.description && family.description.toLowerCase().includes(searchTerm))
      )
    },
    [hierarchyState.allFamilies]
  )

  const refetch = useCallback(() => {
    return loadData()
  }, [loadData])

  // Load data on mount and when access token changes
  useEffect(() => {
    if (context.accessToken) {
      loadData()
    }
  }, [context.accessToken, loadData])

  return {
    // Hierarchy data
    rootFamilies: hierarchyState.rootFamilies,
    allFamilies: hierarchyState.allFamilies,
    familyMap: hierarchyState.familyMap,
    expandedIds: hierarchyState.expandedIds,

    // State
    isLoading,
    error,

    // Actions
    refetch,
    toggleFamilyExpansion,
    expandToLevel,
    collapseAll,
    setExpandedIds,

    // Helper functions
    getFamilyById,
    getAllChildren,
    getFamilyPath,
    searchFamilies,

    // Raw fetch function for advanced usage
    fetchAllJobFamilies
  }
}
