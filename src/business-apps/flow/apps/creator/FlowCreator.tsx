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
import { FlowTemplateList } from './components/FlowTemplateList';
import { FlowWizardDialog } from './components/wizard/FlowWizardDialog';
import { FlowTemplateForm } from './components/FlowTemplateForm';
import { useFlowTemplateStore } from './hooks/useFlowTemplateStore';
import { useWizardStore } from './hooks/useWizardStore';
import { useFlowTemplateClient } from '@/common/network/flows/useFlowTemplateClient';
import { FlowTemplate } from '@/common/network/flows/FlowTemplateClient';
import { Spin, Alert, Modal, Button, Card, Typography, Space } from 'antd';
import { StarOutlined, ToolOutlined } from '@ant-design/icons';
import { MockDataProvider } from '../../providers/MockDataProvider';

/**
 * Flow Creator App component for defining workflow templates
 */
export const FlowCreator: React.FC<BusinessAppContextProps> = ({ 
  accessToken,
  user,
  userInfo,
  employeeId,
  'data-testid': testId = 'flow-creator'
}) => {
  // API Integration
  const flowTemplateClient = useFlowTemplateClient(accessToken);
  
  // State management
  const [templates, setTemplates] = useState<FlowTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isCustomFormOpen, setIsCustomFormOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);
  const { resetTemplate, initializeTemplate } = useFlowTemplateStore();
  const { initializeWizard } = useWizardStore();

  // No conversion needed - using the same format everywhere!

  // Load templates from API
  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const templates = await flowTemplateClient.getTemplates();
      setTemplates(templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
      console.error('Error loading templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load templates on component mount
  useEffect(() => {
    if (accessToken) {
      loadTemplates();
    }
  }, [accessToken]);

  // Save template (create or update)
  const saveTemplate = async (template: FlowTemplate, isDraft: boolean = false) => {
    try {
      if (template.id) {
        // Update existing template
        await flowTemplateClient.updateTemplate(template.id, template);
      } else {
        // Create new template
        await flowTemplateClient.createTemplate(template);
      }
      
      // Reload templates to get updated list
      await loadTemplates();
    } catch (err) {
      console.error('Error saving template:', err);
      throw err;
    }
  };

  const handleCreateNew = () => {
    setIsCreateModalOpen(true);
  };

  const handleWizardCreate = () => {
    resetTemplate();
    setSelectedTemplate(null);
    useWizardStore.getState().initializeForCreate(); // Use new initialization method
    setIsCreateModalOpen(false);
    setIsWizardOpen(true);
  };

  const handleCustomCreate = () => {
    resetTemplate();
    setSelectedTemplate(null);
    setIsCreateModalOpen(false);
    setIsCustomFormOpen(true);
  };

  const handleEdit = async (template: FlowTemplate) => {
    try {
      // Try to get the template for better editing experience
      if (template.id) {
        const fullTemplate = await flowTemplateClient.getTemplate(template.id);
        useWizardStore.getState().initializeForEdit(fullTemplate); // Use new edit initialization
        setSelectedTemplate(fullTemplate);
      } else {
        useWizardStore.getState().initializeForEdit(template); // Use new edit initialization
        setSelectedTemplate(template);
      }
      setIsWizardOpen(true);
    } catch (error) {
      // Fallback to the current template if original is not available
      console.warn('Could not load original template, using current:', error);
      useWizardStore.getState().initializeForEdit(template); // Use new edit initialization
      setSelectedTemplate(template);
      setIsWizardOpen(true);
    }
  };

  return (
    <MockDataProvider>
      <div className="gba:flex gba:flex-col gba:gap-6 gba:p-6" data-testid={testId}>
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4" data-testid={`${testId}-header`}>
        <h1 className="gba:text-2xl gba:font-bold" data-testid={`${testId}-title`}>
          {getTranslationFromI18nKeyAndLabel('flow.creator.listTitle', 'Flow Templates')}
        </h1>
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
            <button
              onClick={loadTemplates}
              className="gba:px-4 gba:py-2 gba:bg-blue-500 gba:text-white gba:rounded gba:hover:bg-blue-600"
              data-testid={`${testId}-retry`}
            >
              Retry
            </button>
          }
          data-testid={`${testId}-error`}
        />
      ) : (
        <FlowTemplateList 
          templates={templates} 
          onCreateNew={handleCreateNew}
          onEdit={handleEdit}
          data-testid={`${testId}-list`} 
        />
      )}
      
      {/* Create Method Selection Modal */}
      <Modal
        title="Create New Workflow Template"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        footer={null}
        width={600}
        centered
      >
        <div className="gba:space-y-4">
          <Card 
            hoverable 
            onClick={handleWizardCreate}
            className="gba:cursor-pointer"
          >
            <div className="gba:flex gba:items-center gba:space-x-4">
              <StarOutlined className="gba:text-2xl gba:text-blue-500" />
              <div>
                <h3 className="gba:text-lg gba:font-semibold gba:mb-1">
                  Guided Wizard (Recommended)
                </h3>
                <p className="gba:text-gray-600">
                  Use pre-built business patterns to create workflows quickly with guided steps
                </p>
              </div>
            </div>
          </Card>
          
          <Card 
            hoverable 
            onClick={handleCustomCreate}
            className="gba:cursor-pointer"
          >
            <div className="gba:flex gba:items-center gba:space-x-4">
              <ToolOutlined className="gba:text-2xl gba:text-gray-500" />
              <div>
                <h3 className="gba:text-lg gba:font-semibold gba:mb-1">
                  Custom Template
                </h3>
                <p className="gba:text-gray-600">
                  Build a workflow from scratch with full control over every detail
                </p>
              </div>
            </div>
          </Card>
        </div>
      </Modal>

      {/* Wizard Dialog */}
      <FlowWizardDialog
        visible={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onComplete={async (template: any) => {
          await saveTemplate(template.template);
          setIsWizardOpen(false);
        }}
        data-testid={`${testId}-wizard-dialog`}
      />

             {/* Custom Form Dialog */}
       <Modal
         title="Create Custom Workflow Template"
         open={isCustomFormOpen}
         onCancel={() => setIsCustomFormOpen(false)}
         footer={null}
         width="90vw"
         style={{ maxWidth: '1200px' }}
         centered
         destroyOnClose
       >
         <div style={{ minHeight: '70vh', maxHeight: '80vh', overflow: 'auto' }}>
           <FlowTemplateForm 
             accessToken={accessToken}
             onSaved={async (template) => {
               await loadTemplates(); // Refresh the template list
               setIsCustomFormOpen(false); // Close the modal
             }}
           />
         </div>
       </Modal>
      </div>
    </MockDataProvider>
  );
};

export default FlowCreator;
