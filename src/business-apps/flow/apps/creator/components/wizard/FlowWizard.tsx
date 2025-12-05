import React from 'react'
import { Card, CardContent, Button, Alert, AlertDescription } from '@newwork/nw-design-system'
import { AlertTriangle } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useWizardStore } from '../../hooks/useWizardStore'
import { CompleteConfigurationForm } from './CompleteConfigurationForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface FlowWizardProps {
  onComplete: (template: any) => void
  onCancel: () => void
  context?: BusinessAppContextProps
  'data-testid'?: string
}

/**
 * Multi-step wizard for creating workflow templates
 */
export const FlowWizard: React.FC<FlowWizardProps> = ({
  onComplete,
  onCancel,
  context,
  'data-testid': testId = 'flow-wizard'
}) => {
  const { currentStep, selectedPattern, configuration, isEditMode, generateTemplate } = useWizardStore()

  const currentStepInfo = useWizardStore.getState().steps[currentStep]

  // Use wizard store validation
  const isValid = useWizardStore.getState().validateCurrentStep()

  // Get validation message
  const getValidationMessage = () => {
    if (!configuration.title || configuration.title.trim().length === 0) {
      return 'Please provide a flow title'
    }
    if (!configuration.steps || configuration.steps.length === 0) {
      return 'Please add at least one flow step'
    }
    return ''
  }

  const handleComplete = () => {
    if (!isValid) return

    // Generate the actual FlowTemplate using the wizard store
    const flowTemplate = generateTemplate()

    const template = {
      template: flowTemplate,
      pattern: selectedPattern,
      configuration,
      createdAt: new Date().toISOString()
    }

    onComplete(template)
  }

  const handleCancel = () => {
    onCancel()
  }

  const renderCurrentStep = () => {
    switch (currentStepInfo.id) {
      case 'complete-configuration':
        return <CompleteConfigurationForm context={context} data-testid={`${testId}-complete-configuration`} />

      default:
        return <div>Unknown step</div>
    }
  }

  return (
    <div className="gba:mx-auto gba:p-6" data-testid={testId}>
      <Card>
        <CardContent className="gba:space-y-6">
          {renderCurrentStep()}

          {!isValid && (
            <Alert className="gba:border-amber-200 gba:bg-amber-50">
              <AlertTriangle className="gba:h-4 gba:w-4 gba:text-amber-600" />
              <AlertDescription className="gba:text-amber-800">{getValidationMessage()}</AlertDescription>
            </Alert>
          )}

          <div className="gba:flex gba:justify-between gba:pt-6 gba:border-t gba:border-gray-200">
            <Button variant="outline" onClick={handleCancel} data-testid={`${testId}-cancel-button`}>
              {getTranslationFromI18nKeyAndLabel('flow.creator.cancel', 'Cancel')}
            </Button>

            <div className="gba:flex gba:gap-3">
              <Button
                onClick={handleComplete}
                disabled={!isValid}
                className="gba:bg-gradient-to-r gba:from-blue-600 gba:to-indigo-600 gba:hover:from-blue-700 gba:hover:to-indigo-700 gba:text-white gba:font-semibold gba:px-6 gba:py-2 gba:rounded-lg gba:shadow-lg gba:shadow-blue-500/25 gba:transition-all gba:duration-200 gba:hover:shadow-xl gba:hover:shadow-blue-500/40 gba:hover:scale-[1.02]"
                data-testid={`${testId}-complete-button`}
              >
                {isEditMode
                  ? getTranslationFromI18nKeyAndLabel('flow.creator.saveChanges', 'Save Changes')
                  : getTranslationFromI18nKeyAndLabel('flow.creator.complete', 'Create Flow')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
