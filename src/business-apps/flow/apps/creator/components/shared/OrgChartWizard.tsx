import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Badge,
  Alert
} from '@newwork/nw-design-system'
import { Wand2, Info } from 'lucide-react'
import { FlowTemplate, AssignmentMode } from '../../types/flowTemplate'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface OrgChartWizardProps {
  template: FlowTemplate
  stepIndex: number
  assignmentMode: AssignmentMode
  onExpressionGenerated: (expression: string) => void
  'data-testid'?: string
}

// OrgChart relationship types
const RELATIONSHIP_TYPES = [
  {
    id: 'managerByUserId',
    label: 'Manager',
    description: 'Direct manager of a user',
    expressionTemplate: '$orgchart.managerByUserId[{source}]'
  },
  {
    id: 'skipLevelManagerByUserId',
    label: 'Skip-Level Manager',
    description: "Manager's manager (2 levels up)",
    expressionTemplate: '$orgchart.skipLevelManagerByUserId[{source}]'
  },
  {
    id: 'directReportsByUserId',
    label: 'Direct Reports',
    description: 'All team members (creates multiple tasks)',
    expressionTemplate: '$orgchart.directReportsByUserId[{source}]'
  },
  {
    id: 'userIdByEmployeeId',
    label: 'Direct Assignment',
    description: 'Assign directly to the selected employee from the field',
    expressionTemplate: '$orgchart.userIdByEmployeeId[{source}]'
  }
] as const

// Source types
const SOURCE_TYPES = [
  {
    id: 'workflow_initiator',
    label: 'Workflow Initiator',
    description: 'The user who started this workflow',
    expressionValue: '$workflow.initiator',
    availableInMode: ['ASSIGN', 'ASSIGN_DEFERRED']
  },
  {
    id: 'workflow_input',
    label: 'Workflow Input or Previous Step Field',
    description: 'An employee-related field from workflow input or any previous step',
    expressionValue: '$workflow.input.{field}',
    availableInMode: ['ASSIGN', 'ASSIGN_DEFERRED'],
    requiresFieldSelection: true
  }
] as const

/**
 * OrgChart Assignment Wizard Component
 * Simple dropdown-based interface for building orgchart expressions
 */
