import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Button, Input, Form, Alert, Collapse, Badge } from 'antd'
import { PlusIcon, GearIcon, InfoIcon, CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react'
import {
  Shield,
  Megaphone,
  Target,
  MessageSquare,
  FileText,
  HandHeart,
  UserCheck,
  GitBranch,
  CheckSquare,
  LucideIcon
} from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useWizardStore } from '../../hooks/useWizardStore'
import { BusinessPattern } from '../../types/businessPatterns'
import { PatternSelector } from './PatternSelector'

const { Panel } = Collapse
const { TextArea } = Input

interface TemplateSetupFormProps {
  'data-testid'?: string
}

// Icon mapping for Lucide icons
const ICON_MAP: Record<string, LucideIcon> = {
  Shield: Shield,
  Megaphone: Megaphone,
  Target: Target,
  MessageSquare: MessageSquare,
  FileText: FileText,
  HandHeart: HandHeart,
  UserCheck: UserCheck,
  GitBranch: GitBranch,
  CheckSquare: CheckSquare
}

// Helper function to render Lucide icons
const renderIcon = (iconName: string, className?: string, style?: React.CSSProperties) => {
  const IconComponent = ICON_MAP[iconName]
  if (!IconComponent) {
    console.warn(`Icon "${iconName}" not found in ICON_MAP`)
    return (
      <div className={className} style={style}>
        ?
      </div>
    )
  }
  return <IconComponent className={className} style={style} />
}

/**
 * Combined template setup form with optional pattern selection and basic info
 */
