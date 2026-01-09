/**
 * ColumnMappingEditor Component
 *
 * Visual editor for configuring column-to-workflow parameter mappings.
 */

import React, { useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge
} from '@newwork/nw-design-system'
import { Plus, Trash2, ArrowRight, ArrowLeft, ArrowLeftRight } from 'lucide-react'
import type { ColumnWorkflowMapping, MappingDirection, ResultMapping, AggregationMethod } from '../../types/automation'
import type { SpreadsheetColumn } from '../../types/spreadsheet'

export interface ColumnMappingEditorProps {
  /** Available spreadsheet columns */
  columns: SpreadsheetColumn[]
  /** Current column-to-workflow mappings */
  columnMappings: ColumnWorkflowMapping[]
  /** Current result mappings */
  resultMappings: ResultMapping[]
  /** Callback when column mappings change */
  onColumnMappingsChange: (mappings: ColumnWorkflowMapping[]) => void
  /** Callback when result mappings change */
  onResultMappingsChange: (mappings: ResultMapping[]) => void
  /** Whether to show result mappings section */
  showResultMappings?: boolean
  /** Data test ID */
  'data-testid'?: string
}

const DIRECTION_OPTIONS: { value: MappingDirection; label: string; icon: React.FC<{ className?: string }> }[] = [
  { value: 'toWorkflow', label: 'To Workflow', icon: ArrowRight },
  { value: 'fromWorkflow', label: 'From Workflow', icon: ArrowLeft },
  { value: 'bidirectional', label: 'Both Ways', icon: ArrowLeftRight }
]

const TRANSFORM_OPTIONS = [
  { value: '', label: 'No Transform' },
  { value: 'uppercase', label: 'Uppercase' },
  { value: 'lowercase', label: 'Lowercase' },
  { value: 'trim', label: 'Trim' },
  { value: 'number', label: 'To Number' },
  { value: 'date', label: 'To Date' },
  { value: 'boolean', label: 'To Boolean' }
]

const AGGREGATION_OPTIONS: { value: AggregationMethod; label: string }[] = [
  { value: 'latest', label: 'Latest Value' },
  { value: 'append', label: 'Append' },
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'count', label: 'Count' }
]

/**
 * ColumnMappingEditor Component
 */
