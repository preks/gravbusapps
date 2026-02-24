/**
 * FormBuilder - Visual form field editor for Flow Studio.
 * Manages an array of InputBlocks with add, remove, reorder, and field config.
 */

import React, { useCallback, useMemo } from 'react'
import { Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { FileText, Plus } from 'lucide-react'
import { InputType, type InputBlock } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import type { DesignerMode } from '../../types/studioTypes'
import { FormFieldEditor } from './FormFieldEditor'

function nextAutoFieldName(existing: Set<string>): string {
  // Keep stable, predictable keys. Avoid collisions after deletions/reorders.
  for (let i = 1; i < 5000; i++) {
    const candidate = `field_${i}`
    if (!existing.has(candidate)) return candidate
  }
  // Fallback (should never happen)
  return `field_${Date.now()}`
}

/** Default field factory */
const createField = (type: InputType, existingNames: Set<string>): InputBlock => {
  const name = nextAutoFieldName(existingNames)
  const indexHint = existingNames.size + 1
  return {
    type,
    name,
    label: `Field ${indexHint}`,
    required: false
  }
}

/** Quick-add presets for common form patterns */
const PRESETS = [
  { label: 'Text field', type: InputType.TEXT },
  { label: 'Long text', type: InputType.TEXTAREA },
  { label: 'Number', type: InputType.NUMBER },
  { label: 'Date', type: InputType.DATE },
  { label: 'Dropdown', type: InputType.SELECT },
  { label: 'Checkbox', type: InputType.CHECKBOX },
  { label: 'File upload', type: InputType.FILE }
]

interface CatalogOption {
  identifier: string
  name: string
  version: string
  entryCount: number
}

interface FormBuilderProps {
  fields: InputBlock[]
  onChange: (fields: InputBlock[]) => void
  mode: DesignerMode
  /** Available catalogs for field data sources */
  catalogs?: CatalogOption[]
  /** Label shown above the builder */
  title?: string
  /** Description shown below the title */
  description?: string
  'data-testid'?: string
}

export const FormBuilder: React.FC<FormBuilderProps> = ({
  fields,
  onChange,
  mode,
  catalogs,
  title = 'Form Fields',
  description,
  'data-testid': testId = 'form-builder'
}) => {
  const [addType, setAddType] = React.useState<InputType>(InputType.TEXT)

  const existingNames = useMemo(() => new Set(fields.map(f => f.name).filter(Boolean)), [fields])

  const addField = useCallback(
    (type: InputType = addType) => {
      onChange([...fields, createField(type, existingNames)])
    },
    [addType, existingNames, fields, onChange]
  )

  const updateField = useCallback(
    (index: number, updated: InputBlock) => {
      const next = [...fields]
      next[index] = updated
      onChange(next)
    },
    [fields, onChange]
  )

  const removeField = useCallback(
    (index: number) => {
      onChange(fields.filter((_, i) => i !== index))
    },
    [fields, onChange]
  )

  const moveField = useCallback(
    (from: number, to: number) => {
      if (to < 0 || to >= fields.length) return
      const next = [...fields]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      onChange(next)
    },
    [fields, onChange]
  )

  return (
    <div className="gba:flex gba:flex-col gba:gap-3 gba:relative" data-testid={testId}>
      {/* Header */}
      <div className="gba:flex gba:items-center gba:gap-2">
        <FileText className="gba:h-4 gba:w-4 gba:text-primary" />
        <Label className="gba:text-xs gba:font-semibold">{title}</Label>
        <span className="gba:text-[10px] gba:text-muted-foreground">
          {fields.length} {fields.length === 1 ? 'field' : 'fields'}
        </span>
      </div>
      {description && <p className="gba:text-xs gba:text-muted-foreground">{description}</p>}

      {/* Content */}
      <div className="gba:flex gba:flex-col gba:gap-3 gba:pb-20">
        {/* Quick-add preset buttons */}
        {fields.length === 0 && (
          <div className="gba:flex gba:flex-col gba:gap-2 gba:p-4 gba:border gba:border-dashed gba:border-border gba:rounded-lg gba:bg-muted gba:text-center">
            <p className="gba:text-xs gba:text-muted-foreground">No fields yet. Add your first field:</p>
            <div className="gba:flex gba:flex-wrap gba:gap-1.5 gba:justify-center">
              {PRESETS.map(preset => (
                <Button
                  key={preset.type}
                  variant="outline"
                  size="sm"
                  onClick={() => addField(preset.type)}
                  data-testid={`${testId}-preset-${preset.type.toLowerCase()}`}
                >
                  <Plus className="gba:h-3 gba:w-3 gba:mr-1" />
                  <span className="gba:text-xs">{preset.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Field list */}
        {fields.map((field, index) => (
          <FormFieldEditor
            key={`${field.name}-${index}`}
            field={field}
            index={index}
            total={fields.length}
            mode={mode}
            catalogs={catalogs}
            onChange={updated => updateField(index, updated)}
            onRemove={() => removeField(index)}
            onMoveUp={() => moveField(index, index - 1)}
            onMoveDown={() => moveField(index, index + 1)}
            data-testid={`${testId}-field`}
          />
        ))}
      </div>

      {/* Add field controls (sticky footer within sidebar scroll) */}
      <div className="gba:sticky gba:bottom-0 gba:z-10 gba:bg-background gba:border-t gba:border-border gba:pt-3 gba:pb-2">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Select value={addType} onValueChange={v => setAddType(v as InputType)}>
            <SelectTrigger className="gba:flex-1" data-testid={`${testId}-add-type`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(mode === 'simple' ? PRESETS.map(p => p.type) : Object.values(InputType)).map(t => (
                <SelectItem key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase().replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => addField()} data-testid={`${testId}-add`}>
            <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}
