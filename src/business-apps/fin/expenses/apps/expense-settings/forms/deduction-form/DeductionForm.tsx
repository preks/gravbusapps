import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFeature } from '@/common/hooks/useFeature'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@newwork/nw-design-system'
import { PiWarning } from 'react-icons/pi'
import { DeductionDay, getDeductionDayOptions } from '../../types/ExpenseEnums'
import { ExpenseRuleDeduction } from '../../types/ExpenseRuleTypes'
import { useGetExpenseRuleDeductionById } from '../../queries/ExpenseRuleQueries'
import { deductionFormSchema, type DeductionFormSchema } from '../../schemas'

export type DeductionFormData = DeductionFormSchema

interface DeductionFormProps extends BusinessAppContextProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: ExpenseRuleDeduction
  isEditing?: boolean
  onSave: (data: DeductionFormData) => Promise<void>
  loading?: boolean
}

const DeductionForm: React.FC<DeductionFormProps> = ({
  open,
  onOpenChange,
  initialData,
  isEditing = false,
  onSave,
  loading = false,
  accessToken
}) => {
  // Feature flag check
  const isDevEnabled = useFeature('dev.enabled')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // React Hook Form setup with Zod validation
  const form = useForm<DeductionFormData>({
    resolver: zodResolver(deductionFormSchema),
    defaultValues: {
      deductBreakfast: false,
      deductLunch: false,
      deductDinner: false,
      deductionOrder: 1,
      overnightAllowance: false,
      deductionDay: DeductionDay.FIRST_DAY
    }
  })

  // Feature flag guard
  if (isDevEnabled === false) {
    return null
  }

  // ✅ Hook for fetching fresh deduction data
  const { fetchExpenseRuleDeductionById } = useGetExpenseRuleDeductionById({ accessToken } as BusinessAppContextProps)

  // ✅ Load fresh data when editing, use initial data when creating
  useEffect(() => {
    const loadData = async () => {
      if (isEditing && initialData?.id) {
        // For editing, fetch fresh data from the server
        try {
          const freshData = await fetchExpenseRuleDeductionById(initialData.id)
          if (freshData) {
            form.reset({
              id: freshData.id,
              deductBreakfast: freshData.deductBreakfast,
              deductLunch: freshData.deductLunch,
              deductDinner: freshData.deductDinner,
              deductionDay: freshData.deductionDay,
              deductionOrder: freshData.deductionOrder,
              overnightAllowance: freshData.overnightAllowance
            })
            return
          }
        } catch (err) {
          console.error('Failed to load fresh deduction data:', err)
          // Continue with fallback to initial data
        }
      }

      // Fallback: Use initial data (for creating or if fresh fetch failed)
      if (initialData) {
        form.reset({
          id: initialData.id,
          deductBreakfast: initialData.deductBreakfast,
          deductLunch: initialData.deductLunch,
          deductDinner: initialData.deductDinner,
          deductionDay: (initialData.deductionDay as DeductionDay) || DeductionDay.FIRST_DAY,
          deductionOrder: initialData.deductionOrder,
          overnightAllowance: initialData.overnightAllowance
        })
      }
    }

    loadData()
  }, [initialData?.id, isEditing, fetchExpenseRuleDeductionById, form])

  const handleSubmit = async (data: DeductionFormData) => {
    // Validation is handled by Zod schema
    setIsSubmitting(true)
    setError(null)

    try {
      await onSave(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save deduction')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    form.reset({
      deductBreakfast: false,
      deductLunch: false,
      deductDinner: false,
      deductionOrder: 1,
      overnightAllowance: false,
      deductionDay: DeductionDay.FIRST_DAY
    })
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-2xl" data-testid="deduction-form-dialog">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Deduction Rule' : 'Create New Deduction Rule'}</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" data-testid="deduction-form-error">
            <PiWarning className="gba:h-4 gba:w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} data-testid="deduction-form">
            <div className="gba:space-y-6">
              {/* Deduction Day and Order */}
              <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                <FormField
                  control={form.control}
                  name="deductionDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Deduction Day <span className="gba:text-destructive">*</span>
                      </FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="deduction-form-deduction-day-select">
                            <SelectValue placeholder="Select deduction day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getDeductionDayOptions().map(option => (
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
                  name="deductionOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Deduction Order <span className="gba:text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                          placeholder="Enter order"
                          data-testid="deduction-form-order-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Meal Deductions */}
              <div className="gba:space-y-3">
                <FormLabel className="gba:text-base gba:font-medium">Meal Deductions</FormLabel>
                <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
                  <FormField
                    control={form.control}
                    name="deductBreakfast"
                    render={({ field }) => (
                      <FormItem className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="deduction-form-breakfast-checkbox"
                          />
                        </FormControl>
                        <FormLabel className="gba:font-normal">Deduct Breakfast</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deductLunch"
                    render={({ field }) => (
                      <FormItem className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="deduction-form-lunch-checkbox"
                          />
                        </FormControl>
                        <FormLabel className="gba:font-normal">Deduct Lunch</FormLabel>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deductDinner"
                    render={({ field }) => (
                      <FormItem className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="deduction-form-dinner-checkbox"
                          />
                        </FormControl>
                        <FormLabel className="gba:font-normal">Deduct Dinner</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Additional Options */}
              <div className="gba:space-y-3">
                <FormLabel className="gba:text-base gba:font-medium">Additional Options</FormLabel>
                <FormField
                  control={form.control}
                  name="overnightAllowance"
                  render={({ field }) => (
                    <FormItem className="gba:flex gba:flex-row gba:items-center gba:gap-3 gba:space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="deduction-form-overnight-checkbox"
                        />
                      </FormControl>
                      <FormLabel className="gba:font-normal">Overnight Allowance</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="gba:mt-6">
              <Button type="button" variant="outline" onClick={handleClose} data-testid="deduction-form-cancel-button">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || loading} data-testid="deduction-form-save-button">
                {isEditing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default DeductionForm
