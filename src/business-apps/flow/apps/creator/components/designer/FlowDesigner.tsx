import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Label,
  Input,
  Textarea,
  Button,
  Separator,
  Badge,
  Spinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { FileText, AlignLeft } from 'lucide-react'
import { FlowRenderer } from '@/business-apps/flow/common/components'
import { FlowStep, FlowStepType, AssignmentMode } from '../../types/flowTemplate'
import { FlowTemplate } from '@/common/network/flows/FlowTemplateClient'
import { useFlowTemplateClient } from '@/common/network/flows/useFlowTemplateClient'
import { BasicConfiguration } from '../steps/BasicConfiguration'
import { InputFieldsContent, InputFieldsTrigger } from '../steps/InputFieldsConfiguration'
import { LinksContent, LinksTrigger } from '../steps/LinksConfiguration'
import { TagConfiguration } from '../steps/TagConfiguration'
import { AssignmentSelector } from '../shared/AssignmentSelector'
import { FlowTags } from '../../../types'

interface FlowDesignerProps extends BusinessAppContextProps {
  initialTemplate?: FlowTemplate | null
  onSave?: (template: FlowTemplate) => Promise<void>
  onCancel?: () => void
  'data-testid'?: string
}

export const FlowDesigner: React.FC<FlowDesignerProps> = ({
  accessToken,
  userInfo,
  initialTemplate,
  onSave,
  onCancel,
  'data-testid': testId = 'flow-designer'
}) => {
  // Convert initial template to FlowStep format if provided
  const getInitialSteps = (): FlowStep[] => {
    if (initialTemplate?.steps && initialTemplate.steps.length > 0) {
      return initialTemplate.steps.map(step => ({
        id: step.id,
        title: step.title,
        message: step.message || 'Describe the task to be performed.',
        type: step.type,
        dueInMinutes: step.dueInMinutes || 60,
        form: step.form || step.inputs || [],
        links: step.links || [],
        assignment: step.assignment
      }))
    }

    // Default step if no template provided
    return [
      {
        title: 'Initial Step',
        message: 'Describe the task to be performed.',
        type: FlowStepType.TASK,
        dueInMinutes: 60,
        form: [],
        links: [],
        assignment: { assignmentMode: AssignmentMode.CLAIM, targets: null, allowReassignment: true }
      }
    ]
  }

  const [steps, setSteps] = React.useState<FlowStep[]>(getInitialSteps)

  // Update steps and metadata when initialTemplate changes
  React.useEffect(() => {
    if (initialTemplate) {
      // Update template metadata
      setTemplateName(initialTemplate.name || '')
      setTemplateDescription(initialTemplate.description || '')
      setTemplateTags(initialTemplate.tags || {})

      // Update steps if they exist
      if (initialTemplate.steps && initialTemplate.steps.length > 0) {
        const newSteps = initialTemplate.steps.map(step => ({
          id: step.id,
          title: step.title,
          message: step.message || 'Describe the task to be performed.',
          type: step.type,
          dueInMinutes: step.dueInMinutes || 60,
          form: step.form || step.inputs || [],
          links: step.links || [],
          assignment: step.assignment
        }))
        setSteps(newSteps)
        setSelectedStepIndex(0)
      }
    }
  }, [initialTemplate])

  const [selectedStepIndex, setSelectedStepIndex] = React.useState<number>(0)
  const selectedStep = steps[selectedStepIndex]
  const [activeTab, setActiveTab] = React.useState<'general' | 'form' | 'assignment'>('general')

  // Template metadata state
  const [templateName, setTemplateName] = React.useState<string>(initialTemplate?.name || '')
  const [templateDescription, setTemplateDescription] = React.useState<string>(initialTemplate?.description || '')
  const [templateTags, setTemplateTags] = React.useState<FlowTags>(initialTemplate?.tags || {})

  // Editing state
  const isEditMode = Boolean(initialTemplate?.id)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  // Flow template client for API calls
  const flowTemplateClient = useFlowTemplateClient(accessToken)

  const updateStep = (updates: Partial<FlowStep>) => {
    setSteps(prev => prev.map((s, i) => (i === selectedStepIndex ? { ...s, ...updates } : s)))
  }

  // When steps change or selection changes, ensure the canvas selection reflects it
  React.useEffect(() => {
    // noop - FlowRenderer tracks selection via selectedStepIndex prop
  }, [steps, selectedStepIndex])

  const addStepBelow = () => {
    setSteps(prev => {
      const newStep: FlowStep = {
        title: `Step ${prev.length + 1}`,
        type: FlowStepType.TASK,
        form: [],
        links: [],
        assignment: { assignmentMode: AssignmentMode.CLAIM, targets: null, allowReassignment: true }
      } as FlowStep
      const updated = [...prev]
      updated.splice(selectedStepIndex + 1, 0, newStep)
      return updated
    })
    setSelectedStepIndex(i => Math.min(i + 1, steps.length))
  }

  const removeSelectedStep = () => {
    if (steps.length <= 1) return
    setSteps(prev => prev.filter((_, i) => i !== selectedStepIndex))
    setSelectedStepIndex(i => Math.max(0, i - 1))
  }

  // Save handler - implements template ID immutability
  const handleSave = async () => {
    if (!templateName.trim()) {
      setSaveError('Template name is required')
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const templateData: FlowTemplate = {
        // Preserve the existing ID for edits (immutable ID)
        ...(isEditMode && initialTemplate?.id && { id: initialTemplate.id }),
        type: initialTemplate?.type || 'TEMPLATE',
        name: templateName.trim(),
        description: templateDescription.trim(),
        version: initialTemplate?.version || 1,
        steps: steps.map(step => ({
          ...step,
          // Ensure form and inputs are properly set
          form: step.form || step.inputs || [],
          inputs: step.inputs || step.form || []
        })),
        // Include tags in the template
        tags: Object.keys(templateTags).length > 0 ? templateTags : undefined
      }

      if (onSave) {
        // Use the provided onSave callback
        await onSave(templateData)
      } else {
        // Direct API call
        if (isEditMode && initialTemplate?.id) {
          // Update existing template - ID remains immutable
          await flowTemplateClient.updateTemplate(initialTemplate.id, templateData)
        } else {
          // Create new template - ID will be derived from name
          await flowTemplateClient.createTemplate(templateData)
        }
      }

      console.log(`Template ${isEditMode ? 'updated' : 'created'} successfully`)
    } catch (error) {
      console.error('Error saving template:', error)
      setSaveError(error instanceof Error ? error.message : 'Failed to save template')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="gba:min-h-screen" style={{ background: 'var(--color-surface-secondary)' }} data-testid={testId}>
      <div className="gba:max-w-[1440px] gba:mx-auto gba:p-6">
        {/* Header */}
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div className="gba:flex gba:items-center gba:gap-3">
            <Badge variant="secondary">{isEditMode ? 'Edit' : 'New'}</Badge>
            <h1 className="gba:text-2xl gba:font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Visual Flow Designer
            </h1>
            {isEditMode && initialTemplate?.id && (
              <Badge variant="outline" className="gba:text-xs">
                ID: {initialTemplate.id}
              </Badge>
            )}
          </div>
          <div className="gba:flex gba:gap-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel} data-testid={`${testId}-cancel`}>
                Cancel
              </Button>
            )}
            <Button variant="outline" data-testid={`${testId}-add-step`} onClick={addStepBelow}>
              Add Step
            </Button>
            <Button
              variant="outline"
              data-testid={`${testId}-remove-step`}
              onClick={removeSelectedStep}
              disabled={steps.length <= 1}
            >
              Remove Step
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !templateName.trim()} data-testid={`${testId}-save`}>
              {isSaving ? (
                <>
                  <Spinner size="sm" className="gba:mr-2" />
                  {isEditMode ? 'Updating...' : 'Saving...'}
                </>
              ) : isEditMode ? (
                'Update'
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>

        {/* Save Error Alert */}
        {saveError && (
          <div className="gba:mb-4 gba:p-3 gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-md">
            <p className="gba:text-sm gba:text-red-800">{saveError}</p>
          </div>
        )}

        {/* Template Information */}
        <Card className="gba:mb-6">
          <CardHeader>
            <CardTitle>Template Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-6">
              <div className="gba:space-y-4">
                <div className="gba:space-y-2">
                  <Label htmlFor="template-name" className="gba:flex gba:items-center gba:gap-2">
                    <FileText className="gba:h-4 gba:w-4" />
                    Name
                  </Label>
                  <Input
                    id="template-name"
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    placeholder="Enter template name"
                    data-testid={`${testId}-template-name`}
                  />
                </div>
                <div className="gba:space-y-2">
                  <Label htmlFor="template-description" className="gba:flex gba:items-center gba:gap-2">
                    <AlignLeft className="gba:h-4 gba:w-4" />
                    Description
                  </Label>
                  <Textarea
                    id="template-description"
                    value={templateDescription}
                    onChange={e => setTemplateDescription(e.target.value)}
                    placeholder="Describe what this template does"
                    rows={3}
                    data-testid={`${testId}-template-description`}
                  />
                </div>
              </div>

              {/* Tag Configuration Section */}
              <div className="gba:space-y-2">
                <TagConfiguration
                  tags={templateTags}
                  onTagsChange={setTemplateTags}
                  accessToken={accessToken}
                  data-testid={`${testId}-tag-configuration`}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-5 gba:gap-6">
          {/* Canvas - 60% width */}
          <Card className="gba:lg:col-span-3 gba:h-[75vh]">
            <CardHeader>
              <CardTitle>Flow Diagram</CardTitle>
            </CardHeader>
            <CardContent className="gba:h-[calc(75vh-64px)]">
              <FlowRenderer
                steps={steps}
                selectedStepIndex={selectedStepIndex}
                onSelectStep={setSelectedStepIndex}
                mode="edit"
                data-testid={`${testId}-renderer`}
              />
            </CardContent>
          </Card>

          {/* Inspector - 40% width */}
          <Card className="gba:lg:col-span-2 gba:h-[75vh]">
            <CardHeader>
              <CardTitle>Step Configuration</CardTitle>
            </CardHeader>
            <CardContent className="gba:h-[calc(75vh-64px)] gba:flex gba:flex-col">
              <div className="gba:mb-3 gba:flex-none" style={{ color: 'var(--color-text-secondary)' }}>
                Selected: Step {selectedStepIndex + 1}
              </div>
              <Tabs
                value={activeTab}
                onValueChange={v => setActiveTab(v as any)}
                className="gba:flex-1 gba:flex gba:flex-col gba:min-h-0"
              >
                <TabsList className="gba:mb-3 gba:flex-none">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="form">Form</TabsTrigger>
                  <TabsTrigger value="assignment">Assignment</TabsTrigger>
                </TabsList>
                <div className="gba:flex-1 gba:min-h-0 gba:relative">
                  <TabsContent value="general" className="gba:absolute gba:inset-0 gba:overflow-auto">
                    <div className="gba:space-y-4 gba:pr-2 gba:pb-4">
                      {/* Step Type Configuration */}
                      <div className="gba:space-y-2">
                        <Label>Step Type:</Label>
                        <select
                          value={selectedStep.type}
                          onChange={e => updateStep({ type: e.target.value as FlowStepType })}
                          className="gba:w-full gba:px-3 gba:py-2 gba:border gba:rounded-md"
                        >
                          <option value={FlowStepType.TASK}>Task</option>
                          <option value={FlowStepType.APPROVAL}>Approval</option>
                          <option value={FlowStepType.INFORMATION}>Information</option>
                          <option value={FlowStepType.ACKNOWLEDGE}>Acknowledge</option>
                        </select>
                      </div>

                      {/* Step Title */}
                      <div className="gba:space-y-2">
                        <Label>Step Title:</Label>
                        <Input
                          value={selectedStep.title}
                          onChange={e => updateStep({ title: e.target.value })}
                          className="gba:w-full"
                        />
                      </div>

                      {/* Step Message */}
                      <div className="gba:space-y-2">
                        <Label>Message:</Label>
                        <Textarea
                          value={selectedStep.message || ''}
                          onChange={e => updateStep({ message: e.target.value })}
                          className="gba:w-full gba:min-h-[100px]"
                        />
                      </div>

                      {/* Links */}
                      <div className="gba:space-y-2">
                        <LinksTrigger step={selectedStep} testId={`${testId}-links`} onUpdateStep={updateStep} />
                        <LinksContent step={selectedStep} testId={`${testId}-links`} onUpdateStep={updateStep} />
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="form" className="gba:absolute gba:inset-0 gba:overflow-auto">
                    <div className="gba:space-y-2 gba:pr-2 gba:pb-4">
                      <Label>Form Inputs</Label>
                      <Separator />
                      <InputFieldsTrigger step={selectedStep} testId={`${testId}-form`} onUpdateStep={updateStep} />
                      <InputFieldsContent step={selectedStep} testId={`${testId}-form`} onUpdateStep={updateStep} />
                    </div>
                  </TabsContent>
                  <TabsContent value="assignment" className="gba:absolute gba:inset-0 gba:overflow-auto">
                    <div className="gba:space-y-4 gba:pr-2 gba:pb-4">
                      {/* Due Time Configuration */}
                      <div className="gba:space-y-2">
                        <Label>Due Time:</Label>
                        <div className="gba:flex gba:gap-2 gba:items-center">
                          <Input
                            type="number"
                            min="1"
                            value={(() => {
                              const minutes = selectedStep.dueInMinutes || 0
                              if (minutes === 0) return ''

                              // Convert minutes to the appropriate unit for display
                              if (minutes % (7 * 24 * 60) === 0) return (minutes / (7 * 24 * 60)).toString() // weeks
                              if (minutes % (24 * 60) === 0) return (minutes / (24 * 60)).toString() // days
                              if (minutes % 60 === 0) return (minutes / 60).toString() // hours
                              return minutes.toString() // minutes
                            })()}
                            onChange={e => {
                              const value = parseInt(e.target.value) || 0
                              const unit = (() => {
                                const minutes = selectedStep.dueInMinutes || 0
                                if (minutes % (7 * 24 * 60) === 0) return 'weeks'
                                if (minutes % (24 * 60) === 0) return 'days'
                                if (minutes % 60 === 0) return 'hours'
                                return 'minutes'
                              })()

                              let totalMinutes = value
                              if (unit === 'hours') totalMinutes = value * 60
                              else if (unit === 'days') totalMinutes = value * 24 * 60
                              else if (unit === 'weeks') totalMinutes = value * 7 * 24 * 60

                              updateStep({ dueInMinutes: totalMinutes || undefined })
                            }}
                            placeholder="0"
                            className="gba:flex-1"
                          />
                          <Select
                            value={(() => {
                              const minutes = selectedStep.dueInMinutes || 0
                              if (minutes === 0) return 'minutes'

                              // Determine the best unit based on the current value
                              if (minutes % (7 * 24 * 60) === 0) return 'weeks'
                              if (minutes % (24 * 60) === 0) return 'days'
                              if (minutes % 60 === 0) return 'hours'
                              return 'minutes'
                            })()}
                            onValueChange={unit => {
                              const currentValue = (() => {
                                const minutes = selectedStep.dueInMinutes || 0
                                if (minutes === 0) return 1

                                // Get current display value
                                if (minutes % (7 * 24 * 60) === 0) return minutes / (7 * 24 * 60)
                                if (minutes % (24 * 60) === 0) return minutes / (24 * 60)
                                if (minutes % 60 === 0) return minutes / 60
                                return minutes
                              })()

                              let totalMinutes = currentValue
                              if (unit === 'hours') totalMinutes = currentValue * 60
                              else if (unit === 'days') totalMinutes = currentValue * 24 * 60
                              else if (unit === 'weeks') totalMinutes = currentValue * 7 * 24 * 60

                              updateStep({ dueInMinutes: totalMinutes || undefined })
                            }}
                          >
                            <SelectTrigger className="gba:w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minutes">minutes</SelectItem>
                              <SelectItem value="hours">hours</SelectItem>
                              <SelectItem value="days">days</SelectItem>
                              <SelectItem value="weeks">weeks</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {selectedStep.dueInMinutes && (
                          <p className="gba:text-xs gba:text-gray-500">= {selectedStep.dueInMinutes} minutes total</p>
                        )}
                      </div>

                      {/* Assignment Mode Selection */}
                      <div className="gba:space-y-2">
                        <Label>Assignment Mode:</Label>
                        <select
                          value={selectedStep.assignment?.assignmentMode || AssignmentMode.CLAIM}
                          onChange={e =>
                            updateStep({
                              assignment: {
                                ...selectedStep.assignment,
                                assignmentMode: e.target.value as AssignmentMode,
                                targets: null, // Reset targets when mode changes
                                allowReassignment: true
                              }
                            })
                          }
                          className="gba:w-full gba:px-3 gba:py-2 gba:border gba:rounded-md"
                        >
                          <option value={AssignmentMode.CLAIM}>Claim (Users can claim tasks)</option>
                          <option value={AssignmentMode.ASSIGN}>Assign (Tasks are assigned to specific users)</option>
                        </select>
                      </div>

                      {/* Modern Assignment Selector */}
                      <div className="gba:space-y-2">
                        <AssignmentSelector
                          value={
                            selectedStep.assignment || {
                              targets: null,
                              assignmentMode: AssignmentMode.CLAIM,
                              allowReassignment: true
                            }
                          }
                          onChange={assignment => updateStep({ assignment })}
                          assignmentMode={selectedStep.assignment?.assignmentMode || AssignmentMode.CLAIM}
                          accessToken={accessToken}
                          userInfo={userInfo}
                          data-testid={`${testId}-assignment-selector`}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default FlowDesigner
