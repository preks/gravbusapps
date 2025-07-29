import React, { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
// Import centralized mock users data
import { mockUsers } from '../../data/mockUsers';
import { env } from '@/common/env/EnvUtils';

// FlowTemplate interface matching the custom flow engine API
interface FlowTemplate {
  id?: string;
  name: string;
  description: string;
  steps: any[];
  type?: string;
  version?: number;
  isPublished?: boolean;
  metadata?: any;
}

import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { Spin, Alert, Card, Button, Input, Select, Typography, Modal } from 'antd';
const { TextArea } = Input;
import { PlayCircleOutlined, FileTextOutlined, SettingOutlined } from '@ant-design/icons';
import { ExecutionWizard } from '../creator/components/execution/ExecutionWizard';
import { MockDataProvider } from '../../providers/MockDataProvider';

const { Title, Text } = Typography;
const { Option } = Select;

// API configuration
const API_BASE = (env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'https://newwork-dev.newwork.com/flow-engine') + '/api';

interface LaunchParameters {
  [key: string]: string;
}

interface ExecutionAssignment {
  stepIndex: number;
  stepTitle: string;
  assignmentMode: string;
  assignedUsers: string[];
}

/**
 * Flow Launcher App component for launching published workflow templates
 */
interface FlowLauncherProps extends BusinessAppContextProps {
  'data-testid'?: string;
}

export const FlowLauncher: React.FC<FlowLauncherProps> = ({ 
  accessToken,
  userInfo,
  'data-testid': testId = 'flow-launcher'
}) => {
  // API client functions
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  };
  
  // State management
  const [templates, setTemplates] = useState<FlowTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);
  const [templateMetadata, setTemplateMetadata] = useState<any>(null);
  const [launchParameters, setLaunchParameters] = useState<LaunchParameters>({});
  const [executionAssignments, setExecutionAssignments] = useState<ExecutionAssignment[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);
  const [showExecutionWizard, setShowExecutionWizard] = useState(false);

  // Load published templates from API
  const loadPublishedTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Get all templates from the custom flow engine API
      const response = await fetchWithAuth(`${API_BASE}/templates`);
      const allTemplates = response.data || [];
      // Since our API only returns published templates (drafts are filtered at source),
      // we use the templates as-is since backend now provides proper id field
      const publishedTemplates = allTemplates.map((template: any) => ({
        ...template,
        // Backend now provides id field with workflow definition name - don't override it
        type: 'TEMPLATE', // Default type for published templates
      }));
      setTemplates(publishedTemplates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
      console.error('Error loading templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load template metadata
  const loadTemplateMetadata = async (templateId: string) => {
    try {
      // Use the template ID directly (now contains the actual workflow definition name from backend)
      const response = await fetchWithAuth(`${API_BASE}/templates/${templateId}/metadata`);
      setTemplateMetadata(response.data || response);
      
      // Initialize empty launch parameters
      setLaunchParameters({});
      
      // Initialize execution assignments for steps that need them
      const template = response.data?.template || response.template;
      if (template?.steps) {
        const assignments: ExecutionAssignment[] = template.steps
          .map((step: any, index: number) => {
            const assignment = step.assignment;
            // Check if step needs execution-time assignment (has no targets configured)
            const needsAssignment = assignment && (
              assignment.targets === null || 
              assignment.targets === undefined ||
              Object.keys(assignment.targets || {}).length === 0
            );
            
            if (needsAssignment) {
              return {
                stepIndex: index,
                stepTitle: step.title || `Step ${index + 1}`,
                assignmentMode: assignment.assignmentMode || 'CLAIM',
                assignedUsers: []
              };
            }
            return null;
          })
          .filter(Boolean);
        
        setExecutionAssignments(assignments);
      }
    } catch (err) {
      console.error('Error loading template metadata:', err);
    }
  };

  // Load templates on component mount
  useEffect(() => {
    console.log('FlowLauncher: accessToken =', accessToken ? 'PRESENT' : 'MISSING');
    if (accessToken) {
      console.log('FlowLauncher: Making API call to load templates');
      loadPublishedTemplates();
    } else {
      console.log('FlowLauncher: No accessToken, skipping API call');
    }
  }, [accessToken]);

  // Handle template selection
  const handleTemplateSelect = async (template: FlowTemplate) => {
    setSelectedTemplate(template);
    // Always use the template.id which contains the workflow definition name from backend
    if (template.id) {
      await loadTemplateMetadata(template.id);
    } else {
      console.error('Template missing ID field:', template);
    }
  };

  // Handle parameter change
  const handleParameterChange = (parameterName: string, value: string) => {
    setLaunchParameters(prev => ({
      ...prev,
      [parameterName]: value
    }));
  };

  // Launch the workflow using ExecutionWizard
  const handleLaunchWithWizard = () => {
    if (!selectedTemplate) return;
    setShowExecutionWizard(true);
  };

  // Execute workflow from ExecutionWizard
  const handleExecuteWorkflow = async (executionConfig: any) => {
    if (!selectedTemplate || !templateMetadata) return;

    try {
      setIsLaunching(true);
      
      // Prepare runtime assignments with correct step ID format and targets structure
      const runtimeAssignments: any = {};
      executionAssignments.forEach(assignment => {
        const stepId = `step_${assignment.stepIndex}`;
        runtimeAssignments[stepId] = {
          assignmentMode: assignment.assignmentMode,
          targets: {
            users: assignment.assignedUsers
          },
          allowReassignment: true
        };
      });

      // Prepare execution parameters for the custom flow engine API
      const executionParams = {
        runtimeParameters: launchParameters,
        initiator: userInfo?.id || userInfo?.employeeDetails?.employeeId || 'unknown',
        context: {
          flowInstanceId: `flow_instance_${Date.now()}`,
          launchedBy: userInfo?.userName || userInfo?.id || userInfo?.employeeDetails?.employeeId || 'unknown',
          launchedAt: new Date().toISOString(),
          templateTitle: selectedTemplate.name
        },
        inputValues: launchParameters,
        runtimeAssignments,
        ...executionConfig
      };

      // Execute the workflow via the custom flow engine API
      const result = await fetchWithAuth(`${API_BASE}/templates/${selectedTemplate.id}/execute`, {
        method: 'POST',
        body: JSON.stringify(executionParams),
      });
      
      console.log('Flow launched successfully:', result);
      
      alert(`Flow launched successfully!\n\nFlow ID: ${result.data?.workflowId}\nTemplate: ${selectedTemplate.name}`);
      
      // Reset form after successful launch
      setLaunchParameters({});
      setExecutionAssignments([]);
      setSelectedTemplate(null);
      setTemplateMetadata(null);
      setShowExecutionWizard(false);
      
    } catch (err) {
      console.error('Error launching workflow:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to launch workflow';
      alert(`Failed to launch workflow: ${errorMessage}`);
    } finally {
      setIsLaunching(false);
    }
  };

  // Direct launch (legacy method - kept for simple templates)
  const handleDirectLaunch = async () => {
    if (!selectedTemplate || !templateMetadata) return;

    try {
      setIsLaunching(true);
      
      // Prepare runtime assignments with correct step ID format and targets structure
      const runtimeAssignments: any = {};
      executionAssignments.forEach(assignment => {
        const stepId = `step_${assignment.stepIndex}`;
        runtimeAssignments[stepId] = {
          assignmentMode: assignment.assignmentMode,
          targets: {
            users: assignment.assignedUsers
          },
          allowReassignment: true
        };
      });

      // Prepare execution parameters for the custom flow engine API
      const executionParams = {
        runtimeParameters: launchParameters,
        initiator: userInfo?.id || userInfo?.employeeDetails?.employeeId || 'unknown',
        context: {
          flowInstanceId: `flow_instance_${Date.now()}`,
          launchedBy: userInfo?.userName || userInfo?.id || userInfo?.employeeDetails?.employeeId || 'unknown',
          launchedAt: new Date().toISOString(),
          templateTitle: selectedTemplate.name
        },
        inputValues: launchParameters,
        runtimeAssignments
      };

      // Execute the workflow via the custom flow engine API
      const result = await fetchWithAuth(`${API_BASE}/templates/${selectedTemplate.id}/execute`, {
        method: 'POST',
        body: JSON.stringify(executionParams),
      });
      
      console.log('Flow launched successfully:', result);
      
      alert(`Flow launched successfully!\n\nFlow ID: ${result.data?.workflowId}\nTemplate: ${selectedTemplate.name}`);
      
      // Reset form after successful launch
      setLaunchParameters({});
      setExecutionAssignments([]);
      setSelectedTemplate(null);
      setTemplateMetadata(null);
      
    } catch (err) {
      console.error('Error launching workflow:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to launch workflow';
      alert(`Failed to launch workflow: ${errorMessage}`);
    } finally {
      setIsLaunching(false);
    }
  };

  // Check if template can be launched
  const canLaunch = selectedTemplate && templateMetadata && 
    executionAssignments.every(assignment => assignment.assignedUsers.length > 0);

  return (
    <MockDataProvider>
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
                    <div className="gba:mt-4">
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
                              {template.name}
                            </Title>
                            <Text type="secondary" className="gba:text-sm">
                              {template.description}
                            </Text>
                            <div className="gba:mt-2 gba:flex gba:gap-2">
                              <span className="gba:px-2 gba:py-1 gba:bg-blue-100 gba:text-blue-700 gba:rounded gba:text-xs">
                                SEQUENTIAL
                              </span>
                              <span className="gba:px-2 gba:py-1 gba:bg-gray-100 gba:text-gray-700 gba:rounded gba:text-xs">
                                {template.steps.length} step{template.steps.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Launch Configuration */}
            <div data-testid={`${testId}-launch-config`}>
              <Title level={4} className="gba:mb-4">
                {getTranslationFromI18nKeyAndLabel('flow.launcher.launchConfiguration', 'Launch Configuration')}
              </Title>
              
              {!selectedTemplate ? (
                <Alert
                  message="Select a Template"
                  description="Please select a template from the left to configure its launch parameters."
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
                      {selectedTemplate.name}
                    </Title>
                    <Text type="secondary">
                      {selectedTemplate.description}
                    </Text>
                  </div>

                  {/* Assignment Configuration */}
                  {executionAssignments.length > 0 ? (
                    <div className="gba:space-y-4">
                      <Title level={5}>Task Assignments</Title>
                      <Text type="secondary" className="gba:block gba:mb-4">
                        Configure who should be assigned to each task in this workflow.
                      </Text>
                      
                      {executionAssignments.map((assignment, index) => (
                        <Card key={assignment.stepIndex} className="gba:border gba:border-gray-200">
                          <div className="gba:mb-3">
                            <Text strong className="gba:text-base">{assignment.stepTitle}</Text>
                            <div className="gba:mt-1">
                              <span className="gba:px-2 gba:py-1 gba:bg-blue-100 gba:text-blue-700 gba:rounded gba:text-xs">
                                {assignment.assignmentMode} Mode
                              </span>
                            </div>
                          </div>
                          
                          <div className="gba:mb-2">
                            <Text>Assign to users:</Text>
                          </div>
                          
                          <Select
                            mode="multiple"
                            placeholder="Select users for this task"
                            style={{ width: '100%' }}
                            value={assignment.assignedUsers}
                            onChange={(selectedUsers) => {
                              const updatedAssignments = [...executionAssignments];
                              updatedAssignments[index] = {
                                ...assignment,
                                assignedUsers: selectedUsers
                              };
                              setExecutionAssignments(updatedAssignments);
                            }}
                            data-testid={`${testId}-assignment-${assignment.stepIndex}`}
                          >
                                            {mockUsers.map(user => (
                  <Option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </Option>
                ))}
                          </Select>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Alert
                      message="No Assignment Required"
                      description="This template uses automatic assignment and doesn't require manual user assignment."
                      type="success"
                      showIcon
                    />
                  )}

                  <div className="gba:pt-4 gba:border-t gba:space-y-3">
                    {/* Temporarily disabled - Launch with Configuration Wizard */}
                    {/*
                    <Button
                      type="primary"
                      size="large"
                      icon={<SettingOutlined />}
                      onClick={handleLaunchWithWizard}
                      className="gba:w-full"
                      data-testid={`${testId}-launch-wizard-button`}
                    >
                      {getTranslationFromI18nKeyAndLabel('flow.launcher.launchWithWizard', 'Launch with Configuration Wizard')}
                    </Button>
                    */}
                    
                    <Button
                      type="primary"
                      size="large"
                      icon={<PlayCircleOutlined />}
                      onClick={handleDirectLaunch}
                      disabled={!canLaunch}
                      loading={isLaunching}
                      className="gba:w-full"
                      data-testid={`${testId}-direct-launch-button`}
                    >
                      {isLaunching 
                        ? getTranslationFromI18nKeyAndLabel('flow.launcher.launching', 'Launching...') 
                        : getTranslationFromI18nKeyAndLabel('flow.launcher.quickLaunch', 'Quick Launch')
                      }
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Execution Wizard Modal */}
        {selectedTemplate && (
          <Modal
            title={<h1 className="gba:text-lg gba:font-bold gba:text-gray-900 gba:mb-4">{getTranslationFromI18nKeyAndLabel('flow.launcher.configureExecution', 'Configure Execution')}</h1>}
            open={showExecutionWizard}
            onCancel={() => setShowExecutionWizard(false)}
            footer={null}
            width={1200}
            className="gba:execution-wizard-modal"
            data-testid={`${testId}-execution-wizard-modal`}
          >
            <ExecutionWizard
              template={selectedTemplate as any}
              onExecute={handleExecuteWorkflow}
              onCancel={() => setShowExecutionWizard(false)}
              data-testid={`${testId}-execution-wizard`}
            />
          </Modal>
        )}
      </div>
    </MockDataProvider>
  );
};

export default FlowLauncher; 