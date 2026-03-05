import React, { useState, useEffect } from 'react'
import { Steps, Card, Button, Space, Typography, message, Spin, Alert } from 'antd'
import {
  PlayCircleIcon,
  GearIcon,
  CheckCircleIcon,
  UserIcon,
  ChatCircleIcon,
  FileTextIcon,
  EyeIcon
} from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { FlowTemplate, FlowStep, AssignmentMode } from '@/common/network/flows/FlowTemplateClient'
import { AssignmentSelector } from '../shared/AssignmentSelector'
import { StepExecutionForm } from './StepExecutionForm'
import { FlowStepModal } from './FlowStepModal'

const { Title, Text } = Typography

interface ExecutionWizardProps {
  template: FlowTemplate
  onExecute: (executionConfig: ExecutionConfiguration) => Promise<void>
  onCancel: () => void
  launchingUser?: {
    id: string
    name?: string
  }
  'data-testid'?: string
}

interface ExecutionConfiguration {
  resolvedAssignments: { [stepIndex: string]: any }
  executionTimeAssignments: { [stepIndex: string]: any }
  inputValues: { [stepIndex: string]: { [inputId: string]: any } }
}

interface StepConfiguration {
  title?: string
  message?: string
  assignment?: any
  inputValues?: { [key: string]: any }
  links?: any[]
}

