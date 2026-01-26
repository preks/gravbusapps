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
  PiCheck,
  PiX,
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
import { formatDateForInput, formatDate, checkPeriodUniqueness } from '../../../utils'
import {
  validateAmountAndPercentage,
  validateAllowanceCodeDates,
  transformAllowanceCodeForUnrestrictedUpdate,
  transformAllowanceCodeForRestrictedUpdate,
  transformAllowanceCodeForCreate,
  transformAllowanceCodeFromAPI,
  getCodeUniquenessErrorMessage,
  getValidityDatesFromExisting,
  type AllowanceCodeSaveData
} from '../utils'
import { useAllowanceCodeUsageCheck, useTableSorting, createFieldMappings } from '../hooks'
import { TravelLocation, TravelLocationLabels } from '../../../types/ExpenseEnums'

interface AllowanceCodeTabProps {
  ruleId: string
  accessToken: string
  activeFrom: string
  activeTo?: string
}

interface AllowanceRegionRule {
  id: string
  code: string
  name: string
  travelRegionSetRef?: string
}

interface TravelRegionSet {
  id: string
  code: string
  value: string
}

interface AllowanceCode {
  id: string
  code: string
  name: string
  reimbursable: boolean
  amount?: number
  calculation?: string
  expenseGroup: {
    id: string
    value: string
    code: string
  }
  firstAllowanceRegionRuleId?: string
  firstAllowanceRegionRulePercent?: number
  firstAllowanceRegionRule?: AllowanceRegionRule
  secondAllowanceRegionRuleId?: string
  secondAllowanceRegionRulePercent?: number
  secondAllowanceRegionRule?: AllowanceRegionRule
  firstWageCode?: string
  secondWageCode?: string
  validFrom: string
  validTo?: string
  version?: number
  isDeleted: boolean
  businessKey?: string
  additionalProperties?: Record<string, unknown>
  codeOrder?: number
  travelLocation?: string
}

interface AllowanceCodeFormData {
  id?: string
  code: string
  name: string
  reimbursable: boolean
  amount?: number
  calculation?: string
  expenseGroupRef?: string
  firstAllowanceRegionRuleId?: string
  firstAllowanceRegionRulePercent?: number
  secondAllowanceRegionRuleId?: string
  secondAllowanceRegionRulePercent?: number
  firstWageCode?: string
  travelLocation?: string
  validFrom: string
  validTo?: string
  version?: number
}

