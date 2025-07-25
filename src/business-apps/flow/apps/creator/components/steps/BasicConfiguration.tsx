import React from 'react';
import { Input, Label, Textarea } from '@newwork/nw-design-system';
import { Select, Space } from 'antd';
import { User, Settings, FileText, FormInput } from 'lucide-react';
import { FlowStepType } from '../../types/flowTemplate';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

interface BasicConfigurationProps {
  step: any;
  stepIndex: number;
  testId: string;
  onUpdateStep: (updates: any) => void;
}

export const BasicConfiguration: React.FC<BasicConfigurationProps> = ({
  step,
  stepIndex,
  testId,
  onUpdateStep
}) => {
  return (
    <div className="gba:space-y-4 gba:pt-2">
      {/* Step Type Configuration */}
      <div className="gba:space-y-2" data-testid={`${testId}-type-field`}>
        <Label data-testid={`${testId}-type-label`}>
          {getTranslationFromI18nKeyAndLabel('flow.creator.stepType', 'Step Type')}:
        </Label>
        <Select 
          value={step.type} 
          onChange={(value) => onUpdateStep({ type: value })}
          style={{ width: '100%' }}
          data-testid={`${testId}-type-select`}
        >
          <Select.Option value={FlowStepType.TASK}>
            <Space>
              <User className="gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('flow.creator.task', 'Task')}
            </Space>
          </Select.Option>
          <Select.Option value={FlowStepType.APPROVAL}>
            <Space>
              <Settings className="gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('flow.creator.approval', 'Approval')}
            </Space>
          </Select.Option>
          <Select.Option value={FlowStepType.INFORMATION}>
            <Space>
              <FileText className="gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('flow.creator.information', 'Information')}
            </Space>
          </Select.Option>
          <Select.Option value={FlowStepType.ACKNOWLEDGE}>
            <Space>
              <FormInput className="gba:h-4 gba:w-4" />
              {getTranslationFromI18nKeyAndLabel('flow.creator.acknowledge', 'Acknowledge')}
            </Space>
          </Select.Option>
        </Select>
      </div>
      
      {/* Step Title */}
      <div className="gba:space-y-2" data-testid={`${testId}-title-field`}>
        <Label htmlFor={`step-${stepIndex}-title`} data-testid={`${testId}-title-label`}>
          {getTranslationFromI18nKeyAndLabel('flow.creator.stepTitle', 'Step Title')}:
        </Label>
        <Input
          id={`step-${stepIndex}-title`}
          value={step.title}
          onChange={(e) => onUpdateStep({ title: e.target.value })}
          className="gba:w-full"
          data-testid={`${testId}-title-input`}
        />
      </div>
      
      {/* Step Message */}
      <div className="gba:space-y-2" data-testid={`${testId}-message-field`}>
        <Label htmlFor={`step-${stepIndex}-message`} data-testid={`${testId}-message-label`}>
          {getTranslationFromI18nKeyAndLabel('flow.creator.message', 'Message')}:
        </Label>
        <Textarea
          id={`step-${stepIndex}-message`}
          value={step.message || ''}
          onChange={(e) => onUpdateStep({ message: e.target.value })}
          className="gba:w-full gba:min-h-[100px]"
          data-testid={`${testId}-message-input`}
        />
      </div>
    </div>
  );
}; 