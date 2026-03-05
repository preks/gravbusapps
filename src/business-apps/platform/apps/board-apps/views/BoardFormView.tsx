/**
 * BoardFormView - data entry form for a board sheet.
 */

import React, { useState, useCallback } from 'react'
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  toast
} from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import type { BoardColumn, FormViewConfig } from '../types'

export interface BoardFormViewProps {
  columns: BoardColumn[]
  viewConfig: FormViewConfig
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  'data-testid'?: string
}

export const BoardFormView: React.FC<BoardFormViewProps> = ({
  columns,
  viewConfig,
  onSubmit,
  'data-testid': testId = 'board-form'
}) => {
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const formFields = viewConfig.fields?.length
    ? (viewConfig.fields.map(f => columns.find(c => c.id === f || c.name === f)).filter(Boolean) as BoardColumn[])
    : columns.filter(c => c.isVisible && c.isEditable)

  const isTwoColumn = viewConfig.layout === 'two-column'

  const handleChange = useCallback((name: string, value: unknown) => {
    setValues(prev => ({ ...prev, [name]: value }))
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setIsSubmitting(true)
      try {
        await onSubmit(values)
        setValues({})
        toast.success('Row added')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to add row')
      } finally {
        setIsSubmitting(false)
      }
    },
    [values, onSubmit]
  )

  return (
    <div className="gba:p-4 gba:max-w-2xl gba:mx-auto" data-testid={testId}>
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-sm">Add new row</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className={`gba:space-y-3 ${isTwoColumn ? 'gba:grid gba:grid-cols-2 gba:gap-3 gba:space-y-0' : ''}`}>
              {formFields.map(col => (
                <div key={col.id}>
                  <Label htmlFor={`form-${col.id}`} className="gba:text-xs gba:mb-1 gba:block">
                    {col.label}
                    {col.isRequired && <span className="gba:text-destructive gba:ml-0.5">*</span>}
                  </Label>
                  <FieldInput
                    col={col}
                    value={values[col.name]}
                    onChange={v => handleChange(col.name, v)}
                    testId={`${testId}-field-${col.id}`}
                  />
                </div>
              ))}
            </div>
            <div className="gba:flex gba:justify-end gba:mt-4">
              <Button type="submit" size="sm" disabled={isSubmitting} data-testid={`${testId}-submit`}>
                <Plus className="gba:w-3.5 gba:h-3.5 gba:mr-1" />
                {viewConfig.submitLabel || 'Add row'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

interface FieldInputProps {
  col: BoardColumn
  value: unknown
  onChange: (v: unknown) => void
  testId: string
}

const FieldInput: React.FC<FieldInputProps> = ({ col, value, onChange, testId }) => {
  const strValue = value !== null && value !== undefined ? String(value) : ''

  switch (col.type) {
    case 'boolean':
      return <Checkbox checked={Boolean(value)} onCheckedChange={checked => onChange(checked)} data-testid={testId} />
    case 'number':
    case 'currency':
    case 'percentage':
    case 'rating':
      return (
        <Input
          id={`form-${col.id}`}
          type="number"
          value={strValue}
          onChange={e => onChange(Number(e.target.value))}
          className="gba:h-8 gba:text-xs"
          data-testid={testId}
        />
      )
    case 'date':
    case 'datetime':
      return (
        <Input
          id={`form-${col.id}`}
          type={col.type === 'datetime' ? 'datetime-local' : 'date'}
          value={strValue}
          onChange={e => onChange(e.target.value)}
          className="gba:h-8 gba:text-xs"
          data-testid={testId}
        />
      )
    case 'select':
    case 'status':
      return (
        <Select value={strValue} onValueChange={v => onChange(v)}>
          <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={testId}>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {col.selectOptions?.map(opt => (
              <SelectItem key={opt.value} value={opt.value} data-testid={`${testId}-opt-${opt.value}`}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    default:
      return (
        <Input
          id={`form-${col.id}`}
          value={strValue}
          onChange={e => onChange(e.target.value)}
          placeholder={`Enter ${col.label.toLowerCase()}`}
          className="gba:h-8 gba:text-xs"
          data-testid={testId}
        />
      )
  }
}
