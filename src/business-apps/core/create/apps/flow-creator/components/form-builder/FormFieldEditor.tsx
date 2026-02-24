/**
 * FormFieldEditor - Configuration for a single form field (InputBlock).
 * Supports all field types with inline options management for select/radio/checkbox.
 */

import React from 'react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch
} from '@newwork/nw-design-system'
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2, X } from 'lucide-react'
import {
  InputType,
  type InputBlock,
  type InputOption,
  type DataSource
} from '@/business-apps/flow/apps/creator/types/flowTemplate'
import type { DesignerMode } from '../../types/studioTypes'
import { FormFieldDefaultValueSection } from './FormFieldDefaultValueSection'
import { NEUTRAL_SWITCH_CLASSNAME } from '../../utils/neutralSwitchClassName'

/** Field types available in simple mode */
const SIMPLE_TYPES = [
  InputType.TEXT,
  InputType.TEXTAREA,
  InputType.NUMBER,
  InputType.DATE,
  InputType.CHECKBOX,
  InputType.SELECT,
  InputType.FILE
]

/** All field types */
const ALL_TYPES = Object.values(InputType)

/** Human-readable labels */
const TYPE_LABELS: Record<InputType, string> = {
  [InputType.TEXT]: 'Text',
  [InputType.TEXTAREA]: 'Text Area',
  [InputType.NUMBER]: 'Number',
  [InputType.DATE]: 'Date',
  [InputType.DATETIME]: 'Date & Time',
  [InputType.SELECT]: 'Dropdown',
  [InputType.MULTISELECT]: 'Multi-Select',
  [InputType.CHECKBOX]: 'Checkbox',
  [InputType.RADIO]: 'Radio',
  [InputType.FILE]: 'File Upload',
  [InputType.SIGNATURE]: 'Signature'
}

const HAS_OPTIONS = new Set([InputType.SELECT, InputType.MULTISELECT, InputType.RADIO, InputType.CHECKBOX])

interface CatalogOption {
  identifier: string
  name: string
  version: string
  entryCount: number
}

interface FormFieldEditorProps {
  field: InputBlock
  index: number
  total: number
  mode: DesignerMode
  catalogs?: CatalogOption[]
  onChange: (updated: InputBlock) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  'data-testid'?: string
}

