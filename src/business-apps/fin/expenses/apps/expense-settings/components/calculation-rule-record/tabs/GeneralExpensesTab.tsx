import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  Spinner,
  Toaster,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { DeleteConfirmationDialog } from '../shared'
import { GeneralExpenseForm, GeneralExpenseFormData, UsageInfo } from '../../../forms/general-expense-form'
import {
  PiPlus,
  PiCalendar,
  PiReceipt,
  PiPercent,
  PiDotsThreeVertical,
  PiPencil,
  PiTrash,
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
import { ExpenseRuleGeneralExpense, ExpenseGroupWithTranslations } from '../../../types/ExpenseRuleTypes'
import { expenseSettingsClient, formatDate, toISOStartOfDay, toISOEndOfDay } from '../../../utils'
import { useTableSorting, createFieldMappings } from '../hooks'
import { validateDateRange } from '../utils/sharedDateValidation'

interface GeneralExpensesTabProps {
  ruleId: string
  accessToken: string
  activeFrom: string
  activeTo?: string
}

// Extended type for expense with additionalProperties
interface GeneralExpenseWithAdditional extends ExpenseRuleGeneralExpense {
  additionalProperties?: Record<string, unknown>
}

const GeneralExpensesTab: React.FC<GeneralExpensesTabProps> = ({ ruleId, accessToken, activeFrom, activeTo }) => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [generalExpenses, setGeneralExpenses] = useState<GeneralExpenseWithAdditional[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<GeneralExpenseWithAdditional | null>(null)

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

  // Sorting - using shared hook
  // Memoize nestedFieldMappings to prevent function recreation on every render
  const nestedFieldMappings = useMemo(
    () => ({
      expenseGroup: {
        field: 'expenseGroup.code',
        secondarySort: 'code'
      }
    }),
    []
  )

  // Memoize field mappings to prevent unnecessary recalculations
  const fieldMappings = useMemo(
    () => ({
      code: createFieldMappings.string((a: GeneralExpenseWithAdditional) => a.code),
      reimbursable: createFieldMappings.boolean((a: GeneralExpenseWithAdditional) => a.reimbursable),
      taxCodeRef: createFieldMappings.string((a: GeneralExpenseWithAdditional) => a.taxCodeRef),
      expenseGroup: createFieldMappings.nested((a: GeneralExpenseWithAdditional) => a.expenseGroup),
      activeFrom: createFieldMappings.date((a: GeneralExpenseWithAdditional) => a.activeFrom)
    }),
    []
  )

  // Sorting - using shared hook (single source of truth)
  const sorting = useTableSorting<GeneralExpenseWithAdditional>({
    defaultSortField: 'code',
    defaultSortOrder: 'ASC',
    nestedFieldMappings,
    data: generalExpenses,
    fieldMappings
  })

  // Set up client
  expenseSettingsClient.setAccessToken(accessToken)

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
            expenseRuleGeneralExpense(where: { isDeleted: { _eq: false } }, orderBy: { code: ASC }) {
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
  }, [ruleId, graphqlClient, loadExpenseUsageStatus])

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchGeneralExpenses()
    }
  }, [ruleId, accessToken, fetchGeneralExpenses])

  // Sorted data is provided by useTableSorting hook (single source of truth)
  // Note: expenseGroup has secondary sort by code, handled in nestedFieldMappings
  const sortedExpenses = sorting.sortedData || generalExpenses

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
      await expenseSettingsClient.deleteExpenseRuleGeneralExpense(itemToDelete.id, itemToDelete.version)
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

  // Handle save from the form component
  const handleFormSave = async (
    formData: GeneralExpenseFormData & { additionalProperties?: Record<string, unknown> }
  ) => {
    try {
      // Debug logging

      // IMPORTANT: Always use editingItem for id and version when updating
      // The form may not reliably track these hidden fields
      const isUpdate = !!editingItem
      const saveData: any = {
        ...(isUpdate && { id: editingItem.id, version: editingItem.version }),
        expenseRuleId: ruleId,
        activeTo: formData.activeTo ? toISOEndOfDay(formData.activeTo) : null,
        additionalProperties: formData.additionalProperties
      }

      // Only include other fields if not in restricted edit mode
      if (!isRestrictedEdit) {
        saveData.code = formData.code
        saveData.name = formData.name
        saveData.reimbursable = formData.reimbursable
        saveData.taxCodeRef = formData.taxCodeRef
        saveData.taxValue = formData.taxValue
        saveData.activeFrom = formData.activeFrom ? toISOStartOfDay(formData.activeFrom) : null
        saveData.expenseGroupRef = formData.expenseGroupRef
      }

      // Validate that detail dates fall within the rule's validity period
      if (!isRestrictedEdit && formData.activeFrom) {
        const dateErrors = validateDateRange({
          entryFrom: formData.activeFrom,
          entryTo: formData.activeTo,
          ruleFrom: activeFrom,
          ruleTo: activeTo
        })

        if (dateErrors.length > 0) {
          // Show all date validation errors
          dateErrors.forEach(err => {
            toast.error(err.message)
          })
          return // Stop save operation
        }
      }

      await expenseSettingsClient.saveExpenseRuleGeneralExpense(saveData)
      toast.success(`General expense rule ${editingItem ? 'updated' : 'created'} successfully`)

      setIsModalVisible(false)
      setIsRestrictedEdit(false)
      setCurrentUsageInfo(null)
      setEditingItem(null)
      await fetchGeneralExpenses()
    } catch (err) {
      toast.error(`Failed to ${editingItem ? 'update' : 'create'} general expense rule`)
      console.error('Save error:', err)
      throw err // Re-throw so the form knows the save failed
    }
  }

  const formatTaxValue = (taxValue?: number): string => {
    if (taxValue === undefined || taxValue === null) return 'Not set'
    return `${taxValue}%`
  }

  // Get localized label for expense group

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

  // Sorting functions are provided by useTableSorting hook

  const formatTaxCode = (taxCodeRef?: string): string => {
    if (!taxCodeRef) return 'Not set'

    // Extract the actual tax code from the reference
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
          <Table data-testid="general-expenses-table">
            <TableHeader data-testid="general-expenses-table-header">
              <TableRow data-testid="general-expenses-table-header-row">
                <TableHead className="gba:w-[60px]" data-testid="general-expenses-table-header-actions">
                  ACTIONS
                </TableHead>
                <TableHead
                  className="gba:w-[180px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                  onClick={() => sorting.handleSort('code')}
                  data-testid="general-expenses-table-header-expense"
                >
                  <div className="gba:flex gba:items-center">
                    EXPENSE
                    {sorting.renderSortIcon('code')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[100px] gba:text-center gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                  onClick={() => sorting.handleSort('reimbursable')}
                  data-testid="general-expenses-table-header-reimbursable"
                >
                  <div className="gba:flex gba:items-center gba:justify-center">
                    REIMBURSABLE
                    {sorting.renderSortIcon('reimbursable')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[120px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                  onClick={() => sorting.handleSort('taxCodeRef')}
                  data-testid="general-expenses-table-header-tax"
                >
                  <div className="gba:flex gba:items-center">
                    TAX
                    {sorting.renderSortIcon('taxCodeRef')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[160px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                  onClick={() => sorting.handleSort('activeFrom')}
                  data-testid="general-expenses-table-header-validity"
                >
                  <div className="gba:flex gba:items-center">
                    VALIDITY
                    {sorting.renderSortIcon('activeFrom')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[120px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                  onClick={() => sorting.handleSort('expenseGroup')}
                  data-testid="general-expenses-table-header-group"
                >
                  <div className="gba:flex gba:items-center">
                    EXPENSE GROUP
                    {sorting.renderSortIcon('expenseGroup')}
                  </div>
                </TableHead>
                <TableHead className="gba:w-[250px]" data-testid="general-expenses-table-header-additional">
                  ADDITIONAL INFO
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody data-testid="general-expenses-table-body">
              {sortedExpenses.length === 0 ? (
                <TableRow data-testid="general-expenses-empty-row">
                  <TableCell colSpan={7} className="gba:text-center gba:py-8" data-testid="general-expenses-empty-cell">
                    <div className="gba:text-muted-foreground" data-testid="general-expenses-empty-message">
                      No general expense rules found. Click "Add General Expense" to create one.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedExpenses.map(record => (
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

      {/* Add/Edit Form */}
      <GeneralExpenseForm
        open={isModalVisible}
        onOpenChange={open => {
          setIsModalVisible(open)
          if (!open) {
            setIsRestrictedEdit(false)
            setCurrentUsageInfo(null)
            setEditingItem(null)
          }
        }}
        accessToken={accessToken}
        ruleId={ruleId}
        ruleActiveFrom={activeFrom}
        ruleActiveTo={activeTo}
        editingItem={
          editingItem
            ? {
                id: editingItem.id,
                expenseRuleId: ruleId,
                code: editingItem.code,
                name: editingItem.name,
                reimbursable: editingItem.reimbursable,
                taxCodeRef: editingItem.taxCodeRef,
                taxValue: editingItem.taxValue,
                activeFrom: editingItem.activeFrom,
                activeTo: editingItem.activeTo,
                expenseGroupRef: editingItem.expenseGroup?.id,
                version: editingItem.version,
                additionalProperties: editingItem.additionalProperties
              }
            : null
        }
        usageInfo={currentUsageInfo}
        isRestrictedEdit={isRestrictedEdit}
        onSave={handleFormSave}
        onCancel={() => {
          setIsModalVisible(false)
          setIsRestrictedEdit(false)
          setCurrentUsageInfo(null)
          setEditingItem(null)
        }}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete General Expense"
        itemDescription={`the general expense "${itemToDelete?.code} - ${itemToDelete?.name}"`}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false)
          setItemToDelete(null)
        }}
        testIdPrefix="general-expense-delete"
      />
    </div>
  )
}

export default GeneralExpensesTab
