import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Button,
  Alert,
  AlertDescription,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Toaster,
  Checkbox,
  Label,
  DateInput
} from '@newwork/nw-design-system'
import { toast } from 'sonner'
import { PiArrowLeft, PiPlus, PiMapPin, PiFloppyDisk, PiDotsSixVertical, PiTrash } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { ExpenseSettingsClient } from '../../utils/ExpenseSettingsClient'
import TravelRegionRuleForm from '../../forms/travel-region-rule-form/TravelRegionRuleForm'
import TravelRegionForm from '../../forms/travel-region-form/TravelRegionForm'
import { useAllowanceRuleUsageCheck } from '../../hooks'
import MileageRulesPagination from '../mileage-rules/MileageRulesPagination'
import { useMatrixDataLoaders, useMatrixCellEditing } from './hooks'
import {
  EditableCell,
  EditableTravelRegion,
  EditableAllowanceRegionRule,
  ValidityPeriod,
  CurrencyOption,
  UsageInfo
} from './types'
import dayjs from 'dayjs'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface TravelRegion {
  id: string
  code: string
  value: string
}

interface TravelRegionMatrixViewProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  travelRegionSetId: string
  travelRegionSetName: string
  onBack: () => void
}

// Sortable column header component for drag-and-drop
const SortableColumnHeader: React.FC<{
  rule: EditableAllowanceRegionRule
  onAddDetailForRule: (ruleId: string) => void
  children: React.ReactNode
}> = ({ rule, onAddDetailForRule, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <TableHead ref={setNodeRef} style={style} className="gba:w-48 gba:min-w-48 gba:relative gba:border gba:p-0">
      <div className="gba:p-3">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
          <div
            {...attributes}
            {...listeners}
            className="gba:cursor-grab gba:text-muted-foreground hover:gba:text-foreground"
          >
            <PiDotsSixVertical className="gba:w-4 gba:h-4" />
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onAddDetailForRule(rule.id)}
            className="gba:h-6 gba:w-6 gba:p-0"
            title="Add new detail for this rule"
          >
            <PiPlus className="gba:w-3 gba:h-3" />
          </Button>
        </div>
        {children}
      </div>
    </TableHead>
  )
}

