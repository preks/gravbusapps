import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
import { DeleteConfirmationDialog } from '../shared'
import { PiPlus, PiPencil, PiCalendar, PiCode, PiDotsThreeVertical, PiTrash, PiWarning } from 'react-icons/pi'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

// Register dayjs plugins
dayjs.extend(weekday)
dayjs.extend(localeData)
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { expenseSettingsClient } from '../../../utils/ExpenseSettingsClient'
import { formatDateForInput, findOverlappingPeriods, formatDate } from '../../../utils'
import { useTableSorting, createFieldMappings } from '../hooks'
import { UsageInfo } from '../../../types'

interface CustomFieldsTabProps {
  ruleId: string
  accessToken: string
  activeFrom: string
  activeTo?: string
}

interface CustomField {
  id: string
  source: 'Expense' | 'Mileage'
  infoValue: string
  mandatory: boolean
  validFrom: string
  validTo?: string
  version?: number
  isDeleted: boolean
  // Related entity info (for display)
  relatedId?: string
  relatedCode?: string
  relatedName?: string
}

interface CustomFieldFormData {
  id?: string
  source: 'Expense' | 'Mileage'
  infoValue: string
  mandatory: boolean
  validFrom: string
  validTo?: string
  version?: number
  relatedId?: string
}

interface RelatedOption {
  id: string
  code: string
  name: string
}

