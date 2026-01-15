import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
  Label,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge
} from '@newwork/nw-design-system'
import { Eye, Calendar, Upload, Hash, FileText, CheckSquare, List, Database } from 'lucide-react'
import { ColumnDefinition, InputType } from '../types'

interface SchemaPreviewProps {
  columns: ColumnDefinition[]
  'data-testid'?: string
}

/**
 * Schema Preview Component
 * Renders a preview of how the form will look based on the columns definition
 */
export const SchemaPreview: React.FC<SchemaPreviewProps> = ({ columns, 'data-testid': testId = 'schema-preview' }) => {
  const getSelectPlaceholder = (column: ColumnDefinition): string => {
    if (column.dataSource) {
      return `Options from ${column.dataSource.catalog || 'catalog'}...`
    }
    if (column.options?.length) {
      return 'Select option...'
    }
    return 'No options defined'
  }

  const getFieldIcon = (type: InputType) => {
    switch (type) {
      case InputType.TEXT:
        return <FileText className="gba:h-4 gba:w-4" />
      case InputType.TEXTAREA:
        return <FileText className="gba:h-4 gba:w-4" />
      case InputType.NUMBER:
        return <Hash className="gba:h-4 gba:w-4" />
      case InputType.DATE:
      case InputType.DATETIME:
        return <Calendar className="gba:h-4 gba:w-4" />
      case InputType.CHECKBOX:
        return <CheckSquare className="gba:h-4 gba:w-4" />
      case InputType.SELECT:
      case InputType.MULTISELECT:
        return <List className="gba:h-4 gba:w-4" />
      case InputType.FILE:
        return <Upload className="gba:h-4 gba:w-4" />
      default:
        return <FileText className="gba:h-4 gba:w-4" />
    }
  }

  const renderField = (column: ColumnDefinition, index: number) => {
    const fieldId = `${testId}-field-${index}`

    switch (column.type) {
      case InputType.TEXT:
        return (
          <Input id={fieldId} placeholder={`Enter ${column.label.toLowerCase()}...`} disabled data-testid={fieldId} />
        )

      case InputType.TEXTAREA:
        return (
          <Textarea
            id={fieldId}
            placeholder={`Enter ${column.label.toLowerCase()}...`}
            rows={3}
            disabled
            data-testid={fieldId}
          />
        )

      case InputType.NUMBER:
        return <Input id={fieldId} type="number" placeholder="0" disabled data-testid={fieldId} />

      case InputType.DATE:
        return <Input id={fieldId} type="date" disabled data-testid={fieldId} />

      case InputType.DATETIME:
        return <Input id={fieldId} type="datetime-local" disabled data-testid={fieldId} />

      case InputType.CHECKBOX:
        return (
          <div className="gba:flex gba:items-center gba:gap-2">
            <Checkbox id={fieldId} disabled data-testid={fieldId} />
            <Label htmlFor={fieldId} className="gba:text-sm gba:text-muted-foreground gba:cursor-not-allowed">
              Yes / No
            </Label>
          </div>
        )

      case InputType.SELECT:
      case InputType.MULTISELECT:
        return (
          <Select disabled>
            <SelectTrigger data-testid={fieldId}>
              <SelectValue placeholder={getSelectPlaceholder(column)} />
            </SelectTrigger>
            <SelectContent>
              {column.dataSource ? (
                <SelectItem value="_catalog" disabled>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Database className="gba:h-4 gba:w-4" />
                    Dynamic from catalog
                  </div>
                </SelectItem>
              ) : (
                (column.options || []).map(opt => (
                  <SelectItem key={opt.value || opt.label} value={opt.value || opt.label}>
                    {opt.label || opt.value}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )

      case InputType.FILE:
        return (
          <div
            className="gba:border-2 gba:border-dashed gba:border-border gba:rounded-lg gba:p-6 gba:text-center gba:bg-muted/30"
            data-testid={fieldId}
          >
            <Upload className="gba:h-6 gba:w-6 gba:mx-auto gba:mb-2 gba:text-muted-foreground" />
            <p className="gba:text-sm gba:text-muted-foreground">Drag & drop files here or click to upload</p>
          </div>
        )

      default:
        return <Input id={fieldId} placeholder="Unknown field type" disabled data-testid={fieldId} />
    }
  }

  if (columns.length === 0) {
    return (
      <div
        className="gba:text-center gba:py-16 gba:text-muted-foreground gba:bg-muted/30 gba:rounded-lg"
        data-testid={`${testId}-empty`}
      >
        <Eye className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4 gba:opacity-50" />
        <p className="gba:text-lg gba:font-medium">No columns to preview</p>
        <p className="gba:text-sm">Add columns in the Columns tab to see a preview</p>
      </div>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      {/* Preview Header */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:pb-2 gba:border-b gba:border-border">
        <Eye className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
        <span className="gba:text-sm gba:font-medium">Form Preview</span>
        <Badge variant="secondary" className="gba:text-xs">
          {columns.length} fields
        </Badge>
      </div>

      {/* Preview Form */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-lg">Data Entry Form</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-6">
          {columns.map(column => (
            <div key={column.name} className="gba:space-y-2">
              <Label className="gba:flex gba:items-center gba:gap-2">
                {getFieldIcon(column.type)}
                {column.label || column.name}
                {column.required && <span className="gba:text-destructive">*</span>}
              </Label>
              {renderField(column, columns.indexOf(column))}
              <p className="gba:text-xs gba:text-muted-foreground gba:font-mono">Field key: {column.name}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Field Summary */}
      <div className="gba:bg-muted/50 gba:rounded-lg gba:p-4">
        <h4 className="gba:text-sm gba:font-medium gba:mb-3">Field Summary</h4>
        <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-3">
          {columns.map(col => (
            <div
              key={col.name}
              className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:bg-background gba:rounded gba:px-2 gba:py-1.5"
            >
              {getFieldIcon(col.type)}
              <span className="gba:truncate gba:flex-1">{col.label}</span>
              {col.required && (
                <Badge variant="destructive" className="gba:text-[10px] gba:px-1">
                  REQ
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
