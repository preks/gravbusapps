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
  Textarea
} from '@newwork/nw-design-system'
import { BenefitProviderFormData, BenefitsTranslationFn } from '../types/benefitsMaintenanceTypes'
import { CatalogEntry } from '@/common/data/catalog'

interface BenefitProviderDialogProps {
  t: BenefitsTranslationFn
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: BenefitProviderFormData) => Promise<void>
  mode: 'create' | 'edit'
  initialData?: CatalogEntry
  parentBenefitType?: { id: string; value: string }
}

function getSubmitLabel(isSubmitting: boolean, mode: 'create' | 'edit', t: BenefitsTranslationFn): string {
  if (isSubmitting) {
    return mode === 'create' ? t('btn-creating') : t('btn-saving')
  }
  return mode === 'create' ? t('btn-create') : t('btn-save')
}

const EMPTY_FORM: BenefitProviderFormData = {
  code: '',
  value: '',
  description: '',
  parentEntryId: '',
  displayOrder: 0
}

const BenefitProviderDialog: React.FC<BenefitProviderDialogProps> = ({
  t,
  open,
  onOpenChange,
  onSubmit,
  mode,
  initialData,
  parentBenefitType
}) => {
  const [form, setForm] = useState<BenefitProviderFormData>(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM)
      setErrors({})
      setIsSubmitting(false)
      return
    }

    if (mode === 'edit' && initialData) {
      setForm({
        code: initialData.code || '',
        value: initialData.value || '',
        description: initialData.description || '',
        parentEntryId: initialData.parentEntryId || '',
        displayOrder: initialData.displayOrder ?? 0
      })
    } else if (parentBenefitType) {
      setForm({ ...EMPTY_FORM, parentEntryId: parentBenefitType.id })
    }
  }, [open, mode, initialData, parentBenefitType])

  const handleChange = useCallback(
    <K extends keyof BenefitProviderFormData>(key: K, val: BenefitProviderFormData[K]) => {
      setForm(prev => ({ ...prev, [key]: val }))
      setErrors(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    },
    []
  )

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.code.trim()) newErrors.code = t('validation-code-required')
    if (!form.value.trim()) newErrors.value = t('validation-name-required')
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = useCallback(async () => {
    if (!validate()) return
    setIsSubmitting(true)
    try {
      await onSubmit(form)
      onOpenChange(false)
    } catch {
      // error already handled by onSubmit
    } finally {
      setIsSubmitting(false)
    }
  }, [form, onSubmit, onOpenChange, t])

  const title = mode === 'create' ? t('dialog-create-provider-title') : t('dialog-edit-provider-title')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-lg" data-testid="BenefitProviderDialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4">
          {/* Parent benefit type (read-only info) */}
          {parentBenefitType && (
            <div className="gba:space-y-1">
              <Label>{t('field-parent-benefit')}</Label>
              <div className="gba:text-sm gba:px-3 gba:py-2 gba:border gba:rounded-md gba:bg-muted">
                {parentBenefitType.value}
              </div>
            </div>
          )}

          {/* Code */}
          <div className="gba:space-y-1">
            <Label htmlFor="prov-code">{t('field-code')}</Label>
            <Input
              id="prov-code"
              value={form.code}
              onChange={e => handleChange('code', e.target.value)}
              placeholder={t('field-code-placeholder')}
              disabled={mode === 'edit'}
              data-testid="BenefitProviderDialog-Code"
            />
            {errors.code && <p className="gba:text-xs gba:text-destructive">{errors.code}</p>}
          </div>

          {/* Name */}
          <div className="gba:space-y-1">
            <Label htmlFor="prov-name">{t('field-provider-name')}</Label>
            <Input
              id="prov-name"
              value={form.value}
              onChange={e => handleChange('value', e.target.value)}
              placeholder={t('field-provider-name-placeholder')}
              data-testid="BenefitProviderDialog-Name"
            />
            {errors.value && <p className="gba:text-xs gba:text-destructive">{errors.value}</p>}
          </div>

          {/* Description */}
          <div className="gba:space-y-1">
            <Label htmlFor="prov-desc">{t('field-description')}</Label>
            <Textarea
              id="prov-desc"
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              placeholder={t('field-description-placeholder')}
              rows={2}
              data-testid="BenefitProviderDialog-Description"
            />
          </div>

          {/* Display Order */}
          <div className="gba:space-y-1">
            <Label htmlFor="prov-order">{t('field-display-order')}</Label>
            <Input
              id="prov-order"
              type="number"
              value={form.displayOrder}
              onChange={e => handleChange('displayOrder', Number.parseInt(e.target.value, 10) || 0)}
              placeholder={t('field-display-order-placeholder')}
              data-testid="BenefitProviderDialog-DisplayOrder"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="BenefitProviderDialog-Cancel">
            {t('btn-cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} data-testid="BenefitProviderDialog-Submit">
            {getSubmitLabel(isSubmitting, mode, t)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BenefitProviderDialog
