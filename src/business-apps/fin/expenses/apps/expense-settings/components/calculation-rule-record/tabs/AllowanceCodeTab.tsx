import React, { useState, useEffect, useCallback } from 'react'
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
  Label,
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

interface AllowanceCode {
  id: string
  code: string
  name: string
  reimbursable: boolean
  locationRelation: string
  travelRegionRule: string
  percentage: number
  amount: number
  calculation?: string
  expenseGroup: {
    id: string
    value: string
    code: string
  }
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
  locationRelation: string
  travelRegionRule: string
  percentage: number
  amount: number
  calculation?: string
  expenseGroupRef?: string
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
  const [formData, setFormData] = useState<AllowanceCodeFormData>({
    code: '',
    name: '',
    reimbursable: false,
    locationRelation: '',
    travelRegionRule: '',
    percentage: 0,
    amount: 0,
    validFrom: activeFrom
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

  // Set up client
  expenseSettingsClient.setAccessToken(accessToken)

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
            expenseRuleAllowanceCode(where: { isDeleted: { _eq: false } }, orderBy: { codeOrder: ASC }) {
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
              codeOrder
              activeFrom
              activeTo
              version
              additionalProperties
              businessKey
              reimbursable
              firstAllowanceRegionRulePercent
              secondAllowanceRegionRulePercent
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
        locationRelation: 'HOME', // Default location
        travelRegionRule: 'Romania maximum tax free amount', // Default text, could be dynamic
        percentage: code.firstAllowanceRegionRulePercent || 0,
        amount: code.amount || 0,
        calculation: code.calculation?.value || code.calculationRef || '',
        expenseGroup: code.expenseGroup || { id: '', value: '', code: '' },
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
    }
  }, [ruleId, accessToken, fetchAllowanceCodes])

  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD/MM/YYYY')
  }

  const locationOptions = [
    { value: 'ABROAD', label: 'Abroad' },
    { value: 'HOME', label: 'Home' },
    { value: 'BOTH', label: 'Both' }
  ]

  const handleAdd = () => {
    setEditingItem(null)
    setIsRestrictedEdit(false)

    // Determine validity period based on existing entries
    let validFromValue = activeFrom
    let validToValue: string | undefined = undefined

    if (allowanceCodes.length > 0) {
      // Use the same validity period as the first existing entry
      const existingEntry = allowanceCodes[0]
      validFromValue = existingEntry.validFrom
      validToValue = existingEntry.validTo
    } else {
      // No existing entries - set validTo to December 31, 9999 (or rule's activeTo if set)
      validToValue = activeTo || '9999-12-31'
    }

    setFormData({
      code: '',
      name: '',
      reimbursable: false,
      locationRelation: 'HOME',
      travelRegionRule: 'Romania maximum tax free amount',
      percentage: 0,
      amount: 0,
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

      setFormData({
        id: record.id,
        code: record.code,
        name: record.name,
        reimbursable: record.reimbursable,
        locationRelation: record.locationRelation,
        travelRegionRule: record.travelRegionRule,
        percentage: record.percentage,
        amount: record.amount,
        calculation: record.calculation,
        expenseGroupRef: record.expenseGroup?.id,
        validFrom: record.validFrom,
        validTo: record.validTo,
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

      const saveData: any = {
        ...(editingItem && { id: editingItem.id, version: editingItem.version }),
        expenseRuleId: ruleId,
        activeTo: formData.validTo || null
      }

      // Only include other fields if not in restricted edit mode
      if (!isRestrictedEdit) {
        saveData.code = formData.code
        saveData.name = formData.name
        saveData.reimbursable = formData.reimbursable
        saveData.locationRelation = formData.locationRelation
        saveData.travelRegionRule = formData.travelRegionRule
        saveData.percentage = formData.percentage
        saveData.amount = formData.amount
        saveData.calculation = formData.calculation
        saveData.expenseGroupRef = formData.expenseGroupRef
        saveData.activeFrom = formData.validFrom
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
                    <TableHead className="gba:w-[140px]" data-testid="allowance-codes-table-header-location">
                      LOCATION
                    </TableHead>
                    <TableHead className="gba:w-[200px]" data-testid="allowance-codes-table-header-travel-rule">
                      TRAVEL REGION RULE
                    </TableHead>
                    <TableHead
                      className="gba:w-[110px] gba:text-center"
                      data-testid="allowance-codes-table-header-percentage"
                    >
                      PERCENTAGE
                    </TableHead>
                    <TableHead
                      className="gba:w-[100px] gba:text-right"
                      data-testid="allowance-codes-table-header-amount"
                    >
                      AMOUNT
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

                      {/* Location Relation Column */}
                      <TableCell data-testid={`allowance-code-location-cell-${record.id}`}>
                        <Badge
                          variant={
                            record.locationRelation === 'ABROAD'
                              ? 'default'
                              : record.locationRelation === 'HOME'
                                ? 'secondary'
                                : 'default'
                          }
                          data-testid={`allowance-code-location-badge-${record.id}`}
                        >
                          {record.locationRelation}
                        </Badge>
                      </TableCell>

                      {/* Travel Region Rule Column */}
                      <TableCell data-testid={`allowance-code-travel-rule-cell-${record.id}`}>
                        <span
                          className="gba:text-sm gba:text-muted-foreground"
                          data-testid={`allowance-code-travel-rule-text-${record.id}`}
                        >
                          {record.travelRegionRule}
                        </span>
                      </TableCell>

                      {/* Percentage Column */}
                      <TableCell
                        className="gba:text-center"
                        data-testid={`allowance-code-percentage-cell-${record.id}`}
                      >
                        <Badge
                          variant={
                            record.percentage > 0 ? 'default' : record.percentage < 0 ? 'destructive' : 'secondary'
                          }
                          data-testid={`allowance-code-percentage-badge-${record.id}`}
                        >
                          {record.percentage}%
                        </Badge>
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

                      {/* Calculation Column */}
                      <TableCell data-testid={`allowance-code-calculation-cell-${record.id}`}>
                        <span
                          className="gba:text-sm gba:text-muted-foreground"
                          data-testid={`allowance-code-calculation-text-${record.id}`}
                        >
                          {record.calculation || '-'}
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
            <Alert variant="warning" className="gba:mb-4" data-testid="allowance-code-restricted-alert">
              <PiWarning className="gba:h-4 gba:w-4" />
              <AlertDescription>
                This allowance code is used in expense items. Only &quot;Valid To&quot; can be edited.
              </AlertDescription>
            </Alert>
          )}

          <div data-testid="allowance-code-form" className="gba:space-y-4">
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              {/* Code */}
              <div className="gba:space-y-2" data-testid="allowance-code-code-field">
                <Label htmlFor="code" data-testid="allowance-code-code-label">
                  Allowance Code *
                </Label>
                <Input
                  id="code"
                  placeholder="e.g., A-FULL, L-FULL"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  disabled={isRestrictedEdit}
                  data-testid="allowance-code-code-input"
                />
              </div>

              {/* Name */}
              <div className="gba:space-y-2" data-testid="allowance-code-name-field">
                <Label htmlFor="name" data-testid="allowance-code-name-label">
                  Name *
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Abroad Full Day"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  disabled={isRestrictedEdit}
                  data-testid="allowance-code-name-input"
                />
              </div>

              {/* Location Relation */}
              <div className="gba:space-y-2" data-testid="allowance-code-location-field">
                <Label htmlFor="locationRelation" data-testid="allowance-code-location-label">
                  Location Relation *
                </Label>
                <Select
                  value={formData.locationRelation}
                  onValueChange={value => setFormData({ ...formData, locationRelation: value })}
                  disabled={isRestrictedEdit}
                >
                  <SelectTrigger id="locationRelation" data-testid="allowance-code-location-select">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent data-testid="allowance-code-location-options">
                    {locationOptions.map(option => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        data-testid={`allowance-code-location-option-${option.value}`}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Travel Region Rule */}
              <div className="gba:space-y-2" data-testid="allowance-code-travel-region-field">
                <Label htmlFor="travelRegionRule" data-testid="allowance-code-travel-region-label">
                  Travel Region Rule
                </Label>
                <Input
                  id="travelRegionRule"
                  placeholder="e.g., Romania maximum tax free amount"
                  value={formData.travelRegionRule}
                  onChange={e => setFormData({ ...formData, travelRegionRule: e.target.value })}
                  disabled={isRestrictedEdit}
                  data-testid="allowance-code-travel-region-input"
                />
              </div>

              {/* Percentage */}
              <div className="gba:space-y-2" data-testid="allowance-code-percentage-field">
                <Label htmlFor="percentage" data-testid="allowance-code-percentage-label">
                  Percentage *
                </Label>
                <Input
                  id="percentage"
                  type="number"
                  min="-100"
                  max="200"
                  placeholder="100"
                  value={formData.percentage}
                  onChange={e => setFormData({ ...formData, percentage: Number(e.target.value) })}
                  disabled={isRestrictedEdit}
                  data-testid="allowance-code-percentage-input"
                />
              </div>

              {/* Amount */}
              <div className="gba:space-y-2" data-testid="allowance-code-amount-field">
                <Label htmlFor="amount" data-testid="allowance-code-amount-label">
                  Amount
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="57.5"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                  disabled={isRestrictedEdit}
                  data-testid="allowance-code-amount-input"
                />
              </div>

              {/* Calculation */}
              <div className="gba:space-y-2" data-testid="allowance-code-calculation-field">
                <Label htmlFor="calculation" data-testid="allowance-code-calculation-label">
                  Calculation
                </Label>
                <Input
                  id="calculation"
                  placeholder="Calculation method"
                  value={formData.calculation || ''}
                  onChange={e => setFormData({ ...formData, calculation: e.target.value || undefined })}
                  disabled={isRestrictedEdit}
                  data-testid="allowance-code-calculation-input"
                />
              </div>

              {/* Empty cell for grid alignment */}
              <div></div>

              {/* Valid From */}
              <div className="gba:space-y-2" data-testid="allowance-code-valid-from-field">
                <Label htmlFor="validFrom" data-testid="allowance-code-valid-from-label">
                  Valid From *
                </Label>
                <DateInput
                  value={formData.validFrom ? dayjs(formData.validFrom).format('YYYY-MM-DD') : ''}
                  onChange={value => setFormData({ ...formData, validFrom: value || '' })}
                  disabled={isRestrictedEdit}
                  placeholder="Select date..."
                  outputFormat="iso"
                  captionLayout="dropdown"
                  data-testid="allowance-code-valid-from-input"
                />
              </div>

              {/* Valid To */}
              <div className="gba:space-y-2" data-testid="allowance-code-valid-to-field">
                <Label htmlFor="validTo" data-testid="allowance-code-valid-to-label">
                  Valid To
                </Label>
                <DateInput
                  value={formData.validTo ? dayjs(formData.validTo).format('YYYY-MM-DD') : ''}
                  onChange={value => setFormData({ ...formData, validTo: value || undefined })}
                  placeholder="Select date..."
                  outputFormat="iso"
                  captionLayout="dropdown"
                  data-testid="allowance-code-valid-to-input"
                />
              </div>
            </div>

            {/* Reimbursable Switch */}
            <div
              className="gba:flex gba:items-center gba:justify-between"
              data-testid="allowance-code-reimbursable-field"
            >
              <Label htmlFor="reimbursable" data-testid="allowance-code-reimbursable-label">
                Reimbursable
              </Label>
              <div className="gba:flex gba:items-center gba:gap-2">
                <span
                  className="gba:text-sm gba:text-muted-foreground"
                  data-testid="allowance-code-reimbursable-status"
                >
                  {formData.reimbursable ? 'Yes' : 'No'}
                </span>
                <NWSwitch
                  id="reimbursable"
                  checked={formData.reimbursable}
                  onCheckedChange={checked => setFormData({ ...formData, reimbursable: checked })}
                  disabled={isRestrictedEdit}
                  data-testid="allowance-code-reimbursable-switch"
                />
              </div>
            </div>
          </div>

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
