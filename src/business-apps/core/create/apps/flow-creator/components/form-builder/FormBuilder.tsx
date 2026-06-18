/**
 * FormBuilder - Visual form field editor for Flow Studio.
 * Manages an array of InputBlocks with add, remove, reorder, and field config.
 */

import React, { useCallback, useEffect, useMemo } from 'react'
import { Button, Label } from '@newwork/nw-design-system'
import { FileText, Plus } from 'lucide-react'
import { InputType, type InputBlock } from '@/common/data/flow/types/flowTemplate'
import type { DesignerMode, FlowStudioUpdateOptions } from '../../types/studioTypes'
import { FormFieldEditor } from './FormFieldEditor'

export function slugifyKey(raw: string): string {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return s
}

function isAutoName(name: string): boolean {
  return /^field_\d+$/i.test(String(name || '').trim())
}

function toInitialism(raw: string): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
}

function isShortAbbreviatedName(name: string, label: string): boolean {
  const normalizedName = String(name || '')
    .trim()
    .toLowerCase()
  const slugifiedLabel = slugifyKey(label)

  if (!normalizedName || !slugifiedLabel || normalizedName === slugifiedLabel) return false
  if (!/^[a-z][a-z0-9_]*$/i.test(normalizedName)) return false

  return normalizedName.length <= 3 && slugifiedLabel.length > normalizedName.length
}

function isTruncatedLabelPrefix(name: string, label: string): boolean {
  const normalizedName = String(name || '')
    .trim()
    .toLowerCase()
  const slugifiedLabel = slugifyKey(label)

  if (!normalizedName || !slugifiedLabel || normalizedName === slugifiedLabel) return false
  if (normalizedName.length < 3) return false
  if (!/^[a-z][a-z0-9_]*$/i.test(normalizedName)) return false

  return slugifiedLabel.startsWith(normalizedName) && normalizedName.length < slugifiedLabel.length
}

export function shouldNormalizeHiddenName(name: string, label: string): boolean {
  const normalizedName = String(name || '')
    .trim()
    .toLowerCase()
  const normalizedLabel = String(label || '').trim()
  if (!normalizedLabel) return false
  if (!normalizedName) return true
  if (isAutoName(normalizedName)) return true
  if (/^[a-z0-9]$/i.test(normalizedName)) return true

  const initialism = toInitialism(normalizedLabel)
  if (initialism && normalizedName === initialism && normalizedName !== slugifyKey(normalizedLabel)) {
    return true
  }

  if (isShortAbbreviatedName(normalizedName, normalizedLabel)) {
    return true
  }

  if (isTruncatedLabelPrefix(normalizedName, normalizedLabel)) {
    return true
  }

  return false
}

export function deriveReadableFieldName(currentName: string, label: string, existing: Set<string>): string {
  const nextCurrentName = String(currentName || '').trim()
  const normalizedLabel = String(label || '').trim()
  const base = slugifyKey(normalizedLabel)

  if (base && shouldNormalizeHiddenName(nextCurrentName, normalizedLabel)) {
    return uniqueName(base, existing, undefined)
  }

  if (!nextCurrentName && normalizedLabel) {
    return uniqueName(base || nextAutoFieldName(existing), existing, undefined)
  }

  return nextCurrentName
}

function uniqueName(base: string, existing: Set<string>, current?: string): string {
  const normalized = String(base || '').trim()
  if (!normalized) return current || ''
  if (current && normalized === current) return normalized
  if (!existing.has(normalized)) return normalized
  for (let i = 2; i < 5000; i++) {
    const candidate = `${normalized}_${i}`
    if (!existing.has(candidate)) return candidate
  }
  return `${normalized}_${Date.now()}`
}

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

interface EntityOption {
  type: string
  name: string
  fields: string[]
}

