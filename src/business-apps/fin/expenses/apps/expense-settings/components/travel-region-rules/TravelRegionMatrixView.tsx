import React, { useState, useEffect, useCallback, useRef } from 'react'
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
  Toaster
} from '@newwork/nw-design-system'
import { toast } from 'sonner'
import { PiArrowLeft, PiPlus, PiMapPin, PiFloppyDisk, PiDotsSixVertical } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { ExpenseSettingsClient } from '../../utils/ExpenseSettingsClient'
import TravelRegionRuleForm from '../../forms/travel-region-rule-form/TravelRegionRuleForm'
import TravelRegionForm from '../../forms/travel-region-form/TravelRegionForm'
import { useGetAllowanceRegionRules, useGetTravelRegions } from '../../queries'
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
  onAddRule: () => void
  children: React.ReactNode
}> = ({ rule, onAddRule, children }) => {
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
            onClick={onAddRule}
            className="gba:h-6 gba:w-6 gba:p-0"
            title="Add New Rule"
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalRegions, setTotalRegions] = useState(0)
  const [isLoadingRegions, setIsLoadingRegions] = useState(false)

  // Search state
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const catalogClient = useCatalogManagerClient(accessToken)

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

  // Convert rule details to editable cells
  const convertToEditableCells = useCallback(
    (rules: EditableAllowanceRegionRule[], regions: TravelRegion[]): EditableCell[] => {
      const cells: EditableCell[] = []

      rules.forEach(rule => {
        regions.forEach(region => {
          // Find existing details for this rule-region combination
          const existingDetails = rule.details?.filter(detail => detail.travelRegion?.id === region.id) || []

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

      // Display only the paginated regions (sorted by GraphQL)
      setEditableTravelRegions(
        paginatedRegions.map(region => ({
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

        // Display only the paginated regions (sorted by GraphQL)
        setEditableTravelRegions(
          paginatedRegions.map(region => ({
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
        const allRegionsForCells = [...paginatedRegions, ...regionsWithDetails]
        const uniqueRegionsForCells = Array.from(new Map(allRegionsForCells.map(r => [r.id, r])).values())
        const cells = convertToEditableCells(allowanceRegionRules, uniqueRegionsForCells)
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

  // Handle inline cell editing
  const handleCellClick = (ruleId: string, regionId: string, periodId: string) => {
    // If cell doesn't exist in state yet, add it
    const existingCell = editableCells.find(
      c => c.allowanceRegionRuleId === ruleId && c.travelRegionId === regionId && c.validityPeriodId === periodId
    )

    if (!existingCell) {
      const rule = allowanceRegionRules.find(r => r.id === ruleId)
      const period = rule?.validityPeriods.find((p: ValidityPeriod) => p.id === periodId)

      if (rule && period) {
        const newCell: EditableCell = {
          id: undefined,
          allowanceRegionRuleId: ruleId,
          travelRegionId: regionId,
          amount: 0,
          currencyCode: period.currencyCode,
          activeFrom: period.activeFrom,
          activeTo: period.activeTo,
          isNew: true,
          isModified: false,
          hasError: false,
          validityPeriodId: periodId
        }

        setEditableCells(prev => [...prev, newCell])
      }
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
              const currency = currencies.find(c => c.code === cell.currencyCode)
              let countryRef = cell.travelRegionId

              // Extract country code from travelRegionRef
              if (countryRef && countryRef.includes(':')) {
                const countryCode = countryRef.split(':').pop()
                countryRef = `Country:v1:${countryCode}`
              }

              // Build the detail payload
              const detailPayload = {
                allowanceRegionRuleDetail: {
                  ...(cell.id && { id: cell.id }),
                  amount: cell.amount,
                  currencyRef: currency?.id,
                  activeFrom: cell.activeFrom,
                  activeTo: cell.activeTo || null, // Explicitly set to null if undefined
                  travelRegionRef: cell.travelRegionId,
                  countryRef: countryRef,
                  allowanceRegionRule: rule.id, // ✅ KEY FIX: Use "allowanceRegionRule" not "allowanceRegionRuleId"
                  ...(cell.id && { version: cell.version || undefined })
                },
                changeMode: cell.id ? 'UPDATE' : 'INSERT'
              }

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
            <div className="gba:mt-3 gba:flex gba:items-center gba:gap-2">
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
      ) : editableTravelRegions.length > 0 && allowanceRegionRules.length > 0 ? (
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
                        <SortableColumnHeader key={rule.id} rule={rule} onAddRule={handleAddRule}>
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

                  {/* Data Rows - One row per region, columns show values based on rule periods */}
                  {editableTravelRegions.map(region => (
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

                        // Only use actual validity periods from the rule (no defaults)
                        const periods = rule.validityPeriods

                        return (
                          <TableCell
                            key={`${rule.id}-${region.id}`}
                            className="gba:text-center gba:relative gba:p-2 gba:align-top"
                          >
                            {ruleCells.length > 0 ? (
                              <div className="gba:space-y-2">
                                {periods.map(period => {
                                  // Find cell for this specific period
                                  const cell = ruleCells.find(c => c.validityPeriodId === period.id)

                                  // Only render card if there's a cell with data
                                  if (!cell) return null

                                  return (
                                    <div
                                      key={period.id}
                                      className={`gba:border gba:rounded gba:p-2 gba:cursor-pointer hover:gba:bg-accent gba:relative ${
                                        cell?.isModified
                                          ? 'gba:bg-info-secondary gba:border-info'
                                          : 'gba:bg-white gba:border-border'
                                      }`}
                                      onClick={() => handleCellClick(rule.id, region.id, period.id)}
                                    >
                                      {/* Modification Indicator */}
                                      {cell?.isModified && (
                                        <div className="gba:absolute gba:top-1 gba:right-1">
                                          <div className="gba:w-2 gba:h-2 gba:bg-info gba:rounded-full"></div>
                                        </div>
                                      )}

                                      {/* Editable fields for new cells */}
                                      {cell.isNew ? (
                                        <div className="gba:space-y-2">
                                          {/* Active From */}
                                          <div>
                                            <label className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1">
                                              From:
                                            </label>
                                            <Input
                                              type="date"
                                              value={cell.activeFrom ? dayjs(cell.activeFrom).format('YYYY-MM-DD') : ''}
                                              onChange={e => {
                                                const dateValue = e.target.value
                                                  ? `${e.target.value}T00:00:00+00:00`
                                                  : ''
                                                setEditableCells(prev =>
                                                  prev.map(c =>
                                                    c.validityPeriodId === cell.validityPeriodId
                                                      ? { ...c, activeFrom: dateValue, isModified: true }
                                                      : c
                                                  )
                                                )
                                              }}
                                              className="gba:w-full gba:h-7 gba:text-xs"
                                              data-testid={`${prefixDataTestId}-cell-active-from-${rule.id}-${region.id}-${cell.validityPeriodId}`}
                                            />
                                          </div>

                                          {/* Active To */}
                                          <div>
                                            <label className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1">
                                              To:
                                            </label>
                                            <Input
                                              type="date"
                                              value={cell.activeTo ? dayjs(cell.activeTo).format('YYYY-MM-DD') : ''}
                                              onChange={e => {
                                                const dateValue = e.target.value
                                                  ? `${e.target.value}T00:00:00+00:00`
                                                  : undefined
                                                setEditableCells(prev =>
                                                  prev.map(c =>
                                                    c.validityPeriodId === cell.validityPeriodId
                                                      ? { ...c, activeTo: dateValue, isModified: true }
                                                      : c
                                                  )
                                                )
                                              }}
                                              className="gba:w-full gba:h-7 gba:text-xs"
                                              data-testid={`${prefixDataTestId}-cell-active-to-${rule.id}-${region.id}-${cell.validityPeriodId}`}
                                            />
                                          </div>

                                          {/* Amount */}
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
                                                    c.validityPeriodId === cell.validityPeriodId
                                                      ? { ...c, amount: value, isModified: true }
                                                      : c
                                                  )
                                                )
                                              }}
                                              className="gba:w-full gba:h-7 gba:text-center gba:text-sm gba:font-semibold"
                                              placeholder="0.00"
                                              data-testid={`${prefixDataTestId}-cell-amount-${rule.id}-${region.id}-${cell.validityPeriodId}`}
                                            />
                                          </div>

                                          {/* Currency */}
                                          <div>
                                            <label className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1">
                                              Currency:
                                            </label>
                                            <Select
                                              value={cell.currencyCode}
                                              onValueChange={value => {
                                                setEditableCells(prev =>
                                                  prev.map(c =>
                                                    c.validityPeriodId === cell.validityPeriodId
                                                      ? { ...c, currencyCode: value, isModified: true }
                                                      : c
                                                  )
                                                )
                                              }}
                                            >
                                              <SelectTrigger
                                                className="gba:w-full gba:h-7 gba:text-xs"
                                                data-testid={`${prefixDataTestId}-cell-currency-${rule.id}-${region.id}-${cell.validityPeriodId}`}
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
                                        </>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              /* No cells - Show "+" button to add new detail */
                              <div className="gba:text-center gba:py-4">
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

                                    // Create new cell
                                    const newCell: EditableCell = {
                                      id: undefined,
                                      travelRegionId: region.id,
                                      allowanceRegionRuleId: rule.id,
                                      amount: 0,
                                      currencyCode: 'EUR',
                                      activeFrom: todayDate,
                                      activeTo: undefined,
                                      isNew: true,
                                      isModified: false,
                                      hasError: false,
                                      validityPeriodId: newPeriodId
                                    }

                                    setEditableCells(prev => [...prev, newCell])
                                  }}
                                  className="gba:w-10 gba:h-10 gba:text-muted-foreground hover:gba:text-foreground hover:gba:bg-accent"
                                  title="Add new allowance detail"
                                  data-testid={`${prefixDataTestId}-add-cell-${rule.id}-${region.id}`}
                                >
                                  <PiPlus className="gba:w-5 gba:h-5" />
                                </Button>
                              </div>
                            )}
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
      {!searchTerm && totalRegions > 0 && allowanceRegionRules.length > 0 && (
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

                // Map regions to EditableTravelRegion format
                setEditableTravelRegions(
                  paginatedRegions.map(region => ({
                    ...region,
                    isEditing: false,
                    editingCode: region.code,
                    editingValue: region.value,
                    isModified: false,
                    isNew: false
                  }))
                )

                // Generate cells for all rules and regions
                const allRegionsForCells = [...paginatedRegions, ...regionsWithDetails]
                const uniqueRegionsForCells = Array.from(new Map(allRegionsForCells.map(r => [r.id, r])).values())
                const cells = convertToEditableCells(allowanceRegionRules, uniqueRegionsForCells)
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
      <Toaster />
    </div>
  )
}

export default TravelRegionMatrixView
