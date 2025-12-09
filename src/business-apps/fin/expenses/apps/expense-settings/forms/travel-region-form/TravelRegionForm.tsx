import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Alert,
  AlertDescription,
  Toaster
} from '@newwork/nw-design-system'
import { toast } from 'sonner'
import { useFeature } from '@/common/hooks/useFeature'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface TravelRegionFormData {
  code: string
  value: string
  description?: string
  parentCatalogEntryId?: string // For associating with a Travel Region Set
}

interface TravelRegionFormProps extends BusinessAppContextProps {
  open: boolean
  onClose: () => void
  onSave: (data: TravelRegionFormData) => void
  travelRegionSetId?: string // The parent Travel Region Set ID
  travelRegionSetName?: string // For display purposes
  prefixDataTestId?: string
}

const TravelRegionForm: React.FC<TravelRegionFormProps> = ({
  accessToken,
  open,
  onClose,
  onSave,
  travelRegionSetId,
  travelRegionSetName,
  prefixDataTestId = ''
}) => {
  // Feature flag check
  const isDevEnabled = useFeature('dev.enabled')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<TravelRegionFormData>({
    code: '',
    value: '',
    description: '',
    parentCatalogEntryId: travelRegionSetId
  })

  // Feature flag guard
  if (isDevEnabled === false) {
    return null
  }

  const catalogClient = useCatalogManagerClient(accessToken)

  // Reset form data when modal opens or travelRegionSetId changes
  useEffect(() => {
    if (open) {
      // Reset form to use the current travelRegionSetId
      setFormData({
        code: '',
        value: '',
        description: '',
        parentCatalogEntryId: travelRegionSetId
      })
      // Clear any previous errors
      setError(null)
    }
  }, [open, travelRegionSetId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.code.trim() || !formData.value.trim()) {
      setError('Code and Name are required')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Create the catalog entry for TravelRegion
      const catalogEntry = {
        code: formData.code.trim(),
        value: formData.value.trim(),
        description: formData.description?.trim() || '',
        parentEntryId: travelRegionSetId, // Use parentEntryId instead of parentCatalogEntryId
        translations: [
          {
            localeCode: 'en',
            value: formData.value.trim()
          }
        ]
      }

      console.log('🚀 Creating Travel Region:', catalogEntry)

      await catalogClient.createCatalogEntry('TravelRegion', 'v1', catalogEntry)

      toast.success('Travel Region created successfully')
      onSave({ ...formData, parentCatalogEntryId: travelRegionSetId })
      handleClose()
    } catch (err) {
      console.error('❌ Error creating Travel Region:', err)
      setError(err instanceof Error ? err.message : 'Failed to create Travel Region')
      toast.error('Failed to create Travel Region')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      code: '',
      value: '',
      description: '',
      parentCatalogEntryId: travelRegionSetId
    })
    setError(null)
    onClose()
  }

  const handleInputChange = (field: keyof TravelRegionFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError(null) // Clear error when user starts typing
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent data-testid={`${prefixDataTestId}-travel-region-form`} className="gba:max-w-2xl gba:max-h-[85vh]">
        <DialogHeader data-testid={`${prefixDataTestId}-dialog-header`}>
          <DialogTitle data-testid={`${prefixDataTestId}-dialog-title`}>
            {getTranslationFromI18nKeyAndLabel('expense-settings:create_travel_region', 'Create Travel Region')}
          </DialogTitle>
          {travelRegionSetName && (
            <p className="gba:text-sm gba:text-gray-600 gba:mt-1" data-testid={`${prefixDataTestId}-parent-set-info`}>
              Adding to: <span className="gba:font-medium">{travelRegionSetName}</span>
            </p>
          )}
        </DialogHeader>

        <div
          className="gba:overflow-y-auto gba:max-h-[calc(85vh-120px)]"
          data-testid={`${prefixDataTestId}-form-content`}
        >
          {error && (
            <Alert className="gba:mb-4" data-testid={`${prefixDataTestId}-error-alert`}>
              <AlertDescription data-testid={`${prefixDataTestId}-error-message`}>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="gba:space-y-3 gba:px-1" data-testid={`${prefixDataTestId}-form`}>
            <div className="gba:space-y-2" data-testid={`${prefixDataTestId}-code-field`}>
              <label
                className="gba:text-sm gba:font-medium gba:text-gray-700"
                htmlFor={`${prefixDataTestId}-code-input`}
                data-testid={`${prefixDataTestId}-code-label`}
              >
                {getTranslationFromI18nKeyAndLabel('expense-settings:code', 'Code')}
                <span className="gba:text-red-500 gba:ml-1">*</span>
              </label>
              <Input
                id={`${prefixDataTestId}-code-input`}
                value={formData.code}
                onChange={e => handleInputChange('code', e.target.value)}
                placeholder="Enter unique code (e.g., EU_WEST)"
                data-testid={`${prefixDataTestId}-code-input`}
                disabled={isSubmitting}
                className="gba:h-9 gba:text-sm"
                required
              />
            </div>

            <div className="gba:space-y-2" data-testid={`${prefixDataTestId}-value-field`}>
              <label
                className="gba:text-sm gba:font-medium gba:text-gray-700"
                htmlFor={`${prefixDataTestId}-value-input`}
                data-testid={`${prefixDataTestId}-value-label`}
              >
                {getTranslationFromI18nKeyAndLabel('expense-settings:name', 'Name')}
                <span className="gba:text-red-500 gba:ml-1">*</span>
              </label>
              <Input
                id={`${prefixDataTestId}-value-input`}
                value={formData.value}
                onChange={e => handleInputChange('value', e.target.value)}
                placeholder="Enter display name (e.g., Western Europe)"
                data-testid={`${prefixDataTestId}-value-input`}
                disabled={isSubmitting}
                className="gba:h-9 gba:text-sm"
                required
              />
            </div>

            <div className="gba:space-y-2" data-testid={`${prefixDataTestId}-description-field`}>
              <label
                className="gba:text-sm gba:font-medium gba:text-gray-700"
                htmlFor={`${prefixDataTestId}-description-input`}
                data-testid={`${prefixDataTestId}-description-label`}
              >
                {getTranslationFromI18nKeyAndLabel('expense-settings:description', 'Description')}
              </label>
              <Input
                id={`${prefixDataTestId}-description-input`}
                value={formData.description}
                onChange={e => handleInputChange('description', e.target.value)}
                placeholder="Enter optional description"
                data-testid={`${prefixDataTestId}-description-input`}
                disabled={isSubmitting}
                className="gba:h-9 gba:text-sm"
              />
            </div>

            <div
              className="gba:flex gba:justify-end gba:gap-2 gba:pt-4"
              data-testid={`${prefixDataTestId}-button-group`}
            >
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                size="sm"
                className="gba:h-9 gba:text-sm"
                data-testid={`${prefixDataTestId}-cancel-button`}
              >
                {getTranslationFromI18nKeyAndLabel('expense-settings:cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.code.trim() || !formData.value.trim()}
                size="sm"
                className="gba:h-9 gba:text-sm"
                data-testid={`${prefixDataTestId}-save-button`}
              >
                {isSubmitting
                  ? getTranslationFromI18nKeyAndLabel('expense-settings:creating', 'Creating...')
                  : getTranslationFromI18nKeyAndLabel('expense-settings:create', 'Create')}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
      <Toaster />
    </Dialog>
  )
}

export default TravelRegionForm
