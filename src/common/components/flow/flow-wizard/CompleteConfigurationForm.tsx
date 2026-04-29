import React, { useEffect, useState } from 'react'
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea
} from '@newwork/nw-design-system'
import { Settings } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFlowTemplateStore } from '@/common/data/flow/hooks/useFlowTemplateStore'
import { useWizardStore } from '@/common/data/flow/hooks/useFlowWizardStore'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { StepsSection } from './steps/StepsSection'

interface CompleteConfigurationFormProps {
  context?: BusinessAppContextProps
  'data-testid'?: string
}

export const CompleteConfigurationForm: React.FC<CompleteConfigurationFormProps> = ({
  context,
  'data-testid': testId = 'complete-configuration-form'
}) => {
  const { selectedPattern, configuration, skipPattern, updateConfiguration } = useWizardStore()
  const { updateTitle, updateDescription, initializeTemplate, flowTemplate } = useFlowTemplateStore()
  const [title, setTitle] = useState(configuration.title || flowTemplate.name || '')
  const [description, setDescription] = useState(configuration.description || flowTemplate.description || '')

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

  const handleClearPattern = () => {
    skipPattern()
    setTitle('')
    setDescription('')
    updateTitle('')
    updateDescription('')
    updateConfiguration('title', '')
    updateConfiguration('description', '')
    updateConfiguration('steps', [])
    initializeTemplate({
      type: 'TEMPLATE',
      name: '',
      description: '',
      version: 1,
      steps: []
    })
  }

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
              onChange={event => handleTitleChange(event.target.value)}
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
              onChange={event => handleDescriptionChange(event.target.value)}
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

      <div data-testid={`${testId}-steps-section`}>
        <StepsSection accessToken={context?.accessToken} context={context} />
      </div>
    </div>
  )
}
