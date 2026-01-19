import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { FileText, AlignLeft, Info, User, Users, MessageSquare, CheckCircle, Code2, Bot, Sparkles } from 'lucide-react'
import { FlowRenderer } from '@/business-apps/flow/common/components'
import { FlowStep, FlowStepType, AssignmentMode } from '../../types/flowTemplate'
import { FlowTemplate } from '@/common/network/flows/FlowTemplateClient'
import { useFlowTemplateClient } from '@/common/network/flows/useFlowTemplateClient'
import { InputFieldsContent, InputFieldsTrigger } from '../steps/InputFieldsConfiguration'
import { LinksContent, LinksTrigger } from '../steps/LinksConfiguration'
import { TagConfiguration } from '../steps/TagConfiguration'
import { SummaryFieldsConfiguration } from '../steps/SummaryFieldsConfiguration'
import { AssignmentSelector } from '../shared/AssignmentSelector'
import { FlowTags } from '@/business-apps/flow/types'
import { ExpressionInput } from '../shared/ExpressionInput'
import { FunctionConfiguration } from '../steps/FunctionConfiguration'
import { AgentConfiguration } from '../steps/AgentConfiguration'

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
        kind: 'USER',
        dueInMinutes: 60,
        form: [],
        links: [],
        assignment: { assignmentMode: AssignmentMode.CLAIM, targets: null, allowReassignment: true }
      }
    ]
  }

  const [steps, setSteps] = React.useState<FlowStep[]>(getInitialSteps)
  const [selectedStepIndex, setSelectedStepIndex] = React.useState<number>(0)
  const [activeTab, setActiveTab] = React.useState<'general' | 'form' | 'assignment' | 'function' | 'agent'>('general')
  const [isSummarySelected, setIsSummarySelected] = React.useState<boolean>(false)

  // Template metadata state
  const [templateName, setTemplateName] = React.useState<string>(initialTemplate?.name || '')
  const [templateDescription, setTemplateDescription] = React.useState<string>(initialTemplate?.description || '')
  const [templateTags, setTemplateTags] = React.useState<FlowTags>(initialTemplate?.tags || {})
  const [summaryFields, setSummaryFields] = React.useState<any[]>((initialTemplate as any)?.summaryFields || [])

  // Update steps and metadata when initialTemplate changes
  React.useEffect(() => {
    if (initialTemplate) {
      // Update template metadata
      setTemplateName(initialTemplate.name || '')
      setTemplateDescription(initialTemplate.description || '')
      setTemplateTags(initialTemplate.tags || {})
      setSummaryFields((initialTemplate as any)?.summaryFields || [])

      // Update steps if they exist
      if (initialTemplate.steps && initialTemplate.steps.length > 0) {
        const newSteps = initialTemplate.steps.map(step => ({
          ...step, // Preserve all fields
          message: step.message || 'Describe the task to be performed.',
          dueInMinutes: step.dueInMinutes || 60,
          form: step.form || step.inputs || [],
          type: step.type as FlowStepType
        }))
        setSteps(newSteps)
        setSelectedStepIndex(0)
      }
    }
  }, [initialTemplate])

  // Track whether we're in "User Task" or "System Task" mode
  type TaskCategory = 'user' | 'system'
  const getTaskCategory = (type: FlowStepType): TaskCategory => {
    return type === FlowStepType.FUNCTION || type === FlowStepType.AI_AGENT || type === FlowStepType.AI_TASK_EXPERT
      ? 'system'
      : 'user'
  }
  const [taskCategory, setTaskCategory] = React.useState<TaskCategory>(() =>
    getTaskCategory(getInitialSteps()[0]?.type || FlowStepType.TASK)
  )

  // Get selected step - always return a valid step object
  const selectedStep = React.useMemo(() => {
    if (steps.length === 0) {
      // Return a default step if no steps exist
      return {
        title: 'Default Step',
        message: 'Describe the task to be performed.',
        type: FlowStepType.TASK,
        kind: 'USER' as const,
        dueInMinutes: 60,
        form: [],
        links: [],
        assignment: { assignmentMode: AssignmentMode.CLAIM, targets: null, allowReassignment: true }
      }
    }

    // When summary is selected, return step 0 (for compatibility)
    if (isSummarySelected) {
      return steps[0]
    }

    // Return the selected step, or step 0 if index is out of bounds
    return steps[selectedStepIndex] || steps[0]
  }, [isSummarySelected, selectedStepIndex, steps])

  // Calculate summary fields count from template-level summaryFields
  const summaryFieldsCount = React.useMemo(() => {
    return summaryFields?.length || 0
  }, [summaryFields])

  // Handler for clicking the summary node
  const handleSelectSummary = () => {
    setIsSummarySelected(true)
  }

  // Handler for clicking a step node
  const handleSelectStep = (index: number) => {
    setSelectedStepIndex(index)
    // Only reset tab to general if switching FROM summary TO step
    // Otherwise, preserve the current tab when switching between steps
    if (isSummarySelected) {
      setActiveTab('general')
    }
    setIsSummarySelected(false)
  }

  // Editing state
  const isEditMode = Boolean(initialTemplate?.id)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  // Flow template client for API calls
  const flowTemplateClient = useFlowTemplateClient(accessToken)

  const updateStep = (updates: Partial<FlowStep>) => {
    setSteps(prev => prev.map((s, i) => (i === selectedStepIndex ? { ...s, ...updates } : s)))
  }

  // Sync taskCategory when selectedStep changes and reset to general tab
  React.useEffect(() => {
    setTaskCategory(getTaskCategory(selectedStep.type))
    setActiveTab('general')
  }, [selectedStep.type])

  // Handle task category change
  const handleTaskCategoryChange = (category: TaskCategory) => {
    setTaskCategory(category)
    // Automatically update step type and kind to defaults for the new category
    const defaultType = category === 'user' ? FlowStepType.TASK : FlowStepType.AI_AGENT
    const kind = category === 'user' ? 'USER' : 'SYSTEM'
    updateStep({ type: defaultType, kind })
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
        kind: 'USER',
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

  const handleReorderSteps = (fromIndex: number, toIndex: number) => {
    setSteps(prev => {
      const newSteps = [...prev]
      const [draggedStep] = newSteps.splice(fromIndex, 1)
      newSteps.splice(toIndex, 0, draggedStep)
      return newSteps
    })
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
          ...step, // Preserve all fields
          // Ensure form and inputs are properly set
          form: step.form || step.inputs || [],
          inputs: step.inputs || step.form || []
        })),
        // Include tags in the template
        tags: Object.keys(templateTags).length > 0 ? templateTags : undefined,
        // Include summaryFields at template level
        ...(summaryFields.length > 0 && { summaryFields })
      } as any

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
            {isEditMode && initialTemplate?.version && (
              <Badge variant="outline" className="gba:text-xs">
                v{initialTemplate.version}
              </Badge>
            )}
          </div>
          <div className="gba:flex gba:gap-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel} data-testid={`${testId}-cancel`}>
                Cancel
              </Button>
            )}
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

        {/* Template Information and Tags Row */}
        <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-5 gba:gap-6 gba:mb-6">
          {/* Template Information Card */}
          <Card className="gba:lg:col-span-3">
            <CardHeader>
              <CardTitle>Template Information</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Tags Card */}
          <Card className="gba:lg:col-span-2">
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                Tags
                <div className="gba:group gba:relative">
                  <Info className="gba:h-4 gba:w-4 gba:text-gray-400 gba:cursor-help" />
                  <div className="gba:absolute gba:bottom-full gba:left-1/2 gba:transform gba:-translate-x-1/2 gba:mb-2 gba:px-3 gba:py-2 gba:bg-gray-900 gba:text-white gba:text-xs gba:rounded gba:opacity-0 gba:pointer-events-none group-hover:gba:opacity-100 gba:transition-opacity gba:duration-200 gba:z-[100] gba:max-w-xs gba:text-center gba:whitespace-normal">
                    Tags control template visibility in different parts of the application
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TagConfiguration
                tags={templateTags}
                onTagsChange={setTemplateTags}
                accessToken={accessToken}
                data-testid={`${testId}-tag-configuration`}
              />
            </CardContent>
          </Card>
        </div>

        <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-5 gba:gap-6">
          {/* Canvas - 60% width */}
          <Card className="gba:lg:col-span-3 gba:h-[75vh]">
            <CardHeader>
              <CardTitle>Flow Diagram</CardTitle>
            </CardHeader>
            <CardContent className="gba:h-[calc(75vh-64px)]">
              <FlowRenderer
                steps={steps}
                selectedStepIndex={isSummarySelected ? null : selectedStepIndex}
                onSelectStep={handleSelectStep}
                onReorderSteps={handleReorderSteps}
                onSelectSummary={handleSelectSummary}
                showSummaryNode={true}
                summaryFieldsCount={summaryFieldsCount}
                isSummarySelected={isSummarySelected}
                mode="edit"
                data-testid={`${testId}-renderer`}
              />
            </CardContent>
          </Card>

          {/* Workflow Summary Configuration Card - 40% width */}
          {isSummarySelected && (
            <Card className="gba:lg:col-span-2 gba:h-[75vh]" data-testid="workflow-summary-card">
              <CardHeader>
                <CardTitle>Workflow Summary</CardTitle>
                <CardDescription>Configure fields to display in the workflow summary after completion</CardDescription>
              </CardHeader>
              <CardContent className="gba:h-[calc(75vh-80px)] gba:flex gba:flex-col">
                {steps.length > 0 ? (
                  <div className="gba:flex-1 gba:overflow-auto gba:pr-2 gba:pb-4">
                    <SummaryFieldsConfiguration
                      template={
                        {
                          type: initialTemplate?.type || 'TEMPLATE',
                          name: templateName || initialTemplate?.name || 'Untitled',
                          version: initialTemplate?.version || 1,
                          description: templateDescription || initialTemplate?.description,
                          id: initialTemplate?.id,
                          initStep: initialTemplate?.initStep,
                          steps: steps,
                          summaryFields: summaryFields
                        } as any
                      }
                      context={{ accessToken, userInfo }}
                      testId={`${testId}-summary`}
                      onUpdateTemplate={updates => {
                        // Update the template-level summaryFields
                        if (updates.summaryFields !== undefined) {
                          // Store summaryFields at template level (will be saved when template is saved)
                          setSummaryFields(updates.summaryFields)
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="gba:flex-1 gba:flex gba:items-center gba:justify-center gba:text-gray-500">
                    <div className="gba:text-center">
                      <p>No steps available to configure summary fields.</p>
                      <p className="gba:text-sm">Add at least one step to the workflow first.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step Configuration Card - 40% width */}
          {!isSummarySelected && (
            <Card className="gba:lg:col-span-2 gba:h-[75vh]">
              <CardHeader>
                <CardTitle>Step Configuration</CardTitle>
              </CardHeader>
              <CardContent className="gba:h-[calc(75vh-64px)] gba:flex gba:flex-col">
                <div className="gba:mb-3 gba:flex gba:items-center gba:justify-between gba:flex-none">
                  <div style={{ color: 'var(--color-text-secondary)' }}>Selected: Step {selectedStepIndex + 1}</div>
                  <div className="gba:flex gba:gap-2">
                    <Button size="sm" variant="outline" data-testid={`${testId}-add-step`} onClick={addStepBelow}>
                      Add Step
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`${testId}-remove-step`}
                      onClick={removeSelectedStep}
                      disabled={steps.length <= 1}
                    >
                      Remove Step
                    </Button>
                  </div>
                </div>

                {/* Task Category & Type Selection */}
                <div className="gba:mb-4 gba:space-y-3 gba:flex-none">
                  {/* Category Toggle */}
                  <div className="gba:grid gba:grid-cols-2 gba:gap-2">
                    <button
                      onClick={() => handleTaskCategoryChange('user')}
                      className={`gba:flex gba:items-center gba:justify-center gba:gap-2 gba:px-3 gba:py-2.5 gba:border-2 gba:rounded-md gba:transition-all ${
                        taskCategory === 'user'
                          ? 'gba:border-info gba:bg-info/10 gba:text-info'
                          : 'gba:border-gray-300 gba:bg-white gba:text-gray-600 hover:gba:border-gray-400'
                      }`}
                      data-testid={`${testId}-user-task-toggle`}
                    >
                      <Users className="gba:h-4 gba:w-4" />
                      <span className="gba:font-medium gba:text-sm">User Tasks</span>
                    </button>
                    <button
                      onClick={() => handleTaskCategoryChange('system')}
                      className={`gba:flex gba:items-center gba:justify-center gba:gap-2 gba:px-3 gba:py-2.5 gba:border-2 gba:rounded-md gba:transition-all ${
                        taskCategory === 'system'
                          ? 'gba:border-info gba:bg-info/10 gba:text-info'
                          : 'gba:border-gray-300 gba:bg-white gba:text-gray-600 hover:gba:border-gray-400'
                      }`}
                      data-testid={`${testId}-system-task-toggle`}
                    >
                      <Bot className="gba:h-4 gba:w-4" />
                      <span className="gba:font-medium gba:text-sm">System Tasks</span>
                    </button>
                  </div>

                  {/* Step Type Selection - User Tasks */}
                  {taskCategory === 'user' && (
                    <div className="gba:grid gba:grid-cols-4 gba:gap-2">
                      <button
                        onClick={() => updateStep({ type: FlowStepType.TASK, kind: 'USER' })}
                        className={`gba:flex gba:flex-col gba:items-center gba:gap-1 gba:px-2 gba:py-3 gba:border-2 gba:rounded-md gba:transition-all ${
                          selectedStep.type === FlowStepType.TASK
                            ? 'gba:border-info gba:bg-info/10 gba:text-info'
                            : 'gba:border-gray-200 gba:bg-white gba:text-gray-600 hover:gba:border-gray-300'
                        }`}
                      >
                        <User className="gba:h-5 gba:w-5" />
                        <span className="gba:text-xs gba:font-medium">Task</span>
                      </button>
                      <button
                        onClick={() => updateStep({ type: FlowStepType.APPROVAL, kind: 'USER' })}
                        className={`gba:flex gba:flex-col gba:items-center gba:gap-1 gba:px-2 gba:py-3 gba:border-2 gba:rounded-md gba:transition-all ${
                          selectedStep.type === FlowStepType.APPROVAL
                            ? 'gba:border-info gba:bg-info/10 gba:text-info'
                            : 'gba:border-gray-200 gba:bg-white gba:text-gray-600 hover:gba:border-gray-300'
                        }`}
                      >
                        <CheckCircle className="gba:h-5 gba:w-5" />
                        <span className="gba:text-xs gba:font-medium">Approval</span>
                      </button>
                      <button
                        onClick={() => updateStep({ type: FlowStepType.ACKNOWLEDGE, kind: 'USER' })}
                        className={`gba:flex gba:flex-col gba:items-center gba:gap-1 gba:px-2 gba:py-3 gba:border-2 gba:rounded-md gba:transition-all ${
                          selectedStep.type === FlowStepType.ACKNOWLEDGE
                            ? 'gba:border-info gba:bg-info/10 gba:text-info'
                            : 'gba:border-gray-200 gba:bg-white gba:text-gray-600 hover:gba:border-gray-300'
                        }`}
                      >
                        <MessageSquare className="gba:h-5 gba:w-5" />
                        <span className="gba:text-xs gba:font-medium">Acknowledge</span>
                      </button>
                      <button
                        onClick={() => updateStep({ type: FlowStepType.INFORMATION, kind: 'USER' })}
                        className={`gba:flex gba:flex-col gba:items-center gba:gap-1 gba:px-2 gba:py-3 gba:border-2 gba:rounded-md gba:transition-all ${
                          selectedStep.type === FlowStepType.INFORMATION
                            ? 'gba:border-info gba:bg-info/10 gba:text-info'
                            : 'gba:border-gray-200 gba:bg-white gba:text-gray-600 hover:gba:border-gray-300'
                        }`}
                      >
                        <Info className="gba:h-5 gba:w-5" />
                        <span className="gba:text-xs gba:font-medium">Info</span>
                      </button>
                    </div>
                  )}

                  {/* Step Type Selection - System Tasks */}
                  {taskCategory === 'system' && (
                    <div className="gba:grid gba:grid-cols-3 gba:gap-2">
                      <button
                        onClick={() => updateStep({ type: FlowStepType.AI_AGENT, kind: 'SYSTEM' })}
                        className={`gba:flex gba:flex-col gba:items-center gba:gap-1 gba:px-2 gba:py-3 gba:border-2 gba:rounded-md gba:transition-all ${
                          selectedStep.type === FlowStepType.AI_AGENT
                            ? 'gba:border-info gba:bg-info/10 gba:text-info'
                            : 'gba:border-gray-200 gba:bg-white gba:text-gray-600 hover:gba:border-gray-300'
                        }`}
                      >
                        <Sparkles className="gba:h-5 gba:w-5" />
                        <span className="gba:text-xs gba:font-medium">AI Agent</span>
                      </button>
                      <button
                        onClick={() => updateStep({ type: FlowStepType.AI_TASK_EXPERT, kind: 'SYSTEM' })}
                        className={`gba:flex gba:flex-col gba:items-center gba:gap-1 gba:px-2 gba:py-3 gba:border-2 gba:rounded-md gba:transition-all ${
                          selectedStep.type === FlowStepType.AI_TASK_EXPERT
                            ? 'gba:border-info gba:bg-info/10 gba:text-info'
                            : 'gba:border-gray-200 gba:bg-white gba:text-gray-600 hover:gba:border-gray-300'
                        }`}
                      >
                        <Bot className="gba:h-5 gba:w-5" />
                        <span className="gba:text-xs gba:font-medium">Task Expert</span>
                      </button>
                      <button
                        onClick={() => updateStep({ type: FlowStepType.FUNCTION, kind: 'SYSTEM' })}
                        className={`gba:flex gba:flex-col gba:items-center gba:gap-1 gba:px-2 gba:py-3 gba:border-2 gba:rounded-md gba:transition-all ${
                          selectedStep.type === FlowStepType.FUNCTION
                            ? 'gba:border-info gba:bg-info/10 gba:text-info'
                            : 'gba:border-gray-200 gba:bg-white gba:text-gray-600 hover:gba:border-gray-300'
                        }`}
                      >
                        <Code2 className="gba:h-5 gba:w-5" />
                        <span className="gba:text-xs gba:font-medium">Function</span>
                      </button>
                    </div>
                  )}
                </div>

                <Tabs
                  value={activeTab}
                  onValueChange={v => setActiveTab(v as any)}
                  className="gba:flex-1 gba:flex gba:flex-col gba:min-h-0"
                >
                  <TabsList className="gba:mb-3 gba:flex-none">
                    <TabsTrigger value="general">General</TabsTrigger>
                    {(selectedStep.type === FlowStepType.FUNCTION ||
                      selectedStep.type === FlowStepType.AI_TASK_EXPERT) && (
                      <TabsTrigger value="parameters">Parameters</TabsTrigger>
                    )}
                    {selectedStep.type !== FlowStepType.FUNCTION &&
                      selectedStep.type !== FlowStepType.AI_AGENT &&
                      selectedStep.type !== FlowStepType.AI_TASK_EXPERT && <TabsTrigger value="form">Form</TabsTrigger>}
                    {selectedStep.type !== FlowStepType.FUNCTION &&
                      selectedStep.type !== FlowStepType.AI_AGENT &&
                      selectedStep.type !== FlowStepType.AI_TASK_EXPERT && (
                        <TabsTrigger value="assignment">Assignment</TabsTrigger>
                      )}
                  </TabsList>
                  <div className="gba:flex-1 gba:min-h-0 gba:relative">
                    <TabsContent value="general" className="gba:absolute gba:inset-0 gba:overflow-auto">
                      <div className="gba:space-y-4 gba:pr-2 gba:pb-4">
                        {/* Step Title */}
                        <div className="gba:space-y-2">
                          <Label>Step Title:</Label>
                          <ExpressionInput
                            key={`title-${selectedStepIndex}`}
                            value={selectedStep.title}
                            onChange={value => updateStep({ title: value })}
                            mode="auto"
                            template={{ ...initialTemplate, steps } as any}
                            stepIndex={selectedStepIndex}
                            useTreeBuilder={true}
                            context={{ accessToken, userInfo }}
                            placeholder="Enter step title..."
                            data-testid={`${testId}-title-input`}
                          />
                        </div>

                        {/* Function/Agent Configuration - Only for System Tasks */}
                        {selectedStep.type === FlowStepType.FUNCTION && (
                          <div className="gba:space-y-4 gba:border-t gba:pt-4">
                            <div className="gba:text-sm gba:font-semibold gba:text-muted-foreground">
                              Function Configuration
                            </div>
                            <div className="gba:pl-4">
                              <FunctionConfiguration
                                step={selectedStep}
                                stepIndex={selectedStepIndex}
                                testId={`${testId}-function`}
                                onUpdateStep={updateStep}
                                showParametersOnly={false}
                                template={{ ...initialTemplate, steps } as any}
                              />
                            </div>
                          </div>
                        )}

                        {/* AI Agent Configuration - Simple title + instruction */}
                        {selectedStep.type === FlowStepType.AI_AGENT && (
                          <div className="gba:space-y-4 gba:border-t gba:pt-4">
                            <div className="gba:text-sm gba:font-semibold gba:text-muted-foreground">
                              AI Agent Configuration
                            </div>
                            <div className="gba:space-y-4 gba:pl-4">
                              <div className="gba:space-y-2">
                                <Label>Instruction:</Label>
                                <ExpressionInput
                                  key={`agent-instruction-${selectedStepIndex}`}
                                  value={selectedStep.message || ''}
                                  onChange={value => updateStep({ message: value })}
                                  mode="auto"
                                  template={{ ...initialTemplate, steps } as any}
                                  stepIndex={selectedStepIndex}
                                  useTreeBuilder={true}
                                  context={{ accessToken, userInfo }}
                                  multiline={true}
                                  rows={6}
                                  placeholder="Enter the instruction for the AI agent..."
                                  data-testid={`${testId}-agent-instruction`}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Task Expert Configuration - Prompt selection + parameters */}
                        {selectedStep.type === FlowStepType.AI_TASK_EXPERT && accessToken && (
                          <div className="gba:space-y-4 gba:border-t gba:pt-4">
                            <div className="gba:text-sm gba:font-semibold gba:text-muted-foreground">
                              Task Expert Configuration
                            </div>
                            <div className="gba:pl-4">
                              <AgentConfiguration
                                step={selectedStep}
                                stepIndex={selectedStepIndex}
                                testId={`${testId}-task-expert`}
                                onUpdateStep={updateStep}
                                accessToken={accessToken}
                                showParametersOnly={false}
                                template={{ ...initialTemplate, steps } as any}
                              />
                            </div>
                          </div>
                        )}

                        {/* Step Message - Only for User Tasks */}
                        {selectedStep.type !== FlowStepType.FUNCTION &&
                          selectedStep.type !== FlowStepType.AI_AGENT &&
                          selectedStep.type !== FlowStepType.AI_TASK_EXPERT && (
                            <div className="gba:space-y-2">
                              <Label>Message:</Label>
                              <ExpressionInput
                                key={`message-${selectedStepIndex}`}
                                value={selectedStep.message || ''}
                                onChange={value => updateStep({ message: value })}
                                mode="auto"
                                template={{ ...initialTemplate, steps } as any}
                                stepIndex={selectedStepIndex}
                                useTreeBuilder={true}
                                context={{ accessToken, userInfo }}
                                multiline={true}
                                rows={4}
                                placeholder="Enter message..."
                                data-testid={`${testId}-message-input`}
                              />
                            </div>
                          )}

                        {/* Links - Available for all task types */}
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
                        <InputFieldsContent
                          step={selectedStep}
                          stepIndex={selectedStepIndex}
                          template={
                            {
                              ...initialTemplate,
                              steps: steps // Use live steps state, not initialTemplate.steps
                            } as any
                          }
                          context={{ accessToken, userInfo }}
                          testId={`${testId}-form`}
                          onUpdateStep={updateStep}
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="parameters" className="gba:absolute gba:inset-0 gba:overflow-auto">
                      <div className="gba:pr-2 gba:pb-4">
                        {selectedStep.type === FlowStepType.FUNCTION && (
                          <FunctionConfiguration
                            step={selectedStep}
                            stepIndex={selectedStepIndex}
                            testId={`${testId}-function-params`}
                            onUpdateStep={updateStep}
                            showParametersOnly={true}
                            template={{ ...initialTemplate, steps } as any}
                          />
                        )}
                        {selectedStep.type === FlowStepType.AI_TASK_EXPERT && accessToken && (
                          <AgentConfiguration
                            step={selectedStep}
                            stepIndex={selectedStepIndex}
                            testId={`${testId}-task-expert-params`}
                            onUpdateStep={updateStep}
                            accessToken={accessToken}
                            showParametersOnly={true}
                            template={{ ...initialTemplate, steps } as any}
                          />
                        )}
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
                            template={{ ...initialTemplate, steps } as any}
                            stepIndex={selectedStepIndex}
                            data-testid={`${testId}-assignment-selector`}
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default FlowDesigner
