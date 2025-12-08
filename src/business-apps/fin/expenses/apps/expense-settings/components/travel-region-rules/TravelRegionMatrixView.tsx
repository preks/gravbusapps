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
import { PiArrowLeft, PiPlus, PiMapPin, PiFloppyDisk, PiDotsSixVertical } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { ExpenseSettingsClient } from '../../utils/ExpenseSettingsClient'
import TravelRegionRuleForm from '../../forms/travel-region-rule-form/TravelRegionRuleForm'
import TravelRegionForm from '../../forms/travel-region-form/TravelRegionForm'
import { useGetAllowanceRegionRules, useGetTravelRegions } from '../../queries'
import { useAllowanceRuleUsageCheck, UsageInfo } from '../../hooks'
import MileageRulesPagination from '../mileage-rules/MileageRulesPagination'
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

interface AllowanceRegionRule {
  id: string
  code: string
  name: string
  activeFrom: string
  activeTo?: string
  ruleOrder?: number
  version?: number
  travelRegionSetRef?: string
  additionalProperties?: Record<string, any>
  details: AllowanceRegionRuleDetail[]
}

interface AllowanceRegionRuleDetail {
  id: string
  amount: number
  activeFrom: string
  activeTo?: string
  version?: number
  countryRef?: string
  currencyRef?: string
  travelRegionRef?: string
  country?: {
    id: string
    code: string
    value: string
  }
  currency?: {
    id: string
    code: string
    value: string
  }
  travelRegion?: {
    id: string
    code: string
    value: string
  }
}

interface EditableCell {
  id?: string // detail ID for existing, undefined for new
  travelRegionId: string
  allowanceRegionRuleId: string
  amount: number
  currencyCode: string
  currencyRef?: string // Full currency catalog entry ID
  countryRef?: string // Full country catalog entry ID (required for API)
  activeFrom: string
  activeTo?: string
  version?: number // Version for optimistic locking
  isNew: boolean
  isModified: boolean
  hasError?: boolean
  errorMessage?: string
  // Additional fields for validation
  validityPeriodId?: string // To group cells with same validity period
}

interface EditableTravelRegion extends TravelRegion {
  isEditing: boolean
  editingCode: string
  editingValue: string
  isModified: boolean
  isNew: boolean
}

interface EditableAllowanceRegionRule extends AllowanceRegionRule {
  validityPeriods: ValidityPeriod[]
}

interface ValidityPeriod {
  id: string
  activeFrom: string
  activeTo?: string
  currencyCode: string
  hasConflict: boolean
  ruleId: string // Track which rule this period belongs to
}

interface CurrencyOption {
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

  // Track which cell is being edited (for existing cells)
  const [editingCellId, setEditingCellId] = useState<string | null>(null)
  const [editingCellUsageInfo, setEditingCellUsageInfo] = useState<UsageInfo | null>(null)
  const [isCheckingCellUsage, setIsCheckingCellUsage] = useState(false)
  const [isSavingCell, setIsSavingCell] = useState(false)

  const catalogClient = useCatalogManagerClient(accessToken)
  const graphqlClient = useGraphQLClient(accessToken)

  // Initialize query hooks
  const { fetchAllowanceRegionRules: fetchRulesQuery } = useGetAllowanceRegionRules({
    accessToken
  } as BusinessAppContextProps)
  const { fetchTravelRegionCount, fetchTravelRegions: fetchRegionsQuery } = useGetTravelRegions({
    accessToken
  } as BusinessAppContextProps)

  // Create a function to get a fresh client with current token
  const getExpenseSettingsClient = useCallback(() => {
    const client = new ExpenseSettingsClient()
    if (accessToken) {
      client.setAccessToken(accessToken)
    }
    return client
  }, [accessToken])

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

