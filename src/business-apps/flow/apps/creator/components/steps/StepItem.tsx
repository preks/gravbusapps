import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@newwork/nw-design-system';
import { Button } from '@newwork/nw-design-system';
import { Trash2, ChevronDown, ChevronUp, User } from 'lucide-react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useFlowTemplateStore } from '../../hooks/useFlowTemplateStore';

import { BasicConfiguration } from './BasicConfiguration';
import { AssignmentTrigger, AssignmentContent } from './AssignmentConfiguration';
import { LinksTrigger, LinksContent } from './LinksConfiguration';
import { InputFieldsTrigger, InputFieldsContent } from './InputFieldsConfiguration';

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
  const [isExpanded, setIsExpanded] = useState(stepIndex === 0); // First step always expanded
  const { removeStep, updateStep } = useFlowTemplateStore();
  
  const handleRemoveStep = useCallback(() => {
    removeStep(stepIndex);
  }, [removeStep, stepIndex]);

  const handleUpdateStep = useCallback((updates: any) => {
    updateStep(stepIndex, updates);
  }, [updateStep, stepIndex]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  return (
    <Card 
      className="gba:w-full gba:mb-4 gba:border gba:rounded-lg gba:shadow-sm"
      data-testid={testId}
    >
      <CardHeader className="gba:pb-2">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleExpanded}
              className="gba:p-1"
              data-testid={`${testId}-toggle`}
            >
              {isExpanded ? (
                <ChevronDown className="gba:h-4 gba:w-4" />
              ) : (
                <ChevronUp className="gba:h-4 gba:w-4" />
              )}
            </Button>
            <CardTitle className="gba:text-lg gba:font-medium gba:text-gray-800 gba:flex-1">
              {step.title || `${getTranslationFromI18nKeyAndLabel('flow.creator.step', 'Step')} ${stepIndex + 1}`}
            </CardTitle>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:text-gray-500 gba:capitalize">
              {step.type || 'task'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveStep}
              className="gba:text-red-500 gba:hover:text-red-700 gba:hover:bg-red-50"
              data-testid={`${testId}-remove`}
            >
              <Trash2 className="gba:h-4 gba:w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="gba:pt-0">
          <div className="gba:space-y-4">
            <Accordion type="multiple" defaultValue={["basic"]} className="gba:w-full" data-testid={`${testId}-accordion-${stepIndex}`}>
              
              {/* Basic Configuration */}
              <AccordionItem value="basic" data-testid={`${testId}-basic-accordion`}>
                <AccordionTrigger data-testid={`${testId}-basic-trigger`}>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <User className="gba:h-4 gba:w-4" />
                    {getTranslationFromI18nKeyAndLabel('flow.creator.basic', 'Basic Configuration')}
                  </div>
                </AccordionTrigger>
                <AccordionContent data-testid={`${testId}-basic-content`}>
                  <BasicConfiguration
                    step={step}
                    stepIndex={stepIndex}
                    testId={testId}
                    onUpdateStep={handleUpdateStep}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Links Configuration */}
              <AccordionItem value="links" data-testid={`${testId}-links-accordion`}>
                <AccordionTrigger data-testid={`${testId}-links-trigger`}>
                  <LinksTrigger
                    step={step}
                    testId={testId}
                    onUpdateStep={handleUpdateStep}
                  />
                </AccordionTrigger>
                <AccordionContent data-testid={`${testId}-links-content`}>
                  <LinksContent
                    step={step}
                    testId={testId}
                    onUpdateStep={handleUpdateStep}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Input Fields Configuration */}
              <AccordionItem value="inputs" data-testid={`${testId}-inputs-accordion`}>
                <AccordionTrigger data-testid={`${testId}-inputs-trigger`}>
                  <InputFieldsTrigger
                    step={step}
                    testId={testId}
                    onUpdateStep={handleUpdateStep}
                  />
                </AccordionTrigger>
                <AccordionContent data-testid={`${testId}-inputs-content`}>
                  <InputFieldsContent
                    step={step}
                    testId={testId}
                    onUpdateStep={handleUpdateStep}
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Assignment Configuration - Last section */}
              <AccordionItem value="assignment" data-testid={`${testId}-assignment-accordion`}>
                <AccordionTrigger data-testid={`${testId}-assignment-trigger`}>
                  <AssignmentTrigger
                    step={step}
                    testId={testId}
                    onUpdateStep={handleUpdateStep}
                  />
                </AccordionTrigger>
                <AccordionContent data-testid={`${testId}-assignment-content`}>
                  <AssignmentContent
                    step={step}
                    testId={testId}
                    onUpdateStep={handleUpdateStep}
                  />
                </AccordionContent>
              </AccordionItem>

            </Accordion>
          </div>
        </CardContent>
      )}
    </Card>
  );
};