export const TemplateSetupForm: React.FC<TemplateSetupFormProps> = ({
  'data-testid': testId = 'template-setup-form'
}) => {
  const { selectedPattern, configuration, selectPattern, skipPattern, updateConfiguration, isEditMode } =
    useWizardStore()

  const [showPatternSelector, setShowPatternSelector] = useState(false)
  const [form] = Form.useForm()

  // Handle pattern selection
  const handlePatternSelect = (pattern: BusinessPattern) => {
    selectPattern(pattern)
    setShowPatternSelector(false)

    // Auto-populate title if empty
    if (!configuration.title) {
      const suggestedTitle = `${pattern.title} Workflow`
      updateConfiguration('title', suggestedTitle)
      form.setFieldsValue({ title: suggestedTitle })
    }

    // Auto-populate description if empty
    if (!configuration.description) {
      updateConfiguration('description', pattern.description)
      form.setFieldsValue({ description: pattern.description })
    }
  }

  // Handle skipping pattern selection (custom workflow)
  const handleSkipPattern = () => {
    skipPattern()
    setShowPatternSelector(false)
  }

  // Handle form field changes
  const handleFieldChange = (field: string, value: string) => {
    updateConfiguration(field, value)
  }

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* Header */}
      <div className="gba:text-center" data-testid={`${testId}-header`}>
        <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900 gba:mb-2">
          {isEditMode
            ? getTranslationFromI18nKeyAndLabel('flow.wizard.editTemplate', 'Edit Workflow Definition')
            : getTranslationFromI18nKeyAndLabel('flow.wizard.createTemplate', 'Create Workflow Definition')}
        </h2>
        <p className="gba:text-gray-600">
          {isEditMode
            ? getTranslationFromI18nKeyAndLabel(
                'flow.wizard.editTemplateDescription',
                'Update your workflow definition details'
              )
            : getTranslationFromI18nKeyAndLabel(
                'flow.wizard.createTemplateDescription',
                'Start with a business pattern or create a custom workflow'
              )}
        </p>
      </div>

      {/* Pattern Selection (Collapsible) - Only show in create mode */}
      {!isEditMode && (
        <Card data-testid={`${testId}-pattern-section`}>
          <CardHeader className="gba:cursor-pointer" onClick={() => setShowPatternSelector(!showPatternSelector)}>
            <CardTitle className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex gba:items-center gba:gap-3">
                <GearIcon size={16} className="gba:text-blue-500" />
                <span>
                  {getTranslationFromI18nKeyAndLabel('flow.wizard.quickStart', 'Quick Start with Business Pattern')}
                </span>
                <Badge color="blue" text={getTranslationFromI18nKeyAndLabel('flow.wizard.optional', 'Optional')} />
              </div>
              <div className="gba:flex gba:items-center gba:gap-2">
                {selectedPattern && (
                  <div className="gba:flex gba:items-center gba:gap-2">
                    {renderIcon(selectedPattern.icon, 'gba:w-4 gba:h-4', { color: selectedPattern.color })}
                    <span className="gba:text-sm gba:text-gray-600">{selectedPattern.title}</span>
                  </div>
                )}
                {showPatternSelector ? <CaretDownIcon size={16} /> : <CaretRightIcon size={16} />}
              </div>
            </CardTitle>
          </CardHeader>

          {showPatternSelector && (
            <CardContent>
              <div className="gba:space-y-4">
                <Alert
                  message={getTranslationFromI18nKeyAndLabel(
                    'flow.wizard.patternHelp',
                    'Choose a business pattern to get pre-configured steps and smart defaults'
                  )}
                  type="info"
                  showIcon
                  icon={<InfoIcon size={16} />}
                />

                <PatternSelector
                  onNext={() => setShowPatternSelector(false)} // Close selector when pattern is selected
                  data-testid={`${testId}-pattern-selector`}
                />
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Selected Pattern Summary */}
      {selectedPattern && (
        <Card className="gba:bg-blue-50 gba:border-blue-200" data-testid={`${testId}-selected-pattern`}>
          <CardContent className="gba:pt-6">
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex gba:items-center gba:gap-3">
                {renderIcon(selectedPattern.icon, 'gba:w-6 gba:h-6', { color: selectedPattern.color })}
                <div>
                  <h4 className="gba:font-semibold gba:text-gray-900">
                    {getTranslationFromI18nKeyAndLabel('flow.wizard.selectedPattern', 'Selected Pattern')}:{' '}
                    {selectedPattern.title}
                  </h4>
                  <p className="gba:text-sm gba:text-gray-600">{selectedPattern.description}</p>
                </div>
              </div>
              <Button
                size="small"
                onClick={() => {
                  skipPattern()
                  form.setFieldsValue({ title: '', description: '' })
                }}
                data-testid={`${testId}-clear-pattern`}
              >
                {getTranslationFromI18nKeyAndLabel('flow.wizard.clearPattern', 'Clear')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic Information Form */}
      <Card data-testid={`${testId}-basic-info`} className="gba:pt-4">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <FileText className="gba:w-5 gba:h-5 gba:text-gray-600" />
            {getTranslationFromI18nKeyAndLabel('flow.wizard.templateDetails', 'Definition Details')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              title: configuration.title || '',
              description: configuration.description || ''
            }}
            onValuesChange={changedValues => {
              Object.entries(changedValues).forEach(([key, value]) => {
                handleFieldChange(key, value as string)
              })
            }}
          >
            <Form.Item
              label={getTranslationFromI18nKeyAndLabel('flow.creator.name', 'Workflow Name')}
              name="title"
              rules={[
                { required: true, message: 'Please enter a workflow name' },
                { min: 3, message: 'Name must be at least 3 characters' },
                { max: 100, message: 'Name must not exceed 100 characters' }
              ]}
            >
              <Input
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'flow.creator.namePlaceholder',
                  'Enter a descriptive name for your workflow'
                )}
                data-testid={`${testId}-title-input`}
              />
            </Form.Item>

            <Form.Item
              label={getTranslationFromI18nKeyAndLabel('flow.creator.description', 'Description')}
              name="description"
              rules={[{ max: 500, message: 'Description must not exceed 500 characters' }]}
            >
              <TextArea
                rows={4}
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'flow.creator.descriptionPlaceholder',
                  'Describe the purpose and scope of this workflow'
                )}
                data-testid={`${testId}-description-input`}
              />
            </Form.Item>
          </Form>
        </CardContent>
      </Card>

      {/* Next Steps Preview */}
      <Card className="gba:bg-gray-50" data-testid={`${testId}-next-steps`}>
        <CardContent className="gba:pt-6">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
            <PlusIcon size={16} className="gba:text-gray-600" />
            <h4 className="gba:font-semibold gba:text-gray-900">
              {getTranslationFromI18nKeyAndLabel('flow.wizard.nextSteps', 'Next: Configure Steps')}
            </h4>
          </div>
          <p className="gba:text-sm gba:text-gray-600">
            {selectedPattern
              ? getTranslationFromI18nKeyAndLabel(
                  'flow.wizard.nextStepsWithPattern',
                  `You'll start with ${selectedPattern.preConfiguredSteps.length} pre-configured steps that you can customize.`
                )
              : getTranslationFromI18nKeyAndLabel(
                  'flow.wizard.nextStepsCustom',
                  "You'll create your workflow steps from scratch with full control over every detail."
                )}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