  // Load currencies from catalog
  const loadCurrencies = useCallback(async () => {
    try {
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'Currency', version: 'v1' },
        { limit: 100, offset: 0, returnTotalRecords: true }
      )
      setCurrencies(
        response.data.map((item: any) => ({
          id: item.id,
          code: item.code,
          value: item.value
        }))
      )
    } catch (err) {
      console.error('Error loading currencies:', err)
    }
  }, [catalogClient])

  // Load travel regions with pagination and search
  const loadTravelRegions = useCallback(
    async (page: number, limit: number, search: string = '') => {
      try {
        setIsLoadingRegions(true)
        const offset = (page - 1) * limit

        const [totalCount, regions] = await Promise.all([
          fetchTravelRegionCount(travelRegionSetId),
          fetchRegionsQuery({
            parentEntryId: travelRegionSetId,
            limit,
            offset,
            search
          })
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
    [fetchTravelRegionCount, fetchRegionsQuery, travelRegionSetId]
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

  // Load allowance region rules
  const loadAllowanceRegionRules = useCallback(async () => {
    try {
      // Use the query hook to fetch rules
      const result = await fetchRulesQuery({ travelRegionSetId })

      // Extract all unique travel regions that have details
      const regionsWithDetailsMap = new Map<string, TravelRegion>()
      result.AllowanceRegionRule.forEach((rule: any) => {
        rule.allowanceRegionRuleDetail?.forEach((detail: any) => {
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

      const rules: EditableAllowanceRegionRule[] = result.AllowanceRegionRule.map((rule: any) => {
        const details = rule.allowanceRegionRuleDetail.map((detail: any) => {
          return {
            ...detail,
            // Keep the travelRegion from GraphQL query (don't overwrite it!)
            travelRegion: detail.travelRegion
          }
        })

        // Extract validity periods from details
        const periodMap = new Map<string, ValidityPeriod>()

        details.forEach((detail: any) => {
          const periodKey = `${detail.activeFrom}-${detail.activeTo || 'null'}`
          if (!periodMap.has(periodKey)) {
            periodMap.set(periodKey, {
              id: periodKey,
              activeFrom: detail.activeFrom,
              activeTo: detail.activeTo,
              currencyCode: detail.currency?.code || 'EUR',
              hasConflict: false,
              ruleId: rule.id
            })
          } else {
            // Check for currency conflicts
            const existing = periodMap.get(periodKey)!
            if (existing.currencyCode !== (detail.currency?.code || 'EUR')) {
              existing.hasConflict = true
            }
          }
        })

        return {
          id: rule.id,
          code: rule.code,
          name: rule.name,
          activeFrom: rule.activeFrom,
          activeTo: rule.activeTo,
          ruleOrder: rule.ruleOrder,
          version: rule.version,
          details,
          validityPeriods: Array.from(periodMap.values())
        }
      })

      return { rules, regionsWithDetails }
    } catch (err) {
      console.error('Error loading allowance region rules:', err)
      return { rules: [], regionsWithDetails: [] }
    }
  }, [fetchRulesQuery, travelRegionSetId])

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
    if (!showRegionsWithDetailsFirst) {
      return editableTravelRegions
    }

    const regionsWithDetails = editableTravelRegions.filter(region => regionHasDetails(region, allowanceRegionRules))
    const regionsWithoutDetails = editableTravelRegions.filter(
      region => !regionHasDetails(region, allowanceRegionRules)
    )

    return [...regionsWithDetails, ...regionsWithoutDetails]
  }, [editableTravelRegions, allowanceRegionRules, showRegionsWithDetailsFirst, regionHasDetails])

  // Check if any region has details
  const anyRegionHasDetails = useMemo(() => {
    return editableTravelRegions.some(region => regionHasDetails(region, allowanceRegionRules))
  }, [editableTravelRegions, allowanceRegionRules, regionHasDetails])

  // Convert rule details to editable cells
  const convertToEditableCells = useCallback(
    (rules: EditableAllowanceRegionRule[], regions: TravelRegion[]): EditableCell[] => {
      const cells: EditableCell[] = []

      rules.forEach(rule => {
        regions.forEach(region => {
          // Extract country codes for matching (handles different travel region formats)
          const regionCountryCode = extractCountryCode(region.code)

          // Find existing details for this rule-region combination
          // Match by country code to handle different travel region set formats
          const existingDetails =
            rule.details?.filter(detail => {
              const detailCountryCode = extractCountryCode(detail.travelRegion?.code || '')
              return (
                detailCountryCode === regionCountryCode ||
                detail.travelRegion?.id === region.id ||
                detail.travelRegion?.value === region.value
              )
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
      const [paginatedRegions, rulesData] = await Promise.all([
        loadTravelRegions(currentPage, pageSize, ''), // No search for normal load
        loadAllowanceRegionRules(),
        loadCurrencies()
      ])

      const { rules, regionsWithDetails } = rulesData
      setAllowanceRegionRules(rules)

      // Generate cells for ALL rules and ALL regions (including those with details)
      // This ensures details are available for rendering even if region is on another page
      const allRegionsForCells = [...paginatedRegions, ...regionsWithDetails]
      const uniqueRegionsForCells = Array.from(new Map(allRegionsForCells.map(r => [r.id, r])).values())
      const cells = convertToEditableCells(rules, uniqueRegionsForCells)
      const validatedCells = validateCurrencies(cells)
      setEditableCells(validatedCells)

      // When "show regions with details first" is enabled, include regions with details
      // that might be on other pages, combined with paginated regions
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
  ])

  useEffect(() => {
    if (accessToken && travelRegionSetId) {
      loadData()
    }
  }, [accessToken, travelRegionSetId, loadData])

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
  const handleRegionModalSave = async (formData: any) => {
    try {
      // Create travel region via catalog API
      const regionData = {
        code: formData.code.trim(),
        value: formData.value.trim(),
        description: formData.description?.trim() || `Travel region: ${formData.value.trim()}`,
        parentEntryId: travelRegionSetId,
        translations: [
          {
            localeCode: 'en',
            value: formData.value.trim()
          }
        ]
      }

      await catalogClient.createCatalogEntry('TravelRegion', 'v1', regionData)

      // Reload current page to show the new region
      await handlePageChange(currentPage)
      setIsRegionModalOpen(false)
      toast.success('Travel region created successfully')
    } catch (err) {
      console.error('❌ Error creating region from modal:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create region'

      // Check if it's a duplicate code error
      if (errorMessage.includes('Duplicate catalog entry codes')) {
        toast.error('A region with this code already exists. Please try a different name.')
      } else {
        toast.error(errorMessage)
      }
    }
  }

  // Handle region modal cancel
  const handleRegionModalCancel = () => {
    setIsRegionModalOpen(false)
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
        activeFrom: formData.activeFrom || dayjs().format('YYYY-MM-DD'),
        activeTo: formData.activeTo || null,
        travelRegionSetRef: travelRegionSetId,
        ruleOrder: allowanceRegionRules.length + 1,
        additionalProperties: {},
        businessKey: formData.code.trim()
      }

      // Get a fresh client with current token
      const client = getExpenseSettingsClient()

      // Send the rule data directly (like AllowanceRegionRuleForm does)
      // The ExpenseSettingsClient will transform it to the proper API payload
      await client.saveAllowanceRegionRule(ruleData)

      // Reload data to show the new rule
      await loadData()
      setIsRuleModalOpen(false)
      toast.success('Allowance rule created successfully')
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

  // Enter edit mode for a cell - checks if THIS SPECIFIC DETAIL is used in transactions
  const handleEnterCellEdit = useCallback(
    async (cellId: string) => {
      setEditingCellId(cellId)

      // Find the cell to check if it's new or existing
      const cell = editableCells.find(c => c.id === cellId)

      // If the cell is new (no ID in database), it's never been used - skip validation
      if (!cell || cell.isNew || !cell.id) {
        setEditingCellUsageInfo({ isUsed: false, usedIn: {}, message: '' })
        return
      }

      setIsCheckingCellUsage(true)
      setEditingCellUsageInfo(null)

      try {
        // Check if THIS SPECIFIC DETAIL (not the rule) is used in transactions
        const detailUsage = await checkDetailUsage(cell.id)
        setEditingCellUsageInfo(detailUsage)
        if (detailUsage.isUsed) {
          toast.info(`This detail is used in transactions. Only "Valid To" can be edited.`)
        }
      } catch (error) {
        console.error('Error checking detail usage:', error)
        // Default to restricted mode for safety
        setEditingCellUsageInfo({
          isUsed: true,
          usedIn: {},
          message: 'Unable to verify usage. Editing restricted for safety.'
        })
      } finally {
        setIsCheckingCellUsage(false)
      }
    },
    [editableCells, checkDetailUsage]
  )

  // Save a single cell immediately
  const handleSaveSingleCell = async (cell: EditableCell) => {
    if (!accessToken) {
      toast.error('Access token is missing')
      return
    }

    // Validation: amount must be > 0
    if (cell.amount <= 0) {
      toast.error('Amount must be greater than 0')
      return
    }

    // Validation: activeFrom is required
    if (!cell.activeFrom) {
      toast.error('Valid From date is required')
      return
    }

    setIsSavingCell(true)
    try {
      const client = getExpenseSettingsClient()
      const rule = allowanceRegionRules.find(r => r.id === cell.allowanceRegionRuleId)

      if (!rule) {
        throw new Error('Rule not found')
      }

      // Validation: Detail validity must be within Rule validity
      const detailFrom = dayjs(cell.activeFrom)
      const detailTo = cell.activeTo ? dayjs(cell.activeTo) : null
      const ruleFrom = rule.activeFrom ? dayjs(rule.activeFrom) : null
      const ruleTo = rule.activeTo ? dayjs(rule.activeTo) : null

      // Check: Detail's activeFrom must be >= Rule's activeFrom
      if (ruleFrom && detailFrom.isBefore(ruleFrom)) {
        toast.error(
          `Detail's "Valid From" (${detailFrom.format('DD/MM/YYYY')}) cannot be before the rule's "Valid From" (${ruleFrom.format('DD/MM/YYYY')})`
        )
        setIsSavingCell(false)
        return
      }

      // Check: Detail's activeTo must be <= Rule's activeTo (if rule has an end date)
      if (ruleTo && detailTo && detailTo.isAfter(ruleTo)) {
        toast.error(
          `Detail's "Valid To" (${detailTo.format('DD/MM/YYYY')}) cannot be after the rule's "Valid To" (${ruleTo.format('DD/MM/YYYY')})`
        )
        setIsSavingCell(false)
        return
      }

      // Check: Detail's activeFrom must be <= Rule's activeTo (if rule has an end date)
      if (ruleTo && detailFrom.isAfter(ruleTo)) {
        toast.error(
          `Detail's "Valid From" (${detailFrom.format('DD/MM/YYYY')}) cannot be after the rule's "Valid To" (${ruleTo.format('DD/MM/YYYY')})`
        )
        setIsSavingCell(false)
        return
      }

      // Use stored refs or find them from catalogs
      const currency = currencies.find(c => c.code === cell.currencyCode)
      const currencyRef = cell.currencyRef || currency?.id

      // For countryRef: use stored value, or derive from travel region code
      let countryRef = cell.countryRef
      if (!countryRef && cell.travelRegionId) {
        const regionParts = cell.travelRegionId.split(':')
        if (regionParts.length >= 3) {
          const regionCode = regionParts[regionParts.length - 1]
          const countryCode = regionCode.substring(0, 2)
          countryRef = `Country:v1:${countryCode}`
        }
      }

      const detailPayload = {
        allowanceRegionRuleDetail: {
          ...(cell.id && { id: cell.id }),
          amount: cell.amount,
          currencyRef: currencyRef,
          activeFrom: cell.activeFrom,
          activeTo: cell.activeTo || null,
          travelRegionRef: cell.travelRegionId,
          countryRef: countryRef,
          allowanceRegionRule: rule.id,
          // Version is required for UPDATE - if missing, API will reject
          ...(cell.id && cell.version !== undefined && { version: cell.version })
        },
        changeMode: cell.id ? 'UPDATE' : 'INSERT'
      }

      console.log('📦 Saving detail payload:', JSON.stringify(detailPayload, null, 2))
      console.log('📦 Cell data:', {
        id: cell.id,
        version: cell.version, // Check if version exists
        travelRegionId: cell.travelRegionId,
        countryRef: cell.countryRef,
        currencyRef: cell.currencyRef,
        currencyCode: cell.currencyCode,
        activeFrom: cell.activeFrom,
        isNew: cell.isNew
      })

      await client.post('/employee-expense/saveAllowanceRegionRuleDetail', detailPayload)

      // Mark cell as saved (not modified anymore)
      setEditableCells(prev =>
        prev.map(c =>
          c.id === cell.id || c.validityPeriodId === cell.validityPeriodId
            ? { ...c, isModified: false, isNew: false }
            : c
        )
      )

      toast.success('Changes saved successfully')

      // Close edit mode
      setEditingCellId(null)
      setEditingCellUsageInfo(null)

      // Reload data to get updated versions
      await loadData(travelRegionSetId)
    } catch (error) {
      console.error('Error saving cell:', error)
      toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSavingCell(false)
    }
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
                // Try to extract country code from travel region ID (e.g., "TravelRegion:v1:DE" -> "DE")
                const regionParts = cell.travelRegionId.split(':')
                if (regionParts.length >= 3) {
                  const regionCode = regionParts[regionParts.length - 1]
                  // Extract first 2 chars as country code (e.g., "DE-DE-000" -> "DE", "DE" -> "DE")
                  const countryCode = regionCode.substring(0, 2)
                  countryRef = `Country:v1:${countryCode}`
                }
              }

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
                  {sortedRegions.map(region => (
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
                                              setEditableCells(prev =>
                                                prev.map(c =>
                                                  c.id === cell.id || c.validityPeriodId === cell.validityPeriodId
                                                    ? { ...c, activeFrom: dateValue, isModified: true }
                                                    : c
                                                )
                                              )
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
                                              setEditableCells(prev =>
                                                prev.map(c =>
                                                  c.id === cell.id || c.validityPeriodId === cell.validityPeriodId
                                                    ? { ...c, activeTo: dateValue, isModified: true }
                                                    : c
                                                )
                                              )
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
                                              setEditableCells(prev =>
                                                prev.map(c =>
                                                  c.id === cell.id || c.validityPeriodId === cell.validityPeriodId
                                                    ? { ...c, amount: value, isModified: true }
                                                    : c
                                                )
                                              )
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
                                                  // Remove the new cell from editableCells
                                                  setEditableCells(prev =>
                                                    prev.filter(c => c.validityPeriodId !== cell.validityPeriodId)
                                                  )
                                                  // Also remove the validity period from the rule
                                                  setAllowanceRegionRules(prev =>
                                                    prev.map(r =>
                                                      r.id === rule.id
                                                        ? {
                                                            ...r,
                                                            validityPeriods: r.validityPeriods.filter(
                                                              p => p.id !== cell.validityPeriodId
                                                            )
                                                          }
                                                        : r
                                                    )
                                                  )
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

      {/* Pagination Controls */}
      {!searchTerm && totalRegions > 0 && editableTravelRegions.length > 0 && (
        <MileageRulesPagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalRegions}
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
        prefixDataTestId={prefixDataTestId}
      />

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