const AllowanceCodeTab: React.FC<AllowanceCodeTabProps> = ({ ruleId, accessToken, activeFrom, activeTo }) => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [allowanceCodes, setAllowanceCodes] = useState<AllowanceCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingItem, setEditingItem] = useState<AllowanceCode | null>(null)

  // formatDateForInput is imported from shared utils

  // i18n translations
  const amountPercentageHelperText = getTranslationFromI18nKeyAndLabel(
    'expense-settings:amount_percentage_helper',
    'Either Amount or Percentage (above 0%) is required, but not both'
  )

  const form = useForm<AllowanceCodeFormData>({
    defaultValues: {
      code: '',
      name: '',
      reimbursable: true,
      amount: undefined,
      calculation: '',
      expenseGroupRef: 'ExpenseGroup:v1:ALLOWANCE', // Always ALLOWANCE for allowance codes
      firstAllowanceRegionRuleId: '',
      firstAllowanceRegionRulePercent: undefined,
      secondAllowanceRegionRuleId: '',
      secondAllowanceRegionRulePercent: undefined,
      firstWageCode: '',
      travelLocation: TravelLocation.BOTH, // Default to BOTH (Home & Abroad)
      validFrom: formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD'),
      validTo: formatDateForInput(activeTo) || '9999-12-31'
    }
  })

  // Filter state for travel region set (not saved, just for filtering region rules)
  const [filterTravelRegionSetId, setFilterTravelRegionSetId] = useState<string>('')

  // Local state for percentage input to allow typing "-" at the start
  const [percentageInputValue, setPercentageInputValue] = useState<string>('')

  // Usage check hook
  const { allowanceCodeUsageMap } = useAllowanceCodeUsageCheck({ accessToken, allowanceCodes })

  // Restricted edit state
  const [isRestrictedEdit, setIsRestrictedEdit] = useState(false)
  const [isCheckingUsage, setIsCheckingUsage] = useState(false)

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<AllowanceCode | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Calculation catalog options
  const [calculationOptions, setCalculationOptions] = useState<{ id: string; code: string; value: string }[]>([])

  // Travel Region Set options
  const [travelRegionSets, setTravelRegionSets] = useState<TravelRegionSet[]>([])

  // Allowance Region Rule options
  const [allowanceRegionRules, setAllowanceRegionRules] = useState<AllowanceRegionRule[]>([])

  // Filtered region rules based on selected travel region set
  const [filteredRegionRules, setFilteredRegionRules] = useState<AllowanceRegionRule[]>([])

  // Memoize field mappings to prevent unnecessary recalculations
  const fieldMappings = useMemo(
    () => ({
      code: createFieldMappings.string((a: AllowanceCode) => a.code),
      name: createFieldMappings.string((a: AllowanceCode) => a.name),
      reimbursable: createFieldMappings.boolean((a: AllowanceCode) => a.reimbursable),
      amount: createFieldMappings.number((a: AllowanceCode) => a.amount),
      activeFrom: createFieldMappings.date((a: AllowanceCode) => a.validFrom),
      activeTo: createFieldMappings.date((a: AllowanceCode) => a.validTo, '9999-12-31'),
      travelLocation: createFieldMappings.travelLocation((a: AllowanceCode) => a.travelLocation),
      regionRule: createFieldMappings.nested((a: AllowanceCode) => a.firstAllowanceRegionRule),
      percentage: createFieldMappings.number((a: AllowanceCode) => a.firstAllowanceRegionRulePercent),
      calculation: createFieldMappings.calculation((a: AllowanceCode) => a.calculation, calculationOptions),
      expenseGroup: createFieldMappings.nested((a: AllowanceCode) => a.expenseGroup)
    }),
    [calculationOptions]
  )

  // Sorting - using shared hook (single source of truth)
  const sorting = useTableSorting<AllowanceCode>({
    defaultSortField: 'code',
    defaultSortOrder: 'ASC',
    data: allowanceCodes,
    fieldMappings
  })

  // Set up client
  expenseSettingsClient.setAccessToken(accessToken)

  // Fetch calculation catalog options
  const fetchCalculationOptions = useCallback(async () => {
    try {
      const query = `
        query GetExpenseAllowanceCalculationCatalog {
          CatalogEntry(
            where: {
              catalog: {
                identifier: { _eq: "ExpenseAllowanceCalculation" }
                version: { _eq: "v1" }
              }
            }
            orderBy: { code: ASC }
          ) {
            id
            code
            value
          }
        }
      `
      const result = await graphqlClient.request<{ CatalogEntry: { id: string; code: string; value: string }[] }>(query)
      setCalculationOptions(result.CatalogEntry || [])
    } catch (error) {
      console.error('Failed to fetch calculation options:', error)
    }
  }, [graphqlClient])

  // Fetch travel region sets
  const fetchTravelRegionSets = useCallback(async () => {
    try {
      const query = `
        query GetTravelRegionSets {
          CatalogEntry(
            where: {
              catalog: { 
                identifier: { _eq: "TravelRegionSet" }, 
                version: { _eq: "v1" } 
              },
              isDeleted: { _eq: false }
            }
            orderBy: { code: ASC }
          ) {
            id
            code
            value
          }
        }
      `
      const result = await graphqlClient.request<{ CatalogEntry: TravelRegionSet[] }>(query)
      setTravelRegionSets(result.CatalogEntry || [])
    } catch (error) {
      console.error('Failed to fetch travel region sets:', error)
    }
  }, [graphqlClient])

  // Fetch allowance region rules
  const fetchAllowanceRegionRules = useCallback(async () => {
    try {
      const query = `
        query GetAllowanceRegionRules {
          AllowanceRegionRule(
            where: { isDeleted: { _eq: false } }
            orderBy: { name: ASC }
          ) {
            id
            code
            name
            travelRegionSetRef
          }
        }
      `
      const result = await graphqlClient.request<{ AllowanceRegionRule: AllowanceRegionRule[] }>(query)
      setAllowanceRegionRules(result.AllowanceRegionRule || [])
    } catch (error) {
      console.error('Failed to fetch allowance region rules:', error)
    }
  }, [graphqlClient])

  const fetchAllowanceCodes = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const query = `
        query GetExpenseRuleAllowanceCodes($ruleId: uuid!) {
          ExpenseRule(where: { id: { _eq: $ruleId } }) {
            id
            code
            name
            expenseRuleAllowanceCode(where: { isDeleted: { _eq: false } }, orderBy: { code: ASC }) {
              id
              code
              name
              amount
              calculation {
                id
                code
                value
              }
              calculationRef
              activeFrom
              activeTo
              version
              additionalProperties
              businessKey
              codeOrder
              travelLocation
              reimbursable
              firstAllowanceRegionRuleId
              firstAllowanceRegionRulePercent
              firstAllowanceRegionRule {
                id
                code
                name
              }
              secondAllowanceRegionRuleId
              secondAllowanceRegionRulePercent
              secondAllowanceRegionRule {
                id
                code
                name
              }
              firstWageCode
              secondWageCode
              expenseGroup {
                id
                value
                code
              }
            }
          }
        }
      `

      const result = await graphqlClient.request<{ ExpenseRule: { expenseRuleAllowanceCode: any[] }[] }>(query, {
        ruleId
      })

      const expenseRule = result.ExpenseRule?.[0]
      const codes = expenseRule?.expenseRuleAllowanceCode || []

      const transformedCodes: AllowanceCode[] = codes.map(transformAllowanceCodeFromAPI)

      setAllowanceCodes(transformedCodes)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load allowance codes')
    } finally {
      setIsLoading(false)
    }
  }, [ruleId, graphqlClient])

  // Sorted data is provided by useTableSorting hook (single source of truth)
  const sortedAllowanceCodes = sorting.sortedData || allowanceCodes

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchAllowanceCodes()
      fetchCalculationOptions()
      fetchTravelRegionSets()
      fetchAllowanceRegionRules()
    }
  }, [
    ruleId,
    accessToken,
    fetchAllowanceCodes,
    fetchCalculationOptions,
    fetchTravelRegionSets,
    fetchAllowanceRegionRules
  ])

  // Auto-set filter based on first existing allowance code's region rule
  useEffect(() => {
    if (allowanceCodes.length > 0 && allowanceRegionRules.length > 0) {
      // Find the first code that has a region rule
      const firstCodeWithRule = allowanceCodes.find(code => code.firstAllowanceRegionRuleId)
      if (firstCodeWithRule) {
        const existingRule = allowanceRegionRules.find(r => r.id === firstCodeWithRule.firstAllowanceRegionRuleId)
        if (existingRule?.travelRegionSetRef) {
          setFilterTravelRegionSetId(existingRule.travelRegionSetRef)
        }
      }
    }
  }, [allowanceCodes, allowanceRegionRules])

  // Filter region rules based on selected travel region set
  useEffect(() => {
    // Sort function for alphabetical ordering by name
    const sortByName = (a: AllowanceRegionRule, b: AllowanceRegionRule) =>
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })

    if (filterTravelRegionSetId) {
      // Filter region rules by selected travel region set and sort alphabetically
      const filtered = allowanceRegionRules
        .filter(rule => rule.travelRegionSetRef === filterTravelRegionSetId)
        .sort(sortByName)
      setFilteredRegionRules(filtered)

      // Clear region rule selection if it's not in the filtered list
      const currentRegionRuleId = form.getValues('firstAllowanceRegionRuleId')
      if (currentRegionRuleId && !filtered.some(r => r.id === currentRegionRuleId)) {
        form.setValue('firstAllowanceRegionRuleId', '')
      }
    } else {
      // If no travel region set selected, show all region rules sorted alphabetically
      setFilteredRegionRules([...allowanceRegionRules].sort(sortByName))
    }
  }, [filterTravelRegionSetId, allowanceRegionRules, form])

  // Check if travel region set filter should be locked
  // Editable when: no codes exist OR editing when there's only 1 code
  // Locked when: adding new codes (codes exist) OR editing when multiple codes exist
  const isEditingOnlyCode = editingItem && allowanceCodes.length === 1
  const isTravelRegionSetLocked = allowanceCodes.length > 0 && !isEditingOnlyCode

  const handleAdd = () => {
    setEditingItem(null)
    setIsRestrictedEdit(false)
    setPercentageInputValue('') // Reset percentage input state

    // Get validity dates using shared utility (copies from first existing entry if available)
    const { validFrom, validTo } = getValidityDatesFromExisting(allowanceCodes, activeFrom, activeTo)

    form.reset({
      code: '',
      name: '',
      reimbursable: true,
      amount: 0,
      calculation: '',
      expenseGroupRef: 'ExpenseGroup:v1:ALLOWANCE', // Always ALLOWANCE for allowance codes
      firstAllowanceRegionRuleId: '',
      firstAllowanceRegionRulePercent: 0,
      secondAllowanceRegionRuleId: '',
      secondAllowanceRegionRulePercent: 0,
      firstWageCode: '',
      travelLocation: TravelLocation.BOTH, // Default to BOTH (Home & Abroad)
      validFrom,
      validTo
    })
    // Keep the travel region set filter - don't reset it between adds
    setIsModalVisible(true)
  }

  const handleEdit = async (record: AllowanceCode) => {
    setIsCheckingUsage(true)

    try {
      // Check if allowance code is used
      const isUsed = allowanceCodeUsageMap[record.id] || false
      setIsRestrictedEdit(isUsed)

      // Set percentage input value from record
      const percentValue = record.firstAllowanceRegionRulePercent ?? 0
      setPercentageInputValue(percentValue === 0 ? '' : String(percentValue))

      form.reset({
        id: record.id,
        code: record.code,
        name: record.name,
        reimbursable: record.reimbursable,
        amount: record.amount ?? 0,
        calculation: record.calculation,
        expenseGroupRef: 'ExpenseGroup:v1:ALLOWANCE', // Always ALLOWANCE for allowance codes
        firstAllowanceRegionRuleId: record.firstAllowanceRegionRuleId || '',
        firstAllowanceRegionRulePercent: percentValue,
        secondAllowanceRegionRuleId: record.secondAllowanceRegionRuleId || '',
        secondAllowanceRegionRulePercent: record.secondAllowanceRegionRulePercent ?? 0,
        firstWageCode: record.firstWageCode || '',
        travelLocation: (record.travelLocation as TravelLocation) || TravelLocation.BOTH,
        validFrom:
          formatDateForInput(record.validFrom) || formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD'),
        validTo: formatDateForInput(record.validTo),
        version: record.version
      })

      // If editing the only code, set the filter based on its region rule (editable)
      if (allowanceCodes.length === 1 && record.firstAllowanceRegionRuleId) {
        const existingRule = allowanceRegionRules.find(r => r.id === record.firstAllowanceRegionRuleId)
        setFilterTravelRegionSetId(existingRule?.travelRegionSetRef || '')
      }

      setEditingItem(record)
      setIsModalVisible(true)
    } catch {
      toast.error('Failed to load allowance code for editing')
    } finally {
      setIsCheckingUsage(false)
    }
  }

  const handleDeleteClick = (record: AllowanceCode) => {
    setItemToDelete(record)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return

    setIsDeleting(true)
    try {
      await expenseSettingsClient.deleteExpenseRuleAllowanceCode(itemToDelete.id, itemToDelete.version)
      toast.success('Allowance code deleted successfully')
      setDeleteDialogOpen(false)
      setItemToDelete(null)
      await fetchAllowanceCodes()
    } catch (error) {
      toast.error('Failed to delete allowance code')
      console.error('Delete error:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Check if code is unique within the validity period
  // Returns { isDuplicate: boolean, existingName?: string } to allow pre-filling the name
  const checkCodeUniqueness = useCallback(
    async (
      code: string,
      activeFrom: string,
      activeTo: string | undefined,
      excludeId?: string
    ): Promise<{ isDuplicate: boolean; existingName?: string }> => {
      try {
        // Fetch all matching codes and check overlap in JavaScript to avoid GraphQL schema limitations
        const query = `
          query CheckAllowanceCodeUniqueness($ruleId: uuid!, $code: String!, $excludeId: uuid) {
            ExpenseRuleAllowanceCode(
              where: {
                expenseRuleId: { _eq: $ruleId }
                code: { _eq: $code }
                isDeleted: { _eq: false }
                id: { _neq: $excludeId }
              }
            ) {
              id
              code
              name
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
          ExpenseRuleAllowanceCode: { id: string; code: string; name: string; activeFrom: string; activeTo?: string }[]
        }>(query, variables)

        // Check for overlapping periods using shared utility
        const uniquenessResult = checkPeriodUniqueness({
          ruleId,
          excludeId,
          newPeriod: { activeFrom, activeTo },
          existingPeriods: result.ExpenseRuleAllowanceCode,
          componentName: 'AllowanceCodeTab',
          entityName: 'ExpenseRuleAllowanceCode'
        })

        return {
          isDuplicate: uniquenessResult.isDuplicate,
          existingName: uniquenessResult.existingName
        }
      } catch (error) {
        console.error('[AllowanceCodeTab] Error checking code uniqueness:', {
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
        // This is safer than allowing saves when we can't verify uniqueness
        toast.error('Unable to verify code uniqueness. Please try again or contact support if the issue persists.')
        return { isDuplicate: true, existingName: undefined } // Block save on error
      }
    },
    [ruleId, graphqlClient]
  )

  const handleSave = async () => {
    try {
      setIsSaving(true)

      // Clear any previous manual errors
      form.clearErrors(['validFrom', 'validTo', 'amount', 'firstAllowanceRegionRulePercent', 'code'])

      const formValues = form.getValues()

      // Validate mutual exclusivity: Amount and Percentage
      const amountPercentageError = validateAmountAndPercentage(
        formValues.amount,
        formValues.firstAllowanceRegionRulePercent
      )

      if (amountPercentageError) {
        form.setError('amount', { type: 'manual', message: amountPercentageError })
        form.setError('firstAllowanceRegionRulePercent', { type: 'manual', message: amountPercentageError })
        setIsSaving(false)
        return
      }

      // Date validation
      const dateErrors = validateAllowanceCodeDates(formValues.validFrom, formValues.validTo, activeFrom, activeTo)

      if (dateErrors.length > 0) {
        dateErrors.forEach(err => {
          form.setError(err.field, { type: 'manual', message: err.message })
        })
        setIsSaving(false)
        return
      }

      // Check code uniqueness within overlapping validity periods
      const uniquenessCheck = await checkCodeUniqueness(
        formValues.code,
        formValues.validFrom,
        formValues.validTo,
        editingItem?.id
      )

      if (uniquenessCheck.isDuplicate) {
        if (uniquenessCheck.existingName) {
          form.setValue('name', uniquenessCheck.existingName)
        }
        form.setError('code', {
          type: 'manual',
          message: getCodeUniquenessErrorMessage(uniquenessCheck.existingName)
        })
        setIsSaving(false)
        return
      }

      // Build saveData based on edit mode
      const isUpdate = !!editingItem
      let saveData: AllowanceCodeSaveData

      if (isUpdate) {
        saveData = isRestrictedEdit
          ? transformAllowanceCodeForRestrictedUpdate(formValues, editingItem, ruleId)
          : transformAllowanceCodeForUnrestrictedUpdate(formValues, editingItem, ruleId)
      } else {
        saveData = transformAllowanceCodeForCreate(formValues, ruleId)
      }

      await expenseSettingsClient.saveExpenseRuleAllowanceCode(saveData)
      toast.success(`Allowance code ${editingItem ? 'updated' : 'created'} successfully`)
      setIsModalVisible(false)
      setIsRestrictedEdit(false)
      await fetchAllowanceCodes()
    } catch (error) {
      const formValues = form.getValues()
      console.error('[AllowanceCodeTab] handleSave - Save error:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        formValues,
        editingItemId: editingItem?.id
      })
      toast.error(`Failed to ${editingItem ? 'update' : 'create'} allowance code`)
    } finally {
      setIsSaving(false)
    }
  }

  // Removed Ant Design columns definition - using NW design system Table now

  if (isLoading) {
    return (
      <div
        data-testid="allowance-code-tab-loading"
        className="gba:flex gba:justify-center gba:items-center gba:min-h-64"
      >
        <Spinner className="gba:w-8 gba:h-8" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="allowance-code-tab-error">
        <AlertDescription>
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
            <div>
              <div className="gba:font-semibold gba:mb-1">Error Loading Allowance Codes</div>
              <div className="gba:text-sm">{error}</div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAllowanceCodes} data-testid="allowance-code-retry-button">
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div data-testid="allowance-code-tab">
      <Toaster />

      <Card data-testid="allowance-code-card">
        <CardHeader data-testid="allowance-code-card-header">
          <div className="gba:flex gba:justify-between gba:items-center">
            <div className="gba:flex gba:items-center gba:gap-2">
              <CardTitle data-testid="allowance-code-card-title">Allowance Codes</CardTitle>
              <Badge variant="default" data-testid="allowance-code-count-badge">
                {allowanceCodes.length} codes
              </Badge>
            </div>
            <Button onClick={handleAdd} data-testid="add-allowance-code-button">
              <PiPlus className="gba:mr-2" />
              Add Allowance Code
            </Button>
          </div>
        </CardHeader>

        <CardContent data-testid="allowance-code-card-content">
          {sortedAllowanceCodes.length > 0 ? (
            <div className="gba:overflow-x-auto">
              <Table data-testid="allowance-codes-table">
                <TableHeader data-testid="allowance-codes-table-header">
                  <TableRow data-testid="allowance-codes-table-header-row">
                    <TableHead className="gba:w-[60px]" data-testid="allowance-codes-table-header-actions">
                      ACTIONS
                    </TableHead>
                    <TableHead
                      className="gba:w-[150px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                      onClick={() => sorting.handleSort('code')}
                      data-testid="allowance-codes-table-header-code"
                    >
                      <div className="gba:flex gba:items-center">
                        CODE
                        {sorting.renderSortIcon('code')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[180px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                      onClick={() => sorting.handleSort('name')}
                      data-testid="allowance-codes-table-header-name"
                    >
                      <div className="gba:flex gba:items-center">
                        NAME
                        {sorting.renderSortIcon('name')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[120px] gba:text-center gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                      onClick={() => sorting.handleSort('reimbursable')}
                      data-testid="allowance-codes-table-header-reimbursable"
                    >
                      <div className="gba:flex gba:items-center gba:justify-center">
                        REIMBURSABLE
                        {sorting.renderSortIcon('reimbursable')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[100px] gba:text-right gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                      onClick={() => sorting.handleSort('amount')}
                      data-testid="allowance-codes-table-header-amount"
                    >
                      <div className="gba:flex gba:items-center gba:justify-end">
                        AMOUNT
                        {sorting.renderSortIcon('amount')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[120px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                      onClick={() => sorting.handleSort('travelLocation')}
                      data-testid="allowance-codes-table-header-travel-location"
                    >
                      <div className="gba:flex gba:items-center">
                        TRAVEL LOCATION
                        {sorting.renderSortIcon('travelLocation')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[180px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                      onClick={() => sorting.handleSort('regionRule')}
                      data-testid="allowance-codes-table-header-region-rule"
                    >
                      <div className="gba:flex gba:items-center">
                        REGION RULE
                        {sorting.renderSortIcon('regionRule')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[100px] gba:text-center gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                      onClick={() => sorting.handleSort('percentage')}
                      data-testid="allowance-codes-table-header-percentage"
                    >
                      <div className="gba:flex gba:items-center gba:justify-center">
                        PERCENTAGE
                        {sorting.renderSortIcon('percentage')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[120px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                      onClick={() => sorting.handleSort('calculation')}
                      data-testid="allowance-codes-table-header-calculation"
                    >
                      <div className="gba:flex gba:items-center">
                        CALCULATION
                        {sorting.renderSortIcon('calculation')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[130px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                      onClick={() => sorting.handleSort('expenseGroup')}
                      data-testid="allowance-codes-table-header-expense-group"
                    >
                      <div className="gba:flex gba:items-center">
                        EXPENSE GROUP
                        {sorting.renderSortIcon('expenseGroup')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[120px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                      onClick={() => sorting.handleSort('activeFrom')}
                      data-testid="allowance-codes-table-header-valid-from"
                    >
                      <div className="gba:flex gba:items-center">
                        VALID FROM
                        {sorting.renderSortIcon('activeFrom')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[120px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                      onClick={() => sorting.handleSort('activeTo')}
                      data-testid="allowance-codes-table-header-valid-to"
                    >
                      <div className="gba:flex gba:items-center">
                        VALID TO
                        {sorting.renderSortIcon('activeTo')}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody data-testid="allowance-codes-table-body">
                  {sortedAllowanceCodes.map(record => (
                    <TableRow key={record.id} data-testid={`allowance-code-row-${record.id}`}>
                      {/* Actions Column */}
                      <TableCell data-testid={`allowance-code-actions-cell-${record.id}`}>
                        <div className="gba:flex gba:justify-start gba:gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={e => e.stopPropagation()}
                                disabled={isCheckingUsage}
                                data-testid={`allowance-code-action-${record.id}`}
                              >
                                {isCheckingUsage ? (
                                  <Spinner className="gba:h-4 gba:w-4" />
                                ) : (
                                  <PiDotsThreeVertical className="gba:h-4 gba:w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={e => {
                                  e.stopPropagation()
                                  handleEdit(record)
                                }}
                                data-testid={`allowance-code-edit-${record.id}`}
                              >
                                <PiPencil className="gba:h-4 gba:w-4 gba:mr-2" />
                                Update
                              </DropdownMenuItem>
                              {/* Always show delete option, but disable if allowance code is used */}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={e => {
                                  e.stopPropagation()
                                  if (!allowanceCodeUsageMap[record.id]) {
                                    handleDeleteClick(record)
                                  }
                                }}
                                className="gba:text-destructive"
                                disabled={allowanceCodeUsageMap[record.id]}
                                title={
                                  allowanceCodeUsageMap[record.id]
                                    ? 'Cannot delete - this code is used in allowance setups'
                                    : 'Delete this allowance code'
                                }
                                data-testid={`allowance-code-delete-${record.id}`}
                              >
                                <PiTrash className="gba:h-4 gba:w-4 gba:mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>

                      {/* Code Column */}
                      <TableCell data-testid={`allowance-code-code-cell-${record.id}`}>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <PiCode className="gba:text-primary" data-testid={`allowance-code-code-icon-${record.id}`} />
                          <span
                            className="gba:font-mono gba:font-medium"
                            data-testid={`allowance-code-code-text-${record.id}`}
                          >
                            {record.code}
                          </span>
                        </div>
                      </TableCell>

                      {/* Name Column */}
                      <TableCell data-testid={`allowance-code-name-cell-${record.id}`}>
                        <span data-testid={`allowance-code-name-text-${record.id}`}>{record.name}</span>
                      </TableCell>

                      {/* Reimbursable Column */}
                      <TableCell
                        className="gba:text-center"
                        data-testid={`allowance-code-reimbursable-cell-${record.id}`}
                      >
                        {record.reimbursable ? (
                          <PiCheck
                            className="gba:text-success gba:text-lg gba:inline-block"
                            data-testid={`allowance-code-reimbursable-check-${record.id}`}
                          />
                        ) : (
                          <PiX
                            className="gba:text-muted-foreground gba:text-lg gba:inline-block"
                            data-testid={`allowance-code-reimbursable-x-${record.id}`}
                          />
                        )}
                      </TableCell>

                      {/* Amount Column */}
                      <TableCell className="gba:text-right" data-testid={`allowance-code-amount-cell-${record.id}`}>
                        <span
                          className="gba:font-mono gba:font-medium"
                          data-testid={`allowance-code-amount-text-${record.id}`}
                        >
                          {record.amount ? record.amount.toFixed(1) : '-'}
                        </span>
                      </TableCell>

                      {/* Travel Location Column */}
                      <TableCell data-testid={`allowance-code-travel-location-cell-${record.id}`}>
                        {record.travelLocation ? (
                          <Badge variant="secondary" data-testid={`allowance-code-travel-location-badge-${record.id}`}>
                            {TravelLocationLabels[record.travelLocation as TravelLocation] || record.travelLocation}
                          </Badge>
                        ) : (
                          <span
                            className="gba:text-muted-foreground"
                            data-testid={`allowance-code-travel-location-empty-${record.id}`}
                          >
                            -
                          </span>
                        )}
                      </TableCell>

                      {/* Region Rule Column */}
                      <TableCell data-testid={`allowance-code-region-rule-cell-${record.id}`}>
                        <span
                          className="gba:text-sm gba:text-muted-foreground"
                          data-testid={`allowance-code-region-rule-text-${record.id}`}
                        >
                          {record.firstAllowanceRegionRule?.name || '-'}
                        </span>
                      </TableCell>

                      {/* Percentage Column */}
                      <TableCell
                        className="gba:text-center"
                        data-testid={`allowance-code-percentage-cell-${record.id}`}
                      >
                        <Badge
                          variant={
                            (record.firstAllowanceRegionRulePercent || 0) > 0
                              ? 'default'
                              : (record.firstAllowanceRegionRulePercent || 0) < 0
                                ? 'destructive'
                                : 'secondary'
                          }
                          data-testid={`allowance-code-percentage-badge-${record.id}`}
                        >
                          {record.firstAllowanceRegionRulePercent || 0}%
                        </Badge>
                      </TableCell>

                      {/* Calculation Column */}
                      <TableCell data-testid={`allowance-code-calculation-cell-${record.id}`}>
                        <span
                          className="gba:text-sm gba:text-muted-foreground"
                          data-testid={`allowance-code-calculation-text-${record.id}`}
                        >
                          {calculationOptions.find(opt => opt.id === record.calculation)?.value || '-'}
                        </span>
                      </TableCell>

                      {/* Expense Group Column */}
                      <TableCell data-testid={`allowance-code-expense-group-cell-${record.id}`}>
                        <Badge variant="default" data-testid={`allowance-code-expense-group-badge-${record.id}`}>
                          {record.expenseGroup?.value || 'Not set'}
                        </Badge>
                      </TableCell>

                      {/* Valid From Column */}
                      <TableCell data-testid={`allowance-code-valid-from-cell-${record.id}`}>
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <PiCalendar
                            className="gba:text-muted-foreground"
                            data-testid={`allowance-code-valid-from-icon-${record.id}`}
                          />
                          <span className="gba:text-sm" data-testid={`allowance-code-valid-from-text-${record.id}`}>
                            {formatDate(record.validFrom)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Valid To Column */}
                      <TableCell data-testid={`allowance-code-valid-to-cell-${record.id}`}>
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <PiCalendar
                            className="gba:text-muted-foreground"
                            data-testid={`allowance-code-valid-to-icon-${record.id}`}
                          />
                          <span className="gba:text-sm" data-testid={`allowance-code-valid-to-text-${record.id}`}>
                            {record.validTo ? formatDate(record.validTo) : '∞'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div
              className="gba:text-center gba:py-8 gba:text-muted-foreground"
              data-testid="allowance-codes-empty-state"
            >
              <p className="gba:m-0" data-testid="allowance-codes-empty-message">
                No allowance codes configured
              </p>
              <p className="gba:text-xs gba:mt-1" data-testid="allowance-codes-empty-hint">
                Click "Add Allowance Code" to create your first code
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog
        open={isModalVisible}
        onOpenChange={open => {
          setIsModalVisible(open)
          if (!open) {
            setIsRestrictedEdit(false)
          }
        }}
      >
        <DialogContent
          className="gba:max-w-3xl gba:max-h-[90vh] gba:overflow-y-auto"
          data-testid="allowance-code-modal"
        >
          <DialogHeader data-testid="allowance-code-modal-header">
            <DialogTitle data-testid="allowance-code-modal-title">
              {editingItem ? 'Edit' : 'Add'} Allowance Code
            </DialogTitle>
          </DialogHeader>

          {/* Restricted edit warning */}
          {isRestrictedEdit && (
            <Alert
              className="gba:mb-4 gba:border-warning gba:bg-warning-secondary"
              data-testid="allowance-code-restricted-alert"
            >
              <PiWarning className="gba:h-4 gba:w-4 gba:text-warning" />
              <AlertDescription>
                This allowance code is used in expense items. Only &quot;Valid To&quot; can be edited.
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <div data-testid="allowance-code-form" className="gba:space-y-4">
              <div className="gba:space-y-4">
                {/* Code */}
                <FormField
                  control={form.control}
                  name="code"
                  rules={{ required: 'Allowance Code is required' }}
                  render={({ field }) => (
                    <FormItem data-testid="allowance-code-code-field">
                      <FormLabel data-testid="allowance-code-code-label">Allowance Code *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., A-FULL, L-FULL"
                          disabled={isRestrictedEdit}
                          data-testid="allowance-code-code-input"
                          onBlur={async () => {
                            field.onBlur()
                            const codeValue = form.getValues('code')
                            const validFrom = form.getValues('validFrom')
                            const validTo = form.getValues('validTo')

                            // Only validate if code is not empty
                            if (codeValue?.trim()) {
                              const uniquenessCheck = await checkCodeUniqueness(
                                codeValue,
                                validFrom,
                                validTo,
                                editingItem?.id
                              )

                              if (uniquenessCheck.isDuplicate) {
                                // Pre-fill the name with the existing name if available
                                if (uniquenessCheck.existingName) {
                                  form.setValue('name', uniquenessCheck.existingName)
                                }
                                form.setError('code', {
                                  type: 'manual',
                                  message:
                                    'This code already exists with an overlapping validity period. Please use a different code or adjust the validity dates.'
                                })
                              } else {
                                // Clear error if code is now unique
                                form.clearErrors('code')
                              }
                            }
                          }}
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
                    <FormItem data-testid="allowance-code-name-field">
                      <FormLabel data-testid="allowance-code-name-label">Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Abroad Full Day"
                          disabled={isRestrictedEdit}
                          data-testid="allowance-code-name-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Expense Group - Always ALLOWANCE (read-only display) */}
                <FormItem data-testid="allowance-code-expense-group-field">
                  <FormLabel data-testid="allowance-code-expense-group-label">Expense Group</FormLabel>
                  <FormControl>
                    <Input
                      value="ALLOWANCE"
                      disabled
                      className="gba:bg-muted gba:cursor-not-allowed"
                      data-testid="allowance-code-expense-group-input"
                    />
                  </FormControl>
                  <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                    Allowance codes always use the ALLOWANCE expense group
                  </p>
                </FormItem>

                {/* Amount */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem data-testid="allowance-code-amount-field">
                      <FormLabel data-testid="allowance-code-amount-label">Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="e.g. 57.50"
                          value={field.value === 0 ? '' : (field.value ?? '')}
                          onChange={e => {
                            const value = e.target.value
                            if (value === '') {
                              field.onChange(0)
                            } else {
                              const numValue = Number.parseFloat(value)
                              if (!Number.isNaN(numValue)) {
                                field.onChange(numValue)
                              }
                            }
                          }}
                          disabled={isRestrictedEdit}
                          data-testid="allowance-code-amount-input"
                        />
                      </FormControl>
                      <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">{amountPercentageHelperText}</div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Travel Region Set (Filter only - not saved) */}
                <div className="gba:space-y-2" data-testid="allowance-code-travel-region-set-filter">
                  <label className="gba:text-sm gba:font-medium" data-testid="allowance-code-travel-region-set-label">
                    Travel Region Set
                  </label>
                  <Select
                    value={filterTravelRegionSetId || 'all'}
                    onValueChange={value => setFilterTravelRegionSetId(value === 'all' ? '' : value)}
                    disabled={isRestrictedEdit || isTravelRegionSetLocked}
                  >
                    <SelectTrigger data-testid="allowance-code-travel-region-set-select">
                      <SelectValue placeholder="All region rules" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" data-testid="allowance-code-travel-region-set-option-all">
                        All region rules
                      </SelectItem>
                      {travelRegionSets.map(set => (
                        <SelectItem
                          key={set.id}
                          value={set.id}
                          data-testid={`allowance-code-travel-region-set-option-${set.code}`}
                        >
                          {set.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="gba:text-xs gba:text-muted-foreground">
                    {isTravelRegionSetLocked
                      ? 'Locked - edit the first allowance code to change'
                      : 'Select to filter region rules below'}
                  </p>
                </div>

                {/* First Allowance Region Rule */}
                <FormField
                  control={form.control}
                  name="firstAllowanceRegionRuleId"
                  render={({ field }) => (
                    <FormItem data-testid="allowance-code-region-rule-field">
                      <FormLabel data-testid="allowance-code-region-rule-label">Region Rule</FormLabel>
                      <Select
                        value={field.value || 'none'}
                        onValueChange={value => field.onChange(value === 'none' ? '' : value)}
                        disabled={isRestrictedEdit}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="allowance-code-region-rule-select">
                            <SelectValue placeholder="Select region rule" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none" data-testid="allowance-code-region-rule-option-none">
                            None
                          </SelectItem>
                          {filteredRegionRules.map(rule => (
                            <SelectItem
                              key={rule.id}
                              value={rule.id}
                              data-testid={`allowance-code-region-rule-option-${rule.code}`}
                            >
                              {rule.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* First Allowance Region Rule Percent */}
                <FormField
                  control={form.control}
                  name="firstAllowanceRegionRulePercent"
                  render={({ field }) => {
                    // Sync local state with field value when field changes externally
                    const displayValue =
                      percentageInputValue !== '' || field.value === undefined || field.value === 0
                        ? percentageInputValue
                        : String(field.value)

                    return (
                      <FormItem data-testid="allowance-code-percentage-field">
                        <FormLabel data-testid="allowance-code-percentage-label">Percentage</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="e.g. 100"
                            value={displayValue}
                            onChange={e => {
                              const value = e.target.value
                              // Update local state to allow typing "-" and partial numbers
                              setPercentageInputValue(value)

                              // Handle empty string
                              if (value === '') {
                                field.onChange(0)
                                return
                              }

                              // Allow "-" to be typed (user can continue typing negative number)
                              if (value === '-') {
                                // Don't update field yet, just keep the "-" in the input
                                return
                              }

                              // Parse the number (handles negative numbers like "-20")
                              const numValue = Number.parseFloat(value)
                              if (!Number.isNaN(numValue)) {
                                field.onChange(numValue)
                              }
                              // If invalid but starts with "-", allow it temporarily (user is still typing)
                              // This handles cases like "-" or "-." while user is typing
                            }}
                            onBlur={() => {
                              // When user leaves the field, clear local state if it's invalid
                              const currentValue = percentageInputValue
                              if (currentValue === '' || currentValue === '-') {
                                setPercentageInputValue('')
                                field.onChange(0)
                              } else {
                                const numValue = Number.parseFloat(currentValue)
                                if (Number.isNaN(numValue)) {
                                  // Invalid input, reset to field value
                                  setPercentageInputValue(
                                    field.value === 0 || field.value === undefined ? '' : String(field.value)
                                  )
                                } else {
                                  // Valid number, clear local state to sync with field
                                  setPercentageInputValue('')
                                }
                              }
                            }}
                            disabled={isRestrictedEdit}
                            data-testid="allowance-code-percentage-input"
                          />
                        </FormControl>
                        <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                          {amountPercentageHelperText}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />

                {/* First Wage Code */}
                <FormField
                  control={form.control}
                  name="firstWageCode"
                  render={({ field }) => (
                    <FormItem data-testid="allowance-code-wage-code-field">
                      <FormLabel data-testid="allowance-code-wage-code-label">Wage Code</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ''}
                          placeholder="Enter wage code"
                          disabled={isRestrictedEdit}
                          data-testid="allowance-code-wage-code-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Travel Location */}
                <FormField
                  control={form.control}
                  name="travelLocation"
                  render={({ field }) => (
                    <FormItem data-testid="allowance-code-travel-location-field">
                      <FormLabel data-testid="allowance-code-travel-location-label">Travel Location</FormLabel>
                      <Select
                        value={field.value || TravelLocation.BOTH}
                        onValueChange={field.onChange}
                        disabled={isRestrictedEdit}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="allowance-code-travel-location-select">
                            <SelectValue placeholder="Select travel location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent data-testid="allowance-code-travel-location-options">
                          <SelectItem
                            value={TravelLocation.HOME}
                            data-testid="allowance-code-travel-location-option-home"
                          >
                            {TravelLocationLabels[TravelLocation.HOME]}
                          </SelectItem>
                          <SelectItem
                            value={TravelLocation.ABROAD}
                            data-testid="allowance-code-travel-location-option-abroad"
                          >
                            {TravelLocationLabels[TravelLocation.ABROAD]}
                          </SelectItem>
                          <SelectItem
                            value={TravelLocation.BOTH}
                            data-testid="allowance-code-travel-location-option-both"
                          >
                            {TravelLocationLabels[TravelLocation.BOTH]}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Calculation */}
                <FormField
                  control={form.control}
                  name="calculation"
                  render={({ field }) => (
                    <FormItem data-testid="allowance-code-calculation-field">
                      <FormLabel data-testid="allowance-code-calculation-label">Calculation</FormLabel>
                      <Select
                        value={field.value || 'none'}
                        onValueChange={value => field.onChange(value === 'none' ? '' : value)}
                        disabled={isRestrictedEdit}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="allowance-code-calculation-select">
                            <SelectValue placeholder="Select calculation method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none" data-testid="allowance-code-calculation-option-none">
                            None
                          </SelectItem>
                          {calculationOptions.map(option => (
                            <SelectItem
                              key={option.id}
                              value={option.id}
                              data-testid={`allowance-code-calculation-option-${option.code}`}
                            >
                              {option.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Empty cell for grid alignment */}
                <div></div>

                {/* Valid From */}
                <FormField
                  control={form.control}
                  name="validFrom"
                  rules={{ required: 'Valid From is required' }}
                  render={({ field }) => (
                    <FormItem data-testid="allowance-code-valid-from-field">
                      <FormLabel data-testid="allowance-code-valid-from-label">Valid From *</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value || ''}
                          onChange={date => {
                            field.onChange(date)
                            form.clearErrors('validFrom')
                          }}
                          disabled={isRestrictedEdit}
                          data-testid="allowance-code-valid-from-input"
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
                    <FormItem data-testid="allowance-code-valid-to-field">
                      <FormLabel data-testid="allowance-code-valid-to-label">Valid To</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value || ''}
                          onChange={date => {
                            field.onChange(date)
                            form.clearErrors('validTo')
                          }}
                          data-testid="allowance-code-valid-to-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Reimbursable Switch */}
              <FormField
                control={form.control}
                name="reimbursable"
                render={({ field }) => (
                  <FormItem
                    className="gba:flex gba:items-center gba:justify-between"
                    data-testid="allowance-code-reimbursable-field"
                  >
                    <FormLabel data-testid="allowance-code-reimbursable-label">Reimbursable</FormLabel>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <span
                        className="gba:text-sm gba:text-muted-foreground"
                        data-testid="allowance-code-reimbursable-status"
                      >
                        {field.value ? 'Yes' : 'No'}
                      </span>
                      <FormControl>
                        <NWSwitch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isRestrictedEdit}
                          data-testid="allowance-code-reimbursable-switch"
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </Form>

          <DialogFooter data-testid="allowance-code-modal-footer">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalVisible(false)
                setIsRestrictedEdit(false)
              }}
              disabled={isSaving}
              data-testid="allowance-code-modal-cancel-button"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} data-testid="allowance-code-modal-save-button">
              {isSaving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Allowance Code"
        itemDescription={`the allowance code "${itemToDelete?.code} - ${itemToDelete?.name}"`}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false)
          setItemToDelete(null)
        }}
        testIdPrefix="allowance-code-delete"
      />
    </div>
  )
}

export default AllowanceCodeTab
