import React from 'react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useFlowTemplateStore } from '../../hooks/useFlowTemplateStore';
import { AssignmentSelector } from '../shared/AssignmentSelector';
import { ReminderConfig } from './ReminderConfig';
import { EscalationConfig } from './EscalationConfig';
import { TaskExecutionType } from '../../types/flowTemplate';
import { Input, Label, Textarea, RadioGroup, RadioGroupItem, Switch } from '@newwork/nw-design-system';

/**
 * General configuration section for the flow template
 */
export const GeneralConfigSection: React.FC = () => {
  const { 
    flowTemplate, 
    updateTitle, 
    updateDescription, 
    updateExecutionStrategy,
    updateFlowAssignment,
    isFlowLevelAssignmentEnabled,
    toggleFlowLevelAssignment
  } = useFlowTemplateStore();

  return (
    <div className="gba:space-y-6" data-testid="general-config-section">
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4" data-testid="general-config-header">
        <h2 className="gba:text-xl gba:font-semibold" data-testid="general-config-title">
          {getTranslationFromI18nKeyAndLabel('flow.creator.generalConfig', 'Flow Template Configuration')}
        </h2>
      </div>
      
      <div className="gba:space-y-8" data-testid="general-config-form">
        {/* Basic Details Section */}
        <div data-testid="basic-details-section">
          <h3 className="gba:text-lg gba:font-medium gba:mb-4">
            {getTranslationFromI18nKeyAndLabel('flow.creator.basicDetails', 'Basic Details')}
          </h3>
          <div className="gba:space-y-4">
            {/* Title */}
            <div className="gba:space-y-2" data-testid="general-config-title-field">
              <Label htmlFor="flow-title" className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('flow.creator.title', 'Title')}:
              </Label>
              <Input
                id="flow-title"
                value={flowTemplate.title}
                onChange={(e) => updateTitle(e.target.value)}
                className="gba:w-full"
                data-testid="general-config-title-input"
              />
            </div>
            
            {/* Description - full width */}
            <div className="gba:space-y-2" data-testid="general-config-description-field">
              <Label htmlFor="flow-description" className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('flow.creator.description', 'Description')}:
              </Label>
              <Textarea
                id="flow-description"
                value={flowTemplate.description}
                onChange={(e) => updateDescription(e.target.value)}
                className="gba:min-h-[120px] gba:w-full"
                data-testid="general-config-description-input"
              />
            </div>
          </div>
        </div>
        
        {/* Step Execution Section */}
        <div data-testid="step-execution-section">
          <h3 className="gba:text-lg gba:font-medium gba:mb-4">
            {getTranslationFromI18nKeyAndLabel('flow.creator.executionSettings', 'Execution Settings')}
          </h3>
          <div className="gba:space-y-4">
            {/* Step Execution */}
            <div className="gba:space-y-2" data-testid="step-execution-field">
              <Label className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('flow.creator.stepExecution', 'Step Execution')}:
              </Label>
              <p className="gba:text-sm gba:text-gray-600 gba:mb-3">
                {getTranslationFromI18nKeyAndLabel('flow.creator.stepExecutionDescription', 'Choose how steps are executed: Sequential (one after another) or Parallel (all at the same time).')}
              </p>
              <RadioGroup 
                defaultValue={flowTemplate.executionStrategy}
                className="gba:flex gba:gap-4" 
                data-testid="step-execution-options"
                onValueChange={(value) => updateExecutionStrategy(value as TaskExecutionType)}
              >
                <div className="gba:flex gba:flex-col gba:gap-3" data-testid="step-execution-options-container">
                  <div className="gba:flex gba:items-start gba:space-x-3" data-testid="step-execution-parallel">
                    <RadioGroupItem value={TaskExecutionType.PARALLEL} id="parallel" data-testid="step-execution-parallel-input" className="gba:mt-1" />
                    <div className="gba:flex gba:flex-col">
                      <Label htmlFor="parallel" className="gba:font-medium">
                        {getTranslationFromI18nKeyAndLabel('flow.creator.parallel', 'Parallel')}
                      </Label>
                      <p className="gba:text-sm gba:text-gray-600">
                        {getTranslationFromI18nKeyAndLabel('flow.creator.parallelDescription', 'All steps execute simultaneously')}
                      </p>
                    </div>
                  </div>
                  <div className="gba:flex gba:items-start gba:space-x-3" data-testid="step-execution-sequential">
                    <RadioGroupItem value={TaskExecutionType.SEQUENTIAL} id="sequential" data-testid="step-execution-sequential-input" className="gba:mt-1" />
                    <div className="gba:flex gba:flex-col">
                      <Label htmlFor="sequential" className="gba:font-medium">
                        {getTranslationFromI18nKeyAndLabel('flow.creator.sequential', 'Sequential')}
                      </Label>
                      <p className="gba:text-sm gba:text-gray-600">
                        {getTranslationFromI18nKeyAndLabel('flow.creator.sequentialDescription', 'Steps execute one after another in order')}
                      </p>
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
        </div>

        {/* Flow Assignment Section */}
        <div data-testid="flow-assignment-section">
          <h3 className="gba:text-lg gba:font-medium gba:mb-4">
            {getTranslationFromI18nKeyAndLabel('flow.creator.flowAssignment', 'Flow Assignment')}
          </h3>
          <div className="gba:space-y-4">
            {/* Flow-level assignment toggle */}
            <div className="gba:flex gba:items-center gba:gap-3" data-testid="flow-assignment-toggle">
              <Switch
                checked={isFlowLevelAssignmentEnabled}
                onCheckedChange={toggleFlowLevelAssignment}
                data-testid="flow-assignment-toggle-switch"
              />
              <div className="gba:flex gba:flex-col">
                <Label className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel('flow.creator.enableFlowAssignment', 'Enable Flow-Level Assignment')}
                </Label>
                <p className="gba:text-xs gba:text-gray-600">
                  {getTranslationFromI18nKeyAndLabel('flow.creator.flowAssignmentToggleDescription', 'When enabled, configure assignment for all steps at once. When disabled, configure assignment for each step individually.')}
                </p>
              </div>
            </div>

            {/* Flow assignment selector - only shown when toggle is enabled */}
            {isFlowLevelAssignmentEnabled && (
              <div className="gba:space-y-2" data-testid="flow-assignment-field">
                <Label className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel('flow.creator.assignmentNote', 'Configure assignment for all steps in this flow')}:
                </Label>
                <p className="gba:text-sm gba:text-gray-600 gba:mb-3">
                  {getTranslationFromI18nKeyAndLabel('flow.creator.flowAssignmentDescription', 'This assignment will be applied to all steps in the flow. Step-level assignments are disabled.')}
                </p>
                <div className="gba:flex gba:flex-col gba:gap-3">
                  <AssignmentSelector
                    value={flowTemplate.assignment}
                    onChange={updateFlowAssignment}
                    data-testid="flow-assignment-selector"
                  />
                  
                  {flowTemplate.assignment && flowTemplate.assignment.targets.length > 0 && (
                    <div className="gba:p-3 gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded" data-testid="flow-assignment-info">
                      <p className="gba:text-sm gba:text-blue-800">
                        {getTranslationFromI18nKeyAndLabel('flow.creator.flowAssignmentActive', 'Flow-level assignment is active. All steps will use this assignment configuration.')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Information when flow-level assignment is disabled */}
            {!isFlowLevelAssignmentEnabled && (
              <div className="gba:p-3 gba:bg-gray-50 gba:border gba:border-gray-200 gba:rounded" data-testid="step-assignment-info">
                <p className="gba:text-sm gba:text-gray-700">
                  {getTranslationFromI18nKeyAndLabel('flow.creator.stepAssignmentActive', 'Step-level assignments are active. Configure assignment for each step individually in the Steps section.')}
                </p>
              </div>
            )}
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
