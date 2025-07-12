import React from 'react';
import { Card, Input, Space, Typography, Divider, Switch } from 'antd';
import { 
  UserOutlined,
  MessageOutlined,
  FormOutlined,
  PaperClipOutlined
} from '@ant-design/icons';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { SimplifiedStep } from '../../types/flowTemplate';
import { AssignmentSelector } from '../shared/AssignmentSelector';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface StepExecutionFormProps {
  step: SimplifiedStep;
  stepIndex: number;
  configuration: {
    title?: string;
    message?: string;
    assignment?: any;
    inputValues?: { [key: string]: any };
    attachments?: any[];
  };
  onConfigurationChange: (updates: any) => void;
  'data-testid'?: string;
}

export const StepExecutionForm: React.FC<StepExecutionFormProps> = ({
  step,
  stepIndex,
  configuration,
  onConfigurationChange,
  'data-testid': testId = 'step-execution-form'
}) => {
  const updateConfiguration = (field: string, value: any) => {
    onConfigurationChange({ [field]: value });
  };

  const updateInputValue = (inputIndex: number, value: any) => {
    const newInputValues = { ...configuration.inputValues };
    newInputValues[`input_${inputIndex}`] = value;
    onConfigurationChange({ inputValues: newInputValues });
  };

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* Step Basic Info */}
      <Card size="small" title={
        <div className="gba:flex gba:items-center gba:gap-2">
          <MessageOutlined />
          <span>{getTranslationFromI18nKeyAndLabel('flow.execution.stepInfo', 'Step Information')}</span>
        </div>
      }>
        <div className="gba:space-y-4">
          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:mb-1">
              {getTranslationFromI18nKeyAndLabel('flow.execution.stepTitle', 'Step Title')}
            </label>
            <Input
              value={configuration.title}
              onChange={(e) => updateConfiguration('title', e.target.value)}
              placeholder={step.title}
              data-testid={`${testId}-title-input`}
            />
          </div>

          <div>
            <label className="gba:block gba:text-sm gba:font-medium gba:mb-1">
              {getTranslationFromI18nKeyAndLabel('flow.execution.stepMessage', 'Step Message')}
            </label>
            <TextArea
              value={configuration.message}
              onChange={(e) => updateConfiguration('message', e.target.value)}
              placeholder={step.message}
              rows={3}
              data-testid={`${testId}-message-input`}
            />
          </div>
        </div>
      </Card>

      {/* Assignment Configuration */}
      {!step.usePredefinedAssignment?.enabled && (
        <Card size="small" title={
          <div className="gba:flex gba:items-center gba:gap-2">
            <UserOutlined />
            <span>{getTranslationFromI18nKeyAndLabel('flow.execution.assignment', 'Assignment')}</span>
          </div>
        }>
          <div className="gba:space-y-4">
            <Text className="gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('flow.execution.assignmentDescription', 'Configure who should receive this task at execution time.')}
            </Text>
            
            <AssignmentSelector
              value={configuration.assignment}
              onChange={(assignment) => updateConfiguration('assignment', assignment)}
              data-testid={`${testId}-assignment-selector`}
            />
          </div>
        </Card>
      )}

      {step.usePredefinedAssignment?.enabled && (
        <Card size="small" title={
          <div className="gba:flex gba:items-center gba:gap-2">
            <UserOutlined />
            <span>{getTranslationFromI18nKeyAndLabel('flow.execution.predefinedAssignment', 'Predefined Assignment')}</span>
          </div>
        }>
          <Text className="gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel('flow.execution.predefinedAssignmentDescription', 'This step has a predefined assignment that will be used during execution.')}
          </Text>
          
          {step.usePredefinedAssignment.assignment && (
            <div className="gba:mt-4 gba:p-3 gba:bg-gray-50 gba:rounded">
              <div className="gba:space-y-2">
                <div>
                  <strong>{getTranslationFromI18nKeyAndLabel('flow.execution.assignmentMode', 'Assignment Mode')}:</strong>{' '}
                  {step.usePredefinedAssignment.assignment.assignmentMode === 'ASSIGN' 
                    ? getTranslationFromI18nKeyAndLabel('flow.execution.assignToAll', 'Assigned to all')
                    : getTranslationFromI18nKeyAndLabel('flow.execution.claimableByOne', 'Claimable by one')
                  }
                </div>
                <div>
                  <strong>{getTranslationFromI18nKeyAndLabel('flow.execution.targets', 'Targets')}:</strong>{' '}
                  {step.usePredefinedAssignment.assignment.targets?.length || 0} selected
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Input Form Configuration */}
      {step.requestInput?.enabled && step.requestInput.inputs.length > 0 && (
        <Card size="small" title={
          <div className="gba:flex gba:items-center gba:gap-2">
            <FormOutlined />
            <span>{getTranslationFromI18nKeyAndLabel('flow.execution.inputForm', 'Input Form')}</span>
          </div>
        }>
          <div className="gba:space-y-4">
            <Text className="gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('flow.execution.inputFormDescription', 'Configure default values for input fields (optional).')}
            </Text>
            
            <div className="gba:space-y-3">
              {step.requestInput.inputs.map((input, index) => (
                <div key={index}>
                  <label className="gba:block gba:text-sm gba:font-medium gba:mb-1">
                    {input.label}
                    {input.required && <span className="gba:text-red-500 gba:ml-1">*</span>}
                  </label>
                  
                  {input.type === 'TEXTAREA' ? (
                    <TextArea
                      value={configuration.inputValues?.[`input_${index}`] || ''}
                      onChange={(e) => updateInputValue(index, e.target.value)}
                      placeholder={getTranslationFromI18nKeyAndLabel('flow.execution.defaultValue', 'Default value (optional)')}
                      rows={2}
                      data-testid={`${testId}-input-${index}`}
                    />
                  ) : input.type === 'DROPDOWN' ? (
                    <Input
                      value={configuration.inputValues?.[`input_${index}`] || ''}
                      onChange={(e) => updateInputValue(index, e.target.value)}
                      placeholder={getTranslationFromI18nKeyAndLabel('flow.execution.defaultValue', 'Default value (optional)')}
                      data-testid={`${testId}-input-${index}`}
                    />
                  ) : (
                    <Input
                      value={configuration.inputValues?.[`input_${index}`] || ''}
                      onChange={(e) => updateInputValue(index, e.target.value)}
                      placeholder={getTranslationFromI18nKeyAndLabel('flow.execution.defaultValue', 'Default value (optional)')}
                      data-testid={`${testId}-input-${index}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Attachments */}
      {step.attachments && step.attachments.length > 0 && (
        <Card size="small" title={
          <div className="gba:flex gba:items-center gba:gap-2">
            <PaperClipOutlined />
            <span>{getTranslationFromI18nKeyAndLabel('flow.execution.attachments', 'Attachments')}</span>
          </div>
        }>
          <div className="gba:space-y-2">
            <Text className="gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel('flow.execution.attachmentsDescription', 'The following attachments will be included with this step:')}
            </Text>
            
            <div className="gba:space-y-2">
              {step.attachments.map((attachment, index) => (
                <div key={index} className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:bg-gray-50 gba:rounded">
                  <PaperClipOutlined className="gba:text-gray-500" />
                  <span className="gba:text-sm">{attachment.title || attachment.url}</span>
                  <span className="gba:text-xs gba:text-gray-500 gba:ml-auto">{attachment.type}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}; 