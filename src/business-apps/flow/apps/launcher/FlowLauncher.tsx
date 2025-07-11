import React, { useState, useEffect } from 'react';
// Using inline type definition since we can't resolve the import
interface BusinessAppContextProps {
  accessToken: string;
  user: any;
  userInfo: any;
  employeeId: string;
  'data-testid'?: string;
};
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { FlowTemplate } from '@/common/network/flows/FlowTemplateClient';
import { useFlowTemplateClient } from '@/common/network/flows/useFlowTemplateClient';
import { Spin, Alert, Card, Button, Input, Select, Typography } from 'antd';
const { TextArea } = Input;
import { PlayCircleOutlined, FileTextOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

interface RuntimeContentBlock {
  parameterName: string;
  stepIndex: number;
  blockIndex: number;
  blockId: string;
  blockType: string;
  label: string;
}

interface LaunchParameters {
  [key: string]: string;
}

/**
 * Flow Launcher App component for launching published workflow templates
 */
export const FlowLauncher: React.FC<BusinessAppContextProps> = ({ 
  accessToken,
  user,
  userInfo,
  employeeId,
  'data-testid': testId = 'flow-launcher'
}) => {
  // API Integration
  const flowTemplateClient = useFlowTemplateClient(accessToken);
  
  // State management
  const [templates, setTemplates] = useState<FlowTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);
  const [templateMetadata, setTemplateMetadata] = useState<any>(null);
  const [launchParameters, setLaunchParameters] = useState<LaunchParameters>({});
  const [isLaunching, setIsLaunching] = useState(false);

  // Load published templates from API
  const loadPublishedTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Get all templates and filter for published ones (non-draft)
      const allTemplates = await flowTemplateClient.getAllTemplates();
      const publishedTemplates = allTemplates.filter(template => 
        template.flowType !== 'DRAFT' && template.flowType !== 'INSTANCE'
      );
      setTemplates(publishedTemplates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
      console.error('Error loading templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load template metadata to get runtime content blocks
  const loadTemplateMetadata = async (templateId: string) => {
    try {
      const metadata = await flowTemplateClient.getTemplateWithMetadata(templateId);
      setTemplateMetadata(metadata);
      
             // Initialize launch parameters for runtime content blocks
       const runtimeBlocks = metadata.metadata.workflowDefinition?.metadata?.runtimeContentBlocks || [];
       const initialParams: LaunchParameters = {};
       runtimeBlocks.forEach((block: RuntimeContentBlock) => {
         initialParams[block.parameterName] = '';
       });
       setLaunchParameters(initialParams);
    } catch (err) {
      console.error('Error loading template metadata:', err);
    }
  };

  // Load templates on component mount
  useEffect(() => {
    if (accessToken) {
      loadPublishedTemplates();
    }
  }, [accessToken]);

  // Handle template selection
  const handleTemplateSelect = async (template: FlowTemplate) => {
    setSelectedTemplate(template);
    if (template.id) {
      await loadTemplateMetadata(template.id);
    }
  };

  // Handle parameter change
  const handleParameterChange = (parameterName: string, value: string) => {
    setLaunchParameters(prev => ({
      ...prev,
      [parameterName]: value
    }));
  };

  // Launch the workflow
  const handleLaunch = async () => {
    if (!selectedTemplate || !templateMetadata) return;

    try {
      setIsLaunching(true);
      
      // Prepare workflow input
      const workflowInput = {
        initiator: user?.id || employeeId,
        context: {
          flowInstanceId: `flow_instance_${Date.now()}`,
          launchedBy: user?.name || user?.id || employeeId,
          launchedAt: new Date().toISOString()
        },
        resolvedAssignments: {}, // Would be populated based on template assignments
        ...launchParameters // Add runtime content block values
      };

      // For now, we'll just log the workflow input
      // In a real implementation, this would call the Conductor API to start the workflow
      console.log('Launching workflow with input:', workflowInput);
      
      // TODO: Call actual workflow start API
      // const workflowId = await startWorkflow(templateMetadata.metadata.workflowDefinition.name, workflowInput);
      
      alert('Workflow launched successfully! (This is a demo - check console for details)');
      
    } catch (err) {
      console.error('Error launching workflow:', err);
      alert('Failed to launch workflow');
    } finally {
      setIsLaunching(false);
    }
  };

     // Check if all required parameters are filled
   const canLaunch = selectedTemplate && templateMetadata && 
     (templateMetadata.metadata.workflowDefinition?.metadata?.runtimeContentBlocks || []).every(
       (block: RuntimeContentBlock) => launchParameters[block.parameterName]?.trim()
     );

  return (
    <div className="gba:flex gba:flex-col gba:gap-6 gba:p-6" data-testid={testId}>
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4" data-testid={`${testId}-header`}>
        <Title level={2} className="gba:m-0" data-testid={`${testId}-title`}>
          {getTranslationFromI18nKeyAndLabel('flow.launcher.title', 'Launch Flow')}
        </Title>
      </div>
      
      {isLoading ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-8" data-testid={`${testId}-loading`}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <Alert
          message="Error Loading Templates"
          description={error}
          type="error"
          showIcon
          action={
            <Button onClick={loadPublishedTemplates} data-testid={`${testId}-retry`}>
              Retry
            </Button>
          }
          data-testid={`${testId}-error`}
        />
      ) : (
        <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6">
          {/* Template Selection */}
          <div data-testid={`${testId}-template-selection`}>
            <Title level={4} className="gba:mb-4">
              {getTranslationFromI18nKeyAndLabel('flow.launcher.selectTemplate', 'Select Template')}
            </Title>
            
            {templates.length === 0 ? (
              <Alert
                message="No Published Templates"
                description="No published flow templates are available for launch."
                type="info"
                showIcon
                data-testid={`${testId}-no-templates`}
              />
            ) : (
              <div className="gba:space-y-3">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className={`gba:cursor-pointer gba:transition-all ${
                      selectedTemplate?.id === template.id 
                        ? 'gba:border-blue-500 gba:shadow-md' 
                        : 'gba:border-gray-200 hover:gba:border-gray-300'
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                    data-testid={`${testId}-template-${template.id}`}
                  >
                    <div className="gba:flex gba:items-start gba:gap-3">
                      <FileTextOutlined className="gba:text-blue-500 gba:text-lg gba:mt-1" />
                      <div className="gba:flex-1">
                        <Title level={5} className="gba:m-0 gba:mb-1">
                          {template.title}
                        </Title>
                        <Text type="secondary" className="gba:text-sm">
                          {template.description}
                        </Text>
                        <div className="gba:mt-2 gba:flex gba:gap-2">
                          <span className={`gba:px-2 gba:py-1 gba:rounded gba:text-xs ${
                            template.executionStrategy === 'PARALLEL' 
                              ? 'gba:bg-purple-100 gba:text-purple-700' 
                              : 'gba:bg-blue-100 gba:text-blue-700'
                          }`}>
                            {template.executionStrategy}
                          </span>
                          <span className="gba:px-2 gba:py-1 gba:bg-gray-100 gba:text-gray-700 gba:rounded gba:text-xs">
                            {template.steps.length} step{template.steps.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Parameter Configuration */}
          <div data-testid={`${testId}-parameter-config`}>
            <Title level={4} className="gba:mb-4">
              {getTranslationFromI18nKeyAndLabel('flow.launcher.configureParameters', 'Configure Parameters')}
            </Title>
            
            {!selectedTemplate ? (
              <Alert
                message="Select a Template"
                description="Please select a template from the left to configure its parameters."
                type="info"
                data-testid={`${testId}-select-template-prompt`}
              />
            ) : !templateMetadata ? (
              <div className="gba:flex gba:justify-center gba:py-4">
                <Spin />
              </div>
            ) : (
              <div className="gba:space-y-4">
                <div className="gba:p-4 gba:bg-gray-50 gba:rounded">
                  <Title level={5} className="gba:m-0 gba:mb-2">
                    {selectedTemplate.title}
                  </Title>
                  <Text type="secondary">
                    {selectedTemplate.description}
                  </Text>
                </div>

                                 {templateMetadata.metadata.workflowDefinition?.metadata?.runtimeContentBlocks?.length > 0 ? (
                   <div className="gba:space-y-4">
                     <Text strong>
                       {getTranslationFromI18nKeyAndLabel('flow.launcher.fillRequiredContent', 'Fill Required Content')}
                     </Text>
                     
                     {templateMetadata.metadata.workflowDefinition.metadata.runtimeContentBlocks.map((block: RuntimeContentBlock) => (
                      <div key={block.parameterName} className="gba:space-y-2">
                        <label className="gba:block gba:text-sm gba:font-medium">
                          {block.label}
                        </label>
                                                 {block.blockType === 'TEXT' ? (
                           <TextArea
                             value={launchParameters[block.parameterName] || ''}
                             onChange={(e: any) => handleParameterChange(block.parameterName, e.target.value)}
                             placeholder={`Enter content for ${block.label}`}
                             rows={3}
                             data-testid={`${testId}-param-${block.parameterName}`}
                           />
                         ) : (
                          <Input
                            value={launchParameters[block.parameterName] || ''}
                            onChange={(e) => handleParameterChange(block.parameterName, e.target.value)}
                            placeholder={`Enter content for ${block.label}`}
                            data-testid={`${testId}-param-${block.parameterName}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert
                    message="No Parameters Required"
                    description="This template has no content blocks that need to be filled at launch time."
                    type="success"
                    showIcon
                  />
                )}

                <div className="gba:pt-4 gba:border-t">
                  <Button
                    type="primary"
                    size="large"
                    icon={<PlayCircleOutlined />}
                    onClick={handleLaunch}
                    disabled={!canLaunch}
                    loading={isLaunching}
                    className="gba:w-full"
                    data-testid={`${testId}-launch-button`}
                  >
                    {isLaunching 
                      ? getTranslationFromI18nKeyAndLabel('flow.launcher.launching', 'Launching...') 
                      : getTranslationFromI18nKeyAndLabel('flow.launcher.launch', 'Launch Flow')
                    }
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FlowLauncher; 