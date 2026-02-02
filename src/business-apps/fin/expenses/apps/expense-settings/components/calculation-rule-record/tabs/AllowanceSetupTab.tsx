import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
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
  PiCheck,
  PiX,
  PiGear,
  PiCode,
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
import { formatDateForInput, findOverlappingPeriods, formatDate } from '../../../utils'
import {
  validateAllowanceSetupDates,
  formatDateToISO,
  transformAllowanceSetupForRestrictedUpdate,
  transformAllowanceSetupForSave,
  parseAllowanceSetupSaveError,
  getValidityDatesFromExisting
} from '../utils'
import { useTableSorting, createFieldMappings } from '../hooks'
import { UsageInfo } from '../../../types'

interface AllowanceSetupTabProps {
  ruleId: string
  accessToken: string
  activeFrom: string
  activeTo?: string
}

interface AllowanceSetup {
  id: string
  name: string
  issue: string
  onlyTax: boolean
  activeFrom: string
  activeTo?: string
  allowancePeriod: {
    id: string
    code: string
    name: string
  }
  allowanceCode: {
    id: string
    code: string
    name: string
  }
  version?: number
  isDeleted: boolean
}

interface AllowanceSetupFormData {
  id?: string
  name: string
  issue: string
  onlyTax: boolean
  activeFrom: string
  activeTo?: string
  allowancePeriodId: string
  allowanceCodeId: string
  version?: number
}

