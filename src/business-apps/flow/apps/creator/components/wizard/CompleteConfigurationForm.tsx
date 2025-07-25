import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { Button, Input, Form, Alert, Badge } from 'antd';
import { 
  SettingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useWizardStore } from '../../hooks/useWizardStore';
import { useFlowTemplateStore } from '../../hooks/useFlowTemplateStore';
import { BusinessPattern } from '../../types/businessPatterns';
import { AssignmentMode } from '../../types/flowTemplate';
import { PatternSelector } from './PatternSelector';
import { StepsSection } from '../steps/StepsSection';

const { TextArea } = Input;

interface CompleteConfigurationFormProps {
  'data-testid'?: string;
}

/**
 * Single-step form combining template details, optional pattern selection, and step configuration
 */
export const CompleteConfigurationForm: React.FC<CompleteConfigurationFormProps> = ({
  'data-testid': testId = 'complete-configuration-form'
}) => {
  const { 
    selectedPattern, 
    configuration, 
    selectPattern, 
    skipPattern,
    updateConfiguration,
    isEditMode
  } = useWizardStore();
  
  const { 
    updateTitle,
    updateDescription,
    initializeTemplate,
    flowTemplate 
  } = useFlowTemplateStore();
  
  const [form] = Form.useForm();

  // Sync wizard configuration with flow template store and form - one way only
  useEffect(() => {
    if (configuration.title) {
      updateTitle(configuration.title);
      form.setFieldsValue({ title: configuration.title });
    }
    if (configuration.description) {
      updateDescription(configuration.description);
      form.setFieldsValue({ description: configuration.description });
    }
  }, [configuration.title, configuration.description, updateTitle, updateDescription, form]);

  // Sync steps from wizard configuration to flow template store - one way only
  useEffect(() => {
    if (configuration.steps && configuration.steps.length > 0) {
      initializeTemplate({ 
        ...flowTemplate, 
        name: configuration.title || flowTemplate.name || '',
        description: configuration.description || flowTemplate.description || '',
        steps: configuration.steps 
      });
    }
  }, [configuration.steps, configuration.title, configuration.description, initializeTemplate]);

  // REMOVED: The circular dependency that was syncing flowTemplate.steps back to configuration
  // This was causing infinite loops. StepsSection works directly with flowTemplate now.

  // REMOVED: handlePatternSelect function - logic now handled by:
  // 1. useWizardStore.applyPatternDefaults() when pattern is selected
  // 2. useEffect hooks above that sync configuration to form and flow template

  // REMOVED: This useEffect was causing infinite loops because handlePatternSelect
  // is not memoized and gets recreated on every render. Pattern application
  // now happens directly in the PatternSelector component.

  // Handle clearing pattern selection
  const handleClearPattern = () => {
    skipPattern();
    form.setFieldsValue({ title: '', description: '' });
    updateTitle('');
    updateDescription('');
    updateConfiguration('title', '');
    updateConfiguration('description', '');
    updateConfiguration('steps', []);
    // Reset flow template to empty state
    initializeTemplate({ 
      type: 'TEMPLATE',
      name: '',
      description: '',
      assignmentMode: AssignmentMode.CLAIM,
      steps: [] 
    });
  };

  // Handle skipping pattern selection (custom workflow)
  const handleSkipPattern = () => {
    skipPattern();
  };

  // Handle form field changes
  const handleFieldChange = (field: string, value: string) => {
    updateConfiguration(field, value);
    if (field === 'title') {
      updateTitle(value);
    } else if (field === 'description') {
      updateDescription(value);
    }
  };

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* Business Pattern Selection - Always visible at top for create mode */}
      {!isEditMode && (
        <Card data-testid={`${testId}-pattern-section`}>
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-3">
              <SettingOutlined className="gba:text-blue-500" />
              <span className="gba:text-lg">
                {getTranslationFromI18nKeyAndLabel('flow.wizard.choosePattern', 'Choose Business Pattern')}
              </span>
              <Badge 
                color="blue" 
                text={getTranslationFromI18nKeyAndLabel('flow.wizard.optional', 'Optional')}
              />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              <Alert
                message={getTranslationFromI18nKeyAndLabel('flow.wizard.patternHelp', 'Choose a business pattern to get pre-configured steps and smart defaults, or skip to create a custom workflow from scratch')}
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
              />
              
              <PatternSelector 
                onNext={() => {}} // No navigation needed in single step
                data-testid={`${testId}-pattern-selector`}
              />
              
              <div className="gba:flex gba:justify-center gba:pt-4 gba:border-t">
                <Button onClick={handleSkipPattern} data-testid={`${testId}-skip-pattern`}>
                  {getTranslationFromI18nKeyAndLabel('flow.wizard.skipPattern', 'Skip - Create Custom Workflow')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Pattern Summary */}
      {selectedPattern && (
        <Alert
          message={
            <div className="gba:flex gba:items-center gba:justify-between">
              <span>
                <strong>{getTranslationFromI18nKeyAndLabel('flow.wizard.selectedPattern', 'Selected Pattern')}:</strong> {selectedPattern.title}
              </span>
              <Button 
                size="small" 
                onClick={handleClearPattern}
                data-testid={`${testId}-clear-pattern`}
              >
                {getTranslationFromI18nKeyAndLabel('flow.wizard.clearPattern', 'Clear')}
              </Button>
            </div>
          }
          type="success"
          showIcon
          data-testid={`${testId}-selected-pattern`}
        />
      )}

      {/* Template Details Form */}
      <div data-testid={`${testId}-basic-info`} className="gba:space-y-4">
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            title: configuration.title || flowTemplate.name || '',
            description: configuration.description || flowTemplate.description || ''
          }}
          onValuesChange={(changedValues) => {
            Object.entries(changedValues).forEach(([key, value]) => {
              handleFieldChange(key, value as string);
            });
          }}
        >
          <Form.Item
            label={getTranslationFromI18nKeyAndLabel('flow.creator.name', 'Workflow Name')}
            name="title"
            rules={[
              { required: true, message: 'Please enter a workflow name' },
              { min: 3, message: 'Name must be at least 3 characters' },
              { max: 100, message: 'Name must not exceed 100 characters' }
            ]}
          >
            <Input 
              placeholder={getTranslationFromI18nKeyAndLabel('flow.creator.namePlaceholder', 'Enter a descriptive name for your workflow')}
              data-testid={`${testId}-title-input`}
            />
          </Form.Item>

          <Form.Item
            label={getTranslationFromI18nKeyAndLabel('flow.creator.description', 'Description')}
            name="description"
            rules={[
              { max: 500, message: 'Description must not exceed 500 characters' }
            ]}
          >
            <TextArea 
              rows={3}
              placeholder={getTranslationFromI18nKeyAndLabel('flow.creator.descriptionPlaceholder', 'Describe the purpose and scope of this workflow')}
              data-testid={`${testId}-description-input`}
            />
          </Form.Item>
        </Form>
      </div>

      {/* Steps Configuration */}
      <div data-testid={`${testId}-steps-section`}>
        <StepsSection />
      </div>
    </div>
  );
}; 