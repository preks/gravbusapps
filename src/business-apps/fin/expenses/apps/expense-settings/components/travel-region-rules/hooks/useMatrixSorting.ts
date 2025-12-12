import { useCallback, useMemo } from 'react'
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragEndEvent
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import { EditableAllowanceRegionRule, EditableTravelRegion } from '../types'

interface TravelRegion {
  id: string
  code: string
  value: string
}

export interface MatrixSortingState {
  sensors: any
  sortedRegions: EditableTravelRegion[]
  anyRegionHasDetails: boolean
}

export interface MatrixSortingActions {
  handleDragEnd: (event: DragEndEvent) => void
}

interface UseMatrixSortingOptions {
  showRegionsWithDetailsFirst: boolean
  editableTravelRegions: EditableTravelRegion[]
  allowanceRegionRules: EditableAllowanceRegionRule[]
  setAllowanceRegionRules: (rules: EditableAllowanceRegionRule[]) => void
  setEditableCells: (cells: any[]) => void
  convertToEditableCells: (rules: EditableAllowanceRegionRule[], regions: TravelRegion[]) => any[]
  validateCurrencies: (cells: any[]) => any[]
  travelRegionSetId: string
}

export const useMatrixSorting = (options: UseMatrixSortingOptions) => {
  const {
    showRegionsWithDetailsFirst,
    editableTravelRegions,
    allowanceRegionRules,
    setAllowanceRegionRules,
    setEditableCells,
    convertToEditableCells,
    validateCurrencies,
    travelRegionSetId
  } = options

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  // Helper to check if a region has any details in the current rules
  const regionHasDetails = useCallback(
    (region: TravelRegion, rules: EditableAllowanceRegionRule[]): boolean => {
      return rules.some(rule => rule.details?.some(detail => detail.travelRegion?.id === region.id))
    },
    []
  )

  // Get sorted regions - with details first if checkbox is checked
  const sortedRegions = useMemo(() => {
    console.log('Sorting ALL regions:', {
      showRegionsWithDetailsFirst,
      totalRegions: editableTravelRegions.length,
      totalRules: allowanceRegionRules.length,
      travelRegionSetId
    })

    // Sort all regions alphabetically by value
    const sortedAlphabetically = [...editableTravelRegions].sort((a, b) => 
      a.value.localeCompare(b.value)
    )

    if (!showRegionsWithDetailsFirst) {
      // When checkbox is unchecked, return regions alphabetically
      return sortedAlphabetically
    }

    // Separate regions into two groups: with details and without details
    const regionsWithDetails: TravelRegion[] = []
    const regionsWithoutDetails: TravelRegion[] = []
    const processedIds = new Set<string>()

    sortedAlphabetically.forEach(region => {
      if (regionHasDetails(region, allowanceRegionRules)) {
        regionsWithDetails.push(region)
        processedIds.add(region.id) // Mark as processed
      }
    })

    // Only add regions WITHOUT details that weren't already added to "with details"
    sortedAlphabetically.forEach(region => {
      if (!processedIds.has(region.id) && !regionHasDetails(region, allowanceRegionRules)) {
        regionsWithoutDetails.push(region)
      }
    })

    console.log('Sort result:', {
      withDetails: regionsWithDetails.length,
      withoutDetails: regionsWithoutDetails.length,
      sampleWithDetails: regionsWithDetails.slice(0, 5).map(r => ({ id: r.id, code: r.code, value: r.value })),
      sampleWithoutDetails: regionsWithoutDetails.slice(0, 5).map(r => ({ id: r.id, code: r.code, value: r.value }))
    })

    // Return: regions with details first (alphabetically), then regions without details (alphabetically)
    return [...regionsWithDetails, ...regionsWithoutDetails]
  }, [editableTravelRegions, allowanceRegionRules, showRegionsWithDetailsFirst, regionHasDetails, travelRegionSetId])

  // Check if any region has details in the CURRENT travel region set
  const anyRegionHasDetails = useMemo(() => {
    const hasAny = editableTravelRegions.some(region => regionHasDetails(region, allowanceRegionRules))

    console.log('Checking anyRegionHasDetails:', {
      result: hasAny,
      totalRegions: editableTravelRegions.length,
      totalRules: allowanceRegionRules.length
    })

    return hasAny
  }, [editableTravelRegions, allowanceRegionRules, regionHasDetails])

  // Handle drag end for column reordering
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (active.id !== over?.id) {
        setAllowanceRegionRules(rules => {
          const oldIndex = rules.findIndex(rule => rule.id === active.id)
          const newIndex = rules.findIndex(rule => rule.id === over?.id)

          const newRules = arrayMove(rules, oldIndex, newIndex)

          // Update rule order
          const updatedRules = newRules.map((rule, index) => ({
            ...rule,
            ruleOrder: index + 1
          }))

          // Regenerate editable cells with new order
          const currentRegions = editableTravelRegions.map(r => ({ id: r.id, code: r.code, value: r.value }))
          const newCells = convertToEditableCells(updatedRules, currentRegions)
          const validatedCells = validateCurrencies(newCells)
          setEditableCells(validatedCells)

          return updatedRules
        })
      }
    },
    [editableTravelRegions, validateCurrencies, convertToEditableCells, setAllowanceRegionRules, setEditableCells]
  )

  return {
    state: {
      sensors,
      sortedRegions,
      anyRegionHasDetails
    },
    actions: {
      handleDragEnd
    }
  }
}
