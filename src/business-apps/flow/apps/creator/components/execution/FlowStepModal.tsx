import React, { useState } from 'react';
import { Modal, Card, Button, Space, Typography, Form, Input, Select, Upload, message, Tag, Divider } from 'antd';
import { 
  CheckOutlined,
  CloseOutlined,
  UserOutlined,
  MessageOutlined,
  FormOutlined,
  PaperClipOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { StepType, InputBlockType } from '../../types/flowTemplate';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface FlowStepModalProps {
  visible: boolean;
  task: {
    taskId: string;
    stepIndex: number;
    title: string;
    message: string;
    stepType: StepType;
    attachments?: any[];
    inputBlocks?: any[];
    assignee?: string;
    assignmentMode?: string;
    allowReassignment?: boolean;
  };
  onComplete: (taskId: string, result: any) => Promise<void>;
  onCancel: () => void;
  readOnly?: boolean; // Add read-only mode for preview
  'data-testid'?: string;
}

export const FlowStepModal: React.FC<FlowStepModalProps> = ({
  visible,
  task,
  onComplete,
  onCancel,
  readOnly = false,
  'data-testid': testId = 'flow-step-modal'
}) => {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<'APPROVED' | 'REJECTED' | 'COMPLETED' | null>(null);

  const getStepIcon = (stepType: StepType) => {
    switch (stepType) {
      case 'TASK':
        return <UserOutlined className="gba:text-blue-500" />;
      case 'APPROVAL':
        return <SettingOutlined className="gba:text-orange-500" />;
      case 'INFORMATION':
        return <MessageOutlined className="gba:text-green-500" />;
      case 'ACKNOWLEDGE':
        return <CheckCircleOutlined className="gba:text-purple-500" />;
      default:
        return <InfoCircleOutlined className="gba:text-gray-500" />;
    }
  };

  const getStepTypeLabel = (stepType: StepType) => {
    switch (stepType) {
      case 'TASK':
        return getTranslationFromI18nKeyAndLabel('flow.step.task', 'Task');
      case 'APPROVAL':
        return getTranslationFromI18nKeyAndLabel('flow.step.approval', 'Approval');
      case 'INFORMATION':
        return getTranslationFromI18nKeyAndLabel('flow.step.information', 'Information');
      case 'ACKNOWLEDGE':
        return getTranslationFromI18nKeyAndLabel('flow.step.acknowledge', 'Acknowledge');
      default:
        return stepType;
    }
  };

  const handleSubmit = async (action: 'APPROVED' | 'REJECTED' | 'COMPLETED') => {
    try {
      setIsSubmitting(true);
      
      // Validate form if there are input blocks
      if (task.inputBlocks && task.inputBlocks.length > 0) {
        await form.validateFields();
      }
      
      const formData = form.getFieldsValue();
      
      const completionData = {
        result: action,
        stepIndex: task.stepIndex,
        stepType: task.stepType,
        inputData: formData,
        completedAt: new Date().toISOString(),
        completedBy: task.assignee || 'current-user'
      };
      
      await onComplete(task.taskId, completionData);
      message.success(
        action === 'APPROVED' 
          ? getTranslationFromI18nKeyAndLabel('flow.step.approved', 'Step approved successfully')
          : action === 'REJECTED'
          ? getTranslationFromI18nKeyAndLabel('flow.step.rejected', 'Step rejected')
          : getTranslationFromI18nKeyAndLabel('flow.step.completed', 'Step completed successfully')
      );
      
    } catch (error) {
      console.error('Failed to complete step:', error);
      message.error(getTranslationFromI18nKeyAndLabel('flow.step.error', 'Failed to complete step'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInputField = (input: any, index: number) => {
    const fieldName = `input_${index}`;
    
    switch (input.type) {
      case InputBlockType.TEXTAREA:
        return (
          <Form.Item
            key={index}
            name={fieldName}
            label={input.label}
            rules={[{ required: input.required, message: `${input.label} is required` }]}
          >
            <TextArea
              rows={4}
              placeholder={input.placeholder}
              data-testid={`${testId}-input-${index}`}
            />
          </Form.Item>
        );
        
      case InputBlockType.DROPDOWN:
        return (
          <Form.Item
            key={index}
            name={fieldName}
            label={input.label}
            rules={[{ required: input.required, message: `${input.label} is required` }]}
          >
            <Select
              placeholder={input.placeholder || `Select ${input.label}`}
              data-testid={`${testId}-input-${index}`}
            >
              {input.options?.map((option: string, optIndex: number) => (
                <Option key={optIndex} value={option}>{option}</Option>
              ))}
            </Select>
          </Form.Item>
        );
        
      case InputBlockType.NUMBER:
        return (
          <Form.Item
            key={index}
            name={fieldName}
            label={input.label}
            rules={[
              { required: input.required, message: `${input.label} is required` },
              { type: 'number', message: 'Please enter a valid number' }
            ]}
          >
            <Input
              type="number"
              placeholder={input.placeholder}
              data-testid={`${testId}-input-${index}`}
            />
          </Form.Item>
        );
        
      case InputBlockType.FILE:
        return (
          <Form.Item
            key={index}
            name={fieldName}
            label={input.label}
            rules={[{ required: input.required, message: `${input.label} is required` }]}
          >
            <Upload
              beforeUpload={() => false} // Prevent auto upload
              data-testid={`${testId}-input-${index}`}
            >
              <Button icon={<PaperClipOutlined />}>
                {getTranslationFromI18nKeyAndLabel('flow.step.selectFile', 'Select File')}
              </Button>
            </Upload>
          </Form.Item>
        );
        
      default:
        return (
          <Form.Item
            key={index}
            name={fieldName}
            label={input.label}
            rules={[{ required: input.required, message: `${input.label} is required` }]}
          >
            <Input
              placeholder={input.placeholder}
              data-testid={`${testId}-input-${index}`}
            />
          </Form.Item>
        );
    }
  };

  const getActionButtons = () => {
    if (readOnly) {
      return null; // No action buttons in read-only mode
    }
    
    switch (task.stepType) {
      case 'APPROVAL':
        return (
          <Space>
            <Button
              type="primary"
              danger
              icon={<CloseOutlined />}
              onClick={() => handleSubmit('REJECTED')}
              loading={isSubmitting}
              data-testid={`${testId}-reject-button`}
            >
              {getTranslationFromI18nKeyAndLabel('flow.step.reject', 'Reject')}
            </Button>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleSubmit('APPROVED')}
              loading={isSubmitting}
              data-testid={`${testId}-approve-button`}
            >
              {getTranslationFromI18nKeyAndLabel('flow.step.approve', 'Approve')}
            </Button>
          </Space>
        );
        
      case 'INFORMATION':
      case 'ACKNOWLEDGE':
        return (
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => handleSubmit('COMPLETED')}
            loading={isSubmitting}
            data-testid={`${testId}-acknowledge-button`}
          >
            {task.stepType === 'INFORMATION' 
              ? getTranslationFromI18nKeyAndLabel('flow.step.understood', 'Understood')
              : getTranslationFromI18nKeyAndLabel('flow.step.acknowledge', 'Acknowledge')
            }
          </Button>
        );
        
      default:
        return (
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => handleSubmit('COMPLETED')}
            loading={isSubmitting}
            data-testid={`${testId}-complete-button`}
          >
            {getTranslationFromI18nKeyAndLabel('flow.step.complete', 'Complete')}
          </Button>
        );
    }
  };

  return (
    <Modal
      title={
        <div className="gba:flex gba:items-center gba:gap-3">
          {getStepIcon(task.stepType)}
          <div>
            <Title level={4} className="gba:mb-0">{task.title}</Title>
            <Tag color="blue" className="gba:mt-1">
              {getStepTypeLabel(task.stepType)}
            </Tag>
          </div>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      className="gba:flow-step-modal"
      data-testid={testId}
    >
      <div className="gba:space-y-6">
        {/* Step Message */}
        {task.message && (
          <Card size="small">
            <Paragraph className="gba:mb-0 gba:whitespace-pre-wrap">
              {task.message}
            </Paragraph>
          </Card>
        )}

        {/* Attachments */}
        {task.attachments && task.attachments.length > 0 && (
          <Card 
            size="small" 
            title={
              <div className="gba:flex gba:items-center gba:gap-2">
                <PaperClipOutlined />
                <span>{getTranslationFromI18nKeyAndLabel('flow.step.attachments', 'Attachments')}</span>
              </div>
            }
          >
            <div className="gba:space-y-2">
              {task.attachments.map((attachment, index) => (
                <div key={index} className="gba:flex gba:items-center gba:gap-2 gba:p-2 gba:bg-gray-50 gba:rounded">
                  <PaperClipOutlined className="gba:text-gray-500" />
                  <span className="gba:text-sm">{attachment.title || attachment.url}</span>
                  <Tag className="gba:ml-auto">{attachment.type}</Tag>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Input Form */}
        {task.inputBlocks && task.inputBlocks.length > 0 && (
          <Card 
            size="small" 
            title={
              <div className="gba:flex gba:items-center gba:gap-2">
                <FormOutlined />
                <span>{getTranslationFromI18nKeyAndLabel('flow.step.inputForm', 'Input Form')}</span>
              </div>
            }
          >
            <Form
              form={form}
              layout="vertical"
              data-testid={`${testId}-form`}
            >
              {task.inputBlocks.map((input, index) => renderInputField(input, index))}
            </Form>
          </Card>
        )}

        {/* Assignment Info */}
        {task.assignmentMode && (
          <Card size="small" title={
            <div className="gba:flex gba:items-center gba:gap-2">
              <UserOutlined />
              <span>{getTranslationFromI18nKeyAndLabel('flow.step.assignmentInfo', 'Assignment Information')}</span>
            </div>
          }>
            <div className="gba:space-y-2">
              <div>
                <Text strong>{getTranslationFromI18nKeyAndLabel('flow.step.assignedTo', 'Assigned to')}:</Text>{' '}
                {task.assignee || getTranslationFromI18nKeyAndLabel('flow.step.currentUser', 'Current User')}
              </div>
              <div>
                <Text strong>{getTranslationFromI18nKeyAndLabel('flow.step.assignmentMode', 'Assignment Mode')}:</Text>{' '}
                {task.assignmentMode === 'CLAIM' 
                  ? getTranslationFromI18nKeyAndLabel('flow.step.claimable', 'Claimable')
                  : getTranslationFromI18nKeyAndLabel('flow.step.assigned', 'Assigned')
                }
              </div>
              {task.allowReassignment && (
                <div>
                  <Text type="secondary">
                    {getTranslationFromI18nKeyAndLabel('flow.step.reassignmentAllowed', 'Reassignment is allowed for this task')}
                  </Text>
                </div>
              )}
            </div>
          </Card>
        )}

        <Divider />

        {/* Action Buttons */}
        <div className="gba:flex gba:justify-end gba:gap-3">
          <Button onClick={onCancel} data-testid={`${testId}-cancel-button`}>
            {readOnly 
              ? getTranslationFromI18nKeyAndLabel('flow.step.close', 'Close')
              : getTranslationFromI18nKeyAndLabel('flow.step.cancel', 'Cancel')
            }
          </Button>
          {getActionButtons()}
        </div>
      </div>
    </Modal>
  );
}; 