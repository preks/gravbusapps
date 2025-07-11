import React, { useState } from 'react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { FlowStep, TaskExecutionType, StepType } from '../../types/flowTemplate';
import { useFlowTemplateStore } from '../../hooks/useFlowTemplateStore';
import { ContentBlocksList } from './content/ContentBlocksList';
import { InputBlocksList } from './input/InputBlocksList';
import { AssignmentSelector } from '../shared/AssignmentSelector';
import { Tabs, TabsList, TabsTrigger, TabsContent, Input, Label, Textarea } from '@newwork/nw-design-system';
import { Trash, CheckCircle, CheckSquare, Info, ClipboardList } from 'lucide-react';

interface StepItemProps {
  step: FlowStep;
  stepIndex: number;
  'data-testid'?: string;
}

/**
 * Individual step item component in the workflow
 */
export const StepItem: React.FC<StepItemProps> = ({ 
  step, 
  stepIndex,
  'data-testid': testId = 'step-item'
}) => {
  const { updateStep, removeStep, flowTemplate, isFlowLevelAssignmentEnabled } = useFlowTemplateStore();
  const [isExpanded, setIsExpanded] = useState(true);



  return (
    <div 
      className="gba:border gba:border-gray-200 gba:rounded gba:overflow-hidden" 
      data-testid={testId}
    >
      {/* Task Header */}
      <div 
        className="gba:flex gba:justify-between gba:items-center gba:bg-gray-50 gba:px-4 gba:py-3"
        data-testid={`${testId}-header`}
      >
        <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${testId}-title-section`}>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="gba:p-1 gba:bg-gray-200 gba:rounded gba:flex gba:items-center gba:justify-center gba:w-6 gba:h-6 gba:text-xs"
            data-testid={`${testId}-toggle-button`}
          >
            {isExpanded ? '▼' : '►'}
          </button>
          
          <div className={`gba:w-6 gba:h-6 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-bold gba:text-white ${flowTemplate.executionStrategy === TaskExecutionType.PARALLEL ? 'gba:bg-purple-500' : 'gba:bg-blue-500'}`} data-testid={`${testId}-step-number`}>
            {stepIndex + 1}
          </div>
          
          <h3 className="gba:font-medium" data-testid={`${testId}-index`}>
            {getTranslationFromI18nKeyAndLabel('flow.creator.step', 'Step')} {stepIndex + 1}
          </h3>
          {step.title && <span className="gba:text-gray-600">: {step.title}</span>}
          
          {flowTemplate.executionStrategy === TaskExecutionType.PARALLEL && (
            <div className="gba:ml-2 gba:px-2 gba:py-1 gba:bg-purple-100 gba:text-purple-700 gba:rounded gba:text-xs" data-testid={`${testId}-parallel-indicator`}>
              {getTranslationFromI18nKeyAndLabel('flow.creator.runsInParallel', 'Runs in parallel')}
            </div>
          )}
        </div>
        
        <button 
          onClick={() => removeStep(step.id)}
          className="gba:flex gba:items-center gba:gap-1 gba:text-red-500"
          data-testid={`${testId}-remove-button`}
        >
          {getTranslationFromI18nKeyAndLabel('flow.creator.removeStep', 'Remove')}
          <Trash className="gba:h-4 gba:w-4" data-testid={`${testId}-remove-icon`} />
        </button>
      </div>
      
      {isExpanded && (
        <div className="gba:p-4" data-testid={`${testId}-content`}>
          <div className="gba:w-full" data-testid={`${testId}-layout`}>
            <div className="gba:w-full" data-testid={`${testId}-config-area`}>
              <Tabs defaultValue="basic" className="gba:w-full" data-testid={`${testId}-tabs`}>
                <TabsList className="gba:mb-4" data-testid={`${testId}-tabs-list`}>
                  <TabsTrigger value="basic" data-testid={`${testId}-tab-basic`}>
                    {getTranslationFromI18nKeyAndLabel('flow.creator.basicInfo', 'Basic Info')}
                  </TabsTrigger>
                  <TabsTrigger value="content" data-testid={`${testId}-tab-content`}>
                    {getTranslationFromI18nKeyAndLabel('flow.creator.content', 'Content')}
                  </TabsTrigger>
                  <TabsTrigger value="input" data-testid={`${testId}-tab-input`}>
                    {getTranslationFromI18nKeyAndLabel('flow.creator.inputFields', 'Input Fields')}
                  </TabsTrigger>

                </TabsList>
                
                {/* Basic Info Tab */}
                <TabsContent value="basic" className="gba:space-y-4" data-testid={`${testId}-basic-content`}>
                  <div className="gba:grid gba:grid-cols-1 gba:gap-6" data-testid={`${testId}-basic-info`}>
                    {/* Task Type - Radio Inputs */}
                    <div className="gba:space-y-3" data-testid={`${testId}-type-field`}>
                      <Label className="gba:text-sm gba:font-medium" data-testid={`${testId}-type-label`}>
                        {getTranslationFromI18nKeyAndLabel('flow.creator.type', 'Step Type')}:
                      </Label>
                      <div className="gba:flex gba:flex-row gba:items-center gba:gap-8" data-testid={`${testId}-type-radio-group`}>
                        <label className="gba:flex gba:items-center gba:gap-2" data-testid={`${testId}-type-task`}>
                          <input
                            type="radio"
                            name={`type-${step.id}`}
                            value={StepType.TASK}
                            checked={step.type === StepType.TASK}
                            onChange={() => updateStep(step.id, { type: StepType.TASK })}
                            data-testid={`${testId}-type-radio-task`}
                          />
                          <span className="gba:flex gba:items-center gba:gap-2">
                            {getTranslationFromI18nKeyAndLabel('flow.creator.typeTask', 'Task')}
                            <ClipboardList className="gba:h-4 gba:w-4 gba:text-blue-500" data-testid={`${testId}-type-task-icon`} />
                          </span>
                        </label>
                        
                        <label className="gba:flex gba:items-center gba:gap-2" data-testid={`${testId}-type-approval`}>
                          <input
                            type="radio"
                            name={`type-${step.id}`}
                            value={StepType.APPROVAL}
                            checked={step.type === StepType.APPROVAL}
                            onChange={() => updateStep(step.id, { type: StepType.APPROVAL })}
                            data-testid={`${testId}-type-radio-approval`}
                          />
                          <span className="gba:flex gba:items-center gba:gap-2">
                            {getTranslationFromI18nKeyAndLabel('flow.creator.typeApproval', 'Approval')}
                            <CheckCircle className="gba:h-4 gba:w-4 gba:text-green-500" data-testid={`${testId}-type-approval-icon`} />
                          </span>
                        </label>
                        
                        <label className="gba:flex gba:items-center gba:gap-2" data-testid={`${testId}-type-acknowledge`}>
                          <input
                            type="radio"
                            name={`type-${step.id}`}
                            value={StepType.ACKNOWLEDGE}
                            checked={step.type === StepType.ACKNOWLEDGE}
                            onChange={() => updateStep(step.id, { type: StepType.ACKNOWLEDGE })}
                            data-testid={`${testId}-type-radio-acknowledge`}
                          />
                          <span className="gba:flex gba:items-center gba:gap-2">
                            {getTranslationFromI18nKeyAndLabel('flow.creator.typeAcknowledge', 'Acknowledge')}
                            <CheckSquare className="gba:h-4 gba:w-4 gba:text-purple-500" data-testid={`${testId}-type-acknowledge-icon`} />
                          </span>
                        </label>
                        
                        <label className="gba:flex gba:items-center gba:gap-2" data-testid={`${testId}-type-information`}>
                          <input
                            type="radio"
                            name={`type-${step.id}`}
                            value={StepType.INFORMATION}
                            checked={step.type === StepType.INFORMATION}
                            onChange={() => updateStep(step.id, { type: StepType.INFORMATION })}
                            data-testid={`${testId}-type-radio-information`}
                          />
                          <span className="gba:flex gba:items-center gba:gap-2">
                            {getTranslationFromI18nKeyAndLabel('flow.creator.typeInformation', 'Information')}
                            <Info className="gba:h-4 gba:w-4 gba:text-amber-500" data-testid={`${testId}-type-information-icon`} />
                          </span>
                        </label>
                      </div>
                    </div>
                    
                    {/* Title */}
                    <div className="gba:space-y-2" data-testid={`${testId}-title-field`}>
                      <Label htmlFor={`step-${step.id}-title`} data-testid={`${testId}-title-label`}>
                        {getTranslationFromI18nKeyAndLabel('flow.creator.title', 'Title')}:
                      </Label>
                      <Input
                        id={`step-${step.id}-title`}
                        value={step.title}
                        onChange={(e) => updateStep(step.id, { title: e.target.value })}
                        className="gba:w-full"
                        data-testid={`${testId}-title-input`}
                      />
                    </div>
                    
                    {/* Message */}
                    <div className="gba:space-y-2" data-testid={`${testId}-message-field`}>
                      <Label htmlFor={`step-${step.id}-message`} data-testid={`${testId}-message-label`}>
                        {getTranslationFromI18nKeyAndLabel('flow.creator.message', 'Message')}:
                      </Label>
                      <Textarea
                        id={`step-${step.id}-message`}
                        value={step.description}
                        onChange={(e) => updateStep(step.id, { description: e.target.value })}
                        className="gba:w-full gba:min-h-[100px]"
                        data-testid={`${testId}-message-input`}
                      />
                    </div>
                    
                    {/* Assignment Selector - Hidden when flow-level assignment is enabled */}
                    {!isFlowLevelAssignmentEnabled && (
                      <div className="gba:space-y-2" data-testid={`${testId}-basic-assignment-field`}>
                        <Label data-testid={`${testId}-basic-assignment-label`}>
                          {getTranslationFromI18nKeyAndLabel('flow.creator.assignment', 'Assignment')}:
                        </Label>
                        <AssignmentSelector
                          value={step.assignment}
                          onChange={(assignment) => {
                            updateStep(step.id, { assignment });
                          }}
                          data-testid={`${testId}-basic-assignment-selector`}
                        />
                      </div>
                    )}
                    
                    {/* Flow Assignment Override Message */}
                    {isFlowLevelAssignmentEnabled && (
                      <div className="gba:p-3 gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded" data-testid={`${testId}-flow-assignment-override`}>
                        <p className="gba:text-sm gba:text-blue-800">
                          {getTranslationFromI18nKeyAndLabel('flow.creator.stepAssignmentOverridden', 'Step assignment is controlled by flow-level assignment. Use the toggle in General Settings to enable step-level assignments.')}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                {/* Content Tab */}
                <TabsContent value="content" data-testid={`${testId}-content-tab-content`}>
                  <ContentBlocksList 
                    taskId={step.id} 
                    blocks={step.contentBlocks} 
                    data-testid={`${testId}-content-blocks`}
                  />
                </TabsContent>
                
                {/* Input Fields Tab */}
                <TabsContent value="input" data-testid={`${testId}-input-tab-content`}>
                  <InputBlocksList 
                    taskId={step.id} 
                    blocks={step.inputBlocks} 
                    data-testid={`${testId}-input-blocks`}
                  />
                </TabsContent>
                

              </Tabs>
            </div>
            

          </div>
        </div>
      )}
    </div>
  );
};
