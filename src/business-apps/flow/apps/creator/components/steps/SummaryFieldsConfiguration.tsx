import React, { useState } from 'react'
import {
  Card,
  CardContent,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@newwork/nw-design-system'
import { GripVertical, Trash2, Eye, Globe, Users, User, BarChart3, Info } from 'lucide-react'
import { SummaryField, SummaryFieldVisibility, FlowTemplate } from '../../types/flowTemplate'
import { ExpressionInput } from '../shared/ExpressionInput'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface SummaryFieldsConfigurationProps {
  template: FlowTemplate // Template for reading and updating summary fields
  context?: BusinessAppContextProps // For catalog fetching
  testId: string
  onUpdateTemplate: (updates: Partial<FlowTemplate>) => void
}

/**
 * SummaryFieldsConfiguration - Editor for workflow summary fields (Flow-level)
 *
 * Summary fields define what data is shown in the workflow summary view after completion.
 * They can contain forward references to any step in the workflow.
 */
export const SummaryFieldsConfiguration: React.FC<SummaryFieldsConfigurationProps> = ({
  template,
  context,
  testId,
  onUpdateTemplate
}) => {
  const summaryFields = template.summaryFields || []
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const handleAddField = () => {
    const newField: SummaryField = {
      id: `summary-${Date.now()}`,
      label: 'New Field',
      value: '',
      visibility: SummaryFieldVisibility.PUBLIC,
      type: 'text'
    }

    onUpdateTemplate({
      summaryFields: [...summaryFields, newField]
    })
  }

  const handleUpdateField = (index: number, updates: Partial<SummaryField>) => {
    const updated = [...summaryFields]
    updated[index] = { ...updated[index], ...updates }
    onUpdateTemplate({ summaryFields: updated })
  }

  const handleRemoveField = (index: number) => {
    const updated = summaryFields.filter((_, i) => i !== index)
    onUpdateTemplate({ summaryFields: updated })
  }

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }

    const reordered = [...summaryFields]
    const [draggedItem] = reordered.splice(draggedIndex, 1)
    reordered.splice(dropIndex, 0, draggedItem)

    onUpdateTemplate({ summaryFields: reordered })
    setDraggedIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const getVisibilityIcon = (visibility: SummaryFieldVisibility) => {
    switch (visibility) {
      case SummaryFieldVisibility.PUBLIC:
        return <Globe className="gba:h-3 gba:w-3" />
      case SummaryFieldVisibility.WORKFLOW_PARTICIPANTS:
        return <Users className="gba:h-3 gba:w-3" />
      case SummaryFieldVisibility.INITIATOR_ONLY:
        return <User className="gba:h-3 gba:w-3" />
      case SummaryFieldVisibility.STEP_PARTICIPANTS:
        return <Eye className="gba:h-3 gba:w-3" />
      default:
        return <Globe className="gba:h-3 gba:w-3" />
    }
  }

  const getVisibilityVariant = (visibility: SummaryFieldVisibility): 'default' | 'secondary' | 'outline' => {
    switch (visibility) {
      case SummaryFieldVisibility.PUBLIC:
        return 'default'
      case SummaryFieldVisibility.INITIATOR_ONLY:
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      {/* Header with compact description and info button */}
      <Alert>
        <BarChart3 className="gba:h-4 gba:w-4" />
        <AlertDescription className="gba:flex gba:items-start gba:justify-between">
          <div>
            <strong>Workflow Summary Fields</strong> are shown in the workflow summary view after completion. They can
            reference data from ANY step using expressions.
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gba:ml-2 gba:shrink-0" data-testid={`${testId}-info-button`}>
                <Info className="gba:h-4 gba:w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="gba:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="gba:flex gba:items-center gba:gap-2">
                  <BarChart3 className="gba:h-5 gba:w-5" />
                  About Summary Fields
                </DialogTitle>
              </DialogHeader>
              <div className="gba:space-y-4 gba:py-4">
                <div>
                  <h3 className="gba:font-semibold gba:text-lg gba:mb-2">When are Summary Fields shown?</h3>
                  <p className="gba:text-sm gba:text-gray-700">
                    Summary fields appear in the <strong>workflow summary view after all steps are completed</strong>.
                    They provide a consolidated view of important data from the entire workflow, making it easy to see
                    key results and decisions at a glance.
                  </p>
                </div>

                <div>
                  <h3 className="gba:font-semibold gba:text-lg gba:mb-2">What does Visibility mean?</h3>
                  <p className="gba:text-sm gba:text-gray-700 gba:mb-3">
                    Visibility controls who can see each summary field. Different fields can have different visibility
                    levels:
                  </p>
                  <div className="gba:space-y-3 gba:ml-2">
                    <div className="gba:flex gba:items-start gba:gap-3">
                      <Globe className="gba:h-5 gba:w-5 gba:text-blue-600 gba:shrink-0 gba:mt-0.5" />
                      <div>
                        <div className="gba:font-medium gba:text-sm">Public</div>
                        <div className="gba:text-sm gba:text-gray-600">
                          Anyone with workflow access can see this field
                        </div>
                      </div>
                    </div>
                    <div className="gba:flex gba:items-start gba:gap-3">
                      <Users className="gba:h-5 gba:w-5 gba:text-green-600 gba:shrink-0 gba:mt-0.5" />
                      <div>
                        <div className="gba:font-medium gba:text-sm">Workflow Participants</div>
                        <div className="gba:text-sm gba:text-gray-600">
                          Only users who participated in any step of this workflow
                        </div>
                      </div>
                    </div>
                    <div className="gba:flex gba:items-start gba:gap-3">
                      <Eye className="gba:h-5 gba:w-5 gba:text-purple-600 gba:shrink-0 gba:mt-0.5" />
                      <div>
                        <div className="gba:font-medium gba:text-sm">Step Participants</div>
                        <div className="gba:text-sm gba:text-gray-600">
                          Only users who were assigned to or completed specific steps
                        </div>
                      </div>
                    </div>
                    <div className="gba:flex gba:items-start gba:gap-3">
                      <User className="gba:h-5 gba:w-5 gba:text-orange-600 gba:shrink-0 gba:mt-0.5" />
                      <div>
                        <div className="gba:font-medium gba:text-sm">Initiator Only</div>
                        <div className="gba:text-sm gba:text-gray-600">
                          Only the person who started the workflow can see this field
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded gba:p-3">
                  <p className="gba:text-sm gba:text-blue-900">
                    <strong>💡 Tip:</strong> Summary fields can reference data from ANY step (including future steps)
                    using expressions like{' '}
                    <code className="gba:bg-blue-100 gba:px-1 gba:rounded">
                      {'{{$steps.step_1.formData.fieldName}}'}
                    </code>
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </AlertDescription>
      </Alert>

      {/* Summary fields list */}
      <div className="gba:space-y-3">
        {summaryFields.length === 0 ? (
          <div className="gba:text-center gba:py-8 gba:border-2 gba:border-dashed gba:border-gray-300 gba:rounded-lg gba:bg-gray-50">
            <BarChart3 className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:text-gray-400" />
            <p className="gba:text-sm gba:text-gray-600 gba:mb-1">No summary fields configured</p>
            <p className="gba:text-xs gba:text-gray-500">Add fields to display workflow results</p>
          </div>
        ) : (
          summaryFields.map((field, index) => {
            const isDragging = draggedIndex === index

            return (
              <Card
                key={field.id || `summary-field-${index}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`${isDragging ? 'gba:opacity-50' : ''} gba:cursor-move`}
                data-testid={`${testId}-field-${index}`}
              >
                <CardContent className="gba:p-4 gba:space-y-3">
                  {/* Header with drag handle and actions */}
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <div className="gba:cursor-grab active:gba:cursor-grabbing gba:text-gray-400 hover:gba:text-gray-600">
                        <GripVertical className="gba:h-5 gba:w-5" />
                      </div>
                      <Badge variant="outline" className="gba:text-xs">
                        Summary Field {index + 1}
                      </Badge>
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Badge variant={getVisibilityVariant(field.visibility)} className="gba:text-xs">
                        {getVisibilityIcon(field.visibility)}
                        <span className="gba:ml-1">{field.visibility}</span>
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveField(index)}
                        data-testid={`${testId}-remove-${index}`}
                      >
                        <Trash2 className="gba:h-4 gba:w-4 gba:text-red-500" />
                      </Button>
                    </div>
                  </div>

                  {/* Label input */}
                  <div className="gba:space-y-1">
                    <Label className="gba:text-sm">Display Label</Label>
                    <Input
                      value={field.label}
                      onChange={e => handleUpdateField(index, { label: e.target.value })}
                      placeholder="Employee Name"
                      data-testid={`${testId}-label-${index}`}
                    />
                  </div>

                  {/* Expression input */}
                  <div className="gba:space-y-1">
                    <Label className="gba:text-sm">Value Expression</Label>
                    <ExpressionInput
                      value={field.value}
                      onChange={val => handleUpdateField(index, { value: val })}
                      mode="expression"
                      validateOnChange={true}
                      template={template}
                      stepIndex={-1} // -1 indicates flow-level (can reference any step)
                      context={context}
                      useTreeBuilder={true}
                      placeholder="Click tree icon to build expression..."
                      data-testid={`${testId}-expression-${index}`}
                    />
                  </div>

                  {/* Visibility and Type selectors */}
                  <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                    <div className="gba:space-y-1">
                      <Label className="gba:text-sm">Visibility</Label>
                      <Select
                        value={field.visibility}
                        onValueChange={val => handleUpdateField(index, { visibility: val as SummaryFieldVisibility })}
                      >
                        <SelectTrigger data-testid={`${testId}-visibility-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SummaryFieldVisibility.PUBLIC}>
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <Globe className="gba:h-4 gba:w-4" />
                              Public
                            </div>
                          </SelectItem>
                          <SelectItem value={SummaryFieldVisibility.WORKFLOW_PARTICIPANTS}>
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <Users className="gba:h-4 gba:w-4" />
                              Workflow Participants
                            </div>
                          </SelectItem>
                          <SelectItem value={SummaryFieldVisibility.STEP_PARTICIPANTS}>
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <Eye className="gba:h-4 gba:w-4" />
                              Step Participants
                            </div>
                          </SelectItem>
                          <SelectItem value={SummaryFieldVisibility.INITIATOR_ONLY}>
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <User className="gba:h-4 gba:w-4" />
                              Initiator Only
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="gba:space-y-1">
                      <Label className="gba:text-sm">Data Type</Label>
                      <Select
                        value={field.type || 'text'}
                        onValueChange={val => handleUpdateField(index, { type: val as any })}
                      >
                        <SelectTrigger data-testid={`${testId}-type-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="currency">Currency</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Optional format field for dates/numbers */}
                  {(field.type === 'date' || field.type === 'number' || field.type === 'currency') && (
                    <div className="gba:space-y-1">
                      <Label className="gba:text-sm">Format (optional)</Label>
                      <Input
                        value={field.format || ''}
                        onChange={e => handleUpdateField(index, { format: e.target.value })}
                        placeholder={
                          field.type === 'date' ? 'YYYY-MM-DD' : field.type === 'currency' ? 'USD' : '0,0.00'
                        }
                        data-testid={`${testId}-format-${index}`}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Add button */}
      <div className="gba:flex gba:justify-center">
        <Button variant="outline" onClick={handleAddField} className="gba:w-full" data-testid={`${testId}-add-field`}>
          Add Summary Field
        </Button>
      </div>
    </div>
  )
}

// Export trigger component for accordion-style usage (Flow-level)
export const SummaryFieldsTrigger: React.FC<{ template: FlowTemplate }> = ({ template }) => {
  const summaryFields = template.summaryFields || []

  return (
    <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:pr-4">
      <div className="gba:flex gba:items-center gba:gap-2">
        <BarChart3 className="gba:h-4 gba:w-4" />
        Summary Fields
      </div>
      <div className="gba:flex gba:items-center gba:gap-2">
        {summaryFields.length > 0 && (
          <Badge variant="secondary" className="gba:text-xs">
            {summaryFields.length} {summaryFields.length === 1 ? 'field' : 'fields'}
          </Badge>
        )}
      </div>
    </div>
  )
}
