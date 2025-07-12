import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { Button, Input, Select, Checkbox, Form, Space, Typography, Alert, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, DragOutlined } from '@ant-design/icons';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useWizardStore } from '../../hooks/useWizardStore';
import { StepType, ContentBlockType, InputBlockType } from '../../types/flowTemplate';
import { AssignmentConfiguration } from './AssignmentConfiguration';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface StepConfigurationProps {
  onNext: () => void;
  'data-testid'?: string;
}

interface ConfigurableStep {
  id: string;
  title: string;
  description: string;
  type: StepType;
  assignment: {
    required: boolean;
    type: 'single' | 'multiple' | 'any' | 'all';
    targets: string[];
  };
  contentBlocks: {
    id: string;
    type: ContentBlockType;
    content: string;
    required: boolean;
  }[];
  inputBlocks: {
    id: string;
    type: InputBlockType;
    label: string;
    required: boolean;
    placeholder?: string;
  }[];
}

/**
 * Step configuration component for customizing workflow steps
 */
export const StepConfiguration: React.FC<StepConfigurationProps> = ({
  onNext,
  'data-testid': testId = 'step-configuration'
}) => {
  const { selectedPattern, configuration, updateConfiguration } = useWizardStore();
  const [form] = Form.useForm();
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [steps, setSteps] = useState<ConfigurableStep[]>(() => {
    // Initialize with pattern's pre-configured steps
    if (selectedPattern?.preConfiguredSteps) {
      return selectedPattern.preConfiguredSteps.map((step, index) => ({
        id: `step-${Date.now()}-${index}`,
        title: step.title,
        description: step.description,
        type: step.type,
        assignment: {
          required: step.assignmentRequired,
          type: step.assignmentType,
          targets: []
        },
        contentBlocks: step.contentBlocks.map((block, blockIndex) => ({
          id: `content-${Date.now()}-${blockIndex}`,
          type: block.type,
          content: block.content,
          required: block.required
        })),
        inputBlocks: step.inputBlocks.map((block, blockIndex) => ({
          id: `input-${Date.now()}-${blockIndex}`,
          type: block.type,
          label: block.label,
          required: block.required,
          placeholder: block.placeholder
        }))
      }));
    }
    return [];
  });

  // Update configuration when steps change
  useEffect(() => {
    if (steps.length > 0) {
      updateConfiguration('steps', steps);
    }
  }, [steps, updateConfiguration]);

  const handleAddStep = () => {
    const newStep: ConfigurableStep = {
      id: `step-${Date.now()}`,
      title: 'New Step',
      description: 'Step description',
      type: StepType.TASK,
      assignment: {
        required: true,
        type: 'single',
        targets: []
      },
      contentBlocks: [],
      inputBlocks: []
    };
    const updatedSteps = [...steps, newStep];
    setSteps(updatedSteps);
    // Configuration will be updated via useEffect
    setEditingStep(newStep.id);
  };

  const handleUpdateStep = (stepId: string, updates: Partial<ConfigurableStep>) => {
    const updatedSteps = steps.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    );
    setSteps(updatedSteps);
    // Configuration will be updated via useEffect
  };

  const handleDeleteStep = (stepId: string) => {
    const updatedSteps = steps.filter(step => step.id !== stepId);
    setSteps(updatedSteps);
    // Configuration will be updated via useEffect
    if (editingStep === stepId) {
      setEditingStep(null);
    }
  };

  const handleAddContentBlock = (stepId: string) => {
    const newBlock = {
      id: `content-${Date.now()}`,
      type: ContentBlockType.TEXT,
      content: 'Content block text',
      required: true
    };
    
    handleUpdateStep(stepId, {
      contentBlocks: [...(steps.find(s => s.id === stepId)?.contentBlocks || []), newBlock]
    });
  };

  const handleAddInputBlock = (stepId: string) => {
    const newBlock = {
      id: `input-${Date.now()}`,
      type: InputBlockType.TEXT,
      label: 'Input Label',
      required: true,
      placeholder: 'Enter value...'
    };
    
    handleUpdateStep(stepId, {
      inputBlocks: [...(steps.find(s => s.id === stepId)?.inputBlocks || []), newBlock]
    });
  };

  const handleSaveConfiguration = () => {
    updateConfiguration('steps', steps);
    onNext();
  };

  const getStepTypeOptions = () => [
    { value: StepType.TASK, label: 'Task' },
    { value: StepType.APPROVAL, label: 'Approval' },
    { value: StepType.INFORMATION, label: 'Information' },
    { value: StepType.ACKNOWLEDGE, label: 'Acknowledge' }
  ];

  const getContentBlockTypeOptions = () => [
    { value: ContentBlockType.TEXT, label: 'Text' },
    { value: ContentBlockType.DOCUMENT, label: 'Document' },
    { value: ContentBlockType.LINK, label: 'Link' },
    { value: ContentBlockType.IMAGE, label: 'Image' }
  ];

  const getInputBlockTypeOptions = () => [
    { value: InputBlockType.TEXT, label: 'Text Input' },
    { value: InputBlockType.TEXTAREA, label: 'Text Area' },
    { value: InputBlockType.DROPDOWN, label: 'Dropdown' },
    { value: InputBlockType.CHECKBOX, label: 'Checkbox' },
    { value: InputBlockType.DATETIME, label: 'Date/Time' },
    { value: InputBlockType.FILE, label: 'File Upload' }
  ];

  const renderStepEditor = (step: ConfigurableStep) => (
    <Card key={step.id} className="gba:mb-4" data-testid={`${testId}-step-${step.id}`}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:flex gba:items-center gba:space-x-2">
            <DragOutlined className="gba:cursor-move" />
            <span>{step.title}</span>
          </CardTitle>
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => setEditingStep(editingStep === step.id ? null : step.id)}
              type={editingStep === step.id ? 'primary' : 'default'}
              size="small"
            >
              {editingStep === step.id ? 'Done' : 'Edit'}
            </Button>
            <Button
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteStep(step.id)}
              danger
              size="small"
            >
              Delete
            </Button>
          </Space>
        </div>
      </CardHeader>
      
      {editingStep === step.id && (
        <CardContent>
          <Form layout="vertical">
            <Form.Item label="Step Title">
              <Input
                value={step.title}
                onChange={(e) => handleUpdateStep(step.id, { title: e.target.value })}
                placeholder="Enter step title"
              />
            </Form.Item>
            
            <Form.Item label="Description">
              <TextArea
                value={step.description}
                onChange={(e) => handleUpdateStep(step.id, { description: e.target.value })}
                placeholder="Enter step description"
                rows={2}
              />
            </Form.Item>
            
            <Form.Item label="Step Type">
              <Select
                value={step.type}
                onChange={(value) => handleUpdateStep(step.id, { type: value })}
                options={getStepTypeOptions()}
              />
            </Form.Item>
            
            <Form.Item label="Assignment Configuration">
              <AssignmentConfiguration
                value={{
                  required: step.assignment.required,
                  type: step.assignment.type,
                  targets: step.assignment.targets?.map((target, index) => ({
                    id: `target-${index}`,
                    type: 'user' as const,
                    value: target,
                    label: target
                  })) || [],
                  allowReassignment: true,
                  autoAssign: false,
                  fallbackAssignment: {
                    enabled: false,
                    type: 'manager'
                  }
                }}
                onChange={(config) => handleUpdateStep(step.id, {
                  assignment: {
                    required: config.required,
                    type: config.type,
                    targets: config.targets.map(t => t.value)
                  }
                })}
              />
            </Form.Item>
            
            <Divider />
            
            <div className="gba:mb-4">
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                <Text strong>Content Blocks</Text>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => handleAddContentBlock(step.id)}
                  size="small"
                >
                  Add Content
                </Button>
              </div>
              
                             {step.contentBlocks.map((block, index) => (
                 <Card key={block.id} className="gba:mb-2 gba:p-2">
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <Select
                      value={block.type}
                      onChange={(value) => {
                        const updatedBlocks = [...step.contentBlocks];
                        updatedBlocks[index] = { ...block, type: value };
                        handleUpdateStep(step.id, { contentBlocks: updatedBlocks });
                      }}
                      options={getContentBlockTypeOptions()}
                      style={{ width: 120 }}
                    />
                    <Input
                      value={block.content}
                      onChange={(e) => {
                        const updatedBlocks = [...step.contentBlocks];
                        updatedBlocks[index] = { ...block, content: e.target.value };
                        handleUpdateStep(step.id, { contentBlocks: updatedBlocks });
                      }}
                      placeholder="Content text"
                      style={{ flex: 1 }}
                    />
                    <Checkbox
                      checked={block.required}
                      onChange={(e) => {
                        const updatedBlocks = [...step.contentBlocks];
                        updatedBlocks[index] = { ...block, required: e.target.checked };
                        handleUpdateStep(step.id, { contentBlocks: updatedBlocks });
                      }}
                    >
                      Required
                    </Checkbox>
                    <Button
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        const updatedBlocks = step.contentBlocks.filter((_, i) => i !== index);
                        handleUpdateStep(step.id, { contentBlocks: updatedBlocks });
                      }}
                      size="small"
                      danger
                    />
                  </div>
                </Card>
              ))}
            </div>
            
            <div className="gba:mb-4">
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
                <Text strong>Input Blocks</Text>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => handleAddInputBlock(step.id)}
                  size="small"
                >
                  Add Input
                </Button>
              </div>
              
                             {step.inputBlocks.map((block, index) => (
                 <Card key={block.id} className="gba:mb-2 gba:p-2">
                  <div className="gba:flex gba:items-center gba:space-x-2">
                    <Select
                      value={block.type}
                      onChange={(value) => {
                        const updatedBlocks = [...step.inputBlocks];
                        updatedBlocks[index] = { ...block, type: value };
                        handleUpdateStep(step.id, { inputBlocks: updatedBlocks });
                      }}
                      options={getInputBlockTypeOptions()}
                      style={{ width: 120 }}
                    />
                    <Input
                      value={block.label}
                      onChange={(e) => {
                        const updatedBlocks = [...step.inputBlocks];
                        updatedBlocks[index] = { ...block, label: e.target.value };
                        handleUpdateStep(step.id, { inputBlocks: updatedBlocks });
                      }}
                      placeholder="Input label"
                      style={{ flex: 1 }}
                    />
                    <Input
                      value={block.placeholder}
                      onChange={(e) => {
                        const updatedBlocks = [...step.inputBlocks];
                        updatedBlocks[index] = { ...block, placeholder: e.target.value };
                        handleUpdateStep(step.id, { inputBlocks: updatedBlocks });
                      }}
                      placeholder="Placeholder text"
                      style={{ flex: 1 }}
                    />
                    <Checkbox
                      checked={block.required}
                      onChange={(e) => {
                        const updatedBlocks = [...step.inputBlocks];
                        updatedBlocks[index] = { ...block, required: e.target.checked };
                        handleUpdateStep(step.id, { inputBlocks: updatedBlocks });
                      }}
                    >
                      Required
                    </Checkbox>
                    <Button
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        const updatedBlocks = step.inputBlocks.filter((_, i) => i !== index);
                        handleUpdateStep(step.id, { inputBlocks: updatedBlocks });
                      }}
                      size="small"
                      danger
                    />
                  </div>
                </Card>
              ))}
            </div>
          </Form>
        </CardContent>
      )}
      
      {editingStep !== step.id && (
        <CardContent>
          <div className="gba:space-y-2">
            <div>
              <Text strong>Type:</Text> <Text>{step.type}</Text>
            </div>
            <div>
              <Text strong>Description:</Text> <Text>{step.description}</Text>
            </div>
            <div>
              <Text strong>Assignment:</Text> <Text>{step.assignment.required ? `Required (${step.assignment.type})` : 'Not required'}</Text>
            </div>
            <div>
              <Text strong>Content Blocks:</Text> <Text>{step.contentBlocks.length}</Text>
            </div>
            <div>
              <Text strong>Input Blocks:</Text> <Text>{step.inputBlocks.length}</Text>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* Header */}
      <div className="gba:text-center gba:mb-6">
        <Title level={3}>
          {getTranslationFromI18nKeyAndLabel('flow.wizard.configureSteps', 'Configure Workflow Steps')}
        </Title>
        <Text className="gba:text-gray-600">
          {getTranslationFromI18nKeyAndLabel('flow.wizard.configureStepsDescription', 'Customize the steps for your workflow based on the selected pattern')}
        </Text>
      </div>

      {/* Pattern Summary */}
      {selectedPattern && (
        <Alert
          message={`Pattern: ${selectedPattern.title}`}
          description={selectedPattern.description}
          type="info"
          showIcon
        />
      )}

      {/* Steps Configuration */}
      <div className="gba:space-y-4">
        <div className="gba:flex gba:items-center gba:justify-between">
          <Title level={4}>Workflow Steps ({steps.length})</Title>
          <Button
            icon={<PlusOutlined />}
            onClick={handleAddStep}
            type="primary"
            data-testid={`${testId}-add-step`}
          >
            Add Step
          </Button>
        </div>

        {steps.length === 0 ? (
          <Card className="gba:text-center gba:py-12">
            <Text className="gba:text-gray-500">
              No steps configured yet. Click "Add Step" to create your first step.
            </Text>
          </Card>
        ) : (
          <div className="gba:space-y-4">
            {steps.map(renderStepEditor)}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="gba:flex gba:justify-end gba:pt-6">
        <Button
          type="primary"
          onClick={handleSaveConfiguration}
          disabled={steps.length === 0}
          size="large"
          data-testid={`${testId}-save-button`}
        >
          Save Configuration
        </Button>
      </div>
    </div>
  );
}; 