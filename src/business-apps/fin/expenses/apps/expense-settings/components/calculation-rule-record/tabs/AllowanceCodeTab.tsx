import React, { useState, useEffect, useCallback } from 'react'
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
}

interface AllowanceCode {
  id: string
  code: string
  name: string
  reimbursable: boolean
  amount: number
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
  validFrom: string
  validTo?: string
  version?: number
  isDeleted: boolean
}

interface AllowanceCodeFormData {
  id?: string
  code: string
  name: string
  reimbursable: boolean
  amount: number
  calculation?: string
  expenseGroupRef?: string
  firstAllowanceRegionRuleId?: string
  firstAllowanceRegionRulePercent?: number
  secondAllowanceRegionRuleId?: string
  secondAllowanceRegionRulePercent?: number
  firstWageCode?: string
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

  // Extract date portion to avoid timezone issues (YYYY-MM-DD format)
  const formatDateForInput = (dateStr?: string) => {
    if (!dateStr) return undefined
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
    // Otherwise extract date portion using dayjs to handle ISO strings correctly
    return dayjs(dateStr).format('YYYY-MM-DD')
  }

  const form = useForm<AllowanceCodeFormData>({
    defaultValues: {
      code: '',
      name: '',
      reimbursable: false,
      amount: 0,
      calculation: '',
      expenseGroupRef: '',
      firstAllowanceRegionRuleId: '',
      firstAllowanceRegionRulePercent: 0,
      secondAllowanceRegionRuleId: '',
      secondAllowanceRegionRulePercent: 0,
      firstWageCode: '',
      validFrom: formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD'),
      validTo: formatDateForInput(activeTo) || '9999-12-31'
    }
  })

  // Pre-loaded usage status for all allowance codes (id -> isUsed)
  const [allowanceCodeUsageMap, setAllowanceCodeUsageMap] = useState<Record<string, boolean>>({})

  // Restricted edit state
  const [isRestrictedEdit, setIsRestrictedEdit] = useState(false)
  const [isCheckingUsage, setIsCheckingUsage] = useState(false)

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<AllowanceCode | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Calculation catalog options
  const [calculationOptions, setCalculationOptions] = useState<{ id: string; code: string; value: string }[]>([])

  // Allowance Region Rule options
  const [allowanceRegionRules, setAllowanceRegionRules] = useState<AllowanceRegionRule[]>([])

