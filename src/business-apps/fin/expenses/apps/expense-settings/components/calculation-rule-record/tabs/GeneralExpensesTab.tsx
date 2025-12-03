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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  DateInput,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Checkbox
} from '@newwork/nw-design-system'
import {
  PiPlus,
  PiCalendar,
  PiReceipt,
  PiPercent,
  PiDotsThreeVertical,
  PiPencil,
  PiTrash,
  PiWarning,
  PiInfo
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
import { ExpenseRuleGeneralExpense, ExpenseGroupWithTranslations } from '../../../types/ExpenseRuleTypes'
import { expenseSettingsClient } from '../../../utils/ExpenseSettingsClient'

interface GeneralExpensesTabProps {
  ruleId: string
  accessToken: string
  activeFrom: string
  activeTo?: string
}

interface GeneralExpenseFormData {
  id?: string
  expenseRuleId: string
  code: string
  name: string
  reimbursable: boolean
  taxCodeRef?: string
  taxValue?: number
  activeFrom: string
  activeTo?: string
  expenseGroupRef?: string
  version?: number
  additionalProperties?: Record<string, unknown>
}

// Extended type for expense with additionalProperties
interface GeneralExpenseWithAdditional extends ExpenseRuleGeneralExpense {
  additionalProperties?: Record<string, unknown>
}

// Usage check result
interface UsageInfo {
  isUsed: boolean
  usedIn: {
    planItems?: number
    items?: number
    positions?: number
  }
  message: string
}

interface TaxCodeOption {
  id: string
  value: string
  code: string
}

interface ExpenseGroupOption {
  id: string
  value: string
  code: string
  translations?: { localeCode: string; value: string }[]
}

const GeneralExpensesTab: React.FC<GeneralExpensesTabProps> = ({ ruleId, accessToken, activeFrom, activeTo }) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)

  const [generalExpenses, setGeneralExpenses] = useState<GeneralExpenseWithAdditional[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<ExpenseRuleGeneralExpense | null>(null)

  // Form using react-hook-form
  const form = useForm<GeneralExpenseFormData>({
    defaultValues: {
      expenseRuleId: ruleId,
      code: '',
      name: '',
      reimbursable: true,
      activeFrom: activeFrom
    }
  })

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<GeneralExpenseWithAdditional | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Usage check state
  const [isCheckingUsage, setIsCheckingUsage] = useState(false)
  const [currentUsageInfo, setCurrentUsageInfo] = useState<UsageInfo | null>(null)
  const [isRestrictedEdit, setIsRestrictedEdit] = useState(false)

  // Pre-loaded usage status for all expenses (expense id -> isUsed)
  const [expenseUsageMap, setExpenseUsageMap] = useState<Record<string, boolean>>({})

  // Additional properties edit state (as JSON string for textarea)
  const [additionalPropertiesJson, setAdditionalPropertiesJson] = useState<string>('')

  // TaxCode catalog state
  const [taxCodes, setTaxCodes] = useState<TaxCodeOption[]>([])
  const [catalogsLoading, setCatalogsLoading] = useState(true)

  // ExpenseGroup catalog state
  const [expenseGroups, setExpenseGroups] = useState<ExpenseGroupOption[]>([])

  // Set up client
  expenseSettingsClient.setAccessToken(accessToken)

  // ✅ NEW: Load TaxCode catalog
  const loadTaxCodes = useCallback(async () => {
    setCatalogsLoading(true)
    try {
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'TaxCode', version: 'v1' },
        { limit: 100, offset: 0, returnTotalRecords: true }
      )

      setTaxCodes(
        response.data.map((item: any) => ({
          id: item.id,
          value: item.value,
          code: item.code
        }))
      )
    } catch (error) {
      console.error('Error loading TaxCode catalog:', error)
    } finally {
      setCatalogsLoading(false)
    }
  }, [catalogClient])

  // Load ExpenseGroup catalog
  const loadExpenseGroups = useCallback(async () => {
    try {
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'ExpenseGroup', version: 'v1' },
        { limit: 100, offset: 0, returnTotalRecords: true }
      )

      setExpenseGroups(
        response.data.map((item: any) => ({
          id: item.id,
          value: item.value,
          code: item.code,
          translations: item.translations
        }))
      )
    } catch (error) {
      console.error('Error loading ExpenseGroup catalog:', error)
    }
  }, [catalogClient])

  const fetchGeneralExpenses = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const query = `
        query GetExpenseRuleGeneralExpenses($ruleId: uuid!) {
          ExpenseRule(where: { id: { _eq: $ruleId } }) {
            id
            code
            name
            expenseRuleGeneralExpense(where: { isDeleted: { _eq: false } }, orderBy: { expenseOrder: ASC }) {
              id
              code
              name
              reimbursable
              taxCodeRef
              taxValue
              activeFrom
              activeTo
              version
              additionalProperties
              expenseGroup {
                id
                value
                code
                translations {
                  value
                  localeCode
                }
              }
            }
          }
        }
      `

      const result = await graphqlClient.request<{
        ExpenseRule: { expenseRuleGeneralExpense: GeneralExpenseWithAdditional[] }[]
      }>(query, { ruleId })

      const expenseRule = result.ExpenseRule?.[0]
      const expenses = expenseRule?.expenseRuleGeneralExpense || []

      setGeneralExpenses(expenses)

      // Load usage status for all expenses
      if (expenses.length > 0) {
        await loadExpenseUsageStatus(expenses.map(e => e.id))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load general expenses')
      console.error('Error fetching general expenses:', err)
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, ruleId])

  // Load usage status for all expenses in a single batched query
  const loadExpenseUsageStatus = useCallback(
    async (expenseIds: string[]) => {
      if (expenseIds.length === 0) return

      try {
        // Fetch only the ID field to minimize data transfer
        const query = `
        query CheckAllExpensesUsage($expenseIds: [uuid!]!) {
          planItems: ExpensePlanItem(
            where: { expenseRuleGeneralExpenseId: { _in: $expenseIds }, isDeleted: { _eq: false } }
          ) { expenseRuleGeneralExpenseId }
          items: ExpenseItem(
            where: { expenseRuleGeneralExpenseId: { _in: $expenseIds }, isDeleted: { _eq: false } }
          ) { expenseRuleGeneralExpenseId }
          positions: ExpensePosition(
            where: { expenseRuleGeneralExpenseId: { _in: $expenseIds }, isDeleted: { _eq: false } }
          ) { expenseRuleGeneralExpenseId }
        }
      `

        const result = await graphqlClient.request<{
          planItems: { expenseRuleGeneralExpenseId: string }[]
          items: { expenseRuleGeneralExpenseId: string }[]
          positions: { expenseRuleGeneralExpenseId: string }[]
        }>(query, { expenseIds })

        // Build a set of used expense IDs
        const usedIds = new Set<string>()
        result.planItems?.forEach(item => usedIds.add(item.expenseRuleGeneralExpenseId))
        result.items?.forEach(item => usedIds.add(item.expenseRuleGeneralExpenseId))
        result.positions?.forEach(item => usedIds.add(item.expenseRuleGeneralExpenseId))

        // Create usage map
        const usageMap: Record<string, boolean> = {}
        expenseIds.forEach(id => {
          usageMap[id] = usedIds.has(id)
        })

        setExpenseUsageMap(usageMap)
      } catch (error) {
        console.error('Error loading expense usage status:', error)
      }
    },
    [graphqlClient]
  )

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchGeneralExpenses()
      loadTaxCodes()
      loadExpenseGroups()
    }
  }, [ruleId, accessToken, fetchGeneralExpenses, loadTaxCodes, loadExpenseGroups])

  // Check if a general expense is used in ExpensePlanItem, ExpenseItem, or ExpensePosition
  const checkGeneralExpenseUsage = useCallback(
    async (expenseId: string): Promise<UsageInfo> => {
      try {
        const query = `
        query CheckGeneralExpenseUsage($expenseId: uuid!) {
          planItemCount: ExpensePlanItemAggregate(
            where: { 
              expenseRuleGeneralExpenseId: { _eq: $expenseId }
              isDeleted: { _eq: false }
            }
          ) {
            aggregate { count }
          }
          itemCount: ExpenseItemAggregate(
            where: { 
              expenseRuleGeneralExpenseId: { _eq: $expenseId }
              isDeleted: { _eq: false }
            }
          ) {
            aggregate { count }
          }
          positionCount: ExpensePositionAggregate(
            where: { 
              expenseRuleGeneralExpenseId: { _eq: $expenseId }
              isDeleted: { _eq: false }
            }
          ) {
            aggregate { count }
          }
        }
      `

        const result = await graphqlClient.request<{
          planItemCount: { aggregate: { count: number } }
          itemCount: { aggregate: { count: number } }
          positionCount: { aggregate: { count: number } }
        }>(query, { expenseId })

        const planItems = result.planItemCount?.aggregate?.count || 0
        const items = result.itemCount?.aggregate?.count || 0
        const positions = result.positionCount?.aggregate?.count || 0
        const totalUsage = planItems + items + positions

        if (totalUsage === 0) {
          return { isUsed: false, usedIn: {}, message: '' }
        }

        const usageDetails: string[] = []
        if (planItems > 0) usageDetails.push(`${planItems} plan item(s)`)
        if (items > 0) usageDetails.push(`${items} expense item(s)`)
        if (positions > 0) usageDetails.push(`${positions} position(s)`)

        return {
          isUsed: true,
          usedIn: { planItems, items, positions },
          message: `This expense is used in ${usageDetails.join(', ')}. Only "Valid To" and "Additional Info" can be edited.`
        }
      } catch (error) {
        console.error('Error checking usage:', error)
        // Default to restricted mode for safety
        return {
          isUsed: true,
          usedIn: {},
          message: 'Unable to verify usage. Editing restricted for safety.'
        }
      }
    },
    [graphqlClient]
  )

  const handleAdd = () => {
    setEditingItem(null)
    setIsRestrictedEdit(false)
    setCurrentUsageInfo(null)

    // Determine validity period based on existing entries
    let validFromValue = activeFrom
    let validToValue: string | undefined = undefined

    if (generalExpenses.length > 0) {
      // Use the same validity period as the first existing entry
      const existingEntry = generalExpenses[0]
      validFromValue = existingEntry.activeFrom
      validToValue = existingEntry.activeTo
    } else {
      // No existing entries - set validTo to December 31, 9999 (or rule's activeTo if set)
      validToValue = activeTo || '9999-12-31'
    }

    form.reset({
      expenseRuleId: ruleId,
      code: '',
      name: '',
      reimbursable: true,
      taxValue: 0,
      activeFrom: validFromValue,
      activeTo: validToValue
    })
    setAdditionalPropertiesJson('')
    setIsModalVisible(true)
  }

  // Handle edit action - checks usage first
  const handleEdit = async (record: GeneralExpenseWithAdditional) => {
    setIsCheckingUsage(true)

    try {
      const usageInfo = await checkGeneralExpenseUsage(record.id)
      setCurrentUsageInfo(usageInfo)
      setIsRestrictedEdit(usageInfo.isUsed)

      setEditingItem(record)
      form.reset({
        id: record.id,
        expenseRuleId: ruleId,
        code: record.code,
        name: record.name,
        reimbursable: record.reimbursable,
        taxCodeRef: record.taxCodeRef,
        taxValue: record.taxValue,
        activeFrom: record.activeFrom,
        activeTo: record.activeTo,
        expenseGroupRef: record.expenseGroup?.id,
        version: record.version,
        additionalProperties: record.additionalProperties
      })
      setAdditionalPropertiesJson(
        record.additionalProperties ? JSON.stringify(record.additionalProperties, null, 2) : ''
      )
      setIsModalVisible(true)
    } catch {
      toast.error('Failed to check usage status')
    } finally {
      setIsCheckingUsage(false)
    }
  }

  // Handle delete action - opens confirmation dialog (usage already checked via expenseUsageMap)
  const handleDeleteClick = (record: GeneralExpenseWithAdditional) => {
    setItemToDelete(record)
    setDeleteDialogOpen(true)
  }

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return

    setIsDeleting(true)
    try {
      await expenseSettingsClient.deleteExpenseRuleGeneralExpense(itemToDelete.id, itemToDelete.version || 1)
      toast.success('General expense deleted successfully')
      setDeleteDialogOpen(false)
      setItemToDelete(null)
      await fetchGeneralExpenses()
    } catch (error) {
      toast.error('Failed to delete general expense')
      console.error('Delete error:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)

      const formData = form.getValues()

      // Validate that expense validity period is within rule's validity period
      const expenseFrom = dayjs(formData.activeFrom)
      const expenseTo = formData.activeTo ? dayjs(formData.activeTo) : null
      const ruleFrom = dayjs(activeFrom)
      const ruleTo = activeTo ? dayjs(activeTo) : null

      // Check: Expense's activeFrom must be >= Rule's activeFrom
      if (expenseFrom.isBefore(ruleFrom)) {
        toast.error(
          `Expense "Valid From" (${expenseFrom.format('DD.MM.YYYY')}) cannot be before the rule's "Valid From" (${ruleFrom.format('DD.MM.YYYY')})`
        )
        setIsSaving(false)
        return
      }

      // Check: Expense's activeTo must be <= Rule's activeTo (if rule has an end date)
      if (ruleTo && expenseTo && expenseTo.isAfter(ruleTo)) {
        toast.error(
          `Expense "Valid To" (${expenseTo.format('DD.MM.YYYY')}) cannot be after the rule's "Valid To" (${ruleTo.format('DD.MM.YYYY')})`
        )
        setIsSaving(false)
        return
      }

      // Check: Expense's activeFrom must be <= Rule's activeTo (if rule has an end date)
      if (ruleTo && expenseFrom.isAfter(ruleTo)) {
        toast.error(
          `Expense "Valid From" (${expenseFrom.format('DD.MM.YYYY')}) cannot be after the rule's "Valid To" (${ruleTo.format('DD.MM.YYYY')})`
        )
        setIsSaving(false)
        return
      }

      // Parse additionalProperties from JSON string
      let parsedAdditionalProperties: Record<string, unknown> | undefined
      if (additionalPropertiesJson.trim()) {
        try {
          parsedAdditionalProperties = JSON.parse(additionalPropertiesJson)
        } catch {
          toast.error('Invalid JSON in Additional Info field')
          setIsSaving(false)
          return
        }
      }

      const saveData: any = {
        ...(editingItem && { id: editingItem.id, version: editingItem.version }),
        expenseRuleId: ruleId,
        activeTo: formData.activeTo,
        additionalProperties: parsedAdditionalProperties
      }

      // Only include other fields if not in restricted edit mode
      if (!isRestrictedEdit) {
        saveData.code = formData.code
        saveData.name = formData.name
        saveData.reimbursable = formData.reimbursable
        saveData.taxCodeRef = formData.taxCodeRef
        saveData.taxValue = formData.taxValue
        saveData.activeFrom = formData.activeFrom
        saveData.expenseGroupRef = formData.expenseGroupRef
      }

      await expenseSettingsClient.saveExpenseRuleGeneralExpense(saveData)
      toast.success(`General expense rule ${editingItem ? 'updated' : 'created'} successfully`)

      setIsModalVisible(false)
      setIsRestrictedEdit(false)
      setCurrentUsageInfo(null)
      await fetchGeneralExpenses()
    } catch (err) {
      toast.error(`Failed to ${editingItem ? 'update' : 'create'} general expense rule`)
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD.MM.YYYY')
  }

  const formatTaxValue = (taxValue?: number): string => {
    if (taxValue === undefined || taxValue === null) return 'Not set'
    return `${taxValue}%`
  }

  // Get localized label for expense group
  const getExpenseGroupLabel = useCallback((group: ExpenseGroupOption): string => {
    const currentLocale = 'en-US' // Could use getCurrentActiveUserLocale()
    const translation = group.translations?.find(t => t.localeCode === currentLocale)
    return translation?.value || group.value || group.code
  }, [])

  // Map expense groups from catalog to select options
  const expenseGroupOptions = useMemo(
    () =>
      expenseGroups.map(group => ({
        value: group.id,
        label: getExpenseGroupLabel(group)
      })),
    [expenseGroups, getExpenseGroupLabel]
  )

  const formatReimbursable = (reimbursable: boolean): React.ReactNode => {
    if (reimbursable === true) {
      return <Badge variant="success">Yes</Badge>
    } else if (reimbursable === false) {
      return <Badge variant="destructive">No</Badge>
    }
    return <span className="gba:text-muted-foreground">Not set</span>
  }

  const getLocalizedExpenseGroupName = (expenseGroup?: ExpenseGroupWithTranslations): string => {
    if (!expenseGroup) return 'Not set'

    // Try to find current locale translation first
    const currentLocale = 'en-US' // Could be from getCurrentActiveUserLocale()
    const translation = expenseGroup.translations?.find(t => t.localeCode === currentLocale)

    if (translation?.value) {
      return translation.value
    }

    // Fallback to default value
    return expenseGroup.value || 'Not set'
  }

  const formatTaxCode = (taxCodeRef?: string): string => {
    if (!taxCodeRef) return 'Not set'

    // Find the tax code in the loaded catalog
    const taxCode = taxCodes.find(tc => tc.id === taxCodeRef)
    if (taxCode) {
      return taxCode.code
    }

    // Fallback: Extract the actual tax code from the reference
    // "TaxCode:v1:V00" -> "V00"
    const parts = taxCodeRef.split(':')
    return parts.length >= 3 ? parts[2] : taxCodeRef
  }

  // Render additionalProperties with hover tooltip (same as MileageRulesTab)
  const renderAdditionalProperties = (additionalProperties?: Record<string, unknown>) => {
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
        data-testid="general-expenses-tab-loading"
        className="gba:flex gba:justify-center gba:items-center gba:min-h-64"
      >
        <Spinner className="gba:w-8 gba:h-8" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="general-expenses-tab-error">
        <AlertDescription>
          <div className="gba:flex gba:items-start gba:justify-between">
            <div>
              <strong>Error Loading General Expenses</strong>
              <p className="gba:mt-1">{error}</p>
            </div>
            <Button size="sm" onClick={fetchGeneralExpenses} variant="outline">
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div data-testid="general-expenses-tab">
      <Toaster />

      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:m-0">General Expenses</h3>
          <p className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:m-0">
            Manage general expense rules and tax configurations
          </p>
        </div>
        <Button onClick={handleAdd} data-testid="add-general-expense-button">
          <PiPlus className="gba:mr-2" />
          Add General Expense
        </Button>
      </div>

      {/* Table */}
      <Card data-testid="general-expenses-card">
        <CardContent className="gba:p-0">
          {isSaving && (
            <div className="gba:absolute gba:inset-0 gba:bg-background/50 gba:flex gba:items-center gba:justify-center gba:z-10">
              <Spinner className="gba:w-6 gba:h-6" />
            </div>
          )}

          <Table data-testid="general-expenses-table">
            <TableHeader data-testid="general-expenses-table-header">
              <TableRow data-testid="general-expenses-table-header-row">
                <TableHead className="gba:w-[60px]" data-testid="general-expenses-table-header-actions">
                  ACTIONS
                </TableHead>
                <TableHead className="gba:w-[180px]" data-testid="general-expenses-table-header-expense">
                  EXPENSE
                </TableHead>
                <TableHead
                  className="gba:w-[100px] gba:text-center"
                  data-testid="general-expenses-table-header-reimbursable"
                >
                  REIMBURSABLE
                </TableHead>
                <TableHead className="gba:w-[120px]" data-testid="general-expenses-table-header-tax">
                  TAX
                </TableHead>
                <TableHead className="gba:w-[160px]" data-testid="general-expenses-table-header-validity">
                  VALIDITY
                </TableHead>
                <TableHead className="gba:w-[120px]" data-testid="general-expenses-table-header-group">
                  EXPENSE GROUP
                </TableHead>
                <TableHead className="gba:w-[250px]" data-testid="general-expenses-table-header-additional">
                  ADDITIONAL INFO
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody data-testid="general-expenses-table-body">
              {generalExpenses.length === 0 ? (
                <TableRow data-testid="general-expenses-empty-row">
                  <TableCell colSpan={7} className="gba:text-center gba:py-8" data-testid="general-expenses-empty-cell">
                    <div className="gba:text-muted-foreground" data-testid="general-expenses-empty-message">
                      No general expense rules found. Click "Add General Expense" to create one.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                generalExpenses.map(record => (
                  <TableRow key={record.id} data-testid={`general-expense-row-${record.id}`}>
                    <TableCell data-testid={`general-expense-action-cell-${record.id}`}>
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={e => e.stopPropagation()}
                              disabled={isCheckingUsage}
                              data-testid={`general-expense-action-${record.id}`}
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
                              data-testid={`general-expense-edit-${record.id}`}
                            >
                              <PiPencil className="gba:h-4 gba:w-4 gba:mr-2" />
                              Update
                            </DropdownMenuItem>
                            {/* Only show delete option if expense is not used */}
                            {!expenseUsageMap[record.id] && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={e => {
                                    e.stopPropagation()
                                    handleDeleteClick(record)
                                  }}
                                  className="gba:text-destructive"
                                  data-testid={`general-expense-delete-${record.id}`}
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

                    <TableCell data-testid={`general-expense-code-cell-${record.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <PiReceipt
                          className="gba:text-muted-foreground"
                          data-testid={`general-expense-code-icon-${record.id}`}
                        />
                        <div>
                          <div
                            className="gba:font-mono gba:font-medium gba:text-sm"
                            data-testid={`general-expense-code-text-${record.id}`}
                          >
                            {record.code}
                          </div>
                          <div
                            className="gba:text-muted-foreground gba:text-xs"
                            data-testid={`general-expense-name-text-${record.id}`}
                          >
                            {record.name || 'No name set'}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell
                      className="gba:text-center"
                      data-testid={`general-expense-reimbursable-cell-${record.id}`}
                    >
                      {formatReimbursable(record.reimbursable)}
                    </TableCell>

                    <TableCell data-testid={`general-expense-tax-cell-${record.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <PiPercent
                          className="gba:text-muted-foreground"
                          data-testid={`general-expense-tax-icon-${record.id}`}
                        />
                        <span
                          className="gba:font-mono gba:text-sm"
                          data-testid={`general-expense-tax-text-${record.id}`}
                        >
                          {formatTaxCode(record.taxCodeRef)}: {formatTaxValue(record.taxValue)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell data-testid={`general-expense-validity-cell-${record.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <PiCalendar
                          className="gba:text-muted-foreground"
                          data-testid={`general-expense-validity-icon-${record.id}`}
                        />
                        <span className="gba:text-sm" data-testid={`general-expense-validity-text-${record.id}`}>
                          {formatDate(record.activeFrom)} - {record.activeTo ? formatDate(record.activeTo) : '∞'}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell data-testid={`general-expense-group-cell-${record.id}`}>
                      {record.expenseGroup?.code ? (
                        <Badge
                          variant="default"
                          title={getLocalizedExpenseGroupName(record.expenseGroup)}
                          data-testid={`general-expense-group-badge-${record.id}`}
                        >
                          {record.expenseGroup.code}
                        </Badge>
                      ) : (
                        <span
                          className="gba:text-muted-foreground"
                          data-testid={`general-expense-group-empty-${record.id}`}
                        >
                          Not set
                        </span>
                      )}
                    </TableCell>

                    <TableCell data-testid={`general-expense-additional-cell-${record.id}`} className="gba:text-center">
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
            setCurrentUsageInfo(null)
          }
        }}
      >
        <DialogContent className="gba:max-w-2xl" data-testid="general-expense-modal">
          <DialogHeader data-testid="general-expense-modal-header">
            <DialogTitle data-testid="general-expense-modal-title">
              {editingItem ? 'Edit' : 'Add'} General Expense Rule
            </DialogTitle>
          </DialogHeader>

          {/* Restricted edit warning */}
          {isRestrictedEdit && currentUsageInfo && (
            <Alert variant="warning" className="gba:mb-4" data-testid="general-expense-restricted-alert">
              <PiWarning className="gba:h-4 gba:w-4" />
              <AlertDescription>{currentUsageInfo.message}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <div className="gba:space-y-4" data-testid="general-expense-form">
              <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem data-testid="general-expense-code-field">
                      <FormLabel data-testid="general-expense-code-label">Code *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter expense code"
                          disabled={isRestrictedEdit}
                          data-testid="general-expense-code-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem data-testid="general-expense-name-field">
                      <FormLabel data-testid="general-expense-name-label">Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter expense name"
                          disabled={isRestrictedEdit}
                          data-testid="general-expense-name-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                <FormField
                  control={form.control}
                  name="reimbursable"
                  render={({ field }) => (
                    <FormItem
                      className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:space-y-0"
                      data-testid="general-expense-reimbursable-field"
                    >
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isRestrictedEdit}
                          data-testid="general-expense-reimbursable-checkbox"
                          className="gba:border-foreground/50 gba:disabled:opacity-100 gba:disabled:border-muted-foreground"
                        />
                      </FormControl>
                      <FormLabel
                        className={`gba:font-normal ${isRestrictedEdit ? 'gba:text-muted-foreground' : ''}`}
                        data-testid="general-expense-reimbursable-label"
                      >
                        Reimbursable
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxCodeRef"
                  render={({ field }) => (
                    <FormItem data-testid="general-expense-tax-code-field">
                      <FormLabel data-testid="general-expense-tax-code-label">Tax Code</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={catalogsLoading || isRestrictedEdit}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="general-expense-tax-code-select">
                            <SelectValue placeholder="Select tax code" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent data-testid="general-expense-tax-code-options">
                          {taxCodes.map(taxCode => (
                            <SelectItem
                              key={taxCode.id}
                              value={taxCode.id}
                              data-testid={`general-expense-tax-code-option-${taxCode.id}`}
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
              </div>

              <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                <FormField
                  control={form.control}
                  name="taxValue"
                  render={({ field }) => (
                    <FormItem data-testid="general-expense-tax-value-field">
                      <FormLabel data-testid="general-expense-tax-value-label">Tax Value (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={field.value ?? ''}
                          onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                          placeholder="0.00"
                          disabled={isRestrictedEdit}
                          data-testid="general-expense-tax-value-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expenseGroupRef"
                  render={({ field }) => (
                    <FormItem data-testid="general-expense-group-field">
                      <FormLabel data-testid="general-expense-group-label">Expense Group</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={isRestrictedEdit}>
                        <FormControl>
                          <SelectTrigger data-testid="general-expense-group-select">
                            <SelectValue placeholder="Select expense group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent data-testid="general-expense-group-options">
                          {expenseGroupOptions.map(option => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              data-testid={`general-expense-group-option-${option.value}`}
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

              <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                <FormField
                  control={form.control}
                  name="activeFrom"
                  render={({ field }) => (
                    <FormItem data-testid="general-expense-active-from-field">
                      <FormLabel data-testid="general-expense-active-from-label">Valid From *</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value ? dayjs(field.value).format('YYYY-MM-DD') : ''}
                          onChange={value => field.onChange(value || '')}
                          disabled={isRestrictedEdit}
                          placeholder="Select date..."
                          outputFormat="iso"
                          captionLayout="dropdown"
                          data-testid="general-expense-active-from-input"
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
                    <FormItem data-testid="general-expense-active-to-field">
                      <FormLabel data-testid="general-expense-active-to-label">Valid To</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value ? dayjs(field.value).format('YYYY-MM-DD') : ''}
                          onChange={value => field.onChange(value || undefined)}
                          placeholder="Select date..."
                          outputFormat="iso"
                          captionLayout="dropdown"
                          data-testid="general-expense-active-to-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Additional Properties (JSON) */}
              <FormItem data-testid="general-expense-additional-field">
                <FormLabel data-testid="general-expense-additional-label">Additional Info (JSON)</FormLabel>
                <FormControl>
                  <Textarea
                    value={additionalPropertiesJson}
                    onChange={e => setAdditionalPropertiesJson(e.target.value)}
                    placeholder='{"postingDetails": {"text": "", "account": "", "accountDetail": ""}}'
                    className="gba:font-mono gba:text-sm gba:min-h-[100px]"
                    data-testid="general-expense-additional-textarea"
                  />
                </FormControl>
                <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                  Enter valid JSON for posting details and other additional data
                </p>
              </FormItem>
            </div>
          </Form>

          <DialogFooter data-testid="general-expense-modal-footer">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalVisible(false)
                setIsRestrictedEdit(false)
                setCurrentUsageInfo(null)
              }}
              disabled={isSaving}
              data-testid="general-expense-modal-cancel-button"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} data-testid="general-expense-modal-save-button">
              {isSaving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="gba:max-w-md" data-testid="delete-confirmation-modal">
          <DialogHeader data-testid="delete-confirmation-modal-header">
            <DialogTitle data-testid="delete-confirmation-modal-title">Delete General Expense</DialogTitle>
          </DialogHeader>

          <div className="gba:py-4" data-testid="delete-confirmation-content">
            <p className="gba:text-muted-foreground">
              Are you sure you want to delete the general expense &quot;{itemToDelete?.code} - {itemToDelete?.name}
              &quot;?
            </p>
            <p className="gba:text-sm gba:text-destructive gba:mt-2">This action cannot be undone.</p>
          </div>

          <DialogFooter data-testid="delete-confirmation-modal-footer">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setItemToDelete(null)
              }}
              disabled={isDeleting}
              data-testid="delete-confirmation-cancel-button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              data-testid="delete-confirmation-confirm-button"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default GeneralExpensesTab
