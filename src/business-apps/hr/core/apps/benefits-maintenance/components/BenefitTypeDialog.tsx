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
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import {
  BenefitTypeFormData,
  BenefitObjectValue,
  LegalEntityOption,
  BenefitTypeEntry,
  BenefitsTranslationFn
} from '../types/benefitsMaintenanceTypes'
import { BENEFIT_PERIODS, BenefitPeriod } from '../constants/benefitsMaintenanceConstants'
import BenefitIconPicker from './BenefitIconPicker'

function resolveLegalEntityId(entry: BenefitTypeEntry | undefined, legalEntities: LegalEntityOption[]): string {
  if (!entry) return ''
  const ov = entry.parsedObjectValue
  if (ov?.legalEntityId) {
    return ov.legalEntityId
  }
  if (entry.parentEntryId) {
    const byRef = legalEntities.find(
      le => le.countryRef === entry.parentEntryId || entry.parentEntryId!.endsWith(`:${le.countryCode}`)
    )
    if (byRef) return byRef.id
  }
  return ''
}

interface BenefitTypeDialogProps {
  t: BenefitsTranslationFn
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: BenefitTypeFormData) => Promise<void>
  mode: 'create' | 'edit'
  initialData?: BenefitTypeEntry
  legalEntities: LegalEntityOption[]
  selectedLegalEntityId: string | null
}

function getSubmitLabel(isSubmitting: boolean, mode: 'create' | 'edit', t: BenefitsTranslationFn): string {
  if (isSubmitting) {
    return mode === 'create' ? t('btn-creating') : t('btn-saving')
  }
  return mode === 'create' ? t('btn-create') : t('btn-save')
}

const EMPTY_FORM: BenefitTypeFormData = {
  code: '',
  value: '',
  description: '',
  parentEntryId: '',
  displayOrder: 0,
  objectValue: {
    value: '',
    period: 'monthly',
    currency: '',
    groups: ['all-employees'],
    icon: 'Heart'
  }
}