const AllowanceSetupTab: React.FC<AllowanceSetupTabProps> = ({ ruleId, accessToken, activeFrom, activeTo }) => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [allowanceSetups, setAllowanceSetups] = useState<AllowanceSetup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingItem, setEditingItem] = useState<AllowanceSetup | null>(null)
  const [allowancePeriods, setAllowancePeriods] = useState<any[]>([])
  const [allowanceCodes, setAllowanceCodes] = useState<any[]>([])

  // Memoize field mappings to prevent unnecessary recalculations
  const fieldMappings = useMemo(
    () => ({
      name: createFieldMappings.string((a: AllowanceSetup) => a.name),
      allowancePeriod: createFieldMappings.nested((a: AllowanceSetup) => a.allowancePeriod),
      allowanceCode: createFieldMappings.nested((a: AllowanceSetup) => a.allowanceCode),
      issue: createFieldMappings.string((a: AllowanceSetup) => a.issue),
      onlyTax: createFieldMappings.boolean((a: AllowanceSetup) => a.onlyTax),
      activeFrom: createFieldMappings.date((a: AllowanceSetup) => a.activeFrom),
      activeTo: createFieldMappings.date((a: AllowanceSetup) => a.activeTo, '9999-12-31')
    }),
    []
  )

  // Sorting - using shared hook (single source of truth)
  const sorting = useTableSorting<AllowanceSetup>({
    defaultSortField: 'name',
    defaultSortOrder: 'ASC',
    data: allowanceSetups,
    fieldMappings
  })

  // formatDateForInput is imported from shared utils

  const form = useForm<AllowanceSetupFormData>({
    defaultValues: {
      name: '',
      issue: 'DAILY_ALLOWANCE',
      onlyTax: false,
      activeFrom: formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD'),
      activeTo: formatDateForInput(activeTo) || '9999-12-31',
      allowancePeriodId: '',
      allowanceCodeId: ''
    }
  })

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<AllowanceSetup | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Usage check state
  const [, setIsCheckingUsage] = useState(false)
  const [currentUsageInfo, setCurrentUsageInfo] = useState<UsageInfo | null>(null)
  const [isRestrictedEdit, setIsRestrictedEdit] = useState(false)

  // Pre-loaded usage status for all setups (setup id -> isUsed)
  const [setupUsageMap, setSetupUsageMap] = useState<Record<string, boolean>>({})

  // Form validation error
  const [validityError, setValidityError] = useState<string | null>(null)

  // Set up client
  expenseSettingsClient.setAccessToken(accessToken)

  // Load usage status for all setups
  // AllowanceSetup usage is determined by checking if its linked AllowanceCode is used
  const loadSetupUsageStatus = useCallback(
    async (setups: { id: string; allowanceCodeId: string }[]) => {
      if (setups.length === 0) return

      try {
        // Get unique allowance code IDs
        const allowanceCodeIds = [...new Set(setups.map(s => s.allowanceCodeId).filter(Boolean))]

        if (allowanceCodeIds.length === 0) {
          const usageMap: Record<string, boolean> = {}
          setups.forEach(s => {
            usageMap[s.id] = false
          })
          setSetupUsageMap(usageMap)
          return
        }

        // Check if any of these allowance codes are used in expense entities
        const query = `
          query CheckAllowanceCodeUsageForSetups($allowanceCodeIds: [uuid!]!) {
            planItems: ExpensePlanItem(
              where: { expenseRuleAllowanceCodeId: { _in: $allowanceCodeIds }, isDeleted: { _eq: false } }
            ) { expenseRuleAllowanceCodeId }
            items: ExpenseItem(
              where: { expenseRuleAllowanceCodeId: { _in: $allowanceCodeIds }, isDeleted: { _eq: false } }
            ) { expenseRuleAllowanceCodeId }
            positions: ExpensePosition(
              where: { expenseRuleAllowanceCodeId: { _in: $allowanceCodeIds }, isDeleted: { _eq: false } }
            ) { expenseRuleAllowanceCodeId }
          }
        `

        const result = await graphqlClient.request<any>(query, { allowanceCodeIds })

        // Collect all used allowance code IDs
        const usedCodeIds = new Set<string>()
        result.planItems?.forEach((item: any) => usedCodeIds.add(item.expenseRuleAllowanceCodeId))
        result.items?.forEach((item: any) => usedCodeIds.add(item.expenseRuleAllowanceCodeId))
        result.positions?.forEach((item: any) => usedCodeIds.add(item.expenseRuleAllowanceCodeId))

        // Map setup IDs to usage status based on their allowance code
        const usageMap: Record<string, boolean> = {}
        setups.forEach(s => {
          usageMap[s.id] = usedCodeIds.has(s.allowanceCodeId)
        })
        setSetupUsageMap(usageMap)
      } catch (error) {
        console.error('Error checking allowance setup usage:', error)
        // On error, assume not in use to allow operations
        const usageMap: Record<string, boolean> = {}
        setups.forEach(s => {
          usageMap[s.id] = false
        })
        setSetupUsageMap(usageMap)
      }
    },
    [graphqlClient]
  )

  // Check detailed usage for a single setup
  const checkAllowanceSetupUsage = useCallback(
    async (setupId: string, allowanceCodeId: string): Promise<UsageInfo> => {
      if (!allowanceCodeId) {
        return { isUsed: false, usedIn: {}, message: '' }
      }

      try {
        const query = `
          query CheckAllowanceSetupDetailedUsage($allowanceCodeId: uuid!) {
            planItemCount: ExpensePlanItemAggregate(
              where: { expenseRuleAllowanceCodeId: { _eq: $allowanceCodeId }, isDeleted: { _eq: false } }
            ) { aggregate { count } }
            itemCount: ExpenseItemAggregate(
              where: { expenseRuleAllowanceCodeId: { _eq: $allowanceCodeId }, isDeleted: { _eq: false } }
            ) { aggregate { count } }
            positionCount: ExpensePositionAggregate(
              where: { expenseRuleAllowanceCodeId: { _eq: $allowanceCodeId }, isDeleted: { _eq: false } }
            ) { aggregate { count } }
          }
        `

        const result = await graphqlClient.request<any>(query, { allowanceCodeId })

        const planItems = result.planItemCount?.aggregate?.count || 0
        const items = result.itemCount?.aggregate?.count || 0
        const positions = result.positionCount?.aggregate?.count || 0

        const isUsed = planItems > 0 || items > 0 || positions > 0

        const messageParts: string[] = []
        if (planItems > 0) messageParts.push(`${planItems} plan item${planItems > 1 ? 's' : ''}`)
        if (items > 0) messageParts.push(`${items} expense item${items > 1 ? 's' : ''}`)
        if (positions > 0) messageParts.push(`${positions} position${positions > 1 ? 's' : ''}`)

        return {
          isUsed,
          usedIn: { planItems, items, positions },
          message: isUsed
            ? `This setup's allowance code is used in ${messageParts.join(', ')}. Only "Valid To" can be modified.`
            : ''
        }
      } catch (error) {
        console.error('Error checking allowance setup usage:', error)
        return { isUsed: false, usedIn: {}, message: '' }
      }
    },
    [graphqlClient]
  )

  const fetchAllowanceSetups = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const query = `
        query GetExpenseRuleAllowanceSetups($ruleId: uuid!) {
          ExpenseRule(where: { id: { _eq: $ruleId } }) {
            id
            code
            name
            expenseRuleAllowanceSetup(where: { isDeleted: { _eq: false } }, orderBy: { setupOrder: ASC }) {
              id
              name
              issue
              onlyTax
              activeFrom
              activeTo
              version
              allowancePeriod {
                id
                code
                name
              }
              allowanceCode {
                id
                code
                name
              }
            }
            expenseRuleAllowancePeriod(where: { isDeleted: { _eq: false } }) {
              id
              code
              name
            }
            expenseRuleAllowanceCode(where: { isDeleted: { _eq: false } }) {
              id
              code
              name
              calculationRef
            }
          }
        }
      `

      const result = await graphqlClient.request<{ ExpenseRule: any[] }>(query, { ruleId })

      const expenseRule = result.ExpenseRule?.[0]
      const setups = expenseRule?.expenseRuleAllowanceSetup || []

      const periods = expenseRule?.expenseRuleAllowancePeriod || []
      const codes = expenseRule?.expenseRuleAllowanceCode || []

      const transformedSetups: AllowanceSetup[] = setups.map((setup: any) => ({
        id: setup.id,
        name: setup.name || '',
        issue: setup.issue || '',
        onlyTax: setup.onlyTax || false,
        activeFrom: setup.activeFrom,
        activeTo: setup.activeTo,
        allowancePeriod: setup.allowancePeriod || { id: '', code: '', name: '' },
        allowanceCode: setup.allowanceCode || { id: '', code: '', name: '' },
        version: setup.version,
        isDeleted: false
      }))

      setAllowanceSetups(transformedSetups)
      setAllowancePeriods(periods)
      setAllowanceCodes(codes)

      // Load usage status for all setups (based on their allowance code usage)
      if (transformedSetups.length > 0) {
        await loadSetupUsageStatus(
          transformedSetups.map(s => ({
            id: s.id,
            allowanceCodeId: s.allowanceCode.id
          }))
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load allowance setups')
    } finally {
      setIsLoading(false)
    }
  }, [ruleId, graphqlClient, loadSetupUsageStatus])

  // Sorted data is provided by useTableSorting hook (single source of truth)
  const sortedAllowanceSetups = sorting.sortedData || allowanceSetups

  // Filter out allowance codes that have a calculation defined (they shouldn't appear in allowance setup form)
  // When editing, include the currently selected code even if it has a calculation (for display consistency)
  const filteredAllowanceCodes = useMemo(() => {
    const currentAllowanceCodeId = editingItem?.allowanceCode?.id
    return allowanceCodes.filter(code => !code.calculationRef || code.id === currentAllowanceCodeId)
  }, [allowanceCodes, editingItem])

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchAllowanceSetups()
    }
  }, [ruleId, accessToken, fetchAllowanceSetups])

  // Issue types - value is stored in DB, label is displayed in UI
  const issueOptions = [
    { value: 'DAILY_ALLOWANCE', label: 'Daily Allowance' },
    { value: 'BREAKFAST_DEDUCTION', label: 'Breakfast Deduction' },
    { value: 'LUNCH_DEDUCTION', label: 'Lunch Deduction' },
    { value: 'DINNER_DEDUCTION', label: 'Dinner Deduction' },
    { value: 'OVERNIGHT_DEDUCTION', label: 'Overnight Deduction' }
  ]

  // Helper to get display label for an issue value
  const getIssueLabel = (value: string): string => {
    const option = issueOptions.find(opt => opt.value === value)
    return option?.label || value
  }

  const handleAdd = () => {
    setEditingItem(null)
    setIsRestrictedEdit(false)
    setCurrentUsageInfo(null)
    setValidityError(null)

    // Get validity dates using shared utility (copies from first existing entry if available)
    const { activeFrom: entryActiveFrom, activeTo: entryActiveTo } = getValidityDatesFromExisting(
      allowanceSetups,
      activeFrom,
      activeTo
    )

    form.reset({
      name: '',
      issue: 'DAILY_ALLOWANCE',
      onlyTax: false,
      activeFrom: entryActiveFrom,
      activeTo: entryActiveTo,
      allowancePeriodId: '',
      allowanceCodeId: ''
    })
    setIsModalVisible(true)
  }

  const handleEdit = async (record: AllowanceSetup) => {
    setIsCheckingUsage(true)
    setValidityError(null)

    // Check if setup is used (based on its allowance code usage)
    const usageInfo = await checkAllowanceSetupUsage(record.id, record.allowanceCode.id)
    setCurrentUsageInfo(usageInfo)
    setIsRestrictedEdit(usageInfo.isUsed)

    form.reset({
      id: record.id,
      name: record.name,
      issue: record.issue,
      onlyTax: record.onlyTax,
      activeFrom:
        formatDateForInput(record.activeFrom) || formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD'),
      activeTo: formatDateForInput(record.activeTo),
      allowancePeriodId: record.allowancePeriod.id,
      allowanceCodeId: record.allowanceCode.id,
      version: record.version
    })

    setEditingItem(record)
    setIsCheckingUsage(false)
    setIsModalVisible(true)
  }

  const handleDeleteClick = (record: AllowanceSetup) => {
    setItemToDelete(record)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return

    setIsDeleting(true)
    try {
      await expenseSettingsClient.deleteExpenseRuleAllowanceSetup(itemToDelete.id, itemToDelete.version)

      toast.success('Allowance setup deleted successfully')
      setDeleteDialogOpen(false)
      setItemToDelete(null)

      // Wait a bit for the backend to process the delete
      await new Promise(resolve => setTimeout(resolve, 500))
      await fetchAllowanceSetups()
    } catch (err) {
      toast.error('Failed to delete allowance setup')
      console.error('❌ Delete error:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  // Check if allowanceCodeId + allowancePeriodId combination is unique within the validity period
  const checkSetupUniqueness = useCallback(
    async (
      allowanceCodeId: string,
      allowancePeriodId: string,
      activeFrom: string,
      activeTo: string | undefined,
      excludeId?: string
    ): Promise<boolean> => {
      try {
        // Fetch all matching setups and check overlap in JavaScript to avoid GraphQL schema limitations
        const query = `
          query CheckAllowanceSetupUniqueness($ruleId: uuid!, $allowanceCodeId: uuid!, $allowancePeriodId: uuid!, $excludeId: uuid) {
            ExpenseRuleAllowanceSetup(
              where: {
                expenseRuleId: { _eq: $ruleId }
                allowanceCodeId: { _eq: $allowanceCodeId }
                allowancePeriodId: { _eq: $allowancePeriodId }
                isDeleted: { _eq: false }
                id: { _neq: $excludeId }
              }
            ) {
              id
              activeFrom
              activeTo
            }
          }
        `

        const variables = {
          ruleId,
          allowanceCodeId,
          allowancePeriodId,
          excludeId: excludeId || null
        }

        const result = await graphqlClient.request<{
          ExpenseRuleAllowanceSetup: { id: string; activeFrom: string; activeTo?: string }[]
        }>(query, variables)

        // Check for overlapping periods using shared utility
        const overlappingSetups = findOverlappingPeriods({ activeFrom, activeTo }, result.ExpenseRuleAllowanceSetup)

        if (overlappingSetups.length > 0) {
          return true
        }

        return false
      } catch (error) {
        console.error('[AllowanceSetupTab] Error checking setup uniqueness:', {
          error,
          allowanceCodeId,
          allowancePeriodId,
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
    try {
      setIsSaving(true)
      setValidityError(null)

      const formValues = form.getValues()

      // Check setup uniqueness (allowanceCodeId + allowancePeriodId combination)
      const setupExists = await checkSetupUniqueness(
        formValues.allowanceCodeId,
        formValues.allowancePeriodId,
        formValues.activeFrom,
        formValues.activeTo,
        editingItem?.id
      )

      if (setupExists) {
        setValidityError(
          'This allowance code and period combination already exists with an overlapping validity period. Please use a different combination or adjust the validity dates.'
        )
        setIsSaving(false)
        return
      }

      // Validate validity period
      const validationError = validateAllowanceSetupDates(
        formValues.activeFrom,
        formValues.activeTo,
        activeFrom,
        activeTo
      )

      if (validationError) {
        setValidityError(validationError.message)
        setIsSaving(false)
        return
      }

      // IMPORTANT: Always use editingItem for id and version when updating
      const saveData =
        isRestrictedEdit && editingItem
          ? transformAllowanceSetupForRestrictedUpdate(formValues, editingItem, ruleId, formatDateToISO)
          : transformAllowanceSetupForSave(formValues, ruleId, editingItem, formatDateToISO)

      await expenseSettingsClient.saveExpenseRuleAllowanceSetup(saveData)

      toast.success(`Allowance setup ${editingItem ? 'updated' : 'created'} successfully`)
      setIsModalVisible(false)
      await fetchAllowanceSetups()
    } catch (err) {
      // Parse error and show appropriate message
      const validityErrorMessage = parseAllowanceSetupSaveError(err)
      if (validityErrorMessage) {
        setValidityError(validityErrorMessage)
      } else {
        toast.error(`Failed to ${editingItem ? 'update' : 'create'} allowance setup`)
      }
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Removed Ant Design columns definition - using NW design system Table now

  if (isLoading) {
    return (
      <div
        data-testid="allowance-setup-tab-loading"
        className="gba:flex gba:justify-center gba:items-center gba:min-h-64"
      >
        <Spinner className="gba:w-8 gba:h-8" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="allowance-setup-tab-error">
        <AlertDescription>
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
            <div>
              <div className="gba:font-semibold gba:mb-1">Error Loading Allowance Setups</div>
              <div className="gba:text-sm">{error}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAllowanceSetups}
              data-testid="allowance-setup-retry-button"
            >
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div data-testid="allowance-setup-tab">
      <Toaster />

      <Card data-testid="allowance-setup-card">
        <CardHeader data-testid="allowance-setup-card-header">
          <div className="gba:flex gba:justify-between gba:items-center">
            <div className="gba:flex gba:items-center gba:gap-2">
              <CardTitle data-testid="allowance-setup-card-title">Allowance Setups</CardTitle>
              <Badge variant="default" data-testid="allowance-setup-count-badge">
                {allowanceSetups.length} setups
              </Badge>
            </div>
            <Button onClick={handleAdd} data-testid="add-allowance-setup-button">
              <PiPlus className="gba:mr-2" />
              Add Allowance Setup
            </Button>
          </div>
        </CardHeader>

        <CardContent data-testid="allowance-setup-card-content">
          {sortedAllowanceSetups.length > 0 ? (
            <Table data-testid="allowance-setups-table">
              <TableHeader data-testid="allowance-setups-table-header">
                <TableRow data-testid="allowance-setups-table-header-row">
                  <TableHead className="gba:w-[60px]" data-testid="allowance-setups-table-header-actions">
                    ACTIONS
                  </TableHead>
                  <TableHead
                    className="gba:w-[150px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                    onClick={() => sorting.handleSort('allowancePeriod')}
                    data-testid="allowance-setups-table-header-period"
                  >
                    <div className="gba:flex gba:items-center">
                      ALLOWANCE PERIOD
                      {sorting.renderSortIcon('allowancePeriod')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[150px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                    onClick={() => sorting.handleSort('allowanceCode')}
                    data-testid="allowance-setups-table-header-code"
                  >
                    <div className="gba:flex gba:items-center">
                      ALLOWANCE CODE
                      {sorting.renderSortIcon('allowanceCode')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[200px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                    onClick={() => sorting.handleSort('name')}
                    data-testid="allowance-setups-table-header-name"
                  >
                    <div className="gba:flex gba:items-center">
                      NAME
                      {sorting.renderSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[150px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                    onClick={() => sorting.handleSort('issue')}
                    data-testid="allowance-setups-table-header-issue"
                  >
                    <div className="gba:flex gba:items-center">
                      ISSUE
                      {sorting.renderSortIcon('issue')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[100px] gba:text-center gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                    onClick={() => sorting.handleSort('onlyTax')}
                    data-testid="allowance-setups-table-header-tax-only"
                  >
                    <div className="gba:flex gba:items-center gba:justify-center">
                      TAX ONLY
                      {sorting.renderSortIcon('onlyTax')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[120px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                    onClick={() => sorting.handleSort('activeFrom')}
                    data-testid="allowance-setups-table-header-valid-from"
                  >
                    <div className="gba:flex gba:items-center">
                      VALID FROM
                      {sorting.renderSortIcon('activeFrom')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[120px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                    onClick={() => sorting.handleSort('activeTo')}
                    data-testid="allowance-setups-table-header-valid-to"
                  >
                    <div className="gba:flex gba:items-center">
                      VALID TO
                      {sorting.renderSortIcon('activeTo')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody data-testid="allowance-setups-table-body">
                {sortedAllowanceSetups.map(record => (
                  <TableRow key={record.id} data-testid={`allowance-setup-row-${record.id}`}>
                    <TableCell data-testid={`allowance-setup-actions-cell-${record.id}`}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`allowance-setup-action-${record.id}`}
                            onClick={e => e.stopPropagation()}
                          >
                            <PiDotsThreeVertical className="gba:h-4 gba:w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEdit(record)}
                            data-testid={`edit-allowance-setup-${record.id}`}
                          >
                            <PiPencil className="gba:h-4 gba:w-4 gba:mr-2" />
                            Update
                          </DropdownMenuItem>
                          {!setupUsageMap[record.id] && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(record)}
                                className="gba:text-destructive"
                                data-testid={`delete-allowance-setup-${record.id}`}
                              >
                                <PiTrash className="gba:h-4 gba:w-4 gba:mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>

                    <TableCell data-testid={`allowance-setup-period-cell-${record.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiGear className="gba:text-primary" data-testid={`allowance-setup-period-icon-${record.id}`} />
                        <span
                          className="gba:font-mono gba:font-medium"
                          data-testid={`allowance-setup-period-code-${record.id}`}
                        >
                          {record.allowancePeriod.code}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell data-testid={`allowance-setup-code-cell-${record.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiCode className="gba:text-secondary" data-testid={`allowance-setup-code-icon-${record.id}`} />
                        <span
                          className="gba:font-mono gba:font-medium"
                          data-testid={`allowance-setup-code-text-${record.id}`}
                        >
                          {record.allowanceCode.code}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell data-testid={`allowance-setup-name-cell-${record.id}`}>
                      <div>
                        <div className="gba:font-medium" data-testid={`allowance-setup-name-text-${record.id}`}>
                          {record.name}
                        </div>
                        <div
                          className="gba:text-xs gba:text-muted-foreground"
                          data-testid={`allowance-setup-code-name-${record.id}`}
                        >
                          {record.allowanceCode.name}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell data-testid={`allowance-setup-issue-cell-${record.id}`}>
                      <Badge variant="default" data-testid={`allowance-setup-issue-badge-${record.id}`}>
                        {getIssueLabel(record.issue)}
                      </Badge>
                    </TableCell>

                    <TableCell className="gba:text-center" data-testid={`allowance-setup-tax-only-cell-${record.id}`}>
                      {record.onlyTax ? (
                        <PiCheck
                          className="gba:text-success gba:text-lg gba:inline-block"
                          data-testid={`allowance-setup-tax-only-check-${record.id}`}
                        />
                      ) : (
                        <PiX
                          className="gba:text-muted-foreground gba:text-lg gba:inline-block"
                          data-testid={`allowance-setup-tax-only-x-${record.id}`}
                        />
                      )}
                    </TableCell>

                    <TableCell data-testid={`allowance-setup-valid-from-cell-${record.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <PiCalendar
                          className="gba:text-muted-foreground"
                          data-testid={`allowance-setup-valid-from-icon-${record.id}`}
                        />
                        <span className="gba:text-sm" data-testid={`allowance-setup-valid-from-text-${record.id}`}>
                          {formatDate(record.activeFrom)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell data-testid={`allowance-setup-valid-to-cell-${record.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <PiCalendar
                          className="gba:text-muted-foreground"
                          data-testid={`allowance-setup-valid-to-icon-${record.id}`}
                        />
                        <span className="gba:text-sm" data-testid={`allowance-setup-valid-to-text-${record.id}`}>
                          {record.activeTo ? formatDate(record.activeTo) : '∞'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div
              className="gba:text-center gba:py-8 gba:text-muted-foreground"
              data-testid="allowance-setups-empty-state"
            >
              <p className="gba:m-0" data-testid="allowance-setups-empty-message">
                No allowance setups configured
              </p>
              <p className="gba:text-xs gba:mt-1" data-testid="allowance-setups-empty-hint">
                Click "Add Allowance Setup" to create your first setup
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Allowance Setup"
        itemDescription={`the allowance setup "${itemToDelete?.name}"`}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false)
          setItemToDelete(null)
        }}
        testIdPrefix="allowance-setup-delete"
      />

      {/* Add/Edit Dialog */}
      <Dialog open={isModalVisible} onOpenChange={setIsModalVisible}>
        <DialogContent className="gba:max-w-2xl" data-testid="allowance-setup-modal">
          <DialogHeader data-testid="allowance-setup-modal-header">
            <DialogTitle data-testid="allowance-setup-modal-title">
              {editingItem ? 'Edit' : 'Add'} Allowance Setup
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <div data-testid="allowance-setup-form" className="gba:space-y-4">
              {isRestrictedEdit && currentUsageInfo && (
                <Alert
                  className="gba:border-warning gba:bg-warning-secondary"
                  data-testid="allowance-setup-restricted-alert"
                >
                  <PiWarning className="gba:h-4 gba:w-4 gba:text-warning" />
                  <AlertDescription>{currentUsageInfo.message}</AlertDescription>
                </Alert>
              )}

              {/* Allowance Period */}
              <FormField
                control={form.control}
                name="allowancePeriodId"
                rules={{ required: 'Allowance Period is required' }}
                render={({ field }) => (
                  <FormItem data-testid="allowance-setup-period-field">
                    <FormLabel data-testid="allowance-setup-period-label">Allowance Period *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isRestrictedEdit}>
                      <FormControl>
                        <SelectTrigger data-testid="allowance-setup-period-select">
                          <SelectValue placeholder="Select allowance period" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent data-testid="allowance-setup-period-options">
                        {allowancePeriods.map(period => (
                          <SelectItem
                            key={period.id}
                            value={period.id}
                            data-testid={`allowance-setup-period-option-${period.code}`}
                          >
                            {period.code} - {period.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Allowance Code */}
              <FormField
                control={form.control}
                name="allowanceCodeId"
                rules={{ required: 'Allowance Code is required' }}
                render={({ field }) => (
                  <FormItem data-testid="allowance-setup-code-field">
                    <FormLabel data-testid="allowance-setup-code-label">Allowance Code *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={value => {
                        field.onChange(value)
                        // Auto-populate name field with selected allowance code's name
                        const selectedCode = filteredAllowanceCodes.find(code => code.id === value)
                        if (selectedCode && !editingItem) {
                          form.setValue('name', selectedCode.name)
                        }
                      }}
                      disabled={isRestrictedEdit}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="allowance-setup-code-select">
                          <SelectValue placeholder="Select allowance code" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent data-testid="allowance-setup-code-options">
                        {filteredAllowanceCodes.map(code => (
                          <SelectItem
                            key={code.id}
                            value={code.id}
                            data-testid={`allowance-setup-code-option-${code.code}`}
                          >
                            {code.code} - {code.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  <FormItem data-testid="allowance-setup-name-field">
                    <FormLabel data-testid="allowance-setup-name-label">Name *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isRestrictedEdit}
                        placeholder={getTranslationFromI18nKeyAndLabel(
                          'expense-settings:allowance_setup_name_placeholder',
                          'Enter allowance setup name'
                        )}
                        data-testid="allowance-setup-name-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Issue */}
              <FormField
                control={form.control}
                name="issue"
                rules={{ required: 'Issue is required' }}
                render={({ field }) => (
                  <FormItem data-testid="allowance-setup-issue-field">
                    <FormLabel data-testid="allowance-setup-issue-label">Issue *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isRestrictedEdit}>
                      <FormControl>
                        <SelectTrigger data-testid="allowance-setup-issue-select">
                          <SelectValue placeholder="Select issue type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent data-testid="allowance-setup-issue-options">
                        {issueOptions.map(option => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            data-testid={`allowance-setup-issue-option-${option.value}`}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tax Only */}
              <FormField
                control={form.control}
                name="onlyTax"
                render={({ field }) => (
                  <FormItem
                    className="gba:flex gba:items-center gba:gap-2"
                    data-testid="allowance-setup-tax-only-field"
                  >
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isRestrictedEdit}
                        data-testid="allowance-setup-tax-only-checkbox"
                      />
                    </FormControl>
                    <FormLabel className="gba:text-sm gba:font-normal" data-testid="allowance-setup-tax-only-label">
                      Tax Only
                    </FormLabel>
                  </FormItem>
                )}
              />

              {/* Validity Period */}
              <div className="gba:space-y-4">
                <FormField
                  control={form.control}
                  name="activeFrom"
                  rules={{ required: 'Valid From is required' }}
                  render={({ field }) => (
                    <FormItem data-testid="allowance-setup-valid-from-field">
                      <FormLabel data-testid="allowance-setup-valid-from-label">Valid From *</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value || ''}
                          onChange={date => field.onChange(date)}
                          disabled={isRestrictedEdit}
                          data-testid="allowance-setup-valid-from-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="activeTo"
                  render={({ field }) => (
                    <FormItem data-testid="allowance-setup-valid-to-field">
                      <FormLabel data-testid="allowance-setup-valid-to-label">Valid To</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value || ''}
                          onChange={date => field.onChange(date)}
                          data-testid="allowance-setup-valid-to-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Validity Error Message */}
              {validityError && (
                <div className="gba:text-sm gba:text-destructive gba:mt-2" data-testid="allowance-setup-validity-error">
                  {validityError}
                </div>
              )}
            </div>
          </Form>

          <DialogFooter data-testid="allowance-setup-modal-footer">
            <Button
              variant="outline"
              onClick={() => setIsModalVisible(false)}
              disabled={isSaving}
              data-testid="allowance-setup-modal-cancel-button"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} data-testid="allowance-setup-modal-save-button">
              {isSaving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AllowanceSetupTab
