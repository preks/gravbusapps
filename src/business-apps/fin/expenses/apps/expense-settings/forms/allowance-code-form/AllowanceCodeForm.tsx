import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFeature } from '@/common/hooks/useFeature'
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
  SelectValue
} from '@newwork/nw-design-system'
import { PiFloppyDisk, PiX, PiWarning } from 'react-icons/pi'
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
  initialData?: ExpenseRuleAllowanceCode
  isEditing?: boolean
  onSave: (data: AllowanceCodeFormData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const AllowanceCodeForm: React.FC<AllowanceCodeFormProps> = ({
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

  // Feature flag guard
  if (isDevEnabled === false) {
    return null
  }

  // Form state
  const [formData, setFormData] = useState<AllowanceCodeFormData>({
    code: '',
    amount: 0,
    codeOrder: 1,
    travelLocation: TravelLocation.BOTH
  })

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<{
    code?: string
    amount?: string
    codeOrder?: string
    travelLocation?: string
    allowanceType?: string
  }>({})

  // ✅ NEW: Hook for fetching fresh allowance code data
  const { fetchExpenseRuleAllowanceCodeById } = useGetExpenseRuleAllowanceCodeById({
    accessToken
  } as BusinessAppContextProps)

  // ✅ FIXED: Load fresh data when editing, use initial data when creating
  useEffect(() => {
    const loadData = async () => {
      if (isEditing && initialData?.id) {
        // ✅ NEW: For editing, fetch fresh data from the server
        try {
          const freshData = await fetchExpenseRuleAllowanceCodeById(initialData.id)
          if (freshData) {
            setFormData({
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
        } catch (error) {
          console.error('Failed to load fresh allowance code data:', error)
          // Continue with fallback to initial data
        }
      }

      // ✅ Fallback: Use initial data (for creating or if fresh fetch failed)
      if (initialData) {
        setFormData({
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
  }, [initialData?.id, isEditing, fetchExpenseRuleAllowanceCodeById])

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {}

    if (!formData.code?.trim()) {
      errors.code = 'Allowance code is required'
    } else if (formData.code.length > 10) {
      errors.code = 'Code cannot exceed 10 characters'
    }

    if (formData.amount === undefined || formData.amount === null) {
      errors.amount = 'Amount is required'
    }

    if (!formData.codeOrder || formData.codeOrder < 1) {
      errors.codeOrder = 'Display order must be at least 1'
    }

    if (!formData.travelLocation) {
      errors.travelLocation = 'Travel location is required'
    }

    if (!formData.allowanceType) {
      errors.allowanceType = 'Allowance type is required'
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
      setError(err instanceof Error ? err.message : 'Failed to save allowance code')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    // Reset form to initial state
    setFormData({
      code: '',
      amount: 0,
      codeOrder: 1,
      travelLocation: TravelLocation.BOTH
    })
    setValidationErrors({})
    setError(null)
    onCancel()
  }

  return (
    <div data-testid="allowance-code-form-container" className="gba:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Allowance Code' : 'Create New Allowance Code'}</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-6">
          {error && (
            <Alert variant="destructive" data-testid="allowance-code-form-error">
              <PiWarning className="gba:h-4 gba:w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} data-testid="allowance-code-form">
            {/* Code, Amount, and Order */}
            <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-3 gba:gap-4 gba:mb-6">
              <div className="gba:space-y-2">
                <Label htmlFor="code">
                  Allowance Code <span className="gba:text-destructive">*</span>
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, code: e.target.value }))
                    setValidationErrors(prev => ({ ...prev, code: undefined }))
                  }}
                  placeholder="Enter code (e.g., LHD)"
                  data-testid="allowance-code-form-code-input"
                  className={validationErrors.code ? 'gba:border-destructive' : ''}
                />
                {validationErrors.code && <p className="gba:text-sm gba:text-destructive">{validationErrors.code}</p>}
              </div>

              <div className="gba:space-y-2">
                <Label htmlFor="amount">
                  Amount <span className="gba:text-destructive">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.amount}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
                    setValidationErrors(prev => ({ ...prev, amount: undefined }))
                  }}
                  placeholder="Enter amount"
                  data-testid="allowance-code-form-amount-input"
                  className={validationErrors.amount ? 'gba:border-destructive' : ''}
                />
                {validationErrors.amount && (
                  <p className="gba:text-sm gba:text-destructive">{validationErrors.amount}</p>
                )}
              </div>

              <div className="gba:space-y-2">
                <Label htmlFor="codeOrder">
                  Display Order <span className="gba:text-destructive">*</span>
                </Label>
                <Input
                  id="codeOrder"
                  type="number"
                  min={1}
                  value={formData.codeOrder}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, codeOrder: parseInt(e.target.value) || 1 }))
                    setValidationErrors(prev => ({ ...prev, codeOrder: undefined }))
                  }}
                  placeholder="Enter order"
                  data-testid="allowance-code-form-order-input"
                  className={validationErrors.codeOrder ? 'gba:border-destructive' : ''}
                />
                {validationErrors.codeOrder && (
                  <p className="gba:text-sm gba:text-destructive">{validationErrors.codeOrder}</p>
                )}
              </div>
            </div>

            {/* Travel Location and Allowance Type */}
            <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4 gba:mb-6">
              <div className="gba:space-y-2">
                <Label htmlFor="travelLocation">
                  Travel Location <span className="gba:text-destructive">*</span>
                </Label>
                <Select
                  value={formData.travelLocation}
                  onValueChange={value => {
                    setFormData(prev => ({ ...prev, travelLocation: value as TravelLocation }))
                    setValidationErrors(prev => ({ ...prev, travelLocation: undefined }))
                  }}
                >
                  <SelectTrigger
                    id="travelLocation"
                    data-testid="allowance-code-form-travel-location-select"
                    className={validationErrors.travelLocation ? 'gba:border-destructive' : ''}
                  >
                    <SelectValue placeholder="Select travel location" />
                  </SelectTrigger>
                  <SelectContent>
                    {getTravelLocationOptions().map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.travelLocation && (
                  <p className="gba:text-sm gba:text-destructive">{validationErrors.travelLocation}</p>
                )}
              </div>

              <div className="gba:space-y-2">
                <Label htmlFor="allowanceType">
                  Allowance Type <span className="gba:text-destructive">*</span>
                </Label>
                <Select
                  value={formData.allowanceType}
                  onValueChange={value => {
                    setFormData(prev => ({ ...prev, allowanceType: value as AllowanceType }))
                    setValidationErrors(prev => ({ ...prev, allowanceType: undefined }))
                  }}
                >
                  <SelectTrigger
                    id="allowanceType"
                    data-testid="allowance-code-form-allowance-type-select"
                    className={validationErrors.allowanceType ? 'gba:border-destructive' : ''}
                  >
                    <SelectValue placeholder="Select allowance type" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllowanceTypeOptions().map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.allowanceType && (
                  <p className="gba:text-sm gba:text-destructive">{validationErrors.allowanceType}</p>
                )}
              </div>
            </div>

            {/* Calculation Formula */}
            <div className="gba:space-y-2 gba:mb-6">
              <Label htmlFor="calculation">Calculation Formula</Label>
              <Input
                id="calculation"
                value={formData.calculation || ''}
                onChange={e => setFormData(prev => ({ ...prev, calculation: e.target.value }))}
                placeholder="Enter calculation formula (optional)"
                data-testid="allowance-code-form-calculation-input"
              />
            </div>

            {/* Action Buttons */}
            <div className="gba:flex gba:gap-4 gba:mt-6">
              <Button
                type="submit"
                disabled={isSubmitting || loading}
                data-testid="allowance-code-form-save-button"
                className="gba:flex gba:items-center gba:gap-2"
              >
                <PiFloppyDisk className="gba:h-4 gba:w-4" />
                {isEditing ? 'Update Allowance Code' : 'Create Allowance Code'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                data-testid="allowance-code-form-cancel-button"
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

export default AllowanceCodeForm
