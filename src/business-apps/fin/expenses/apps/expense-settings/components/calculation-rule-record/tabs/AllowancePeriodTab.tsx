import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Spinner,
  Toaster,
  Switch as NWSwitch,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  DateInput
} from '@newwork/nw-design-system'
import { DeleteConfirmationDialog } from '../shared'
import {
  PiPlus,
  PiPencil,
  PiCalendar,
  PiClock,
  PiCheck,
  PiX,
  PiDotsThreeVertical,
  PiTrash,
  PiWarning
} from 'react-icons/pi'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

// Register dayjs plugins
dayjs.extend(weekday)
dayjs.extend(localeData)
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { expenseSettingsClient } from '../../../utils/ExpenseSettingsClient'
import { formatDateForInput, checkPeriodUniqueness, formatDate } from '../../../utils'
import { validateDateRange, applyDateValidationErrors, getValidityDatesFromExisting } from '../utils'
import { useTableSorting, createFieldMappings } from '../hooks'
import { UsageInfo } from '../../../types'

interface AllowancePeriodTabProps {
  ruleId: string
  accessToken: string
  activeFrom: string
  activeTo?: string
}

interface AllowancePeriod {
  id: string
  code: string
  name: string
  fromTime?: string
  toTime?: string
  minHours: number
  midnightRule: boolean
  overnightAccommodation?: boolean
  startAfter?: string
  returnBefore?: string
  validFrom: string
  validTo?: string
  order?: number
  version?: number
  isDeleted: boolean
}

interface AllowancePeriodFormData {
  id?: string
  code: string
  name: string
  fromTime?: string
  toTime?: string
  minHours: number
  midnightRule: boolean
  overnightAccommodation?: boolean
  startAfter?: string
  returnBefore?: string
  validFrom: string
  validTo?: string
  order?: number
  version?: number
}

