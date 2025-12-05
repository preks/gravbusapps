import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
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
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@newwork/nw-design-system'
import { PiWarning } from 'react-icons/pi'
import {
  TravelLocation,
  AllowanceType,
  getTravelLocationOptions,
  getAllowanceTypeOptions,
  convertAbroadToTravelLocation
} from '../../types/ExpenseEnums'
import { ExpenseRuleAllowanceCode } from '../../types/ExpenseRuleTypes'
import { useGetExpenseRuleAllowanceCodeById } from '../../queries/ExpenseRuleQueries'

export interface AllowanceCodeFormData {
  id?: string
  code: string
  amount: number
  travelLocation?: TravelLocation
  allowanceType?: AllowanceType
  calculation?: string
  codeOrder: number
}

interface AllowanceCodeFormProps extends BusinessAppContextProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: ExpenseRuleAllowanceCode
  isEditing?: boolean
  onSave: (data: AllowanceCodeFormData) => Promise<void>
  loading?: boolean
}

const AllowanceCodeForm: React.FC<AllowanceCodeFormProps> = ({
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

  // React Hook Form setup
  const form = useForm<AllowanceCodeFormData>({
    defaultValues: {
      code: '',
      amount: 0,
      codeOrder: 1,
      travelLocation: TravelLocation.BOTH
    }
  })

  // Feature flag guard
  if (isDevEnabled === false) {
    return null
  }

  // ✅ Hook for fetching fresh allowance code data
  const { fetchExpenseRuleAllowanceCodeById } = useGetExpenseRuleAllowanceCodeById({
    accessToken
  } as BusinessAppContextProps)

  // ✅ Load fresh data when editing, use initial data when creating
  useEffect(() => {
    const loadData = async () => {
      if (isEditing && initialData?.id) {
        // For editing, fetch fresh data from the server
        try {
          const freshData = await fetchExpenseRuleAllowanceCodeById(initialData.id)
          if (freshData) {
            form.reset({
              id: freshData.id,
              code: freshData.code,
              amount: freshData.amount,
              travelLocation: convertAbroadToTravelLocation(freshData.abroad),
              allowanceType: freshData.allowanceType,
              calculation: freshData.calculation,
              codeOrder: freshData.codeOrder || 1
            })
            return
          }
        } catch (err) {
          console.error('Failed to load fresh allowance code data:', err)
          // Continue with fallback to initial data
        }
      }

      // Fallback: Use initial data (for creating or if fresh fetch failed)
      if (initialData) {
        form.reset({
          id: initialData.id,
          code: initialData.code,
          amount: initialData.amount,
          travelLocation: convertAbroadToTravelLocation(initialData.abroad),
          allowanceType: initialData.allowanceType as AllowanceType,
          calculation: initialData.calculation,
          codeOrder: initialData.codeOrder || 1
        })
      }
    }

    loadData()
  }, [initialData?.id, isEditing, fetchExpenseRuleAllowanceCodeById, form])

  const handleSubmit = async (data: AllowanceCodeFormData) => {
    // Validate required fields
    let hasErrors = false

    if (!data.code?.trim()) {
      form.setError('code', { message: 'Allowance code is required' })
      hasErrors = true
    } else if (data.code.length > 10) {
      form.setError('code', { message: 'Code cannot exceed 10 characters' })
      hasErrors = true
    }

    if (data.amount === undefined || data.amount === null) {
      form.setError('amount', { message: 'Amount is required' })
      hasErrors = true
    }

    if (!data.codeOrder || data.codeOrder < 1) {
      form.setError('codeOrder', { message: 'Display order must be at least 1' })
      hasErrors = true
    }

    if (!data.travelLocation) {
      form.setError('travelLocation', { message: 'Travel location is required' })
      hasErrors = true
    }

    if (!data.allowanceType) {
      form.setError('allowanceType', { message: 'Allowance type is required' })
      hasErrors = true
    }

    if (hasErrors) return

    setIsSubmitting(true)
    setError(null)

    try {
      await onSave(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save allowance code')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    form.reset({
      code: '',
      amount: 0,
      codeOrder: 1,
      travelLocation: TravelLocation.BOTH
    })
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-2xl" data-testid="allowance-code-form-dialog">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Allowance Code' : 'Create New Allowance Code'}</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" data-testid="allowance-code-form-error">
            <PiWarning className="gba:h-4 gba:w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} data-testid="allowance-code-form">
            <div className="gba:space-y-6">
              {/* Code, Amount, and Order */}
              <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  rules={{
                    required: 'Allowance code is required',
                    maxLength: { value: 10, message: 'Code cannot exceed 10 characters' }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Allowance Code <span className="gba:text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter code (e.g., LHD)"
                          data-testid="allowance-code-form-code-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  rules={{ required: 'Amount is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Amount <span className="gba:text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                          placeholder="Enter amount"
                          data-testid="allowance-code-form-amount-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="codeOrder"
                  rules={{
                    required: 'Display order is required',
                    min: { value: 1, message: 'Display order must be at least 1' }
                  }}
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
                          data-testid="allowance-code-form-order-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Travel Location and Allowance Type */}
              <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                <FormField
                  control={form.control}
                  name="travelLocation"
                  rules={{ required: 'Travel location is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Travel Location <span className="gba:text-destructive">*</span>
                      </FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="allowance-code-form-travel-location-select">
                            <SelectValue placeholder="Select travel location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getTravelLocationOptions().map(option => (
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
                  name="allowanceType"
                  rules={{ required: 'Allowance type is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Allowance Type <span className="gba:text-destructive">*</span>
                      </FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="allowance-code-form-allowance-type-select">
                            <SelectValue placeholder="Select allowance type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {getAllowanceTypeOptions().map(option => (
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

              {/* Calculation Formula */}
              <FormField
                control={form.control}
                name="calculation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calculation Formula</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        placeholder="Enter calculation formula (optional)"
                        data-testid="allowance-code-form-calculation-input"
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
                data-testid="allowance-code-form-cancel-button"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || loading} data-testid="allowance-code-form-save-button">
                {isEditing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default AllowanceCodeForm
