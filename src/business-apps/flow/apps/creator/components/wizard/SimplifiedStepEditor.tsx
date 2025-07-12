import React, { useState } from 'react';
import { Card, Input, Button, Switch, Space, Tag, Tooltip, Select, Divider, Upload, message, Popover } from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  FileTextOutlined, 
  LinkOutlined, 
  FileImageOutlined,
  MessageOutlined,
  UserOutlined,
  SettingOutlined,
  DownOutlined,
  RightOutlined,
  InboxOutlined,
  UploadOutlined,
  PaperClipOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { SimplifiedStep, AttachmentLink, Input, InputBlockType, StepType } from '../../types/flowTemplate';
import { AssignmentSelector } from '../shared/AssignmentSelector';

const { TextArea } = Input;

interface SimplifiedStepEditorProps {
  step: SimplifiedStep;
  stepIndex: number;
  onStepChange: (stepIndex: number, updatedStep: SimplifiedStep) => void;
  isNewStep?: boolean;
  'data-testid'?: string;
}

// Configuration for input block types
const INPUT_BLOCK_CONFIG = {
  [InputBlockType.TEXT]: {
    icon: <FileTextOutlined />,
    color: '#1890ff',
    label: 'Text Input',
    description: 'Single line text input'
  },
  [InputBlockType.TEXTAREA]: {
    icon: <MessageOutlined />,
    color: '#52c41a',
    label: 'Long Text',
    description: 'Multi-line text input'
  },
  [InputBlockType.NUMBER]: {
    icon: <FileTextOutlined />,
    color: '#fa8c16',
    label: 'Number',
    description: 'Numeric input'
  },
  [InputBlockType.DROPDOWN]: {
    icon: <SettingOutlined />,
    color: '#722ed1',
    label: 'Dropdown',
    description: 'Select from predefined options'
  },
  [InputBlockType.FILE]: {
    icon: <FileImageOutlined />,
    color: '#eb2f96',
    label: 'File Upload',
    description: 'File attachment input'
  }
};

// Configuration for attachment types
const ATTACHMENT_TYPE_CONFIG = {
  'document': {
    icon: <FileTextOutlined />,
    color: '#1890ff',
    label: 'Document'
  },
  'image': {
    icon: <FileImageOutlined />,
    color: '#52c41a',
    label: 'Image'
  },
  'hyperlink': {
    icon: <LinkOutlined />,
    color: '#fa8c16',
    label: 'Link'
  }
};

