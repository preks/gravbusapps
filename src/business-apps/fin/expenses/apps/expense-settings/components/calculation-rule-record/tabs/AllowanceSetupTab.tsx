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
  validFrom: string
  validTo?: string
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
  validFrom: string
  validTo?: string
  allowancePeriodId: string
  allowanceCodeId: string
  version?: number
}

// Usage check result
interface UsageInfo {
  isUsed: boolean
  usedIn: {
    positions?: number
  }
  message: string
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

  // Extract date portion to avoid timezone issues (YYYY-MM-DD format)
  const formatDateForInput = (dateStr?: string) => {
    if (!dateStr) return undefined
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
    // Otherwise extract date portion using dayjs to handle ISO strings correctly
    return dayjs(dateStr).format('YYYY-MM-DD')
  }

  const form = useForm<AllowanceSetupFormData>({
    defaultValues: {
      name: '',
      issue: 'DAILY_ALLOWANCE',
      onlyTax: false,
      validFrom: formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD'),
      validTo: formatDateForInput(activeTo) || '9999-12-31',
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
  // Note: AllowanceSetup doesn't have direct references in ExpensePosition,
  // so we can't track usage. All setups are treated as not in use.
  const loadSetupUsageStatus = useCallback(async (setupIds: string[]) => {
    if (setupIds.length === 0) return

    // Since there's no direct link to track usage, allow all operations
    const usageMap: Record<string, boolean> = {}
    setupIds.forEach(id => {
      usageMap[id] = false
    })
    setSetupUsageMap(usageMap)
  }, [])

  // Check detailed usage for a single setup
  // Note: AllowanceSetup doesn't have direct references in ExpensePosition
  const checkAllowanceSetupUsage = useCallback(async (): Promise<UsageInfo> => {
    // Since there's no direct link to track usage, return not used
    return { isUsed: false, usedIn: {}, message: '' }
  }, [])

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
        validFrom: setup.activeFrom,
        validTo: setup.activeTo,
        allowancePeriod: setup.allowancePeriod || { id: '', code: '', name: '' },
        allowanceCode: setup.allowanceCode || { id: '', code: '', name: '' },
        version: setup.version,
        isDeleted: false
      }))

      setAllowanceSetups(transformedSetups)
      setAllowancePeriods(periods)
      setAllowanceCodes(codes)

