import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
import { ExpenseSettingsClient } from '../../utils/ExpenseSettingsClient'
import TravelRegionRuleForm from '../../forms/travel-region-rule-form/TravelRegionRuleForm'
import TravelRegionForm from '../../forms/travel-region-form/TravelRegionForm'
import { useAllowanceRuleUsageCheck } from '../../hooks'
import MileageRulesPagination from '../mileage-rules/MileageRulesPagination'
import {
  useMatrixDataLoaders,
  useMatrixCellEditing,
  useMatrixSaveHandlers,
  useMatrixPagination,
  useMatrixSearch,
  useMatrixSorting,
  useMatrixModals,
  useDetailUsageValidation
} from './hooks'
import {
  EditableCell,
  EditableTravelRegion,
  EditableAllowanceRegionRule,
  ValidityPeriod,
  CurrencyOption
} from './types'
import { formatDate, formatPeriodShort } from './utils/matrixFormatters'
import { convertToEditableCells, validateCurrencies } from './utils/matrixDataTransformers'
import { regionHasSavedDetails as checkRegionHasSavedDetails } from './utils/matrixValidation'
import dayjs from 'dayjs'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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
  onDeleteRule: (rule: EditableAllowanceRegionRule) => void
  children: React.ReactNode
}> = ({ rule, onAddDetailForRule, onDeleteRule, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const hasDetails = rule.details && rule.details.length > 0

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
          <div className="gba:flex gba:gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAddDetailForRule(rule.id)}
              className="gba:h-6 gba:w-6 gba:p-0"
              title="Add new detail for this rule"
            >
              <PiPlus className="gba:w-3 gba:h-3" />
            </Button>
            {!hasDetails && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDeleteRule(rule)}
                className="gba:h-6 gba:w-6 gba:p-0 gba:text-destructive hover:gba:text-destructive hover:gba:bg-destructive-secondary"
                title="Delete this rule"
              >
                <PiTrash className="gba:w-3 gba:h-3" />
              </Button>
            )}
          </div>
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
  // State
  const [editableTravelRegions, setEditableTravelRegions] = useState<EditableTravelRegion[]>([])
  const [allowanceRegionRules, setAllowanceRegionRules] = useState<EditableAllowanceRegionRule[]>([])
  const [editableCells, setEditableCells] = useState<EditableCell[]>([])
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([])
  const [countries, setCountries] = useState<CurrencyOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRegionsWithDetailsFirst, setShowRegionsWithDetailsFirst] = useState(true)
  const [ruleUsageInfo, setRuleUsageInfo] = useState<any>(null)

  const catalogClient = useCatalogManagerClient(accessToken)
  const { checkAllowanceRuleUsage, isChecking: isCheckingUsage } = useAllowanceRuleUsageCheck(accessToken)

  // Get expense settings client
  const getExpenseSettingsClient = useCallback(() => {
    const client = new ExpenseSettingsClient()
    if (accessToken) {
      client.setAccessToken(accessToken)
    }
    return client
  }, [accessToken])

  // Data loaders
  const {
    loadCurrencies,
    loadTravelRegions: loadTravelRegionsFromHook,
    loadAllowanceRegionRules
  } = useMatrixDataLoaders({ accessToken, travelRegionSetId })

  // Wrapper for loadTravelRegions
  const loadTravelRegions = useCallback(
    async (page: number, limit: number, search: string = '') => {
      try {
        const regions = await loadTravelRegionsFromHook(page, limit, search)
        return regions
      } catch (err) {
        console.error('Error loading travel regions:', err)
        return []
      }
    },
    [loadTravelRegionsFromHook]
  )

  // Load all data
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [allRegions, rulesData, currenciesData, countriesData] = await Promise.all([
        loadTravelRegions(1, 9999, ''),
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

      const allRegionsForCells = [...allRegions, ...regionsWithDetails]
      const uniqueRegionsForCells = Array.from(new Map(allRegionsForCells.map(r => [r.id, r])).values())
      const cells = convertToEditableCells(rules, uniqueRegionsForCells)
      const validatedCells = validateCurrencies(cells)
      setEditableCells(validatedCells)

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
  }, [loadTravelRegions, loadAllowanceRegionRules, loadCurrencies, catalogClient])

  useEffect(() => {
    if (accessToken && travelRegionSetId) {
      loadData()
    }
  }, [accessToken, travelRegionSetId, loadData])

  // Pagination
  const pagination = useMatrixPagination({
    loadTravelRegions,
    allowanceRegionRules,
    setEditableTravelRegions,
    convertToEditableCells,
    validateCurrencies,
    setEditableCells
  })

  // Search
  const search = useMatrixSearch({
    loadTravelRegions,
    pageSize: pagination.state.pageSize,
    allowanceRegionRules,
    setEditableTravelRegions,
    setEditableCells,
    convertToEditableCells,
    validateCurrencies,
    setCurrentPage: pagination.actions.setCurrentPage
  })

  // Sorting
  const sorting = useMatrixSorting({
    showRegionsWithDetailsFirst,
    editableTravelRegions,
    allowanceRegionRules,
    setAllowanceRegionRules,
    setEditableCells,
    convertToEditableCells,
    validateCurrencies,
    travelRegionSetId
  })

  // Detail usage validation
  const { checkDetailUsage } = useDetailUsageValidation({ accessToken })

  // Helper to check if a region has saved details
  const regionHasSavedDetails = useCallback(
    (regionId: string): boolean => {
      return checkRegionHasSavedDetails(regionId, allowanceRegionRules)
    },
    [allowanceRegionRules]
  )

  // Modals (with loadData now available)
  const modals = useMatrixModals({
    travelRegionSetId,
    allowanceRegionRules,
    getExpenseSettingsClient,
    loadData,
    handlePageChange: pagination.actions.handlePageChange,
    currentPage: pagination.state.currentPage,
    checkAllowanceRuleUsage,
    catalogClient,
    regionHasSavedDetails,
    setRuleUsageInfo
  })

  // Cell editing
  const cellEditing = useMatrixCellEditing({
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

  // Save handlers
  const { isSaving, handleSaveAll } = useMatrixSaveHandlers({
    accessToken,
    editableCells,
    allowanceRegionRules,
    currencies,
    loadData,
    getExpenseSettingsClient
  })

  // Delete rule handler
  const handleDeleteRule = useCallback(
    async (rule: EditableAllowanceRegionRule) => {
      if (rule.details && rule.details.length > 0) {
        toast.error('Cannot delete rule with existing details')
        return
      }

      if (!confirm(`Are you sure you want to delete the rule "${rule.name}"?`)) {
        return
      }

      try {
        const client = getExpenseSettingsClient()
        await client.deleteAllowanceRegionRule(rule.id, rule.version)
        toast.success('Rule deleted successfully')
        await loadData()
      } catch (err) {
        console.error('Error deleting rule:', err)
        toast.error('Failed to delete rule')
      }
    },
    [getExpenseSettingsClient, loadData]
  )

  // Client-side pagination
  const paginatedRegions = useMemo(() => {
    const { currentPage, pageSize } = pagination.state
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return sorting.state.sortedRegions.slice(startIndex, endIndex)
  }, [sorting.state.sortedRegions, pagination.state.currentPage, pagination.state.pageSize])

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
              Excel-like editing - {sorting.state.sortedRegions.length} regions × {allowanceRegionRules.length} rules
            </p>

            {/* Search Input */}
            <div className="gba:mt-3 gba:flex gba:items-center gba:gap-4">
              <Input
                type="text"
                placeholder="Search regions..."
                value={search.state.searchTerm}
                onChange={e => {
                  const value = e.target.value
                  search.actions.setSearchTerm(value)
                  if (search.searchTimeoutRef.current) {
                    clearTimeout(search.searchTimeoutRef.current)
                  }
                  search.searchTimeoutRef.current = setTimeout(() => {
                    search.actions.handleSearch(value)
                  }, 500)
                }}
                className="gba:w-80 gba:h-9"
                data-testid="travel-region-search-input"
              />
              {search.state.searchTerm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={search.actions.clearSearch}
                  className="gba:h-9 gba:px-3"
                  data-testid="clear-search-button"
                >
                  Clear
                </Button>
              )}
              {search.state.isSearching && <div className="gba:text-sm gba:text-muted-foreground">Searching...</div>}

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
            <Button onClick={handleSaveAll} disabled={isSaving} variant="default" data-testid="save-all-changes-button">
              <PiFloppyDisk className="gba:w-4 gba:h-4 gba:mr-2" />
              {isSaving ? 'Saving...' : 'Save All Changes'}
            </Button>
          </div>
        </div>
      </div>

      {/* Excel-like Matrix Table */}
      {pagination.state.isLoadingRegions ? (
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
            <DndContext
              sensors={sorting.state.sensors}
              collisionDetection={closestCenter}
              onDragEnd={sorting.actions.handleDragEnd}
            >
              <Table className="gba:min-w-full" data-testid={`${prefixDataTestId}-matrix-table`}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="gba:w-48 gba:min-w-48 gba:sticky gba:left-0 gba:bg-white gba:z-10 gba:border-r">
                      <span className="gba:font-semibold">Travel Regions</span>
                    </TableHead>
                    <SortableContext
                      items={allowanceRegionRules.map(r => r.id)}
                      strategy={horizontalListSortingStrategy}
                    >
                      {allowanceRegionRules.map(rule => (
                        <SortableColumnHeader
                          key={rule.id}
                          rule={rule}
                          onAddDetailForRule={modals.actions.handleAddDetailForRule}
                          onDeleteRule={handleDeleteRule}
                        >
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
                    <TableHead className="gba:w-16 gba:text-center gba:bg-muted">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={modals.actions.handleAddRule}
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
                  {/* Add Row */}
                  <TableRow className="gba:bg-muted gba:border-b-2">
                    <TableCell className="gba:sticky gba:left-0 gba:bg-muted gba:z-10 gba:border-r gba:text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={modals.actions.handleAddRegion}
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
                    <TableCell className="gba:bg-muted"></TableCell>
                  </TableRow>

                  {/* No rules message */}
                  {allowanceRegionRules.length === 0 && sorting.state.sortedRegions.length > 0 && (
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
                    !sorting.state.anyRegionHasDetails &&
                    sorting.state.sortedRegions.length > 0 &&
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

                  {/* Data Rows */}
                  {paginatedRegions.map(region => (
                    <TableRow key={region.id}>
                      <TableCell className="gba:sticky gba:left-0 gba:bg-white gba:z-10 gba:border-r gba:w-48">
                        <div className="gba:p-3">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <PiMapPin className="gba:text-primary gba:w-5 gba:h-5" />
                            <div className="gba:flex-1">
                              <div className="gba:mb-1">
                                <div className="gba:text-xs gba:text-muted-foreground gba:px-1 gba:py-0.5">
                                  {region.code}
                                </div>
                              </div>
                              <div>
                                <div className="gba:font-medium gba:text-sm gba:px-1 gba:py-0.5">{region.value}</div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => modals.actions.handleDeleteRegionClick(region, e)}
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
                                const isEditing = cell.isNew || cellEditing.editingCellId === cell.id
                                const isUsedInTransactions =
                                  cellEditing.editingCellUsageInfo?.isUsed && cellEditing.editingCellId === cell.id

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
                                        cellEditing.handleEnterCellEdit(cell.id)
                                      }
                                    }}
                                  >
                                    {cell.isModified && (
                                      <div className="gba:absolute gba:top-1 gba:right-1">
                                        <div className="gba:w-2 gba:h-2 gba:bg-info gba:rounded-full"></div>
                                      </div>
                                    )}

                                    {isEditing ? (
                                      <div className="gba:space-y-2">
                                        {isUsedInTransactions && !cell.isNew && (
                                          <div className="gba:text-xs gba:text-warning gba:bg-warning-secondary gba:p-1 gba:rounded gba:mb-2">
                                            ⚠️ Used in transactions - only "To" date can be edited
                                          </div>
                                        )}

                                        {cellEditing.isCheckingCellUsage && cellEditing.editingCellId === cell.id && (
                                          <div className="gba:text-xs gba:text-muted-foreground gba:text-center">
                                            Checking usage...
                                          </div>
                                        )}

                                        {/* Active From */}
                                        <div>
                                          <label className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1">
                                            From:
                                          </label>
                                          <DateInput
                                            value={cell.activeFrom ? dayjs(cell.activeFrom).format('YYYY-MM-DD') : ''}
                                            onChange={date => {
                                              const dateValue = date ? `${date}T00:00:00+00:00` : ''
                                              cellEditing.updateCellField(
                                                cell.id!,
                                                cell.validityPeriodId!,
                                                'activeFrom',
                                                dateValue
                                              )
                                            }}
                                            disabled={isUsedInTransactions && !cell.isNew}
                                            data-testid={`${prefixDataTestId}-cell-active-from-${rule.id}-${region.id}`}
                                          />
                                        </div>

                                        {/* Active To */}
                                        <div>
                                          <label className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1">
                                            To:
                                          </label>
                                          <DateInput
                                            value={cell.activeTo ? dayjs(cell.activeTo).format('YYYY-MM-DD') : ''}
                                            onChange={date => {
                                              const dateValue = date ? `${date}T00:00:00+00:00` : undefined
                                              cellEditing.updateCellField(
                                                cell.id!,
                                                cell.validityPeriodId!,
                                                'activeTo',
                                                dateValue
                                              )
                                            }}
                                            data-testid={`${prefixDataTestId}-cell-active-to-${rule.id}-${region.id}`}
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
                                              cellEditing.updateCellField(
                                                cell.id!,
                                                cell.validityPeriodId!,
                                                'amount',
                                                value
                                              )
                                            }}
                                            onClick={e => e.stopPropagation()}
                                            className="gba:w-full gba:h-7 gba:text-center gba:text-sm gba:font-semibold"
                                            placeholder="0.00"
                                            disabled={isUsedInTransactions && !cell.isNew}
                                            data-testid={`${prefixDataTestId}-cell-amount-${rule.id}-${region.id}`}
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

                                        {/* Country */}
                                        <div>
                                          <label className="gba:text-xs gba:text-muted-foreground gba:block gba:mb-1">
                                            Country:
                                          </label>
                                          <Select
                                            value={cell.countryRef}
                                            onValueChange={value => {
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
                                            <div className="gba:flex gba:gap-1 gba:w-full">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={e => {
                                                  e.stopPropagation()
                                                  cellEditing.handleRemoveNewCell(cell.validityPeriodId!, rule.id)
                                                }}
                                                className="gba:flex-1 gba:h-7 gba:text-xs"
                                                disabled={cellEditing.isSavingCell}
                                              >
                                                Cancel
                                              </Button>
                                              <Button
                                                variant="default"
                                                size="sm"
                                                onClick={e => {
                                                  e.stopPropagation()
                                                  cellEditing.handleSaveSingleCell(cell)
                                                }}
                                                className="gba:flex-1 gba:h-7 gba:text-xs"
                                                disabled={cellEditing.isSavingCell || cell.amount <= 0}
                                              >
                                                {cellEditing.isSavingCell ? 'Saving...' : 'Save'}
                                              </Button>
                                            </div>
                                          ) : (
                                            <div className="gba:flex gba:gap-1 gba:w-full">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={e => {
                                                  e.stopPropagation()
                                                  cellEditing.setEditingCellId(null)
                                                  cellEditing.setEditingCellUsageInfo(null)
                                                }}
                                                className="gba:flex-1 gba:h-7 gba:text-xs"
                                                disabled={cellEditing.isSavingCell}
                                              >
                                                Cancel
                                              </Button>
                                              <Button
                                                variant="default"
                                                size="sm"
                                                onClick={e => {
                                                  e.stopPropagation()
                                                  cellEditing.handleSaveSingleCell(cell)
                                                }}
                                                className="gba:flex-1 gba:h-7 gba:text-xs"
                                                disabled={cellEditing.isSavingCell || cellEditing.isCheckingCellUsage}
                                              >
                                                {cellEditing.isSavingCell ? 'Saving...' : 'Save'}
                                              </Button>
                                              {!cellEditing.editingCellUsageInfo?.isUsed && (
                                                <Button
                                                  variant="destructive"
                                                  size="sm"
                                                  onClick={async e => {
                                                    e.stopPropagation()
                                                    if (confirm('Are you sure you want to delete this detail?')) {
                                                      try {
                                                        const client = getExpenseSettingsClient()
                                                        await client.deleteAllowanceRegionRuleDetail({
                                                          id: cell.id!,
                                                          version: cell.version,
                                                          allowanceRegionRuleId: cell.allowanceRegionRuleId,
                                                          travelRegionRef: cell.travelRegionId,
                                                          currencyRef: cell.currencyRef,
                                                          countryRef: cell.countryRef,
                                                          amount: cell.amount,
                                                          activeFrom: cell.activeFrom,
                                                          activeTo: cell.activeTo
                                                        })
                                                        toast.success('Detail deleted successfully')
                                                        cellEditing.setEditingCellId(null)
                                                        cellEditing.setEditingCellUsageInfo(null)
                                                        await loadData()
                                                      } catch (err: any) {
                                                        console.error('Error deleting detail:', err)
                                                        const errorMsg =
                                                          err.response?.data?.message ||
                                                          err.message ||
                                                          'Failed to delete detail'
                                                        toast.error(`Failed to delete detail: ${errorMsg}`)
                                                      }
                                                    }
                                                  }}
                                                  className="gba:h-7 gba:px-2"
                                                  disabled={cellEditing.isSavingCell || cellEditing.isCheckingCellUsage}
                                                  title="Delete this detail"
                                                >
                                                  <PiTrash className="gba:w-4 gba:h-4" />
                                                </Button>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="gba:text-xs gba:text-muted-foreground gba:mb-2 gba:text-center">
                                          {formatPeriodShort(cell.activeFrom, cell.activeTo)}
                                        </div>
                                        <div className="gba:text-center gba:mb-2">
                                          <div className="gba:text-lg gba:font-semibold gba:text-foreground">
                                            {cell.amount.toFixed(2)}
                                          </div>
                                        </div>
                                        <div className="gba:text-xs gba:text-muted-foreground gba:text-center gba:font-medium">
                                          {cell.currencyCode}
                                        </div>
                                        <div className="gba:text-xs gba:text-muted-foreground gba:text-center gba:mt-1 gba:opacity-0 hover:gba:opacity-100">
                                          Click to edit
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )
                              })}

                              {/* Add new detail button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newPeriodId = `new-${rule.id}-${region.id}-${Date.now()}`
                                  const todayDate = `${dayjs().format('YYYY-MM-DD')}T00:00:00+00:00`

                                  const newPeriod: ValidityPeriod = {
                                    id: newPeriodId,
                                    activeFrom: todayDate,
                                    activeTo: undefined,
                                    currencyCode: 'EUR',
                                    hasConflict: false,
                                    ruleId: rule.id
                                  }

                                  setAllowanceRegionRules(prev =>
                                    prev.map(r =>
                                      r.id === rule.id
                                        ? { ...r, validityPeriods: [...r.validityPeriods, newPeriod] }
                                        : r
                                    )
                                  )

                                  const countryRef = region.objectValue?.destination_country_ref || undefined
                                  const eurCurrency = currencies.find(c => c.code === 'EUR')

                                  // Find existing cells for this rule to inherit dates
                                  const existingCellsForRule = editableCells.filter(
                                    c => c.allowanceRegionRuleId === rule.id && !c.isNew
                                  )

                                  // Determine activeFrom and activeTo
                                  let defaultActiveFrom: string
                                  let defaultActiveTo: string | undefined

                                  if (existingCellsForRule.length > 0) {
                                    // Prefer cells with both activeFrom and activeTo set
                                    const cellsWithDates = existingCellsForRule.filter(c => c.activeFrom && c.activeTo)
                                    const cellToInheritFrom =
                                      cellsWithDates.length > 0
                                        ? cellsWithDates[cellsWithDates.length - 1]
                                        : existingCellsForRule[existingCellsForRule.length - 1]

                                    defaultActiveFrom = cellToInheritFrom.activeFrom
                                    defaultActiveTo = cellToInheritFrom.activeTo

                                    console.log('🔄 Inheriting dates from existing cell:', {
                                      from: defaultActiveFrom,
                                      to: defaultActiveTo,
                                      sourceCell: cellToInheritFrom.id
                                    })
                                  } else {
                                    // Inherit from the rule itself
                                    defaultActiveFrom = rule.activeFrom
                                      ? dayjs(rule.activeFrom).format('YYYY-MM-DD')
                                      : todayDate
                                    defaultActiveTo = rule.activeTo
                                      ? dayjs(rule.activeTo).format('YYYY-MM-DD')
                                      : undefined

                                    console.log('🔄 Inheriting dates from rule:', {
                                      from: defaultActiveFrom,
                                      to: defaultActiveTo,
                                      ruleId: rule.id
                                    })
                                  }

                                  const newCell: EditableCell = {
                                    id: undefined,
                                    travelRegionId: region.id,
                                    allowanceRegionRuleId: rule.id,
                                    amount: 0,
                                    currencyCode: 'EUR',
                                    currencyRef: eurCurrency?.id,
                                    countryRef: countryRef,
                                    activeFrom: defaultActiveFrom,
                                    activeTo: defaultActiveTo,
                                    isNew: true,
                                    isModified: false,
                                    hasError: false,
                                    validityPeriodId: newPeriodId
                                  }

                                  console.log('➕ Creating new cell with dates:', {
                                    activeFrom: newCell.activeFrom,
                                    activeTo: newCell.activeTo
                                  })

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
              onClick={modals.actions.handleAddRegion}
              data-testid={`${prefixDataTestId}-empty-state-add-region-button`}
            >
              <PiPlus className="gba:w-4 gba:h-4 gba:mr-2" />
              Add Travel Region
            </Button>
            <Button
              variant="outline"
              onClick={modals.actions.handleAddRule}
              data-testid={`${prefixDataTestId}-empty-state-add-rule-button`}
            >
              <PiPlus className="gba:w-4 gba:h-4 gba:mr-2" />
              Add Rule
            </Button>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {!search.state.searchTerm && sorting.state.sortedRegions.length > 0 && (
        <MileageRulesPagination
          currentPage={pagination.state.currentPage}
          pageSize={pagination.state.pageSize}
          totalItems={sorting.state.sortedRegions.length}
          itemLabel="regions"
          onPageChange={async paginationData => {
            const pageSizeChanged = paginationData.pageSize !== pagination.state.pageSize
            if (pageSizeChanged) {
              await pagination.actions.handlePageSizeChange(paginationData.pageSize)
            } else {
              pagination.actions.setCurrentPage(paginationData.current)
            }
          }}
        />
      )}

      {/* Search Results Info */}
      {search.state.searchTerm && editableTravelRegions.length > 0 && (
        <div
          className="gba:flex gba:items-center gba:justify-center gba:mt-6 gba:px-4 gba:py-4 gba:bg-info-secondary gba:border gba:border-info gba:rounded-lg"
          data-testid={`${prefixDataTestId}-search-results-info`}
        >
          <span className="gba:text-sm gba:text-foreground">
            Showing {editableTravelRegions.length} search results for "{search.state.searchTerm}"
          </span>
        </div>
      )}

      {/* Rule Creation Modal */}
      <Dialog
        open={modals.state.isRuleModalOpen}
        onOpenChange={value => !value && modals.actions.handleRuleModalCancel()}
      >
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
              onSave={modals.actions.handleRuleModalSave}
              onCancel={modals.actions.handleRuleModalCancel}
              loading={modals.state.isRuleModalLoading}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Travel Region Creation Modal */}
      <TravelRegionForm
        accessToken={accessToken}
        open={modals.state.isRegionModalOpen}
        onClose={modals.actions.handleRegionModalCancel}
        onSave={modals.actions.handleRegionModalSave}
        travelRegionSetId={travelRegionSetId}
        travelRegionSetName={travelRegionSetName}
        countries={countries}
        prefixDataTestId={prefixDataTestId}
      />

      {/* Delete Region Confirmation Dialog */}
      <Dialog
        open={modals.state.deleteRegionConfirmation.isOpen}
        onOpenChange={() => modals.actions.handleDeleteRegionCancel()}
      >
        <DialogContent data-testid={`${prefixDataTestId}-delete-region-confirmation-dialog`}>
          <DialogHeader>
            <DialogTitle>Delete Travel Region</DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-4">
            <p className="gba:text-sm gba:text-muted-foreground">
              Are you sure you want to delete the travel region{' '}
              <strong>{modals.state.deleteRegionConfirmation.region?.value}</strong>?
            </p>
            {modals.state.deleteRegionConfirmation.region &&
              editableCells.some(
                cell => cell.travelRegionId === modals.state.deleteRegionConfirmation.region!.id && cell.id
              ) && (
                <div className="gba:bg-destructive-secondary gba:text-destructive gba:p-3 gba:rounded gba:text-sm">
                  ⚠️ This region has{' '}
                  {
                    editableCells.filter(
                      cell => cell.travelRegionId === modals.state.deleteRegionConfirmation.region!.id && cell.id
                    ).length
                  }{' '}
                  allowance details. Cannot delete.
                </div>
              )}
            <div className="gba:flex gba:justify-end gba:gap-2">
              <Button
                variant="outline"
                onClick={modals.actions.handleDeleteRegionCancel}
                disabled={modals.state.isDeletingRegion}
                data-testid={`${prefixDataTestId}-delete-region-cancel-button`}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={modals.actions.handleDeleteRegionConfirm}
                disabled={modals.state.isDeletingRegion}
                data-testid={`${prefixDataTestId}-delete-region-confirm-button`}
              >
                {modals.state.isDeletingRegion ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Rule Modal */}
      <Dialog
        open={modals.state.isEditRuleModalOpen}
        onOpenChange={value => !value && modals.actions.handleEditRuleModalCancel()}
      >
        <DialogContent
          className="gba:max-w-4xl gba:max-h-[90vh] gba:overflow-hidden gba:p-0"
          data-testid={`${prefixDataTestId}-edit-rule-modal`}
        >
          <DialogHeader className="gba:px-6 gba:pt-6 gba:pb-4">
            <DialogTitle>Add Details to: {modals.state.selectedRuleForEdit?.name || 'Rule'}</DialogTitle>
            <p className="gba:text-sm gba:text-muted-foreground">Add new allowance region details to this rule</p>
          </DialogHeader>
          <div className="gba:px-6 gba:pb-6 gba:overflow-y-auto gba:max-h-[calc(90vh-80px)]">
            {modals.state.selectedRuleForEdit && (
              <TravelRegionRuleForm
                accessToken={accessToken}
                travelRegionSetId={travelRegionSetId}
                isEditing={false}
                initialData={{
                  code: modals.state.selectedRuleForEdit.code,
                  name: modals.state.selectedRuleForEdit.name,
                  activeFrom: modals.state.selectedRuleForEdit.activeFrom
                    ? dayjs(modals.state.selectedRuleForEdit.activeFrom).format('YYYY-MM-DD')
                    : dayjs().format('YYYY-MM-DD'),
                  activeTo: modals.state.selectedRuleForEdit.activeTo
                    ? dayjs(modals.state.selectedRuleForEdit.activeTo).format('YYYY-MM-DD')
                    : '',
                  details: []
                }}
                onSave={modals.actions.handleEditRuleModalSave}
                onCancel={modals.actions.handleEditRuleModalCancel}
                loading={modals.state.isEditRuleModalLoading || isCheckingUsage}
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
