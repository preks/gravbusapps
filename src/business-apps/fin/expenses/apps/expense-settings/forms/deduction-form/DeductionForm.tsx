import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Label,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<DeductionFormData>({
    deductBreakfast: false,
    deductLunch: false,
    deductDinner: false,
    deductionOrder: 1,
    overnightAllowance: false,
    deductionDay: DeductionDay.FIRST_DAY
  })

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<{
    deductionDay?: string
    deductionOrder?: string
  }>({})

  // ✅ NEW: Hook for fetching fresh deduction data
  const { fetchExpenseRuleDeductionById } = useGetExpenseRuleDeductionById({ accessToken } as BusinessAppContextProps)

  // ✅ FIXED: Load fresh data when editing, use initial data when creating
  useEffect(() => {
    const loadData = async () => {
      if (isEditing && initialData?.id) {
        // ✅ NEW: For editing, fetch fresh data from the server
        try {
          const freshData = await fetchExpenseRuleDeductionById(initialData.id)
          if (freshData) {
            setFormData({
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
        } catch (error) {
          console.error('Failed to load fresh deduction data:', error)
          // Continue with fallback to initial data
        }
      }

      // ✅ Fallback: Use initial data (for creating or if fresh fetch failed)
      if (initialData) {
        setFormData({
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
  }, [initialData?.id, isEditing, fetchExpenseRuleDeductionById])

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {}

    if (!formData.deductionDay) {
      errors.deductionDay = 'Deduction day is required'
    }

    if (!formData.deductionOrder || formData.deductionOrder < 1) {
      errors.deductionOrder = 'Deduction order must be at least 1'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onSave(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save deduction')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    // Reset form to initial state
    setFormData({
      deductBreakfast: false,
      deductLunch: false,
      deductDinner: false,
      deductionOrder: 1,
      overnightAllowance: false,
      deductionDay: DeductionDay.FIRST_DAY
    })
    setValidationErrors({})
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

          <form onSubmit={handleSubmit} data-testid="deduction-form">
            {/* Deduction Day and Order */}
            <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4 gba:mb-6">
              <div className="gba:space-y-2">
                <Label htmlFor="deductionDay">
                  Deduction Day <span className="gba:text-destructive">*</span>
                </Label>
                <Select
                  value={formData.deductionDay}
                  onValueChange={value => {
                    setFormData(prev => ({ ...prev, deductionDay: value as DeductionDay }))
                    setValidationErrors(prev => ({ ...prev, deductionDay: undefined }))
                  }}
                >
                  <SelectTrigger
                    id="deductionDay"
                    data-testid="deduction-form-deduction-day-select"
                    className={validationErrors.deductionDay ? 'gba:border-destructive' : ''}
                  >
                    <SelectValue placeholder="Select deduction day" />
                  </SelectTrigger>
                  <SelectContent>
                    {getDeductionDayOptions().map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.deductionDay && (
                  <p className="gba:text-sm gba:text-destructive">{validationErrors.deductionDay}</p>
                )}
              </div>

              <div className="gba:space-y-2">
                <Label htmlFor="deductionOrder">
                  Deduction Order <span className="gba:text-destructive">*</span>
                </Label>
                <Input
                  id="deductionOrder"
                  type="number"
                  min={1}
                  value={formData.deductionOrder}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, deductionOrder: parseInt(e.target.value) || 1 }))
                    setValidationErrors(prev => ({ ...prev, deductionOrder: undefined }))
                  }}
                  placeholder="Enter order"
                  data-testid="deduction-form-order-input"
                  className={validationErrors.deductionOrder ? 'gba:border-destructive' : ''}
                />
                {validationErrors.deductionOrder && (
                  <p className="gba:text-sm gba:text-destructive">{validationErrors.deductionOrder}</p>
                )}
              </div>
            </div>

            {/* Meal Deductions */}
            <Card className="gba:mb-6">
              <CardHeader>
                <CardTitle className="gba:text-base">Meal Deductions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-3 gba:gap-6">
                  <div className="gba:flex gba:items-center gba:justify-between gba:space-x-2">
                    <Label htmlFor="deductBreakfast" className="gba:flex-1">
                      Deduct Breakfast
                    </Label>
                    <Switch
                      id="deductBreakfast"
                      checked={formData.deductBreakfast}
                      onCheckedChange={checked => setFormData(prev => ({ ...prev, deductBreakfast: checked }))}
                      data-testid="deduction-form-breakfast-switch"
                    />
                  </div>

                  <div className="gba:flex gba:items-center gba:justify-between gba:space-x-2">
                    <Label htmlFor="deductLunch" className="gba:flex-1">
                      Deduct Lunch
                    </Label>
                    <Switch
                      id="deductLunch"
                      checked={formData.deductLunch}
                      onCheckedChange={checked => setFormData(prev => ({ ...prev, deductLunch: checked }))}
                      data-testid="deduction-form-lunch-switch"
                    />
                  </div>

                  <div className="gba:flex gba:items-center gba:justify-between gba:space-x-2">
                    <Label htmlFor="deductDinner" className="gba:flex-1">
                      Deduct Dinner
                    </Label>
                    <Switch
                      id="deductDinner"
                      checked={formData.deductDinner}
                      onCheckedChange={checked => setFormData(prev => ({ ...prev, deductDinner: checked }))}
                      data-testid="deduction-form-dinner-switch"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Options */}
            <Card className="gba:mb-6">
              <CardHeader>
                <CardTitle className="gba:text-base">Additional Options</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="gba:flex gba:items-center gba:justify-between gba:space-x-2">
                  <Label htmlFor="overnightAllowance" className="gba:flex-1">
                    Overnight Allowance
                  </Label>
                  <Switch
                    id="overnightAllowance"
                    checked={formData.overnightAllowance}
                    onCheckedChange={checked => setFormData(prev => ({ ...prev, overnightAllowance: checked }))}
                    data-testid="deduction-form-overnight-switch"
                  />
                </div>
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
        </CardContent>
      </Card>
    </div>
  )
}

export default DeductionForm
