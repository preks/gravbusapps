/**
 * FormBuilder - Visual form field editor for Flow Studio.
 * Manages an array of InputBlocks with add, remove, reorder, and field config.
 */

import React, { useCallback, useEffect, useMemo } from 'react'
import { Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { FileText, Plus } from 'lucide-react'
import { InputType, type InputBlock } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import type { DesignerMode } from '../../types/studioTypes'
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
  onChange: (fields: InputBlock[]) => void
  /**
   * Called when a field key (InputBlock.name) changes, so callers can rewrite any
   * existing expressions that reference that key.
   */
  onFieldKeyRename?: (rename: { oldKey: string; newKey: string }) => void
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
  /** Custom data sources (advanced) */
  customDataNamespaces?: string[]
  customDataNamespacesLoading?: boolean
  customDataKeysByNamespace?: Record<string, string[]>
  customDataKeysLoadingByNamespace?: Record<string, boolean>
  fetchCustomDataKeys?: (namespace: string) => Promise<void>
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
  customDataNamespaces,
  customDataNamespacesLoading,
  customDataKeysByNamespace,
  customDataKeysLoadingByNamespace,
  fetchCustomDataKeys,
  title = 'Form Fields',
  description,
  'data-testid': testId = 'form-builder'
}) => {
  const [addType, setAddType] = React.useState<InputType>(InputType.TEXT)

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
          onFieldKeyRename?.({ oldKey: currentName, newKey: nextName })
        }
        return { ...field, name: nextName }
      }

      return field
    })

    if (changed) {
      onChange(normalizedFields)
    }
  }, [fields, onChange, onFieldKeyRename])

  const addField = useCallback(
    (type: InputType = addType) => {
      onChange([...fields, createField(type, existingNames)])
    },
    [addType, existingNames, fields, onChange]
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
            customDataNamespaces={customDataNamespaces}
            customDataNamespacesLoading={customDataNamespacesLoading}
            customDataKeysByNamespace={customDataKeysByNamespace}
            customDataKeysLoadingByNamespace={customDataKeysLoadingByNamespace}
            fetchCustomDataKeys={fetchCustomDataKeys}
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
