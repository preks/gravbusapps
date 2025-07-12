import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { Button, Typography, Alert, Space } from 'antd';
import { PlusOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Settings, Eye, EyeOff, Lightbulb } from 'lucide-react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useWizardStore } from '../../hooks/useWizardStore';
import { StepType, ContentBlockType, InputBlockType } from '../../types/flowTemplate';
import { StepEditor } from './StepEditor';

const { Title, Text } = Typography;

interface StepConfigurationProps {
  onNext?: () => void;
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
  const [showHelp, setShowHelp] = useState(false);
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

  // Save configuration whenever steps change
  useEffect(() => {
    updateConfiguration('steps', steps);
  }, [steps, updateConfiguration]);

  const handleAddStep = () => {
    const newStep: ConfigurableStep = {
      id: `step-${Date.now()}`,
      title: 'New Step',
      description: '',
      type: StepType.TASK,
      assignment: {
        required: true,
        type: 'single',
        targets: []
      },
      contentBlocks: [],
      inputBlocks: []
    };
    setSteps([...steps, newStep]);
  };

  const handleUpdateStep = (stepId: string, updates: Partial<ConfigurableStep>) => {
    setSteps(steps.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const handleDeleteStep = (stepId: string) => {
    setSteps(steps.filter(step => step.id !== stepId));
  };

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* Header */}
      <div className="gba:text-center gba:mb-8">
        <div className="gba:flex gba:items-center gba:justify-center gba:space-x-3 gba:mb-3">
          <div className="gba:flex gba:items-center gba:justify-center gba:w-12 gba:h-12 gba:rounded-full gba:bg-blue-100">
            <Settings className="gba:w-6 gba:h-6 gba:text-blue-600" />
          </div>
          <Title level={3} className="gba:mb-0 gba:text-gray-800">
            {getTranslationFromI18nKeyAndLabel('flow.wizard.configureSteps', 'Configure Workflow Steps')}
          </Title>
        </div>
        <Text className="gba:text-gray-600 gba:text-base gba:block gba:mb-4 gba:max-w-2xl gba:mx-auto">
          {getTranslationFromI18nKeyAndLabel('flow.wizard.configureStepsDescription', 'Customize the steps for your workflow based on the selected pattern. Add content blocks to display information and input blocks to collect data from users.')}
        </Text>
        
        {/* Help Toggle */}
        <Button
          icon={showHelp ? <EyeOff className="gba:w-4 gba:h-4" /> : <Lightbulb className="gba:w-4 gba:h-4" />}
          onClick={() => setShowHelp(!showHelp)}
          type="link"
          size="small"
          className="gba:text-blue-600 gba:font-medium"
        >
          {showHelp ? 'Hide Tips' : 'Show Tips'}
        </Button>
      </div>

      {/* Help Section */}
      {showHelp && (
        <Alert
          message="Step Configuration Tips"
          description={
            <div className="gba:space-y-3 gba:text-sm">
              <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4">
                <div className="gba:space-y-2">
                  <Text strong className="gba:text-blue-700">Step Types:</Text>
                  <div>• <strong>Tasks</strong> require action from users (approvals, form completion)</div>
                  <div>• <strong>Information</strong> steps display content without requiring input</div>
                  <div>• <strong>Approval</strong> steps require approval or rejection decisions</div>
                  <div>• <strong>Acknowledge</strong> steps require users to acknowledge information</div>
                </div>
                <div className="gba:space-y-2">
                  <Text strong className="gba:text-green-700">Content & Inputs:</Text>
                  <div>• <strong>Content blocks</strong> display information to users</div>
                  <div>• <strong>Input blocks</strong> collect data from users</div>
                  <div>• Use different block types for various content and input needs</div>
                  <div>• Mark blocks as required to ensure completion</div>
                </div>
              </div>
            </div>
          }
          type="info"
          showIcon
          closable
          onClose={() => setShowHelp(false)}
          className="gba:mb-6"
        />
      )}

      {/* Pattern Summary */}
      {selectedPattern && (
        <div className="gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded-lg gba:p-5">
          <div className="gba:flex gba:items-center gba:space-x-3 gba:mb-2">
            <CheckCircleOutlined className="gba:text-blue-600 gba:text-lg" />
            <Text strong className="gba:text-blue-800 gba:text-lg">Selected Pattern: {selectedPattern.title}</Text>
          </div>
          <Text className="gba:text-blue-700 gba:text-sm">{selectedPattern.description}</Text>
        </div>
      )}

      {/* Steps Configuration */}
      <div className="gba:space-y-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:bg-gray-50 gba:p-5 gba:rounded-lg gba:border gba:border-gray-200">
          <div className="gba:flex gba:items-center gba:space-x-4">
            <div className="gba:flex gba:items-center gba:justify-center gba:w-12 gba:h-12 gba:rounded-full gba:bg-blue-100">
              <Text className="gba:text-xl gba:font-bold gba:text-blue-600">{steps.length}</Text>
            </div>
            <div>
              <Title level={4} className="gba:mb-1 gba:text-gray-800">Workflow Steps</Title>
              <Text className="gba:text-sm gba:text-gray-600">
                {steps.length === 0 ? 'No steps configured' : `${steps.length} step${steps.length > 1 ? 's' : ''} configured`}
              </Text>
            </div>
          </div>
          <Button
            icon={<PlusOutlined />}
            onClick={handleAddStep}
            type="primary"
            size="large"
            data-testid={`${testId}-add-step`}
          >
            Add Step
          </Button>
        </div>

        {steps.length === 0 ? (
          <Card className="gba:text-center gba:py-16 gba:bg-gray-50 gba:border-dashed gba:border-2 gba:border-gray-300">
            <div className="gba:space-y-4">
              <div className="gba:flex gba:justify-center">
                <div className="gba:w-20 gba:h-20 gba:rounded-full gba:bg-gray-200 gba:flex gba:items-center gba:justify-center">
                  <Settings className="gba:w-10 gba:h-10 gba:text-gray-400" />
                </div>
              </div>
              <div>
                <Text className="gba:text-gray-600 gba:text-xl gba:block gba:mb-2 gba:font-medium">No steps configured yet</Text>
                <Text className="gba:text-gray-500 gba:text-base">
                  Add your first step to start building your workflow
                </Text>
              </div>
              <Button
                icon={<PlusOutlined />}
                onClick={handleAddStep}
                type="primary"
                size="large"
                className="gba:mt-4"
              >
                Add First Step
              </Button>
            </div>
          </Card>
        ) : (
          <div className="gba:space-y-4">
            {steps.map((step, index) => (
              <StepEditor
                key={step.id}
                step={step}
                index={index}
                onUpdate={(updates) => handleUpdateStep(step.id, updates)}
                onDelete={() => handleDeleteStep(step.id)}
                data-testid={`${testId}-step-editor`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 