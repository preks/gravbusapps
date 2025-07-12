import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { Button, Input, Select, Form, Space, Typography, Divider, Tag, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, UserOutlined, FileTextOutlined, FormOutlined } from '@ant-design/icons';
import { CheckSquare, MessageSquare, FileText, Users, Target, Eye } from 'lucide-react';
import { StepType, ContentBlockType, InputBlockType } from '../../types/flowTemplate';
import { ContentBlocksEditor } from './ContentBlocksEditor';
import { InputBlocksEditor } from './InputBlocksEditor';

const { Title, Text } = Typography;
const { TextArea } = Input;

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

interface StepEditorProps {
  step: ConfigurableStep;
  index: number;
  onUpdate: (updates: Partial<ConfigurableStep>) => void;
  onDelete: () => void;
  'data-testid'?: string;
}

// Step type configurations with icons and descriptions
const STEP_TYPE_CONFIG = {
  [StepType.TASK]: {
    icon: <Target className="gba:w-4 gba:h-4" />,
    color: '#1890ff',
    description: 'Action required from assignee'
  },
  [StepType.APPROVAL]: {
    icon: <CheckSquare className="gba:w-4 gba:h-4" />,
    color: '#52c41a',
    description: 'Approval or rejection decision'
  },
  [StepType.INFORMATION]: {
    icon: <FileText className="gba:w-4 gba:h-4" />,
    color: '#722ed1',
    description: 'Information display only'
  },
  [StepType.ACKNOWLEDGE]: {
    icon: <Eye className="gba:w-4 gba:h-4" />,
    color: '#fa8c16',
    description: 'Acknowledgment required'
  }
};

export const StepEditor: React.FC<StepEditorProps> = ({
  step,
  index,
  onUpdate,
  onDelete,
  'data-testid': testId = 'step-editor'
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const stepConfig = STEP_TYPE_CONFIG[step.type];

  const getStepTypeOptions = () => [
    { value: StepType.TASK, label: 'Task' },
    { value: StepType.APPROVAL, label: 'Approval' },
    { value: StepType.INFORMATION, label: 'Information' },
    { value: StepType.ACKNOWLEDGE, label: 'Acknowledge' }
  ];

  const handleContentBlocksUpdate = (contentBlocks: any[]) => {
    onUpdate({ contentBlocks });
  };

  const handleInputBlocksUpdate = (inputBlocks: any[]) => {
    onUpdate({ inputBlocks });
  };

  return (
    <Card 
      key={step.id} 
      className="gba:mb-6 gba:border-l-4 gba:shadow-sm hover:gba:shadow-md gba:transition-shadow" 
      style={{ borderLeftColor: stepConfig.color }}
      data-testid={`${testId}-${step.id}`}
    >
      <CardHeader className="gba:pb-4">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:space-x-3">
            <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-gray-100 gba:font-semibold">
              <Text className="gba:text-sm gba:font-medium gba:text-gray-700">{index + 1}</Text>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-3">
              <div style={{ color: stepConfig.color }}>
                {stepConfig.icon}
              </div>
              <CardTitle className="gba:text-lg gba:mb-0 gba:font-semibold">{step.title}</CardTitle>
              <Tag color={stepConfig.color} className="gba:text-xs gba:font-medium">
                {step.type}
              </Tag>
            </div>
          </div>
          <Space size="small">
            <Tooltip title={isEditing ? "Collapse editor" : "Edit step"}>
              <Button
                icon={<EditOutlined />}
                onClick={() => setIsEditing(!isEditing)}
                type={isEditing ? 'primary' : 'default'}
                size="small"
              >
                {isEditing ? 'Done' : 'Edit'}
              </Button>
            </Tooltip>
            <Tooltip title="Delete step">
              <Button
                icon={<DeleteOutlined />}
                onClick={onDelete}
                danger
                size="small"
              >
                Delete
              </Button>
            </Tooltip>
          </Space>
        </div>
      </CardHeader>
      
      {isEditing && (
        <CardContent className="gba:pt-0">
          <Form layout="vertical" className="gba:space-y-6">
            <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-6">
              <Form.Item label="Step Title" className="gba:mb-0">
                <Input
                  value={step.title}
                  onChange={(e) => onUpdate({ title: e.target.value })}
                  placeholder="Enter step title"
                  size="large"
                />
              </Form.Item>
              
              <Form.Item label="Step Type" className="gba:mb-0">
                <Select
                  value={step.type}
                  onChange={(value) => onUpdate({ type: value })}
                  options={getStepTypeOptions()}
                  size="large"
                />
                <div className="gba:mt-2">
                  <Text className="gba:text-xs gba:text-gray-500">
                    {STEP_TYPE_CONFIG[step.type].description}
                  </Text>
                </div>
              </Form.Item>
            </div>
            
            <Form.Item label="Description" className="gba:mb-0">
              <TextArea
                value={step.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="Enter step description"
                rows={3}
                size="large"
              />
            </Form.Item>
            
            <Divider className="gba:my-6">
              <Text className="gba:text-base gba:text-gray-600 gba:font-medium">Content & Inputs</Text>
            </Divider>
            
            <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-8">
              <ContentBlocksEditor
                contentBlocks={step.contentBlocks}
                onUpdate={handleContentBlocksUpdate}
                data-testid={`${testId}-content-blocks`}
              />
              
              <InputBlocksEditor
                inputBlocks={step.inputBlocks}
                onUpdate={handleInputBlocksUpdate}
                data-testid={`${testId}-input-blocks`}
              />
            </div>
          </Form>
        </CardContent>
      )}
      
      {!isEditing && (
        <CardContent className="gba:pt-0">
          <div className="gba:grid gba:grid-cols-2 md:gba:grid-cols-4 gba:gap-4 gba:text-sm">
            <div className="gba:flex gba:items-center gba:space-x-2">
              <Text className="gba:text-gray-500">Description:</Text>
              <Text className="gba:truncate" title={step.description}>{step.description}</Text>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <FileTextOutlined className="gba:text-blue-500" />
              <Text>{step.contentBlocks.length} content</Text>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <FormOutlined className="gba:text-green-500" />
              <Text>{step.inputBlocks.length} inputs</Text>
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <UserOutlined className="gba:text-purple-500" />
              <Text>{step.assignment.type} assignment</Text>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}; 