export const ColumnMappingEditor: React.FC<ColumnMappingEditorProps> = ({
  columns,
  columnMappings,
  resultMappings,
  onColumnMappingsChange,
  onResultMappingsChange,
  showResultMappings = true,
  'data-testid': testId = 'column-mapping-editor'
}) => {
  // Add new column mapping
  const addColumnMapping = useCallback(() => {
    if (columns.length === 0) return

    const newMapping: ColumnWorkflowMapping = {
      columnId: columns[0].id,
      columnName: columns[0].name,
      workflowParameter: '',
      direction: 'toWorkflow'
    }
    onColumnMappingsChange([...columnMappings, newMapping])
  }, [columns, columnMappings, onColumnMappingsChange])

  // Update column mapping
  const updateColumnMapping = useCallback(
    (index: number, updates: Partial<ColumnWorkflowMapping>) => {
      const updated = columnMappings.map((mapping, i) =>
        i === index ? { ...mapping, ...updates } : mapping
      )
      onColumnMappingsChange(updated)
    },
    [columnMappings, onColumnMappingsChange]
  )

  // Remove column mapping
  const removeColumnMapping = useCallback(
    (index: number) => {
      onColumnMappingsChange(columnMappings.filter((_, i) => i !== index))
    },
    [columnMappings, onColumnMappingsChange]
  )

  // Add new result mapping
  const addResultMapping = useCallback(() => {
    if (columns.length === 0) return

    const newMapping: ResultMapping = {
      workflowOutputPath: '',
      targetColumnId: columns[0].id,
      aggregation: 'latest'
    }
    onResultMappingsChange([...resultMappings, newMapping])
  }, [columns, resultMappings, onResultMappingsChange])

  // Update result mapping
  const updateResultMapping = useCallback(
    (index: number, updates: Partial<ResultMapping>) => {
      const updated = resultMappings.map((mapping, i) =>
        i === index ? { ...mapping, ...updates } : mapping
      )
      onResultMappingsChange(updated)
    },
    [resultMappings, onResultMappingsChange]
  )

  // Remove result mapping
  const removeResultMapping = useCallback(
    (index: number) => {
      onResultMappingsChange(resultMappings.filter((_, i) => i !== index))
    },
    [resultMappings, onResultMappingsChange]
  )

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* Column Mappings */}
      <Card>
        <CardHeader className="gba:pb-3">
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <CardTitle className="gba:text-base">Column Mappings</CardTitle>
              <CardDescription>
                Map spreadsheet columns to workflow parameters
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addColumnMapping}>
              <Plus className="gba:w-4 gba:h-4 gba:mr-1" />
              Add Mapping
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {columnMappings.length === 0 ? (
            <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
              <p className="gba:mb-3">No column mappings defined.</p>
              <p className="gba:text-sm">
                Mappings allow data to flow between your spreadsheet and workflows.
              </p>
            </div>
          ) : (
            <div className="gba:space-y-4">
              {columnMappings.map((mapping, index) => {
                const DirectionIcon = DIRECTION_OPTIONS.find(d => d.value === mapping.direction)?.icon || ArrowRight

                return (
                  <div
                    key={index}
                    className="gba:flex gba:items-end gba:gap-3 gba:p-4 gba:bg-muted/50 gba:rounded-lg"
                  >
                    {/* Source Column */}
                    <div className="gba:flex-1">
                      <Label className="gba:text-xs gba:text-muted-foreground gba:mb-1 gba:block">
                        Spreadsheet Column
                      </Label>
                      <Select
                        value={mapping.columnId}
                        onValueChange={value => {
                          const column = columns.find(c => c.id === value)
                          updateColumnMapping(index, {
                            columnId: value,
                            columnName: column?.name || value
                          })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map(column => (
                            <SelectItem key={column.id} value={column.id}>
                              <div className="gba:flex gba:items-center gba:gap-2">
                                <span>{column.label}</span>
                                <Badge variant="outline" className="gba:text-xs">
                                  {column.type}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Direction */}
                    <div className="gba:w-32">
                      <Label className="gba:text-xs gba:text-muted-foreground gba:mb-1 gba:block">
                        Direction
                      </Label>
                      <Select
                        value={mapping.direction}
                        onValueChange={(value: MappingDirection) =>
                          updateColumnMapping(index, { direction: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DIRECTION_OPTIONS.map(option => {
                            const Icon = option.icon
                            return (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <Icon className="gba:w-4 gba:h-4" />
                                  <span>{option.label}</span>
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Workflow Parameter */}
                    <div className="gba:flex-1">
                      <Label className="gba:text-xs gba:text-muted-foreground gba:mb-1 gba:block">
                        Workflow Parameter
                      </Label>
                      <Input
                        value={mapping.workflowParameter}
                        onChange={e => updateColumnMapping(index, { workflowParameter: e.target.value })}
                        placeholder="e.g., step_0.formData.amount"
                      />
                    </div>

                    {/* Transform */}
                    <div className="gba:w-28">
                      <Label className="gba:text-xs gba:text-muted-foreground gba:mb-1 gba:block">
                        Transform
                      </Label>
                      <Select
                        value={mapping.transform || ''}
                        onValueChange={value =>
                          updateColumnMapping(index, { transform: value || undefined } as Partial<ColumnWorkflowMapping>)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSFORM_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Remove */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeColumnMapping(index)}
                      className="gba:text-destructive gba:hover:text-destructive"
                    >
                      <Trash2 className="gba:w-4 gba:h-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result Mappings */}
      {showResultMappings && (
        <Card>
          <CardHeader className="gba:pb-3">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <CardTitle className="gba:text-base">Result Mappings</CardTitle>
                <CardDescription>
                  Write workflow results back to spreadsheet columns
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={addResultMapping}>
                <Plus className="gba:w-4 gba:h-4 gba:mr-1" />
                Add Result Mapping
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {resultMappings.length === 0 ? (
              <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                <p className="gba:mb-3">No result mappings defined.</p>
                <p className="gba:text-sm">
                  Result mappings update your spreadsheet when workflows complete.
                </p>
              </div>
            ) : (
              <div className="gba:space-y-4">
                {resultMappings.map((mapping, index) => (
                  <div
                    key={index}
                    className="gba:flex gba:items-end gba:gap-3 gba:p-4 gba:bg-muted/50 gba:rounded-lg"
                  >
                    {/* Workflow Output Path */}
                    <div className="gba:flex-1">
                      <Label className="gba:text-xs gba:text-muted-foreground gba:mb-1 gba:block">
                        Workflow Output Path
                      </Label>
                      <Input
                        value={mapping.workflowOutputPath}
                        onChange={e =>
                          updateResultMapping(index, { workflowOutputPath: e.target.value })
                        }
                        placeholder="e.g., step_0.formData.decision"
                      />
                    </div>

                    {/* Arrow */}
                    <div className="gba:w-10 gba:flex gba:justify-center gba:pb-2">
                      <ArrowRight className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                    </div>

                    {/* Target Column */}
                    <div className="gba:flex-1">
                      <Label className="gba:text-xs gba:text-muted-foreground gba:mb-1 gba:block">
                        Target Column
                      </Label>
                      <Select
                        value={mapping.targetColumnId}
                        onValueChange={value =>
                          updateResultMapping(index, { targetColumnId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {columns.map(column => (
                            <SelectItem key={column.id} value={column.id}>
                              <div className="gba:flex gba:items-center gba:gap-2">
                                <span>{column.label}</span>
                                <Badge variant="outline" className="gba:text-xs">
                                  {column.type}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Aggregation */}
                    <div className="gba:w-32">
                      <Label className="gba:text-xs gba:text-muted-foreground gba:mb-1 gba:block">
                        Aggregation
                      </Label>
                      <Select
                        value={mapping.aggregation || 'latest'}
                        onValueChange={(value: AggregationMethod) =>
                          updateResultMapping(index, { aggregation: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AGGREGATION_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Remove */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeResultMapping(index)}
                      className="gba:text-destructive gba:hover:text-destructive"
                    >
                      <Trash2 className="gba:w-4 gba:h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ColumnMappingEditor
