/**
 * FlowFieldSelector - field selection step for Flow Engine import,
 * modeled after the system data DataPreview component.
 */

import React, { useMemo, useState } from 'react'
import { Button, Checkbox, Input, Label, Badge } from '@newwork/nw-design-system'
import { ChevronLeft, Search } from 'lucide-react'
import type { FlowFieldDef } from '../../services/flowEngine/flowFieldDefinitions'

export interface FlowFieldSelectorProps {
  entityLabel: string
  fields: FlowFieldDef[]
  selectedKeys: string[]
  onSelectedKeysChange: (keys: string[]) => void
  previewRecords?: Record<string, unknown>[]
  previewTotal?: number
  onBack: () => void
  onNext: () => void
  'data-testid'?: string
}

export const FlowFieldSelector: React.FC<FlowFieldSelectorProps> = ({
  entityLabel,
  fields,
  selectedKeys,
  onSelectedKeysChange,
  previewRecords = [],
  previewTotal = 0,
  onBack,
  onNext,
  'data-testid': testId = 'flow-field-selector'
}) => {
  const [fieldSearch, setFieldSearch] = useState('')
  const [tableSearch, setTableSearch] = useState('')

  const visibleFields = useMemo(() => {
    if (!fieldSearch.trim()) return fields
    const term = fieldSearch.toLowerCase()
    return fields.filter(f => f.label.toLowerCase().includes(term))
  }, [fields, fieldSearch])

  const selectedFieldDefs = useMemo(() => fields.filter(f => selectedKeys.includes(f.key)), [fields, selectedKeys])

  const filteredRecords = useMemo(() => {
    if (!tableSearch.trim()) return previewRecords
    const term = tableSearch.toLowerCase()
    return previewRecords.filter(rec =>
      Object.values(rec).some(v => v != null && String(v).toLowerCase().includes(term))
    )
  }, [previewRecords, tableSearch])

  const toggleField = (key: string) => {
    onSelectedKeysChange(selectedKeys.includes(key) ? selectedKeys.filter(k => k !== key) : [...selectedKeys, key])
  }

  const toggleAll = () => {
    onSelectedKeysChange(selectedKeys.length === fields.length ? [] : fields.map(f => f.key))
  }

  return (
    <div data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid={`${testId}-back`}>
          <ChevronLeft className="gba:w-4 gba:h-4 gba:mr-1" /> Back
        </Button>
        {previewTotal > 0 && (
          <Badge variant="secondary">
            {previewTotal.toLocaleString()} {entityLabel}
          </Badge>
        )}
      </div>

      <div className="gba:rounded gba:border gba:border-border gba:mb-4">
        <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:border-b gba:border-border gba:bg-muted">
          <Label className="gba:text-xs gba:font-medium">
            Fields to import ({selectedKeys.length}/{fields.length})
          </Label>
          <button
            onClick={toggleAll}
            className="gba:text-xs gba:text-primary gba:underline gba:cursor-pointer"
            data-testid={`${testId}-toggle-all`}
          >
            {selectedKeys.length === fields.length ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        <div className="gba:px-3 gba:py-2 gba:border-b gba:border-border">
          <div className="gba:relative">
            <Search className="gba:absolute gba:left-2 gba:top-1.5 gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:pointer-events-none" />
            <Input
              value={fieldSearch}
              onChange={e => setFieldSearch(e.target.value)}
              placeholder="Search fields..."
              className="gba:h-7 gba:pl-7 gba:text-xs"
              data-testid={`${testId}-field-search`}
            />
          </div>
        </div>

        <div
          className="gba:grid gba:grid-cols-2 gba:gap-x-2 gba:gap-y-0.5 gba:p-2 gba:overflow-y-auto"
          style={{ maxHeight: '10rem' }}
        >
          {visibleFields.map(field => (
            <div
              key={field.key}
              role="button"
              tabIndex={0}
              onClick={() => toggleField(field.key)}
              onKeyDown={e => {
                if (e.key === ' ' || e.key === 'Enter') toggleField(field.key)
              }}
              className="gba:flex gba:items-center gba:gap-1.5 gba:cursor-pointer gba:rounded gba:px-1.5 gba:py-1 gba:hover:bg-accent gba:text-xs gba:select-none"
              data-testid={`${testId}-field-${field.key}`}
            >
              <Checkbox checked={selectedKeys.includes(field.key)} tabIndex={-1} />
              <span className="gba:truncate">{field.label}</span>
            </div>
          ))}
          {visibleFields.length === 0 && (
            <p className="gba:col-span-2 gba:text-xs gba:text-muted-foreground gba:py-2 gba:text-center">
              No fields match &ldquo;{fieldSearch}&rdquo;
            </p>
          )}
        </div>
      </div>

      {previewRecords.length > 0 && selectedFieldDefs.length > 0 && (
        <>
          <div className="gba:relative gba:mb-3">
            <Search className="gba:absolute gba:left-2.5 gba:top-2 gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:pointer-events-none" />
            <Input
              value={tableSearch}
              onChange={e => setTableSearch(e.target.value)}
              placeholder="Filter preview records..."
              className="gba:h-8 gba:pl-8 gba:text-xs"
              data-testid={`${testId}-search`}
            />
          </div>
          <div className="gba:mb-4">
            <Label className="gba:text-xs gba:font-medium gba:mb-1 gba:block">
              Preview (first {Math.min(filteredRecords.length, 20)} records)
            </Label>
            <div className="gba:rounded gba:border gba:border-border gba:overflow-x-auto">
              <table className="gba:w-full gba:text-xs gba:border-collapse" data-testid={`${testId}-table`}>
                <thead>
                  <tr className="gba:border-b gba:border-border gba:bg-muted">
                    {selectedFieldDefs.map(f => (
                      <th
                        key={f.key}
                        className="gba:text-left gba:px-3 gba:py-2 gba:font-medium gba:whitespace-nowrap gba:bg-muted"
                      >
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.slice(0, 20).map((rec, i) => (
                    <tr key={i} className="gba:border-b gba:border-border gba:last:border-0">
                      {selectedFieldDefs.map(f => (
                        <td
                          key={f.key}
                          className="gba:px-3 gba:py-1.5 gba:whitespace-nowrap gba:max-w-[200px] gba:truncate"
                          title={fmt(rec[f.key])}
                        >
                          {fmt(rec[f.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Button
        onClick={onNext}
        disabled={selectedKeys.length === 0}
        className="gba:w-full"
        data-testid={`${testId}-next-btn`}
      >
        Import with {selectedKeys.length} field{selectedKeys.length !== 1 ? 's' : ''}
      </Button>
    </div>
  )
}

function fmt(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