const AllowancePeriodTab: React.FC<AllowancePeriodTabProps> = ({ ruleId, accessToken, activeFrom, activeTo }) => {
  const graphqlClient = useGraphQLClient(accessToken)

  // formatDateForInput is imported from shared utils

  const [allowancePeriods, setAllowancePeriods] = useState<AllowancePeriod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingItem, setEditingItem] = useState<AllowancePeriod | null>(null)

  // Memoize field mappings to prevent unnecessary recalculations
  const fieldMappings = useMemo(
    () => ({
      code: createFieldMappings.string((a: AllowancePeriod) => a.code),
      name: createFieldMappings.string((a: AllowancePeriod) => a.name),
      overnight: createFieldMappings.boolean((a: AllowancePeriod) => a.overnightAccommodation),
      fromTime: createFieldMappings.string((a: AllowancePeriod) => a.fromTime),
      toTime: createFieldMappings.string((a: AllowancePeriod) => a.toTime),
      minHours: createFieldMappings.number((a: AllowancePeriod) => a.minHours),
      midnightRule: createFieldMappings.boolean((a: AllowancePeriod) => a.midnightRule),
      startAfter: createFieldMappings.string((a: AllowancePeriod) => a.startAfter),
      periodOrder: createFieldMappings.number((a: AllowancePeriod) => a.order),
      returnBefore: createFieldMappings.string((a: AllowancePeriod) => a.returnBefore),
      activeFrom: createFieldMappings.date((a: AllowancePeriod) => a.validFrom),
      activeTo: createFieldMappings.date((a: AllowancePeriod) => a.validTo, '9999-12-31')
    }),
    []
  )

  // Sorting - using shared hook (single source of truth)
  const sorting = useTableSorting<AllowancePeriod>({
    defaultSortField: 'periodOrder',
    defaultSortOrder: 'ASC',
    data: allowancePeriods,
    fieldMappings
  })

  const form = useForm<AllowancePeriodFormData>({
    defaultValues: {
      code: '',
      name: '',
      minHours: 0,
      midnightRule: false,
      validFrom: formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD'),
      validTo: formatDateForInput(activeTo) || '9999-12-31'
    }
  })

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<AllowancePeriod | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Usage check state
  const [, setIsCheckingUsage] = useState(false)
  const [currentUsageInfo, setCurrentUsageInfo] = useState<UsageInfo | null>(null)
  const [isRestrictedEdit, setIsRestrictedEdit] = useState(false)

  // Pre-loaded usage status for all periods (period id -> isUsed)
  const [periodUsageMap, setPeriodUsageMap] = useState<Record<string, boolean>>({})

  // Set up client
  expenseSettingsClient.setAccessToken(accessToken)

  // Load usage status for all periods in a single batched query
  const loadPeriodUsageStatus = useCallback(
    async (periodIds: string[]) => {
      if (periodIds.length === 0) return

      try {
        // Check if periods are used in allowance setups (using correct field name: allowancePeriodId)
        const usageQuery = `
          query CheckAllowancePeriodsUsage($periodIds: [uuid!]!) {
            ExpenseRuleAllowanceSetup(where: { 
              allowancePeriodId: { _in: $periodIds },
              isDeleted: { _eq: false }
            }) {
              id
              allowancePeriodId
            }
          }
        `

        const result = await graphqlClient.request<{
          ExpenseRuleAllowanceSetup: { id: string; allowancePeriodId: string }[]
        }>(usageQuery, { periodIds })

        const usageMap: Record<string, boolean> = {}
        periodIds.forEach(id => {
          const setupUsage = result.ExpenseRuleAllowanceSetup?.filter(s => s.allowancePeriodId === id) || []
          usageMap[id] = setupUsage.length > 0
        })
        setPeriodUsageMap(usageMap)
      } catch (err) {
        console.error('Error loading period usage status:', err)
        // Default to allowing operations if we can't check
        const emptyMap: Record<string, boolean> = {}
        periodIds.forEach(id => {
          emptyMap[id] = false
        })
        setPeriodUsageMap(emptyMap)
      }
    },
    [graphqlClient]
  )

  // Check detailed usage for a single period
  const checkAllowancePeriodUsage = useCallback(
    async (periodId: string): Promise<UsageInfo> => {
      try {
        // Only check ExpenseRuleAllowanceSetup - using correct field name: allowancePeriodId
        const query = `
          query CheckAllowancePeriodUsage($periodId: uuid!) {
            setupCount: ExpenseRuleAllowanceSetupAggregate(where: { 
              allowancePeriodId: { _eq: $periodId },
              isDeleted: { _eq: false }
            }) {
              aggregate { count }
            }
          }
        `

        const result = await graphqlClient.request<{
          setupCount: { aggregate: { count: number } }
        }>(query, { periodId })

        const setups = result.setupCount?.aggregate?.count || 0
        const isUsed = setups > 0

        const usageDetails: string[] = []
        if (setups > 0) usageDetails.push(`${setups} allowance setup(s)`)

        return {
          isUsed,
          usedIn: { setups },
          message: isUsed
            ? `This allowance period is used in ${usageDetails.join(' and ')}. Only the Valid To field can be modified.`
            : ''
        }
      } catch (err) {
        console.error('Error checking allowance period usage:', err)
        return { isUsed: false, usedIn: {}, message: '' }
      }
    },
    [graphqlClient]
  )

  const fetchAllowancePeriods = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const query = `
        query GetExpenseRuleAllowancePeriods($ruleId: uuid!) {
          ExpenseRule(where: { id: { _eq: $ruleId } }) {
            id
            code
            name
            expenseRuleAllowancePeriod(where: { isDeleted: { _eq: false } }, orderBy: { periodOrder: ASC }) {
              id
              code
              name
              fromTime
              toTime
              minHours
              midnightRule
              activeFrom
              activeTo
              periodOrder
              version
              additionalProperties
              businessKey
            }
          }
        }
      `

      const result = await graphqlClient.request<{ ExpenseRule: { expenseRuleAllowancePeriod: any[] }[] }>(query, {
        ruleId
      })

      const expenseRule = result.ExpenseRule?.[0]
      const periods = expenseRule?.expenseRuleAllowancePeriod || []

      const transformedPeriods: AllowancePeriod[] = periods.map((period, index) => ({
        id: period.id,
        code: period.code || '',
        name: period.name || '',
        fromTime: period.fromTime || '',
        toTime: period.toTime || '',
        minHours: period.minHours || 0,
        midnightRule: period.midnightRule || false,
        overnightAccommodation: false, // TODO: Map from additionalProperties if available
        startAfter: '', // TODO: Map from additionalProperties if available
        returnBefore: '', // TODO: Map from additionalProperties if available
        validFrom: period.activeFrom,
        validTo: period.activeTo,
        order: period.periodOrder || index + 1,
        version: period.version,
        isDeleted: false
      }))

      setAllowancePeriods(transformedPeriods)

      // Load usage status for all periods
      if (transformedPeriods.length > 0) {
        await loadPeriodUsageStatus(transformedPeriods.map(p => p.id))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load allowance periods')
    } finally {
      setIsLoading(false)
    }
  }, [ruleId, graphqlClient, loadPeriodUsageStatus])

  // Sorted data is provided by useTableSorting hook (single source of truth)
  const sortedAllowancePeriods = sorting.sortedData || allowancePeriods

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchAllowancePeriods()
    }
  }, [ruleId, accessToken, fetchAllowancePeriods])

  const handleAdd = () => {
    setEditingItem(null)
    setIsRestrictedEdit(false)
    setCurrentUsageInfo(null)

    // Get validity dates using shared utility (copies from first existing entry if available)
    const { validFrom, validTo } = getValidityDatesFromExisting(allowancePeriods, activeFrom, activeTo)

    form.reset({
      code: '',
      name: '',
      minHours: 0,
      midnightRule: false,
      overnightAccommodation: false,
      validFrom,
      validTo,
      order: allowancePeriods.length + 1
    })
    setIsModalVisible(true)
  }

  const handleEdit = async (record: AllowancePeriod) => {
    setIsCheckingUsage(true)

    // Check if period is used
    const usageInfo = await checkAllowancePeriodUsage(record.id)
    setCurrentUsageInfo(usageInfo)
    setIsRestrictedEdit(usageInfo.isUsed)

    form.reset({
      id: record.id,
      code: record.code,
      name: record.name,
      fromTime: record.fromTime,
      toTime: record.toTime,
      minHours: record.minHours,
      midnightRule: record.midnightRule,
      overnightAccommodation: record.overnightAccommodation,
      startAfter: record.startAfter,
      returnBefore: record.returnBefore,
      validFrom: formatDateForInput(record.validFrom) || formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD'),
      validTo: formatDateForInput(record.validTo),
      order: record.order,
      version: record.version
    })

    setEditingItem(record)
    setIsCheckingUsage(false)
    setIsModalVisible(true)
  }

  const handleDeleteClick = (record: AllowancePeriod) => {
    setItemToDelete(record)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return

    setIsDeleting(true)
    try {
      await expenseSettingsClient.saveExpenseRuleAllowancePeriod({
        id: itemToDelete.id,
        version: itemToDelete.version,
        expenseRuleId: ruleId,
        code: itemToDelete.code,
        name: itemToDelete.name,
        activeFrom: itemToDelete.validFrom,
        isDeleted: true
      })

      toast.success('Allowance period deleted successfully')
      setDeleteDialogOpen(false)
      setItemToDelete(null)
      await fetchAllowancePeriods()
    } catch (err) {
      toast.error('Failed to delete allowance period')
      console.error('Delete error:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  // Check if code is unique within the validity period
  const checkCodeUniqueness = useCallback(
    async (code: string, activeFrom: string, activeTo: string | undefined, excludeId?: string): Promise<boolean> => {
      try {
        // Fetch all matching codes and check overlap in JavaScript to avoid GraphQL schema limitations
        const query = `
          query CheckAllowancePeriodCodeUniqueness($ruleId: uuid!, $code: String!, $excludeId: uuid) {
            ExpenseRuleAllowancePeriod(
              where: {
                expenseRuleId: { _eq: $ruleId }
                code: { _eq: $code }
                isDeleted: { _eq: false }
                id: { _neq: $excludeId }
              }
            ) {
              id
              code
              activeFrom
              activeTo
            }
          }
        `

        const variables = {
          ruleId,
          code,
          excludeId: excludeId || null
        }

        const result = await graphqlClient.request<{
          ExpenseRuleAllowancePeriod: { id: string; code: string; activeFrom: string; activeTo?: string }[]
        }>(query, variables)

        // Check for overlapping periods using shared utility
        const uniquenessResult = checkPeriodUniqueness({
          ruleId,
          excludeId,
          newPeriod: { activeFrom, activeTo },
          existingPeriods: result.ExpenseRuleAllowancePeriod,
          componentName: 'AllowancePeriodTab',
          entityName: 'ExpenseRuleAllowancePeriod'
        })

        return uniquenessResult.isDuplicate
      } catch (error) {
        console.error('[AllowancePeriodTab] Error checking code uniqueness:', {
          error,
          code,
          activeFrom,
          activeTo,
          excludeId,
          ruleId,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined
        })
        // On error, block the save to prevent duplicates from being created
        return true // Block save on error
      }
    },
    [ruleId, graphqlClient]
  )

  const handleSave = async () => {
    // Trigger form validation
    const isValid = await form.trigger()
    if (!isValid) {
      return
    }

    const formData = form.getValues()

    try {
      setIsSaving(true)

      // Check code uniqueness within overlapping validity periods
      const codeExists = await checkCodeUniqueness(formData.code, formData.validFrom, formData.validTo, editingItem?.id)

      if (codeExists) {
        form.setError('code', {
          type: 'manual',
          message:
            'This code already exists with an overlapping validity period. Please use a different code or adjust the validity dates.'
        })
        setIsSaving(false)
        return
      }

      // Date validation using shared utility
      const dateErrors = validateDateRange({
        entryFrom: formData.validFrom,
        entryTo: formData.validTo,
        ruleFrom: activeFrom,
        ruleTo: activeTo
      })

      if (applyDateValidationErrors(dateErrors, form.setError)) {
        setIsSaving(false)
        return
      }

      // IMPORTANT: Always use editingItem for id and version when updating
      const isUpdate = !!editingItem

      // If restricted edit, only update validTo
      if (isRestrictedEdit && editingItem) {
        await expenseSettingsClient.saveExpenseRuleAllowancePeriod({
          id: editingItem.id,
          version: editingItem.version,
          expenseRuleId: ruleId,
          code: editingItem.code,
          name: editingItem.name,
          activeFrom: editingItem.validFrom ? dayjs(editingItem.validFrom).startOf('day').toISOString() : null,
          activeTo: formData.validTo ? dayjs(formData.validTo).endOf('day').toISOString() : null,
          fromTime: editingItem.fromTime,
          toTime: editingItem.toTime,
          minHours: editingItem.minHours,
          midnightRule: editingItem.midnightRule,
          periodOrder: editingItem.order
        })
      } else {
        // Full save
        await expenseSettingsClient.saveExpenseRuleAllowancePeriod({
          ...(isUpdate && { id: editingItem.id, version: editingItem.version }),
          expenseRuleId: ruleId,
          businessKey: undefined,
          activeTo: formData.validTo ? dayjs(formData.validTo).endOf('day').toISOString() : null,
          additionalProperties: undefined,
          code: formData.code,
          name: formData.name,
          overnightAccomodation: formData.overnightAccommodation,
          fromTime: formData.fromTime,
          toTime: formData.toTime,
          minHours: formData.minHours,
          midnightRule: formData.midnightRule,
          startAfter: formData.startAfter,
          returnBefore: formData.returnBefore,
          activeFrom: formData.validFrom ? dayjs(formData.validFrom).startOf('day').toISOString() : null,
          periodOrder: formData.order
        })
      }

      toast.success(`Allowance period ${editingItem ? 'updated' : 'created'} successfully`)
      setIsModalVisible(false)
      await fetchAllowancePeriods()
    } catch (err) {
      toast.error(`Failed to ${editingItem ? 'update' : 'create'} allowance period`)
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Removed Ant Design columns definition - using NW design system Table now

  if (isLoading) {
    return (
      <div
        data-testid="allowance-period-tab-loading"
        className="gba:flex gba:justify-center gba:items-center gba:min-h-64"
      >
        <Spinner className="gba:w-8 gba:h-8" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="allowance-period-tab-error">
        <AlertDescription>
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
            <div>
              <div className="gba:font-semibold gba:mb-1">Error Loading Allowance Periods</div>
              <div className="gba:text-sm">{error}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAllowancePeriods}
              data-testid="allowance-period-retry-button"
            >
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div data-testid="allowance-period-tab">
      <Toaster />

      <Card data-testid="allowance-period-card">
        <CardHeader data-testid="allowance-period-card-header">
          <div className="gba:flex gba:justify-between gba:items-center">
            <div className="gba:flex gba:items-center gba:gap-2">
              <CardTitle data-testid="allowance-period-card-title">Allowance Periods</CardTitle>
              <Badge variant="default" data-testid="allowance-period-count-badge">
                {allowancePeriods.length} periods
              </Badge>
            </div>
            <Button onClick={handleAdd} data-testid="create-allowance-period-button">
              <PiPlus className="gba:mr-2" />
              Create Allowance Period
            </Button>
          </div>
        </CardHeader>

        <CardContent data-testid="allowance-period-card-content">
          {sortedAllowancePeriods.length > 0 ? (
            <div className="gba:overflow-x-auto">
              <Table data-testid="allowance-periods-table">
                <TableHeader data-testid="allowance-periods-table-header">
                  <TableRow data-testid="allowance-periods-table-header-row">
                    <TableHead className="gba:w-[60px]" data-testid="allowance-periods-table-header-actions">
                      ACTIONS
                    </TableHead>
                    <TableHead
                      className="gba:w-[150px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                      onClick={() => sorting.handleSort('code')}
                      data-testid="allowance-periods-table-header-code"
                    >
                      <div className="gba:flex gba:items-center">
                        CODE
                        {sorting.renderSortIcon('code')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[180px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                      onClick={() => sorting.handleSort('name')}
                      data-testid="allowance-periods-table-header-name"
                    >
                      <div className="gba:flex gba:items-center">
                        NAME
                        {sorting.renderSortIcon('name')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[180px] gba:text-center gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                      onClick={() => sorting.handleSort('overnight')}
                      data-testid="allowance-periods-table-header-overnight"
                    >
                      <div className="gba:flex gba:items-center gba:justify-center">
                        OVERNIGHT
                        {sorting.renderSortIcon('overnight')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[100px] gba:text-center gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                      onClick={() => sorting.handleSort('fromTime')}
                      data-testid="allowance-periods-table-header-from-time"
                    >
                      <div className="gba:flex gba:items-center gba:justify-center">
                        TIME FROM
                        {sorting.renderSortIcon('fromTime')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[100px] gba:text-center gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                      onClick={() => sorting.handleSort('toTime')}
                      data-testid="allowance-periods-table-header-to-time"
                    >
                      <div className="gba:flex gba:items-center gba:justify-center">
                        TIME TO
                        {sorting.renderSortIcon('toTime')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[120px] gba:text-center gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                      onClick={() => sorting.handleSort('minHours')}
                      data-testid="allowance-periods-table-header-min-hours"
                    >
                      <div className="gba:flex gba:items-center gba:justify-center">
                        MIN HOURS
                        {sorting.renderSortIcon('minHours')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[120px] gba:text-center gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                      onClick={() => sorting.handleSort('midnightRule')}
                      data-testid="allowance-periods-table-header-midnight"
                    >
                      <div className="gba:flex gba:items-center gba:justify-center">
                        MIDNIGHT RULE
                        {sorting.renderSortIcon('midnightRule')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[100px] gba:text-center gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                      onClick={() => sorting.handleSort('startAfter')}
                      data-testid="allowance-periods-table-header-start-after"
                    >
                      <div className="gba:flex gba:items-center gba:justify-center">
                        START AFTER
                        {sorting.renderSortIcon('startAfter')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[120px] gba:cursor-pointer gba:select-none gba:hover:bg-accent gba:text-center"
                      onClick={() => sorting.handleSort('periodOrder')}
                      data-testid="allowance-periods-table-header-order"
                    >
                      <div className="gba:flex gba:items-center gba:justify-center">
                        ORDER
                        {sorting.renderSortIcon('periodOrder')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[120px] gba:text-center gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                      onClick={() => sorting.handleSort('returnBefore')}
                      data-testid="allowance-periods-table-header-return-before"
                    >
                      <div className="gba:flex gba:items-center gba:justify-center">
                        RETURN BEFORE
                        {sorting.renderSortIcon('returnBefore')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[120px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                      onClick={() => sorting.handleSort('activeFrom')}
                      data-testid="allowance-periods-table-header-valid-from"
                    >
                      <div className="gba:flex gba:items-center">
                        VALID FROM
                        {sorting.renderSortIcon('activeFrom')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[120px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                      onClick={() => sorting.handleSort('activeTo')}
                      data-testid="allowance-periods-table-header-valid-to"
                    >
                      <div className="gba:flex gba:items-center">
                        VALID TO
                        {sorting.renderSortIcon('activeTo')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[80px] gba:text-center"
                      data-testid="allowance-periods-table-header-order"
                    >
                      ORDER
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody data-testid="allowance-periods-table-body">
                  {sortedAllowancePeriods.map(record => (
                    <TableRow key={record.id} data-testid={`allowance-period-row-${record.id}`}>
                      {/* Actions Column */}
                      <TableCell data-testid={`allowance-period-actions-cell-${record.id}`}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`allowance-period-action-${record.id}`}
                              onClick={e => e.stopPropagation()}
                            >
                              <PiDotsThreeVertical className="gba:h-4 gba:w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEdit(record)}
                              data-testid={`edit-allowance-period-${record.id}`}
                            >
                              <PiPencil className="gba:h-4 gba:w-4 gba:mr-2" />
                              Update
                            </DropdownMenuItem>
                            {/* Always show delete option, but disable if period is used */}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={e => {
                                e.stopPropagation()
                                if (!periodUsageMap[record.id]) {
                                  handleDeleteClick(record)
                                }
                              }}
                              className="gba:text-destructive"
                              disabled={periodUsageMap[record.id]}
                              title={
                                periodUsageMap[record.id]
                                  ? 'Cannot delete - this period is used in allowance setups'
                                  : 'Delete this allowance period'
                              }
                              data-testid={`delete-allowance-period-${record.id}`}
                            >
                              <PiTrash className="gba:h-4 gba:w-4 gba:mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>

                      {/* Code Column */}
                      <TableCell data-testid={`allowance-period-code-cell-${record.id}`}>
                        <span
                          className="gba:font-mono gba:font-medium"
                          data-testid={`allowance-period-code-text-${record.id}`}
                        >
                          {record.code}
                        </span>
                      </TableCell>

                      {/* Name Column */}
                      <TableCell data-testid={`allowance-period-name-cell-${record.id}`}>
                        <span data-testid={`allowance-period-name-text-${record.id}`}>{record.name}</span>
                      </TableCell>

                      {/* Overnight Accommodation Column */}
                      <TableCell
                        className="gba:text-center"
                        data-testid={`allowance-period-overnight-cell-${record.id}`}
                      >
                        {record.overnightAccommodation ? (
                          <PiCheck
                            className="gba:text-success gba:text-lg gba:inline-block"
                            data-testid={`allowance-period-overnight-check-${record.id}`}
                          />
                        ) : (
                          <PiX
                            className="gba:text-muted-foreground gba:text-lg gba:inline-block"
                            data-testid={`allowance-period-overnight-x-${record.id}`}
                          />
                        )}
                      </TableCell>

                      {/* Time From Column */}
                      <TableCell
                        className="gba:text-center"
                        data-testid={`allowance-period-from-time-cell-${record.id}`}
                      >
                        <div className="gba:flex gba:items-center gba:gap-1 gba:justify-center">
                          <PiClock
                            className="gba:text-muted-foreground"
                            data-testid={`allowance-period-from-time-icon-${record.id}`}
                          />
                          <span
                            className="gba:font-mono gba:text-sm"
                            data-testid={`allowance-period-from-time-text-${record.id}`}
                          >
                            {record.fromTime || '-'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Time To Column */}
                      <TableCell className="gba:text-center" data-testid={`allowance-period-to-time-cell-${record.id}`}>
                        <div className="gba:flex gba:items-center gba:gap-1 gba:justify-center">
                          <PiClock
                            className="gba:text-muted-foreground"
                            data-testid={`allowance-period-to-time-icon-${record.id}`}
                          />
                          <span
                            className="gba:font-mono gba:text-sm"
                            data-testid={`allowance-period-to-time-text-${record.id}`}
                          >
                            {record.toTime || '-'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Minimum Hours Column */}
                      <TableCell
                        className="gba:text-center"
                        data-testid={`allowance-period-min-hours-cell-${record.id}`}
                      >
                        <Badge variant="default" data-testid={`allowance-period-min-hours-badge-${record.id}`}>
                          {record.minHours}
                        </Badge>
                      </TableCell>

                      {/* Midnight Rule Column */}
                      <TableCell
                        className="gba:text-center"
                        data-testid={`allowance-period-midnight-cell-${record.id}`}
                      >
                        {record.midnightRule ? (
                          <PiCheck
                            className="gba:text-success gba:text-lg gba:inline-block"
                            data-testid={`allowance-period-midnight-check-${record.id}`}
                          />
                        ) : (
                          <PiX
                            className="gba:text-muted-foreground gba:text-lg gba:inline-block"
                            data-testid={`allowance-period-midnight-x-${record.id}`}
                          />
                        )}
                      </TableCell>

                      {/* Start After Column */}
                      <TableCell
                        className="gba:text-center"
                        data-testid={`allowance-period-start-after-cell-${record.id}`}
                      >
                        <div className="gba:flex gba:items-center gba:gap-1 gba:justify-center">
                          <PiClock
                            className="gba:text-muted-foreground"
                            data-testid={`allowance-period-start-after-icon-${record.id}`}
                          />
                          <span
                            className="gba:font-mono gba:text-sm"
                            data-testid={`allowance-period-start-after-text-${record.id}`}
                          >
                            {record.startAfter || '-'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Return Before Column */}
                      <TableCell
                        className="gba:text-center"
                        data-testid={`allowance-period-return-before-cell-${record.id}`}
                      >
                        <div className="gba:flex gba:items-center gba:gap-1 gba:justify-center">
                          <PiClock
                            className="gba:text-muted-foreground"
                            data-testid={`allowance-period-return-before-icon-${record.id}`}
                          />
                          <span
                            className="gba:font-mono gba:text-sm"
                            data-testid={`allowance-period-return-before-text-${record.id}`}
                          >
                            {record.returnBefore || '-'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Valid From Column */}
                      <TableCell data-testid={`allowance-period-valid-from-cell-${record.id}`}>
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <PiCalendar
                            className="gba:text-muted-foreground"
                            data-testid={`allowance-period-valid-from-icon-${record.id}`}
                          />
                          <span className="gba:text-sm" data-testid={`allowance-period-valid-from-text-${record.id}`}>
                            {formatDate(record.validFrom)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Valid To Column */}
                      <TableCell data-testid={`allowance-period-valid-to-cell-${record.id}`}>
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <PiCalendar
                            className="gba:text-muted-foreground"
                            data-testid={`allowance-period-valid-to-icon-${record.id}`}
                          />
                          <span className="gba:text-sm" data-testid={`allowance-period-valid-to-text-${record.id}`}>
                            {record.validTo ? formatDate(record.validTo) : '∞'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Order Column */}
                      <TableCell className="gba:text-center" data-testid={`allowance-period-order-cell-${record.id}`}>
                        <Badge variant="secondary" data-testid={`allowance-period-order-badge-${record.id}`}>
                          {record.order}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div
              className="gba:text-center gba:py-8 gba:text-muted-foreground"
              data-testid="allowance-periods-empty-state"
            >
              <p className="gba:m-0" data-testid="allowance-periods-empty-message">
                No allowance periods configured
              </p>
              <p className="gba:text-xs gba:mt-1" data-testid="allowance-periods-empty-hint">
                Click "Add Allowance Period" to create your first period
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Allowance Period"
        itemDescription={`the allowance period "${itemToDelete?.name}"`}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false)
          setItemToDelete(null)
        }}
        testIdPrefix="allowance-period-delete"
      />

      {/* Add/Edit Dialog */}
      <Dialog open={isModalVisible} onOpenChange={setIsModalVisible}>
        <DialogContent className="gba:max-w-4xl" data-testid="allowance-period-modal">
          <DialogHeader data-testid="allowance-period-modal-header">
            <DialogTitle data-testid="allowance-period-modal-title">
              {editingItem ? 'Edit' : 'Add'} Allowance Period
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <div data-testid="allowance-period-form" className="gba:space-y-4">
              {isRestrictedEdit && currentUsageInfo && (
                <Alert
                  className="gba:bg-warning-secondary gba:text-warning-secondary-foreground gba:border-warning"
                  data-testid="allowance-period-restricted-alert"
                >
                  <PiWarning className="gba:h-4 gba:w-4" />
                  <AlertDescription>{currentUsageInfo.message}</AlertDescription>
                </Alert>
              )}

              <div className="gba:space-y-4">
                {/* Code */}
                <FormField
                  control={form.control}
                  name="code"
                  rules={{ required: 'Allowance Period Code is required' }}
                  render={({ field }) => (
                    <FormItem data-testid="allowance-period-code-field">
                      <FormLabel data-testid="allowance-period-code-label">Allowance Period Code *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., FULL, 12, 24"
                          disabled={isRestrictedEdit}
                          data-testid="allowance-period-code-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  rules={{ required: 'Name is required' }}
                  render={({ field }) => (
                    <FormItem data-testid="allowance-period-name-field">
                      <FormLabel data-testid="allowance-period-name-label">Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Full Day, 12 hours"
                          disabled={isRestrictedEdit}
                          data-testid="allowance-period-name-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Minimum Hours */}
                <FormField
                  control={form.control}
                  name="minHours"
                  rules={{
                    required: 'Minimum Hours is required',
                    min: { value: 0, message: 'Must be at least 0' },
                    max: { value: 24, message: 'Must be at most 24' }
                  }}
                  render={({ field }) => (
                    <FormItem data-testid="allowance-period-min-hours-field">
                      <FormLabel data-testid="allowance-period-min-hours-label">Minimum Hours *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="24"
                          placeholder="24"
                          value={field.value}
                          onChange={e => field.onChange(Number(e.target.value))}
                          disabled={isRestrictedEdit}
                          data-testid="allowance-period-min-hours-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Order */}
                <FormField
                  control={form.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem data-testid="allowance-period-order-field">
                      <FormLabel data-testid="allowance-period-order-label">Order</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          value={field.value || ''}
                          onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          disabled={isRestrictedEdit}
                          data-testid="allowance-period-order-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Time From */}
                <FormField
                  control={form.control}
                  name="fromTime"
                  render={({ field }) => (
                    <FormItem data-testid="allowance-period-from-time-field">
                      <FormLabel data-testid="allowance-period-from-time-label">Time From</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          value={field.value || ''}
                          onChange={e => field.onChange(e.target.value || undefined)}
                          disabled={isRestrictedEdit}
                          data-testid="allowance-period-from-time-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Time To */}
                <FormField
                  control={form.control}
                  name="toTime"
                  render={({ field }) => (
                    <FormItem data-testid="allowance-period-to-time-field">
                      <FormLabel data-testid="allowance-period-to-time-label">Time To</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          value={field.value || ''}
                          onChange={e => field.onChange(e.target.value || undefined)}
                          disabled={isRestrictedEdit}
                          data-testid="allowance-period-to-time-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Start After */}
                <FormField
                  control={form.control}
                  name="startAfter"
                  render={({ field }) => (
                    <FormItem data-testid="allowance-period-start-after-field">
                      <FormLabel data-testid="allowance-period-start-after-label">Start After</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          value={field.value || ''}
                          onChange={e => field.onChange(e.target.value || undefined)}
                          disabled={isRestrictedEdit}
                          data-testid="allowance-period-start-after-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Return Before */}
                <FormField
                  control={form.control}
                  name="returnBefore"
                  render={({ field }) => (
                    <FormItem data-testid="allowance-period-return-before-field">
                      <FormLabel data-testid="allowance-period-return-before-label">Return Before</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          value={field.value || ''}
                          onChange={e => field.onChange(e.target.value || undefined)}
                          disabled={isRestrictedEdit}
                          data-testid="allowance-period-return-before-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Valid From */}
                <FormField
                  control={form.control}
                  name="validFrom"
                  rules={{ required: 'Valid From is required' }}
                  render={({ field }) => (
                    <FormItem data-testid="allowance-period-valid-from-field">
                      <FormLabel data-testid="allowance-period-valid-from-label">Valid From *</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value || ''}
                          onChange={date => field.onChange(date)}
                          disabled={isRestrictedEdit}
                          data-testid="allowance-period-valid-from-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Valid To */}
                <FormField
                  control={form.control}
                  name="validTo"
                  render={({ field }) => (
                    <FormItem data-testid="allowance-period-valid-to-field">
                      <FormLabel data-testid="allowance-period-valid-to-label">Valid To</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value || ''}
                          onChange={date => field.onChange(date)}
                          data-testid="allowance-period-valid-to-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Switches */}
              <div className="gba:space-y-4">
                <FormField
                  control={form.control}
                  name="midnightRule"
                  render={({ field }) => (
                    <FormItem
                      className="gba:flex gba:items-center gba:justify-between"
                      data-testid="allowance-period-midnight-rule-field"
                    >
                      <FormLabel data-testid="allowance-period-midnight-rule-label">Midnight Rule</FormLabel>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span
                          className="gba:text-sm gba:text-muted-foreground"
                          data-testid="allowance-period-midnight-rule-status"
                        >
                          {field.value ? 'Yes' : 'No'}
                        </span>
                        <FormControl>
                          <NWSwitch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isRestrictedEdit}
                            data-testid="allowance-period-midnight-rule-switch"
                          />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="overnightAccommodation"
                  render={({ field }) => (
                    <FormItem
                      className="gba:flex gba:items-center gba:justify-between"
                      data-testid="allowance-period-overnight-field"
                    >
                      <FormLabel data-testid="allowance-period-overnight-label">Overnight Accommodation</FormLabel>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span
                          className="gba:text-sm gba:text-muted-foreground"
                          data-testid="allowance-period-overnight-status"
                        >
                          {field.value ? 'Yes' : 'No'}
                        </span>
                        <FormControl>
                          <NWSwitch
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                            disabled={isRestrictedEdit}
                            data-testid="allowance-period-overnight-switch"
                          />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Form>

          <DialogFooter data-testid="allowance-period-modal-footer">
            <Button
              variant="outline"
              onClick={() => setIsModalVisible(false)}
              disabled={isSaving}
              data-testid="allowance-period-modal-cancel-button"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} data-testid="allowance-period-modal-save-button">
              {isSaving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AllowancePeriodTab
