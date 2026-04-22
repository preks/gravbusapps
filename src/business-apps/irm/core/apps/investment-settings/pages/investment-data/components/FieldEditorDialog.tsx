import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@newwork/nw-design-system'
import { CaretDownIcon } from '@phosphor-icons/react'
import type { FieldDefinition, RequiredSubtypeKey } from '../types'
import {
  buildCustomFieldProperty,
  getAdditionalPropertiesParentPrefixForRequiredSubtype,
  sanitizeCustomAdditionalPropertyKey
} from '../utils/investmentFormFieldRegistry'

interface FieldEditorDialogProps {
  field: FieldDefinition
  onSave: (field: FieldDefinition) => void
  onCancel: () => void
  prefixDataTestId?: string
  /** When true, property and type cannot be changed (catalog-picked field). */
  lockPropertyAndType?: boolean
  /** Builds `*.additionalProperties.*` when the custom-attribute option is enabled. */
  requiredSubtypeKey: RequiredSubtypeKey
  /** When true, the dialog is in "Add" mode (changes title/CTA). */
  isNewField?: boolean
}

const DISPLAY_ORDER_PATTERN = /^\d+\.\d+$/

const FIELD_TYPES = [
  { value: 'TEXT', label: 'Text' },
  { value: 'TEXTAREA', label: 'Text Area' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'AMOUNT', label: 'Amount' },
  { value: 'PERCENTAGE', label: 'Percentage' },
  { value: 'DATE', label: 'Date' },
  { value: 'DATETIME', label: 'Date & Time' },
  { value: 'BOOLEAN', label: 'Boolean (Yes/No)' },
  { value: 'SELECT', label: 'Select (Dropdown)' }
]

function parseAdditionalPropertyKey(property: string): string {
  const m = property.match(/\.additionalProperties\.(.+)$/)
  return m ? m[1] : ''
}