      // Load usage status for all setups
      if (transformedSetups.length > 0) {
        await loadSetupUsageStatus(transformedSetups.map(s => s.id))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load allowance setups')
    } finally {
      setIsLoading(false)
    }
  }, [ruleId, graphqlClient, loadSetupUsageStatus])

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchAllowanceSetups()
    }
  }, [ruleId, accessToken, fetchAllowanceSetups])

  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD/MM/YYYY')
  }

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

    // ALWAYS inherit validity period from parent Expense Rule
    const validFromValue = formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD')
    const validToValue = formatDateForInput(activeTo) || '9999-12-31'

    form.reset({
      name: '',
      issue: 'DAILY_ALLOWANCE',
      onlyTax: false,
      validFrom: validFromValue,
      validTo: validToValue,
      allowancePeriodId: '',
      allowanceCodeId: ''
    })
    setIsModalVisible(true)
  }

  const handleEdit = async (record: AllowanceSetup) => {
    setIsCheckingUsage(true)
    setValidityError(null)

    // Check if setup is used
    const usageInfo = await checkAllowanceSetupUsage(record.id)
    setCurrentUsageInfo(usageInfo)
    setIsRestrictedEdit(usageInfo.isUsed)

    form.reset({
      id: record.id,
      name: record.name,
      issue: record.issue,
      onlyTax: record.onlyTax,
      validFrom: formatDateForInput(record.validFrom) || formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD'),
      validTo: formatDateForInput(record.validTo),
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
      await expenseSettingsClient.saveExpenseRuleAllowanceSetup({
        id: itemToDelete.id,
        version: itemToDelete.version,
        expenseRuleId: ruleId,
        name: itemToDelete.name,
        issue: itemToDelete.issue,
        activeFrom: itemToDelete.validFrom,
        allowancePeriodId: itemToDelete.allowancePeriod.id,
        allowanceCodeId: itemToDelete.allowanceCode.id,
        isDeleted: true
      })

      toast.success('Allowance setup deleted successfully')
      setDeleteDialogOpen(false)
      setItemToDelete(null)
      await fetchAllowanceSetups()
    } catch (err) {
      toast.error('Failed to delete allowance setup')
      console.error('Delete error:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setValidityError(null)

      const formValues = form.getValues()

      // Validate validity period
      if (!formValues.validFrom) {
        setValidityError('Valid From date is required')
        setIsSaving(false)
        return
      }

      // Check if validFrom is within rule's validity period
      if (activeFrom && dayjs(formValues.validFrom).isBefore(dayjs(activeFrom))) {
        setValidityError(`Valid From must be on or after ${dayjs(activeFrom).format('DD/MM/YYYY')} (rule start date)`)
        setIsSaving(false)
        return
      }

      // Check if validTo is within rule's validity period
      if (activeTo && formValues.validTo && dayjs(formValues.validTo).isAfter(dayjs(activeTo))) {
        setValidityError(`Valid To must be on or before ${dayjs(activeTo).format('DD/MM/YYYY')} (rule end date)`)
        setIsSaving(false)
        return
      }

      // Check if validFrom is before validTo
      if (formValues.validTo && dayjs(formValues.validFrom).isAfter(dayjs(formValues.validTo))) {
        setValidityError('Valid From must be before Valid To')
        setIsSaving(false)
        return
      }

      // Convert dates to ISO format for backend (expects java.time.Instant)
      const formatDateToISO = (dateStr: string | undefined): string | undefined => {
        if (!dateStr) return undefined
        return dayjs(dateStr).startOf('day').toISOString()
      }

      // IMPORTANT: Always use editingItem for id and version when updating
      const isUpdate = !!editingItem

      // If restricted edit, only update validTo
      if (isRestrictedEdit && editingItem) {
        await expenseSettingsClient.saveExpenseRuleAllowanceSetup({
          id: editingItem.id,
          version: editingItem.version,
          expenseRuleId: ruleId,
          name: editingItem.name,
          issue: editingItem.issue,
          onlyTax: editingItem.onlyTax,
          activeFrom: formatDateToISO(editingItem.validFrom),
          activeTo: formatDateToISO(formValues.validTo),
          allowancePeriodId: editingItem.allowancePeriod.id,
          allowanceCodeId: editingItem.allowanceCode.id
        })
      } else {
        // Full save
        await expenseSettingsClient.saveExpenseRuleAllowanceSetup({
          ...(isUpdate && { id: editingItem.id, version: editingItem.version }),
          expenseRuleId: ruleId,
          businessKey: undefined,
          activeTo: formatDateToISO(formValues.validTo),
          additionalProperties: undefined,
          name: formValues.name,
          issue: formValues.issue,
          onlyTax: formValues.onlyTax,
          activeFrom: formatDateToISO(formValues.validFrom),
          setupOrder: undefined,
          allowancePeriodId: formValues.allowancePeriodId,
          allowanceCodeId: formValues.allowanceCodeId
        })
      }

      toast.success(`Allowance setup ${editingItem ? 'updated' : 'created'} successfully`)
      setIsModalVisible(false)
      await fetchAllowanceSetups()
    } catch (err) {
      // Parse the error message for better user feedback
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'

      if (errorMessage.includes('DateTimeParseException') || errorMessage.includes('Instant')) {
        setValidityError('Invalid date format. Please check the validity dates.')
      } else if (errorMessage.includes('activeFrom') || errorMessage.includes('validFrom')) {
        setValidityError('Invalid Valid From date. Please check the date format.')
      } else if (errorMessage.includes('activeTo') || errorMessage.includes('validTo')) {
        setValidityError('Invalid Valid To date. Please check the date format.')
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
          {allowanceSetups.length > 0 ? (
            <Table data-testid="allowance-setups-table">
              <TableHeader data-testid="allowance-setups-table-header">
                <TableRow data-testid="allowance-setups-table-header-row">
                  <TableHead className="gba:w-[60px]" data-testid="allowance-setups-table-header-actions">
                    ACTIONS
                  </TableHead>
                  <TableHead className="gba:w-[150px]" data-testid="allowance-setups-table-header-period">
                    ALLOWANCE PERIOD
                  </TableHead>
                  <TableHead className="gba:w-[150px]" data-testid="allowance-setups-table-header-code">
                    ALLOWANCE CODE
                  </TableHead>
                  <TableHead className="gba:w-[200px]" data-testid="allowance-setups-table-header-name">
                    NAME
                  </TableHead>
                  <TableHead className="gba:w-[150px]" data-testid="allowance-setups-table-header-issue">
                    ISSUE
                  </TableHead>
                  <TableHead
                    className="gba:w-[100px] gba:text-center"
                    data-testid="allowance-setups-table-header-tax-only"
                  >
                    TAX ONLY
                  </TableHead>
                  <TableHead className="gba:w-[120px]" data-testid="allowance-setups-table-header-valid-from">
                    VALID FROM
                  </TableHead>
                  <TableHead className="gba:w-[120px]" data-testid="allowance-setups-table-header-valid-to">
                    VALID TO
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody data-testid="allowance-setups-table-body">
                {allowanceSetups.map(record => (
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
                          {formatDate(record.validFrom)}
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
                          {record.validTo ? formatDate(record.validTo) : '∞'}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="allowance-setup-delete-dialog">
          <DialogHeader>
            <DialogTitle>Delete Allowance Setup</DialogTitle>
          </DialogHeader>
          <div className="gba:py-4">
            <p>
              Are you sure you want to delete the allowance setup "{itemToDelete?.name}"? This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
              data-testid="allowance-setup-delete-cancel-button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              data-testid="allowance-setup-delete-confirm-button"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    <Select value={field.value} onValueChange={field.onChange} disabled={isRestrictedEdit}>
                      <FormControl>
                        <SelectTrigger data-testid="allowance-setup-code-select">
                          <SelectValue placeholder="Select allowance code" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent data-testid="allowance-setup-code-options">
                        {allowanceCodes.map(code => (
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
                        placeholder="e.g., Full Day Setup"
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
                  name="validFrom"
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
                  name="validTo"
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
