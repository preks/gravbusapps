import React, { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Alert,
  AlertDescription,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Checkbox,
  DateInput
} from '@newwork/nw-design-system'
import { PiWarning } from 'react-icons/pi'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import dayjs from 'dayjs'
import { createGeneralExpenseFormSchema, type GeneralExpenseFormSchema } from '../../schemas'

export type GeneralExpenseFormData = GeneralExpenseFormSchema

export interface UsageInfo {
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
  value: string
  label: string
}

export interface GeneralExpenseFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  ruleId: string
  ruleActiveFrom: string
  ruleActiveTo?: string
  editingItem?: GeneralExpenseFormData | null
  usageInfo?: UsageInfo | null
  isRestrictedEdit?: boolean
  onSave: (data: GeneralExpenseFormData & { additionalProperties?: Record<string, unknown> }) => Promise<void>
  onCancel: () => void
}

const GeneralExpenseForm: React.FC<GeneralExpenseFormProps> = ({
  open,
  onOpenChange,
  accessToken,
  ruleId,
  ruleActiveFrom,
  ruleActiveTo,
  editingItem,
  usageInfo,
  isRestrictedEdit = false,
  onSave,
  onCancel
}) => {
  const catalogClient = useCatalogManagerClient(accessToken)
  const graphqlClient = useGraphQLClient(accessToken)

  const [isSaving, setIsSaving] = useState(false)
  const [taxCodes, setTaxCodes] = useState<TaxCodeOption[]>([])
  const [expenseGroups, setExpenseGroups] = useState<ExpenseGroupOption[]>([])
  const [catalogsLoading, setCatalogsLoading] = useState(true)
  const [additionalPropertiesJson, setAdditionalPropertiesJson] = useState('')

  // Extract date portion to avoid timezone issues (YYYY-MM-DD format)
  const formatDateForInput = (dateStr?: string) => {
    if (!dateStr) return undefined
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
    // Otherwise extract date portion using dayjs to handle ISO strings correctly
    return dayjs(dateStr).format('YYYY-MM-DD')
  }

  // Create schema with date validation based on rule dates
  const schema = useMemo(
    () => createGeneralExpenseFormSchema(ruleActiveFrom, ruleActiveTo),
    [ruleActiveFrom, ruleActiveTo]
  )

  const form = useForm<GeneralExpenseFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      expenseRuleId: ruleId,
      code: '',
      name: '',
      reimbursable: true,
      activeFrom: formatDateForInput(ruleActiveFrom) || dayjs().format('YYYY-MM-DD'),
      activeTo: formatDateForInput(ruleActiveTo) || '9999-12-31'
    }
  })

  // Load catalogs
  useEffect(() => {
    const loadCatalogs = async () => {
      setCatalogsLoading(true)
      try {
        // Load tax codes
        const taxResponse = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'TaxCode', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true }
        )

        if (taxResponse?.data) {
          const mappedTaxCodes = taxResponse.data.map((entry: any) => {
            // Extract percentage from value string (e.g., "Input tax 7%" -> 7)
            const percentMatch = entry.value.match(/(\d+(?:\.\d+)?)\s*%/)
            const taxPercentage = percentMatch ? parseFloat(percentMatch[1]) : 0

            return {
              id: entry.id,
              value: entry.value,
              code: entry.code,
              taxPercentage // Store the extracted percentage
            }
          })

          setTaxCodes(mappedTaxCodes as any)
        }

        // Load expense groups
        const groupResponse = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'ExpenseGroup', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true }
        )
        if (groupResponse?.data) {
          // Filter out Mileage and Allowance/Allowances
          const filteredGroups = groupResponse.data.filter((entry: any) => {
            const value = (entry.value || entry.code || '').toLowerCase()
            return !value.includes('mileage') && !value.includes('allowance')
          })

          setExpenseGroups(
            filteredGroups.map((entry: any) => ({
              value: entry.id,
              label: entry.value || entry.code
            }))
          )
        }
      } catch (error) {
        console.error('Error loading catalogs:', error)
      } finally {
        setCatalogsLoading(false)
      }
    }

    if (accessToken) {
      loadCatalogs()
    }
  }, [accessToken, catalogClient])

  // Reset form when editingItem changes
  useEffect(() => {
    if (editingItem) {
      form.reset({
        id: editingItem.id,
        expenseRuleId: ruleId,
        code: editingItem.code || '',
        name: editingItem.name || '',
        reimbursable: editingItem.reimbursable ?? true,
        taxCodeRef: editingItem.taxCodeRef,
        taxValue: editingItem.taxValue,
        activeFrom:
          formatDateForInput(editingItem.activeFrom) ||
          formatDateForInput(ruleActiveFrom) ||
          dayjs().format('YYYY-MM-DD'),
        activeTo: formatDateForInput(editingItem.activeTo),
        expenseGroupRef: editingItem.expenseGroupRef,
        version: editingItem.version
      })
      setAdditionalPropertiesJson(
        editingItem.additionalProperties ? JSON.stringify(editingItem.additionalProperties, null, 2) : ''
      )
    } else {
      form.reset({
        expenseRuleId: ruleId,
        code: '',
        name: '',
        reimbursable: true,
        activeFrom: formatDateForInput(ruleActiveFrom) || dayjs().format('YYYY-MM-DD'),
        activeTo: formatDateForInput(ruleActiveTo) || '9999-12-31'
      })
      setAdditionalPropertiesJson('')
    }
  }, [editingItem, ruleId, ruleActiveFrom, ruleActiveTo, form])

  const handleSave = async () => {
    // Trigger validation
    const isValid = await form.trigger()
    if (!isValid) return

    const data = form.getValues()

    // Parse additional properties
    let additionalProperties: Record<string, unknown> | undefined
    if (additionalPropertiesJson.trim()) {
      try {
        additionalProperties = JSON.parse(additionalPropertiesJson)
      } catch {
        // Invalid JSON, ignore
      }
    }

    // Check for code uniqueness in the validity period
    setIsSaving(true)
    try {
      console.log('[GeneralExpenseForm] handleSave - Starting uniqueness check:', {
        code: data.code,
        activeFrom: data.activeFrom,
        activeTo: data.activeTo,
        editingItemId: editingItem?.id,
        isEdit: !!editingItem
      })

      const codeExists = await checkCodeUniqueness(data.code, data.activeFrom, data.activeTo, editingItem?.id)

      console.log('[GeneralExpenseForm] handleSave - Uniqueness check result:', { codeExists })

      if (codeExists) {
        console.log('[GeneralExpenseForm] handleSave - BLOCKING SAVE: Duplicate code detected')
        form.setError('code', {
          type: 'manual',
          message:
            'This code already exists with an overlapping validity period. Please use a different code or adjust the validity dates.'
        })
        setIsSaving(false)
        return
      }

      console.log('[GeneralExpenseForm] handleSave - Code is unique, proceeding with save')
      await onSave({ ...data, additionalProperties })
    } catch (error) {
      console.error('[GeneralExpenseForm] handleSave - Save error:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error)
      })
      throw error // Re-throw to let parent handle it
    } finally {
      setIsSaving(false)
    }
  }

  // Check if code is unique within the validity period
  const checkCodeUniqueness = async (
    code: string,
    activeFrom: string,
    activeTo: string | undefined,
    excludeId?: string
  ): Promise<boolean> => {
    console.log('[GeneralExpenseForm] checkCodeUniqueness called:', {
      code,
      activeFrom,
      activeTo,
      excludeId,
      ruleId
    })

    try {
      // For overlap check: periods overlap if:
      // - new start <= existing end (or existing end is null/infinite)
      // - AND new end >= existing start (or new end is null/infinite)
      // We'll fetch all matching codes and check overlap in JavaScript to avoid GraphQL schema limitations
      const query = `
        query CheckCodeUniqueness($ruleId: uuid!, $code: String!, $excludeId: uuid) {
          ExpenseRuleGeneralExpense(
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

      console.log('[GeneralExpenseForm] GraphQL query variables:', variables)

      const result = await graphqlClient.request<{
        ExpenseRuleGeneralExpense: { id: string; code: string; activeFrom: string; activeTo?: string }[]
      }>(query, variables)

      console.log('[GeneralExpenseForm] GraphQL response:', {
        result,
        foundCount: result.ExpenseRuleGeneralExpense?.length || 0,
        allMatchingCodes: result.ExpenseRuleGeneralExpense
      })

      // Check for overlapping periods in JavaScript
      const newPeriodFrom = dayjs(activeFrom).startOf('day')
      const newPeriodTo = activeTo ? dayjs(activeTo).endOf('day') : null

      const overlappingCodes = result.ExpenseRuleGeneralExpense.filter(existing => {
        const existingFrom = dayjs(existing.activeFrom)
        const existingTo = existing.activeTo ? dayjs(existing.activeTo) : null

        // Two periods overlap if:
        // - new start <= existing end (or existing end is null/infinite)
        // - AND new end >= existing start (or new end is null/infinite)
        // They don't overlap if:
        // - new end < existing start (if both exist)
        // - OR existing end < new start (if both exist)

        const periodsDontOverlap =
          (newPeriodTo && existingFrom && newPeriodTo.isBefore(existingFrom, 'day')) ||
          (existingTo && newPeriodFrom && existingTo.isBefore(newPeriodFrom, 'day'))

        return !periodsDontOverlap
      })

      console.log('[GeneralExpenseForm] Overlap check:', {
        newPeriod: {
          from: newPeriodFrom.format('YYYY-MM-DD'),
          to: newPeriodTo ? newPeriodTo.format('YYYY-MM-DD') : 'infinite'
        },
        overlappingCodes: overlappingCodes.map(c => ({
          id: c.id,
          code: c.code,
          from: dayjs(c.activeFrom).format('YYYY-MM-DD'),
          to: c.activeTo ? dayjs(c.activeTo).format('YYYY-MM-DD') : 'infinite'
        }))
      })

      if (overlappingCodes.length > 0) {
        console.log('[GeneralExpenseForm] DUPLICATE FOUND:', {
          code,
          overlappingEntries: overlappingCodes,
          isDuplicate: true
        })
        return true
      }

      console.log('[GeneralExpenseForm] No overlapping duplicates found - code is unique')
      return false
    } catch (error) {
      console.error('[GeneralExpenseForm] Error checking code uniqueness:', {
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
      // This is safer than allowing saves when we can't verify uniqueness
      return true // Block save on error
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-2xl" data-testid="general-expense-modal">
        <DialogHeader data-testid="general-expense-modal-header">
          <DialogTitle data-testid="general-expense-modal-title">
            {editingItem ? 'Edit' : 'Add'} General Expense Rule
          </DialogTitle>
        </DialogHeader>

        {isRestrictedEdit && usageInfo && (
          <Alert
            className="gba:mb-4 gba:bg-warning-secondary gba:text-warning-secondary-foreground gba:border-warning"
            data-testid="general-expense-restricted-alert"
          >
            <PiWarning className="gba:h-4 gba:w-4" />
            <AlertDescription>{usageInfo.message}</AlertDescription>
          </Alert>
        )}

        <div className="gba:max-h-[60vh] gba:overflow-y-auto gba:pr-2">
          <Form {...form}>
            <div className="gba:space-y-4" data-testid="general-expense-form">
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
                    <FormLabel data-testid="general-expense-tax-code-label">Tax Code *</FormLabel>
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
                        onChange={e => {
                          const value = e.target.value
                          field.onChange(value === '' ? undefined : parseFloat(value))
                        }}
                        placeholder="Auto-populated from Tax Code"
                        disabled={isRestrictedEdit}
                        data-testid="general-expense-tax-value-input"
                      />
                    </FormControl>
                    <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                      Value is auto-populated when you select a Tax Code
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expenseGroupRef"
                render={({ field }) => (
                  <FormItem data-testid="general-expense-group-field">
                    <FormLabel data-testid="general-expense-group-label">Expense Group *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isRestrictedEdit}>
                      <FormControl>
                        <SelectTrigger data-testid="general-expense-group-select">
                          <SelectValue placeholder="Select expense group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent data-testid="general-expense-group-options">
                        {expenseGroups.map(option => (
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

              <FormField
                control={form.control}
                name="activeFrom"
                render={({ field }) => (
                  <FormItem data-testid="general-expense-active-from-field">
                    <FormLabel data-testid="general-expense-active-from-label">Valid From *</FormLabel>
                    <FormControl>
                      <DateInput
                        value={field.value || ''}
                        onChange={date => field.onChange(date)}
                        disabled={isRestrictedEdit}
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
                        value={field.value || ''}
                        onChange={date => field.onChange(date)}
                        data-testid="general-expense-active-to-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
        </div>

        <DialogFooter data-testid="general-expense-modal-footer">
          <Button
            variant="outline"
            onClick={onCancel}
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
  )
}

export default GeneralExpenseForm
