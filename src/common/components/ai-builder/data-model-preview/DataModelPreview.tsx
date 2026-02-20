import React, { useCallback, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Label,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Alert,
  AlertDescription
} from '@newwork/nw-design-system'
import { Database, Plus } from 'lucide-react'
import type { DataModelPreviewDefinition } from './dataModelPreviewTypes'

export interface DataModelPreviewProps {
  /** Definition to display (from orchestrator fetch or demo mock). No fetch in common. */
  definition: DataModelPreviewDefinition
  /** When provided, Add entry is enabled and uses this to create a row. */
  onCreateRow?: (values: Record<string, unknown>) => Promise<void>
  'data-testid'?: string
}

function fieldTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    TEXT: 'Text',
    NUMBER: 'Number',
    DATE: 'Date',
    DATETIME: 'Date and time',
    CHECKBOX: 'Yes/No',
    SELECT: 'Single choice',
    MULTISELECT: 'Multiple choice',
    FILE: 'File',
    default: 'Text'
  }
  return labels[type] ?? labels.default
}

export const DataModelPreview: React.FC<DataModelPreviewProps> = ({
  definition,
  onCreateRow,
  'data-testid': testId = 'data-model-preview'
}) => {
  const columns = definition.columns ?? []
  const displayName = definition.display_name ?? definition.key ?? ''
  const [addOpen, setAddOpen] = useState(false)
  const [addValues, setAddValues] = useState<Record<string, string>>({})
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState(false)

  const openAdd = useCallback(() => {
    setAddError(null)
    setAddSuccess(false)
    const initial: Record<string, string> = {}
    columns.forEach(col => {
      initial[col.name] = ''
    })
    setAddValues(initial)
    setAddOpen(true)
  }, [columns])

  const setAddValue = useCallback((name: string, value: string) => {
    setAddValues(prev => ({ ...prev, [name]: value }))
  }, [])

  const submitAdd = useCallback(async () => {
    if (!onCreateRow) return
    setAddLoading(true)
    setAddError(null)
    try {
      const values: Record<string, unknown> = {}
      Object.entries(addValues).forEach(([k, v]) => {
        values[k] = v
      })
      await onCreateRow(values)
      setAddSuccess(true)
      setAddValues(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(k => {
          next[k] = ''
        })
        return next
      })
      setTimeout(() => {
        setAddOpen(false)
        setAddSuccess(false)
      }, 1500)
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Failed to create entry')
    } finally {
      setAddLoading(false)
    }
  }, [onCreateRow, addValues])

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      <Card className="gba:border-border">
        <CardHeader className="gba:border-b gba:border-border">
          <div className="gba:flex gba:items-start gba:gap-4">
            <div className="gba:p-3 gba:rounded-xl gba:bg-primary/10">
              <Database className="gba:h-8 gba:w-8 gba:text-primary" />
            </div>
            <div className="gba:flex-1 gba:min-w-0">
              <CardTitle className="gba:text-lg">{displayName}</CardTitle>
              {definition.description ? (
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{definition.description}</p>
              ) : (
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                  A data type you can use to store and manage records.
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="gba:pt-6">
          <p className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-3">Fields</p>
          <div className="gba:rounded-lg gba:border gba:border-border gba:overflow-hidden">
            <table className="gba:w-full gba:text-sm">
              <thead>
                <tr className="gba:bg-muted/50 gba:border-b gba:border-border">
                  <th className="gba:text-left gba:font-medium gba:px-4 gba:py-3 gba:text-foreground">Field</th>
                  <th className="gba:text-left gba:font-medium gba:px-4 gba:py-3 gba:text-foreground">Type</th>
                  <th className="gba:text-left gba:font-medium gba:px-4 gba:py-3 gba:text-foreground">Required</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((col, i) => (
                  <tr
                    key={i}
                    className="gba:border-b gba:border-border last:gba:border-b-0"
                    data-testid={`${testId}-field-${col.name}`}
                  >
                    <td className="gba:px-4 gba:py-3 gba:font-medium gba:text-foreground">{col.label || col.name}</td>
                    <td className="gba:px-4 gba:py-3 gba:text-muted-foreground">{fieldTypeLabel(col.type)}</td>
                    <td className="gba:px-4 gba:py-3 gba:text-muted-foreground">{col.required ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <Card className="gba:border-border">
        <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0">
          <CardTitle className="gba:text-base">Entries</CardTitle>
          {onCreateRow && (
            <Button variant="default" size="sm" onClick={openAdd} data-testid={`${testId}-add-entry`}>
              <Plus className="gba:h-4 gba:w-4 gba:mr-1" /> Add entry
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <p className="gba:text-sm gba:text-muted-foreground">
            {onCreateRow
              ? 'Create entries with the button above. To view and manage all records, open this data type in Data Manager.'
              : 'To create and manage entries, open this data type in Data Manager.'}
          </p>
        </CardContent>
      </Card>
      {onCreateRow && (
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="gba:max-w-md" data-testid={`${testId}-add-dialog`}>
            <DialogHeader>
              <DialogTitle>Add entry</DialogTitle>
            </DialogHeader>
            <div className="gba:space-y-4 gba:py-2">
              {addError && (
                <Alert variant="destructive">
                  <AlertDescription>{addError}</AlertDescription>
                </Alert>
              )}
              {addSuccess && (
                <Alert variant="success">
                  <AlertDescription>Entry created successfully.</AlertDescription>
                </Alert>
              )}
              {columns.map(col => (
                <div key={col.name} className="gba:space-y-1">
                  <Label htmlFor={`${testId}-add-${col.name}`}>{col.label || col.name}</Label>
                  <Input
                    id={`${testId}-add-${col.name}`}
                    value={addValues[col.name] ?? ''}
                    onChange={e => setAddValue(col.name, e.target.value)}
                    placeholder={col.required ? 'Required' : ''}
                    data-testid={`${testId}-add-input-${col.name}`}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button variant="default" onClick={submitAdd} disabled={addLoading} data-testid={`${testId}-add-submit`}>
                {addLoading ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
