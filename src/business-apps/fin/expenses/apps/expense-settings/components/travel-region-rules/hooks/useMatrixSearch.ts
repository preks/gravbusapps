import { useState, useCallback, useRef, useEffect } from 'react'
import { EditableAllowanceRegionRule } from '../types'

export interface MatrixSearchState {
  searchTerm: string
  isSearching: boolean
}

export interface MatrixSearchActions {
  setSearchTerm: (term: string) => void
  handleSearch: (search: string) => Promise<void>
  clearSearch: () => void
}

interface UseMatrixSearchOptions {
  loadTravelRegions: (page: number, limit: number, search: string) => Promise<any[]>
  loadData: () => Promise<void>
  pageSize: number
  allowanceRegionRules: EditableAllowanceRegionRule[]
  setEditableTravelRegions: (regions: any[]) => void
  setEditableCells: (cells: any[]) => void
  convertToEditableCells: (rules: EditableAllowanceRegionRule[], regions: any[]) => any[]
  validateCurrencies: (cells: any[]) => any[]
  setCurrentPage: (page: number) => void
}

export const useMatrixSearch = (options: UseMatrixSearchOptions) => {
  const {
    loadTravelRegions,
    loadData,
    pageSize,
    allowanceRegionRules,
    setEditableTravelRegions,
    setEditableCells,
    convertToEditableCells,
    validateCurrencies,
    setCurrentPage
  } = options

  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Handle search — fetch all matching regions (not limited by pageSize)
  const handleSearch = useCallback(
    async (search: string) => {
      setCurrentPage(1)
      setIsSearching(true)

      try {
        const regions = await loadTravelRegions(1, 9999, search)

        // Update the regions state
        const editableRegions = regions.map(region => ({
          ...region,
          isEditing: false,
          editingCode: region.code,
          editingValue: region.value,
          validityPeriods: [],
          isModified: false,
          isNew: false
        }))
        setEditableTravelRegions(editableRegions)

        // Regenerate cells for new regions
        const cells = convertToEditableCells(allowanceRegionRules, regions)
        const validatedCells = validateCurrencies(cells)
        setEditableCells(validatedCells)
      } catch (err) {
        console.error('❌ Error searching regions:', err)
      } finally {
        setIsSearching(false)
      }
    },
    [
      loadTravelRegions,
      pageSize,
      allowanceRegionRules,
      setEditableTravelRegions,
      setEditableCells,
      convertToEditableCells,
      validateCurrencies,
      setCurrentPage
    ]
  )

  // Clear search
  const clearSearch = useCallback(async () => {
    setSearchTerm('')
    setIsSearching(true)
    try {
      await loadData() // Reload all data instead of searching with empty string
    } finally {
      setIsSearching(false)
    }
  }, [loadData])

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return {
    state: {
      searchTerm,
      isSearching
    },
    actions: {
      setSearchTerm,
      handleSearch,
      clearSearch
    },
    searchTimeoutRef
  }
}
