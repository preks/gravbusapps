import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFeature } from '@/common/hooks/useFeature'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
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
import { PiFloppyDisk, PiX, PiWarning } from 'react-icons/pi'
import { DeductionDay, getDeductionDayOptions } from '../../types/ExpenseEnums'
import { ExpenseRuleDeduction } from '../../types/ExpenseRuleTypes'
import { useGetExpenseRuleDeductionById } from '../../queries/ExpenseRuleQueries'

export interface DeductionFormData {
  id?: string
  deductBreakfast: boolean
  deductLunch: boolean
  deductDinner: boolean
  deductionDay?: DeductionDay
  deductionOrder: number
  overnightAllowance: boolean
}

interface DeductionFormProps extends BusinessAppContextProps {
  initialData?: ExpenseRuleDeduction
  isEditing?: boolean
  onSave: (data: DeductionFormData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const DeductionForm: React.FC<DeductionFormProps> = ({
  initialData,
  isEditing = false,
  onSave,
  onCancel,
  loading = false,
  accessToken
}) => {
  // Feature flag check
  const isDevEnabled = useFeature('dev.enabled')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // React Hook Form setup
  const form = useForm<DeductionFormData>({
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
    // Validate required fields
    if (!data.deductionDay) {
      form.setError('deductionDay', { message: 'Deduction day is required' })
      return
    }
    if (!data.deductionOrder || data.deductionOrder < 1) {
      form.setError('deductionOrder', { message: 'Deduction order must be at least 1' })
      return
    }

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

  const handleCancel = () => {
    form.reset({
      deductBreakfast: false,
      deductLunch: false,
      deductDinner: false,
      deductionOrder: 1,
      overnightAllowance: false,
      deductionDay: DeductionDay.FIRST_DAY
    })
    setError(null)
    onCancel()
  }

  return (
    <div data-testid="deduction-form-container" className="gba:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Deduction Rule' : 'Create New Deduction Rule'}</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-6">
          {error && (
            <Alert variant="destructive" data-testid="deduction-form-error">
              <PiWarning className="gba:h-4 gba:w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} data-testid="deduction-form">
              {/* Deduction Day and Order */}
              <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4 gba:mb-6">
                <FormField
                  control={form.control}
                  name="deductionDay"
                  rules={{ required: 'Deduction day is required' }}
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
                  rules={{
                    required: 'Deduction order is required',
                    min: { value: 1, message: 'Deduction order must be at least 1' }
                  }}
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
              <Card className="gba:mb-6">
                <CardHeader>
                  <CardTitle className="gba:text-base">Meal Deductions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-6">
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
                </CardContent>
              </Card>

              {/* Additional Options */}
              <Card className="gba:mb-6">
                <CardHeader>
                  <CardTitle className="gba:text-base">Additional Options</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="gba:flex gba:gap-4 gba:mt-6">
                <Button
                  type="submit"
                  disabled={isSubmitting || loading}
                  data-testid="deduction-form-save-button"
                  className="gba:flex gba:items-center gba:gap-2"
                >
                  <PiFloppyDisk className="gba:h-4 gba:w-4" />
                  {isEditing ? 'Update Deduction Rule' : 'Create Deduction Rule'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  data-testid="deduction-form-cancel-button"
                  className="gba:flex gba:items-center gba:gap-2"
                >
                  <PiX className="gba:h-4 gba:w-4" />
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default DeductionForm