const TravelRegionMatrixView: React.FC<TravelRegionMatrixViewProps> = ({
  accessToken,
  prefixDataTestId = '',
  travelRegionSetId,
  travelRegionSetName,
  onBack
}) => {
  const [editableTravelRegions, setEditableTravelRegions] = useState<EditableTravelRegion[]>([])
  const [allowanceRegionRules, setAllowanceRegionRules] = useState<EditableAllowanceRegionRule[]>([])
  const [editableCells, setEditableCells] = useState<EditableCell[]>([])
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([])
  const [countries, setCountries] = useState<CurrencyOption[]>([]) // Reuse CurrencyOption type for countries
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [isRuleModalLoading, setIsRuleModalLoading] = useState(false)
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false)

  // Edit rule modal state (for adding detail from rule header +)
  const [isEditRuleModalOpen, setIsEditRuleModalOpen] = useState(false)
  const [isEditRuleModalLoading, setIsEditRuleModalLoading] = useState(false)
  const [selectedRuleForEdit, setSelectedRuleForEdit] = useState<EditableAllowanceRegionRule | null>(null)

  // Usage check state
  const [ruleUsageInfo, setRuleUsageInfo] = useState<UsageInfo | null>(null)
  const { checkAllowanceRuleUsage, isChecking: isCheckingUsage } = useAllowanceRuleUsageCheck(accessToken)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalRegions, setTotalRegions] = useState(0)
  const [isLoadingRegions, setIsLoadingRegions] = useState(false)

  // Search state
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Filter state - show regions with details first (default: true)
  const [showRegionsWithDetailsFirst, setShowRegionsWithDetailsFirst] = useState(true)

  // Delete region confirmation state
  const [deleteRegionConfirmation, setDeleteRegionConfirmation] = useState<{
    isOpen: boolean
    region: TravelRegion | null
  }>({ isOpen: false, region: null })
  const [isDeletingRegion, setIsDeletingRegion] = useState(false)

  const catalogClient = useCatalogManagerClient(accessToken)
  const graphqlClient = useGraphQLClient(accessToken)

  // Use data loaders hook - extracts complex loading logic
  const {
    loadCurrencies,
    loadTravelRegions: loadTravelRegionsFromHook,
    loadAllowanceRegionRules,
    fetchTravelRegionCount
  } = useMatrixDataLoaders({ accessToken, travelRegionSetId })

  // Create a function to get a fresh client with current token
  const getExpenseSettingsClient = useCallback(() => {
    const client = new ExpenseSettingsClient()
    if (accessToken) {
      client.setAccessToken(accessToken)
    }
    return client
  }, [accessToken])

  // Check if a specific AllowanceRegionRuleDetail is used in transactions
  const checkDetailUsage = useCallback(
    async (detailId: string): Promise<UsageInfo> => {
      const query = `
      query CheckDetailUsage($detailId: uuid!) {
        expenseAllowanceCount: ExpenseAllowanceAggregate(
          where: { 
            allowanceRegionRuleDetailId: { _eq: $detailId }
            isDeleted: { _eq: false }
          }
        ) {
          aggregate { count }
        }
        expenseRequestTripCount: ExpenseRequestTripAggregate(
          where: { 
            allowanceRegionRuleDetailId: { _eq: $detailId }
            isDeleted: { _eq: false }
          }
        ) {
          aggregate { count }
        }
        expenseRequestTripTimeCount: ExpenseRequestTripTimeAggregate(
          where: { 
            allowanceRegionRuleDetailId: { _eq: $detailId }
            isDeleted: { _eq: false }
          }
        ) {
          aggregate { count }
        }
      }
    `

      const result = await graphqlClient.request<{
        expenseAllowanceCount: { aggregate: { count: number } }
        expenseRequestTripCount: { aggregate: { count: number } }
        expenseRequestTripTimeCount: { aggregate: { count: number } }
      }>(query, { detailId })

      const allowanceCount = result.expenseAllowanceCount?.aggregate?.count || 0
      const tripCount = result.expenseRequestTripCount?.aggregate?.count || 0
      const tripTimeCount = result.expenseRequestTripTimeCount?.aggregate?.count || 0
      const totalUsage = allowanceCount + tripCount + tripTimeCount

      if (totalUsage === 0) {
        return { isUsed: false, usedIn: {}, message: '' }
      }

      const usageDetails: string[] = []
      if (allowanceCount > 0) usageDetails.push(`${allowanceCount} expense allowance(s)`)
      if (tripCount > 0) usageDetails.push(`${tripCount} trip(s)`)
      if (tripTimeCount > 0) usageDetails.push(`${tripTimeCount} trip time(s)`)

      return {
        isUsed: true,
        usedIn: { allowanceCount, tripCount, tripTimeCount },
        message: `This detail is used in ${usageDetails.join(', ')}. Only "Valid To" can be edited.`
      }
    },
    [graphqlClient]
  )

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const formatDate = (dateString?: string): string => {
    if (!dateString) return ''
    return dayjs(dateString).format('DD/MM/YYYY')
  }

  // Wrapper for loadTravelRegions that updates totalRegions state
  const loadTravelRegions = useCallback(
    async (page: number, limit: number, search: string = '') => {
      try {
        setIsLoadingRegions(true)

        const [totalCount, regions] = await Promise.all([
          fetchTravelRegionCount(travelRegionSetId),
          loadTravelRegionsFromHook(page, limit, search)
        ])

        setTotalRegions(totalCount)
        return regions
      } catch (err) {
        console.error('Error loading travel regions:', err)
        return []
      } finally {
        setIsLoadingRegions(false)
      }
    },
    [fetchTravelRegionCount, loadTravelRegionsFromHook, travelRegionSetId]
  )

  // Handle search
  const handleSearch = useCallback(
    async (search: string) => {
      setCurrentPage(1) // Reset to first page when searching
      setIsSearching(true)

      try {
        const regions = await loadTravelRegions(1, pageSize, search)

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
    [loadTravelRegions, pageSize, allowanceRegionRules]
  )

  // Helper to extract country code from travel region code
  // Handles both formats: "DE" (Romanian) and "DE-DE-000" (German)
  const extractCountryCode = (code: string): string => {
    if (!code) return ''
    // If code contains hyphens (e.g., "DE-DE-000"), extract the country part (second segment)
    if (code.includes('-')) {
      const parts = code.split('-')
      return parts[1] || parts[0] // Return second part, or first if no second
    }
    // Otherwise return the code as-is (e.g., "DE")
    return code
  }

  // Helper to check if a region has any details in the current rules
  const regionHasDetails = useCallback((region: TravelRegion, rules: EditableAllowanceRegionRule[]): boolean => {
    const regionCountryCode = extractCountryCode(region.code)
    return rules.some(rule =>
      rule.details?.some(detail => {
        const detailCountryCode = extractCountryCode(detail.travelRegion?.code || '')
        return (
          detailCountryCode === regionCountryCode ||
          detail.travelRegion?.id === region.id ||
          detail.travelRegion?.value === region.value
        )
      })
    )
  }, [])

  // Get sorted regions - with details first if checkbox is checked
  const sortedRegions = useMemo(() => {
    console.log('🔍 Sorting ALL regions:', {
      showRegionsWithDetailsFirst,
      totalRegions: editableTravelRegions.length,
      totalRules: allowanceRegionRules.length,
      travelRegionSetId
    })

    if (!showRegionsWithDetailsFirst) {
      // When checkbox is unchecked, return regions alphabetically
      return editableTravelRegions
    }

    // Separate regions into two groups: with details and without details
    const regionsWithDetails: TravelRegion[] = []
    const regionsWithoutDetails: TravelRegion[] = []

    editableTravelRegions.forEach(region => {
      if (regionHasDetails(region, allowanceRegionRules)) {
        regionsWithDetails.push(region)
      } else {
        regionsWithoutDetails.push(region)
      }
    })

    console.log('🔍 Sort result:', {
      withDetails: regionsWithDetails.length,
      withoutDetails: regionsWithoutDetails.length,
      sampleWithDetails: regionsWithDetails.slice(0, 5).map(r => ({ code: r.code, value: r.value })),
      sampleWithoutDetails: regionsWithoutDetails.slice(0, 5).map(r => ({ code: r.code, value: r.value }))
    })

    // Return: regions with details first, then regions without details
    return [...regionsWithDetails, ...regionsWithoutDetails]
  }, [editableTravelRegions, allowanceRegionRules, showRegionsWithDetailsFirst, regionHasDetails, travelRegionSetId])

  // Client-side pagination: slice the sorted array based on current page
  const paginatedRegions = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const page = sortedRegions.slice(startIndex, endIndex)

    console.log('🔍 Pagination:', {
      currentPage,
      pageSize,
      totalRegions: sortedRegions.length,
      startIndex,
      endIndex,
      pageRegions: page.length,
      firstRegion: page[0] ? { code: page[0].code, value: page[0].value } : null,
      lastRegion: page[page.length - 1]
        ? { code: page[page.length - 1].code, value: page[page.length - 1].value }
        : null
    })

    return page
  }, [sortedRegions, currentPage, pageSize])

  // Check if any region has details in the CURRENT travel region set
  const anyRegionHasDetails = useMemo(() => {
    // Check across all regions (not just current page)
    const hasAny = editableTravelRegions.some(region => regionHasDetails(region, allowanceRegionRules))

    console.log('🔍 Checking anyRegionHasDetails:', {
      result: hasAny,
      totalRegions: editableTravelRegions.length,
      totalRules: allowanceRegionRules.length
    })

    return hasAny
  }, [editableTravelRegions, allowanceRegionRules, regionHasDetails])

  // Convert rule details to editable cells
  const convertToEditableCells = useCallback(
    (rules: EditableAllowanceRegionRule[], regions: TravelRegion[]): EditableCell[] => {
      const cells: EditableCell[] = []

      rules.forEach(rule => {
        regions.forEach(region => {
          // Find existing details for this rule-region combination
          // Match strictly by travel region ID only
          const existingDetails =
            rule.details?.filter(detail => {
              return detail.travelRegion?.id === region.id
            }) || []

          if (existingDetails.length > 0) {
            // Create cells for existing details
            existingDetails.forEach(detail => {
              // Find the matching validity period for this detail
              const periodKey = `${detail.activeFrom}-${detail.activeTo || 'null'}`
              const matchingPeriod = rule.validityPeriods.find(p => p.id === periodKey)

              cells.push({
                id: detail.id,
                travelRegionId: region.id,
                allowanceRegionRuleId: rule.id,
                amount: detail.amount,
                currencyCode: detail.currency?.code || 'EUR',
                currencyRef: detail.currency?.id || detail.currencyRef, // Store full currency ID
                countryRef: detail.country?.id || detail.countryRef, // Store full country ID
                activeFrom: detail.activeFrom,
                activeTo: detail.activeTo,
                version: detail.version, // Version for optimistic locking
                isNew: false,
                isModified: false,
                validityPeriodId: matchingPeriod?.id // Link to the validity period
              })
            })
          }
          // Note: We no longer create empty placeholders here
          // Cells are created on-demand when clicking or adding a period
        })
      })

      return cells
    },
    []
  )

  // Validate currency consistency for each region
  const validateCurrencies = useCallback((cells: EditableCell[]): EditableCell[] => {
    const regionCurrencies: { [regionId: string]: Set<string> } = {}

    // Group currencies by region
    cells.forEach(cell => {
      if (cell.amount > 0) {
        if (!regionCurrencies[cell.travelRegionId]) {
          regionCurrencies[cell.travelRegionId] = new Set()
        }
        regionCurrencies[cell.travelRegionId].add(cell.currencyCode)
      }
    })

    // Mark cells with currency conflicts
    const finalCells = cells.map(cell => {
      const regionCurrenciesSet = regionCurrencies[cell.travelRegionId]
      const hasConflict = regionCurrenciesSet && regionCurrenciesSet.size > 1

      return {
        ...cell,
        hasError: hasConflict,
        errorMessage: hasConflict ? 'Currency mismatch in this region' : undefined
      }
    })

    return finalCells
  }, [])

  // Load all data
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Always load ALL regions (no pagination in API call)
      // We'll handle pagination client-side after sorting
      const [allRegions, rulesData, currenciesData, countriesData] = await Promise.all([
        loadTravelRegions(1, 9999, ''), // Load ALL regions
        loadAllowanceRegionRules(),
        loadCurrencies(),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Country', version: 'v1' },
          { limit: 500, offset: 0, returnTotalRecords: true, includeChildCatalogEntries: true }
        )
      ])

      const { rules, regionsWithDetails } = rulesData
      setAllowanceRegionRules(rules)
      setCurrencies(currenciesData)
      setCountries(
        countriesData.data.map((item: any) => ({
          id: item.id,
          code: item.code,
          value: item.value
        }))
      )

      // Generate cells for ALL rules and ALL regions
      const allRegionsForCells = [...allRegions, ...regionsWithDetails]
      const uniqueRegionsForCells = Array.from(new Map(allRegionsForCells.map(r => [r.id, r])).values())
      const cells = convertToEditableCells(rules, uniqueRegionsForCells)
      const validatedCells = validateCurrencies(cells)
      setEditableCells(validatedCells)

      // Store ALL regions - pagination will be handled client-side
      const allRegionsForDisplay = [...allRegions, ...regionsWithDetails]
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matrix data')
    } finally {
      setIsLoading(false)
    }
  }, [
    loadTravelRegions,
    loadAllowanceRegionRules,
    loadCurrencies,
    validateCurrencies,
    convertToEditableCells,
    currentPage,
    pageSize
    // Remove showRegionsWithDetailsFirst dependency - sorting is client-side now
  ])

  useEffect(() => {
    if (accessToken && travelRegionSetId) {
      loadData()
    }
  }, [accessToken, travelRegionSetId, loadData])

  // Use cell editing hook - extracts cell edit logic (must be after loadData definition)
  const {
    editingCellId,
    editingCellUsageInfo,
    isCheckingCellUsage,
    isSavingCell,
    handleEnterCellEdit,
    updateCellField,
    handleSaveSingleCell,
    handleRemoveNewCell,
    setEditingCellId,
    setEditingCellUsageInfo
  } = useMatrixCellEditing({
    accessToken,
    currencies,
    allowanceRegionRules,
    editableCells,
    setEditableCells,
    setAllowanceRegionRules,
    checkDetailUsage,
    loadData,
    travelRegionSetId,
    getExpenseSettingsClient
  })

  // Handle page change
  const handlePageChange = useCallback(
    async (newPage: number) => {
      setCurrentPage(newPage)
      setIsLoadingRegions(true)

      try {
        const paginatedRegions = await loadTravelRegions(newPage, pageSize, '')

        // Get regions with details from current rules
        const regionsWithDetailsMap = new Map<string, TravelRegion>()
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
        // This ensures details are available for rendering even if region is on another page
        const cells = convertToEditableCells(allowanceRegionRules, uniqueRegionsForDisplay)
        const validatedCells = validateCurrencies(cells)
        setEditableCells(validatedCells)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load page')
      } finally {
        setIsLoadingRegions(false)
      }
    },
    [loadTravelRegions, pageSize, allowanceRegionRules, validateCurrencies, convertToEditableCells]
  )

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

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
    [editableTravelRegions, validateCurrencies]
  )

  // Open region creation modal
  const handleAddRegion = () => {
    setIsRegionModalOpen(true)
  }

  // Handle region modal save
  const handleRegionModalSave = async () => {
    // The form already created the region via catalogClient.createCatalogEntry()
    // Just reload the page to show the new region
    console.log('✅ Region created by form, reloading page...')
    await handlePageChange(currentPage)
    setIsRegionModalOpen(false)
  }

  // Handle region modal cancel
  const handleRegionModalCancel = () => {
    setIsRegionModalOpen(false)
  }

  // Check if a region has any saved allowance details by checking against loaded rule details
  // NOTE: This only works correctly if the rules contain ALL rules with details for these regions
  // Since rules are filtered by travelRegionSetId, this will only check rules within the current set
  const regionHasSavedDetails = useCallback(
    (regionId: string): boolean => {
      // Check if any rule has details for this region
      const hasDetails = allowanceRegionRules.some(rule => {
        const ruleHasDetailsForRegion = rule.details?.some(detail => {
          const matches = detail.travelRegion?.id === regionId && detail.id
          return matches
        })
        return ruleHasDetailsForRegion
      })

      // Debug logging
      const region = editableTravelRegions.find(r => r.id === regionId)
      console.log('🔍 Checking region for delete:', {
        regionCode: region?.code,
        regionValue: region?.value,
        regionId,
        hasDetails,
        currentTravelRegionSet: travelRegionSetId,
        totalRulesInCurrentSet: allowanceRegionRules.length,
        rulesWithDetails: allowanceRegionRules
          .filter(r => r.details && r.details.length > 0)
          .map(r => ({
            ruleId: r.id,
            ruleName: r.name,
            detailCount: r.details?.length || 0,
            regionIdsInRule: r.details?.map(d => d.travelRegion?.id).filter(Boolean),
            hasThisRegion: r.details?.some(d => d.travelRegion?.id === regionId)
          }))
      })

      return hasDetails
    },
    [allowanceRegionRules, editableTravelRegions, travelRegionSetId]
  )

  // Handle delete region click
  const handleDeleteRegionClick = async (region: TravelRegion, e: React.MouseEvent) => {
    e.stopPropagation()

    // Check if this region has any SAVED details in any rule
    if (regionHasSavedDetails(region.id)) {
      toast.error('Cannot delete region with existing allowance details')
      return
    }

    setDeleteRegionConfirmation({ isOpen: true, region })
  }

  // Handle delete region cancel
  const handleDeleteRegionCancel = () => {
    setDeleteRegionConfirmation({ isOpen: false, region: null })
  }

  // Handle delete region confirm
  const handleDeleteRegionConfirm = async () => {
    const { region } = deleteRegionConfirmation
    if (!region) return

    console.log('🗑️ Deleting region:', {
      id: region.id,
      code: region.code,
      value: region.value
    })

    setIsDeletingRegion(true)
    try {
      // Soft delete the region using the catalog entry ID (not code)
      console.log('🗑️ Calling deleteCatalogEntry with:', 'TravelRegion', 'v1', region.id)
      const deleteResult = await catalogClient.deleteCatalogEntry('TravelRegion', 'v1', region.id)
      console.log('✅ Delete API call successful, result:', deleteResult)

      // Verify deletion by trying to fetch the entry
      try {
        const verifyEntry = await catalogClient.getCatalogEntryById(region.id)
        console.log('🔍 Verification: Entry after delete:', {
          id: verifyEntry.id,
          code: verifyEntry.code,
          isDeleted: verifyEntry.isDeleted
        })
      } catch {
        console.log('🔍 Verification: Entry not found (this might be expected)')
      }

      toast.success(`Travel region "${region.value}" deleted successfully`)

      // Close dialog first
      setDeleteRegionConfirmation({ isOpen: false, region: null })

      // Fully reload all data to reflect the deletion
      console.log('🔄 Reloading data after delete...')
      await loadData()
      console.log('✅ Data reloaded')
    } catch (err) {
      console.error('❌ Error deleting region:', err)
      console.error('❌ Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        full: err
      })
      toast.error(err instanceof Error ? err.message : 'Failed to delete region')
    } finally {
      setIsDeletingRegion(false)
    }
  }

  // Open rule creation modal
  const handleAddRule = () => {
    setIsRuleModalOpen(true)
  }

  // Open edit rule modal to add details (from rule header +)
  const handleAddDetailForRule = async (ruleId: string) => {
    const rule = allowanceRegionRules.find(r => r.id === ruleId)
    if (rule) {
      setSelectedRuleForEdit(rule)
      setIsEditRuleModalLoading(true)
      setIsEditRuleModalOpen(true)

      try {
        // Check if this rule is used in any expense transactions
        const usageInfo = await checkAllowanceRuleUsage(ruleId)
        setRuleUsageInfo(usageInfo)
      } catch (error) {
        console.error('Error checking rule usage:', error)
        // On error, show the form but with a warning
        setRuleUsageInfo({
          isUsed: true,
          usedIn: {
            expenseRuleAllowanceCodes: [],
            expensePlans: 0,
            expenseRequests: 0,
            expensePlanItems: 0,
            expenseItems: 0,
            expensePositions: 0
          },
          message: 'Unable to verify usage. Editing is restricted for safety.'
        })
      } finally {
        setIsEditRuleModalLoading(false)
      }
    }
  }

  // Handle saving the edited rule (with new details)
  const handleEditRuleModalSave = async (formData: any) => {
    setIsEditRuleModalLoading(true)
    try {
      const client = getExpenseSettingsClient()

      // Save the rule with updated details
      const ruleData = {
        id: selectedRuleForEdit?.id,
        version: selectedRuleForEdit?.version,
        code: formData.code.trim(),
        name: formData.name.trim(),
        activeFrom: formData.activeFrom ? `${formData.activeFrom}T00:00:00+00:00` : null,
        activeTo: formData.activeTo ? `${formData.activeTo}T00:00:00+00:00` : null,
        travelRegionSetRef: travelRegionSetId,
        ruleOrder: selectedRuleForEdit?.ruleOrder || 1,
        additionalProperties: selectedRuleForEdit?.additionalProperties || {},
        businessKey: formData.code.trim()
      }

      // Save the rule first
      await client.saveAllowanceRegionRule(ruleData)

      // Save each detail
      if (formData.details && formData.details.length > 0) {
        for (const detail of formData.details) {
          const detailPayload = {
            allowanceRegionRuleDetail: {
              ...(detail.id && { id: detail.id }),
              amount: detail.amounts?.[0] || 0,
              currencyRef: detail.currencyRef,
              activeFrom: detail.activeFrom ? `${detail.activeFrom}T00:00:00+00:00` : null,
              activeTo: detail.activeTo ? `${detail.activeTo}T00:00:00+00:00` : null,
              travelRegionRef: detail.travelRegionRef || detail.travelRegion,
              countryRef: detail.countryRef,
              home: detail.home || false,
              allowanceRegionRule: selectedRuleForEdit?.id
            },
            changeMode: detail.id ? 'UPDATE' : 'INSERT'
          }

          await client.post('/employee-expense/saveAllowanceRegionRuleDetail', detailPayload)
        }
      }

      toast.success('Rule and details saved successfully')

      // Close modal and reload data
      setIsEditRuleModalOpen(false)
      setSelectedRuleForEdit(null)
      setRuleUsageInfo(null)
      await loadData()
    } catch (err) {
      console.error('Error saving rule:', err)
      toast.error('Failed to save rule and details')
    } finally {
      setIsEditRuleModalLoading(false)
    }
  }

  // Handle cancel edit rule modal
  const handleEditRuleModalCancel = () => {
    setIsEditRuleModalOpen(false)
    setSelectedRuleForEdit(null)
    setRuleUsageInfo(null)
  }

  // Handle rule modal save
  const handleRuleModalSave = async (formData: any) => {
    setIsRuleModalLoading(true)
    try {
      // Create the allowance region rule using the form data
      const ruleData = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        description: `Allowance rule: ${formData.name.trim()}`,
        activeFrom: formData.activeFrom
          ? `${formData.activeFrom}T00:00:00+00:00`
          : `${dayjs().format('YYYY-MM-DD')}T00:00:00+00:00`,
        activeTo: formData.activeTo ? `${formData.activeTo}T00:00:00+00:00` : null,
        travelRegionSetRef: travelRegionSetId,
        ruleOrder: allowanceRegionRules.length + 1,
        additionalProperties: {},
        businessKey: formData.code.trim()
      }

      // Get a fresh client with current token
      const client = getExpenseSettingsClient()

      // Save the rule first
      const savedRule = await client.saveAllowanceRegionRule(ruleData)

      // Save each detail if provided
      if (formData.details && formData.details.length > 0) {
        for (const detail of formData.details) {
          const detailPayload = {
            allowanceRegionRuleDetail: {
              amount: detail.amounts?.[0] || 0,
              currencyRef: detail.currencyRef,
              activeFrom: detail.activeFrom ? `${detail.activeFrom}T00:00:00+00:00` : null,
              activeTo: detail.activeTo ? `${detail.activeTo}T00:00:00+00:00` : null,
              travelRegionRef: detail.travelRegionRef || detail.travelRegion,
              countryRef: detail.countryRef,
              home: detail.home || false,
              allowanceRegionRule: savedRule.allowanceRegionRule.id
            },
            changeMode: 'INSERT'
          }

          await client.post('/employee-expense/saveAllowanceRegionRuleDetail', detailPayload)
        }
      }

      // Reload data to show the new rule with details
      await loadData()
      setIsRuleModalOpen(false)
      toast.success('Allowance rule and details created successfully')
    } catch (err) {
      console.error('Error creating rule:', err)
      toast.error('Failed to create rule')
    } finally {
      setIsRuleModalLoading(false)
    }
  }

  // Handle rule modal cancel
  const handleRuleModalCancel = () => {
    setIsRuleModalOpen(false)
  }

  // Save all changes
  const handleSaveAll = async () => {
    // Prevent multiple simultaneous save operations
    if (isSaving) {
      return
    }

    setIsSaving(true)
    try {
      if (!accessToken) {
        throw new Error('Access token is missing')
      }

      // Only save cells that are modified/new and have an amount > 0
      const modifiedCells = editableCells.filter(
        cell => ((cell.isModified && !cell.isNew) || cell.isNew) && cell.amount > 0 // Only save cells with actual amounts
      )

      if (modifiedCells.length === 0) {
        toast.success('No changes to save')
        return
      }

      // Group modified cells by rule
      const cellsByRule = modifiedCells.reduce(
        (acc, cell) => {
          if (!acc[cell.allowanceRegionRuleId]) {
            acc[cell.allowanceRegionRuleId] = []
          }
          acc[cell.allowanceRegionRuleId].push(cell)
          return acc
        },
        {} as Record<string, EditableCell[]>
      )

      // Get a fresh client with current token
      const client = getExpenseSettingsClient()

      // Save details individually - this is the only reliable way for AllowanceRegionRuleDetail
      await Promise.all(
        Object.entries(cellsByRule).map(async ([ruleId, cells]) => {
          const rule = allowanceRegionRules.find(r => r.id === ruleId)
          if (!rule) {
            console.error(`❌ Rule not found for ID: ${ruleId}`)
            return
          }

          // Save each detail individually
          const results = await Promise.all(
            cells.map(async cell => {
              // Use stored refs or find them from catalogs
              const currency = currencies.find(c => c.code === cell.currencyCode)
              const currencyRef = cell.currencyRef || currency?.id

              // For countryRef: use stored value, or derive from travel region code
              let countryRef = cell.countryRef
              if (!countryRef && cell.travelRegionId) {
                // Try to extract country code from travel region ID (e.g., "TravelRegion:v1:DE-01" -> "Country:v1:DE")
                const regionParts = cell.travelRegionId.split(':')
                if (regionParts.length >= 3) {
                  const regionCode = regionParts[regionParts.length - 1]
                  // Extract first 2 chars as country code and ensure uppercase
                  const countryCode = regionCode.substring(0, 2).toUpperCase()
                  countryRef = `Country:v1:${countryCode}`
                }
              }

              // Validation: countryRef is required
              if (!countryRef) {
                console.error('❌ Missing countryRef for cell:', cell.travelRegionId)
                toast.error('Country reference is missing for some details')
                return null // Skip this cell
              }

              console.log('💾 Saving cell with countryRef:', countryRef, 'from region:', cell.travelRegionId)

              // Build the detail payload
              const detailPayload = {
                allowanceRegionRuleDetail: {
                  ...(cell.id && { id: cell.id }),
                  amount: cell.amount,
                  currencyRef: currencyRef,
                  activeFrom: cell.activeFrom,
                  activeTo: cell.activeTo || null, // Explicitly set to null if undefined
                  travelRegionRef: cell.travelRegionId,
                  countryRef: countryRef,
                  allowanceRegionRule: rule.id,
                  ...(cell.id && cell.version !== undefined && { version: cell.version })
                },
                changeMode: cell.id ? 'UPDATE' : 'INSERT'
              }

              console.log('📦 Saving detail:', detailPayload) // Debug log

              const result = await client.post('/employee-expense/saveAllowanceRegionRuleDetail', detailPayload)

              return result
            })
          )

          return results
        })
      )

      const newRecords = modifiedCells.filter(cell => !cell.id).length
      const updatedRecords = modifiedCells.filter(cell => cell.id).length

      let successMessage = 'All changes saved successfully'
      if (newRecords > 0 && updatedRecords > 0) {
        successMessage = `Saved ${newRecords} new records and updated ${updatedRecords} existing records`
      } else if (newRecords > 0) {
        successMessage = `Saved ${newRecords} new allowance records`
      } else if (updatedRecords > 0) {
        successMessage = `Updated ${updatedRecords} allowance records`
      }

      toast.success(successMessage)

      // Reload data to show updated values
      try {
        await loadData()
      } catch (reloadErr) {
        console.error('❌ Error reloading data after save:', reloadErr)
        toast.error('Changes saved but failed to reload data. Please refresh the page.')
      }
    } catch (err) {
      console.error('❌ Error saving changes:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save changes'
      toast.error(`Error: ${errorMessage}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Removed unused getCell and getCellIndex functions

  if (isLoading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:min-h-96"
        data-testid={`${prefixDataTestId}-loading-state`}
      >
        <div className="gba:text-muted-foreground">Loading enhanced matrix data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="gba:max-w-md gba:mx-auto" data-testid={`${prefixDataTestId}-error-state`}>
        <AlertDescription>
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <div className="gba:font-medium gba:mb-1">Error Loading Matrix Data</div>
              <div className="gba:text-sm">{error}</div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={loadData}
              data-testid={`${prefixDataTestId}-error-retry-button`}
            >
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div data-testid={`${prefixDataTestId}-travel-region-matrix-view`} className="gba:p-6">
      {/* Header */}
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4 gba:mb-4">
          <Button variant="ghost" onClick={onBack} data-testid={`${prefixDataTestId}-back-button`}>
            <PiArrowLeft className="gba:w-4 gba:h-4 gba:mr-2" />
            Back to Travel Region Sets
          </Button>
        </div>

        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">
              Travel Region Matrix: {travelRegionSetName}
            </h2>
            <p className="gba:text-muted-foreground">
              Excel-like editing - {totalRegions} regions × {allowanceRegionRules.length} rules
            </p>

            {/* Search Input */}
            <div className="gba:mt-3 gba:flex gba:items-center gba:gap-4">
              <Input
                type="text"
                placeholder="Search regions..."
                value={searchTerm}
                onChange={e => {
                  const value = e.target.value
                  setSearchTerm(value)
                  // Debounce search - search after 500ms of no typing
                  if (searchTimeoutRef.current) {
                    clearTimeout(searchTimeoutRef.current)
                  }
                  searchTimeoutRef.current = setTimeout(() => {
                    handleSearch(value)
                  }, 500)
                }}
                className="gba:w-80 gba:h-9"
                data-testid="travel-region-search-input"
              />
              {searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('')
                    handleSearch('')
                  }}
                  className="gba:h-9 gba:px-3"
                  data-testid="clear-search-button"
                >
                  Clear
                </Button>
              )}
              {isSearching && <div className="gba:text-sm gba:text-muted-foreground">Searching...</div>}

              {/* Show regions with details first checkbox */}
              <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
                <Checkbox
                  id="show-details-first"
                  checked={showRegionsWithDetailsFirst}
                  onCheckedChange={(checked: boolean) => setShowRegionsWithDetailsFirst(checked)}
                  data-testid="show-details-first-checkbox"
                />
                <Label
                  htmlFor="show-details-first"
                  className="gba:text-sm gba:text-muted-foreground gba:cursor-pointer"
                >
                  Show regions with details first
                </Label>
              </div>
            </div>
          </div>
          <div className="gba:flex gba:gap-3">
            {/* Always show Save button for testing */}
            <Button onClick={handleSaveAll} disabled={isSaving} variant="default" data-testid="save-all-changes-button">
              <PiFloppyDisk className="gba:w-4 gba:h-4 gba:mr-2" />
              {isSaving ? 'Saving...' : 'Save All Changes'}
            </Button>
          </div>
        </div>
      </div>

      {/* Excel-like Matrix Table */}
      {isLoadingRegions ? (
        <div
          className="gba:flex gba:justify-center gba:items-center gba:py-12 gba:bg-muted gba:rounded-lg"
          data-testid={`${prefixDataTestId}-loading-regions-state`}
        >
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:animate-spin gba:rounded-full gba:h-6 gba:w-6 gba:border-b-2 gba:border-primary"></div>
            <span className="gba:text-muted-foreground">Loading regions...</span>
          </div>
        </div>
      ) : editableTravelRegions.length > 0 ? (
        <div className="gba:border gba:rounded-lg gba:overflow-hidden">
          <div className="gba:overflow-x-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <Table className="gba:min-w-full" data-testid={`${prefixDataTestId}-matrix-table`}>
                <TableHeader>
                  {/* Main Header Row */}
                  <TableRow>
                    <TableHead className="gba:w-48 gba:min-w-48 gba:sticky gba:left-0 gba:bg-white gba:z-10 gba:border-r">
                      <span className="gba:font-semibold">Travel Regions</span>
                    </TableHead>
                    <SortableContext
                      items={allowanceRegionRules.map(r => r.id)}
                      strategy={horizontalListSortingStrategy}
                    >
                      {allowanceRegionRules.map(rule => (
                        <SortableColumnHeader key={rule.id} rule={rule} onAddDetailForRule={handleAddDetailForRule}>
                          <div className="gba:text-center">
                            <div className="gba:font-medium gba:text-sm">{rule.name}</div>
                            <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">{rule.code}</div>
                            <div className="gba:text-xs gba:text-muted-foreground">
                              {formatDate(rule.activeFrom)} - {rule.activeTo ? formatDate(rule.activeTo) : '∞'}
                            </div>
                          </div>
                        </SortableColumnHeader>
                      ))}
                    </SortableContext>
                    {/* Simple Add Column Header */}
                    <TableHead className="gba:w-16 gba:text-center gba:bg-muted">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleAddRule}
                        className="gba:h-8 gba:w-8 gba:p-0"
                        title="Add New Rule"
                        data-testid={`${prefixDataTestId}-rule-header-add-button`}
                      >
                        <PiPlus className="gba:w-4 gba:h-4" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Add Row - Simple plus button row */}
                  <TableRow className="gba:bg-muted gba:border-b-2">
                    <TableCell className="gba:sticky gba:left-0 gba:bg-muted gba:z-10 gba:border-r gba:text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleAddRegion}
                        className="gba:h-8 gba:w-8 gba:p-0"
                        title="Add New Travel Region"
                        data-testid={`${prefixDataTestId}-add-region-button`}
                      >
                        <PiPlus className="gba:w-4 gba:h-4" />
                      </Button>
                    </TableCell>
                    {allowanceRegionRules.map(rule => (
                      <TableCell
                        key={`add-row-${rule.id}`}
                        className="gba:bg-muted gba:text-center gba:text-muted-foreground"
                      >
                        —
                      </TableCell>
                    ))}
                    {/* Empty cell for add column */}
                    <TableCell className="gba:bg-muted"></TableCell>
                  </TableRow>

                  {/* No rules message */}
                  {allowanceRegionRules.length === 0 && sortedRegions.length > 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className="gba:bg-info-secondary gba:text-info-secondary-foreground gba:text-center gba:py-4"
                      >
                        <span className="gba:text-sm">
                          No allowance rules have been created for this travel region set. Click the + button above to
                          add a rule.
                        </span>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* No details message */}
                  {showRegionsWithDetailsFirst &&
                    !anyRegionHasDetails &&
                    sortedRegions.length > 0 &&
                    allowanceRegionRules.length > 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={allowanceRegionRules.length + 2}
                          className="gba:bg-warning-secondary gba:text-warning-secondary-foreground gba:text-center gba:py-4"
                        >
                          <span className="gba:text-sm">
                            No details have been created for any region. Regions are displayed alphabetically.
                          </span>
                        </TableCell>
                      </TableRow>
                    )}

                  {/* Data Rows - One row per region, columns show values based on rule periods */}
                  {paginatedRegions.map(region => (
                    <TableRow key={region.id}>
                      <TableCell className="gba:sticky gba:left-0 gba:bg-white gba:z-10 gba:border-r gba:w-48">
                        <div className="gba:p-3">
                          {/* Simple Region Info */}
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <PiMapPin className="gba:text-primary gba:w-5 gba:h-5" />
                            <div className="gba:flex-1">
                              {/* Read-only Code */}
                              <div className="gba:mb-1">
                                <div className="gba:text-xs gba:text-muted-foreground gba:px-1 gba:py-0.5">
                                  {region.code}
                                </div>
                              </div>
                              {/* Read-only Name */}
                              <div>
                                <div className="gba:font-medium gba:text-sm gba:px-1 gba:py-0.5">{region.value}</div>
                              </div>
                            </div>
                            {/* Delete button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => {
                                console.log('🗑️ Delete button clicked for region:', {
                                  id: region.id,
                                  code: region.code,
                                  value: region.value,
                                  hasDetails: regionHasSavedDetails(region.id)
                                })
                                handleDeleteRegionClick(region, e)
                              }}
                              className="gba:h-6 gba:w-6 gba:p-0 gba:text-destructive hover:gba:text-destructive hover:gba:bg-destructive-secondary"
                              title={
                                regionHasSavedDetails(region.id)
                                  ? 'Cannot delete - region has allowance details'
                                  : 'Delete travel region'
                              }
                              disabled={regionHasSavedDetails(region.id)}
                              data-testid={`${prefixDataTestId}-delete-region-button-${region.id}`}
                            >
                              <PiTrash className="gba:w-4 gba:h-4" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      {allowanceRegionRules.map(rule => {
                        // Find all cells for this rule and region (all validity periods)
                        const ruleCells = editableCells.filter(
                          c => c.allowanceRegionRuleId === rule.id && c.travelRegionId === region.id
                        )

                        return (
                          <TableCell
                            key={`${rule.id}-${region.id}`}
                            className="gba:text-center gba:relative gba:p-2 gba:align-top"
                          >
                            <div className="gba:space-y-2">
                              {/* Existing details */}
                              {ruleCells.map(cell => {
                                const isEditing = cell.isNew || editingCellId === cell.id
                                const isUsedInTransactions = editingCellUsageInfo?.isUsed && editingCellId === cell.id

                                return (
                                  <div
                                    key={cell.id || cell.validityPeriodId}
                                    className={`gba:border gba:rounded gba:p-2 gba:relative ${
                                      cell.isModified
                                        ? 'gba:bg-info-secondary gba:border-info'
                                        : isEditing
                                          ? 'gba:bg-accent gba:border-primary'
                                          : 'gba:bg-white gba:border-border gba:cursor-pointer hover:gba:bg-accent'
                                    }`}
                                    onClick={() => {
                                      if (!isEditing && cell.id) {
                                        handleEnterCellEdit(cell.id)
                                      }
                                    }}
                                  >
                                    {/* Modification Indicator */}
                                    {cell.isModified && (
                                      <div className="gba:absolute gba:top-1 gba:right-1">
                                        <div className="gba:w-2 gba:h-2 gba:bg-info gba:rounded-full"></div>
                                      </div>
                                    )}

                                    {/* Editable fields when editing or new */}
                                    {isEditing ? (
                                      <div className="gba:space-y-2">
                                        {/* Usage Warning */}
                                        {isUsedInTransactions && !cell.isNew && (
                                          <div className="gba:text-xs gba:text-warning gba:bg-warning-secondary gba:p-1 gba:rounded gba:mb-2">
                                            ⚠️ Used in transactions - only "To" date can be edited
                                          </div>
                                        )}

                                        {/* Loading indicator for usage check */}
                                        {isCheckingCellUsage && editingCellId === cell.id && (
                                          <div className="gba:text-xs gba:text-muted-foreground gba:text-center">
                                            Checking usage...
                                          </div>
                                        )}

                                        {/* Active From - disabled if used in transactions */}
                                        <div>
                                          <label className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1">
                                            From:
                                          </label>
                                          <DateInput
                                            value={cell.activeFrom ? dayjs(cell.activeFrom).format('YYYY-MM-DD') : ''}
                                            onChange={date => {
                                              const dateValue = date ? `${date}T00:00:00+00:00` : ''
                                              updateCellField(cell.id!, cell.validityPeriodId!, 'activeFrom', dateValue)
                                            }}
                                            disabled={isUsedInTransactions && !cell.isNew}
                                            data-testid={`${prefixDataTestId}-cell-active-from-${rule.id}-${region.id}`}
                                          />
                                        </div>

                                        {/* Active To - always editable */}
                                        <div>
                                          <label className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1">
                                            To:
                                          </label>
                                          <DateInput
                                            value={cell.activeTo ? dayjs(cell.activeTo).format('YYYY-MM-DD') : ''}
                                            onChange={date => {
                                              const dateValue = date ? `${date}T00:00:00+00:00` : undefined
                                              updateCellField(cell.id!, cell.validityPeriodId!, 'activeTo', dateValue)
                                            }}
                                            data-testid={`${prefixDataTestId}-cell-active-to-${rule.id}-${region.id}`}
                                          />
                                        </div>

                                        {/* Amount - disabled if used in transactions */}
                                        <div>
                                          <label className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1">
                                            Amount:
                                          </label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={cell.amount || ''}
                                            onChange={e => {
                                              const value = parseFloat(e.target.value) || 0
                                              updateCellField(cell.id!, cell.validityPeriodId!, 'amount', value)
                                            }}
                                            onClick={e => e.stopPropagation()}
                                            className="gba:w-full gba:h-7 gba:text-center gba:text-sm gba:font-semibold"
                                            placeholder="0.00"
                                            disabled={isUsedInTransactions && !cell.isNew}
                                            data-testid={`${prefixDataTestId}-cell-amount-${rule.id}-${region.id}`}
                                          />
                                        </div>

                                        {/* Currency - disabled if used in transactions */}
                                        <div>
                                          <label className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1">
                                            Currency:
                                          </label>
                                          <Select
                                            value={cell.currencyCode}
                                            onValueChange={value => {
                                              const selectedCurrency = currencies.find(c => c.code === value)
                                              // Update both currency code and ref
                                              setEditableCells(prev =>
                                                prev.map(c =>
                                                  c.id === cell.id || c.validityPeriodId === cell.validityPeriodId
                                                    ? {
                                                        ...c,
                                                        currencyCode: value,
                                                        currencyRef: selectedCurrency?.id,
                                                        isModified: true
                                                      }
                                                    : c
                                                )
                                              )
                                            }}
                                            disabled={isUsedInTransactions && !cell.isNew}
                                          >
                                            <SelectTrigger
                                              className="gba:w-full gba:h-7 gba:text-xs"
                                              onClick={e => e.stopPropagation()}
                                              data-testid={`${prefixDataTestId}-cell-currency-${rule.id}-${region.id}`}
                                            >
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {currencies.map(currency => (
                                                <SelectItem key={currency.id} value={currency.code}>
                                                  {currency.code} - {currency.value}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        {/* Country - disabled if used in transactions */}
                                        <div>
                                          <label className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1">
                                            Country:
                                          </label>
                                          <Select
                                            value={cell.countryRef}
                                            onValueChange={value => {
                                              // Update country ref
                                              setEditableCells(prev =>
                                                prev.map(c =>
                                                  c.id === cell.id || c.validityPeriodId === cell.validityPeriodId
                                                    ? {
                                                        ...c,
                                                        countryRef: value,
                                                        isModified: true
                                                      }
                                                    : c
                                                )
                                              )
                                            }}
                                            disabled={isUsedInTransactions && !cell.isNew}
                                          >
                                            <SelectTrigger
                                              className="gba:w-full gba:h-7 gba:text-xs"
                                              onClick={e => e.stopPropagation()}
                                              data-testid={`${prefixDataTestId}-cell-country-${rule.id}-${region.id}`}
                                            >
                                              <SelectValue placeholder="Select country" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {countries.map(country => (
                                                <SelectItem key={country.id} value={country.id}>
                                                  {country.code} - {country.value}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="gba:flex gba:gap-2 gba:mt-2">
                                          {cell.isNew ? (
                                            /* Cancel and Save buttons for new cells */
                                            <div className="gba:flex gba:gap-1 gba:w-full">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={e => {
                                                  e.stopPropagation()
                                                  handleRemoveNewCell(cell.validityPeriodId!, rule.id)
                                                }}
                                                className="gba:flex-1 gba:h-7 gba:text-xs"
                                                disabled={isSavingCell}
                                              >
                                                Cancel
                                              </Button>
                                              <Button
                                                variant="default"
                                                size="sm"
                                                onClick={e => {
                                                  e.stopPropagation()
                                                  handleSaveSingleCell(cell)
                                                }}
                                                className="gba:flex-1 gba:h-7 gba:text-xs"
                                                disabled={isSavingCell || cell.amount <= 0}
                                              >
                                                {isSavingCell ? 'Saving...' : 'Save'}
                                              </Button>
                                            </div>
                                          ) : (
                                            /* Done button for editing existing cells - saves immediately */
                                            <div className="gba:flex gba:gap-1">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={e => {
                                                  e.stopPropagation()
                                                  // Cancel - just close without saving
                                                  setEditingCellId(null)
                                                  setEditingCellUsageInfo(null)
                                                }}
                                                className="gba:flex-1 gba:h-7 gba:text-xs"
                                                disabled={isSavingCell}
                                              >
                                                Cancel
                                              </Button>
                                              <Button
                                                variant="default"
                                                size="sm"
                                                onClick={e => {
                                                  e.stopPropagation()
                                                  handleSaveSingleCell(cell)
                                                }}
                                                className="gba:flex-1 gba:h-7 gba:text-xs"
                                                disabled={isSavingCell || isCheckingCellUsage}
                                              >
                                                {isSavingCell ? 'Saving...' : 'Save'}
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        {/* Period Dates */}
                                        <div className="gba:text-xs gba:text-muted-foreground gba:mb-2 gba:text-center">
                                          {cell.activeFrom ? dayjs(cell.activeFrom).format('DD/MM/YY') : 'New'} -{' '}
                                          {cell.activeTo ? dayjs(cell.activeTo).format('DD/MM/YY') : '∞'}
                                        </div>

                                        {/* Amount Display */}
                                        <div className="gba:text-center gba:mb-2">
                                          <div className="gba:text-lg gba:font-semibold gba:text-foreground">
                                            {cell.amount.toFixed(2)}
                                          </div>
                                        </div>

                                        {/* Currency */}
                                        <div className="gba:text-xs gba:text-muted-foreground gba:text-center gba:font-medium">
                                          {cell.currencyCode}
                                        </div>

                                        {/* Click to edit hint */}
                                        <div className="gba:text-xs gba:text-muted-foreground gba:text-center gba:mt-1 gba:opacity-0 hover:gba:opacity-100">
                                          Click to edit
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )
                              })}

                              {/* Add new detail button - always visible */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Create a new cell for this rule-region combination
                                  const newPeriodId = `new-${rule.id}-${region.id}-${Date.now()}`
                                  const todayDate = `${dayjs().format('YYYY-MM-DD')}T00:00:00+00:00`

                                  // Create new period for this rule
                                  const newPeriod: ValidityPeriod = {
                                    id: newPeriodId,
                                    activeFrom: todayDate,
                                    activeTo: undefined,
                                    currencyCode: 'EUR',
                                    hasConflict: false,
                                    ruleId: rule.id
                                  }

                                  // Add period to the rule's validityPeriods
                                  setAllowanceRegionRules(prev =>
                                    prev.map(r =>
                                      r.id === rule.id
                                        ? { ...r, validityPeriods: [...r.validityPeriods, newPeriod] }
                                        : r
                                    )
                                  )

                                  // Derive countryRef from region.id
                                  const regionParts = region.id.split(':')
                                  const regionCode = regionParts.length >= 3 ? regionParts[regionParts.length - 1] : ''
                                  const countryCode = regionCode.substring(0, 2)
                                  const countryRef = countryCode ? `Country:v1:${countryCode}` : undefined

                                  // Find EUR currency ref
                                  const eurCurrency = currencies.find(c => c.code === 'EUR')

                                  // Create new cell
                                  const newCell: EditableCell = {
                                    id: undefined,
                                    travelRegionId: region.id,
                                    allowanceRegionRuleId: rule.id,
                                    amount: 0,
                                    currencyCode: 'EUR',
                                    currencyRef: eurCurrency?.id,
                                    countryRef: countryRef,
                                    activeFrom: todayDate,
                                    activeTo: undefined,
                                    isNew: true,
                                    isModified: false,
                                    hasError: false,
                                    validityPeriodId: newPeriodId
                                  }

                                  setEditableCells(prev => [...prev, newCell])
                                }}
                                className="gba:w-full gba:h-8 gba:text-muted-foreground hover:gba:text-foreground hover:gba:bg-accent gba:border gba:border-dashed"
                                title="Add new allowance detail"
                                data-testid={`${prefixDataTestId}-add-cell-${rule.id}-${region.id}`}
                              >
                                <PiPlus className="gba:w-4 gba:h-4 gba:mr-1" />
                                <span className="gba:text-xs">Add Detail</span>
                              </Button>
                            </div>
                          </TableCell>
                        )
                      })}
                      {/* Empty add column cell */}
                      <TableCell className="gba:w-16 gba:text-center gba:text-muted"></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DndContext>
          </div>
        </div>
      ) : (
        <div
          className="gba:text-center gba:py-12 gba:bg-muted gba:rounded-lg"
          data-testid={`${prefixDataTestId}-empty-state`}
        >
          <PiMapPin className="gba:w-12 gba:h-12 gba:text-muted-foreground gba:mx-auto gba:mb-4" />
          <h4 className="gba:text-lg gba:font-medium gba:text-foreground gba:mb-2">No Matrix Data Available</h4>
          <p className="gba:text-muted-foreground gba:mb-4">
            Create travel regions and allowance rules to build your matrix.
          </p>
          <div className="gba:flex gba:justify-center gba:gap-3">
            <Button
              variant="default"
              onClick={handleAddRegion}
              data-testid={`${prefixDataTestId}-empty-state-add-region-button`}
            >
              <PiPlus className="gba:w-4 gba:h-4 gba:mr-2" />
              Add Travel Region
            </Button>
            <Button
              variant="outline"
              onClick={handleAddRule}
              data-testid={`${prefixDataTestId}-empty-state-add-rule-button`}
            >
              <PiPlus className="gba:w-4 gba:h-4 gba:mr-2" />
              Add Rule
            </Button>
          </div>
        </div>
      )}

      {/* Pagination Controls - use sortedRegions length for total */}
      {!searchTerm && sortedRegions.length > 0 && (
        <MileageRulesPagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={sortedRegions.length}
          itemLabel="regions"
          onPageChange={async pagination => {
            const pageSizeChanged = pagination.pageSize !== pageSize
            setCurrentPage(pagination.current)
            setPageSize(pagination.pageSize)

            // If page size changed, reload with new page size from page 1
            if (pageSizeChanged) {
              setIsLoadingRegions(true)
              try {
                const paginatedRegions = await loadTravelRegions(1, pagination.pageSize, '')
                const regionsWithDetailsMap = new Map<string, TravelRegion>()
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

                // Map regions to EditableTravelRegion format
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

                // Generate cells for all rules and regions
                const cells = convertToEditableCells(allowanceRegionRules, uniqueRegionsForDisplay)
                const validatedCells = validateCurrencies(cells)
                setEditableCells(validatedCells)
              } catch (err) {
                console.error('Error loading regions with new page size:', err)
              } finally {
                setIsLoadingRegions(false)
              }
            } else {
              // Just change page with existing page size
              await handlePageChange(pagination.current)
            }
          }}
        />
      )}

      {/* Search Results Info */}
      {searchTerm && editableTravelRegions.length > 0 && (
        <div
          className="gba:flex gba:items-center gba:justify-center gba:mt-6 gba:px-4 gba:py-4 gba:bg-info-secondary gba:border gba:border-info gba:rounded-lg"
          data-testid={`${prefixDataTestId}-search-results-info`}
        >
          <span className="gba:text-sm gba:text-foreground">
            Showing {editableTravelRegions.length} search results for "{searchTerm}"
          </span>
        </div>
      )}

      {/* Rule Creation Modal */}
      <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
        <DialogContent
          className="gba:max-w-4xl gba:max-h-[90vh] gba:overflow-hidden gba:p-0"
          data-testid={`${prefixDataTestId}-rule-creation-modal`}
        >
          <DialogHeader className="gba:px-6 gba:pt-6 gba:pb-4">
            <DialogTitle>Create Allowance Region Rule</DialogTitle>
          </DialogHeader>
          <div className="gba:px-6 gba:pb-6 gba:overflow-y-auto gba:max-h-[calc(90vh-80px)]">
            <TravelRegionRuleForm
              accessToken={accessToken}
              travelRegionSetId={travelRegionSetId}
              onSave={handleRuleModalSave}
              onCancel={handleRuleModalCancel}
              loading={isRuleModalLoading}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Travel Region Creation Modal */}
      <TravelRegionForm
        accessToken={accessToken}
        open={isRegionModalOpen}
        onClose={handleRegionModalCancel}
        onSave={handleRegionModalSave}
        travelRegionSetId={travelRegionSetId}
        travelRegionSetName={travelRegionSetName}
        countries={countries}
        prefixDataTestId={prefixDataTestId}
      />

      {/* Delete Region Confirmation Dialog */}
      <Dialog
        open={deleteRegionConfirmation.isOpen}
        onOpenChange={() => setDeleteRegionConfirmation({ isOpen: false, region: null })}
      >
        <DialogContent data-testid={`${prefixDataTestId}-delete-region-confirmation-dialog`}>
          <DialogHeader>
            <DialogTitle>Delete Travel Region</DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-4">
            <p className="gba:text-sm gba:text-muted-foreground">
              Are you sure you want to delete the travel region{' '}
              <strong>{deleteRegionConfirmation.region?.value}</strong>?
            </p>
            {deleteRegionConfirmation.region &&
              editableCells.some(cell => cell.travelRegionId === deleteRegionConfirmation.region!.id && cell.id) && (
                <div className="gba:bg-destructive-secondary gba:text-destructive gba:p-3 gba:rounded gba:text-sm">
                  ⚠️ This region has{' '}
                  {
                    editableCells.filter(cell => cell.travelRegionId === deleteRegionConfirmation.region!.id && cell.id)
                      .length
                  }{' '}
                  allowance details. Cannot delete.
                </div>
              )}
            <div className="gba:flex gba:justify-end gba:gap-2">
              <Button
                variant="outline"
                onClick={handleDeleteRegionCancel}
                disabled={isDeletingRegion}
                data-testid={`${prefixDataTestId}-delete-region-cancel-button`}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteRegionConfirm}
                disabled={isDeletingRegion}
                data-testid={`${prefixDataTestId}-delete-region-confirm-button`}
              >
                {isDeletingRegion ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Rule Modal (for adding details to existing rule) */}
      <Dialog open={isEditRuleModalOpen} onOpenChange={setIsEditRuleModalOpen}>
        <DialogContent
          className="gba:max-w-4xl gba:max-h-[90vh] gba:overflow-hidden gba:p-0"
          data-testid={`${prefixDataTestId}-edit-rule-modal`}
        >
          <DialogHeader className="gba:px-6 gba:pt-6 gba:pb-4">
            <DialogTitle>Add Details to: {selectedRuleForEdit?.name || 'Rule'}</DialogTitle>
            <p className="gba:text-sm gba:text-muted-foreground">Add new allowance region details to this rule</p>
          </DialogHeader>
          <div className="gba:px-6 gba:pb-6 gba:overflow-y-auto gba:max-h-[calc(90vh-80px)]">
            {selectedRuleForEdit && (
              <TravelRegionRuleForm
                accessToken={accessToken}
                travelRegionSetId={travelRegionSetId}
                isEditing={false}
                initialData={{
                  // Don't pass ID - prevents fetching existing details from server
                  code: selectedRuleForEdit.code,
                  name: selectedRuleForEdit.name,
                  activeFrom: selectedRuleForEdit.activeFrom
                    ? dayjs(selectedRuleForEdit.activeFrom).format('YYYY-MM-DD')
                    : dayjs().format('YYYY-MM-DD'),
                  activeTo: selectedRuleForEdit.activeTo
                    ? dayjs(selectedRuleForEdit.activeTo).format('YYYY-MM-DD')
                    : '',
                  details: [] // Empty - only adding new details
                }}
                onSave={handleEditRuleModalSave}
                onCancel={handleEditRuleModalCancel}
                loading={isEditRuleModalLoading || isCheckingUsage}
                isUsedInTransactions={ruleUsageInfo?.isUsed || false}
                usageMessage={ruleUsageInfo?.message}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  )
}

export default TravelRegionMatrixView
