import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import {
  Button,
  Badge,
  Card,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  DateInput,
  Textarea
} from '@newwork/nw-design-system'
import { DeleteConfirmationDialog } from '../shared'
import {
  PiPlus,
  PiCalendar,
  PiCar,
  PiPercent,
  PiDotsThreeVertical,
  PiPencil,
  PiTrash,
  PiInfo,
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
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { EnhancedExpenseRuleMileage, MeasurementUnitWithTranslations } from '../../../types/ExpenseRuleTypes'
import { expenseSettingsClient } from '../../../utils/ExpenseSettingsClient'
import { formatDateForInput, checkPeriodUniqueness, formatDate } from '../../../utils'
import { useGetMileageRuleById } from '../../../queries/ExpenseRuleQueries'
import { useTableSorting, createFieldMappings } from '../hooks'

interface MileageRulesTabProps {
  ruleId: string
  accessToken: string
  activeFrom: string
  activeTo?: string
}

interface MileageRuleFormData {
  id?: string
  expenseRuleId: string
  code: string
  name: string
  reimbursable: boolean
  taxCodeRef?: string
  taxValue?: number
  unitPrice?: number
  mileageOrder?: number
  activeFrom: string
  activeTo?: string
  expenseGroupRef?: string
  measurementUnitRef?: string
  mileageRuleId?: string
  version?: number
  additionalProperties?: Record<string, any>
}

interface TaxCodeOption {
  id: string
  value: string
  code: string
}

const MileageRulesTab: React.FC<MileageRulesTabProps> = ({ ruleId, accessToken, activeFrom, activeTo }) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)
  const [mileageRules, setMileageRules] = useState<EnhancedExpenseRuleMileage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)

  // Hook for fetching individual mileage rules
  const { fetchMileageRuleById } = useGetMileageRuleById({ accessToken } as any)

  // TaxCode catalog state
  const [taxCodes, setTaxCodes] = useState<TaxCodeOption[]>([])
  const [catalogsLoading, setCatalogsLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<EnhancedExpenseRuleMileage | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // MileageRule master data state
  const [mileageRuleOptions, setMileageRuleOptions] = useState<Array<{ id: string; code: string; name: string }>>([])
  const [isMileageRulesLoading, setIsMileageRulesLoading] = useState(false)

  // Extract date portion to avoid timezone issues (YYYY-MM-DD format)
  // formatDateForInput is imported from shared utils

  const form = useForm<MileageRuleFormData>({
    defaultValues: {
      expenseRuleId: ruleId,
      code: '',
      name: '',
      reimbursable: true,
      activeFrom: formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD'),
      activeTo: formatDateForInput(activeTo) || '9999-12-31'
    }
  })

  // Pre-loaded usage status for all mileage rules (id -> isUsed)
  const [mileageUsageMap, setMileageUsageMap] = useState<Record<string, boolean>>({})

  // Sorting - using shared hook
  // Memoize field mappings to prevent unnecessary recalculations
  const fieldMappings = useMemo(
    () => ({
      code: createFieldMappings.string((a: EnhancedExpenseRuleMileage) => a.code),
      mileageRule: createFieldMappings.nested((a: EnhancedExpenseRuleMileage) => a.mileageRule),
      reimbursable: createFieldMappings.boolean((a: EnhancedExpenseRuleMileage) => a.reimbursable),
      unitPrice: createFieldMappings.number((a: EnhancedExpenseRuleMileage) => a.unitPrice),
      taxValue: createFieldMappings.number((a: EnhancedExpenseRuleMileage) => a.taxValue),
      expenseGroup: createFieldMappings.nested((a: EnhancedExpenseRuleMileage) => a.expenseGroup),
      activeFrom: createFieldMappings.date((a: EnhancedExpenseRuleMileage) => a.activeFrom)
    }),
    []
  )

  // Sorting - using shared hook (single source of truth)
  const sorting = useTableSorting<EnhancedExpenseRuleMileage>({
    defaultSortField: 'code',
    defaultSortOrder: 'ASC',
    data: mileageRules,
    fieldMappings
  })

  // Restricted edit state
  const [isRestrictedEdit, setIsRestrictedEdit] = useState(false)
  const [isCheckingUsage, setIsCheckingUsage] = useState(false)

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<EnhancedExpenseRuleMileage | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Additional properties JSON state
  const [additionalPropertiesJson, setAdditionalPropertiesJson] = useState<string>('')

  // Set up client
  expenseSettingsClient.setAccessToken(accessToken)

  // Load TaxCode catalog
  const loadTaxCodes = useCallback(async () => {
    setCatalogsLoading(true)
    try {
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'TaxCode', version: 'v1' },
        { limit: 100, offset: 0, returnTotalRecords: true }
      )

      setTaxCodes(
        response.data.map((item: any) => {
          // Extract percentage from value string (e.g., "Input tax 7%" -> 7)
          const percentMatch = item.value.match(/(\d+(?:\.\d+)?)\s*%/)
          const taxPercentage = percentMatch ? parseFloat(percentMatch[1]) : 0

          return {
            id: item.id,
            value: item.value,
            code: item.code,
            taxPercentage // Store the extracted percentage
          }
        })
      )
    } catch (error) {
      console.error('Error loading TaxCode catalog:', error)
    } finally {
      setCatalogsLoading(false)
    }
  }, [catalogClient])

  // Load MileageRule master data
  const loadMileageRules = useCallback(async () => {
    setIsMileageRulesLoading(true)
    try {
      // Build where condition to filter by overlapping validity dates
      const whereConditions: string[] = ['isDeleted: { _eq: false }']

      // Add validity date overlap logic
      // Rule is valid if:
      // 1. Mileage rule's activeTo is null OR activeTo >= expense rule's activeFrom
      // 2. Mileage rule's activeFrom is null OR activeFrom <= expense rule's activeTo (or infinity if no activeTo)
      const expenseRuleActiveTo = activeTo || '9999-12-31'

      whereConditions.push(`_or: [
        { activeFrom: { _isNull: true } },
        { activeFrom: { _lte: "${expenseRuleActiveTo}" } }
      ]`)

      whereConditions.push(`_or: [
        { activeTo: { _isNull: true } },
        { activeTo: { _gte: "${activeFrom}" } }
      ]`)

      const whereClause = `{ _and: [${whereConditions.map(c => `{ ${c} }`).join(', ')}] }`

      const query = `
        query GetMileageRules {
          MileageRule(
            where: ${whereClause}
            orderBy: { code: ASC }
          ) {
            id
            code
            name
          }
        }
      `
      const result = await graphqlClient.request<{ MileageRule: any[] }>(query)
      setMileageRuleOptions(result.MileageRule || [])
    } catch (error) {
      console.error('Error loading MileageRule options:', error)
    } finally {
      setIsMileageRulesLoading(false)
    }
  }, [graphqlClient, activeFrom, activeTo])

  // Load usage status for all mileage rules in a single batched query
  const loadMileageUsageStatus = useCallback(
    async (mileageIds: string[]) => {
      if (mileageIds.length === 0) return

      try {
        const query = `
        query CheckAllMileageUsage($mileageIds: [uuid!]!) {
          planItems: ExpensePlanItem(
            where: { expenseRuleMileageId: { _in: $mileageIds }, isDeleted: { _eq: false } }
          ) { expenseRuleMileageId }
          items: ExpenseItem(
            where: { expenseRuleMileageId: { _in: $mileageIds }, isDeleted: { _eq: false } }
          ) { expenseRuleMileageId }
          positions: ExpensePosition(
            where: { expenseRuleMileageId: { _in: $mileageIds }, isDeleted: { _eq: false } }
          ) { expenseRuleMileageId }
        }
      `

        const result = await graphqlClient.request<{
          planItems: { expenseRuleMileageId: string }[]
          items: { expenseRuleMileageId: string }[]
          positions: { expenseRuleMileageId: string }[]
        }>(query, { mileageIds })

        // Build a set of used mileage IDs
        const usedIds = new Set<string>()
        result.planItems?.forEach(item => usedIds.add(item.expenseRuleMileageId))
        result.items?.forEach(item => usedIds.add(item.expenseRuleMileageId))
        result.positions?.forEach(item => usedIds.add(item.expenseRuleMileageId))

        // Create usage map
        const usageMap: Record<string, boolean> = {}
        mileageIds.forEach(id => {
          usageMap[id] = usedIds.has(id)
        })

        setMileageUsageMap(usageMap)
      } catch (error) {
        console.error('Error loading mileage usage status:', error)
      }
    },
    [graphqlClient]
  )

  const fetchMileageRules = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const query = `
        query GetExpenseRuleMileageRules($ruleId: uuid!) {
          ExpenseRule(where: { id: { _eq: $ruleId } }) {
            id
            code
            name
            expenseRuleMileage(where: { isDeleted: { _eq: false } }, orderBy: { code: ASC }) {
              id
              code
              name
              reimbursable
              taxCodeRef
              taxValue
              unitPrice
              activeFrom
              activeTo
              version
              isDeleted
              expenseGroup {
                id
                value
                code
                translations {
                  value
                  localeCode
                }
              }
              measurementUnit {
                id
                value
                code
                translations {
                  value
                  localeCode
                }
              }
              mileageRule {
                id
                name
                code
              }
              additionalProperties
              businessKey
            }
          }
        }
      `

      const result = await graphqlClient.request<{
        ExpenseRule: { expenseRuleMileage: EnhancedExpenseRuleMileage[] }[]
      }>(query, { ruleId })

      const expenseRule = result.ExpenseRule?.[0]
      const rules = expenseRule?.expenseRuleMileage || []
      setMileageRules(rules)

      // Load usage status for all mileage rules
      if (rules.length > 0) {
        await loadMileageUsageStatus(rules.map(r => r.id))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mileage rules')
      console.error('Error fetching mileage rules:', err)
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, ruleId, loadMileageUsageStatus])

  // Sorted data is provided by useTableSorting hook (single source of truth)
  const sortedMileageRules = sorting.sortedData || mileageRules

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchMileageRules()
      loadTaxCodes()
      loadMileageRules()
    }
  }, [ruleId, accessToken, fetchMileageRules, loadTaxCodes, loadMileageRules])

  const handleAdd = () => {
    setEditingItem(null)
    setIsRestrictedEdit(false)

    // ALWAYS inherit validity period from parent Expense Rule
    const validFromValue = formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD')
    const validToValue = formatDateForInput(activeTo) || '9999-12-31'

    form.reset({
      expenseRuleId: ruleId,
      code: '',
      name: '',
      reimbursable: true,
      taxValue: 0,
      unitPrice: 0,
      expenseGroupRef: 'ExpenseGroup:v1:OTHER_TRANSPORT',
      activeFrom: validFromValue,
      activeTo: validToValue
    })
    setAdditionalPropertiesJson('')
    setIsModalVisible(true)
  }

  const handleEdit = async (record: EnhancedExpenseRuleMileage) => {
    setIsCheckingUsage(true)

    try {
      // Check if rule is used
      const isUsed = mileageUsageMap[record.id] || false
      setIsRestrictedEdit(isUsed)

      setEditingItem(record)

      // Fetch fresh data for this specific item
      const freshData = await fetchMileageRuleById(record.id)

      form.reset({
        id: freshData.id,
        expenseRuleId: ruleId,
        code: freshData.code,
        name: freshData.name,
        reimbursable: freshData.reimbursable,
        taxCodeRef: freshData.taxCodeRef,
        taxValue: freshData.taxValue,
        unitPrice: freshData.unitPrice,
        activeFrom:
          formatDateForInput(freshData.activeFrom) || formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD'),
        activeTo: formatDateForInput(freshData.activeTo),
        expenseGroupRef: 'ExpenseGroup:v1:OTHER_TRANSPORT',
        measurementUnitRef: freshData.measurementUnit?.id,
        mileageRuleId: freshData.mileageRule?.id,
        version: freshData.version
      })

      // Set additional properties JSON
      setAdditionalPropertiesJson(
        freshData.additionalProperties ? JSON.stringify(freshData.additionalProperties, null, 2) : ''
      )

      setIsModalVisible(true)
    } catch (err) {
      toast.error('Failed to load latest data for editing')
      console.error('Edit load error:', err)
    } finally {
      setIsCheckingUsage(false)
    }
  }

  const handleDeleteClick = (record: EnhancedExpenseRuleMileage) => {
    setItemToDelete(record)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return

    setIsDeleting(true)
    try {
      await expenseSettingsClient.deleteExpenseRuleMileage(itemToDelete.id, itemToDelete.version)
      toast.success('Mileage rule deleted successfully')
      setDeleteDialogOpen(false)
      setItemToDelete(null)
      await fetchMileageRules()
    } catch (err) {
      toast.error('Failed to delete mileage rule')
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
          query CheckMileageCodeUniqueness($ruleId: uuid!, $code: String!, $excludeId: uuid) {
            ExpenseRuleMileage(
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
          ExpenseRuleMileage: { id: string; code: string; activeFrom: string; activeTo?: string }[]
        }>(query, variables)

        // Check for overlapping periods using shared utility
        const uniquenessResult = checkPeriodUniqueness({
          ruleId,
          excludeId,
          newPeriod: { activeFrom, activeTo },
          existingPeriods: result.ExpenseRuleMileage,
          componentName: 'MileageRulesTab',
          entityName: 'ExpenseRuleMileage'
        })

        return uniquenessResult.isDuplicate
      } catch (error) {
        console.error('[MileageRulesTab] Error checking code uniqueness:', {
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
    try {
      setIsSaving(true)

      const formValues = form.getValues()

      // Check code uniqueness within overlapping validity periods
      const codeExists = await checkCodeUniqueness(
        formValues.code,
        formValues.activeFrom,
        formValues.activeTo,
        editingItem?.id
      )

      if (codeExists) {
        form.setError('code', {
          type: 'manual',
          message:
            'This code already exists with an overlapping validity period. Please use a different code or adjust the validity dates.'
        })
        setIsSaving(false)
        return
      }

      // Date validation
      const ruleFrom = dayjs(activeFrom)
      const ruleTo = activeTo ? dayjs(activeTo) : null
      const entryFrom = dayjs(formValues.activeFrom)
      const entryTo = formValues.activeTo ? dayjs(formValues.activeTo) : null

      // Valid From cannot be before rule's Valid From
      if (entryFrom.isBefore(ruleFrom, 'day')) {
        form.setError('activeFrom', {
          type: 'manual',
          message: `Valid From cannot be before the rule's Valid From (${ruleFrom.format('DD.MM.YYYY')})`
        })
        setIsSaving(false)
        return
      }

      // Valid From cannot be after rule's Valid To
      if (ruleTo && entryFrom.isAfter(ruleTo, 'day')) {
        form.setError('activeFrom', {
          type: 'manual',
          message: `Valid From cannot be after the rule's Valid To (${ruleTo.format('DD.MM.YYYY')})`
        })
        setIsSaving(false)
        return
      }

      // Valid To cannot be after rule's Valid To
      if (ruleTo && entryTo && entryTo.isAfter(ruleTo, 'day')) {
        form.setError('activeTo', {
          type: 'manual',
          message: `Valid To cannot be after the rule's Valid To (${ruleTo.format('DD.MM.YYYY')})`
        })
        setIsSaving(false)
        return
      }

      // Valid To cannot be before Valid From
      if (entryTo && entryFrom.isAfter(entryTo, 'day')) {
        form.setError('activeTo', {
          type: 'manual',
          message: `Valid To cannot be before Valid From`
        })
        setIsSaving(false)
        return
      }

      // IMPORTANT: Always use editingItem for id and version when updating
      const isUpdate = !!editingItem
      const saveData: any = {
        ...(isUpdate && { id: editingItem.id, version: editingItem.version }),
        expenseRuleId: ruleId,
        // Convert to ISO format for API (java.time.Instant)
        activeTo: formValues.activeTo ? dayjs(formValues.activeTo).endOf('day').toISOString() : null
      }

      // Only include other fields if not in restricted edit mode
      if (!isRestrictedEdit) {
        saveData.code = formValues.code
        saveData.name = formValues.name
        saveData.reimbursable = formValues.reimbursable
        saveData.taxCodeRef = formValues.taxCodeRef
        saveData.taxValue = formValues.taxValue
        saveData.unitPrice = formValues.unitPrice
        // Convert to ISO format for API (java.time.Instant)
        saveData.activeFrom = formValues.activeFrom ? dayjs(formValues.activeFrom).startOf('day').toISOString() : null
        saveData.expenseGroupRef = 'ExpenseGroup:v1:OTHER_TRANSPORT'
        saveData.measurementUnitRef = formValues.measurementUnitRef
        saveData.mileageRuleId = formValues.mileageRuleId

        // Parse and include additionalProperties
        if (additionalPropertiesJson.trim()) {
          try {
            saveData.additionalProperties = JSON.parse(additionalPropertiesJson)
          } catch {
            form.setError('root', {
              type: 'manual',
              message: 'Invalid JSON in Additional Info field'
            })
            setIsSaving(false)
            return
          }
        }
      }

      await expenseSettingsClient.saveExpenseRuleMileage(saveData)
      toast.success(`Mileage rule ${editingItem ? 'updated' : 'created'} successfully`)

      setIsModalVisible(false)
      setIsRestrictedEdit(false)
      await fetchMileageRules()
    } catch (err) {
      toast.error('Failed to save mileage rule')
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const formatTaxValue = (value?: number): string => {
    if (value === undefined || value === null) return '0.00%'
    return `${value.toFixed(2)}%`
  }

  const formatCurrency = (value?: number, unit?: MeasurementUnitWithTranslations): string => {
    if (value === undefined || value === null) return '0.00'
    const unitCode = unit?.code || 'km'
    return `${value.toFixed(2)} / ${unitCode}`
  }

  const measurementUnitOptions = [
    { value: 'MeasurementUnit:v1:km', label: 'Kilometers (km)' },
    { value: 'MeasurementUnit:v1:mile', label: 'Miles (mile)' },
    { value: 'MeasurementUnit:v1:hour', label: 'Hours (hr)' }
  ]

  const formatReimbursable = (reimbursable: boolean): React.ReactNode => {
    if (reimbursable === true) {
      return <Badge variant="success">Yes</Badge>
    } else if (reimbursable === false) {
      return <Badge variant="destructive">No</Badge>
    }
    return <span className="gba:text-muted-foreground">Not set</span>
  }

  const formatTaxCode = (taxCodeRef?: string): string => {
    if (!taxCodeRef) return 'Not set'

    // Find the tax code in the loaded catalog
    const taxCode = taxCodes.find(tc => tc.id === taxCodeRef)
    if (taxCode) {
      return taxCode.code
    }

    // Fallback: Extract the actual tax code from the reference
    const parts = taxCodeRef.split(':')
    return parts.length >= 3 ? parts[2] : taxCodeRef
  }

  const renderAdditionalProperties = (additionalProperties?: Record<string, any>) => {
    if (!additionalProperties || Object.keys(additionalProperties).length === 0) {
      return <span className="gba:text-muted-foreground">None</span>
    }

    const propertyCount = Object.keys(additionalProperties).length

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="gba:flex gba:items-center gba:gap-1 gba:cursor-help">
              <Badge variant="secondary">{propertyCount}</Badge>
              <Button variant="ghost" size="icon" className="gba:h-6 gba:w-6 gba:text-info">
                <PiInfo className="gba:h-4 gba:w-4" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="gba:max-w-md gba:p-3 gba:bg-popover gba:text-popover-foreground">
            <div className="gba:font-medium gba:mb-2">Additional Properties:</div>
            <pre className="gba:text-xs gba:bg-background gba:text-foreground gba:p-2 gba:rounded gba:overflow-auto gba:max-h-64 gba:whitespace-pre-wrap gba:border">
              {JSON.stringify(additionalProperties, null, 2)}
            </pre>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (isLoading) {
    return (
      <div
        data-testid="mileage-rules-tab-loading"
        className="gba:flex gba:justify-center gba:items-center gba:min-h-64"
      >
        <Spinner className="gba:w-8 gba:h-8" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="mileage-rules-tab-error">
        <AlertDescription>
          <div className="gba:flex gba:items-start gba:justify-between">
            <div>
              <strong>Error Loading Mileage Rules</strong>
              <p className="gba:mt-1">{error}</p>
            </div>
            <Button size="sm" onClick={fetchMileageRules} variant="outline">
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div data-testid="mileage-rules-tab">
      <Toaster />

      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:m-0">Mileage Rules</h3>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:m-0">
            Manage mileage reimbursement rules and rates
          </p>
        </div>
        <Button onClick={handleAdd} data-testid="add-mileage-rule-button">
          <PiPlus className="gba:mr-2" />
          Add Mileage Rule
        </Button>
      </div>

      {/* Table */}
      <Card data-testid="mileage-rules-card">
        <CardContent className="gba:p-0">
          {isSaving && (
            <div className="gba:absolute gba:inset-0 gba:bg-background/50 gba:flex gba:items-center gba:justify-center gba:z-10">
              <Spinner className="gba:w-6 gba:h-6" />
            </div>
          )}

          <Table data-testid="mileage-rules-table">
            <TableHeader data-testid="mileage-rules-table-header">
              <TableRow data-testid="mileage-rules-table-header-row">
                <TableHead className="gba:w-[60px]" data-testid="mileage-rules-table-header-actions">
                  ACTIONS
                </TableHead>
                <TableHead
                  className="gba:w-[180px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                  onClick={() => sorting.handleSort('code')}
                  data-testid="mileage-rules-table-header-mileage"
                >
                  <div className="gba:flex gba:items-center">
                    MILEAGE
                    {sorting.renderSortIcon('code')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[160px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                  onClick={() => sorting.handleSort('mileageRule')}
                  data-testid="mileage-rules-table-header-rule"
                >
                  <div className="gba:flex gba:items-center">
                    MILEAGE RULE
                    {sorting.renderSortIcon('mileageRule')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[100px] gba:text-center gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                  onClick={() => sorting.handleSort('reimbursable')}
                  data-testid="mileage-rules-table-header-reimbursable"
                >
                  <div className="gba:flex gba:items-center gba:justify-center">
                    REIMBURSABLE
                    {sorting.renderSortIcon('reimbursable')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[120px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                  onClick={() => sorting.handleSort('unitPrice')}
                  data-testid="mileage-rules-table-header-rate"
                >
                  <div className="gba:flex gba:items-center">
                    RATE
                    {sorting.renderSortIcon('unitPrice')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[120px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                  onClick={() => sorting.handleSort('taxValue')}
                  data-testid="mileage-rules-table-header-tax"
                >
                  <div className="gba:flex gba:items-center">
                    TAX
                    {sorting.renderSortIcon('taxValue')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[160px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                  onClick={() => sorting.handleSort('activeFrom')}
                  data-testid="mileage-rules-table-header-validity"
                >
                  <div className="gba:flex gba:items-center">
                    VALIDITY
                    {sorting.renderSortIcon('activeFrom')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[120px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                  onClick={() => sorting.handleSort('expenseGroup')}
                  data-testid="mileage-rules-table-header-group"
                >
                  <div className="gba:flex gba:items-center">
                    EXPENSE GROUP
                    {sorting.renderSortIcon('expenseGroup')}
                  </div>
                </TableHead>
                <TableHead className="gba:w-[100px]" data-testid="mileage-rules-table-header-properties">
                  PROPERTIES
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody data-testid="mileage-rules-table-body">
              {sortedMileageRules.length === 0 ? (
                <TableRow data-testid="mileage-rules-empty-row">
                  <TableCell colSpan={9} className="gba:text-center gba:py-8" data-testid="mileage-rules-empty-cell">
                    <div className="gba:text-muted-foreground" data-testid="mileage-rules-empty-message">
                      No mileage rules found. Click "Add Mileage Rule" to create one.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedMileageRules.map(record => (
                  <TableRow key={record.id} data-testid={`mileage-rule-row-${record.id}`}>
                    <TableCell data-testid={`mileage-rule-action-cell-${record.id}`}>
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={e => e.stopPropagation()}
                              disabled={isCheckingUsage}
                              data-testid={`mileage-rule-action-${record.id}`}
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
                              data-testid={`mileage-rule-edit-${record.id}`}
                            >
                              <PiPencil className="gba:h-4 gba:w-4 gba:mr-2" />
                              Update
                            </DropdownMenuItem>
                            {/* Only show delete option if mileage rule is not used */}
                            {!mileageUsageMap[record.id] && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={e => {
                                    e.stopPropagation()
                                    handleDeleteClick(record)
                                  }}
                                  className="gba:text-destructive"
                                  data-testid={`mileage-rule-delete-${record.id}`}
                                >
                                  <PiTrash className="gba:h-4 gba:w-4 gba:mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>

                    <TableCell data-testid={`mileage-rule-code-cell-${record.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiCar
                          className="gba:text-muted-foreground"
                          data-testid={`mileage-rule-code-icon-${record.id}`}
                        />
                        <div>
                          <div
                            className="gba:font-mono gba:font-medium gba:text-sm"
                            data-testid={`mileage-rule-code-text-${record.id}`}
                          >
                            {record.code}
                          </div>
                          <div
                            className="gba:text-muted-foreground gba:text-xs"
                            data-testid={`mileage-rule-name-text-${record.id}`}
                          >
                            {record.name || 'No name set'}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell data-testid={`mileage-rule-mileage-rule-cell-${record.id}`}>
                      {record.mileageRule?.code && record.mileageRule?.name ? (
                        <div>
                          <div className="gba:font-mono gba:font-medium gba:text-sm">{record.mileageRule.code}</div>
                          <div className="gba:text-muted-foreground gba:text-xs">{record.mileageRule.name}</div>
                        </div>
                      ) : (
                        <span className="gba:text-muted-foreground">Not set</span>
                      )}
                    </TableCell>

                    <TableCell className="gba:text-center" data-testid={`mileage-rule-reimbursable-cell-${record.id}`}>
                      {formatReimbursable(record.reimbursable)}
                    </TableCell>

                    <TableCell data-testid={`mileage-rule-rate-cell-${record.id}`}>
                      <span className="gba:font-mono gba:text-sm">
                        {formatCurrency(record.unitPrice, record.measurementUnit)}
                      </span>
                    </TableCell>

                    <TableCell data-testid={`mileage-rule-tax-cell-${record.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <PiPercent
                          className="gba:text-muted-foreground"
                          data-testid={`mileage-rule-tax-icon-${record.id}`}
                        />
                        <span className="gba:font-mono gba:text-sm" data-testid={`mileage-rule-tax-text-${record.id}`}>
                          {formatTaxCode(record.taxCodeRef)}: {formatTaxValue(record.taxValue)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell data-testid={`mileage-rule-validity-cell-${record.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <PiCalendar
                          className="gba:text-muted-foreground"
                          data-testid={`mileage-rule-validity-icon-${record.id}`}
                        />
                        <span className="gba:text-sm" data-testid={`mileage-rule-validity-text-${record.id}`}>
                          {formatDate(record.activeFrom)} - {record.activeTo ? formatDate(record.activeTo) : '∞'}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell data-testid={`mileage-rule-group-cell-${record.id}`}>
                      {record.expenseGroup?.code ? (
                        <Badge
                          variant="default"
                          title={record.expenseGroup.value}
                          data-testid={`mileage-rule-group-badge-${record.id}`}
                        >
                          {record.expenseGroup.code}
                        </Badge>
                      ) : (
                        <span
                          className="gba:text-muted-foreground"
                          data-testid={`mileage-rule-group-empty-${record.id}`}
                        >
                          Not set
                        </span>
                      )}
                    </TableCell>

                    <TableCell data-testid={`mileage-rule-properties-cell-${record.id}`} className="gba:text-center">
                      {renderAdditionalProperties(record.additionalProperties)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
        <DialogContent className="gba:max-w-2xl gba:max-h-[90vh] gba:overflow-y-auto" data-testid="mileage-rule-modal">
          <DialogHeader data-testid="mileage-rule-modal-header">
            <DialogTitle data-testid="mileage-rule-modal-title">
              {editingItem ? 'Edit' : 'Add'} Mileage Rule
            </DialogTitle>
          </DialogHeader>

          {/* Restricted edit warning */}
          {isRestrictedEdit && (
            <Alert
              className="gba:mb-4 gba:border-warning gba:bg-warning-secondary"
              data-testid="mileage-rule-restricted-alert"
            >
              <PiWarning className="gba:h-4 gba:w-4 gba:text-warning" />
              <AlertDescription>
                This mileage rule is used in expense items. Only &quot;Valid To&quot; can be edited.
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <div className="gba:space-y-4" data-testid="mileage-rule-form">
              <div className="gba:space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  rules={{ required: 'Code is required' }}
                  render={({ field }) => (
                    <FormItem data-testid="mileage-rule-code-field">
                      <FormLabel data-testid="mileage-rule-code-label">Code *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter mileage code"
                          disabled={isRestrictedEdit}
                          data-testid="mileage-rule-code-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  rules={{ required: 'Name is required' }}
                  render={({ field }) => (
                    <FormItem data-testid="mileage-rule-name-field">
                      <FormLabel data-testid="mileage-rule-name-label">Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter mileage name"
                          disabled={isRestrictedEdit}
                          data-testid="mileage-rule-name-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Only show Mileage Rule selector if there are available options */}
                {mileageRuleOptions.length > 0 && (
                  <FormField
                    control={form.control}
                    name="mileageRuleId"
                    render={({ field }) => (
                      <FormItem data-testid="mileage-rule-select-field">
                        <FormLabel data-testid="mileage-rule-select-label">Mileage Rule</FormLabel>
                        <Select
                          value={field.value || ''}
                          onValueChange={value => {
                            // Handle clearing selection
                            if (value === '__clear__') {
                              field.onChange('')
                              form.setValue('mileageRuleId', '')

                              return
                            }
                            field.onChange(value)
                            // Clear unit price when mileage rule is selected
                            if (value) {
                              form.setValue('unitPrice', undefined)
                            }
                          }}
                          disabled={isMileageRulesLoading || isRestrictedEdit}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="mileage-rule-select-trigger">
                              <SelectValue placeholder="Select a mileage rule (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent data-testid="mileage-rule-select-options">
                            {/* Add clear option */}
                            {field.value && (
                              <SelectItem value="__clear__" data-testid="mileage-rule-option-clear">
                                <span className="gba:text-muted-foreground gba:italic">Clear selection</span>
                              </SelectItem>
                            )}
                            {mileageRuleOptions.map(option => (
                              <SelectItem
                                key={option.id}
                                value={option.id}
                                data-testid={`mileage-rule-option-${option.id}`}
                              >
                                {option.code} - {option.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                          Select a mileage rule OR enter unit price below (not both)
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="gba:grid gba:grid-cols-3 gba:gap-4">
                <FormField
                  control={form.control}
                  name="reimbursable"
                  render={({ field }) => (
                    <FormItem
                      className="gba:flex gba:items-center gba:gap-2"
                      data-testid="mileage-rule-reimbursable-field"
                    >
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isRestrictedEdit}
                          data-testid="mileage-rule-reimbursable-checkbox"
                        />
                      </FormControl>
                      <FormLabel data-testid="mileage-rule-reimbursable-label">Reimbursable</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem data-testid="mileage-rule-unit-price-field">
                      <FormLabel data-testid="mileage-rule-unit-price-label">Unit Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={field.value || ''}
                          onChange={e => {
                            field.onChange(parseFloat(e.target.value) || undefined)
                            // Clear mileage rule when unit price is entered
                            if (e.target.value) {
                              form.setValue('mileageRuleId', undefined)
                            }
                          }}
                          placeholder="0.00"
                          disabled={isRestrictedEdit || !!form.watch('mileageRuleId')}
                          data-testid="mileage-rule-unit-price-input"
                        />
                      </FormControl>
                      <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                        {form.watch('mileageRuleId')
                          ? 'Disabled - Mileage Rule selected'
                          : 'Enter unit price if no mileage rule'}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="measurementUnitRef"
                  render={({ field }) => (
                    <FormItem data-testid="mileage-rule-measurement-unit-field">
                      <FormLabel data-testid="mileage-rule-measurement-unit-label">Measurement Unit</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={isRestrictedEdit}>
                        <FormControl>
                          <SelectTrigger data-testid="mileage-rule-measurement-unit-select">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent data-testid="mileage-rule-measurement-unit-options">
                          {measurementUnitOptions.map(option => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              data-testid={`mileage-rule-measurement-unit-option-${option.value}`}
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
              </div>

              <div className="gba:space-y-4">
                <FormField
                  control={form.control}
                  name="taxCodeRef"
                  render={({ field }) => (
                    <FormItem data-testid="mileage-rule-tax-code-field">
                      <FormLabel data-testid="mileage-rule-tax-code-label">Tax Code</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={value => {
                          field.onChange(value)
                          // Auto-populate tax value from extracted percentage
                          const selectedTaxCode = taxCodes.find(tc => tc.id === value) as any
                          if (selectedTaxCode?.taxPercentage !== undefined) {
                            form.setValue('taxValue', selectedTaxCode.taxPercentage)
                          } else {
                            form.setValue('taxValue', 0)
                          }
                        }}
                        disabled={catalogsLoading || isRestrictedEdit}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="mileage-rule-tax-code-select">
                            <SelectValue placeholder="Select tax code" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent data-testid="mileage-rule-tax-code-options">
                          {taxCodes.map(taxCode => (
                            <SelectItem
                              key={taxCode.id}
                              value={taxCode.id}
                              data-testid={`mileage-rule-tax-code-option-${taxCode.id}`}
                            >
                              {taxCode.code} - {taxCode.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxValue"
                  render={({ field }) => (
                    <FormItem data-testid="mileage-rule-tax-value-field">
                      <FormLabel data-testid="mileage-rule-tax-value-label">Tax Value (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={field.value ?? ''}
                          onChange={e => {
                            const value = e.target.value
                            field.onChange(value === '' ? undefined : parseFloat(value))
                          }}
                          placeholder="Auto-populated from Tax Code"
                          disabled={isRestrictedEdit}
                          data-testid="mileage-rule-tax-value-input"
                        />
                      </FormControl>
                      <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                        Value is auto-populated when you select a Tax Code
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="gba:space-y-4">
                <FormField
                  control={form.control}
                  name="expenseGroupRef"
                  render={({ field }) => (
                    <FormItem data-testid="mileage-rule-expense-group-field">
                      <FormLabel data-testid="mileage-rule-expense-group-label">Expense Group</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value="Other transportation cost"
                          disabled
                          data-testid="mileage-rule-expense-group-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem data-testid="mileage-rule-additional-field">
                  <FormLabel data-testid="mileage-rule-additional-label">Additional Info (JSON)</FormLabel>
                  <FormControl>
                    <Textarea
                      value={additionalPropertiesJson}
                      onChange={e => setAdditionalPropertiesJson(e.target.value)}
                      placeholder='{"postingDetails": {"text": "", "account": "", "accountDetail": ""}}'
                      className="gba:font-mono gba:text-sm gba:min-h-[100px]"
                      disabled={isRestrictedEdit}
                      data-testid="mileage-rule-additional-textarea"
                    />
                  </FormControl>
                  <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                    Enter valid JSON for posting details and other additional data
                  </p>
                </FormItem>
              </div>

              <div className="gba:space-y-4">
                <FormField
                  control={form.control}
                  name="activeFrom"
                  rules={{ required: 'Valid From is required' }}
                  render={({ field }) => (
                    <FormItem data-testid="mileage-rule-active-from-field">
                      <FormLabel data-testid="mileage-rule-active-from-label">Valid From *</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value || ''}
                          onChange={date => field.onChange(date)}
                          disabled={isRestrictedEdit}
                          data-testid="mileage-rule-active-from-input"
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
                    <FormItem data-testid="mileage-rule-active-to-field">
                      <FormLabel data-testid="mileage-rule-active-to-label">Valid To</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value || ''}
                          onChange={date => field.onChange(date)}
                          data-testid="mileage-rule-active-to-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Form>

          <DialogFooter data-testid="mileage-rule-modal-footer">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalVisible(false)
                setIsRestrictedEdit(false)
              }}
              disabled={isSaving}
              data-testid="mileage-rule-modal-cancel-button"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} data-testid="mileage-rule-modal-save-button">
              {isSaving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Mileage Rule"
        itemDescription={`the mileage rule "${itemToDelete?.code} - ${itemToDelete?.name}"`}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false)
          setItemToDelete(null)
        }}
        testIdPrefix="mileage-delete"
      />
    </div>
  )
}

export default MileageRulesTab
