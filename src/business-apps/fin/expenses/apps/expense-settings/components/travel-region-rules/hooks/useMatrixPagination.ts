import { useState, useCallback, useEffect } from 'react'
import { EditableAllowanceRegionRule, EditableTravelRegion } from '../types'

export interface MatrixPaginationState {
  currentPage: number
  pageSize: number
  totalRegions: number
  isLoadingRegions: boolean
}

export interface MatrixPaginationActions {
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  setTotalRegions: (total: number) => void
  setIsLoadingRegions: (loading: boolean) => void
  handlePageChange: (newPage: number) => Promise<void>
  handlePageSizeChange: (newPageSize: number) => Promise<void>
}

interface UseMatrixPaginationOptions {
  loadTravelRegions: (page: number, limit: number, search: string) => Promise<any[]>
  allowanceRegionRules: EditableAllowanceRegionRule[]
  setEditableTravelRegions: (regions: EditableTravelRegion[]) => void
  convertToEditableCells: (rules: EditableAllowanceRegionRule[], regions: any[]) => any[]
  validateCurrencies: (cells: any[]) => any[]
  setEditableCells: (cells: any[]) => void
}

// Helper to get page from URL
const getPageFromUrl = (): number => {
  const urlParams = new URLSearchParams(window.location.search)
  const pageParam = urlParams.get('matrixPage') // Use 'matrixPage' to avoid conflict with set list pagination
  const page = pageParam ? parseInt(pageParam, 10) : 1
  return page > 0 ? page : 1
}

// Helper to update URL with page
const updateUrlWithPage = (page: number) => {
  const urlParams = new URLSearchParams(window.location.search)
  urlParams.set('matrixPage', page.toString()) // Use 'matrixPage' to avoid conflict
  const newUrl = `${window.location.pathname}?${urlParams.toString()}`
  window.history.replaceState({}, '', newUrl)
}

export const useMatrixPagination = (options: UseMatrixPaginationOptions) => {
  const {
    loadTravelRegions,
    allowanceRegionRules,
    setEditableTravelRegions,
    convertToEditableCells,
    validateCurrencies,
    setEditableCells
  } = options

  const [currentPage, setCurrentPage] = useState(getPageFromUrl())
  const [pageSize, setPageSize] = useState(20)
  const [totalRegions, setTotalRegions] = useState(0)
  const [isLoadingRegions, setIsLoadingRegions] = useState(false)

  // Sync URL on page change
  useEffect(() => {
    updateUrlWithPage(currentPage)
  }, [currentPage])

  const handlePageChange = useCallback(
    async (newPage: number) => {
      setCurrentPage(newPage)
      setIsLoadingRegions(true)

      try {
        const paginatedRegions = await loadTravelRegions(newPage, pageSize, '')

        // Get regions with details from current rules
        const regionsWithDetailsMap = new Map<string, any>()
        allowanceRegionRules.forEach(rule => {
          rule.details?.forEach(detail => {
            if (detail.travelRegion && detail.travelRegion.id) {
              const regionId = detail.travelRegion.id
              if (!regionsWithDetailsMap.has(regionId)) {
                regionsWithDetailsMap.set(regionId, {
                  id: detail.travelRegion.id,
                  code: detail.travelRegion.code,
                  value: detail.travelRegion.value
                })
              }
            }
          })
        })
        const regionsWithDetails = Array.from(regionsWithDetailsMap.values())

        // Include regions with details that might be on other pages
        const allRegionsForDisplay = [...paginatedRegions, ...regionsWithDetails]
        const uniqueRegionsForDisplay = Array.from(new Map(allRegionsForDisplay.map(r => [r.id, r])).values())

        setEditableTravelRegions(
          uniqueRegionsForDisplay.map(region => ({
            ...region,
            isEditing: false,
            editingCode: region.code,
            editingValue: region.value,
            isModified: false,
            isNew: false
          }))
        )

        // Generate cells for ALL rules and ALL regions (including those with details)
        const cells = convertToEditableCells(allowanceRegionRules, uniqueRegionsForDisplay)
        const validatedCells = validateCurrencies(cells)
        setEditableCells(validatedCells)
      } catch (err) {
        console.error('Error loading page:', err)
      } finally {
        setIsLoadingRegions(false)
      }
    },
    [
      loadTravelRegions,
      pageSize,
      allowanceRegionRules,
      setEditableTravelRegions,
      convertToEditableCells,
      validateCurrencies,
      setEditableCells
    ]
  )

  const handlePageSizeChange = useCallback(
    async (newPageSize: number) => {
      setPageSize(newPageSize)
      setCurrentPage(1)
      setIsLoadingRegions(true)

      try {
        const paginatedRegions = await loadTravelRegions(1, newPageSize, '')
        const regionsWithDetailsMap = new Map<string, any>()
        allowanceRegionRules.forEach(rule => {
          rule.details?.forEach(detail => {
            if (detail.travelRegion && detail.travelRegion.id) {
              const regionId = detail.travelRegion.id
              if (!regionsWithDetailsMap.has(regionId)) {
                regionsWithDetailsMap.set(regionId, {
                  id: detail.travelRegion.id,
                  code: detail.travelRegion.code,
                  value: detail.travelRegion.value
                })
              }
            }
          })
        })
        const regionsWithDetails = Array.from(regionsWithDetailsMap.values())

        const allRegionsForDisplay = [...paginatedRegions, ...regionsWithDetails]
        const uniqueRegionsForDisplay = Array.from(new Map(allRegionsForDisplay.map(r => [r.id, r])).values())

        setEditableTravelRegions(
          uniqueRegionsForDisplay.map(region => ({
            ...region,
            isEditing: false,
            editingCode: region.code,
            editingValue: region.value,
            isModified: false,
            isNew: false
          }))
        )

        const cells = convertToEditableCells(allowanceRegionRules, uniqueRegionsForDisplay)
        const validatedCells = validateCurrencies(cells)
        setEditableCells(validatedCells)
      } catch (err) {
        console.error('Error loading regions with new page size:', err)
      } finally {
        setIsLoadingRegions(false)
      }
    },
    [
      loadTravelRegions,
      allowanceRegionRules,
      setEditableTravelRegions,
      convertToEditableCells,
      validateCurrencies,
      setEditableCells
    ]
  )

  return {
    state: {
      currentPage,
      pageSize,
      totalRegions,
      isLoadingRegions
    },
    actions: {
      setCurrentPage,
      setPageSize,
      setTotalRegions,
      setIsLoadingRegions,
      handlePageChange,
      handlePageSizeChange
    }
  }
}
