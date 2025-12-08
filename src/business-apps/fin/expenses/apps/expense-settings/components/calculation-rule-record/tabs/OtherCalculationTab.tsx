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
  Spinner,
  Toaster,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
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
  PiCalendar,
  PiCode,
  PiBuilding,
  PiPencil,
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
import { ExpenseSettingsClient } from '../../../utils/ExpenseSettingsClient'

interface OtherCalculationTabProps {
  ruleId: string
  accessToken: string
  activeFrom: string
  activeTo?: string
}

// Backend enum values for source field
type SourceEnum = 'GENERAL_EXPENSE_RULE' | 'MILEAGE_RULE' | 'ALLOWANCE_RULE' | 'ATTENTION_RULE' | ''

const SOURCE_DISPLAY_MAP: Record<SourceEnum, string> = {
  GENERAL_EXPENSE_RULE: 'Expense',
  MILEAGE_RULE: 'Mileage',
  ALLOWANCE_RULE: 'Allowance',
  ATTENTION_RULE: 'Attention',
  '': 'Not Linked'
}

interface OtherCalculation {
  id: string
  source: SourceEnum
  relatedId?: string
  relatedCode?: string
  relatedName?: string
  costCenter?: {
    id: string
    code: string
    name: string
  }
  reimbursablePercent?: number
  validFrom: string
  validTo?: string
  version?: number
}

interface OtherCalculationFormData {
  id?: string
  source: SourceEnum
  relatedId?: string
  costCenterId?: string
  reimbursablePercent?: number
  validFrom: string
  validTo?: string
  version?: number
}

interface RelatedOption {
  id: string
  code: string
  name: string
}

interface CostCenterOption {
  id: string
  code: string
  name: string
}

// Usage check result
interface UsageInfo {
  isUsed: boolean
  usedIn: {
    positions?: number
  }
  message: string
}

