import React, { useMemo } from 'react'
import { Button, Badge, Checkbox, Label, Spinner } from '@newwork/nw-design-system'
import { ArrowLeft, ArrowRight, Table2 } from 'lucide-react'
import type { ConnectorField } from '../../types'

export interface ExternalPreviewProps {
  connectorName: string
  records: Array<Record<string, unknown>>
  schema: ConnectorField[]
  estimatedTotal?: number
  selectedFields: string[]
  onSelectedFieldsChange: (fields: string[]) => void
  isLoading: boolean
  onBack: () => void
  onNext: () => void
  'data-testid'?: string
}

export const ExternalPreview: React.FC<ExternalPreviewProps> = ({
  connectorName,
  records,
  schema,
  estimatedTotal,
  selectedFields,
  onSelectedFieldsChange,
  isLoading,
  onBack,
  onNext,
  'data-testid': testId = 'external-preview'
}) => {
  const allFieldNames = useMemo(() => schema.map(f => f.name), [schema])

  const toggleField = (name: string) => {
    if (selectedFields.includes(name)) {
      onSelectedFieldsChange(selectedFields.filter(f => f !== name))
    } else {
      onSelectedFieldsChange([...selectedFields, name])
    }
  }

  const toggleAll = () => {
    if (selectedFields.length === allFieldNames.length) {
      onSelectedFieldsChange([])
    } else {
      onSelectedFieldsChange(allFieldNames)
    }
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-12" data-testid={testId}>
        <Spinner size="md" />
        <span className="gba:ml-2 gba:text-sm gba:text-muted-foreground">Loading preview...</span>
      </div>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Table2 className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
          <span className="gba:text-sm gba:font-medium">{connectorName}</span>
        </div>
        <Badge variant="secondary" className="gba:text-xs">
          {records.length} rows{estimatedTotal ? ` of ~${estimatedTotal.toLocaleString()}` : ''}
        </Badge>
      </div>

      <div className="gba:space-y-2">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Label className="gba:text-xs gba:font-medium">Fields to import</Label>
          <button
            type="button"
            className="gba:text-xs gba:text-primary gba:underline"
            onClick={toggleAll}
            data-testid={`${testId}-toggle-all`}
          >
            {selectedFields.length === allFieldNames.length ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        <div className="gba:max-h-40 gba:overflow-y-auto gba:space-y-1 gba:rounded gba:border gba:p-2">
          {schema.map(field => (
            <label key={field.name} className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:py-0.5">
              <Checkbox
                checked={selectedFields.includes(field.name)}
                onCheckedChange={() => toggleField(field.name)}
                data-testid={`${testId}-field-${field.name}`}
              />
              <span className="gba:text-xs">{field.label || field.name}</span>
              <Badge variant="secondary" className="gba:text-[10px] gba:ml-auto">
                {field.type}
              </Badge>
            </label>
          ))}
        </div>
      </div>

      {records.length > 0 && (
        <div className="gba:overflow-x-auto gba:border gba:rounded">
          <table className="gba:w-full gba:text-xs">
            <thead>
              <tr className="gba:border-b gba:bg-muted/50">
                {selectedFields.slice(0, 6).map(name => (
                  <th key={name} className="gba:p-1.5 gba:text-left gba:font-medium gba:whitespace-nowrap">
                    {schema.find(s => s.name === name)?.label || name}
                  </th>
                ))}
                {selectedFields.length > 6 && (
                  <th className="gba:p-1.5 gba:text-muted-foreground">+{selectedFields.length - 6} more</th>
                )}
              </tr>
            </thead>
            <tbody>
              {records.slice(0, 5).map((row, i) => (
                <tr key={i} className="gba:border-b gba:last:border-0">
                  {selectedFields.slice(0, 6).map(name => (
                    <td key={name} className="gba:p-1.5 gba:truncate gba:max-w-[140px]">
                      {row[name] != null ? String(row[name]) : '—'}
                    </td>
                  ))}
                  {selectedFields.length > 6 && <td className="gba:p-1.5 gba:text-muted-foreground">…</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="gba:flex gba:justify-between gba:pt-2">
        <Button variant="outline" size="sm" onClick={onBack} data-testid={`${testId}-back`}>
          <ArrowLeft className="gba:w-3 gba:h-3 gba:mr-1" /> Back
        </Button>
        <Button size="sm" onClick={onNext} disabled={!selectedFields.length} data-testid={`${testId}-next`}>
          Import settings <ArrowRight className="gba:w-3 gba:h-3 gba:ml-1" />
        </Button>
      </div>
    </div>
  )
}
