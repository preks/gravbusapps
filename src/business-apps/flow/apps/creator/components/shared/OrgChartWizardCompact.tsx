import React, { useState, useEffect, useMemo } from 'react'
import {
  Card,
  CardContent,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Badge,
  Alert,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@newwork/nw-design-system'
import { Wand2, Code2, Info, Maximize2 } from 'lucide-react'
import { FlowTemplate, AssignmentMode } from '../../types/flowTemplate'

interface OrgChartWizardCompactProps {
  template: FlowTemplate
  stepIndex: number
  assignmentMode: AssignmentMode
  onExpressionGenerated: (expression: string) => void
  displayMode?: 'inline' | 'collapsible' | 'modal' | 'drawer'
  'data-testid'?: string
}

// Relationship types and source types (same as before)
const RELATIONSHIP_TYPES = [
  {
    id: 'managerByUserId',
    label: 'Manager',
    description: 'Direct manager of a user',
    expressionTemplate: '$orgchart.managerByUserId[{source}]',
    supportsArrayResult: false
  },
  {
    id: 'skipLevelManagerByUserId',
    label: 'Skip-Level Manager',
    description: "Manager's manager (2 levels up)",
    expressionTemplate: '$orgchart.skipLevelManagerByUserId[{source}]',
    supportsArrayResult: false
  },
  {
    id: 'directReportsByUserId',
    label: 'Direct Reports',
    description: 'All team members reporting to a user',
    expressionTemplate: '$orgchart.directReportsByUserId[{source}]',
    supportsArrayResult: true
  },
  {
    id: 'userIdByEmployeeId',
    label: 'Convert Employee ID to User ID',
    description: 'Convert an employee ID to a user ID',
    expressionTemplate: '$orgchart.userIdByEmployeeId[{source}]',
    supportsArrayResult: false
  }
] as const

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
    label: 'Workflow Input Field',
    description: 'A field from the workflow input data',
    expressionValue: '$workflow.input.{field}',
    availableInMode: ['ASSIGN', 'ASSIGN_DEFERRED'],
    requiresFieldSelection: true
  },
  {
    id: 'previous_step',
    label: 'Previous Step Form Data',
    description: 'A field from a previous step form',
    expressionValue: '$steps.step_{stepIndex}.formData.{field}',
    availableInMode: ['ASSIGN_DEFERRED'],
    requiresStepSelection: true,
    requiresFieldSelection: true
  }
] as const

/**
 * Wizard Core Component (reusable in different display modes)
 */