  // Expense Group options
  const [expenseGroupOptions, setExpenseGroupOptions] = useState<{ id: string; code: string; value: string }[]>([])

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
          }
        }
      `
      const result = await graphqlClient.request<{ AllowanceRegionRule: AllowanceRegionRule[] }>(query)
      setAllowanceRegionRules(result.AllowanceRegionRule || [])
    } catch (error) {
      console.error('Failed to fetch allowance region rules:', error)
    }
  }, [graphqlClient])

  // Fetch expense group options
  const fetchExpenseGroupOptions = useCallback(async () => {
    try {
      const query = `
        query GetExpenseGroupCatalog {
          CatalogEntry(
            where: {
              catalog: {
                identifier: { _eq: "ExpenseGroup" }
                version: { _eq: "v1" }
              }
            }
            orderBy: { value: ASC }
          ) {
            id
            code
            value
          }
        }
      `
      const result = await graphqlClient.request<{ CatalogEntry: { id: string; code: string; value: string }[] }>(query)
      setExpenseGroupOptions(result.CatalogEntry || [])
    } catch (error) {
      console.error('Failed to fetch expense group options:', error)
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

      const transformedCodes: AllowanceCode[] = codes.map((code: any) => ({
        id: code.id,
        code: code.code || '',
        name: code.name || '',
        reimbursable: code.reimbursable || false,
        amount: code.amount || 0,
        calculation: code.calculationRef || code.calculation?.id || '',
        expenseGroup: code.expenseGroup || { id: '', value: '', code: '' },
        firstAllowanceRegionRuleId: code.firstAllowanceRegionRuleId,
        firstAllowanceRegionRulePercent: code.firstAllowanceRegionRulePercent,
        firstAllowanceRegionRule: code.firstAllowanceRegionRule,
        secondAllowanceRegionRuleId: code.secondAllowanceRegionRuleId,
        secondAllowanceRegionRulePercent: code.secondAllowanceRegionRulePercent,
        secondAllowanceRegionRule: code.secondAllowanceRegionRule,
        firstWageCode: code.firstWageCode,
        validFrom: code.activeFrom,
        validTo: code.activeTo,
        version: code.version || 1,
        isDeleted: false
      }))

      setAllowanceCodes(transformedCodes)

      // Load usage status for all allowance codes
      if (transformedCodes.length > 0) {
        await loadAllowanceCodeUsageStatus(transformedCodes.map(c => c.id))
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load allowance codes')
    } finally {
      setIsLoading(false)
    }
  }, [ruleId, graphqlClient])

  // Load usage status for all allowance codes in a single batched query
  const loadAllowanceCodeUsageStatus = useCallback(
    async (allowanceCodeIds: string[]) => {
      if (allowanceCodeIds.length === 0) return

      try {
        const query = `
        query CheckAllAllowanceCodeUsage($allowanceCodeIds: [uuid!]!) {
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

        const result = await graphqlClient.request<{
          planItems: { expenseRuleAllowanceCodeId: string }[]
          items: { expenseRuleAllowanceCodeId: string }[]
          positions: { expenseRuleAllowanceCodeId: string }[]
        }>(query, { allowanceCodeIds })

        // Build a set of used allowance code IDs
        const usedIds = new Set<string>()
        result.planItems?.forEach(item => usedIds.add(item.expenseRuleAllowanceCodeId))
        result.items?.forEach(item => usedIds.add(item.expenseRuleAllowanceCodeId))
        result.positions?.forEach(item => usedIds.add(item.expenseRuleAllowanceCodeId))

        // Create usage map
        const usageMap: Record<string, boolean> = {}
        allowanceCodeIds.forEach(id => {
          usageMap[id] = usedIds.has(id)
        })

        setAllowanceCodeUsageMap(usageMap)
      } catch (error) {
        console.error('Error loading allowance code usage status:', error)
      }
    },
    [graphqlClient]
  )

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchAllowanceCodes()
      fetchCalculationOptions()
      fetchAllowanceRegionRules()
      fetchExpenseGroupOptions()
    }
  }, [
    ruleId,
    accessToken,
    fetchAllowanceCodes,
    fetchCalculationOptions,
    fetchAllowanceRegionRules,
    fetchExpenseGroupOptions
  ])

  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD/MM/YYYY')
  }

  const handleAdd = () => {
    setEditingItem(null)
    setIsRestrictedEdit(false)

    // Determine validity period based on existing entries
    let validFromValue = formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD')
    let validToValue: string | undefined = undefined

    if (allowanceCodes.length > 0) {
      // Use the same validity period as the first existing entry
      const existingEntry = allowanceCodes[0]
      validFromValue = formatDateForInput(existingEntry.validFrom) || validFromValue
      validToValue = formatDateForInput(existingEntry.validTo)
    } else {
      // No existing entries - set validTo to December 31, 9999 (or rule's activeTo if set)
      validToValue = formatDateForInput(activeTo) || '9999-12-31'
    }

    form.reset({
      code: '',
      name: '',
      reimbursable: false,
      amount: 0,
      calculation: '',
      expenseGroupRef: '',
      firstAllowanceRegionRuleId: '',
      firstAllowanceRegionRulePercent: 0,
      secondAllowanceRegionRuleId: '',
      secondAllowanceRegionRulePercent: 0,
      firstWageCode: '',
      validFrom: validFromValue,
      validTo: validToValue
    })
    setIsModalVisible(true)
  }

  const handleEdit = async (record: AllowanceCode) => {
    setIsCheckingUsage(true)

    try {
      // Check if allowance code is used
      const isUsed = allowanceCodeUsageMap[record.id] || false
      setIsRestrictedEdit(isUsed)

      form.reset({
        id: record.id,
        code: record.code,
        name: record.name,
        reimbursable: record.reimbursable,
        amount: record.amount,
        calculation: record.calculation,
        expenseGroupRef: record.expenseGroup?.id,
        firstAllowanceRegionRuleId: record.firstAllowanceRegionRuleId || '',
        firstAllowanceRegionRulePercent: record.firstAllowanceRegionRulePercent || 0,
        secondAllowanceRegionRuleId: record.secondAllowanceRegionRuleId || '',
        secondAllowanceRegionRulePercent: record.secondAllowanceRegionRulePercent || 0,
        firstWageCode: record.firstWageCode || '',
        validFrom:
          formatDateForInput(record.validFrom) || formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD'),
        validTo: formatDateForInput(record.validTo),
        version: record.version
      })

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
      await expenseSettingsClient.deleteExpenseRuleAllowanceCode(itemToDelete.id, itemToDelete.version || 1)
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

  const handleSave = async () => {
    try {
      setIsSaving(true)

      const formValues = form.getValues()

      // Date validation
      const ruleFrom = dayjs(activeFrom)
      const ruleTo = activeTo ? dayjs(activeTo) : null
      const entryFrom = dayjs(formValues.validFrom)
      const entryTo = formValues.validTo ? dayjs(formValues.validTo) : null

      // Valid From cannot be before rule's Valid From
      if (entryFrom.isBefore(ruleFrom, 'day')) {
        form.setError('validFrom', {
          type: 'manual',
          message: `Valid From cannot be before the rule's Valid From (${ruleFrom.format('DD.MM.YYYY')})`
        })
        setIsSaving(false)
        return
      }

      // Valid From cannot be after rule's Valid To
      if (ruleTo && entryFrom.isAfter(ruleTo, 'day')) {
        form.setError('validFrom', {
          type: 'manual',
          message: `Valid From cannot be after the rule's Valid To (${ruleTo.format('DD.MM.YYYY')})`
        })
        setIsSaving(false)
        return
      }

      // Valid To cannot be after rule's Valid To
      if (ruleTo && entryTo && entryTo.isAfter(ruleTo, 'day')) {
        form.setError('validTo', {
          type: 'manual',
          message: `Valid To cannot be after the rule's Valid To (${ruleTo.format('DD.MM.YYYY')})`
        })
        setIsSaving(false)
        return
      }

      // Valid To cannot be before Valid From
      if (entryTo && entryFrom.isAfter(entryTo, 'day')) {
        form.setError('validTo', {
          type: 'manual',
          message: `Valid To cannot be before Valid From`
        })
        setIsSaving(false)
        return
      }

      const saveData: any = {
        ...(editingItem && { id: editingItem.id, version: editingItem.version }),
        expenseRuleId: ruleId,
        // Convert to ISO format for API
        activeTo: formValues.validTo ? dayjs(formValues.validTo).endOf('day').toISOString() : null
      }

      // Only include other fields if not in restricted edit mode
      if (!isRestrictedEdit) {
        saveData.code = formValues.code
        saveData.name = formValues.name
        saveData.reimbursable = formValues.reimbursable
        saveData.amount = formValues.amount
        saveData.calculationRef = formValues.calculation || null
        saveData.expenseGroupRef = formValues.expenseGroupRef
        saveData.firstAllowanceRegionRuleId = formValues.firstAllowanceRegionRuleId || null
        saveData.firstAllowanceRegionRulePercent = formValues.firstAllowanceRegionRulePercent || 0
        saveData.secondAllowanceRegionRuleId = formValues.secondAllowanceRegionRuleId || null
        saveData.secondAllowanceRegionRulePercent = formValues.secondAllowanceRegionRulePercent || 0
        saveData.firstWageCode = formValues.firstWageCode || null
        // Convert to ISO format for API
        saveData.activeFrom = formValues.validFrom ? dayjs(formValues.validFrom).startOf('day').toISOString() : null
      }

      await expenseSettingsClient.saveExpenseRuleAllowanceCode(saveData)
      toast.success(`Allowance code ${editingItem ? 'updated' : 'created'} successfully`)
      setIsModalVisible(false)
      setIsRestrictedEdit(false)
      await fetchAllowanceCodes()
    } catch (error) {
      toast.error(`Failed to ${editingItem ? 'update' : 'create'} allowance code`)
      console.error('Save error:', error)
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
          {allowanceCodes.length > 0 ? (
            <div className="gba:overflow-x-auto">
              <Table data-testid="allowance-codes-table">
                <TableHeader data-testid="allowance-codes-table-header">
                  <TableRow data-testid="allowance-codes-table-header-row">
                    <TableHead className="gba:w-[60px]" data-testid="allowance-codes-table-header-actions">
                      ACTIONS
                    </TableHead>
                    <TableHead className="gba:w-[150px]" data-testid="allowance-codes-table-header-code">
                      CODE
                    </TableHead>
                    <TableHead className="gba:w-[180px]" data-testid="allowance-codes-table-header-name">
                      NAME
                    </TableHead>
                    <TableHead
                      className="gba:w-[120px] gba:text-center"
                      data-testid="allowance-codes-table-header-reimbursable"
                    >
                      REIMBURSABLE
                    </TableHead>
                    <TableHead
                      className="gba:w-[100px] gba:text-right"
                      data-testid="allowance-codes-table-header-amount"
                    >
                      AMOUNT
                    </TableHead>
                    <TableHead className="gba:w-[180px]" data-testid="allowance-codes-table-header-region-rule">
                      REGION RULE
                    </TableHead>
                    <TableHead
                      className="gba:w-[100px] gba:text-center"
                      data-testid="allowance-codes-table-header-percentage"
                    >
                      PERCENTAGE
                    </TableHead>
                    <TableHead className="gba:w-[120px]" data-testid="allowance-codes-table-header-calculation">
                      CALCULATION
                    </TableHead>
                    <TableHead className="gba:w-[130px]" data-testid="allowance-codes-table-header-expense-group">
                      EXPENSE GROUP
                    </TableHead>
                    <TableHead className="gba:w-[120px]" data-testid="allowance-codes-table-header-valid-from">
                      VALID FROM
                    </TableHead>
                    <TableHead className="gba:w-[120px]" data-testid="allowance-codes-table-header-valid-to">
                      VALID TO
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody data-testid="allowance-codes-table-body">
                  {allowanceCodes.map(record => (
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
                              {/* Only show delete option if allowance code is not used */}
                              {!allowanceCodeUsageMap[record.id] && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={e => {
                                      e.stopPropagation()
                                      handleDeleteClick(record)
                                    }}
                                    className="gba:text-destructive"
                                    data-testid={`allowance-code-delete-${record.id}`}
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
                          {record.amount > 0 ? record.amount.toFixed(1) : '-'}
                        </span>
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
        <DialogContent className="gba:max-w-3xl" data-testid="allowance-code-modal">
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

                {/* Expense Group */}
                <FormField
                  control={form.control}
                  name="expenseGroupRef"
                  render={({ field }) => (
                    <FormItem data-testid="allowance-code-expense-group-field">
                      <FormLabel data-testid="allowance-code-expense-group-label">Expense Group</FormLabel>
                      <Select
                        value={field.value || 'none'}
                        onValueChange={value => field.onChange(value === 'none' ? '' : value)}
                        disabled={isRestrictedEdit}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="allowance-code-expense-group-select">
                            <SelectValue placeholder="Select expense group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none" data-testid="allowance-code-expense-group-option-none">
                            None
                          </SelectItem>
                          {expenseGroupOptions.map(group => (
                            <SelectItem
                              key={group.id}
                              value={group.id}
                              data-testid={`allowance-code-expense-group-option-${group.code}`}
                            >
                              {group.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Amount */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem data-testid="allowance-code-amount-field">
                      <FormLabel data-testid="allowance-code-amount-label">Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="57.5"
                          value={field.value}
                          onChange={e => field.onChange(Number(e.target.value))}
                          disabled={isRestrictedEdit}
                          data-testid="allowance-code-amount-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          {allowanceRegionRules.map(rule => (
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
                  render={({ field }) => (
                    <FormItem data-testid="allowance-code-percentage-field">
                      <FormLabel data-testid="allowance-code-percentage-label">Percentage</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="-100"
                          max="200"
                          placeholder="100"
                          value={field.value}
                          onChange={e => field.onChange(Number(e.target.value))}
                          disabled={isRestrictedEdit}
                          data-testid="allowance-code-percentage-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
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
                          onChange={date => field.onChange(date)}
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
                          onChange={date => field.onChange(date)}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="gba:max-w-md" data-testid="allowance-code-delete-confirmation-modal">
          <DialogHeader data-testid="allowance-code-delete-confirmation-modal-header">
            <DialogTitle data-testid="allowance-code-delete-confirmation-modal-title">
              Delete Allowance Code
            </DialogTitle>
          </DialogHeader>

          <div className="gba:py-4" data-testid="allowance-code-delete-confirmation-content">
            <p className="gba:text-muted-foreground">
              Are you sure you want to delete the allowance code &quot;{itemToDelete?.code} - {itemToDelete?.name}
              &quot;?
            </p>
            <p className="gba:text-sm gba:text-destructive gba:mt-2">This action cannot be undone.</p>
          </div>

          <DialogFooter data-testid="allowance-code-delete-confirmation-modal-footer">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setItemToDelete(null)
              }}
              disabled={isDeleting}
              data-testid="allowance-code-delete-confirmation-cancel-button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              data-testid="allowance-code-delete-confirmation-confirm-button"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AllowanceCodeTab
