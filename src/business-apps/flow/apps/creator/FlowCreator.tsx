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
import { FlowTemplate, TaskExecutionType, TimingType, TimeUnit, FlowStep, StepType } from './types/flowTemplate';
import { FlowTemplateList } from './components/FlowTemplateList';
import { FlowTemplateDialog } from './components/FlowTemplateDialog';
import { useFlowTemplateStore } from './hooks/useFlowTemplateStore';
import { useFlowTemplateClient } from '@/common/network/flows/useFlowTemplateClient';
import { FlowTemplate as ApiFlowTemplate } from '@/common/network/flows/FlowTemplateClient';
import { Spin, Alert } from 'antd';

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);
  const { resetTemplate, initializeTemplate } = useFlowTemplateStore();

  // No conversion needed - using the same format everywhere!

  // Load templates from API
  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const templates = await flowTemplateClient.getAllTemplates();
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
        await flowTemplateClient.updateTemplate(template.id, template, isDraft);
      } else {
        // Create new template
        await flowTemplateClient.createTemplate(template, isDraft);
      }
      
      // Reload templates to get updated list
      await loadTemplates();
    } catch (err) {
      console.error('Error saving template:', err);
      throw err;
    }
  };

  const handleCreateNew = () => {
    resetTemplate();
    setSelectedTemplate(null);
    setIsDialogOpen(true);
  };

  const handleEdit = async (template: FlowTemplate) => {
    try {
      // Try to get the original template for better editing experience
      if (template.id) {
        const originalTemplate = await flowTemplateClient.getOriginalTemplate(template.id);
        initializeTemplate(originalTemplate);
        setSelectedTemplate(originalTemplate);
      } else {
        initializeTemplate(template);
        setSelectedTemplate(template);
      }
      setIsDialogOpen(true);
    } catch (error) {
      // Fallback to the current template if original is not available
      console.warn('Could not load original template, using current:', error);
      initializeTemplate(template);
      setSelectedTemplate(template);
      setIsDialogOpen(true);
    }
  };

  return (
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
      
      <FlowTemplateDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        isEditing={!!selectedTemplate}
        onSave={saveTemplate}
        data-testid={`${testId}-dialog`}
      />
    </div>
  );
};

export default FlowCreator;