export const OrgChartWizard: React.FC<OrgChartWizardProps> = ({
  template,
  stepIndex,
  assignmentMode,
  onExpressionGenerated,
  'data-testid': testId = 'orgchart-wizard'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [relationshipType, setRelationshipType] = useState<string>('')
  const [sourceType, setSourceType] = useState<string>('')
  const [selectedField, setSelectedField] = useState<string>('')
  const [generatedExpression, setGeneratedExpression] = useState<string>('')

  // Helper function to detect if a field is employee-related
  const isEmployeeField = (field: any): boolean => {
    if (!field) return false
    const fieldName = field.name?.toLowerCase() || ''
    const fieldType = field.type?.toLowerCase() || ''
    const fieldEntity = field.entity?.toLowerCase() || ''

    // Check dataSource.entity (nested property)
    const dataSourceEntity = field.dataSource?.entity?.toLowerCase() || ''

    // Check if field is explicitly marked as employee entity
    if (fieldEntity.includes('employee') || fieldEntity.includes('user')) return true
    if (dataSourceEntity.includes('employee') || dataSourceEntity.includes('user')) return true

    // Check if dataSource type is ENTITY with employee entity
    if (field.dataSource?.type === 'ENTITY' && dataSourceEntity) {
      if (dataSourceEntity.includes('employee') || dataSourceEntity.includes('user')) return true
    }

    // Check common employee field naming patterns
    const employeePatterns = [
      'employee',
      'user',
      'assignee',
      'requester',
      'approver',
      'manager',
      'supervisor',
      'owner',
      'responsible'
    ]

    return employeePatterns.some(pattern => fieldName.includes(pattern) || fieldType.includes(pattern))
  }

  // Get available source types based on assignment mode
  const availableSourceTypes = useMemo(() => {
    return SOURCE_TYPES.filter(source => source.availableInMode.includes(assignmentMode as any))
  }, [assignmentMode])

  // Get available previous steps
  const availablePreviousSteps = useMemo(() => {
    if (!template?.steps) return []
    return template.steps.map((step, index) => ({ step, index })).filter(({ index }) => index < stepIndex)
  }, [template, stepIndex])

  // Get available fields based on source type
  const availableFields = useMemo(() => {
    const fields: Array<{ id: string; label: string; source: 'workflow' | 'step'; stepIndex?: number }> = []

    // For workflow_input: collect ONLY employee entity fields from workflow input AND previous steps
    if (sourceType === 'workflow_input') {
      // Add employee fields from workflow input schema
      const inputSchema = (template as any)?.inputSchema
      if (inputSchema?.form) {
        inputSchema.form
          .filter((field: any) => isEmployeeField(field))
          .forEach((field: any) => {
            fields.push({
              id: field.name,
              label: `${field.label || field.name} (Workflow Input)`,
              source: 'workflow'
            })
          })
      }

      // Add ONLY employee entity fields from all previous steps
      availablePreviousSteps.forEach(({ step, index }) => {
        if (step?.form) {
          step.form
            .filter((field: any) => isEmployeeField(field))
            .forEach((field: any) => {
              fields.push({
                id: `step_${index}__${field.name}`,
                label: `${field.label || field.name} (Step ${index + 1}: ${step.title || 'Untitled'})`,
                source: 'step',
                stepIndex: index
              })
            })
        }
      })
    }

    return fields
  }, [sourceType, template, availablePreviousSteps])

  // Generate expression based on selections
  useEffect(() => {
    if (!relationshipType || !sourceType) {
      setGeneratedExpression('')
      return
    }

    const relationship = RELATIONSHIP_TYPES.find(r => r.id === relationshipType)
    const source = SOURCE_TYPES.find(s => s.id === sourceType)

    if (!relationship || !source) {
      setGeneratedExpression('')
      return
    }

    if ((source as any).requiresFieldSelection && !selectedField) {
      setGeneratedExpression('')
      return
    }

    let sourceExpression = ''

    // Handle workflow_input with field source detection
    if (sourceType === 'workflow_input' && selectedField) {
      // Look up the field from availableFields to get its source
      const field = availableFields.find(f => f.id === selectedField)

      if (!field) {
        setGeneratedExpression('')
        return
      }

      if (field.source === 'step') {
        // Extract step index and field name from the composite ID
        const match = selectedField.match(/^step_(\d+)__(.+)$/)
        if (match) {
          const stepIdx = match[1]
          const fieldName = match[2]
          sourceExpression = `$steps.step_${stepIdx}.formData.${fieldName}`
        } else {
          setGeneratedExpression('')
          return
        }
      } else if (field.source === 'workflow') {
        // Workflow input field
        sourceExpression = `$workflow.input.${selectedField}`
      }
    }
    // Handle workflow_initiator
    else if (sourceType === 'workflow_initiator') {
      sourceExpression = '$workflow.initiator'
    }

    if (!sourceExpression) {
      setGeneratedExpression('')
      return
    }

    const fullExpression = relationship.expressionTemplate.replace('{source}', sourceExpression)
    setGeneratedExpression(`{{${fullExpression}}}`)
  }, [relationshipType, sourceType, selectedField, availableFields])

  // Reset dependent selections when source type changes
  useEffect(() => {
    setSelectedField('')
  }, [sourceType])

  // Handle field selection
  const handleFieldSelect = (fieldId: string) => {
    setSelectedField(fieldId)
  }

  const handleAddExpression = () => {
    if (generatedExpression) {
      onExpressionGenerated(generatedExpression)
      // Reset wizard and close modal after adding
      setRelationshipType('')
      setSourceType('')
      setSelectedField('')
      setGeneratedExpression('')
      setIsOpen(false)
    }
  }

  const handleCancel = () => {
    // Reset wizard and close modal
    setRelationshipType('')
    setSourceType('')
    setSelectedField('')
    setGeneratedExpression('')
    setIsOpen(false)
  }

  const currentSourceType = SOURCE_TYPES.find(s => s.id === sourceType)

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gba:w-full gba:justify-start gba:gap-2"
        data-testid={`${testId}-trigger`}
        type="button"
      >
        <Wand2 className="gba:w-4 gba:h-4" />
        <span>{getTranslationFromI18nKeyAndLabel('flow.creator.orgchartBuilder', 'OrgChart Assignment Builder')}</span>
        <Badge variant="outline" className="gba:ml-auto gba:text-xs">
          Quick Setup
        </Badge>
      </Button>

      {/* Modal Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="gba:w-[600px] gba:max-w-[90vw] gba:max-h-[85vh] gba:overflow-hidden gba:flex gba:flex-col">
          <DialogHeader className="gba:flex-shrink-0 gba:pb-4 gba:border-b">
            <DialogTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg gba:font-semibold">
              <Wand2 className="gba:w-5 gba:h-5 gba:text-blue-600" />
              {getTranslationFromI18nKeyAndLabel('flow.creator.orgchartBuilder', 'OrgChart Assignment Builder')}
            </DialogTitle>
            <DialogDescription className="gba:text-sm gba:text-gray-600 gba:mt-1">
              Build orgchart-based assignment expressions using a simple wizard interface
            </DialogDescription>
          </DialogHeader>

          <div className="gba:flex-1 gba:overflow-y-auto gba:space-y-5 gba:py-6 gba:px-1">
            {/* Mode restriction alert */}
            {assignmentMode === AssignmentMode.ASSIGN && (
              <Alert variant="default" className="gba:border-amber-200 gba:bg-amber-50">
                <Info className="gba:w-4 gba:h-4 gba:text-amber-600" />
                <div className="gba:text-sm gba:text-amber-900">
                  <strong className="gba:font-semibold">ASSIGN Mode:</strong> Can use Workflow Initiator or fields from
                  Workflow Input and Previous Steps.
                </div>
              </Alert>
            )}

            {/* Step 1: Select Relationship Type */}
            <div className="gba:space-y-2">
              <Label htmlFor="relationship-type" className="gba:text-sm gba:font-semibold gba:text-gray-900">
                1. Assign to
              </Label>
              <Select value={relationshipType} onValueChange={setRelationshipType}>
                <SelectTrigger
                  id="relationship-type"
                  data-testid={`${testId}-relationship-select`}
                  className="gba:text-left"
                >
                  <SelectValue placeholder="Select relationship..." />
                </SelectTrigger>
                <SelectContent className="gba:w-[560px]">
                  {RELATIONSHIP_TYPES.map(rel => (
                    <SelectItem key={rel.id} value={rel.id} className="gba:py-3">
                      <div className="gba:flex gba:flex-col gba:gap-0.5">
                        <span className="gba:font-medium gba:text-sm">{rel.label}</span>
                        <span className="gba:text-xs gba:text-gray-500 gba:leading-tight">{rel.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Select Source Type */}
            <div className="gba:space-y-2">
              <Label htmlFor="source-type" className="gba:text-sm gba:font-semibold gba:text-gray-900">
                2. Of
              </Label>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger id="source-type" data-testid={`${testId}-source-select`} className="gba:text-left">
                  <SelectValue placeholder="Select source..." />
                </SelectTrigger>
                <SelectContent className="gba:w-[560px]">
                  {availableSourceTypes.map(source => (
                    <SelectItem key={source.id} value={source.id} className="gba:py-3">
                      <div className="gba:flex gba:flex-col gba:gap-0.5">
                        <span className="gba:font-medium gba:text-sm">{source.label}</span>
                        <span className="gba:text-xs gba:text-gray-500 gba:leading-tight">{source.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 3: Select Field (if needed) */}
            {(currentSourceType as any)?.requiresFieldSelection && (
              <div className="gba:space-y-2">
                <Label htmlFor="field-select" className="gba:text-sm gba:font-semibold gba:text-gray-900">
                  3. Employee Field
                </Label>
                {availableFields.length > 0 ? (
                  <Select value={selectedField} onValueChange={handleFieldSelect}>
                    <SelectTrigger id="field-select" data-testid={`${testId}-field-select`} className="gba:text-left">
                      <SelectValue placeholder="Select an employee field..." />
                    </SelectTrigger>
                    <SelectContent className="gba:w-[560px]">
                      {availableFields.map(field => (
                        <SelectItem key={field.id} value={field.id} className="gba:py-2.5">
                          <span className="gba:text-sm">{field.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Alert variant="default" className="gba:border-blue-200 gba:bg-blue-50">
                    <Info className="gba:w-4 gba:h-4 gba:text-blue-600" />
                    <div className="gba:text-sm gba:text-blue-900">
                      No employee-related fields found in workflow input or previous steps. Add fields with employee
                      entity to your workflow input schema or previous step forms.
                    </div>
                  </Alert>
                )}
              </div>
            )}

            {/* Generated Expression Preview */}
            {generatedExpression && (
              <div className="gba:space-y-2.5 gba:pt-4 gba:border-t gba:border-gray-200">
                <Label className="gba:text-sm gba:font-semibold gba:text-gray-900">Generated Expression</Label>
                <div className="gba:w-full gba:p-3 gba:bg-purple-50 gba:border gba:border-purple-200 gba:rounded-md">
                  <code className="gba:font-mono gba:text-xs gba:text-purple-900 gba:break-all">
                    {generatedExpression}
                  </code>
                </div>
              </div>
            )}

            {/* Help text */}
            {!generatedExpression && (
              <div className="gba:flex gba:items-start gba:gap-3 gba:p-4 gba:bg-blue-50 gba:rounded-md gba:border gba:border-blue-200">
                <Info className="gba:w-5 gba:h-5 gba:text-blue-600 gba:flex-shrink-0 gba:mt-0.5" />
                <div className="gba:text-sm gba:text-blue-900 gba:leading-relaxed">
                  <strong className="gba:font-semibold">Quick Guide:</strong> Select options above to build an
                  orgchart-based assignment expression. The wizard will guide you through each step.
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons - Fixed at bottom */}
          <div className="gba:flex-shrink-0 gba:flex gba:gap-3 gba:pt-4 gba:pb-2 gba:px-1 gba:border-t gba:border-gray-200">
            <Button variant="outline" onClick={handleCancel} className="gba:flex-1 gba:h-10" type="button">
              Cancel
            </Button>
            <Button
              onClick={handleAddExpression}
              disabled={!generatedExpression}
              className="gba:flex-1 gba:h-10"
              type="button"
            >
              Add to Assignment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
