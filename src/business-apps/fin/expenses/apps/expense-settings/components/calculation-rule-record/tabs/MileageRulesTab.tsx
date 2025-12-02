import React, { useState, useEffect, useCallback } from 'react'
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
  Label,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  DateInput
} from '@newwork/nw-design-system'
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
import { useGetMileageRuleById } from '../../../queries/ExpenseRuleQueries'

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
  wageCode?: string
  expenseGroupRef?: string
  measurementUnitRef?: string
  mileageRuleId?: string
  version?: number
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
  const [formData, setFormData] = useState<MileageRuleFormData>({
    expenseRuleId: ruleId,
    code: '',
    name: '',
    reimbursable: true,
    activeFrom: activeFrom
  })

  // Pre-loaded usage status for all mileage rules (id -> isUsed)
  const [mileageUsageMap, setMileageUsageMap] = useState<Record<string, boolean>>({})

  // Restricted edit state
  const [isRestrictedEdit, setIsRestrictedEdit] = useState(false)
  const [isCheckingUsage, setIsCheckingUsage] = useState(false)

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<EnhancedExpenseRuleMileage | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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
              wageCode
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
  }, [graphqlClient, ruleId])

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

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchMileageRules()
      loadTaxCodes()
    }
  }, [ruleId, accessToken, fetchMileageRules, loadTaxCodes])

  const handleAdd = () => {
    setEditingItem(null)
    setIsRestrictedEdit(false)

    // Determine validity period based on existing entries
    let validFromValue = activeFrom
    let validToValue: string | undefined = undefined

    if (mileageRules.length > 0) {
      // Use the same validity period as the first existing entry
      const existingEntry = mileageRules[0]
      validFromValue = existingEntry.activeFrom
      validToValue = existingEntry.activeTo
    } else {
      // No existing entries - set validTo to December 31, 9999 (or rule's activeTo if set)
      validToValue = activeTo || '9999-12-31'
    }

    setFormData({
      expenseRuleId: ruleId,
      code: '',
      name: '',
      reimbursable: true,
      taxValue: 0,
      unitPrice: 0,
      activeFrom: validFromValue,
      activeTo: validToValue
    })
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

      setFormData({
        id: freshData.id,
        expenseRuleId: ruleId,
        code: freshData.code,
        name: freshData.name,
        reimbursable: freshData.reimbursable,
        taxCodeRef: freshData.taxCodeRef,
        taxValue: freshData.taxValue,
        unitPrice: freshData.unitPrice,
        activeFrom: freshData.activeFrom,
        activeTo: freshData.activeTo,
        wageCode: freshData.wageCode,
        expenseGroupRef: freshData.expenseGroup?.id,
        measurementUnitRef: freshData.measurementUnit?.id,
        mileageRuleId: freshData.mileageRule?.id,
        version: freshData.version
      })
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

  const handleSave = async () => {
    try {
      setIsSaving(true)

      const saveData: any = {
        ...(editingItem && { id: editingItem.id, version: editingItem.version }),
        expenseRuleId: ruleId,
        activeTo: formData.activeTo || null
      }

      // Only include other fields if not in restricted edit mode
      if (!isRestrictedEdit) {
        saveData.code = formData.code
        saveData.name = formData.name
        saveData.reimbursable = formData.reimbursable
        saveData.taxCodeRef = formData.taxCodeRef
        saveData.taxValue = formData.taxValue
        saveData.unitPrice = formData.unitPrice
        saveData.activeFrom = formData.activeFrom
        saveData.wageCode = formData.wageCode
        saveData.expenseGroupRef = formData.expenseGroupRef
        saveData.measurementUnitRef = formData.measurementUnitRef
        saveData.mileageRuleId = formData.mileageRuleId
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

  // Helper functions
  const formatDate = (dateString: string): string => {
    return dayjs(dateString).format('DD.MM.YYYY')
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

  // Mock data for dropdowns (replace with actual catalog queries)
  const expenseGroupOptions = [
    { value: 'ExpenseGroup:v1:TRANSPORT', label: 'Transportation' },
    { value: 'ExpenseGroup:v1:OTHER_TRANSPORT', label: 'Other Transport Costs' },
    { value: 'ExpenseGroup:v1:ACCOMMODATION', label: 'Accommodation' },
    { value: 'ExpenseGroup:v1:MEAL', label: 'Meals' }
  ]

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
                <TableHead className="gba:w-[180px]" data-testid="mileage-rules-table-header-mileage">
                  MILEAGE
                </TableHead>
                <TableHead className="gba:w-[160px]" data-testid="mileage-rules-table-header-rule">
                  MILEAGE RULE
                </TableHead>
                <TableHead
                  className="gba:w-[100px] gba:text-center"
                  data-testid="mileage-rules-table-header-reimbursable"
                >
                  REIMBURSABLE
                </TableHead>
                <TableHead className="gba:w-[120px]" data-testid="mileage-rules-table-header-rate">
                  RATE
                </TableHead>
                <TableHead className="gba:w-[120px]" data-testid="mileage-rules-table-header-tax">
                  TAX
                </TableHead>
                <TableHead className="gba:w-[160px]" data-testid="mileage-rules-table-header-validity">
                  VALIDITY
                </TableHead>
                <TableHead className="gba:w-[120px]" data-testid="mileage-rules-table-header-group">
                  EXPENSE GROUP
                </TableHead>
                <TableHead className="gba:w-[100px]" data-testid="mileage-rules-table-header-properties">
                  PROPERTIES
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody data-testid="mileage-rules-table-body">
              {mileageRules.length === 0 ? (
                <TableRow data-testid="mileage-rules-empty-row">
                  <TableCell colSpan={9} className="gba:text-center gba:py-8" data-testid="mileage-rules-empty-cell">
                    <div className="gba:text-muted-foreground" data-testid="mileage-rules-empty-message">
                      No mileage rules found. Click "Add Mileage Rule" to create one.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                mileageRules.map(record => (
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
        <DialogContent className="gba:max-w-2xl" data-testid="mileage-rule-modal">
          <DialogHeader data-testid="mileage-rule-modal-header">
            <DialogTitle data-testid="mileage-rule-modal-title">
              {editingItem ? 'Edit' : 'Add'} Mileage Rule
            </DialogTitle>
          </DialogHeader>

          {/* Restricted edit warning */}
          {isRestrictedEdit && (
            <Alert variant="warning" className="gba:mb-4" data-testid="mileage-rule-restricted-alert">
              <PiWarning className="gba:h-4 gba:w-4" />
              <AlertDescription>
                This mileage rule is used in expense items. Only &quot;Valid To&quot; can be edited.
              </AlertDescription>
            </Alert>
          )}

          <div className="gba:space-y-4" data-testid="mileage-rule-form">
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div data-testid="mileage-rule-code-field">
                <Label htmlFor="code" data-testid="mileage-rule-code-label">
                  Code *
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Enter mileage code"
                  disabled={isRestrictedEdit}
                  data-testid="mileage-rule-code-input"
                />
              </div>

              <div data-testid="mileage-rule-name-field">
                <Label htmlFor="name" data-testid="mileage-rule-name-label">
                  Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter mileage name"
                  disabled={isRestrictedEdit}
                  data-testid="mileage-rule-name-input"
                />
              </div>
            </div>

            <div className="gba:grid gba:grid-cols-3 gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2" data-testid="mileage-rule-reimbursable-field">
                <input
                  type="checkbox"
                  id="reimbursable"
                  checked={formData.reimbursable}
                  onChange={e => setFormData({ ...formData, reimbursable: e.target.checked })}
                  className="gba:h-4 gba:w-4"
                  disabled={isRestrictedEdit}
                  data-testid="mileage-rule-reimbursable-checkbox"
                />
                <Label htmlFor="reimbursable" data-testid="mileage-rule-reimbursable-label">
                  Reimbursable
                </Label>
              </div>

              <div data-testid="mileage-rule-unit-price-field">
                <Label htmlFor="unitPrice" data-testid="mileage-rule-unit-price-label">
                  Unit Price
                </Label>
                <Input
                  id="unitPrice"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.unitPrice || ''}
                  onChange={e => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || undefined })}
                  placeholder="0.00"
                  disabled={isRestrictedEdit}
                  data-testid="mileage-rule-unit-price-input"
                />
              </div>

              <div data-testid="mileage-rule-measurement-unit-field">
                <Label htmlFor="measurementUnitRef" data-testid="mileage-rule-measurement-unit-label">
                  Measurement Unit
                </Label>
                <Select
                  value={formData.measurementUnitRef}
                  onValueChange={value => setFormData({ ...formData, measurementUnitRef: value })}
                  disabled={isRestrictedEdit}
                >
                  <SelectTrigger id="measurementUnitRef" data-testid="mileage-rule-measurement-unit-select">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
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
              </div>
            </div>

            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div data-testid="mileage-rule-tax-code-field">
                <Label htmlFor="taxCodeRef" data-testid="mileage-rule-tax-code-label">
                  Tax Code
                </Label>
                <Select
                  value={formData.taxCodeRef}
                  onValueChange={value => setFormData({ ...formData, taxCodeRef: value })}
                  disabled={catalogsLoading || isRestrictedEdit}
                >
                  <SelectTrigger id="taxCodeRef" data-testid="mileage-rule-tax-code-select">
                    <SelectValue placeholder="Select tax code" />
                  </SelectTrigger>
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
              </div>

              <div data-testid="mileage-rule-tax-value-field">
                <Label htmlFor="taxValue" data-testid="mileage-rule-tax-value-label">
                  Tax Value (%)
                </Label>
                <Input
                  id="taxValue"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={formData.taxValue || ''}
                  onChange={e => setFormData({ ...formData, taxValue: parseFloat(e.target.value) || undefined })}
                  placeholder="0.00"
                  disabled={isRestrictedEdit}
                  data-testid="mileage-rule-tax-value-input"
                />
              </div>
            </div>

            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div data-testid="mileage-rule-expense-group-field">
                <Label htmlFor="expenseGroupRef" data-testid="mileage-rule-expense-group-label">
                  Expense Group
                </Label>
                <Select
                  value={formData.expenseGroupRef}
                  onValueChange={value => setFormData({ ...formData, expenseGroupRef: value })}
                  disabled={isRestrictedEdit}
                >
                  <SelectTrigger id="expenseGroupRef" data-testid="mileage-rule-expense-group-select">
                    <SelectValue placeholder="Select expense group" />
                  </SelectTrigger>
                  <SelectContent data-testid="mileage-rule-expense-group-options">
                    {expenseGroupOptions.map(option => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        data-testid={`mileage-rule-expense-group-option-${option.value}`}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div data-testid="mileage-rule-wage-code-field">
                <Label htmlFor="wageCode" data-testid="mileage-rule-wage-code-label">
                  Wage Code
                </Label>
                <Input
                  id="wageCode"
                  value={formData.wageCode || ''}
                  onChange={e => setFormData({ ...formData, wageCode: e.target.value })}
                  placeholder="Enter wage code (optional)"
                  disabled={isRestrictedEdit}
                  data-testid="mileage-rule-wage-code-input"
                />
              </div>
            </div>

            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              <div data-testid="mileage-rule-active-from-field">
                <Label htmlFor="activeFrom" data-testid="mileage-rule-active-from-label">
                  Valid From *
                </Label>
                <DateInput
                  value={formData.activeFrom ? dayjs(formData.activeFrom).format('YYYY-MM-DD') : ''}
                  onChange={value => setFormData({ ...formData, activeFrom: value || '' })}
                  disabled={isRestrictedEdit}
                  placeholder="Select date..."
                  outputFormat="iso"
                  captionLayout="dropdown"
                  data-testid="mileage-rule-active-from-input"
                />
              </div>

              <div data-testid="mileage-rule-active-to-field">
                <Label htmlFor="activeTo" data-testid="mileage-rule-active-to-label">
                  Valid To
                </Label>
                <DateInput
                  value={formData.activeTo ? dayjs(formData.activeTo).format('YYYY-MM-DD') : ''}
                  onChange={value => setFormData({ ...formData, activeTo: value || undefined })}
                  placeholder="Select date..."
                  outputFormat="iso"
                  captionLayout="dropdown"
                  data-testid="mileage-rule-active-to-input"
                />
              </div>
            </div>
          </div>

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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="gba:max-w-md" data-testid="mileage-delete-confirmation-modal">
          <DialogHeader data-testid="mileage-delete-confirmation-modal-header">
            <DialogTitle data-testid="mileage-delete-confirmation-modal-title">Delete Mileage Rule</DialogTitle>
          </DialogHeader>

          <div className="gba:py-4" data-testid="mileage-delete-confirmation-content">
            <p className="gba:text-muted-foreground">
              Are you sure you want to delete the mileage rule &quot;{itemToDelete?.code} - {itemToDelete?.name}&quot;?
            </p>
            <p className="gba:text-sm gba:text-destructive gba:mt-2">This action cannot be undone.</p>
          </div>

          <DialogFooter data-testid="mileage-delete-confirmation-modal-footer">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setItemToDelete(null)
              }}
              disabled={isDeleting}
              data-testid="mileage-delete-confirmation-cancel-button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              data-testid="mileage-delete-confirmation-confirm-button"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MileageRulesTab
