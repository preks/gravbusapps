import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
import dayjs from 'dayjs'

export interface GeneralExpenseFormData {
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

  const form = useForm<GeneralExpenseFormData>({
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
          setTaxCodes(
            taxResponse.data.map((entry: any) => ({
              id: entry.id,
              value: entry.value,
              code: entry.code
            }))
          )
        }

        // Load expense groups
        const groupResponse = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'ExpenseGroup', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: true }
        )
        if (groupResponse?.data) {
          setExpenseGroups(
            groupResponse.data.map((entry: any) => ({
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
    const data = form.getValues()

    // Validation
    if (!data.code?.trim()) {
      form.setError('code', { type: 'manual', message: 'Code is required' })
      return
    }
    if (!data.name?.trim()) {
      form.setError('name', { type: 'manual', message: 'Name is required' })
      return
    }
    if (!data.activeFrom) {
      form.setError('activeFrom', { type: 'manual', message: 'Valid From is required' })
      return
    }

    // Validate dates against rule's validity period
    const ruleFrom = dayjs(ruleActiveFrom)
    const ruleTo = ruleActiveTo ? dayjs(ruleActiveTo) : null
    const expenseFrom = dayjs(data.activeFrom)
    const expenseTo = data.activeTo ? dayjs(data.activeTo) : null

    if (expenseFrom.isBefore(ruleFrom)) {
      form.setError('activeFrom', {
        type: 'manual',
        message: `Valid From cannot be before the rule's Valid From (${ruleFrom.format('DD.MM.YYYY')})`
      })
      return
    }

    if (ruleTo && expenseFrom.isAfter(ruleTo)) {
      form.setError('activeFrom', {
        type: 'manual',
        message: `Valid From cannot be after the rule's Valid To (${ruleTo.format('DD.MM.YYYY')})`
      })
      return
    }

    if (ruleTo && expenseTo && expenseTo.isAfter(ruleTo)) {
      form.setError('activeTo', {
        type: 'manual',
        message: `Valid To cannot be after the rule's Valid To (${ruleTo.format('DD.MM.YYYY')})`
      })
      return
    }

    if (expenseTo && expenseFrom.isAfter(expenseTo)) {
      form.setError('activeTo', {
        type: 'manual',
        message: `Valid To cannot be before Valid From`
      })
      return
    }

    // Parse additional properties
    let additionalProperties: Record<string, unknown> | undefined
    if (additionalPropertiesJson.trim()) {
      try {
        additionalProperties = JSON.parse(additionalPropertiesJson)
      } catch {
        // Invalid JSON, ignore
      }
    }

    setIsSaving(true)
    try {
      await onSave({ ...data, additionalProperties })
    } finally {
      setIsSaving(false)
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
