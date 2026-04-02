import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Checkbox
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { NavigationDTO } from '@/common/data/resources/types/navigation.types'
import { TranslatableField } from '@/components/translatable-field/TranslatableField'

interface NavigationDialogProps extends BusinessAppContextProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<NavigationDTO, 'id'> | Partial<NavigationDTO>) => Promise<void>
  mode: 'create' | 'update'
  initialData?: NavigationDTO
  'data-testid'?: string
}

export const NavigationDialog: React.FC<NavigationDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  mode,
  initialData,
  'data-testid': dataTestId = 'navigation-dialog'
}) => {
  const [formData, setFormData] = useState<Partial<NavigationDTO>>({
    code: '',
    name: '',
    url: '',
    roles: [],
    features: [],
    nameI18n: {},
    description_i18n: {},
    isSearchable: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setFormData({
        code: '',
        name: '',
        url: '',
        roles: [],
        features: [],
        nameI18n: {},
        description_i18n: {},
        isSearchable: false
      })
      setIsSubmitting(false)
    }
  }, [open])

  useEffect(() => {
    if (open && initialData && mode === 'update') {
      setFormData({
        code: initialData.code || '',
        name: initialData.name || '',
        url: initialData.url || '',
        roles: initialData.roles || [],
        features: initialData.features || [],
        nameI18n: initialData.nameI18n || {},
        description_i18n: initialData.description_i18n || {},
        isSearchable: initialData.isSearchable ?? false
      })
    }
  }, [open, initialData, mode])

  const handleChange = useCallback((field: keyof NavigationDTO, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!formData.code || !formData.name || !formData.url) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onOpenChange(false)
    } catch (error) {
      console.error('Error submitting navigation:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, onSubmit, onOpenChange])

  const isFormValid = formData.code && formData.name && formData.url

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-[600px]" data-testid={dataTestId}>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Navigation' : 'Update Navigation'}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          {/* Code */}
          <div className="gba:space-y-2">
            <Label htmlFor="code">Code *</Label>
            <Input
              id="code"
              value={formData.code || ''}
              onChange={e => handleChange('code', e.target.value)}
              placeholder="Enter code"
              data-testid={`${dataTestId}-code-input`}
            />
          </div>

          {/* Name */}
          <TranslatableField
            label="Name *"
            value={formData.name || ''}
            translations={formData.nameI18n || {}}
            onChange={value => handleChange('name', value)}
            onTranslationsChange={translations => handleChange('nameI18n', translations)}
            placeholder="Enter name"
            required
            data-testid={`${dataTestId}-name-input`}
          />

          {/* URL */}
          <div className="gba:space-y-2">
            <Label htmlFor="url">URL *</Label>
            <Input
              id="url"
              value={formData.url || ''}
              onChange={e => handleChange('url', e.target.value)}
              placeholder="Enter URL"
              data-testid={`${dataTestId}-url-input`}
            />
          </div>

          {/* Description */}
          <TranslatableField
            label="Description"
            value={formData.description_i18n ? Object.values(formData.description_i18n)[0] || '' : ''}
            translations={formData.description_i18n || {}}
            onChange={value => {
              const firstKey = Object.keys(formData.description_i18n || {})[0] || 'en-US'
              handleChange('description_i18n', { ...formData.description_i18n, [firstKey]: value })
            }}
            onTranslationsChange={translations => handleChange('description_i18n', translations)}
            placeholder="Enter description (optional)"
            variant="textarea"
            data-testid={`${dataTestId}-description-input`}
          />

          {/* Is Searchable */}
          <div className="gba:flex gba:items-center gba:space-x-2">
            <Checkbox
              id="isSearchable"
              checked={formData.isSearchable ?? false}
              onCheckedChange={checked => handleChange('isSearchable', !!checked)}
              data-testid={`${dataTestId}-isSearchable-checkbox`}
            />
            <Label htmlFor="isSearchable" className="gba:cursor-pointer">
              Searchable
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            data-testid={`${dataTestId}-submit-button`}
          >
            {(() => {
              if (isSubmitting) return 'Saving...'
              if (mode === 'create') return 'Create'
              return 'Update'
            })()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