export const ExecutionWizard: React.FC<ExecutionWizardProps> = ({
  template,
  onExecute,
  onCancel,
  launchingUser,
  'data-testid': testId = 'execution-wizard'
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [stepConfigurations, setStepConfigurations] = useState<{ [stepIndex: number]: StepConfiguration }>({})
  const [isExecuting, setIsExecuting] = useState(false)
  const [previewModalVisible, setPreviewModalVisible] = useState(false)
  const [previewStep, setPreviewStep] = useState<FlowStep | null>(null)
  const [previewStepIndex, setPreviewStepIndex] = useState(-1)

  // Initialize step configurations
  useEffect(() => {
    const initialConfigurations: { [stepIndex: number]: StepConfiguration } = {}
    template.steps.forEach((step, index) => {
      initialConfigurations[index] = {
        title: step.title,
        message: step.message,
        assignment: step.assignment || null,
        inputValues: {},
        links: step.links || []
      }
    })
    setStepConfigurations(initialConfigurations)
  }, [template])

  const updateStepConfiguration = (stepIndex: number, updates: Partial<StepConfiguration>) => {
    setStepConfigurations(prev => ({
      ...prev,
      [stepIndex]: { ...prev[stepIndex], ...updates }
    }))
  }

  const getStepIcon = (stepType: string) => {
    switch (stepType) {
      case 'TASK':
        return <UserIcon size={16} />
      case 'APPROVAL':
        return <GearIcon />
      case 'INFORMATION':
        return <ChatCircleIcon size={16} />
      case 'ACKNOWLEDGE':
        return <CheckCircleIcon size={16} />
      default:
        return <FileTextIcon />
    }
  }

  const wizardSteps = template.steps.map((step, index) => ({
    title: step.title,
    icon: getStepIcon(step.type),
    status: (currentStep === index ? 'process' : currentStep > index ? 'finish' : 'wait') as
      | 'process'
      | 'finish'
      | 'wait'
      | 'error'
  }))

  const currentStepData = template.steps[currentStep]
  const currentStepConfig = stepConfigurations[currentStep]

  const handleNext = () => {
    if (currentStep < template.steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handlePreview = (stepIndex: number) => {
    const step = template.steps[stepIndex]
    const config = stepConfigurations[stepIndex]

    setPreviewStep({
      ...step,
      title: config?.title || step.title,
      message: config?.message || step.message,
      links: config?.links || step.links
    })
    setPreviewStepIndex(stepIndex)
    setPreviewModalVisible(true)
  }

  const handleExecute = async () => {
    try {
      setIsExecuting(true)

      // Build execution configuration
      const resolvedAssignments: { [stepIndex: string]: any } = {}
      const executionTimeAssignments: { [stepIndex: string]: any } = {}
      const inputValues: { [stepIndex: string]: { [inputId: string]: any } } = {}

      template.steps.forEach((step, index) => {
        const config = stepConfigurations[index]

        if (step.assignment) {
          resolvedAssignments[`step_${index}`] = step.assignment
        } else if (config?.assignment) {
          executionTimeAssignments[`step_${index}`] = config.assignment
        } else if (launchingUser?.id) {
          // Auto-assign to launching user if no assignment is configured
          executionTimeAssignments[`step_${index}`] = {
            targets: [{ entity: 'user', id: launchingUser.id }],
            allowReassignment: true
          }
        }

        if (config?.inputValues) {
          inputValues[`step_${index}`] = config.inputValues
        }
      })

      const executionConfig: ExecutionConfiguration = {
        resolvedAssignments,
        executionTimeAssignments,
        inputValues
      }

      await onExecute(executionConfig)
      message.success(getTranslationFromI18nKeyAndLabel('flow.execution.success', 'Flow executed successfully'))
    } catch (error) {
      message.error(getTranslationFromI18nKeyAndLabel('flow.execution.error', 'Failed to execute flow'))
      console.error('Execution error:', error)
    } finally {
      setIsExecuting(false)
    }
  }

  const canExecute = template.steps.every((step, index) => {
    const config = stepConfigurations[index]
    // Check if steps that need execution-time assignment have been configured
    if (!step.assignment && !config?.assignment) {
      return false
    }
    return true
  })

  return (
    <div>
      <div className="gba:space-y-6">
        {/* Template Info */}
        <div className="gba:bg-gray-50 gba:p-4 gba:rounded-lg">
          <Title level={5} className="gba:mb-2">
            {template.name}
          </Title>
          <Text className="gba:text-gray-600">{template.description}</Text>
        </div>

        {/* Steps Progress */}
        <Steps
          current={currentStep}
          items={wizardSteps}
          size="small"
          className="gba:mb-8"
          data-testid={`${testId}-steps`}
        />

        {/* Current Step Configuration */}
        {currentStepData && currentStepConfig && (
          <div className="gba:space-y-4">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-4 gba:mt-6">
              <div className="gba:flex gba:items-center gba:gap-2 pl-2">
                <Title level={5} className="gba:mb-0">
                  {getTranslationFromI18nKeyAndLabel('flow.execution.configureStep', 'Configure Step')}:{' '}
                  {currentStepData.title}
                </Title>
              </div>
              <Button
                icon={<EyeIcon size={16} />}
                onClick={() => handlePreview(currentStep)}
                data-testid={`${testId}-preview-button`}
              >
                {getTranslationFromI18nKeyAndLabel('flow.execution.preview', 'Preview')}
              </Button>
            </div>

            <StepExecutionForm
              step={currentStepData}
              stepIndex={currentStep}
              configuration={currentStepConfig}
              onConfigurationChange={updates => updateStepConfiguration(currentStep, updates)}
              data-testid={`${testId}-step-form`}
            />
          </div>
        )}

        {/* Navigation */}
        <div className="gba:flex gba:justify-between gba:items-center gba:pt-4 gba:border-t">
          <div className="gba:flex gba:gap-2">
            <Button onClick={onCancel} data-testid={`${testId}-cancel-button`}>
              {getTranslationFromI18nKeyAndLabel('flow.execution.cancel', 'Cancel')}
            </Button>
          </div>

          <div className="gba:flex gba:gap-2">
            <Button onClick={handlePrevious} disabled={currentStep === 0} data-testid={`${testId}-previous-button`}>
              {getTranslationFromI18nKeyAndLabel('flow.execution.previous', 'Previous')}
            </Button>

            {currentStep < template.steps.length - 1 ? (
              <Button type="primary" onClick={handleNext} data-testid={`${testId}-next-button`}>
                {getTranslationFromI18nKeyAndLabel('flow.execution.next', 'Next')}
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={handleExecute}
                loading={isExecuting}
                disabled={!canExecute}
                data-testid={`${testId}-execute-button`}
              >
                {getTranslationFromI18nKeyAndLabel('flow.execution.execute', 'Execute Flow')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewStep && (
        <FlowStepModal
          visible={previewModalVisible}
          task={{
            taskId: `preview-${previewStepIndex}`,
            stepIndex: previewStepIndex,
            title: previewStep.title,
            message: previewStep.message,
            stepType: previewStep.type,
            links: previewStep.links || [],
            inputs: previewStep.inputs || [],
            assignee: launchingUser?.name || launchingUser?.id || 'Current User',
            allowReassignment: previewStep.assignment?.allowReassignment || false
          }}
          onComplete={async () => {}} // No-op for preview
          onCancel={() => setPreviewModalVisible(false)}
          readOnly={true}
          data-testid={`${testId}-preview-modal`}
        />
      )}
    </div>
  )
}
