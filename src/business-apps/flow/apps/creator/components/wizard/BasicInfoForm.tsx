import React, { useState, useEffect } from 'react'
import { Input, Textarea, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Alert, AlertDescription } from '@newwork/nw-design-system'
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

interface BasicInfoFormProps {
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
 * Basic information form for workflow template creation
 */
export const BasicInfoForm: React.FC<BasicInfoFormProps> = ({ 'data-testid': testId = 'basic-info-form' }) => {
  const { selectedPattern, configuration, updateConfiguration } = useWizardStore()
  const [localTitle, setLocalTitle] = useState(configuration.title || '')
  const [localDescription, setLocalDescription] = useState(configuration.description || '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Update local state when configuration changes
  useEffect(() => {
    setLocalTitle(configuration.title || '')
    setLocalDescription(configuration.description || '')
  }, [configuration.title, configuration.description])

  // Validate fields
  const validateField = (field: string, value: string): string | null => {
    switch (field) {
      case 'title':
        if (!value.trim()) {
          return 'Title is required'
        }
        if (value.length < 3) {
          return 'Title must be at least 3 characters'
        }
        if (value.length > 100) {
          return 'Title must be less than 100 characters'
        }
        return null

      case 'description':
        if (value.length > 500) {
          return 'Description must be less than 500 characters'
        }
        return null

      default:
        return null
    }
  }

  // Handle title change
  const handleTitleChange = (value: string) => {
    setLocalTitle(value)
    const error = validateField('title', value)
    setErrors(prev => ({ ...prev, title: error || '' }))

    if (!error) {
      updateConfiguration('title', value)
    }
  }

  // Handle description change
  const handleDescriptionChange = (value: string) => {
    setLocalDescription(value)
    const error = validateField('description', value)
    setErrors(prev => ({ ...prev, description: error || '' }))

    if (!error) {
      updateConfiguration('description', value)
    }
  }

  // Generate suggested title based on pattern
  const getSuggestedTitle = (): string => {
    if (!selectedPattern) return ''

    const suggestions = [
      `${selectedPattern.title} Process`,
      `${selectedPattern.title} Workflow`,
      `${selectedPattern.title} Request`,
      `${selectedPattern.title} Review`
    ]

    return suggestions[0]
  }

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* Header */}
      <div className="gba:text-center gba:mb-6" data-testid={`${testId}-header`}>
        <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900 gba:mb-2">
          {getTranslationFromI18nKeyAndLabel('flow.wizard.basicInfo', 'Basic Information')}
        </h2>
        <p className="gba:text-gray-600">
          {getTranslationFromI18nKeyAndLabel(
            'flow.wizard.basicInfoDescription',
            'Provide a title and description for your workflow'
          )}
        </p>
      </div>

      {/* Pattern Context */}
      {selectedPattern && (
        <Card className="gba:bg-blue-50 gba:border-blue-200" data-testid={`${testId}-pattern-context`}>
          <CardHeader className="gba:pb-3">
            <CardTitle className="gba:flex gba:items-center gba:space-x-2 gba:text-lg">
              {renderIcon(selectedPattern.icon, 'gba:w-5 gba:h-5', { color: selectedPattern.color })}
              <span>Creating: {selectedPattern.title}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="gba:text-gray-700 gba:mb-3">{selectedPattern.description}</p>
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              {selectedPattern.useCases.slice(0, 3).map((useCase, index) => (
                <span
                  key={index}
                  className="gba:px-2 gba:py-1 gba:bg-blue-100 gba:text-blue-800 gba:text-xs gba:rounded-full"
                >
                  {useCase}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Fields */}
      <div className="gba:space-y-6">
        {/* Title Field */}
        <div className="gba:space-y-2" data-testid={`${testId}-title-field`}>
          <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
            {getTranslationFromI18nKeyAndLabel('flow.wizard.title', 'Workflow Title')}
            <span className="gba:text-red-500 gba:ml-1">*</span>
          </label>

          <Input
            value={localTitle}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder={getSuggestedTitle() || 'Enter workflow title...'}
            className={`gba:w-full ${errors.title ? 'gba:border-red-500' : ''}`}
            data-testid={`${testId}-title-input`}
          />

          {errors.title && (
            <Alert variant="destructive" data-testid={`${testId}-title-error`}>
              <AlertDescription>{errors.title}</AlertDescription>
            </Alert>
          )}

          {/* Title Suggestions */}
          {selectedPattern && !localTitle && (
            <div className="gba:mt-2">
              <p className="gba:text-xs gba:text-gray-500 gba:mb-2">Suggestions:</p>
              <div className="gba:flex gba:flex-wrap gba:gap-2">
                {[
                  `${selectedPattern.title} Process`,
                  `${selectedPattern.title} Workflow`,
                  `${selectedPattern.title} Request`
                ].map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleTitleChange(suggestion)}
                    className="gba:px-3 gba:py-1 gba:bg-gray-100 gba:text-gray-700 gba:text-sm gba:rounded gba:hover:bg-gray-200 gba:transition-colors"
                    data-testid={`${testId}-title-suggestion-${index}`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Description Field */}
        <div className="gba:space-y-2" data-testid={`${testId}-description-field`}>
          <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-700">
            {getTranslationFromI18nKeyAndLabel('flow.wizard.description', 'Workflow Description')}
          </label>
          <Textarea
            value={localDescription}
            onChange={e => handleDescriptionChange(e.target.value)}
            placeholder="Enter workflow description (optional)"
            className={`gba:w-full ${errors.description ? 'gba:border-red-500' : ''}`}
            data-testid={`${testId}-description-input`}
          />
          {errors.description && (
            <Alert variant="destructive" data-testid={`${testId}-description-error`}>
              <AlertDescription>{errors.description}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Pattern-Specific Tips */}
      {selectedPattern && (
        <Card className="gba:bg-yellow-50 gba:border-yellow-200" data-testid={`${testId}-tips`}>
          <CardHeader className="gba:pb-3">
            <CardTitle className="gba:text-lg gba:text-yellow-800">💡 Tips for {selectedPattern.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="gba:space-y-2 gba:text-sm gba:text-yellow-700">
              {selectedPattern.id === 'single-approver' && (
                <>
                  <li>• Include the type of approval needed in the title</li>
                  <li>• Mention the approval criteria in the description</li>
                  <li>• Consider adding urgency level if applicable</li>
                </>
              )}
              {selectedPattern.id === 'announcement' && (
                <>
                  <li>• Use clear, attention-grabbing titles</li>
                  <li>• Include the target audience in the description</li>
                  <li>• Mention if action is required after reading</li>
                </>
              )}
              {selectedPattern.id === 'task-assignment' && (
                <>
                  <li>• Be specific about what needs to be accomplished</li>
                  <li>• Include expected deliverables in the description</li>
                  <li>• Mention any dependencies or prerequisites</li>
                </>
              )}
              {selectedPattern.id === 'document-review' && (
                <>
                  <li>• Specify the type of document being reviewed</li>
                  <li>• Include review criteria and expectations</li>
                  <li>• Mention the review deadline and format</li>
                </>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Validation Summary */}
      <div className="gba:mt-6" data-testid={`${testId}-validation`}>
        {Object.keys(errors).length === 0 && localTitle && (
          <Alert className="gba:bg-green-50 gba:border-green-200" data-testid={`${testId}-success`}>
            <AlertDescription className="gba:text-green-800">
              ✓ Basic information is complete. You can proceed to the next step.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
