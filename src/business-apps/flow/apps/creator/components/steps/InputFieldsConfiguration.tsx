import React from 'react';
import { Button, Input } from '@newwork/nw-design-system';
import { Select } from 'antd';
import { FormInput, Trash2 } from 'lucide-react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface InputFieldsConfigurationProps {
  step: any;
  testId: string;
  onUpdateStep: (updates: any) => void;
}

interface InputFieldsTriggerProps {
  step: any;
  testId: string;
  onUpdateStep: (updates: any) => void;
}

interface InputFieldsContentProps {
  step: any;
  testId: string;
  onUpdateStep: (updates: any) => void;
}

export const InputFieldsTrigger: React.FC<InputFieldsTriggerProps> = ({
  step,
  testId,
  onUpdateStep
}) => {
  return (
    <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:pr-4">
      <div className="gba:flex gba:items-center gba:gap-2">
        <FormInput className="gba:h-4 gba:w-4" />
        {getTranslationFromI18nKeyAndLabel('flow.creator.inputFields', 'Input Fields')}
      </div>
      <div className="gba:flex gba:items-center gba:gap-2">
        {step.inputs && step.inputs.length > 0 && (
          <span className="gba:text-xs gba:bg-purple-100 gba:text-purple-800 gba:px-2 gba:py-1 gba:rounded">
            {step.inputs.length} {step.inputs.length === 1 ? 'field' : 'fields'}
          </span>
        )}
      </div>
    </div>
  );
};

export const InputFieldsContent: React.FC<InputFieldsContentProps> = ({
  step,
  testId,
  onUpdateStep
}) => {
  const inputs = step.inputs || [];

  const handleAddInput = () => {
    const newInputs = [...inputs, { 
      id: `input-${Date.now()}`,
      type: 'text',
      name: `field${inputs.length + 1}`,
      label: 'New Field',
      required: false
    }];
    onUpdateStep({ inputs: newInputs });
  };

  const handleUpdateInput = (index: number, field: string, value: any) => {
    const newInputs = [...inputs];
    newInputs[index] = { ...newInputs[index], [field]: value };
    
    // Clear options when changing away from multi-option types
    if (field === 'type' && !['select', 'radio', 'checkbox'].includes(value)) {
      delete newInputs[index].options;
    }
    
    onUpdateStep({ inputs: newInputs });
  };

  const handleRemoveInput = (index: number) => {
    const newInputs = inputs.filter((_: any, i: number) => i !== index);
    onUpdateStep({ inputs: newInputs });
  };

  const handleAddOption = (inputIndex: number) => {
    const newInputs = [...inputs];
    const options = newInputs[inputIndex].options || [];
    newInputs[inputIndex] = { 
      ...newInputs[inputIndex], 
      options: [...options, { label: '', value: '' }]
    };
    onUpdateStep({ inputs: newInputs });
  };

  const handleUpdateOption = (inputIndex: number, optionIndex: number, field: string, value: string) => {
    const newInputs = [...inputs];
    const options = [...(newInputs[inputIndex].options || [])];
    options[optionIndex] = { ...options[optionIndex], [field]: value };
    newInputs[inputIndex] = { ...newInputs[inputIndex], options };
    onUpdateStep({ inputs: newInputs });
  };

  const handleRemoveOption = (inputIndex: number, optionIndex: number) => {
    const newInputs = [...inputs];
    const options = (newInputs[inputIndex].options || []).filter((_: any, i: number) => i !== optionIndex);
    newInputs[inputIndex] = { ...newInputs[inputIndex], options };
    onUpdateStep({ inputs: newInputs });
  };

  return (
    <div className="gba:space-y-3 gba:pt-2">
      <div className="gba:flex gba:items-center gba:justify-between">
        <span className="gba:text-sm gba:text-gray-600">
          {inputs.length === 0 ? 'No input fields added' : `${inputs.length} input field(s) configured`}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddInput}
          data-testid={`${testId}-add-input`}
        >
          {getTranslationFromI18nKeyAndLabel('flow.creator.addInput', 'Add Field')}
        </Button>
      </div>
      
      <div className="gba:space-y-3">
        {inputs.length > 0 && inputs.map((input: any, index: number) => (
          <div key={index} className="gba:space-y-2 gba:p-3 gba:border gba:rounded gba:bg-gray-50">
            <div className="gba:flex gba:gap-2 gba:items-center">
              <Input
                value={input.label || ''}
                onChange={(e) => handleUpdateInput(index, 'label', e.target.value)}
                className="gba:flex-1"
                data-testid={`${testId}-input-label-${index}`}
              />
              <Select 
                value={input.type || 'text'} 
                onChange={(value) => handleUpdateInput(index, 'type', value)}
                style={{ width: '120px' }}
                data-testid={`${testId}-input-type-${index}`}
              >
                <Select.Option value="text">Text</Select.Option>
                <Select.Option value="email">Email</Select.Option>
                <Select.Option value="number">Number</Select.Option>
                <Select.Option value="date">Date</Select.Option>
                <Select.Option value="textarea">Textarea</Select.Option>
                <Select.Option value="select">Select</Select.Option>
                <Select.Option value="radio">Radio</Select.Option>
                <Select.Option value="checkbox">Checkbox</Select.Option>
                <Select.Option value="file">File</Select.Option>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveInput(index)}
                data-testid={`${testId}-remove-input-${index}`}
              >
                <Trash2 className="gba:h-4 gba:w-4" />
              </Button>
            </div>
            
            {/* Options for multi-value inputs */}
            {['select', 'radio', 'checkbox'].includes(input.type) && (
              <div className="gba:space-y-2">
                <div className="gba:flex gba:items-center gba:justify-between">
                  <span className="gba:text-xs gba:text-gray-600">Options:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddOption(index)}
                    data-testid={`${testId}-add-option-${index}`}
                  >
                    Add Option
                  </Button>
                </div>
                
                {(input.options || []).map((option: any, optionIndex: number) => (
                  <div key={optionIndex} className="gba:flex gba:gap-2 gba:items-center gba:pl-4">
                    <Input
                      value={option.label || ''}
                      onChange={(e) => handleUpdateOption(index, optionIndex, 'label', e.target.value)}
                      className="gba:flex-1"
                      data-testid={`${testId}-option-label-${index}-${optionIndex}`}
                    />
                    <Input
                      value={option.value || ''}
                      onChange={(e) => handleUpdateOption(index, optionIndex, 'value', e.target.value)}
                      className="gba:flex-1"
                      data-testid={`${testId}-option-value-${index}-${optionIndex}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveOption(index, optionIndex)}
                      data-testid={`${testId}-remove-option-${index}-${optionIndex}`}
                    >
                      <Trash2 className="gba:h-4 gba:w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const InputFieldsConfiguration: React.FC<InputFieldsConfigurationProps> = (props) => {
  return (
    <>
      <InputFieldsTrigger {...props} />
      <InputFieldsContent {...props} />
    </>
  );
}; 