interface FormBuilderProps {
  fields: InputBlock[]
  onChange: (fields: InputBlock[], options?: FlowStudioUpdateOptions) => void
  /**
   * Called when a field key (InputBlock.name) changes, so callers can rewrite any
   * existing expressions that reference that key.
   */
  onFieldKeyRename?: (rename: { oldKey: string; newKey: string }, options?: FlowStudioUpdateOptions) => void
  mode: DesignerMode
  /** Available catalogs for field data sources */
  catalogs?: CatalogOption[]
  catalogsLoading?: boolean
  catalogsError?: string | null
  catalogsQuery?: string
  catalogsHasMore?: boolean
  searchCatalogs?: (query: string) => Promise<void>
  loadMoreCatalogs?: () => Promise<void>
  /** Available entities for field data sources (advanced) */
  entities?: EntityOption[]
  entitiesLoading?: boolean
  entitiesError?: string | null
  loadEntities?: () => Promise<void>
  /** Label shown above the builder */
  title?: string
  /** Description shown below the title */
  description?: string
  'data-testid'?: string
}

export const FormBuilder: React.FC<FormBuilderProps> = ({
  fields,
  onChange,
  onFieldKeyRename,
  mode,
  catalogs,
  catalogsLoading,
  catalogsError,
  catalogsQuery,
  catalogsHasMore,
  searchCatalogs,
  loadMoreCatalogs,
  entities,
  entitiesLoading,
  entitiesError,
  loadEntities,
  title = 'Form Fields',
  description,
  'data-testid': testId = 'form-builder'
}) => {
  const existingNames = useMemo(() => new Set(fields.map(f => f.name).filter(Boolean)), [fields])

  useEffect(() => {
    const usedNames = new Set<string>()
    let changed = false

    const normalizedFields = fields.map(field => {
      const currentName = String(field?.name || '').trim()
      const label = String(field?.label || '').trim()
      const nextName = deriveReadableFieldName(currentName, label, usedNames)

      if (nextName) {
        usedNames.add(nextName)
      }

      if (nextName && nextName !== currentName) {
        changed = true
        if (currentName) {
          onFieldKeyRename?.({ oldKey: currentName, newKey: nextName }, { markDirty: false })
        }
        return { ...field, name: nextName }
      }

      return field
    })

    if (changed) {
      onChange(normalizedFields, { markDirty: false })
    }
  }, [fields, onChange, onFieldKeyRename])

  const addField = useCallback(
    (type: InputType) => {
      onChange([...fields, createField(type, existingNames)])
    },
    [existingNames, fields, onChange]
  )

  const updateField = useCallback(
    (index: number, updated: InputBlock) => {
      const next = [...fields]
      const prev = next[index]
      const nextExisting = new Set(next.map(f => f.name).filter(Boolean))
      nextExisting.delete(String(prev?.name || '').trim())

      const oldLabel = String(prev?.label || '')
      const newLabel = String(updated?.label || '')
      const oldName = String(prev?.name || '').trim()

      // Hidden technical keys should stay human-readable. When a field still has an
      // auto/opaque key, derive a semantic one from the latest label.
      if (oldLabel !== newLabel) {
        const nextName = deriveReadableFieldName(oldName, newLabel, nextExisting)
        if (nextName && nextName !== oldName) {
          updated = { ...updated, name: nextName }
        }
      }

      const newName = String(updated?.name || '').trim()
      if (oldName && newName && oldName !== newName) {
        onFieldKeyRename?.({ oldKey: oldName, newKey: newName })
      }

      next[index] = updated
      onChange(next)
    },
    [fields, onChange, onFieldKeyRename]
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
      <div className="gba:flex gba:flex-col gba:gap-3">
        {fields.map((field, index) => (
          <FormFieldEditor
            key={`field-row-${index}`}
            field={field}
            index={index}
            total={fields.length}
            mode={mode}
            catalogs={catalogs}
            catalogsLoading={catalogsLoading}
            catalogsError={catalogsError}
            catalogsQuery={catalogsQuery}
            catalogsHasMore={catalogsHasMore}
            searchCatalogs={searchCatalogs}
            loadMoreCatalogs={loadMoreCatalogs}
            entities={entities}
            entitiesLoading={entitiesLoading}
            entitiesError={entitiesError}
            loadEntities={loadEntities}
            onChange={updated => updateField(index, updated)}
            onRemove={() => removeField(index)}
            onMoveUp={() => moveField(index, index - 1)}
            onMoveDown={() => moveField(index, index + 1)}
            data-testid={`${testId}-field`}
          />
        ))}

        <div className="gba:flex gba:flex-wrap gba:justify-center gba:gap-1.5">
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
    </div>
  )
}
