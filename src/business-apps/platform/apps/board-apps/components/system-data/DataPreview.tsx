import React, { useMemo, useState } from 'react'
import { Button, Checkbox, Input, Label, Badge } from '@newwork/nw-design-system'
import { ChevronLeft, Search } from 'lucide-react'
import type { EntityFieldDef, EntityQueryDef } from '../../queries/entityQueries'

export interface DataPreviewProps {
  entityDef: EntityQueryDef
  records: Record<string, unknown>[]
  total: number
  availableFields: EntityFieldDef[]
  selectedFields: string[]
  onSelectedFieldsChange: (fields: string[]) => void
  onBack: () => void
  onNext: () => void
  'data-testid'?: string
}

export const DataPreview: React.FC<DataPreviewProps> = ({
  entityDef,
  records,
  total,
  availableFields,
  selectedFields,
  onSelectedFieldsChange,
  onBack,
  onNext,
  'data-testid': testId = 'data-preview'
}) => {
  const [fieldSearch, setFieldSearch] = useState('')
  const [tableSearch, setTableSearch] = useState('')

  const visibleFieldDefs = useMemo(() => {
    if (!fieldSearch.trim()) return availableFields
    const term = fieldSearch.toLowerCase()
    return availableFields.filter(f => f.label.toLowerCase().includes(term))
  }, [availableFields, fieldSearch])

  const previewFields = useMemo(
    () => availableFields.filter(f => selectedFields.includes(f.key)),
    [availableFields, selectedFields]
  )

  const filteredRecords = useMemo(() => {
    if (!tableSearch.trim()) return records
    const term = tableSearch.toLowerCase()
    return records.filter(rec => Object.values(rec).some(v => v != null && String(v).toLowerCase().includes(term)))
  }, [records, tableSearch])

  const toggleField = (key: string) => {
    onSelectedFieldsChange(
      selectedFields.includes(key) ? selectedFields.filter(k => k !== key) : [...selectedFields, key]
    )
  }

  const toggleAll = () => {
    onSelectedFieldsChange(selectedFields.length === availableFields.length ? [] : availableFields.map(f => f.key))
  }

  return (
    <div data-testid={testId}>
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid={`${testId}-back`}>
          <ChevronLeft className="gba:w-4 gba:h-4 gba:mr-1" /> Back
        </Button>
        <Badge variant="secondary">
          {total.toLocaleString()} {entityDef.displayName}
        </Badge>
      </div>

      {/* ── Field selector ── */}
      <div className="gba:rounded gba:border gba:border-border gba:mb-4">
        <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:border-b gba:border-border gba:bg-muted">
          <Label className="gba:text-xs gba:font-medium">
            Fields to import ({selectedFields.length}/{availableFields.length})
          </Label>
          <button
            onClick={toggleAll}
            className="gba:text-xs gba:text-primary gba:underline gba:cursor-pointer"
            data-testid={`${testId}-toggle-all`}
          >
            {selectedFields.length === availableFields.length ? 'Deselect all' : 'Select all'}
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
          {visibleFieldDefs.map(field => (
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
              <Checkbox checked={selectedFields.includes(field.key)} tabIndex={-1} />
              <span className="gba:truncate">{field.label}</span>
            </div>
          ))}
          {visibleFieldDefs.length === 0 && (
            <p className="gba:col-span-2 gba:text-xs gba:text-muted-foreground gba:py-2 gba:text-center">
              No fields match &ldquo;{fieldSearch}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* ── Table search ── */}
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

      {/* ── Preview table ── */}
      {previewFields.length > 0 ? (
        <div className="gba:mb-4">
          <Label className="gba:text-xs gba:font-medium gba:mb-1 gba:block">
            Preview (first {Math.min(filteredRecords.length, 20)} records)
          </Label>
          <div className="gba:rounded gba:border gba:border-border gba:overflow-x-auto">
            <table className="gba:w-full gba:text-xs gba:border-collapse" data-testid={`${testId}-table`}>
              <thead>
                <tr className="gba:border-b gba:border-border gba:bg-muted">
                  {previewFields.map(fld => (
                    <th
                      key={fld.key}
                      className="gba:text-left gba:px-3 gba:py-2 gba:font-medium gba:whitespace-nowrap gba:bg-muted"
                    >
                      {fld.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.slice(0, 20).map((rec, i) => (
                  <tr key={i} className="gba:border-b gba:border-border gba:last:border-0">
                    {previewFields.map(fld => (
                      <td
                        key={fld.key}
                        className="gba:px-3 gba:py-1.5 gba:whitespace-nowrap gba:max-w-[200px] gba:truncate"
                        title={formatCellValue(rec[fld.key])}
                      >
                        {formatCellValue(rec[fld.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:py-6 gba:mb-4">
          Select at least one field to see a preview.
        </p>
      )}

      {/* ── Continue ── */}
      <Button
        onClick={onNext}
        disabled={selectedFields.length === 0}
        className="gba:w-full"
        data-testid={`${testId}-next-btn`}
      >
        Continue with {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''}
      </Button>
    </div>
  )
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