const CustomFieldsTab: React.FC<CustomFieldsTabProps> = ({ ruleId, accessToken, activeFrom, activeTo }) => {
  const graphqlClient = useGraphQLClient(accessToken)

  // Helper function to convert UI source values to API enum values
  const mapSourceToApiEnum = (source: 'Expense' | 'Mileage'): string => {
    return source === 'Mileage' ? 'MILEAGE_RULE' : 'GENERAL_EXPENSE_RULE'
  }

  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingItem, setEditingItem] = useState<CustomField | null>(null)

  // Available expenses and mileage for this rule (for dropdowns)
  const [availableExpenses, setAvailableExpenses] = useState<RelatedOption[]>([])
  const [availableMileage, setAvailableMileage] = useState<RelatedOption[]>([])

  // Memoize field mappings to prevent unnecessary recalculations
  const fieldMappings = useMemo(
    () => ({
      source: createFieldMappings.string((a: CustomField) => a.source),
      linkedItem: createFieldMappings.string((a: CustomField) => a.relatedCode || a.relatedName),
      infoValue: createFieldMappings.string((a: CustomField) => a.infoValue),
      mandatory: createFieldMappings.boolean((a: CustomField) => a.mandatory),
      activeFrom: createFieldMappings.date((a: CustomField) => a.validFrom)
    }),
    []
  )

  // Sorting - using shared hook (single source of truth)
  const sorting = useTableSorting<CustomField>({
    defaultSortField: 'source',
    defaultSortOrder: 'ASC',
    data: customFields,
    fieldMappings
  })

  // formatDateForInput is imported from shared utils

  const form = useForm<CustomFieldFormData>({
    defaultValues: {
      source: 'Expense',
      infoValue: '',
      mandatory: false,
      validFrom: formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD'),
      validTo: formatDateForInput(activeTo) || '9999-12-31'
    }
  })

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<CustomField | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Usage check state
  const [, setIsCheckingUsage] = useState(false)
  const [currentUsageInfo, setCurrentUsageInfo] = useState<UsageInfo | null>(null)
  const [isRestrictedEdit, setIsRestrictedEdit] = useState(false)

  // Pre-loaded usage status for all custom fields (field id -> isUsed)
  const [fieldUsageMap, setFieldUsageMap] = useState<Record<string, boolean>>({})

  // Set up client
  expenseSettingsClient.setAccessToken(accessToken)

  // Load usage status for all custom fields
  // Note: Custom fields don't have direct references in ExpensePosition/ExpenseItem,
  // so we can't track usage. All fields are treated as not in use.
  const loadFieldUsageStatus = useCallback(async (fieldIds: string[]) => {
    if (fieldIds.length === 0) return

    // Since there's no direct link to track usage, allow all operations
    const emptyMap: Record<string, boolean> = {}
    fieldIds.forEach(id => {
      emptyMap[id] = false
    })
    setFieldUsageMap(emptyMap)
  }, [])

  // REAL GraphQL data from ExpenseRuleOtherInfo + available expenses/mileage
  const fetchCustomFields = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const query = `
        query GetExpenseRuleOtherInfo($ruleId: uuid!) {
          ExpenseRule(where: { id: { _eq: $ruleId } }) {
            id
            code
            name
            expenseRuleOtherInfo(where: { isDeleted: { _eq: false } }, orderBy: { createdAt: ASC }) {
              id
              source
              infoValue
              mandatory
              activeFrom
              activeTo
              version
              businessKey
              additionalProperties
              expenseRuleGeneralExpenseId
              expenseRuleMileageId
              expenseRuleGeneralExpense {
                id
                code
                name
              }
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
          }
        }
      `

      const result = await graphqlClient.request<{
        ExpenseRule: {
          expenseRuleOtherInfo: any[]
          expenseRuleGeneralExpense: any[]
          expenseRuleMileage: any[]
        }[]
      }>(query, { ruleId })

      const expenseRule = result.ExpenseRule?.[0]
      const otherInfos = expenseRule?.expenseRuleOtherInfo || []

      // Set available options for dropdowns
      const expenses = (expenseRule?.expenseRuleGeneralExpense || []).map((e: any) => ({
        id: e.id,
        code: e.code || '',
        name: e.name || ''
      }))
      const mileage = (expenseRule?.expenseRuleMileage || []).map((m: any) => ({
        id: m.id,
        code: m.code || '',
        name: m.name || ''
      }))
      setAvailableExpenses(expenses)
      setAvailableMileage(mileage)

      const transformedFields: CustomField[] = otherInfos.map((info: any) => {
        // Determine source and related info
        let source: 'Expense' | 'Mileage' = info.source === 'Mileage' ? 'Mileage' : 'Expense'
        let relatedId: string | undefined
        let relatedCode: string | undefined
        let relatedName: string | undefined

        if (info.expenseRuleGeneralExpense) {
          source = 'Expense'
          relatedId = info.expenseRuleGeneralExpenseId
          relatedCode = info.expenseRuleGeneralExpense.code
          relatedName = info.expenseRuleGeneralExpense.name
        } else if (info.expenseRuleMileage) {
          source = 'Mileage'
          relatedId = info.expenseRuleMileageId
          relatedCode = info.expenseRuleMileage.code
          relatedName = info.expenseRuleMileage.name
        }

        return {
          id: info.id,
          source,
          infoValue: info.infoValue || '',
          mandatory: info.mandatory || false,
          validFrom: info.activeFrom,
          validTo: info.activeTo,
          version: info.version,
          isDeleted: false,
          relatedId,
          relatedCode,
          relatedName
        }
      })

      setCustomFields(transformedFields)

      // Load usage status for all custom fields
      if (transformedFields.length > 0) {
        await loadFieldUsageStatus(transformedFields.map(f => f.id))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load custom fields')
    } finally {
      setIsLoading(false)
    }
  }, [ruleId, graphqlClient, loadFieldUsageStatus])

  // Sorted data is provided by useTableSorting hook (single source of truth)
  const sortedCustomFields = sorting.sortedData || customFields

  // Check detailed usage for a single custom field
  // Note: Custom fields don't have direct references in ExpensePosition/ExpenseItem
  const checkCustomFieldUsage = useCallback(async (): Promise<UsageInfo> => {
    // Since there's no direct link to track usage, return not used
    return { isUsed: false, usedIn: {}, message: '' }
  }, [])

  useEffect(() => {
    if (ruleId && accessToken) {
      fetchCustomFields()
    }
  }, [ruleId, accessToken, fetchCustomFields])

  const sourceOptions = [
    { value: 'Expense', label: 'Expense' },
    { value: 'Mileage', label: 'Mileage' }
  ]

  const handleAdd = () => {
    setEditingItem(null)
    setIsRestrictedEdit(false)
    setCurrentUsageInfo(null)

    // Determine validity period based on existing entries
    let validFromValue = formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD')
    let validToValue: string | undefined = undefined

    if (customFields.length > 0) {
      // Use the same validity period as the first existing entry
      const existingEntry = customFields[0]
      validFromValue = formatDateForInput(existingEntry.validFrom) || validFromValue
      validToValue = formatDateForInput(existingEntry.validTo)
    } else {
      // No existing entries - set validTo to December 31, 9999 (or rule's activeTo if set)
      validToValue = formatDateForInput(activeTo) || '9999-12-31'
    }

    form.reset({
      source: 'Expense',
      infoValue: '',
      mandatory: false,
      validFrom: validFromValue,
      validTo: validToValue,
      relatedId: undefined
    })
    setIsModalVisible(true)
  }

  const handleEdit = async (record: CustomField) => {
    setIsCheckingUsage(true)

    // Check if field is used
    const usageInfo = await checkCustomFieldUsage(record.id)
    setCurrentUsageInfo(usageInfo)
    setIsRestrictedEdit(usageInfo.isUsed)

    form.reset({
      id: record.id,
      source: record.source,
      infoValue: record.infoValue,
      mandatory: record.mandatory,
      validFrom: formatDateForInput(record.validFrom) || formatDateForInput(activeFrom) || dayjs().format('YYYY-MM-DD'),
      validTo: formatDateForInput(record.validTo),
      version: record.version,
      relatedId: record.relatedId
    })

    setEditingItem(record)
    setIsCheckingUsage(false)
    setIsModalVisible(true)
  }

  const handleDeleteClick = (record: CustomField) => {
    setItemToDelete(record)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return

    setIsDeleting(true)
    try {
      await expenseSettingsClient.saveExpenseRuleOtherInfo({
        id: itemToDelete.id,
        version: itemToDelete.version,
        expenseRuleId: ruleId,
        source: itemToDelete.source,
        infoValue: itemToDelete.infoValue,
        activeFrom: itemToDelete.validFrom,
        isDeleted: true
      })

      toast.success('Custom field deleted successfully')
      setDeleteDialogOpen(false)
      setItemToDelete(null)
      await fetchCustomFields()
    } catch (err) {
      toast.error('Failed to delete custom field')
      console.error('Delete error:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  // Check if source + relatedId combination is unique within the validity period
  const checkCustomFieldUniqueness = useCallback(
    async (
      source: 'Expense' | 'Mileage',
      relatedId: string | undefined,
      activeFrom: string,
      activeTo: string | undefined,
      excludeId?: string
    ): Promise<boolean> => {
      try {
        // If no source or relatedId, skip uniqueness check
        if (!source || !relatedId) {
          return false
        }

        // Map source to API enum using existing function
        const apiSource = mapSourceToApiEnum(source)

        // Fetch all matching custom fields and check overlap in JavaScript
        const query = `
          query CheckCustomFieldUniqueness($ruleId: uuid!, $source: String!, $excludeId: uuid) {
            ExpenseRuleOtherInfo(
              where: {
                expenseRuleId: { _eq: $ruleId }
                source: { _eq: $source }
                isDeleted: { _eq: false }
                id: { _neq: $excludeId }
              }
            ) {
              id
              activeFrom
              activeTo
              expenseRuleGeneralExpenseId
              expenseRuleMileageId
            }
          }
        `

        const variables = {
          ruleId,
          source: apiSource,
          excludeId: excludeId || null
        }

        const result = await graphqlClient.request<{
          ExpenseRuleOtherInfo: {
            id: string
            activeFrom: string
            activeTo?: string
            expenseRuleGeneralExpenseId?: string
            expenseRuleMileageId?: string
          }[]
        }>(query, variables)

        // Filter by relatedId based on source type
        const matchingByRelatedId = result.ExpenseRuleOtherInfo.filter(existing => {
          if (source === 'Expense') {
            return existing.expenseRuleGeneralExpenseId === relatedId
          } else if (source === 'Mileage') {
            return existing.expenseRuleMileageId === relatedId
          }
          return false
        })

        // Check for overlapping periods using shared utility
        const overlappingFields = findOverlappingPeriods({ activeFrom, activeTo }, matchingByRelatedId)

        if (overlappingFields.length > 0) {
          return true
        }

        return false
      } catch (error) {
        console.error('[CustomFieldsTab] Error checking custom field uniqueness:', {
          error,
          source,
          relatedId,
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
    [ruleId, graphqlClient, mapSourceToApiEnum]
  )

  const handleSave = async () => {
    try {
      setIsSaving(true)

      const formValues = form.getValues()

      // Check custom field uniqueness (source + relatedId combination)
      const fieldExists = await checkCustomFieldUniqueness(
        formValues.source,
        formValues.relatedId,
        formValues.validFrom,
        formValues.validTo,
        editingItem?.id
      )

      if (fieldExists) {
        form.setError('source', {
          type: 'manual',
          message:
            'This source and related item combination already exists with an overlapping validity period. Please use a different combination or adjust the validity dates.'
        })
        setIsSaving(false)
        return
      }

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

      // If restricted edit, only update validTo and infoValue
      if (isRestrictedEdit && editingItem) {
        await expenseSettingsClient.saveExpenseRuleOtherInfo({
          id: editingItem.id,
          version: editingItem.version,
          expenseRuleId: ruleId,
          source: mapSourceToApiEnum(editingItem.source),
          infoValue: formValues.infoValue,
          mandatory: editingItem.mandatory,
          activeFrom: editingItem.validFrom ? dayjs(editingItem.validFrom).startOf('day').toISOString() : null,
          activeTo: formValues.validTo ? dayjs(formValues.validTo).endOf('day').toISOString() : null,
          expenseRuleMileageId: editingItem.source === 'Mileage' ? editingItem.relatedId : null,
          expenseRuleGeneralExpenseId: editingItem.source === 'Expense' ? editingItem.relatedId : null
        })
      } else {
        // Full save
        const payload = {
          ...(isUpdate && { id: editingItem.id, version: editingItem.version }),
          expenseRuleId: ruleId,
          businessKey: undefined,
          activeTo: formValues.validTo ? dayjs(formValues.validTo).endOf('day').toISOString() : null,
          additionalProperties: undefined,
          source: mapSourceToApiEnum(formValues.source),
          infoValue: formValues.infoValue,
          mandatory: formValues.mandatory,
          activeFrom: formValues.validFrom ? dayjs(formValues.validFrom).startOf('day').toISOString() : null,
          // Set the related ID based on source
          expenseRuleMileageId: formValues.source === 'Mileage' ? formValues.relatedId : null,
          expenseRuleGeneralExpenseId: formValues.source === 'Expense' ? formValues.relatedId : null
        }
        await expenseSettingsClient.saveExpenseRuleOtherInfo(payload)
      }

      toast.success(`Custom field ${editingItem ? 'updated' : 'created'} successfully`)
      setIsModalVisible(false)
      await fetchCustomFields()
    } catch (err) {
      toast.error(`Failed to ${editingItem ? 'update' : 'create'} custom field`)
      console.error('Save error:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Get the options for the linked item dropdown based on source
  const getRelatedOptions = (): RelatedOption[] => {
    const source = form.watch('source')
    if (source === 'Expense') return availableExpenses
    if (source === 'Mileage') return availableMileage
    return []
  }

  // Removed Ant Design columns definition - using NW design system Table now

  if (isLoading) {
    return (
      <div
        data-testid="custom-fields-tab-loading"
        className="gba:flex gba:justify-center gba:items-center gba:min-h-64"
      >
        <Spinner className="gba:w-8 gba:h-8" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="custom-fields-tab-error">
        <AlertDescription>
          <div className="gba:flex gba:items-start gba:justify-between">
            <div>
              <strong>Error Loading Custom Fields</strong>
              <p className="gba:mt-1">{error}</p>
            </div>
            <Button size="sm" onClick={fetchCustomFields} variant="outline">
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div data-testid="custom-fields-tab">
      <Toaster />

      <Card data-testid="custom-fields-card">
        <CardHeader data-testid="custom-fields-card-header">
          <div className="gba:flex gba:justify-between gba:items-center">
            <div className="gba:flex gba:items-center gba:gap-2">
              <CardTitle data-testid="custom-fields-card-title">Custom Fields</CardTitle>
              <Badge variant="default" data-testid="custom-fields-count-badge">
                {customFields.length} fields
              </Badge>
            </div>
            <Button onClick={handleAdd} data-testid="add-custom-field-button">
              <PiPlus className="gba:mr-2" />
              Add Custom Field
            </Button>
          </div>
        </CardHeader>

        <CardContent data-testid="custom-fields-card-content">
          {sortedCustomFields.length > 0 ? (
            <Table data-testid="custom-fields-table">
              <TableHeader data-testid="custom-fields-table-header">
                <TableRow data-testid="custom-fields-table-header-row">
                  <TableHead className="gba:w-[60px]" data-testid="custom-fields-table-header-actions">
                    ACTIONS
                  </TableHead>
                  <TableHead
                    className="gba:w-[100px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                    onClick={() => sorting.handleSort('source')}
                    data-testid="custom-fields-table-header-source"
                  >
                    <div className="gba:flex gba:items-center">
                      SOURCE
                      {sorting.renderSortIcon('source')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[200px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                    onClick={() => sorting.handleSort('linkedItem')}
                    data-testid="custom-fields-table-header-linked"
                  >
                    <div className="gba:flex gba:items-center">
                      LINKED ITEM
                      {sorting.renderSortIcon('linkedItem')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[200px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                    onClick={() => sorting.handleSort('infoValue')}
                    data-testid="custom-fields-table-header-value"
                  >
                    <div className="gba:flex gba:items-center">
                      INFO VALUE
                      {sorting.renderSortIcon('infoValue')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[100px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                    onClick={() => sorting.handleSort('mandatory')}
                    data-testid="custom-fields-table-header-mandatory"
                  >
                    <div className="gba:flex gba:items-center">
                      MANDATORY
                      {sorting.renderSortIcon('mandatory')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[180px] gba:cursor-pointer gba:select-none gba:hover:bg-accent"
                    onClick={() => sorting.handleSort('activeFrom')}
                    data-testid="custom-fields-table-header-validity"
                  >
                    <div className="gba:flex gba:items-center">
                      VALIDITY
                      {sorting.renderSortIcon('activeFrom')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody data-testid="custom-fields-table-body">
                {sortedCustomFields.map(record => (
                  <TableRow key={record.id} data-testid={`custom-field-row-${record.id}`}>
                    <TableCell data-testid={`custom-field-actions-cell-${record.id}`}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`custom-field-action-${record.id}`}
                            onClick={e => e.stopPropagation()}
                          >
                            <PiDotsThreeVertical className="gba:h-4 gba:w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEdit(record)}
                            data-testid={`edit-custom-field-${record.id}`}
                          >
                            <PiPencil className="gba:h-4 gba:w-4 gba:mr-2" />
                            Update
                          </DropdownMenuItem>
                          {!fieldUsageMap[record.id] && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(record)}
                                className="gba:text-destructive"
                                data-testid={`delete-custom-field-${record.id}`}
                              >
                                <PiTrash className="gba:h-4 gba:w-4 gba:mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>

                    <TableCell data-testid={`custom-field-source-cell-${record.id}`}>
                      <Badge
                        variant={record.source === 'Expense' ? 'default' : 'secondary'}
                        data-testid={`custom-field-source-badge-${record.id}`}
                      >
                        {record.source}
                      </Badge>
                    </TableCell>

                    <TableCell data-testid={`custom-field-linked-cell-${record.id}`}>
                      {record.relatedCode ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <PiCode
                            className="gba:text-muted-foreground"
                            data-testid={`custom-field-linked-icon-${record.id}`}
                          />
                          <div>
                            <div
                              className="gba:font-mono gba:font-medium gba:text-sm"
                              data-testid={`custom-field-linked-code-${record.id}`}
                            >
                              {record.relatedCode}
                            </div>
                            <div
                              className="gba:text-muted-foreground gba:text-xs"
                              data-testid={`custom-field-linked-name-${record.id}`}
                            >
                              {record.relatedName}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="gba:text-muted-foreground gba:text-sm">Not linked</span>
                      )}
                    </TableCell>

                    <TableCell data-testid={`custom-field-value-cell-${record.id}`}>
                      <span
                        className="gba:text-sm gba:font-medium"
                        data-testid={`custom-field-value-text-${record.id}`}
                      >
                        {record.infoValue || '-'}
                      </span>
                    </TableCell>

                    <TableCell data-testid={`custom-field-mandatory-cell-${record.id}`}>
                      <Badge
                        variant={record.mandatory ? 'destructive' : 'default'}
                        data-testid={`custom-field-mandatory-badge-${record.id}`}
                      >
                        {record.mandatory ? 'Required' : 'Optional'}
                      </Badge>
                    </TableCell>

                    <TableCell data-testid={`custom-field-validity-cell-${record.id}`}>
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <PiCalendar
                          className="gba:text-muted-foreground"
                          data-testid={`custom-field-validity-icon-${record.id}`}
                        />
                        <span className="gba:text-sm" data-testid={`custom-field-validity-text-${record.id}`}>
                          {formatDate(record.validFrom)} - {record.validTo ? formatDate(record.validTo) : '∞'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="gba:text-center gba:py-8 gba:text-muted-foreground" data-testid="custom-fields-empty-state">
              <p className="gba:m-0" data-testid="custom-fields-empty-message">
                No custom fields configured
              </p>
              <p className="gba:text-xs gba:mt-1" data-testid="custom-fields-empty-hint">
                Click "Add Custom Field" to create your first custom field
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Custom Field"
        itemDescription={`the custom field "${itemToDelete?.infoValue}"`}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false)
          setItemToDelete(null)
        }}
        testIdPrefix="custom-field-delete"
      />

      {/* Add/Edit Dialog */}
      <Dialog open={isModalVisible} onOpenChange={setIsModalVisible}>
        <DialogContent className="gba:max-w-2xl" data-testid="custom-field-modal">
          <DialogHeader data-testid="custom-field-modal-header">
            <DialogTitle data-testid="custom-field-modal-title">
              {editingItem ? 'Edit' : 'Add'} Custom Field
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <div data-testid="custom-field-form" className="gba:space-y-4">
              {isRestrictedEdit && currentUsageInfo && (
                <Alert
                  className="gba:border-warning gba:bg-warning-secondary"
                  data-testid="custom-field-restricted-alert"
                >
                  <PiWarning className="gba:h-4 gba:w-4 gba:text-warning" />
                  <AlertDescription>{currentUsageInfo.message}</AlertDescription>
                </Alert>
              )}

              {/* Source (Expense/Mileage) */}
              <FormField
                control={form.control}
                name="source"
                rules={{ required: 'Source is required' }}
                render={({ field }) => (
                  <FormItem data-testid="custom-field-source-field">
                    <FormLabel data-testid="custom-field-source-label">Source *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={value => {
                        field.onChange(value)
                        form.setValue('relatedId', undefined) // Reset selection when source changes
                      }}
                      disabled={isRestrictedEdit}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="custom-field-source-select">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent data-testid="custom-field-source-options">
                        {sourceOptions.map(option => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            data-testid={`custom-field-source-option-${option.value}`}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="gba:text-xs gba:text-muted-foreground" data-testid="custom-field-source-hint">
                      Select whether this custom field applies to Expense or Mileage items
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Linked Expense/Mileage */}
              <FormField
                control={form.control}
                name="relatedId"
                render={({ field }) => (
                  <FormItem data-testid="custom-field-linked-field">
                    <FormLabel data-testid="custom-field-linked-label">Linked {form.watch('source')}</FormLabel>
                    <Select
                      value={field.value || 'none'}
                      onValueChange={value => field.onChange(value === 'none' ? undefined : value)}
                      disabled={isRestrictedEdit}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="custom-field-linked-select">
                          <SelectValue
                            placeholder={`Select ${form.watch('source')?.toLowerCase() || 'item'} (optional)`}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent data-testid="custom-field-linked-options">
                        <SelectItem value="none">Not linked to specific item</SelectItem>
                        {getRelatedOptions().map(option => (
                          <SelectItem
                            key={option.id}
                            value={option.id}
                            data-testid={`custom-field-linked-option-${option.id}`}
                          >
                            {option.code} - {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {getRelatedOptions().length === 0 && (
                      <p className="gba:text-xs gba:text-warning-foreground" data-testid="custom-field-linked-empty">
                        No {form.watch('source') === 'Expense' ? 'expenses' : 'mileage rules'} available for this rule
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Info Value - allowed to edit even in restricted mode */}
              <FormField
                control={form.control}
                name="infoValue"
                rules={{ required: 'Info Value is required' }}
                render={({ field }) => (
                  <FormItem data-testid="custom-field-info-value-field">
                    <FormLabel data-testid="custom-field-info-value-label">Info Value *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g., License Plate, Project Code, Cost Center"
                        data-testid="custom-field-info-value-input"
                      />
                    </FormControl>
                    <p className="gba:text-xs gba:text-muted-foreground" data-testid="custom-field-info-value-hint">
                      The custom field value or label that will appear on the item screen
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Mandatory */}
              <FormField
                control={form.control}
                name="mandatory"
                render={({ field }) => (
                  <FormItem
                    className="gba:flex gba:items-center gba:justify-between"
                    data-testid="custom-field-mandatory-field"
                  >
                    <FormLabel data-testid="custom-field-mandatory-label">Mandatory</FormLabel>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <span
                        className="gba:text-sm gba:text-muted-foreground"
                        data-testid="custom-field-mandatory-status"
                      >
                        {field.value ? 'Required' : 'Optional'}
                      </span>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isRestrictedEdit}
                          data-testid="custom-field-mandatory-checkbox"
                        />
                      </FormControl>
                    </div>
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
                    <FormItem data-testid="custom-field-valid-from-field">
                      <FormLabel data-testid="custom-field-valid-from-label">Valid From *</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value || ''}
                          onChange={date => field.onChange(date)}
                          disabled={isRestrictedEdit}
                          data-testid="custom-field-valid-from-input"
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
                    <FormItem data-testid="custom-field-valid-to-field">
                      <FormLabel data-testid="custom-field-valid-to-label">Valid To</FormLabel>
                      <FormControl>
                        <DateInput
                          value={field.value || ''}
                          onChange={date => field.onChange(date)}
                          data-testid="custom-field-valid-to-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Form>

          <DialogFooter data-testid="custom-field-modal-footer">
            <Button
              variant="outline"
              onClick={() => setIsModalVisible(false)}
              disabled={isSaving}
              data-testid="custom-field-modal-cancel-button"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} data-testid="custom-field-modal-save-button">
              {isSaving ? <Spinner className="gba:w-4 gba:h-4 gba:mr-2" /> : null}
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CustomFieldsTab
