import React from 'react'
import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea
} from '@newwork/nw-design-system'
import { TrashIcon } from '@phosphor-icons/react'
import type { CrmFeedbackFieldType } from '../../../data/record/crmCustomFeedbackClient'

// TODO(customer-feedback): Revisit supported field types/options when custom survey authoring resumes.
export interface DraftFeedbackField {
  id: string
  label: string
  type: CrmFeedbackFieldType
  required: boolean
  optionsText: string
}

const FIELD_TYPES: Array<{ value: CrmFeedbackFieldType; label: string }> = [
  { value: 'TEXT', label: 'Free text' },
  { value: 'TEXTAREA', label: 'Long text' },
  { value: 'SELECT', label: 'Single select' },
  { value: 'MULTISELECT', label: 'Multi select' },
  { value: 'CHECKBOX', label: 'Checkbox' },
  { value: 'RADIO', label: 'Radio' },
  { value: 'RATING', label: 'Rating' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'DATE', label: 'Date' },
  { value: 'DATETIME', label: 'Date and time' },
  { value: 'FILE', label: 'File' }
]

export function fieldNeedsOptions(type: CrmFeedbackFieldType): boolean {
  return type === 'SELECT' || type === 'MULTISELECT' || type === 'CHECKBOX' || type === 'RADIO'
}

interface CustomFeedbackFieldEditorProps {
  field: DraftFeedbackField
  t: (key: string) => string
  onUpdate: (fieldId: string, patch: Partial<DraftFeedbackField>) => void
  onRemove: (fieldId: string) => void
}

const CustomFeedbackFieldEditor: React.FC<CustomFeedbackFieldEditorProps> = ({ field, t, onUpdate, onRemove }) => (
  <div className="gba:rounded-md gba:border gba:border-border gba:p-3 gba:space-y-3">
    <div className="gba:grid gba:gap-3 gba:md:grid-cols-3">
      <div className="gba:space-y-2">
        <Label htmlFor={`${field.id}-label`}>{t('feedback-field-label')}</Label>
        <Input
          id={`${field.id}-label`}
          value={field.label}
          onChange={event => onUpdate(field.id, { label: event.target.value })}
        />
      </div>
      <div className="gba:space-y-2">
        <Label>{t('feedback-field-type')}</Label>
        <Select value={field.type} onValueChange={value => onUpdate(field.id, { type: value as CrmFeedbackFieldType })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="gba:flex gba:items-end gba:justify-between gba:gap-3">
        <label className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
          <Checkbox
            checked={field.required}
            onCheckedChange={checked => onUpdate(field.id, { required: checked === true })}
          />
          {t('feedback-field-required')}
        </label>
        <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(field.id)}>
          <TrashIcon className="gba:size-4" />
        </Button>
      </div>
    </div>
    {fieldNeedsOptions(field.type) ? (
      <div className="gba:space-y-2">
        <Label htmlFor={`${field.id}-options`}>{t('feedback-field-options')}</Label>
        <Textarea
          id={`${field.id}-options`}
          value={field.optionsText}
          onChange={event => onUpdate(field.id, { optionsText: event.target.value })}
        />
      </div>
    ) : null}
  </div>
)

export default CustomFeedbackFieldEditor
export { CustomFeedbackFieldEditor }
