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
import {
  PiPlus,
  PiPencil,
  PiCalendar,
  PiCheck,
  PiX,
  PiCoffee,
  PiBowlFood,
  PiMoon,
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
import { ExpenseRuleDeduction } from '../../../types/ExpenseRuleTypes'
import { expenseSettingsClient } from '../../../utils/ExpenseSettingsClient'

interface DeductionTabProps {
  ruleId: string
  accessToken: string
  activeFrom: string
  activeTo?: string
}

interface DeductionFormData {
  id?: string
  expenseRuleId: string
  deductBreakfast: boolean
  deductLunch: boolean
  deductDinner: boolean
  taxBreakfast: boolean // ✅ UPDATED: Tax fields are booleans, not numbers
  taxLunch: boolean // ✅ UPDATED: Tax fields are booleans, not numbers
  taxDinner: boolean // ✅ UPDATED: Tax fields are booleans, not numbers
  deductionDay?: string
  deductionOrder: number
  overnightAllowance: boolean
  activeFrom: string
  activeTo?: string
  version?: number
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

const DeductionTab: React.FC<DeductionTabProps> = ({ ruleId, accessToken, activeFrom, activeTo }) => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [deductions, setDeductions] = useState<ExpenseRuleDeduction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingItem, setEditingItem] = useState<ExpenseRuleDeduction | null>(null)

  // Extract date portion to avoid timezone issues (YYYY-MM-DD format)
  const formatDateForInput = (dateStr?: string) => {
    if (!dateStr) return undefined
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
    // Otherwise extract date portion using dayjs to handle ISO strings correctly
    return dayjs(dateStr).format('YYYY-MM-DD')
  }

  const form = useForm<DeductionFormData>({
    defaultValues: {
      expenseRuleId: ruleId,
      deductBreakfast: false,
      deductLunch: false,
      deductDinner: false,
      taxBreakfast: false,
      taxLunch: false,
      taxDinner: false,
      deductionOrder: 1,
      overnightAllowance: false,
      activeFrom: formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD'),
      activeTo: formatDateForInput(activeTo) || '9999-12-31'
    }
  })

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ExpenseRuleDeduction | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Usage check state
  const [isCheckingUsage, setIsCheckingUsage] = useState(false)
  const [currentUsageInfo, setCurrentUsageInfo] = useState<UsageInfo | null>(null)
  const [isRestrictedEdit, setIsRestrictedEdit] = useState(false)

  // Pre-loaded usage status for all deductions (deduction id -> isUsed)
  const [deductionUsageMap, setDeductionUsageMap] = useState<Record<string, boolean>>({})

  // Set up client
  expenseSettingsClient.setAccessToken(accessToken)

  const fetchDeductions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const query = `
        query GetExpenseRuleDeductions($ruleId: uuid!) {
          ExpenseRule(where: { id: { _eq: $ruleId } }) {
            id
            code
            name
            expenseRuleDeduction(where: { isDeleted: { _eq: false } }, orderBy: { deductionOrder: ASC }) {
              id
              deductBreakfast
              deductLunch
              deductDinner
              taxBreakfast
              taxLunch
              taxDinner
              deductionDay
              deductionOrder
              overnightAllowance
              activeFrom
              activeTo
              version
              additionalProperties
              businessKey
            }
          }
        }
      `

      const result = await graphqlClient.request<{ ExpenseRule: { expenseRuleDeduction: ExpenseRuleDeduction[] }[] }>(
        query,
        { ruleId }
      )

      const expenseRule = result.ExpenseRule?.[0]
      const deductionsList = expenseRule?.expenseRuleDeduction || []
      setDeductions(deductionsList)

      // Load usage status for all deductions
      if (deductionsList.length > 0) {
        await loadDeductionUsageStatus(deductionsList.map(d => d.id))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deductions')
      console.error('Error fetching deductions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, ruleId])

  // Load usage status for all deductions
  // Note: Deductions don't have direct references in ExpensePosition,
  // so we can't track usage. All deductions are treated as not in use.
  const loadDeductionUsageStatus = useCallback(async (deductionIds: string[]) => {
    if (deductionIds.length === 0) return

    // Since there's no direct link to track usage, allow all operations
    const usageMap: Record<string, boolean> = {}
    deductionIds.forEach(id => {
      usageMap[id] = false
    })
    setDeductionUsageMap(usageMap)
  }, [])

  // Check if a deduction is used
  // Note: Deductions don't have direct references in ExpensePosition
  const checkDeductionUsage = useCallback(async (): Promise<UsageInfo> => {
    // Since there's no direct link to track usage, return not used
    return { isUsed: false, usedIn: {}, message: '' }
  }, [])

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchDeductions()
    }
  }, [ruleId, accessToken, fetchDeductions])

  const handleAdd = () => {
    setEditingItem(null)
    setIsRestrictedEdit(false)
    setCurrentUsageInfo(null)

    // ALWAYS inherit validity period from parent Expense Rule
    const validFromValue = formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD')
    const validToValue = formatDateForInput(activeTo) || '9999-12-31'

    form.reset({
      expenseRuleId: ruleId,
      deductionOrder: deductions.length + 1,
      activeFrom: validFromValue,
      activeTo: validToValue,
      deductBreakfast: false,
      deductLunch: false,
      deductDinner: false,
      overnightAllowance: false,
      taxBreakfast: false,
      taxLunch: false,
      taxDinner: false
    })
    setIsModalVisible(true)
  }

  // Handle edit action - checks usage first
  const handleEdit = async (record: ExpenseRuleDeduction) => {
    setIsCheckingUsage(true)

    try {
      const usageInfo = await checkDeductionUsage()
      setCurrentUsageInfo(usageInfo)
      setIsRestrictedEdit(usageInfo.isUsed)

      setEditingItem(record)
      form.reset({
        id: record.id,
        expenseRuleId: ruleId,
        deductBreakfast: record.deductBreakfast,
        deductLunch: record.deductLunch,
        deductDinner: record.deductDinner,
        taxBreakfast: record.taxBreakfast || false,
        taxLunch: record.taxLunch || false,
        taxDinner: record.taxDinner || false,
        deductionDay: record.deductionDay,
        deductionOrder: record.deductionOrder,
        overnightAllowance: record.overnightAllowance,
        activeFrom:
          formatDateForInput(record.activeFrom) || formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD'),
        activeTo: formatDateForInput(record.activeTo),
        version: record.version
      })

      setIsModalVisible(true)
    } catch (err) {
      toast.error('Failed to check usage status')
      console.error('Edit load error:', err)
    } finally {
      setIsCheckingUsage(false)
    }
  }

  // Handle delete action - opens confirmation dialog (usage already checked via deductionUsageMap)
  const handleDeleteClick = (record: ExpenseRuleDeduction) => {
    setItemToDelete(record)
    setDeleteDialogOpen(true)
  }

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return

    setIsDeleting(true)
    try {
      await expenseSettingsClient.deleteExpenseRuleDeduction(itemToDelete.id, itemToDelete.version || 1)
      toast.success('Deduction rule deleted successfully')
      setDeleteDialogOpen(false)
      setItemToDelete(null)
      await fetchDeductions()
    } catch (error) {
      toast.error('Failed to delete deduction rule')
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
        // Convert to ISO format for API
        activeTo: formValues.activeTo ? dayjs(formValues.activeTo).endOf('day').toISOString() : null
      }

      // Only include other fields if not in restricted edit mode
      if (!isRestrictedEdit) {
        saveData.deductBreakfast = formValues.deductBreakfast
        saveData.deductLunch = formValues.deductLunch
        saveData.deductDinner = formValues.deductDinner
        saveData.taxBreakfast = formValues.taxBreakfast
        saveData.taxLunch = formValues.taxLunch
        saveData.taxDinner = formValues.taxDinner
        saveData.deductionDay = formValues.deductionDay
        saveData.deductionOrder = formValues.deductionOrder
        saveData.overnightAllowance = formValues.overnightAllowance
        // Convert to ISO format for API
        saveData.activeFrom = formValues.activeFrom ? dayjs(formValues.activeFrom).startOf('day').toISOString() : null
      }

      await expenseSettingsClient.saveExpenseRuleDeduction(saveData)
      toast.success(`Deduction rule ${editingItem ? 'updated' : 'created'} successfully`)

      setIsModalVisible(false)
      setIsRestrictedEdit(false)
      setCurrentUsageInfo(null)
      await fetchDeductions()
    } catch (err) {
      toast.error(`Failed to ${editingItem ? 'update' : 'create'} deduction rule`)
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD/MM/YYYY')
  }

  const renderMealDeductions = (record: ExpenseRuleDeduction) => {
    const meals = [
      {
        key: 'breakfast',
        icon: PiCoffee,
        label: 'Breakfast',
        deduct: record.deductBreakfast,
        tax: record.taxBreakfast
      },
      { key: 'lunch', icon: PiBowlFood, label: 'Lunch', deduct: record.deductLunch, tax: record.taxLunch },
      { key: 'dinner', icon: PiMoon, label: 'Dinner', deduct: record.deductDinner, tax: record.taxDinner }
    ]

    return (
      <div className="gba:flex gba:gap-3">
        {meals.map(meal => {
          const IconComponent = meal.icon
          return (
            <div
              key={meal.key}
              className={`gba:flex gba:flex-col gba:items-center gba:p-2 gba:rounded gba:border-2 gba:min-w-20 ${
                meal.deduct || meal.tax
                  ? 'gba:border-success gba:bg-success-secondary'
                  : 'gba:border-border gba:bg-muted'
              }`}
            >
              <IconComponent
                className={`gba:text-lg gba:mb-1 ${meal.deduct ? 'gba:text-success' : 'gba:text-muted-foreground'}`}
              />
              <span className="gba:text-xs gba:font-medium gba:text-center">{meal.label}</span>
              <div className="gba:flex gba:flex-col gba:items-center gba:mt-1 gba:gap-1">
                <div className="gba:flex gba:items-center gba:gap-1">
                  <span className="gba:text-xs gba:text-muted-foreground">Deduct:</span>
                  {meal.deduct ? (
                    <PiCheck className="gba:text-success gba:text-sm" />
                  ) : (
                    <PiX className="gba:text-muted-foreground gba:text-sm" />
                  )}
                </div>
                <div className="gba:flex gba:items-center gba:gap-1">
                  <span className="gba:text-xs gba:text-muted-foreground">Tax:</span>
                  {meal.tax ? (
                    <PiCheck className="gba:text-success gba:text-sm" />
                  ) : (
                    <PiX className="gba:text-muted-foreground gba:text-sm" />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const deductionDayOptions = [
    { value: 'FIRST_DAY', label: 'First Day' },
    { value: 'LAST_DAY', label: 'Last Day' },
    { value: 'DAYS_BETWEEN', label: 'Days Between' },
    { value: 'FULL_DAY', label: 'Full Day' },
    { value: 'HALF_DAY', label: 'Half Day' }
  ]

  // Group deductions by day type - always show the three main sections
  const groupedDeductions = React.useMemo(() => {
    const groups = {
      FIRST_DAY: deductions.filter(d => d.deductionDay === 'FIRST_DAY'),
      DAYS_BETWEEN: deductions.filter(d => d.deductionDay === 'DAYS_BETWEEN'),
      LAST_DAY: deductions.filter(d => d.deductionDay === 'LAST_DAY')
    }
    return groups
  }, [deductions])

  const sectionConfig = [
    { key: 'FIRST_DAY', title: 'First Day', description: 'Deductions applied on the first day of travel' },
    {
      key: 'DAYS_BETWEEN',
      title: 'Days Between',
      description: 'Deductions applied on days between first and last day'
    },
    { key: 'LAST_DAY', title: 'Last Day', description: 'Deductions applied on the last day of travel' }
  ]

  // Removed Ant Design columns definition - using NW design system Table now

  if (isLoading) {
    return (
      <div data-testid="deduction-tab-loading" className="gba:flex gba:justify-center gba:items-center gba:min-h-64">
        <Spinner className="gba:w-8 gba:h-8" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="deduction-tab-error">
        <AlertDescription>
          <div className="gba:flex gba:items-start gba:justify-between">
            <div>
              <strong>Error Loading Deduction Rules</strong>
              <p className="gba:mt-1">{error}</p>
            </div>
            <Button size="sm" onClick={fetchDeductions} variant="outline">
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div data-testid="deduction-tab">
      <Toaster />

      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:m-0">Allowance Deduction Rules</h3>
          <p className="gba:text-sm gba:text-muted-foreground gba:m-0">
            Manage meal deduction rules organized by travel day type
          </p>
        </div>
        <Button onClick={handleAdd} data-testid="add-deduction-button">
          <PiPlus className="gba:mr-2" />
          Add Deduction Rule
        </Button>
      </div>

      {/* Sections for each deduction day type */}
      <div className="gba:space-y-6">
        {sectionConfig.map(section => {
          const sectionDeductions = groupedDeductions[section.key as keyof typeof groupedDeductions]

          return (
            <Card key={section.key} data-testid={`deduction-section-${section.key.toLowerCase()}`}>
              {/* Section Header */}
              <CardHeader className="gba:bg-muted/50">
                <div className="gba:flex gba:justify-between gba:items-center">
                  <div>
                    <CardTitle className="gba:text-base">{section.title}</CardTitle>
                    <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{section.description}</p>
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Badge variant="default">
                      {sectionDeductions.length} rule{sectionDeductions.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              {/* Section Content */}
              <CardContent className="gba:p-6">
                {sectionDeductions.length > 0 ? (
                  <Table data-testid={`deductions-table-${section.key.toLowerCase()}`}>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="gba:w-[60px]">ACTIONS</TableHead>
                        <TableHead className="gba:w-[300px]">MEAL DEDUCTIONS</TableHead>
                        <TableHead className="gba:w-[150px]">ADDITIONAL INFO</TableHead>
                        <TableHead className="gba:w-[180px]">VALIDITY</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sectionDeductions.map(record => (
                        <TableRow key={record.id} data-testid={`deduction-row-${record.id}`}>
                          <TableCell>
                            <div className="gba:flex gba:justify-start gba:gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={e => e.stopPropagation()}
                                    disabled={isCheckingUsage}
                                    data-testid={`deduction-action-${record.id}`}
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
                                    data-testid={`deduction-edit-${record.id}`}
                                  >
                                    <PiPencil className="gba:h-4 gba:w-4 gba:mr-2" />
                                    Update
                                  </DropdownMenuItem>
                                  {/* Only show delete option if deduction is not used */}
                                  {!deductionUsageMap[record.id] && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={e => {
                                          e.stopPropagation()
                                          handleDeleteClick(record)
                                        }}
                                        className="gba:text-destructive"
                                        data-testid={`deduction-delete-${record.id}`}
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

                          <TableCell>{renderMealDeductions(record)}</TableCell>

                          <TableCell>
                            <div className="gba:flex gba:flex-col gba:gap-1">
                              {record.overnightAllowance && <Badge variant="default">Overnight Allowance</Badge>}
                              <span className="gba:text-xs gba:text-muted-foreground">
                                Order: {record.deductionOrder}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="gba:flex gba:items-center gba:gap-1">
                              <PiCalendar className="gba:text-muted-foreground" />
                              <span className="gba:text-sm">
                                {formatDate(record.activeFrom)} - {record.activeTo ? formatDate(record.activeTo) : '∞'}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                    <p className="gba:m-0">No deduction rules configured for {section.title.toLowerCase()}</p>
                    <p className="gba:text-xs gba:mt-1">
                      Click "Add Deduction Rule" above and select "{section.title}" as the deduction day type
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

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
        <DialogContent className="gba:max-w-3xl" data-testid="deduction-modal">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit' : 'Add'} Deduction Rule</DialogTitle>
          </DialogHeader>

          {/* Restricted edit warning */}
          {isRestrictedEdit && currentUsageInfo && (
            <Alert
              className="gba:mb-4 gba:border-warning gba:bg-warning-secondary"
              data-testid="deduction-restricted-alert"
            >
              <PiWarning className="gba:h-4 gba:w-4 gba:text-warning" />
              <AlertDescription>{currentUsageInfo.message}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <div data-testid="deduction-form" className="gba:space-y-6">
              {/* Order Field */}
              <FormField
                control={form.control}
                name="deductionOrder"
                rules={{ required: 'Order is required', min: { value: 1, message: 'Must be at least 1' } }}
                render={({ field }) => (
                  <FormItem data-testid="deduction-order-field">
                    <FormLabel data-testid="deduction-order-label">Order *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        value={field.value}
                        onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                        disabled={isRestrictedEdit}
                        data-testid="deduction-order-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Meal Deductions & Tax Settings */}
              <Card data-testid="meal-settings-card">
                <CardHeader>
                  <CardTitle className="gba:text-base">Meal Deductions & Tax Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="gba:grid gba:grid-cols-3 gba:gap-4">
                    {/* Breakfast */}
                    <Card data-testid="breakfast-card">
                      <CardHeader>
                        <CardTitle className="gba:text-sm gba:flex gba:items-center">
                          <PiCoffee className="gba:mr-2" />
                          Breakfast
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="gba:space-y-4">
                        <FormField
                          control={form.control}
                          name="deductBreakfast"
                          render={({ field }) => (
                            <FormItem
                              className="gba:flex gba:items-center gba:justify-between"
                              data-testid="breakfast-deduct-field"
                            >
                              <FormLabel data-testid="breakfast-deduct-label">Deduct</FormLabel>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={isRestrictedEdit}
                                  data-testid="breakfast-deduct-checkbox"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="taxBreakfast"
                          render={({ field }) => (
                            <FormItem
                              className="gba:flex gba:items-center gba:justify-between"
                              data-testid="breakfast-tax-field"
                            >
                              <FormLabel data-testid="breakfast-tax-label">Tax</FormLabel>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={isRestrictedEdit}
                                  data-testid="breakfast-tax-checkbox"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    {/* Lunch */}
                    <Card data-testid="lunch-card">
                      <CardHeader>
                        <CardTitle className="gba:text-sm gba:flex gba:items-center">
                          <PiBowlFood className="gba:mr-2" />
                          Lunch
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="gba:space-y-4">
                        <FormField
                          control={form.control}
                          name="deductLunch"
                          render={({ field }) => (
                            <FormItem
                              className="gba:flex gba:items-center gba:justify-between"
                              data-testid="lunch-deduct-field"
                            >
                              <FormLabel data-testid="lunch-deduct-label">Deduct</FormLabel>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={isRestrictedEdit}
                                  data-testid="lunch-deduct-checkbox"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="taxLunch"
                          render={({ field }) => (
                            <FormItem
                              className="gba:flex gba:items-center gba:justify-between"
                              data-testid="lunch-tax-field"
                            >
                              <FormLabel data-testid="lunch-tax-label">Tax</FormLabel>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={isRestrictedEdit}
                                  data-testid="lunch-tax-checkbox"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    {/* Dinner */}
                    <Card data-testid="dinner-card">
                      <CardHeader>
                        <CardTitle className="gba:text-sm gba:flex gba:items-center">
                          <PiMoon className="gba:mr-2" />
                          Dinner
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="gba:space-y-4">
                        <FormField
                          control={form.control}
                          name="deductDinner"
                          render={({ field }) => (
                            <FormItem
                              className="gba:flex gba:items-center gba:justify-between"
                              data-testid="dinner-deduct-field"
                            >
                              <FormLabel data-testid="dinner-deduct-label">Deduct</FormLabel>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={isRestrictedEdit}
                                  data-testid="dinner-deduct-checkbox"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="taxDinner"
                          render={({ field }) => (
                            <FormItem
                              className="gba:flex gba:items-center gba:justify-between"
                              data-testid="dinner-tax-field"
                            >
                              <FormLabel data-testid="dinner-tax-label">Tax</FormLabel>
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={isRestrictedEdit}
                                  data-testid="dinner-tax-checkbox"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {/* Deduction Day Type and Overnight Allowance */}
              <div className="gba:space-y-4">
                <FormField
                  control={form.control}
                  name="deductionDay"
                  render={({ field }) => (
                    <FormItem data-testid="deduction-day-field">
                      <FormLabel data-testid="deduction-day-label">Deduction Day Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={isRestrictedEdit}>
                        <FormControl>
                          <SelectTrigger data-testid="deduction-day-select">
                            <SelectValue placeholder="Select deduction day type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent data-testid="deduction-day-options">
                          {deductionDayOptions.map(option => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              data-testid={`deduction-day-option-${option.value}`}
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

                <FormField
                  control={form.control}
                  name="overnightAllowance"
                  render={({ field }) => (
                    <FormItem
                      className="gba:flex gba:items-center gba:justify-between"
                      data-testid="overnight-allowance-field"
                    >
                      <FormLabel data-testid="overnight-allowance-label">Overnight Allowance</FormLabel>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isRestrictedEdit}
                          data-testid="overnight-allowance-checkbox"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Validity Period */}
              <div className="gba:space-y-4">
                <FormField
                  control={form.control}
                  name="activeFrom"
                  rules={{ required: 'Valid From is required' }}
                  render={({ field }) => (
                    <FormItem data-testid="active-from-field">
                      <FormLabel data-testid="active-from-label">Valid From *</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value || ''}
                          onChange={date => field.onChange(date)}
                          disabled={isRestrictedEdit}
                          data-testid="active-from-input"
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
                    <FormItem data-testid="active-to-field">
                      <FormLabel data-testid="active-to-label">Valid To</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value || ''}
                          onChange={date => field.onChange(date)}
                          data-testid="active-to-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Form>

          <DialogFooter data-testid="deduction-modal-footer">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalVisible(false)
                setIsRestrictedEdit(false)
                setCurrentUsageInfo(null)
              }}
              disabled={isSaving}
              data-testid="deduction-modal-cancel-button"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} data-testid="deduction-modal-save-button">
              {isSaving ? <Spinner className="gba:w-4 gba:h-4 gba:mr-2" /> : null}
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="deduction-delete-dialog">
          <DialogHeader>
            <DialogTitle>Delete Deduction Rule</DialogTitle>
          </DialogHeader>
          <div className="gba:py-4">
            <p className="gba:text-sm gba:text-muted-foreground">
              Are you sure you want to delete this deduction rule? This action cannot be undone.
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
              data-testid="deduction-delete-cancel-button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              data-testid="deduction-delete-confirm-button"
            >
              {isDeleting ? <Spinner className="gba:w-4 gba:h-4 gba:mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DeductionTab
