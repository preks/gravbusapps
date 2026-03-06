import React, { useCallback } from 'react'
import { Button, message } from 'antd'
import { FloppyDiskIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFlowTemplateStore } from '../hooks/useFlowTemplateStore'
import { useFlowTemplateClient } from '@/common/network/flows/useFlowTemplateClient'
import { GeneralConfigSection } from './general-config/GeneralConfigSection'
import { InitStepSection } from './general-config/InitStepSection'
import { StepsSection } from './steps/StepsSection'
import { JsonPreviewSection } from './advanced/JsonPreviewSection'
import { Tabs, TabsList, TabsTrigger, TabsContent, Card } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface FlowTemplateFormProps {
  accessToken: string
  context?: BusinessAppContextProps
  'data-testid'?: string
  onSaved?: (template: any) => void
}

/**
 * Main form component for configuring a flow template
 */
export const FlowTemplateForm: React.FC<FlowTemplateFormProps> = ({
  accessToken,
  context,
  'data-testid': testId = 'flow-template-form',
  onSaved
}) => {
  const { flowTemplate, isSaving, isValid } = useFlowTemplateStore()

  // Get the client for API calls
  const flowTemplateClient = useFlowTemplateClient(accessToken)

  const handleSaveDraft = useCallback(async () => {
    try {
      // Call the API directly with the client
      const templateData = {
        ...flowTemplate,
        type: 'TEMPLATE' as const
      }
      // Update when editing existing template, otherwise create new
      let savedTemplate
      if (flowTemplate.id) {
        savedTemplate = await flowTemplateClient.updateTemplate(flowTemplate.id, templateData)
      } else {
        const createPayload: any = { ...templateData }
        delete createPayload.id
        savedTemplate = await flowTemplateClient.createTemplate(createPayload)
      }
      message.success('Definition saved as draft successfully!')

      if (onSaved) {
        onSaved(savedTemplate)
      }
    } catch (error) {
      console.error('Error saving definition as draft:', error)
      message.error('Failed to save definition as draft')
    }
  }, [flowTemplate, flowTemplateClient, onSaved])

  const handlePublish = useCallback(async () => {
    try {
      // Call the API directly with the client
      const templateData = {
        ...flowTemplate,
        type: 'TEMPLATE' as const
      }
      // Update when editing existing template, otherwise create new
      let publishedTemplate
      if (flowTemplate.id) {
        publishedTemplate = await flowTemplateClient.updateTemplate(flowTemplate.id, templateData)
      } else {
        const createPayload: any = { ...templateData }
        delete createPayload.id
        publishedTemplate = await flowTemplateClient.createTemplate(createPayload)
      }
      message.success('Definition published successfully!')

      if (onSaved) {
        onSaved(publishedTemplate)
      }
    } catch (error) {
      console.error('Error publishing definition:', error)
      message.error('Failed to publish definition')
    }
  }, [flowTemplate, flowTemplateClient, onSaved])

  return (
    <div className="gba:w-full" data-testid={testId}>
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

          {/* Init Step Section - only shown for SELF_SERVICE flows */}
          <InitStepSection />
        </TabsContent>

        <TabsContent value="steps" className="gba:space-y-6" data-testid="steps-content">
          <Card className="gba:p-6">
            <StepsSection accessToken={accessToken} context={context} />
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="gba:space-y-6" data-testid="advanced-content">
          <Card className="gba:p-6">
            <JsonPreviewSection />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save/Publish Actions */}
      <div
        className="gba:flex gba:justify-end gba:gap-4 gba:mt-8 gba:pt-6 gba:border-t gba:border-gray-200"
        data-testid="form-actions"
      >
        <Button icon={<FloppyDiskIcon size={16} />} onClick={handleSaveDraft} loading={isSaving} data-testid="save-draft-button">
          {getTranslationFromI18nKeyAndLabel('flow.creator.saveDraft', 'Save Draft')}
        </Button>

        <Button
          type="primary"
          icon={<PaperPlaneTiltIcon size={16} />}
          onClick={handlePublish}
          loading={isSaving}
          disabled={!isValid}
          data-testid="publish-button"
        >
          {getTranslationFromI18nKeyAndLabel('flow.creator.publish', 'Publish')}
        </Button>
      </div>
    </div>
  )
}
