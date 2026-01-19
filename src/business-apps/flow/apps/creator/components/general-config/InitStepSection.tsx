import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFlowTemplateStore } from '../../hooks/useFlowTemplateStore'
import { InputBlock, InputType } from '@/common/network/flows/FlowTemplateClient'
import {
  Input,
  Label,
  Textarea,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch
} from '@newwork/nw-design-system'
import { Plus, X } from 'lucide-react'

interface InputBlockEditorProps {
  input: InputBlock
  onChange: (input: InputBlock) => void
  'data-testid'?: string
}

/**
 * Simple input block editor for init step inputs
 */
const InputBlockEditor: React.FC<InputBlockEditorProps> = ({
  input,
  onChange,
  'data-testid': testId = 'input-block-editor'
}) => {
  const handleUpdate = (updates: Partial<InputBlock>) => {
    onChange({ ...input, ...updates })
  }

  return (
    <div className="gba:space-y-3" data-testid={testId}>
      <div className="gba:grid gba:grid-cols-2 gba:gap-3">
        <div className="gba:space-y-2">
          <Label htmlFor={`${testId}-type`}>
            {getTranslationFromI18nKeyAndLabel('flow.creator.input.type', 'Type')}
          </Label>
          <Select
            value={input.type}
            onValueChange={(value: InputType) => handleUpdate({ type: value })}
            data-testid={`${testId}-type-select`}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={InputType.TEXT}>Text</SelectItem>
              <SelectItem value={InputType.TEXTAREA}>Textarea</SelectItem>
              <SelectItem value={InputType.NUMBER}>Number</SelectItem>
              <SelectItem value={InputType.SELECT}>Select</SelectItem>
              <SelectItem value={InputType.MULTISELECT}>Multi-Select</SelectItem>
              <SelectItem value={InputType.DATE}>Date</SelectItem>
              <SelectItem value={InputType.CHECKBOX}>Checkbox</SelectItem>
              <SelectItem value={InputType.FILE}>File</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="gba:space-y-2">
          <Label htmlFor={`${testId}-name`}>
            {getTranslationFromI18nKeyAndLabel('flow.creator.input.name', 'Name')}
          </Label>
          <Input
            id={`${testId}-name`}
            value={input.name}
            onChange={e => handleUpdate({ name: e.target.value })}
            placeholder="input_name"
            data-testid={`${testId}-name-input`}
          />
        </div>
      </div>

      <div className="gba:space-y-2">
        <Label htmlFor={`${testId}-label`}>
          {getTranslationFromI18nKeyAndLabel('flow.creator.input.label', 'Label')}
        </Label>
        <Input
          id={`${testId}-label`}
          value={input.label}
          onChange={e => handleUpdate({ label: e.target.value })}
          placeholder="Enter field label"
          data-testid={`${testId}-label-input`}
        />
      </div>

      <div className="gba:flex gba:items-center gba:space-x-2">
        <Switch
          checked={input.required || false}
          onCheckedChange={required => handleUpdate({ required })}
          data-testid={`${testId}-required-switch`}
        />
        <Label htmlFor={`${testId}-required`}>
          {getTranslationFromI18nKeyAndLabel('flow.creator.input.required', 'Required')}
        </Label>
      </div>

      {/* Options for SELECT and MULTISELECT */}
      {(input.type === InputType.SELECT || input.type === InputType.MULTISELECT) && (
        <div className="gba:space-y-2">
          <Label>{getTranslationFromI18nKeyAndLabel('flow.creator.input.options', 'Options')}</Label>
          <div className="gba:space-y-2">
            {input.options?.map((option, index) => (
              <div key={index} className="gba:flex gba:items-center gba:space-x-2">
                <Input
                  value={option.value}
                  onChange={e => {
                    const newOptions = [...(input.options || [])]
                    newOptions[index] = { ...option, value: e.target.value }
                    handleUpdate({ options: newOptions })
                  }}
                  placeholder="Value"
                  className="gba:flex-1"
                />
                <Input
                  value={option.label}
                  onChange={e => {
                    const newOptions = [...(input.options || [])]
                    newOptions[index] = { ...option, label: e.target.value }
                    handleUpdate({ options: newOptions })
                  }}
                  placeholder="Label"
                  className="gba:flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newOptions = input.options?.filter((_, i) => i !== index) || []
                    handleUpdate({ options: newOptions })
                  }}
                >
                  <X className="gba:w-4 gba:h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const newOptions = [...(input.options || []), { value: '', label: '' }]
                handleUpdate({ options: newOptions })
              }}
            >
              <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
              Add Option
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Init step configuration section for SELF_SERVICE flows
 */
export const InitStepSection: React.FC = () => {
  const {
    flowTemplate,
    updateInitStepTitle,
    updateInitStepMessage,
    addInitStepInput,
    removeInitStepInput,
    updateInitStepInput
  } = useFlowTemplateStore()

  // Only show for SELF_SERVICE flows
  if (flowTemplate.type !== 'SELF_SERVICE') {
    return null
  }

  const initStep = flowTemplate.initStep

  const handleAddInput = () => {
    const newInput: InputBlock = {
      type: InputType.TEXT,
      name: `input_${Date.now()}`,
      label: 'New Input',
      required: false
    }
    addInitStepInput(newInput)
  }

  return (
    <Card className="gba:w-full" data-testid="init-step-section">
      <CardHeader>
        <CardTitle className="gba:text-lg gba:font-semibold gba:text-gray-900">
          {getTranslationFromI18nKeyAndLabel('flow.creator.init_step.title', 'Initial Step Configuration')}
        </CardTitle>
        <p className="gba:text-sm gba:text-gray-600">
          {getTranslationFromI18nKeyAndLabel(
            'flow.creator.init_step.description',
            'Configure the initial step that users will see when starting this self-service flow'
          )}
        </p>
      </CardHeader>

      <CardContent className="gba:space-y-6">
        {/* Init Step Title */}
        <div className="gba:space-y-2">
          <Label htmlFor="init-step-title">
            {getTranslationFromI18nKeyAndLabel('flow.creator.init_step.step_title', 'Step Title')}
          </Label>
          <Input
            id="init-step-title"
            value={initStep?.title || ''}
            onChange={e => updateInitStepTitle(e.target.value)}
            placeholder={getTranslationFromI18nKeyAndLabel(
              'flow.creator.init_step.step_title_placeholder',
              'Enter step title'
            )}
            data-testid="init-step-title-input"
          />
        </div>

        {/* Init Step Message */}
        <div className="gba:space-y-2">
          <Label htmlFor="init-step-message">
            {getTranslationFromI18nKeyAndLabel('flow.creator.init_step.step_message', 'Step Message')}
          </Label>
          <Textarea
            id="init-step-message"
            value={initStep?.message || ''}
            onChange={e => updateInitStepMessage(e.target.value)}
            placeholder={getTranslationFromI18nKeyAndLabel(
              'flow.creator.init_step.step_message_placeholder',
              'Enter step message or instructions'
            )}
            rows={3}
            data-testid="init-step-message-input"
          />
        </div>

        {/* Init Step Inputs */}
        <div className="gba:space-y-4">
          <div className="gba:flex gba:items-center gba:justify-between">
            <Label className="gba:text-base gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('flow.creator.init_step.inputs', 'Input Fields')}
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddInput}
              data-testid="add-init-step-input-button"
            >
              <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
              {getTranslationFromI18nKeyAndLabel('flow.creator.init_step.add_input', 'Add Input')}
            </Button>
          </div>

          {initStep?.inputs && initStep.inputs.length > 0 ? (
            <div className="gba:space-y-3">
              {initStep.inputs.map((input, index) => (
                <div key={index} className="gba:border gba:rounded-lg gba:p-4 gba:bg-gray-50">
                  <div className="gba:flex gba:items-start gba:justify-between gba:mb-4">
                    <Label className="gba:text-sm gba:font-medium gba:text-gray-700">
                      {getTranslationFromI18nKeyAndLabel('flow.creator.init_step.input_field', 'Input Field')}{' '}
                      {index + 1}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInitStepInput(index)}
                      data-testid={`remove-init-step-input-${index}`}
                    >
                      <X className="gba:w-4 gba:h-4" />
                    </Button>
                  </div>

                  <InputBlockEditor
                    input={input}
                    onChange={(updatedInput: InputBlock) => updateInitStepInput(index, updatedInput)}
                    data-testid={`init-step-input-editor-${index}`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="gba:text-center gba:py-8 gba:text-gray-500">
              <p className="gba:text-sm">
                {getTranslationFromI18nKeyAndLabel('flow.creator.init_step.no_inputs', 'No input fields configured')}
              </p>
              <p className="gba:text-xs gba:mt-1">
                {getTranslationFromI18nKeyAndLabel(
                  'flow.creator.init_step.add_inputs_help',
                  'Add input fields to collect information from users when they start this flow'
                )}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