const OtherCalculationTab: React.FC<OtherCalculationTabProps> = ({ ruleId, accessToken, activeFrom, activeTo }) => {
  const [otherCalculations, setOtherCalculations] = useState<OtherCalculation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingItem, setEditingItem] = useState<OtherCalculation | null>(null)

  // Available options for dropdowns
  const [availableExpenses, setAvailableExpenses] = useState<RelatedOption[]>([])
  const [availableMileage, setAvailableMileage] = useState<RelatedOption[]>([])
  const [availableAllowanceCodes, setAvailableAllowanceCodes] = useState<RelatedOption[]>([])
  const [availableCostCenters, setAvailableCostCenters] = useState<CostCenterOption[]>([])

  // Extract date portion to avoid timezone issues (YYYY-MM-DD format)
  const formatDateForInput = (dateStr?: string) => {
    if (!dateStr) return undefined
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
    // Otherwise extract date portion using dayjs to handle ISO strings correctly
    return dayjs(dateStr).format('YYYY-MM-DD')
  }

  const form = useForm<OtherCalculationFormData>({
    defaultValues: {
      source: '',
      relatedId: undefined,
      costCenterId: undefined,
      reimbursablePercent: undefined,
      validFrom: formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD'),
      validTo: formatDateForInput(activeTo) || '9999-12-31'
    }
  })

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<OtherCalculation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Usage check state
  const [isCheckingUsage, setIsCheckingUsage] = useState(false)
  const [currentUsageInfo, setCurrentUsageInfo] = useState<UsageInfo | null>(null)
  const [isRestrictedEdit, setIsRestrictedEdit] = useState(false)

  // Pre-loaded usage status for all calculations (calculation id -> isUsed)
  const [calcUsageMap, setCalcUsageMap] = useState<Record<string, boolean>>({})

  const graphqlClient = useGraphQLClient(accessToken)
  const expenseSettingsClient = new ExpenseSettingsClient()
  expenseSettingsClient.setAccessToken(accessToken)

  // Load cost centers
  const loadCostCenters = useCallback(async () => {
    try {
      const query = `
        query GetCostCenters {
          CostCenter(where: { isDeleted: { _eq: false } }, orderBy: { code: ASC }, limit: 100) {
            id
            code
            name
          }
        }
      `
      const result = await graphqlClient.request<{ CostCenter: CostCenterOption[] }>(query)
      setAvailableCostCenters(result.CostCenter || [])
    } catch (error) {
      console.error('Failed to load cost centers:', error)
    }
  }, [graphqlClient])

  // REAL GraphQL data from ExpenseRuleOtherCalc
  const fetchOtherCalculations = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const query = `
        query GetExpenseRuleOtherCalculations($ruleId: uuid!) {
          ExpenseRule(where: { id: { _eq: $ruleId } }) {
            id
            expenseRuleOtherCalc(where: { isDeleted: { _eq: false } }, orderBy: { createdAt: ASC }) {
            id
            activeFrom
            activeTo
            version
              source
              reimbursablePercent
              costCenterId
            costCenter {
              id
              code
              name
            }
              expenseRuleAllowanceCodeId
            expenseRuleAllowanceCode {
                id
                code
                name
              }
              expenseRuleGeneralExpenseId
              expenseRuleGeneralExpense {
                id
                code
                name
              }
              expenseRuleMileageId
              expenseRuleMileage {
                id
                code
                name
              }
            }
            expenseRuleGeneralExpense(where: { isDeleted: { _eq: false } }, orderBy: { code: ASC }) {
              id
              code
              name
            }
            expenseRuleMileage(where: { isDeleted: { _eq: false } }, orderBy: { code: ASC }) {
              id
              code
              name
            }
            expenseRuleAllowanceCode(where: { isDeleted: { _eq: false } }, orderBy: { code: ASC }) {
              id
              code
              name
            }
          }
        }
      `

      const result = await graphqlClient.request<{
        ExpenseRule: {
          expenseRuleOtherCalc: any[]
          expenseRuleGeneralExpense: any[]
          expenseRuleMileage: any[]
          expenseRuleAllowanceCode: any[]
        }[]
      }>(query, { ruleId })

      const expenseRule = result.ExpenseRule?.[0]
      const otherCalcs = expenseRule?.expenseRuleOtherCalc || []

      // Set available options for dropdowns
      setAvailableExpenses(
        (expenseRule?.expenseRuleGeneralExpense || []).map((e: any) => ({
          id: e.id,
          code: e.code || '',
          name: e.name || ''
        }))
      )
      setAvailableMileage(
        (expenseRule?.expenseRuleMileage || []).map((m: any) => ({
          id: m.id,
          code: m.code || '',
          name: m.name || ''
        }))
      )
      setAvailableAllowanceCodes(
        (expenseRule?.expenseRuleAllowanceCode || []).map((a: any) => ({
          id: a.id,
          code: a.code || '',
          name: a.name || ''
        }))
      )

      const transformedCalculations: OtherCalculation[] = otherCalcs.map((calc: any) => {
        // Determine related info based on linked entities
        let relatedId: string | undefined
        let relatedCode: string | undefined
        let relatedName: string | undefined

        if (calc.expenseRuleGeneralExpense) {
          relatedId = calc.expenseRuleGeneralExpenseId
          relatedCode = calc.expenseRuleGeneralExpense.code
          relatedName = calc.expenseRuleGeneralExpense.name
        } else if (calc.expenseRuleMileage) {
          relatedId = calc.expenseRuleMileageId
          relatedCode = calc.expenseRuleMileage.code
          relatedName = calc.expenseRuleMileage.name
        } else if (calc.expenseRuleAllowanceCode) {
          relatedId = calc.expenseRuleAllowanceCodeId
          relatedCode = calc.expenseRuleAllowanceCode.code
          relatedName = calc.expenseRuleAllowanceCode.name
        }

        return {
          id: calc.id,
          source: calc.source || '',
          relatedId,
          relatedCode,
          relatedName,
          costCenter: calc.costCenter || undefined,
          reimbursablePercent: calc.reimbursablePercent || undefined,
          validFrom: calc.activeFrom,
          validTo: calc.activeTo,
          version: calc.version
        }
      })

      setOtherCalculations(transformedCalculations)

      // Load usage status for all calculations
      if (transformedCalculations.length > 0) {
        await loadCalcUsageStatus(transformedCalculations.map(c => c.id))
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load other calculations')
    } finally {
      setIsLoading(false)
    }
  }, [ruleId, graphqlClient])

  // Load usage status for all calculations
  // Note: OtherCalc doesn't have direct references in ExpensePosition,
  // so we can't track usage. All calculations are treated as not in use.
  const loadCalcUsageStatus = useCallback(async (calcIds: string[]) => {
    if (calcIds.length === 0) return

    // Since there's no direct link to track usage, allow all operations
    const usageMap: Record<string, boolean> = {}
    calcIds.forEach(id => {
      usageMap[id] = false
    })
    setCalcUsageMap(usageMap)
  }, [])

  // Check if a calculation is used
  // Note: OtherCalc doesn't have direct references in ExpensePosition
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const checkCalcUsage = useCallback(async (id: string): Promise<UsageInfo> => {
    // Since there's no direct link to track usage, return not used
    return { isUsed: false, usedIn: {}, message: '' }
  }, [])

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchOtherCalculations()
      loadCostCenters()
    }
  }, [ruleId, accessToken, fetchOtherCalculations, loadCostCenters])

  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD/MM/YYYY')
  }

  const sourceOptions = [
    { value: '', label: 'Not linked' },
    { value: 'GENERAL_EXPENSE_RULE', label: 'Expense' },
    { value: 'MILEAGE_RULE', label: 'Mileage' },
    { value: 'ALLOWANCE_RULE', label: 'Allowance Code' }
  ]

  const getRelatedOptions = (): RelatedOption[] => {
    const source = form.watch('source')
    if (source === 'GENERAL_EXPENSE_RULE') return availableExpenses
    if (source === 'MILEAGE_RULE') return availableMileage
    if (source === 'ALLOWANCE_RULE') return availableAllowanceCodes
    return []
  }

  const handleAdd = () => {
    setEditingItem(null)
    setIsRestrictedEdit(false)
    setCurrentUsageInfo(null)

    // ALWAYS inherit validity period from parent Expense Rule
    const validFromValue = formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD')
    const validToValue = formatDateForInput(activeTo) || '9999-12-31'

    form.reset({
      source: '',
      relatedId: undefined,
      costCenterId: undefined,
      reimbursablePercent: undefined,
      validFrom: validFromValue,
      validTo: validToValue
    })
    setIsModalVisible(true)
  }

  // Handle edit action - checks usage first
  const handleEdit = async (record: OtherCalculation) => {
    setIsCheckingUsage(true)

    try {
      const usageInfo = await checkCalcUsage(record.id)
      setCurrentUsageInfo(usageInfo)
      setIsRestrictedEdit(usageInfo.isUsed)

      setEditingItem(record)
      form.reset({
        id: record.id,
        source: record.source,
        relatedId: record.relatedId,
        costCenterId: record.costCenter?.id,
        reimbursablePercent: record.reimbursablePercent,
        validFrom:
          formatDateForInput(record.validFrom) || formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD'),
        validTo: formatDateForInput(record.validTo),
        version: record.version
      })
      setIsModalVisible(true)
    } catch {
      toast.error('Failed to check usage status')
    } finally {
      setIsCheckingUsage(false)
    }
  }

  // Handle delete action - opens confirmation dialog (usage already checked via calcUsageMap)
  const handleDeleteClick = (record: OtherCalculation) => {
    setItemToDelete(record)
    setDeleteDialogOpen(true)
  }

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return

    setIsDeleting(true)
    try {
      await expenseSettingsClient.deleteExpenseRuleOtherCalc(itemToDelete.id, itemToDelete.version)
      toast.success('Other calculation deleted successfully')
      setDeleteDialogOpen(false)
      setItemToDelete(null)
      await fetchOtherCalculations()
    } catch (error) {
      toast.error('Failed to delete other calculation')
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

      // IMPORTANT: Always use editingItem for id and version when updating
      const isUpdate = !!editingItem
      const payload: any = {
        ...(isUpdate && { id: editingItem.id, version: editingItem.version }),
        expenseRuleId: ruleId,
        // Convert to ISO format for API
        activeTo: formValues.validTo ? dayjs(formValues.validTo).endOf('day').toISOString() : null
      }

      // Only include other fields if not in restricted edit mode
      if (!isRestrictedEdit) {
        // Convert to ISO format for API
        payload.activeFrom = formValues.validFrom ? dayjs(formValues.validFrom).startOf('day').toISOString() : null
        payload.costCenterId = formValues.costCenterId || null
        payload.source = formValues.source || null
        payload.reimbursablePercent = formValues.reimbursablePercent || null
        // Set the related ID based on source (using backend enum values)
        payload.expenseRuleGeneralExpenseId = formValues.source === 'GENERAL_EXPENSE_RULE' ? formValues.relatedId : null
        payload.expenseRuleMileageId = formValues.source === 'MILEAGE_RULE' ? formValues.relatedId : null
        payload.expenseRuleAllowanceCodeId = formValues.source === 'ALLOWANCE_RULE' ? formValues.relatedId : null
      }

      await expenseSettingsClient.saveExpenseRuleOtherCalc(payload)

      toast.success(`Other calculation ${editingItem ? 'updated' : 'created'} successfully`)
      setIsModalVisible(false)
      setIsRestrictedEdit(false)
      setCurrentUsageInfo(null)
      await fetchOtherCalculations()
    } catch (error) {
      toast.error(`Failed to ${editingItem ? 'update' : 'create'} other calculation`)
      console.error('Save error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:h-64"
        data-testid="other-calculation-tab-loading"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert data-testid="other-calculation-tab-error">
        <AlertDescription>
          <div className="gba:flex gba:flex-col gba:gap-2">
            <strong>Error Loading Other Calculations</strong>
            <p>{error}</p>
            <Button size="sm" onClick={fetchOtherCalculations}>
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <Card data-testid="other-calculation-tab">
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-center">
            <div className="gba:flex gba:items-center gba:gap-2">
              <CardTitle>Other Calculations</CardTitle>
              <Badge variant="default">{otherCalculations.length} calculations</Badge>
            </div>
            <Button onClick={handleAdd} data-testid="add-other-calculation-button">
              <PiPlus className="gba:mr-2" />
              Add Other Calculation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:overflow-x-auto">
            <Table data-testid="other-calculations-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="gba:w-[60px]">Actions</TableHead>
                  <TableHead className="gba:w-[120px]">Source</TableHead>
                  <TableHead>Linked Item</TableHead>
                  <TableHead>Cost Center</TableHead>
                  <TableHead className="gba:w-[120px]">Reimb. %</TableHead>
                  <TableHead>Validity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otherCalculations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="gba:text-center gba:py-8">
                      <p className="gba:text-muted-foreground">No other calculations found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  otherCalculations.map(record => (
                    <TableRow key={record.id} data-testid={`other-calculation-row-${record.id}`}>
                      <TableCell className="gba:py-4 gba:px-6">
                        <div className="gba:flex gba:justify-start gba:gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={e => e.stopPropagation()}
                                disabled={isCheckingUsage}
                                data-testid={`other-calculation-action-${record.id}`}
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
                                data-testid={`other-calculation-edit-${record.id}`}
                              >
                                <PiPencil className="gba:h-4 gba:w-4 gba:mr-2" />
                                Update
                              </DropdownMenuItem>
                              {/* Only show delete option if calculation is not used */}
                              {!calcUsageMap[record.id] && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={e => {
                                      e.stopPropagation()
                                      handleDeleteClick(record)
                                    }}
                                    className="gba:text-destructive"
                                    data-testid={`other-calculation-delete-${record.id}`}
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
                      <TableCell>
                        <Badge
                          variant={
                            record.source === 'GENERAL_EXPENSE_RULE'
                              ? 'default'
                              : record.source === 'MILEAGE_RULE'
                                ? 'secondary'
                                : record.source === 'ALLOWANCE_RULE'
                                  ? 'outline'
                                  : 'default'
                          }
                        >
                          {SOURCE_DISPLAY_MAP[record.source] || 'Not Linked'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.relatedCode ? (
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <PiCode className="gba:text-muted-foreground" />
                            <div>
                              <div className="gba:font-mono gba:font-medium gba:text-sm">{record.relatedCode}</div>
                              <div className="gba:text-muted-foreground gba:text-xs">{record.relatedName}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="gba:text-muted-foreground gba:text-sm">Not linked</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.costCenter ? (
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <PiBuilding className="gba:text-primary" />
                            <div>
                              <div className="gba:font-mono gba:font-medium gba:text-sm">{record.costCenter.code}</div>
                              <div className="gba:text-muted-foreground gba:text-xs">{record.costCenter.name}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="gba:text-muted-foreground gba:text-sm">No cost center</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.reimbursablePercent !== undefined && record.reimbursablePercent !== null ? (
                          <Badge variant="outline">{record.reimbursablePercent}%</Badge>
                        ) : (
                          <span className="gba:text-muted-foreground gba:text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <PiCalendar className="gba:text-muted-foreground" />
                          <span className="gba:text-sm">
                            {formatDate(record.validFrom)} - {record.validTo ? formatDate(record.validTo) : '∞'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit/Add Dialog */}
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
        <DialogContent className="gba:max-w-2xl" data-testid="other-calculation-modal">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Other Calculation' : 'Add Other Calculation'}</DialogTitle>
          </DialogHeader>

          {/* Restricted edit warning */}
          {isRestrictedEdit && currentUsageInfo && (
            <Alert
              className="gba:mb-4 gba:border-warning gba:bg-warning-secondary"
              data-testid="other-calculation-restricted-alert"
            >
              <PiWarning className="gba:h-4 gba:w-4 gba:text-warning" />
              <AlertDescription>{currentUsageInfo.message}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <div className="gba:space-y-4 gba:py-4" data-testid="other-calculation-form">
              {/* Source (Expense/Mileage/Allowance) */}
              <FormField
                control={form.control}
                name="source"
                rules={{ required: 'Source is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source *</FormLabel>
                    <Select
                      value={field.value || 'none'}
                      onValueChange={value => {
                        field.onChange(value === 'none' ? '' : value)
                        form.setValue('relatedId', undefined) // Reset selection when source changes
                      }}
                      disabled={isRestrictedEdit}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="other-calculation-source-select">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sourceOptions.map(opt => (
                          <SelectItem key={opt.value || 'none'} value={opt.value || 'none'}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="gba:text-xs gba:text-muted-foreground">
                      Select whether this applies to an Expense, Mileage, or Allowance Code
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Linked Item (conditional) */}
              {form.watch('source') && (
                <FormField
                  control={form.control}
                  name="relatedId"
                  rules={{ required: 'Related item is required' }}
                  render={({ field }) => {
                    const source = form.watch('source')
                    return (
                      <FormItem>
                        <FormLabel>
                          {source === 'GENERAL_EXPENSE_RULE'
                            ? 'Expense'
                            : source === 'MILEAGE_RULE'
                              ? 'Mileage'
                              : 'Allowance Code'}{' '}
                          *
                        </FormLabel>
                        <Select value={field.value || ''} onValueChange={field.onChange} disabled={isRestrictedEdit}>
                          <FormControl>
                            <SelectTrigger data-testid="other-calculation-linked-select">
                              <SelectValue
                                placeholder={`Select ${SOURCE_DISPLAY_MAP[source]?.toLowerCase() || 'item'}`}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {getRelatedOptions().map(option => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.code} - {option.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {getRelatedOptions().length === 0 && (
                          <p className="gba:text-xs gba:text-warning-foreground">
                            No{' '}
                            {source === 'GENERAL_EXPENSE_RULE'
                              ? 'expenses'
                              : source === 'MILEAGE_RULE'
                                ? 'mileage rules'
                                : 'allowance codes'}{' '}
                            available for this rule
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />
              )}

              {/* Cost Center */}
              <FormField
                control={form.control}
                name="costCenterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Center</FormLabel>
                    <Select
                      value={field.value || 'none'}
                      onValueChange={value => field.onChange(value === 'none' ? undefined : value)}
                      disabled={isRestrictedEdit}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="other-calculation-cost-center-select">
                          <SelectValue placeholder="Select cost center (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No cost center</SelectItem>
                        {availableCostCenters.map(cc => (
                          <SelectItem key={cc.id} value={cc.id}>
                            {cc.code} - {cc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availableCostCenters.length === 0 && (
                      <p className="gba:text-xs gba:text-muted-foreground">No cost centers available in the system</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Reimbursable Percent */}
              <FormField
                control={form.control}
                name="reimbursablePercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reimbursable Percent</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="Enter percentage (0-100)"
                        value={field.value ?? ''}
                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        disabled={isRestrictedEdit}
                        data-testid="other-calculation-reimbursable-percent-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Validity Period */}
              <div className="gba:space-y-4">
                <FormField
                  control={form.control}
                  name="validFrom"
                  rules={{ required: 'Valid From is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valid From *</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value || ''}
                          onChange={date => field.onChange(date)}
                          disabled={isRestrictedEdit}
                          data-testid="other-calculation-valid-from-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="validTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valid To</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value || ''}
                          onChange={date => field.onChange(date)}
                          data-testid="other-calculation-valid-to-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Form>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsModalVisible(false)
                setIsRestrictedEdit(false)
                setCurrentUsageInfo(null)
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="other-calculation-delete-dialog">
          <DialogHeader>
            <DialogTitle>Delete Other Calculation</DialogTitle>
          </DialogHeader>
          <div className="gba:py-4">
            <p className="gba:text-sm gba:text-muted-foreground">
              Are you sure you want to delete this other calculation? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setItemToDelete(null)
              }}
              disabled={isDeleting}
              data-testid="other-calculation-delete-cancel-button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              data-testid="other-calculation-delete-confirm-button"
            >
              {isDeleting ? <Spinner className="gba:w-4 gba:h-4 gba:mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </>
  )
}

export default OtherCalculationTab
