import React, { useState, useEffect } from 'react';
import { Button, Space, Alert, Card } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { SimplifiedStep, StepType, InputBlockType } from '../../types/flowTemplate';
import { SimplifiedStepEditor } from './SimplifiedStepEditor';

interface SimplifiedStepConfigurationProps {
  steps: SimplifiedStep[];
  onStepsChange: (steps: SimplifiedStep[]) => void;
  'data-testid'?: string;
}

const createEmptyStep = (): SimplifiedStep => ({
  title: '',
  message: '',
  attachments: [],
  requestInput: {
    enabled: false,
    inputs: []
  },
  usePredefinedAssignment: {
    enabled: false,
    assignment: undefined
  },
  type: StepType.TASK
});

export const SimplifiedStepConfiguration: React.FC<SimplifiedStepConfigurationProps> = ({
  steps,
  onStepsChange,
  'data-testid': testId = 'simplified-step-configuration'
}) => {
  const [localSteps, setLocalSteps] = useState<SimplifiedStep[]>(steps);
  const [newlyCreatedSteps, setNewlyCreatedSteps] = useState<Set<number>>(new Set());

  // Auto-save when steps change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onStepsChange(localSteps);
    }, 500); // Debounce auto-save

    return () => clearTimeout(timeoutId);
  }, [localSteps, onStepsChange]);

  const addStep = () => {
    const newStep = createEmptyStep();
    newStep.title = `${getTranslationFromI18nKeyAndLabel('flow.creator.step', 'Step')} ${localSteps.length + 1}`;
    const newStepIndex = localSteps.length;
    setLocalSteps([...localSteps, newStep]);
    
    // Mark this step as newly created
    setNewlyCreatedSteps(prev => new Set([...prev, newStepIndex]));
    
    // Remove the "new" flag after a delay to allow the step to be rendered as expanded
    setTimeout(() => {
      setNewlyCreatedSteps(prev => {
        const newSet = new Set(prev);
        newSet.delete(newStepIndex);
        return newSet;
      });
    }, 1000);
  };

  const removeStep = (stepIndex: number) => {
    if (localSteps.length > 1) {
      setLocalSteps(localSteps.filter((_, index) => index !== stepIndex));
      // Update newly created steps indices
      setNewlyCreatedSteps(prev => {
        const newSet = new Set<number>();
        prev.forEach(index => {
          if (index < stepIndex) {
            newSet.add(index);
          } else if (index > stepIndex) {
            newSet.add(index - 1);
          }
        });
        return newSet;
      });
    }
  };

  const updateStep = (stepIndex: number, updatedStep: SimplifiedStep) => {
    const updatedSteps = [...localSteps];
    updatedSteps[stepIndex] = updatedStep;
    setLocalSteps(updatedSteps);
  };

  const moveStep = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= localSteps.length) return;
    
    const updatedSteps = [...localSteps];
    const [movedStep] = updatedSteps.splice(fromIndex, 1);
    updatedSteps.splice(toIndex, 0, movedStep);
    setLocalSteps(updatedSteps);
    
    // Update newly created steps indices
    setNewlyCreatedSteps(prev => {
      const newSet = new Set<number>();
      prev.forEach(index => {
        if (index === fromIndex) {
          newSet.add(toIndex);
        } else if (index === toIndex) {
          newSet.add(fromIndex);
        } else {
          newSet.add(index);
        }
      });
      return newSet;
    });
  };

  // Validation
  const validateSteps = () => {
    const errors: string[] = [];
    
    localSteps.forEach((step, index) => {
      if (!step.title.trim()) {
        errors.push(`${getTranslationFromI18nKeyAndLabel('flow.creator.step', 'Step')} ${index + 1}: ${getTranslationFromI18nKeyAndLabel('flow.creator.titleRequired', 'Title is required')}`);
      }
      
      if (step.requestInput.enabled && step.requestInput.inputs.length === 0) {
        errors.push(`${getTranslationFromI18nKeyAndLabel('flow.creator.step', 'Step')} ${index + 1}: ${getTranslationFromI18nKeyAndLabel('flow.creator.inputFieldsRequired', 'At least one input field is required when input is enabled')}`);
      }
      
      step.requestInput.inputs.forEach((input, inputIndex) => {
        if (!input.label.trim()) {
          errors.push(`${getTranslationFromI18nKeyAndLabel('flow.creator.step', 'Step')} ${index + 1}, ${getTranslationFromI18nKeyAndLabel('flow.creator.input', 'Input')} ${inputIndex + 1}: ${getTranslationFromI18nKeyAndLabel('flow.creator.labelRequired', 'Label is required')}`);
        }
      });
      
      step.attachments.forEach((attachment, attachmentIndex) => {
        if (!attachment.title.trim()) {
          errors.push(`${getTranslationFromI18nKeyAndLabel('flow.creator.step', 'Step')} ${index + 1}, ${getTranslationFromI18nKeyAndLabel('flow.creator.attachment', 'Attachment')} ${attachmentIndex + 1}: ${getTranslationFromI18nKeyAndLabel('flow.creator.titleRequired', 'Title is required')}`);
        }
        if (!attachment.url.trim()) {
          errors.push(`${getTranslationFromI18nKeyAndLabel('flow.creator.step', 'Step')} ${index + 1}, ${getTranslationFromI18nKeyAndLabel('flow.creator.attachment', 'Attachment')} ${attachmentIndex + 1}: ${getTranslationFromI18nKeyAndLabel('flow.creator.urlRequired', 'URL is required')}`);
        }
      });
    });
    
    return errors;
  };

  const validationErrors = validateSteps();
  const isValid = validationErrors.length === 0;

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between">
        <div>
          <h3 className="gba:text-lg gba:font-medium gba:mb-1">
            {getTranslationFromI18nKeyAndLabel('flow.creator.configureSteps', 'Configure Steps')}
          </h3>
          <p className="gba:text-sm gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel('flow.creator.stepConfigurationDescription', 'Define the steps in your workflow. Each step can have a message, attachments, input fields, and assignment configuration.')}
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={addStep}
          data-testid={`${testId}-add-step`}
        >
          {getTranslationFromI18nKeyAndLabel('flow.creator.addStep', 'Add Step')}
        </Button>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert
          type="error"
          message={getTranslationFromI18nKeyAndLabel('flow.creator.validationErrors', 'Validation Errors')}
          description={
            <ul className="gba:list-disc gba:list-inside gba:space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="gba:text-sm">{error}</li>
              ))}
            </ul>
          }
          data-testid={`${testId}-validation-errors`}
        />
      )}

      {/* Steps List */}
      <div className="gba:space-y-4" data-testid={`${testId}-steps-list`}>
        {localSteps.map((step, index) => (
          <div key={index} className="gba:relative">
            <SimplifiedStepEditor
              step={step}
              stepIndex={index}
              onStepChange={updateStep}
              isNewStep={newlyCreatedSteps.has(index)}
              data-testid={`${testId}-step-editor`}
            />
            
            {/* Step Actions */}
            <div className="gba:absolute gba:top-2 gba:right-2 gba:flex gba:gap-1">
              {index > 0 && (
                <Button
                  type="text"
                  size="small"
                  onClick={() => moveStep(index, index - 1)}
                  title={getTranslationFromI18nKeyAndLabel('flow.creator.moveUp', 'Move Up')}
                  data-testid={`${testId}-move-up-${index}`}
                >
                  ↑
                </Button>
              )}
              {index < localSteps.length - 1 && (
                <Button
                  type="text"
                  size="small"
                  onClick={() => moveStep(index, index + 1)}
                  title={getTranslationFromI18nKeyAndLabel('flow.creator.moveDown', 'Move Down')}
                  data-testid={`${testId}-move-down-${index}`}
                >
                  ↓
                </Button>
              )}
              {localSteps.length > 1 && (
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => removeStep(index)}
                  title={getTranslationFromI18nKeyAndLabel('flow.creator.removeStep', 'Remove Step')}
                  data-testid={`${testId}-remove-step-${index}`}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {localSteps.length === 0 && (
        <Card className="gba:text-center gba:py-8">
          <div className="gba:space-y-4">
            <div className="gba:text-gray-500">
              <PlusOutlined className="gba:text-4xl gba:mb-2" />
              <p className="gba:text-lg">
                {getTranslationFromI18nKeyAndLabel('flow.creator.noSteps', 'No steps defined yet')}
              </p>
              <p className="gba:text-sm">
                {getTranslationFromI18nKeyAndLabel('flow.creator.addFirstStep', 'Add your first step to get started')}
              </p>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={addStep}
              data-testid={`${testId}-add-first-step`}
            >
              {getTranslationFromI18nKeyAndLabel('flow.creator.addFirstStep', 'Add First Step')}
            </Button>
          </div>
        </Card>
      )}

      {/* Summary */}
      <Card className="gba:bg-gray-50">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:space-y-1">
            <p className="gba:text-sm gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('flow.creator.stepsSummary', 'Steps Summary')}
            </p>
            <p className="gba:text-xs gba:text-gray-600">
              {localSteps.length} {getTranslationFromI18nKeyAndLabel('flow.creator.steps', 'steps')} • 
              {localSteps.filter(s => s.requestInput.enabled).length} {getTranslationFromI18nKeyAndLabel('flow.creator.withInput', 'with input')} • 
              {localSteps.filter(s => s.usePredefinedAssignment.enabled).length} {getTranslationFromI18nKeyAndLabel('flow.creator.withAssignment', 'with predefined assignment')}
            </p>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            {isValid ? (
              <span className="gba:text-green-600 gba:text-sm gba:font-medium">
                ✓ {getTranslationFromI18nKeyAndLabel('flow.creator.valid', 'Valid')}
              </span>
            ) : (
              <span className="gba:text-red-600 gba:text-sm gba:font-medium">
                ✗ {validationErrors.length} {getTranslationFromI18nKeyAndLabel('flow.creator.errors', 'errors')}
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}; 