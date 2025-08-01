import React, { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { FlowTemplateList } from './components/FlowTemplateList';
import { FlowWizardDialog } from './components/wizard/FlowWizardDialog';
import { useFlowTemplateStore } from './hooks/useFlowTemplateStore';
import { useWizardStore } from './hooks/useWizardStore';
import { useFlowTemplateClient } from '@/common/network/flows/useFlowTemplateClient';
import { FlowTemplate } from '@/common/network/flows/FlowTemplateClient';
import { Spin, Alert, Button, Card, Typography, Space } from 'antd';
import { MockDataProvider } from '../../providers/MockDataProvider';

/**
 * Flow Creator App component for defining workflow templates
 */
interface FlowCreatorProps extends BusinessAppContextProps {
  'data-testid'?: string;
}

export const FlowCreator: React.FC<FlowCreatorProps> = ({ 
  accessToken,
  userInfo,
  'data-testid': testId = 'flow-creator'
}) => {
  // API Integration
  const flowTemplateClient = useFlowTemplateClient(accessToken);
  
  // State management
  const [templates, setTemplates] = useState<FlowTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
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
    console.log('FlowCreator: accessToken =', accessToken ? 'PRESENT' : 'MISSING');
    if (accessToken) {
      console.log('FlowCreator: Making API call to load templates');
      loadTemplates();
    } else {
      console.log('FlowCreator: No accessToken, skipping API call');
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
    // Directly open wizard - no need for choice modal anymore
    resetTemplate();
    setSelectedTemplate(null);
    useWizardStore.getState().initializeForCreate();
    setIsWizardOpen(true);
  };

  // Removed handleWizardCreate and handleCustomCreate as they're no longer needed

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

  const handleDelete = async (template: FlowTemplate) => {
    if (!template.id) {
      throw new Error('Cannot delete template without ID');
    }

    try {
      await flowTemplateClient.deleteTemplate(template.id);
      // Reload templates to get updated list
      await loadTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      throw err;
    }
  };

  return (
    <MockDataProvider>
      <div className="gba:flex gba:flex-col gba:gap-6 gba:p-6" data-testid={testId}>
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-4" data-testid={`${testId}-header`}>
        <h1 className="gba:text-2xl gba:font-bold" data-testid={`${testId}-title`}>
          {getTranslationFromI18nKeyAndLabel('flow.creator.listTitle', 'Flow Definitions')}
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
          onDelete={handleDelete}
          data-testid={`${testId}-list`} 
        />
      )}
      
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
      </div>
    </MockDataProvider>
  );
};

export default FlowCreator;
