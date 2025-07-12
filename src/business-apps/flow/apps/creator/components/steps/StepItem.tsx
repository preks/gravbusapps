import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system';
import { Button, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system';
import { Trash2, Settings, FileText, FormInput, User, ChevronDown, ChevronUp } from 'lucide-react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useFlowTemplateStore } from '../../hooks/useFlowTemplateStore';
import { AssignmentSelector } from '../shared/AssignmentSelector';
import { ContentBlocksList } from './content/ContentBlocksList';
import { InputBlocksList } from './input/InputBlocksList';
import { StepType } from '../../types/flowTemplate';

interface StepItemProps {
  step: any;
  stepIndex: number;
  'data-testid'?: string;
}

export const StepItem: React.FC<StepItemProps> = ({ 
  step, 
  stepIndex,
  'data-testid': testId = 'step-item'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { removeStep, updateStep } = useFlowTemplateStore();
  
  const handleRemoveStep = () => {
    removeStep(stepIndex);
  };

  const handleUpdateStep = (updates: any) => {
    updateStep(stepIndex, updates);
  };

  return (
    <Card className="gba:w-full" data-testid={`${testId}-${stepIndex}`}>
      <CardHeader className="gba:pb-3">
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:text-lg gba:font-medium gba:flex gba:items-center gba:gap-2">
            <span className="gba:bg-blue-100 gba:text-blue-800 gba:px-2 gba:py-1 gba:rounded gba:text-sm gba:font-medium">
              {stepIndex + 1}
            </span>
            {step.title || getTranslationFromI18nKeyAndLabel('flow.creator.untitledStep', 'Untitled Step')}
          </CardTitle>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid={`${testId}-toggle-${stepIndex}`}
            >
              {isExpanded ? <ChevronUp className="gba:h-4 gba:w-4" /> : <ChevronDown className="gba:h-4 gba:w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveStep}
              data-testid={`${testId}-remove-${stepIndex}`}
            >
              <Trash2 className="gba:h-4 gba:w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="gba:pt-0">
          <div className="gba:space-y-4">
            <Tabs defaultValue="basic" className="gba:w-full" data-testid={`${testId}-tabs-${stepIndex}`}>
              <TabsList className="gba:grid gba:w-full gba:grid-cols-3">
                <TabsTrigger value="basic" data-testid={`${testId}-basic-tab`}>
                  <User className="gba:h-4 gba:w-4 gba:mr-2" />
                  {getTranslationFromI18nKeyAndLabel('flow.creator.basic', 'Basic')}
                </TabsTrigger>
                <TabsTrigger value="content" data-testid={`${testId}-content-tab`}>
                  <FileText className="gba:h-4 gba:w-4 gba:mr-2" />
                  {getTranslationFromI18nKeyAndLabel('flow.creator.content', 'Content')}
                </TabsTrigger>
                <TabsTrigger value="input" data-testid={`${testId}-input-tab`}>
                  <FormInput className="gba:h-4 gba:w-4 gba:mr-2" />
                  {getTranslationFromI18nKeyAndLabel('flow.creator.input', 'Input')}
                </TabsTrigger>
              </TabsList>
              
              {/* Basic Tab */}
              <TabsContent value="basic" data-testid={`${testId}-basic-tab-content`}>
                <div className="gba:space-y-4">
                  <div className="gba:space-y-2" data-testid={`${testId}-title-field`}>
                    <Label htmlFor={`step-${stepIndex}-title`} data-testid={`${testId}-title-label`}>
                      {getTranslationFromI18nKeyAndLabel('flow.creator.stepTitle', 'Step Title')}:
                    </Label>
                    <Input
                      id={`step-${stepIndex}-title`}
                      value={step.title}
                      onChange={(e) => handleUpdateStep({ title: e.target.value })}
                      className="gba:w-full"
                      data-testid={`${testId}-title-input`}
                    />
                  </div>
                  
                  <div className="gba:space-y-2" data-testid={`${testId}-type-field`}>
                    <Label data-testid={`${testId}-type-label`}>
                      {getTranslationFromI18nKeyAndLabel('flow.creator.stepType', 'Step Type')}:
                    </Label>
                    <Select 
                      value={step.type} 
                      onValueChange={(value) => handleUpdateStep({ type: value })}
                      data-testid={`${testId}-type-select`}
                    >
                      <SelectTrigger className="gba:w-full">
                        <SelectValue placeholder={getTranslationFromI18nKeyAndLabel('flow.creator.selectStepType', 'Select step type')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={StepType.TASK}>
                          {getTranslationFromI18nKeyAndLabel('flow.creator.task', 'Task')}
                        </SelectItem>
                        <SelectItem value={StepType.APPROVAL}>
                          {getTranslationFromI18nKeyAndLabel('flow.creator.approval', 'Approval')}
                        </SelectItem>
                        <SelectItem value={StepType.INFORMATION}>
                          {getTranslationFromI18nKeyAndLabel('flow.creator.information', 'Information')}
                        </SelectItem>
                        <SelectItem value={StepType.ACKNOWLEDGE}>
                          {getTranslationFromI18nKeyAndLabel('flow.creator.acknowledge', 'Acknowledge')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="gba:space-y-2" data-testid={`${testId}-message-field`}>
                    <Label htmlFor={`step-${stepIndex}-message`} data-testid={`${testId}-message-label`}>
                      {getTranslationFromI18nKeyAndLabel('flow.creator.message', 'Message')}:
                    </Label>
                    <Textarea
                      id={`step-${stepIndex}-message`}
                      value={step.message || step.description}
                      onChange={(e) => handleUpdateStep({ message: e.target.value, description: e.target.value })}
                      className="gba:w-full gba:min-h-[100px]"
                      data-testid={`${testId}-message-input`}
                    />
                  </div>
                  
                  {/* Assignment Selector */}
                  <div className="gba:space-y-2" data-testid={`${testId}-assignment-field`}>
                    <Label data-testid={`${testId}-assignment-label`}>
                      {getTranslationFromI18nKeyAndLabel('flow.creator.assignment', 'Assignment')}:
                    </Label>
                    <AssignmentSelector
                      value={step.assignment}
                      onChange={(assignment) => handleUpdateStep({ assignment })}
                      data-testid={`${testId}-assignment-selector`}
                    />
                  </div>
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
        </CardContent>
      )}
    </Card>
  );
};