export const SimplifiedStepEditor: React.FC<SimplifiedStepEditorProps> = ({
  step,
  stepIndex,
  onStepChange,
  isNewStep = false,
  'data-testid': testId = 'simplified-step-editor'
}) => {
  const [isExpanded, setIsExpanded] = useState(isNewStep);
  const [showAttachments, setShowAttachments] = useState(step.attachments.length > 0);

  const updateStep = (updates: Partial<SimplifiedStep>) => {
    onStepChange(stepIndex, { ...step, ...updates });
  };

  const updateRequestInput = (updates: Partial<SimplifiedStep['requestInput']>) => {
    updateStep({
      requestInput: { ...step.requestInput, ...updates }
    });
  };

  const updateAssignment = (updates: Partial<SimplifiedStep['usePredefinedAssignment']>) => {
    updateStep({
      usePredefinedAssignment: { ...step.usePredefinedAssignment, ...updates }
    });
  };

  const addAttachment = () => {
    const newAttachment: AttachmentLink = {
      type: 'hyperlink',
      url: '',
      title: '',
      description: ''
    };
    updateStep({
      attachments: [...step.attachments, newAttachment]
    });
  };

  const handleFileUpload = (file: File) => {
    // Determine file type based on MIME type
    let attachmentType: 'document' | 'image' | 'hyperlink' = 'document';
    if (file.type.startsWith('image/')) {
      attachmentType = 'image';
    }

    // Create a temporary URL for the file (in real implementation, this would be uploaded to server)
    const fileUrl = URL.createObjectURL(file);
    
    const newAttachment: AttachmentLink = {
      type: attachmentType,
      url: fileUrl,
      title: file.name,
      description: `Uploaded ${attachmentType}: ${file.name}`
    };

    updateStep({
      attachments: [...step.attachments, newAttachment]
    });

    message.success(`${file.name} uploaded successfully`);
    return false; // Prevent default upload
  };

  const updateAttachment = (index: number, updates: Partial<AttachmentLink>) => {
    const updatedAttachments = [...step.attachments];
    updatedAttachments[index] = { ...updatedAttachments[index], ...updates };
    updateStep({ attachments: updatedAttachments });
  };

  const removeAttachment = (index: number) => {
    updateStep({
      attachments: step.attachments.filter((_, i) => i !== index)
    });
  };

  const addInputBlock = () => {
    const newInput: Input = {
      type: InputBlockType.TEXT,
      label: '',
      required: false,
      placeholder: ''
    };
    updateRequestInput({
      inputs: [...step.requestInput.inputs, newInput]
    });
  };

  const updateInputBlock = (index: number, updates: Partial<Input>) => {
    const updatedInputs = [...step.requestInput.inputs];
    updatedInputs[index] = { ...updatedInputs[index], ...updates };
    updateRequestInput({ inputs: updatedInputs });
  };

  const removeInputBlock = (index: number) => {
    updateRequestInput({
      inputs: step.requestInput.inputs.filter((_, i) => i !== index)
    });
  };

  return (
    <Card 
      className="gba:mb-4"
      data-testid={`${testId}-step-${stepIndex}`}
      title={
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              type="text"
              size="small"
              icon={isExpanded ? <DownOutlined /> : <RightOutlined />}
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid={`${testId}-expand-button`}
            />
            <span className="gba:text-sm gba:font-medium">
              {step.title || `${getTranslationFromI18nKeyAndLabel('flow.creator.step', 'Step')} ${stepIndex + 1}`}
            </span>
            <Tag color="blue">{step.type}</Tag>
          </div>
        </div>
      }
    >
      {isExpanded && (
        <div className="gba:space-y-6">
          {/* Step Type Field */}
          <div data-testid={`${testId}-step-type-field`}>
            <label className="gba:block gba:text-sm gba:font-medium gba:mb-1">
              {getTranslationFromI18nKeyAndLabel('flow.creator.stepType', 'Step Type')}
            </label>
            <Select
              value={step.type}
              onChange={(value) => updateStep({ type: value })}
              style={{ width: '100%' }}
              data-testid={`${testId}-step-type-select`}
            >
              <Select.Option value={StepType.TASK}>
                <Space>
                  <UserOutlined />
                  {getTranslationFromI18nKeyAndLabel('flow.creator.stepType.task', 'Task')}
                </Space>
              </Select.Option>
              <Select.Option value={StepType.APPROVAL}>
                <Space>
                  <SettingOutlined />
                  {getTranslationFromI18nKeyAndLabel('flow.creator.stepType.approval', 'Approval')}
                </Space>
              </Select.Option>
              <Select.Option value={StepType.INFORMATION}>
                <Space>
                  <MessageOutlined />
                  {getTranslationFromI18nKeyAndLabel('flow.creator.stepType.information', 'Information')}
                </Space>
              </Select.Option>
              <Select.Option value={StepType.ACKNOWLEDGE}>
                <Space>
                  <CheckCircleOutlined />
                  {getTranslationFromI18nKeyAndLabel('flow.creator.stepType.acknowledge', 'Acknowledge')}
                </Space>
              </Select.Option>
            </Select>
          </div>

          {/* Title Field */}
          <div data-testid={`${testId}-title-field`}>
            <label className="gba:block gba:text-sm gba:font-medium gba:mb-1">
              {getTranslationFromI18nKeyAndLabel('flow.creator.stepTitle', 'Step Title')}
            </label>
            <Input
              value={step.title}
              onChange={(e) => updateStep({ title: e.target.value })}
              data-testid={`${testId}-title-input`}
            />
          </div>

          {/* Message Field */}
          <div data-testid={`${testId}-message-field`}>
            <label className="gba:block gba:text-sm gba:font-medium gba:mb-1">
              {getTranslationFromI18nKeyAndLabel('flow.creator.message', 'Message')}
            </label>
            <TextArea
              value={step.message}
              onChange={(e) => updateStep({ message: e.target.value })}
              rows={4}
              data-testid={`${testId}-message-input`}
            />
          </div>

          {/* Attachments & Links Section */}
          <div data-testid={`${testId}-attachments-section`}>
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
              <Switch
                checked={showAttachments}
                onChange={(checked) => setShowAttachments(checked)}
                data-testid={`${testId}-attachments-toggle`}
              />
              <label className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('flow.creator.addAttachmentsLinks', 'Add Attachments & Links')}
              </label>
            </div>

            {showAttachments && (
              <div className="gba:space-y-4">
                <div className="gba:flex gba:items-center gba:justify-end">
                  <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={addAttachment}
                    data-testid={`${testId}-add-attachment`}
                  >
                    {getTranslationFromI18nKeyAndLabel('flow.creator.addLink', 'Add Link')}
                  </Button>
                </div>

                {/* Drag & Drop Upload Area */}
                <Upload.Dragger
                  multiple
                  beforeUpload={handleFileUpload}
                  showUploadList={false}
                  data-testid={`${testId}-file-upload-dragger`}
                  className="gba:border-dashed gba:border-gray-300 gba:bg-gray-50"
                >
                  <p className="gba:mb-2">
                    <InboxOutlined className="gba:text-2xl gba:text-gray-400" />
                  </p>
                  <p className="gba:text-sm gba:text-gray-600">
                    {getTranslationFromI18nKeyAndLabel('flow.creator.dragDropFiles', 'Click or drag files here to upload')}
                  </p>
                  <p className="gba:text-xs gba:text-gray-400">
                    {getTranslationFromI18nKeyAndLabel('flow.creator.supportedFiles', 'Supports documents, images, and other files')}
                  </p>
                </Upload.Dragger>
                
                {step.attachments.length === 0 ? (
                  <div className="gba:text-center gba:py-4 gba:text-gray-500 gba:text-sm">
                    {getTranslationFromI18nKeyAndLabel('flow.creator.noAttachments', 'No attachments or links added yet')}
                  </div>
                ) : (
                  <div className="gba:space-y-2">
                    {step.attachments.map((attachment, index) => (
                      <div key={index} className="gba:border gba:rounded gba:p-3 gba:space-y-2">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Select
                            value={attachment.type}
                            onChange={(value) => updateAttachment(index, { type: value })}
                            style={{ width: 120 }}
                            data-testid={`${testId}-attachment-type-${index}`}
                          >
                            {Object.entries(ATTACHMENT_TYPE_CONFIG).map(([type, config]) => (
                              <Select.Option key={type} value={type}>
                                <Space>
                                  {config.icon}
                                  {config.label}
                                </Space>
                              </Select.Option>
                            ))}
                          </Select>
                          <Input
                            value={attachment.title}
                            onChange={(e) => updateAttachment(index, { title: e.target.value })}
                            data-testid={`${testId}-attachment-title-${index}`}
                          />
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => removeAttachment(index)}
                            data-testid={`${testId}-remove-attachment-${index}`}
                          />
                        </div>
                        <Input
                          value={attachment.url}
                          onChange={(e) => updateAttachment(index, { url: e.target.value })}
                          data-testid={`${testId}-attachment-url-${index}`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Request Input Section */}
          <div data-testid={`${testId}-request-input-section`}>
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Switch
                  checked={step.requestInput.enabled}
                  onChange={(enabled) => updateRequestInput({ enabled })}
                  data-testid={`${testId}-request-input-toggle`}
                />
                <label className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel('flow.creator.addInputForm', 'Add Input Form')}
                </label>
              </div>
              {step.requestInput.enabled && (
                <Button
                  type="dashed"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={addInputBlock}
                  data-testid={`${testId}-add-input`}
                >
                  {getTranslationFromI18nKeyAndLabel('flow.creator.addInput', 'Add Input')}
                </Button>
              )}
            </div>

            {step.requestInput.enabled && (
              <div className="gba:space-y-2">
                {step.requestInput.inputs.length === 0 ? (
                  <div className="gba:text-center gba:py-4 gba:text-gray-500 gba:text-sm">
                    {getTranslationFromI18nKeyAndLabel('flow.creator.noInputs', 'No input fields added yet')}
                  </div>
                ) : (
                  step.requestInput.inputs.map((input, index) => (
                    <div key={index} className="gba:border gba:rounded gba:p-3 gba:space-y-2">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Select
                          value={input.type}
                          onChange={(value) => updateInputBlock(index, { type: value })}
                          style={{ width: 140 }}
                          data-testid={`${testId}-input-type-${index}`}
                        >
                          {Object.entries(INPUT_BLOCK_CONFIG).map(([type, config]) => (
                            <Select.Option key={type} value={type}>
                              <Space>
                                {config.icon}
                                {config.label}
                              </Space>
                            </Select.Option>
                          ))}
                        </Select>
                        <Input
                          value={input.label}
                          onChange={(e) => updateInputBlock(index, { label: e.target.value })}
                          data-testid={`${testId}-input-label-${index}`}
                        />
                        <Switch
                          checked={input.required}
                          onChange={(required) => updateInputBlock(index, { required })}
                          data-testid={`${testId}-input-required-${index}`}
                        />
                        <span className="gba:text-xs gba:text-gray-500">
                          {getTranslationFromI18nKeyAndLabel('flow.creator.required', 'Required')}
                        </span>
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => removeInputBlock(index)}
                          data-testid={`${testId}-remove-input-${index}`}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Use Predefined Assignment Section */}
          <div data-testid={`${testId}-assignment-section`}>
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
              <Switch
                checked={step.usePredefinedAssignment.enabled}
                onChange={(enabled) => updateAssignment({ enabled })}
                data-testid={`${testId}-assignment-toggle`}
              />
              <label className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('flow.creator.addAssignmentRule', 'Add Assignment Rule')}
              </label>
              <Popover
                content={
                  <div className="gba:max-w-xs">
                    {getTranslationFromI18nKeyAndLabel('flow.creator.assignmentExecutionInfo', 'By default the assignment will be configured at execution time.')}
                  </div>
                }
                title={getTranslationFromI18nKeyAndLabel('flow.creator.assignmentInfo', 'Assignment Information')}
                trigger="hover"
                zIndex={9999}
                overlayStyle={{ zIndex: 9999 }}
              >
                <InfoCircleOutlined className="gba:text-gray-400 gba:cursor-help" />
              </Popover>
            </div>
            
            {step.usePredefinedAssignment.enabled && (
              <div className="gba:pl-6">
                <AssignmentSelector
                  value={step.usePredefinedAssignment.assignment}
                  onChange={(assignment) => updateAssignment({ assignment })}
                  data-testid={`${testId}-assignment-selector`}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}; 