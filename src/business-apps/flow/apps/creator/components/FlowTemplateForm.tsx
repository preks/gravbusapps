import React from 'react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useFlowTemplateStore } from '../hooks/useFlowTemplateStore';
import { GeneralConfigSection } from './general-config/GeneralConfigSection';
import { StepsSection } from './steps/StepsSection';
import { JsonPreviewSection } from './advanced/JsonPreviewSection';
import { Tabs, TabsList, TabsTrigger, TabsContent, Card } from '@newwork/nw-design-system';

/**
 * Main form component for configuring a flow template
 */
export const FlowTemplateForm: React.FC = () => {
  // Using the hook to ensure we're connected to the store, but components handle their own state
  useFlowTemplateStore();

  return (
    <div className="gba:w-full" data-testid="flow-template-form">
      <Tabs defaultValue="general" className="gba:w-full" data-testid="flow-template-tabs">
        <TabsList className="gba:mb-6" data-testid="flow-template-tabs-list">
          <TabsTrigger value="general" data-testid="general-config-tab">
            {getTranslationFromI18nKeyAndLabel('flow.creator.generalTab', 'General Configuration')}
          </TabsTrigger>
          <TabsTrigger value="steps" data-testid="steps-tab">
            {getTranslationFromI18nKeyAndLabel('flow.creator.stepsTab', 'Steps')}
          </TabsTrigger>
          <TabsTrigger value="advanced" data-testid="advanced-tab">
            {getTranslationFromI18nKeyAndLabel('flow.creator.advancedTab', 'Advanced')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="gba:space-y-6" data-testid="general-config-content">
          <Card className="gba:p-6">
            <GeneralConfigSection />
          </Card>
        </TabsContent>
        
        <TabsContent value="steps" className="gba:space-y-6" data-testid="steps-content">
          <Card className="gba:p-6">
            <StepsSection />
          </Card>
        </TabsContent>
        
        <TabsContent value="advanced" className="gba:space-y-6" data-testid="advanced-content">
          <Card className="gba:p-6">
            <JsonPreviewSection />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

