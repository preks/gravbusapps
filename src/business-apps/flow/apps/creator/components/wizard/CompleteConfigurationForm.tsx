import React, { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Textarea,
  Label,
  Alert,
  AlertDescription,
  Button
} from '@newwork/nw-design-system'
import { Settings } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useWizardStore } from '../../hooks/useWizardStore'
import { useFlowTemplateStore } from '../../hooks/useFlowTemplateStore'
import { StepsSection } from '../steps/StepsSection'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface CompleteConfigurationFormProps {
  context?: BusinessAppContextProps
  'data-testid'?: string
}

/**
 * Single-step form combining template details, optional pattern selection, and step configuration
 */
export const CompleteConfigurationForm: React.FC<CompleteConfigurationFormProps> = ({
  context,
  'data-testid': testId = 'complete-configuration-form'
}) => {
  const { selectedPattern, configuration, skipPattern, updateConfiguration } = useWizardStore()

  const { updateTitle, updateDescription, initializeTemplate, flowTemplate } = useFlowTemplateStore()

  // Local state for form inputs
  const [title, setTitle] = useState(configuration.title || flowTemplate.name || '')
  const [description, setDescription] = useState(configuration.description || flowTemplate.description || '')

  // Sync wizard configuration with flow template store and local state
  useEffect(() => {
    if (configuration.title) {
      updateTitle(configuration.title)
      setTitle(configuration.title)
    }
    if (configuration.description) {
      updateDescription(configuration.description)
      setDescription(configuration.description)
    }
  }, [configuration.title, configuration.description, updateTitle, updateDescription])

  // Sync steps from wizard configuration to flow template store - one way only
  useEffect(() => {
    if (configuration.steps && configuration.steps.length > 0) {
      initializeTemplate({
        ...flowTemplate,
        name: configuration.title || flowTemplate.name || '',
        description: configuration.description || flowTemplate.description || '',
        steps: configuration.steps
      })
    }
  }, [configuration.steps, configuration.title, configuration.description, initializeTemplate])

  // REMOVED: The circular dependency that was syncing flowTemplate.steps back to configuration
  // This was causing infinite loops. StepsSection works directly with flowTemplate now.

  // REMOVED: handlePatternSelect function - logic now handled by:
  // 1. useWizardStore.applyPatternDefaults() when pattern is selected
  // 2. useEffect hooks above that sync configuration to form and flow template

  // REMOVED: This useEffect was causing infinite loops because handlePatternSelect
  // is not memoized and gets recreated on every render. Pattern application
  // now happens directly in the PatternSelector component.

  // Handle clearing pattern selection
  const handleClearPattern = () => {
    skipPattern()
    setTitle('')
    setDescription('')
    updateTitle('')
    updateDescription('')
    updateConfiguration('title', '')
    updateConfiguration('description', '')
    updateConfiguration('steps', [])
    // Reset flow template to empty state
    initializeTemplate({
      type: 'TEMPLATE',
      name: '',
      description: '',
      version: 1, // Required field
      steps: []
    })
  }

  // Handle form field changes
  const handleTitleChange = (value: string) => {
    setTitle(value)
    updateTitle(value)
    updateConfiguration('title', value)
  }

  const handleDescriptionChange = (value: string) => {
    setDescription(value)
    updateDescription(value)
    updateConfiguration('description', value)
  }

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* Selected Pattern Summary - Show only if pattern was selected */}
      {selectedPattern && (
        <Alert className="gba:border-green-200 gba:bg-green-50">
          <Settings className="gba:h-4 gba:w-4 gba:text-green-600" />
          <AlertDescription className="gba:text-green-800">
            <div className="gba:flex gba:items-center gba:justify-between">
              <span>
                <strong>{getTranslationFromI18nKeyAndLabel('flow.wizard.selectedPattern', 'Selected Pattern')}:</strong>{' '}
                {selectedPattern.title}
              </span>
              <Button variant="outline" size="sm" onClick={handleClearPattern} data-testid={`${testId}-clear-pattern`}>
                {getTranslationFromI18nKeyAndLabel('flow.wizard.clearPattern', 'Clear')}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Template Details Form */}
      <Card data-testid={`${testId}-basic-info`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Settings className="gba:h-5 gba:w-5 gba:text-blue-500" />
            {getTranslationFromI18nKeyAndLabel('flow.creator.templateDetails', 'Flow Details')}
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-6">
          <div className="gba:space-y-2">
            <Label htmlFor="flow-title" className="gba:text-sm gba:font-medium gba:text-gray-700">
              {getTranslationFromI18nKeyAndLabel('flow.creator.name', 'Flow Name')}
              <span className="gba:text-red-500 gba:ml-1">*</span>
            </Label>
            <Input
              id="flow-title"
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder={getTranslationFromI18nKeyAndLabel(
                'flow.creator.namePlaceholder',
                'Enter a descriptive name for your flow'
              )}
              className="gba:w-full"
              data-testid={`${testId}-title-input`}
            />
            {title.length > 0 && title.length < 3 && (
              <p className="gba:text-sm gba:text-red-600">Name must be at least 3 characters</p>
            )}
            {title.length > 100 && <p className="gba:text-sm gba:text-red-600">Name must not exceed 100 characters</p>}
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="flow-description" className="gba:text-sm gba:font-medium gba:text-gray-700">
              {getTranslationFromI18nKeyAndLabel('flow.creator.description', 'Description')}
            </Label>
            <Textarea
              id="flow-description"
              value={description}
              onChange={e => handleDescriptionChange(e.target.value)}
              placeholder={getTranslationFromI18nKeyAndLabel(
                'flow.creator.descriptionPlaceholder',
                'Describe the purpose and scope of this flow'
              )}
              rows={3}
              className="gba:w-full gba:resize-none"
              data-testid={`${testId}-description-input`}
            />
            {description.length > 500 && (
              <p className="gba:text-sm gba:text-red-600">Description must not exceed 500 characters</p>
            )}
            <p className="gba:text-xs gba:text-gray-500">{description.length}/500 characters</p>
          </div>
        </CardContent>
      </Card>

      {/* Steps Configuration */}
      <div data-testid={`${testId}-steps-section`}>
        <StepsSection accessToken={context?.accessToken} context={context} />
      </div>
    </div>
  )
}