export const FormFieldEditor: React.FC<FormFieldEditorProps> = ({
  field,
  index,
  total,
  mode,
  catalogs,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  'data-testid': testId = 'form-field-editor'
}) => {
  // In simple mode we still need to correctly render legacy/advanced field types
  // that already exist in a flow (otherwise the Select appears blank).
  const baseTypes = mode === 'simple' ? SIMPLE_TYPES : ALL_TYPES
  const availableTypes = baseTypes.includes(field.type) ? baseTypes : [...baseTypes, field.type]
  const labelForType = (t: InputType) => TYPE_LABELS[t] ?? String(t)

  const updateField = (partial: Partial<InputBlock>) => {
    onChange({ ...field, ...partial })
  }

  const addOption = () => {
    const options = field.options ?? []
    const next: InputOption = {
      value: `option_${options.length + 1}`,
      label: `Option ${options.length + 1}`
    }
    updateField({ options: [...options, next] })
  }

  const updateOption = (optIndex: number, partial: Partial<InputOption>) => {
    const options = [...(field.options ?? [])]
    options[optIndex] = { ...options[optIndex], ...partial }
    updateField({ options })
  }

  const removeOption = (optIndex: number) => {
    const options = (field.options ?? []).filter((_, i) => i !== optIndex)
    updateField({ options })
  }

  return (
    <div
      className="gba:flex gba:flex-col gba:gap-3 gba:p-3 gba:rounded-lg gba:bg-muted"
      data-testid={`${testId}-${index}`}
    >
      {/* Header: drag handle, label, move/remove */}
      <div className="gba:flex gba:items-center gba:gap-2">
        <GripVertical className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0 gba:cursor-grab" />
        <span className="gba:text-xs gba:font-semibold gba:flex-1 gba:truncate">
          {field.label || `Field ${index + 1}`}
        </span>
        <div className="gba:flex gba:items-center gba:gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            disabled={index === 0}
            onClick={onMoveUp}
            data-testid={`${testId}-${index}-up`}
          >
            <ChevronUp className="gba:h-3 gba:w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={index === total - 1}
            onClick={onMoveDown}
            data-testid={`${testId}-${index}-down`}
          >
            <ChevronDown className="gba:h-3 gba:w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onRemove} data-testid={`${testId}-${index}-remove`}>
            <Trash2 className="gba:h-3 gba:w-3 gba:text-destructive" />
          </Button>
        </div>
      </div>

      {/* Type */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-2">
        <div className="gba:flex gba:flex-col gba:gap-1">
          <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Type</Label>
          <Select value={field.type} onValueChange={v => updateField({ type: v as InputType })}>
            <SelectTrigger data-testid={`${testId}-${index}-type`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableTypes.map(t => (
                <SelectItem key={t} value={t}>
                  {labelForType(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Required toggle */}
        <div className="gba:flex gba:flex-col gba:gap-1">
          <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Required</Label>
          <div className="gba:flex gba:items-center gba:h-9">
            <Switch
              checked={field.required ?? false}
              onCheckedChange={checked => updateField({ required: checked })}
              className={NEUTRAL_SWITCH_CLASSNAME}
              data-testid={`${testId}-${index}-required`}
            />
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="gba:flex gba:flex-col gba:gap-1">
        <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Label</Label>
        <Input
          value={field.label}
          onChange={e => updateField({ label: e.target.value })}
          placeholder="Field label"
          data-testid={`${testId}-${index}-label`}
        />
      </div>

      {/* Name (technical key) */}
      {/* Field name is auto-generated and intentionally hidden */}

      <FormFieldDefaultValueSection mode={mode} field={field} onChange={updateField} index={index} testId={testId} />

      {/* Read-only toggle (advanced) */}
      {mode === 'advanced' && (
        <div className="gba:flex gba:items-center gba:justify-between">
          <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Read-only</Label>
          <Switch
            checked={field.readOnly ?? false}
            onCheckedChange={checked => updateField({ readOnly: checked })}
            className={NEUTRAL_SWITCH_CLASSNAME}
            data-testid={`${testId}-${index}-readonly`}
          />
        </div>
      )}

      {/* Data source for select-like types */}
      {HAS_OPTIONS.has(field.type) && (
        <div className="gba:flex gba:flex-col gba:gap-2">
          {/* Data source toggle (advanced mode with catalogs) */}
          {mode === 'advanced' && catalogs && catalogs.length > 0 && (
            <div className="gba:flex gba:flex-col gba:gap-1">
              <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Data Source</Label>
              <Select
                value={field.dataSource?.type === 'CATALOG' ? 'catalog' : 'manual'}
                onValueChange={v => {
                  if (v === 'manual') {
                    updateField({ dataSource: undefined })
                  } else {
                    updateField({
                      dataSource: {
                        type: 'CATALOG',
                        catalog: '',
                        valueField: 'code',
                        labelField: 'value'
                      } as DataSource
                    })
                  }
                }}
              >
                <SelectTrigger data-testid={`${testId}-${index}-datasource`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual options</SelectItem>
                  <SelectItem value="catalog">Catalog</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Catalog selector */}
          {field.dataSource?.type === 'CATALOG' && catalogs && (
            <div className="gba:flex gba:flex-col gba:gap-1">
              <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Catalog</Label>
              <Select
                value={field.dataSource.catalog || ''}
                onValueChange={v => {
                  updateField({
                    dataSource: {
                      ...field.dataSource!,
                      catalog: v
                    }
                  })
                }}
              >
                <SelectTrigger data-testid={`${testId}-${index}-catalog`}>
                  <SelectValue placeholder="Select catalog..." />
                </SelectTrigger>
                <SelectContent>
                  {catalogs.map(c => (
                    <SelectItem key={c.identifier} value={c.identifier}>
                      {c.name} ({c.entryCount} entries)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Manual options list */}
          {field.dataSource?.type !== 'CATALOG' && (
            <>
              <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Options</Label>
              {(field.options ?? []).map((opt, oi) => (
                <div key={opt.value || opt.label || `opt-${oi}`} className="gba:flex gba:items-center gba:gap-1.5">
                  <Input
                    value={opt.label}
                    onChange={e => updateOption(oi, { label: e.target.value })}
                    placeholder="Label"
                    className="gba:flex-1"
                    data-testid={`${testId}-${index}-opt-label-${oi}`}
                  />
                  <Input
                    value={opt.value}
                    onChange={e => updateOption(oi, { value: e.target.value })}
                    placeholder="Value"
                    className="gba:w-24"
                    data-testid={`${testId}-${index}-opt-value-${oi}`}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(oi)}
                    data-testid={`${testId}-${index}-opt-remove-${oi}`}
                  >
                    <X className="gba:h-3 gba:w-3" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addOption} data-testid={`${testId}-${index}-opt-add`}>
                <Plus className="gba:h-3 gba:w-3 gba:mr-1" />
                Add option
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
