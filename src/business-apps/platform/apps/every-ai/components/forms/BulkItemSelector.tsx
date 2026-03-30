import React, { useCallback } from 'react'
import { Checkbox, Input, Label } from '@newwork/nw-design-system'
import type { BulkFlowProposalItem } from '../../types/models'
import { formatFieldName } from './utils/formSchemaUtils'

function getVaryingValueFromPath(overrides: Record<string, unknown> | undefined, path: string): string {
  if (!overrides || !path) return ''
  const parts = path.split('.')
  let cur: unknown = overrides
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return ''
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur == null ? '' : String(cur)
}

/**
 * Read the varying value for bulk items. Handles `flow.<field>` where <field> may contain spaces
 * (e.g. `flow.Device Type`). Naive splitting on `.` would break those keys.
 */
function getVaryingValueForBulkItem(overrides: Record<string, unknown> | undefined, varyingFieldPath: string): string {
  if (!overrides || !varyingFieldPath) return ''

  if (varyingFieldPath.startsWith('flow.')) {
    const tail = varyingFieldPath.slice(5)
    const flow = overrides.flow
    if (flow != null && typeof flow === 'object' && !Array.isArray(flow)) {
      const f = flow as Record<string, unknown>
      if (Object.prototype.hasOwnProperty.call(f, tail)) {
        const v = f[tail]
        return v == null ? '' : String(v)
      }
      if (tail.includes('.')) {
        return getVaryingValueFromPath(f, tail)
      }
      // Single segment after flow.; avoid getVaryingValueFromPath(overrides, "flow.X Y") which splits on "."
      if (!/\s/.test(tail)) {
        const legacy = getVaryingValueFromPath(overrides, varyingFieldPath)
        if (legacy !== '') return legacy
      }
      return ''
    }
  }

  return getVaryingValueFromPath(overrides, varyingFieldPath)
}

function setVaryingValueAtPath(
  overrides: Record<string, unknown>,
  path: string,
  value: string
): Record<string, unknown> {
  const parts = path.split('.')
  const root = JSON.parse(JSON.stringify(overrides)) as Record<string, unknown>
  let cur: Record<string, unknown> = root
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i]
    const next = cur[k]
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      cur[k] = {}
    } else {
      cur[k] = { ...(next as Record<string, unknown>) }
    }
    cur = cur[k] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]] = value
  return root
}

/**
 * Write varying value; same `flow.` + optional spaces / nested rules as getVaryingValueForBulkItem.
 */
function setVaryingValueForBulkItem(
  overrides: Record<string, unknown>,
  varyingFieldPath: string,
  value: string
): Record<string, unknown> {
  if (!varyingFieldPath.startsWith('flow.')) {
    return setVaryingValueAtPath(overrides, varyingFieldPath, value)
  }

  const tail = varyingFieldPath.slice(5)
  const root = JSON.parse(JSON.stringify(overrides)) as Record<string, unknown>
  if (!root.flow || typeof root.flow !== 'object' || Array.isArray(root.flow)) {
    root.flow = {}
  }
  const flow = root.flow as Record<string, unknown>

  if (!tail.includes('.')) {
    flow[tail] = value
    return root
  }

  const updatedFlow = setVaryingValueAtPath({ ...flow }, tail, value)
  root.flow = updatedFlow
  return root
}

interface BulkItemSelectorProps {
  items: BulkFlowProposalItem[]
  selectedKeys: Set<string>
  onSelectionChange: (selectedKeys: Set<string>) => void
  onItemsChange?: (items: BulkFlowProposalItem[]) => void
  itemLabel?: string
  disabled?: boolean
  varyingFieldKey?: string | null
  /** Full path from bulk_operation.varying_field (e.g. flow.Type) for syncing overrides when editing. */
  varyingFieldPath?: string | null
}

export const BulkItemSelector: React.FC<BulkItemSelectorProps> = ({
  items,
  selectedKeys,
  onSelectionChange,
  onItemsChange,
  itemLabel,
  disabled = false,
  varyingFieldKey,
  varyingFieldPath
}) => {
  const handleItemTextChange = useCallback(
    (key: string, newValue: string) => {
      if (!onItemsChange) return
      onItemsChange(
        items.map(item => {
          if (item.key !== key) return item
          const next: BulkFlowProposalItem = { ...item, label: newValue }
          if (varyingFieldPath) {
            next.overrides = setVaryingValueForBulkItem(
              (item.overrides ?? {}) as Record<string, unknown>,
              varyingFieldPath,
              newValue
            ) as BulkFlowProposalItem['overrides']
          }
          return next
        })
      )
    },
    [items, onItemsChange, varyingFieldPath]
  )

  const getRowDisplayValue = (item: BulkFlowProposalItem): string => {
    if (varyingFieldPath && item.overrides) {
      const fromPath = getVaryingValueForBulkItem(item.overrides as Record<string, unknown>, varyingFieldPath)
      if (fromPath !== '') return fromPath
    }
    return item.label ?? item.key
  }

  const heading = itemLabel ?? 'Items'
  const varyingLabel = varyingFieldKey ? formatFieldName(varyingFieldKey) : null

  return (
    <div className="gba:space-y-2" data-testid="bulk-item-selector">
      <div className="gba:rounded-lg gba:bg-info-secondary/50 gba:border gba:border-info/20 gba:px-3 gba:py-2.5">
        <div className="gba:flex gba:items-start gba:gap-2">
          <svg
            className="gba:h-4 gba:w-4 gba:text-info gba:mt-0.5 gba:shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <div className="gba:text-sm gba:text-info">
            <span className="gba:font-semibold">Batch operation</span>
            {varyingLabel && (
              <span>
                {' '}
                &mdash; <span className="gba:font-medium">{varyingLabel}</span> varies per item
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="gba:flex gba:items-center gba:justify-between">
        <Label className="gba:text-sm gba:font-medium">{heading}</Label>
        <span className="gba:text-xs gba:text-muted-foreground">
          {selectedKeys.size} / {items.length} selected
        </span>
      </div>

      <div className="gba:rounded-md gba:border gba:border-border gba:divide-y gba:divide-border">
        {items.map(item => {
          const isChecked = selectedKeys.has(item.key)
          const displayValue = getRowDisplayValue(item)

          return (
            <div
              key={item.key}
              className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:min-h-10"
              data-testid={`bulk-item-${item.key}`}
            >
              <Checkbox
                checked={isChecked}
                disabled={disabled}
                onCheckedChange={checked => {
                  if (disabled) return
                  if (checked === true) {
                    const next = new Set(selectedKeys)
                    next.add(item.key)
                    onSelectionChange(next)
                  } else {
                    const next = new Set(selectedKeys)
                    next.delete(item.key)
                    onSelectionChange(next)
                  }
                }}
                data-testid={`bulk-item-checkbox-${item.key}`}
              />
              {onItemsChange && !disabled ? (
                <Input
                  type="text"
                  value={displayValue}
                  onChange={e => handleItemTextChange(item.key, e.target.value)}
                  onClick={e => e.stopPropagation()}
                  className="gba:flex-1 gba:h-8 gba:text-sm"
                  data-testid={`bulk-item-input-${item.key}`}
                  aria-label={varyingLabel ? `${varyingLabel} for item ${item.key}` : `Bulk item ${item.key}`}
                />
              ) : (
                <span className="gba:text-sm gba:flex-1">{displayValue}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