const WizardCore: React.FC<{
  template: FlowTemplate
  stepIndex: number
  assignmentMode: AssignmentMode
  onExpressionGenerated: (expression: string) => void
  onClose?: () => void
  testId?: string
}> = ({ template, stepIndex, assignmentMode, onExpressionGenerated, onClose, testId = 'orgchart-wizard' }) => {
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple')
  const [relationshipType, setRelationshipType] = useState<string>('')
  const [sourceType, setSourceType] = useState<string>('')
  const [selectedStep, setSelectedStep] = useState<number | null>(null)
  const [selectedField, setSelectedField] = useState<string>('')
  const [generatedExpression, setGeneratedExpression] = useState<string>('')

  const availableSourceTypes = useMemo(() => {
    return SOURCE_TYPES.filter(source => source.availableInMode.includes(assignmentMode))
  }, [assignmentMode])

  const availablePreviousSteps = useMemo(() => {
    if (!template?.steps) return []
    return template.steps.map((step, index) => ({ step, index })).filter(({ index }) => index < stepIndex)
  }, [template, stepIndex])

  const availableFields = useMemo(() => {
    if (sourceType === 'previous_step' && selectedStep !== null) {
      const step = template?.steps?.[selectedStep]
      if (step?.form) {
        return step.form.map(field => ({
          id: field.name,
          label: field.label || field.name
        }))
      }
    }
    return []
  }, [sourceType, selectedStep, template])

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

    if (source.requiresStepSelection && selectedStep === null) {
      setGeneratedExpression('')
      return
    }

    if (source.requiresFieldSelection && !selectedField) {
      setGeneratedExpression('')
      return
    }

    let sourceExpression = source.expressionValue

    if (source.requiresStepSelection && selectedStep !== null) {
      sourceExpression = sourceExpression.replace('{stepIndex}', String(selectedStep))
    }

    if (source.requiresFieldSelection && selectedField) {
      sourceExpression = sourceExpression.replace('{field}', selectedField)
    }

    const fullExpression = relationship.expressionTemplate.replace('{source}', sourceExpression)
    setGeneratedExpression(`{{${fullExpression}}}`)
  }, [relationshipType, sourceType, selectedStep, selectedField])

  useEffect(() => {
    setSelectedStep(null)
    setSelectedField('')
  }, [sourceType])

  useEffect(() => {
    setSelectedField('')
  }, [selectedStep])

  const handleAddExpression = () => {
    if (generatedExpression) {
      onExpressionGenerated(generatedExpression)
      setRelationshipType('')
      setSourceType('')
      setSelectedStep(null)
      setSelectedField('')
      setGeneratedExpression('')
      if (onClose) onClose()
    }
  }

  const currentSourceType = SOURCE_TYPES.find(s => s.id === sourceType)

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      {/* Compact Mode Toggle */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button
            variant={mode === 'simple' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('simple')}
            data-testid={`${testId}-mode-simple`}
            type="button"
          >
            <Wand2 className="gba:w-3 gba:h-3 gba:mr-1" />
            Wizard
          </Button>
          <Button
            variant={mode === 'advanced' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('advanced')}
            data-testid={`${testId}-mode-advanced`}
            type="button"
          >
            <Code2 className="gba:w-3 gba:h-3 gba:mr-1" />
            Examples
          </Button>
        </div>
      </div>

      {mode === 'simple' ? (
        <div className="gba:space-y-4">
          {assignmentMode === AssignmentMode.ASSIGN && (
            <Alert>
              <Info className="gba:w-4 gba:h-4" />
              <div className="gba:text-sm">
                <strong>ASSIGN Mode:</strong> Can only use Workflow Initiator or Workflow Input.
              </div>
            </Alert>
          )}

          <div className="gba:space-y-2">
            <Label htmlFor="relationship-type" className="gba:text-sm gba:font-medium">
              Assign to
            </Label>
            <Select value={relationshipType} onValueChange={setRelationshipType}>
              <SelectTrigger id="relationship-type" data-testid={`${testId}-relationship-select`}>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_TYPES.map(rel => (
                  <SelectItem key={rel.id} value={rel.id}>
                    {rel.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="source-type" className="gba:text-sm gba:font-medium">
              Of
            </Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger id="source-type" data-testid={`${testId}-source-select`}>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {availableSourceTypes.map(source => (
                  <SelectItem key={source.id} value={source.id}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {currentSourceType?.requiresStepSelection && availablePreviousSteps.length > 0 && (
            <div className="gba:space-y-2">
              <Label htmlFor="step-select" className="gba:text-sm gba:font-medium">
                From Step
              </Label>
              <Select
                value={selectedStep !== null ? String(selectedStep) : ''}
                onValueChange={value => setSelectedStep(Number(value))}
              >
                <SelectTrigger id="step-select" data-testid={`${testId}-step-select`}>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePreviousSteps.map(({ step, index }) => (
                    <SelectItem key={index} value={String(index)}>
                      Step {index + 1}: {step.title || `Step ${index + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {currentSourceType?.requiresFieldSelection && (sourceType !== 'previous_step' || selectedStep !== null) && (
            <div className="gba:space-y-2">
              <Label htmlFor="field-select" className="gba:text-sm gba:font-medium">
                Field
              </Label>
              {sourceType === 'previous_step' && availableFields.length > 0 ? (
                <Select value={selectedField} onValueChange={setSelectedField}>
                  <SelectTrigger id="field-select" data-testid={`${testId}-field-select`}>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFields.map(field => (
                      <SelectItem key={field.id} value={field.id}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <input
                  type="text"
                  value={selectedField}
                  onChange={e => setSelectedField(e.target.value)}
                  placeholder="e.g., employeeId, managerId"
                  className="gba:w-full gba:px-3 gba:py-2 gba:border gba:rounded-md gba:text-sm"
                  data-testid={`${testId}-field-input`}
                />
              )}
            </div>
          )}

          {generatedExpression && (
            <div className="gba:space-y-2 gba:pt-2 gba:border-t">
              <Label className="gba:text-sm gba:font-medium">Expression</Label>
              <Badge
                variant="outline"
                className="gba:w-full gba:justify-start gba:font-mono gba:text-xs gba:py-2 gba:px-3 gba:bg-purple-50 gba:text-purple-800"
              >
                <code className="gba:break-all">{generatedExpression}</code>
              </Badge>
              <Button onClick={handleAddExpression} className="gba:w-full" type="button">
                Add to Assignment
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="gba:space-y-3 gba:max-h-96 gba:overflow-y-auto">
          <Accordion type="single" collapsible>
            <AccordionItem value="by-userid">
              <AccordionTrigger className="gba:text-sm gba:font-semibold">By User ID (Recommended)</AccordionTrigger>
              <AccordionContent className="gba:space-y-2">
                <div className="gba:text-xs gba:space-y-1">
                  <code className="gba:block gba:bg-gray-100 gba:px-2 gba:py-1 gba:rounded gba:font-mono">
                    {'{{$orgchart.managerByUserId[$workflow.initiator]}}'}
                  </code>
                  <p className="gba:text-gray-600 gba:pl-2">Direct manager of workflow initiator</p>
                </div>
                <div className="gba:text-xs gba:space-y-1">
                  <code className="gba:block gba:bg-gray-100 gba:px-2 gba:py-1 gba:rounded gba:font-mono">
                    {'{{$orgchart.skipLevelManagerByUserId[$workflow.initiator]}}'}
                  </code>
                  <p className="gba:text-gray-600 gba:pl-2">Skip-level manager</p>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="by-empid">
              <AccordionTrigger className="gba:text-sm gba:font-semibold">By Employee ID</AccordionTrigger>
              <AccordionContent className="gba:space-y-2">
                <div className="gba:text-xs gba:space-y-1">
                  <code className="gba:block gba:bg-gray-100 gba:px-2 gba:py-1 gba:rounded gba:font-mono">
                    {'{{$orgchart.manager[$steps.step_0.formData.employeeId]}}'}
                  </code>
                  <p className="gba:text-gray-600 gba:pl-2">Manager from previous step</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  )
}

/**
 * Main component with multiple display modes
 */
export const OrgChartWizardCompact: React.FC<OrgChartWizardCompactProps> = ({
  template,
  stepIndex,
  assignmentMode,
  onExpressionGenerated,
  displayMode = 'collapsible',
  'data-testid': testId = 'orgchart-wizard-compact'
}) => {
  const [isOpen, setIsOpen] = useState(false)

  // Collapsible Mode (Default - Best for most cases)
  if (displayMode === 'collapsible') {
    return (
      <Accordion type="single" collapsible>
        <AccordionItem value="orgchart-wizard" className="gba:border gba:rounded-lg gba:px-4">
          <AccordionTrigger className="hover:gba:no-underline">
            <div className="gba:flex gba:items-center gba:gap-2">
              <Wand2 className="gba:w-4 gba:h-4 gba:text-blue-600" />
              <span className="gba:text-sm gba:font-semibold">OrgChart Assignment Builder</span>
              <Badge variant="outline" className="gba:text-xs">
                Quick Setup
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <WizardCore
              template={template}
              stepIndex={stepIndex}
              assignmentMode={assignmentMode}
              onExpressionGenerated={onExpressionGenerated}
              testId={testId}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )
  }

  // Modal Mode
  if (displayMode === 'modal') {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gba:w-full gba:justify-start" type="button">
            <Wand2 className="gba:w-4 gba:h-4 gba:mr-2" />
            OrgChart Assignment Builder
            <Maximize2 className="gba:w-3 gba:h-3 gba:ml-auto" />
          </Button>
        </DialogTrigger>
        <DialogContent className="gba:max-w-2xl gba:max-h-[80vh] gba:overflow-y-auto">
          <DialogHeader>
            <DialogTitle>OrgChart Assignment Builder</DialogTitle>
          </DialogHeader>
          <WizardCore
            template={template}
            stepIndex={stepIndex}
            assignmentMode={assignmentMode}
            onExpressionGenerated={onExpressionGenerated}
            onClose={() => setIsOpen(false)}
            testId={testId}
          />
        </DialogContent>
      </Dialog>
    )
  }

  // Drawer Mode (Side panel - Best UX for complex setups)
  if (displayMode === 'drawer') {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" className="gba:w-full gba:justify-start" type="button">
            <Wand2 className="gba:w-4 gba:h-4 gba:mr-2" />
            OrgChart Assignment Builder
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="gba:w-[500px] gba:overflow-y-auto">
          <SheetHeader>
            <SheetTitle>OrgChart Assignment Builder</SheetTitle>
          </SheetHeader>
          <div className="gba:mt-6">
            <WizardCore
              template={template}
              stepIndex={stepIndex}
              assignmentMode={assignmentMode}
              onExpressionGenerated={onExpressionGenerated}
              onClose={() => setIsOpen(false)}
              testId={testId}
            />
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Inline Mode (fallback)
  return (
    <Card>
      <CardContent className="gba:pt-6">
        <WizardCore
          template={template}
          stepIndex={stepIndex}
          assignmentMode={assignmentMode}
          onExpressionGenerated={onExpressionGenerated}
          testId={testId}
        />
      </CardContent>
    </Card>
  )
}
