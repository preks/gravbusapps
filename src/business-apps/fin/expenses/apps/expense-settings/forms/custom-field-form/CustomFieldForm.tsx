import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@newwork/nw-design-system'
import { WarningIcon } from '@phosphor-icons/react'
import { RuleSource, getRuleSourceOptions } from '../../types/ExpenseEnums'
import { ExpenseRuleCustomField } from '../../types/ExpenseRuleTypes'
import { useGetExpenseRuleOtherInfoById } from '../../queries/ExpenseRuleQueries'
import { customFieldFormSchema } from '../../schemas'

export interface CustomFieldFormData {
  id?: string
  fieldName: string
  fieldValue: string
  fieldType: string
  ruleSource?: RuleSource
  fieldOrder: number
}

interface CustomFieldFormProps extends BusinessAppContextProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: ExpenseRuleCustomField
  isEditing?: boolean
  onSave: (data: CustomFieldFormData) => Promise<void>
  loading?: boolean
}

const CustomFieldForm: React.FC<CustomFieldFormProps> = ({
  open,
  onOpenChange,
  initialData,
  isEditing = false,
  onSave,
  loading = false,
  accessToken
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // React Hook Form setup with Zod validation
  const form = useForm<CustomFieldFormData>({
    resolver: zodResolver(customFieldFormSchema),
    defaultValues: {
      fieldName: '',
      fieldValue: '',
      fieldType: 'TEXT',
      fieldOrder: 1,
      ruleSource: RuleSource.GENERAL_EXPENSE_RULE
    }
  })

  // Hook for fetching fresh custom field data
  const { fetchExpenseRuleOtherInfoById } = useGetExpenseRuleOtherInfoById({ accessToken } as BusinessAppContextProps)

  // Field type options
  const fieldTypeOptions = [
    { value: 'TEXT', label: 'Text' },
    { value: 'NUMBER', label: 'Number' },
    { value: 'BOOLEAN', label: 'Boolean' },
    { value: 'DATE', label: 'Date' },
    { value: 'CURRENCY', label: 'Currency' },
    { value: 'PERCENTAGE', label: 'Percentage' }
  ]

  // Load fresh data when editing, use initial data when creating
  useEffect(() => {
    const loadData = async () => {
      if (isEditing && initialData?.id) {
        try {
          const freshData = await fetchExpenseRuleOtherInfoById(initialData.id)
          if (freshData) {
            form.reset({
              fieldName: freshData.source || 'Custom Field',
              fieldValue: freshData.infoValue,
              fieldType: 'TEXT',
              ruleSource: freshData.source || RuleSource.GENERAL_EXPENSE_RULE,
              fieldOrder: 1
            })
            return
          }
        } catch (err) {
          console.error('Failed to load fresh custom field data:', err)
        }
      }

      if (initialData) {
        form.reset({
          fieldName: initialData.fieldName,
          fieldValue: initialData.fieldValue,
          fieldType: initialData.fieldType,
          ruleSource: initialData.ruleSource,
          fieldOrder: initialData.fieldOrder
        })
      } else {
        form.reset({
          fieldName: '',
          fieldValue: '',
          fieldType: 'TEXT',
          fieldOrder: 1,
          ruleSource: RuleSource.GENERAL_EXPENSE_RULE
        })
      }
    }

    if (open) {
      loadData()
    }
  }, [initialData?.id, isEditing, open, form, fetchExpenseRuleOtherInfoById])

  const handleSubmit = async (data: CustomFieldFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const formData: CustomFieldFormData = {
        ...data,
        id: initialData?.id
      }

      await onSave(formData)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save custom field')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    form.reset({
      fieldName: '',
      fieldValue: '',
      fieldType: 'TEXT',
      fieldOrder: 1,
      ruleSource: RuleSource.GENERAL_EXPENSE_RULE
    })
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-2xl" data-testid="custom-field-form-dialog">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Custom Field' : 'Create New Custom Field'}</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" data-testid="custom-field-form-error">
            <WarningIcon className="gba:h-4 gba:w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} data-testid="custom-field-form">
            <div className="gba:space-y-4">
              <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                <FormField
                  control={form.control}
                  name="fieldName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Field Name <span className="gba:text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter field name (e.g., Max Amount)"
                          data-testid="custom-field-form-name-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fieldType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Field Type <span className="gba:text-destructive">*</span>
                      </FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="custom-field-form-type-select">
                            <SelectValue placeholder="Select field type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {fieldTypeOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                <FormField
                  control={form.control}
                  name="ruleSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Rule Source <span className="gba:text-destructive">*</span>
                      </FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="custom-field-form-rule-source-select">
                            <SelectValue placeholder="Select rule source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getRuleSourceOptions().map(option => (
                            <SelectItem key={option.value} value={option.value}>
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
                  name="fieldOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Display Order <span className="gba:text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                          placeholder="Enter order"
                          data-testid="custom-field-form-order-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="fieldValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Field Value <span className="gba:text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder="Enter field value or configuration"
                        data-testid="custom-field-form-value-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gba:mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                data-testid="custom-field-form-cancel-button"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || loading} data-testid="custom-field-form-save-button">
                {isEditing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default CustomFieldForm