const BenefitTypeDialog: React.FC<BenefitTypeDialogProps> = ({
  t,
  open,
  onOpenChange,
  onSubmit,
  mode,
  initialData,
  legalEntities,
  selectedLegalEntityId
}) => {
  const [form, setForm] = useState<BenefitTypeFormData>(EMPTY_FORM)
  const [selectedEntityId, setSelectedEntityId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM)
      setSelectedEntityId('')
      setErrors({})
      setIsSubmitting(false)
      return
    }

    if (mode === 'edit' && initialData) {
      const resolvedEntityId = resolveLegalEntityId(initialData, legalEntities)
      const entityId = resolvedEntityId || initialData.parsedObjectValue?.legalEntityId || ''
      const entity = legalEntities.find(le => le.id === entityId)
      setSelectedEntityId(prev => entityId || prev)
      setForm({
        code: initialData.code || '',
        value: initialData.value || '',
        description: initialData.description || '',
        parentEntryId: initialData.parentEntryId || '',
        displayOrder: initialData.displayOrder ?? 0,
        objectValue: {
          ...(initialData.parsedObjectValue || EMPTY_FORM.objectValue),
          legalEntityId: entityId || initialData.parsedObjectValue?.legalEntityId || '',
          legalEntityName: entity?.name || initialData.parsedObjectValue?.legalEntityName,
          countryRef: entity?.countryRef || initialData.parsedObjectValue?.countryRef || initialData.parentEntryId || ''
        }
      })
    } else {
      const preselectedEntity = selectedLegalEntityId
        ? legalEntities.find(le => le.id === selectedLegalEntityId)
        : undefined
      setSelectedEntityId(selectedLegalEntityId || '')
      setForm({
        ...EMPTY_FORM,
        parentEntryId: preselectedEntity?.countryRef || '',
        objectValue: {
          ...EMPTY_FORM.objectValue,
          currency: preselectedEntity?.currency || EMPTY_FORM.objectValue.currency,
          legalEntityId: preselectedEntity?.id,
          legalEntityName: preselectedEntity?.name,
          countryRef: preselectedEntity?.countryRef
        }
      })
    }
  }, [open, mode, initialData, selectedLegalEntityId, legalEntities])

  const handleChange = useCallback(<K extends keyof BenefitTypeFormData>(key: K, val: BenefitTypeFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: val }))
    setErrors(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const handleObjectValueChange = useCallback(
    <K extends keyof BenefitObjectValue>(key: K, val: BenefitObjectValue[K]) => {
      setForm(prev => ({
        ...prev,
        objectValue: { ...prev.objectValue, [key]: val }
      }))
    },
    []
  )

  const handleLegalEntityChange = useCallback(
    (entityId: string) => {
      const entity = legalEntities.find(le => le.id === entityId)
      setSelectedEntityId(entityId)
      setForm(prev => ({
        ...prev,
        parentEntryId: entity?.countryRef || '',
        objectValue: {
          ...prev.objectValue,
          currency: entity?.currency || '',
          legalEntityId: entity?.id,
          legalEntityName: entity?.name,
          countryRef: entity?.countryRef
        }
      }))
      setErrors(prev => {
        const next = { ...prev }
        delete next.legalEntity
        delete next.currency
        return next
      })
    },
    [legalEntities]
  )

  const handleVisibilityChange = useCallback((visibility: string) => {
    const groups: BenefitObjectValue['groups'] = visibility === 'public' ? ['all-employees'] : ['all-hr-backoffice']
    setForm(prev => ({
      ...prev,
      objectValue: { ...prev.objectValue, groups }
    }))
  }, [])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.code.trim()) newErrors.code = t('validation-code-required')
    if (!form.value.trim()) newErrors.value = t('validation-name-required')
    if (!selectedEntityId) newErrors.legalEntity = t('validation-legal-entity-required')
    if (!form.objectValue.value?.trim()) newErrors.benefitValue = t('validation-value-required')
    if (selectedEntityId && !form.objectValue.currency) newErrors.currency = t('validation-currency-missing')
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
  }, [form, onSubmit, onOpenChange, selectedEntityId, t])

  const title = mode === 'create' ? t('dialog-create-title') : t('dialog-edit-title')
  const hasSelectedEntityInOptions = legalEntities.some(le => le.id === selectedEntityId)
  const selectedEntityFallbackLabel = form.objectValue.legalEntityName || selectedEntityId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-2xl" data-testid="BenefitTypeDialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:max-h-96 gba:overflow-y-auto gba:pr-1">
          {/* Row 1: Legal Entity + Currency */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-3">
            <div className="gba:space-y-1">
              <Label>
                {t('field-legal-entity')} <span className="gba:text-destructive">*</span>
              </Label>
              <Select value={selectedEntityId || ''} onValueChange={handleLegalEntityChange}>
                <SelectTrigger data-testid="BenefitTypeDialog-LegalEntity">
                  <SelectValue placeholder={t('field-legal-entity-placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {selectedEntityId && !hasSelectedEntityInOptions ? (
                    <SelectItem key={selectedEntityId} value={selectedEntityId}>
                      {selectedEntityFallbackLabel}
                    </SelectItem>
                  ) : null}
                  {legalEntities.map(le => (
                    <SelectItem key={le.id} value={le.id}>
                      {le.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.legalEntity && <p className="gba:text-xs gba:text-destructive">{errors.legalEntity}</p>}
            </div>
            <div className="gba:space-y-1">
              <Label htmlFor="bt-cur">{t('field-currency')}</Label>
              <Input
                id="bt-cur"
                value={form.objectValue.currency || ''}
                readOnly
                className="gba:bg-muted/50"
                placeholder={selectedEntityId ? '' : '-'}
                data-testid="BenefitTypeDialog-Currency"
              />
              {selectedEntityId && !form.objectValue.currency ? (
                <p className="gba:text-xs gba:text-destructive">{t('validation-currency-missing')}</p>
              ) : (
                <p className="gba:text-xs gba:text-muted-foreground">{t('field-currency-hint')}</p>
              )}
            </div>
          </div>

          {/* Row 2: Code + Icon */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-3">
            <div className="gba:space-y-1">
              <Label htmlFor="bt-code">
                {t('field-code')} <span className="gba:text-destructive">*</span>
              </Label>
              <Input
                id="bt-code"
                value={form.code}
                onChange={e => handleChange('code', e.target.value)}
                placeholder={t('field-code-placeholder')}
                disabled={mode === 'edit'}
                data-testid="BenefitTypeDialog-Code"
              />
              {errors.code && <p className="gba:text-xs gba:text-destructive">{errors.code}</p>}
            </div>
            <div className="gba:space-y-1">
              <Label>{t('field-icon')}</Label>
              <BenefitIconPicker
                value={form.objectValue.icon}
                onChange={val => handleObjectValueChange('icon', val)}
                t={t}
              />
            </div>
          </div>

          {/* Row 3: Name */}
          <div className="gba:space-y-1">
            <Label htmlFor="bt-name">
              {t('field-name')} <span className="gba:text-destructive">*</span>
            </Label>
            <Input
              id="bt-name"
              value={form.value}
              onChange={e => handleChange('value', e.target.value)}
              placeholder={t('field-name-placeholder')}
              data-testid="BenefitTypeDialog-Name"
            />
            {errors.value && <p className="gba:text-xs gba:text-destructive">{errors.value}</p>}
          </div>

          {/* Row 4: Description */}
          <div className="gba:space-y-1">
            <Label htmlFor="bt-desc">{t('field-description')}</Label>
            <Textarea
              id="bt-desc"
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              placeholder={t('field-description-placeholder')}
              rows={3}
              data-testid="BenefitTypeDialog-Description"
            />
          </div>

          {/* Row 4: Value + Employee Monthly Contribution */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-3">
            <div className="gba:space-y-1">
              <Label htmlFor="bt-val">
                {t('field-value')} <span className="gba:text-destructive">*</span>
              </Label>
              <Input
                id="bt-val"
                value={form.objectValue.value || ''}
                onChange={e => {
                  handleObjectValueChange('value', e.target.value)
                  setErrors(prev => {
                    const next = { ...prev }
                    delete next.benefitValue
                    return next
                  })
                }}
                placeholder={t('field-value-placeholder')}
                data-testid="BenefitTypeDialog-Value"
              />
              {errors.benefitValue && <p className="gba:text-xs gba:text-destructive">{errors.benefitValue}</p>}
            </div>
            <div className="gba:space-y-1">
              <Label htmlFor="bt-emp-contrib">{t('field-employee-monthly-contribution')}</Label>
              <Input
                id="bt-emp-contrib"
                value={form.objectValue.employeeMonthlyContribution || ''}
                onChange={e => handleObjectValueChange('employeeMonthlyContribution', e.target.value || undefined)}
                placeholder={t('field-employee-monthly-contribution-placeholder')}
                data-testid="BenefitTypeDialog-EmployeeContribution"
              />
            </div>
          </div>

          {/* Row 5: Period + Visibility */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-3">
            <div className="gba:space-y-1">
              <Label>{t('field-period')}</Label>
              <Select
                value={form.objectValue.period || 'monthly'}
                onValueChange={val => handleObjectValueChange('period', val as BenefitPeriod)}
              >
                <SelectTrigger data-testid="BenefitTypeDialog-Period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BENEFIT_PERIODS.map(p => (
                    <SelectItem key={p} value={p}>
                      {t(`period-${p}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="gba:space-y-1">
              <Label>{t('field-visibility')}</Label>
              <Select
                value={form.objectValue.groups?.includes('all-employees') ? 'public' : 'private'}
                onValueChange={handleVisibilityChange}
              >
                <SelectTrigger data-testid="BenefitTypeDialog-Visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">{t('visibility-public')}</SelectItem>
                  <SelectItem value="private">{t('visibility-private')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="gba:text-xs gba:text-muted-foreground">{t('field-visibility-hint')}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="BenefitTypeDialog-Cancel">
            {t('btn-cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} data-testid="BenefitTypeDialog-Submit">
            {getSubmitLabel(isSubmitting, mode, t)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BenefitTypeDialog
