import React from 'react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useFlowTemplateStore } from '../../hooks/useFlowTemplateStore';
import { ReminderConfig } from './ReminderConfig';
import { EscalationConfig } from './EscalationConfig';
import { Input, Label, Textarea } from '@newwork/nw-design-system';

/**
 * General configuration section for the flow template
 */
export const GeneralConfigSection: React.FC = () => {
  const { 
    flowTemplate, 
    updateTitle, 
    updateDescription
  } = useFlowTemplateStore();

  return (
    <div className="gba:space-y-8" data-testid="general-config-section">
      <div className="gba:space-y-6">
        {/* Basic Information */}
        <div data-testid="basic-info-section">
          <h3 className="gba:text-lg gba:font-medium gba:mb-4">
            {getTranslationFromI18nKeyAndLabel('flow.creator.basicInformation', 'Basic Information')}
          </h3>
          <div className="gba:space-y-4">
            <div className="gba:space-y-2" data-testid="title-field">
              <Label htmlFor="flow-title" data-testid="title-label">
                {getTranslationFromI18nKeyAndLabel('flow.creator.title', 'Title')}:
              </Label>
              <Input
                id="flow-title"
                type="text"
                value={flowTemplate.title}
                onChange={(e) => updateTitle(e.target.value)}
                placeholder={getTranslationFromI18nKeyAndLabel('flow.creator.titlePlaceholder', 'Enter workflow title')}
                className="gba:w-full"
                data-testid="title-input"
              />
            </div>
            
            <div className="gba:space-y-2" data-testid="description-field">
              <Label htmlFor="flow-description" data-testid="description-label">
                {getTranslationFromI18nKeyAndLabel('flow.creator.description', 'Description')}:
              </Label>
              <Textarea
                id="flow-description"
                value={flowTemplate.description}
                onChange={(e) => updateDescription(e.target.value)}
                placeholder={getTranslationFromI18nKeyAndLabel('flow.creator.descriptionPlaceholder', 'Enter workflow description')}
                className="gba:w-full gba:min-h-[100px]"
                data-testid="description-input"
              />
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div data-testid="notifications-section">
          <h3 className="gba:text-lg gba:font-medium gba:mb-4">
            {getTranslationFromI18nKeyAndLabel('flow.creator.notifications', 'Notifications & Escalation')}
          </h3>
          <div className="gba:space-y-6">
            <ReminderConfig />
            <EscalationConfig />
          </div>
        </div>
      </div>
    </div>
  );
};