export const FieldEditorDialog: React.FC<FieldEditorDialogProps> = ({
  field,
  onSave,
  onCancel,
  prefixDataTestId = 'field-editor-dialog',
  lockPropertyAndType = false,
  requiredSubtypeKey,
  isNewField = false
}) => {
  const [formData, setFormData] = useState<FieldDefinition>(field)
  const [additionalKey, setAdditionalKey] = useState(() => parseAdditionalPropertyKey(field.property))
  const [errors, setErrors] = useState<{ label?: string; property?: string; displayOrder?: string }>({})
  // Remember the user's last non-custom property so toggling off restores it.
  const lastStandardPropertyRef = useRef<string>(parseAdditionalPropertyKey(field.property) ? '' : field.property || '')

  const syncCustomPropertyPath = useCallback(
    (keyDraft: string, labelDraft: string) => {
      const key = sanitizeCustomAdditionalPropertyKey(keyDraft.trim() || labelDraft.trim() || 'custom')
      return buildCustomFieldProperty(key, { requiredSubtypeKey })
    },
    [requiredSubtypeKey]
  )

  useEffect(() => {
    const parsedKey = parseAdditionalPropertyKey(field.property)
    setFormData({ ...field })
    setAdditionalKey(parsedKey)
    lastStandardPropertyRef.current = parsedKey ? '' : field.property || ''
    setErrors({})
  }, [field])

  useEffect(() => {
    if (!formData.isCustom || lockPropertyAndType) return
    const next = syncCustomPropertyPath(additionalKey, formData.label)
    setFormData(prev => (prev.property === next ? prev : { ...prev, property: next }))
  }, [formData.isCustom, formData.label, additionalKey, lockPropertyAndType, syncCustomPropertyPath])

  const handleChange = <K extends keyof FieldDefinition>(key: K, value: FieldDefinition[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const validate = (data: FieldDefinition): typeof errors => {
    const next: typeof errors = {}
    if (!data.label.trim()) next.label = 'Label is required.'
    if (!data.property.trim()) next.property = 'Property path is required.'
    if (!DISPLAY_ORDER_PATTERN.test(data.displayOrder)) next.displayOrder = 'Use the X.Y format (e.g. 1.1, 2.3).'
    return next
  }

  const handleSave = () => {
    const finalProperty =
      formData.isCustom && !lockPropertyAndType
        ? syncCustomPropertyPath(additionalKey, formData.label)
        : formData.property
    const candidate: FieldDefinition = { ...formData, property: finalProperty }
    const nextErrors = validate(candidate)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    if (formData.isCustom && !lockPropertyAndType) {
      onSave({ ...candidate, isCustom: true })
      return
    }
    const saved: FieldDefinition = { ...candidate }
    delete saved.isCustom
    onSave(saved)
  }

  const customPropertyPreview = useMemo(() => {
    if (!formData.isCustom || lockPropertyAndType) return ''
    return syncCustomPropertyPath(additionalKey, formData.label)
  }, [additionalKey, formData.isCustom, formData.label, lockPropertyAndType, syncCustomPropertyPath])

  const sanitizedKeyPreview = useMemo(
    () => sanitizeCustomAdditionalPropertyKey(additionalKey.trim() || formData.label.trim() || 'custom'),
    [additionalKey, formData.label]
  )

  const layoutPlaceholder = useMemo(() => {
    const base = getAdditionalPropertiesParentPrefixForRequiredSubtype(requiredSubtypeKey).split('.')[0]
    return `e.g., investment.name or ${base}.marketValue`
  }, [requiredSubtypeKey])

  const isCatalogOrRefType = formData.type.startsWith('CATALOG_') || formData.type.startsWith('REF_')
  const typeInPresetList = FIELD_TYPES.some(t => t.value === formData.type)
  const showAdvancedProperty = Boolean(formData.isCustom) && !lockPropertyAndType

  const propertyEditor = showAdvancedProperty ? (
    <div className="gba:space-y-2">
      <Label>Property path</Label>
      <p
        className="gba:text-sm gba:font-mono gba:rounded-md gba:border gba:border-input gba:p-2 gba:bg-muted/30"
        data-testid={`${prefixDataTestId}-property-preview`}
      >
        {customPropertyPreview || formData.property}
      </p>
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gba:px-0 gba:h-auto"
            data-testid={`${prefixDataTestId}-advanced-trigger`}
          >
            <CaretDownIcon className="gba:w-4 gba:h-4 gba:mr-1" />
            Advanced path editing
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="gba:pt-2">
          <Input
            value={formData.property}
            onChange={e => handleChange('property', e.target.value)}
            data-testid={`${prefixDataTestId}-property-advanced-input`}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  ) : (
    <div className="gba:space-y-2">
      <Label htmlFor="property">Property Path</Label>
      <Input
        id="property"
        value={formData.property}
        onChange={e => handleChange('property', e.target.value)}
        placeholder={layoutPlaceholder}
        data-testid={`${prefixDataTestId}-property-input`}
        disabled={lockPropertyAndType}
        aria-invalid={Boolean(errors.property) || undefined}
      />
      {errors.property ? (
        <p className="gba:text-xs gba:text-destructive" data-testid={`${prefixDataTestId}-property-error`}>
          {errors.property}
        </p>
      ) : (
        <p className="gba:text-xs gba:text-muted-foreground">Path to the data field in the investment object</p>
      )}
    </div>
  )

  return (
    <Dialog open onOpenChange={open => !open && onCancel()}>
      <DialogContent data-testid={prefixDataTestId} className="gba:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isNewField ? 'Add Field' : 'Edit Field'}</DialogTitle>
          <DialogDescription>
            Configure the label, property path, layout position, and validation for this field.
          </DialogDescription>
        </DialogHeader>
        <div className="gba:space-y-4 gba:py-4">
          <div className="gba:space-y-2">
            <Label htmlFor="label">Field Label</Label>
            <Input
              id="label"
              value={formData.label}
              onChange={e => handleChange('label', e.target.value)}
              placeholder="Enter field label"
              data-testid={`${prefixDataTestId}-label-input`}
              aria-invalid={Boolean(errors.label) || undefined}
            />
            {errors.label && (
              <p className="gba:text-xs gba:text-destructive" data-testid={`${prefixDataTestId}-label-error`}>
                {errors.label}
              </p>
            )}
          </div>

          {!lockPropertyAndType && (
            <div className="gba:space-y-3 gba:rounded-md gba:border gba:border-input gba:p-3">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Checkbox
                  id="custom-additional"
                  checked={Boolean(formData.isCustom)}
                  onCheckedChange={checked => {
                    if (checked === true) {
                      if (!formData.isCustom) {
                        lastStandardPropertyRef.current = formData.property
                      }
                      const key = sanitizeCustomAdditionalPropertyKey(
                        additionalKey.trim() || formData.label.trim() || 'custom'
                      )
                      setAdditionalKey(key)
                      setFormData(prev => ({
                        ...prev,
                        isCustom: true,
                        property: buildCustomFieldProperty(key, { requiredSubtypeKey })
                      }))
                    } else {
                      setAdditionalKey('')
                      const restored = lastStandardPropertyRef.current || 'investment.newField'
                      setFormData(prev => ({
                        ...prev,
                        isCustom: undefined,
                        property: restored
                      }))
                    }
                  }}
                  data-testid={`${prefixDataTestId}-custom-additional-checkbox`}
                />
                <Label htmlFor="custom-additional">Store as custom attribute (additionalProperties)</Label>
              </div>
              {Boolean(formData.isCustom) && (
                <div className="gba:space-y-2">
                  <Label htmlFor={`${prefixDataTestId}-attr-key`}>Attribute key (optional)</Label>
                  <Input
                    id={`${prefixDataTestId}-attr-key`}
                    value={additionalKey}
                    onChange={e => setAdditionalKey(e.target.value)}
                    placeholder="Letters, numbers, underscores; defaults from label if empty"
                    data-testid={`${prefixDataTestId}-attr-key-input`}
                  />
                  <p className="gba:text-xs gba:text-muted-foreground">
                    Stored as <code className="gba:font-mono">{sanitizedKeyPreview}</code> at{' '}
                    <code className="gba:font-mono" data-testid={`${prefixDataTestId}-attr-key-preview`}>
                      {customPropertyPreview}
                    </code>
                  </p>
                </div>
              )}
            </div>
          )}

          {propertyEditor}

          <div className="gba:space-y-2">
            <Label htmlFor="displayOrder">Display Order (X.Y format)</Label>
            <Input
              id="displayOrder"
              value={formData.displayOrder}
              onChange={e => handleChange('displayOrder', e.target.value)}
              placeholder="e.g., 1.1, 1.2, 2.1"
              data-testid={`${prefixDataTestId}-displayorder-input`}
              aria-invalid={Boolean(errors.displayOrder) || undefined}
            />
            {errors.displayOrder ? (
              <p className="gba:text-xs gba:text-destructive" data-testid={`${prefixDataTestId}-displayorder-error`}>
                {errors.displayOrder}
              </p>
            ) : (
              <p className="gba:text-xs gba:text-muted-foreground">
                X = row number, Y = column within row (e.g., 1.1, 1.2, 2.1)
              </p>
            )}
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="type">Field Type</Label>
            {lockPropertyAndType || isCatalogOrRefType ? (
              <Input id="type" value={formData.type} disabled data-testid={`${prefixDataTestId}-type-readonly`} />
            ) : typeInPresetList ? (
              <Select value={formData.type} onValueChange={value => handleChange('type', value)}>
                <SelectTrigger data-testid={`${prefixDataTestId}-type-select`}>
                  <SelectValue placeholder="Select field type" />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="type"
                value={formData.type}
                onChange={e => handleChange('type', e.target.value)}
                data-testid={`${prefixDataTestId}-type-free-input`}
              />
            )}
          </div>

          <div className="gba:flex gba:items-center gba:gap-2">
            <Checkbox
              id="required"
              checked={formData.required}
              onCheckedChange={v => handleChange('required', v === true)}
              data-testid={`${prefixDataTestId}-required-checkbox`}
            />
            <Label htmlFor="required">Required Field</Label>
          </div>

          <div className="gba:flex gba:items-center gba:gap-2">
            <Checkbox
              id="report"
              checked={formData.report !== false}
              onCheckedChange={v => handleChange('report', v === true ? undefined : false)}
              data-testid={`${prefixDataTestId}-report-checkbox`}
            />
            <Label htmlFor="report">Include in report layout</Label>
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="placeholder">Placeholder (Optional)</Label>
            <Input
              id="placeholder"
              value={formData.placeholder || ''}
              onChange={e => handleChange('placeholder', e.target.value)}
              placeholder="Enter placeholder text"
              data-testid={`${prefixDataTestId}-placeholder-input`}
            />
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="helpText">Help Text (Optional)</Label>
            <Textarea
              id="helpText"
              value={formData.helpText || ''}
              onChange={e => handleChange('helpText', e.target.value)}
              placeholder="Enter help text"
              rows={2}
              data-testid={`${prefixDataTestId}-helptext-input`}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} data-testid={`${prefixDataTestId}-cancel-button`}>
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid={`${prefixDataTestId}-save-button`}>
            {isNewField ? 'Add Field' : 'Save Field'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
