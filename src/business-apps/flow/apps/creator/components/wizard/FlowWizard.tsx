import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { Button } from '@newwork/nw-design-system';
import { Progress } from '@newwork/nw-design-system';

import { ExclamationCircleOutlined } from '@ant-design/icons';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useWizardStore, useWizardNavigation, useWizardValidation } from '../../hooks/useWizardStore';
import { PatternSelector } from './PatternSelector';
import { BasicInfoForm } from './BasicInfoForm';
import { StepConfiguration } from './StepConfiguration';
import { AssignmentConfiguration } from './AssignmentConfiguration';
import { AdvancedSettings } from './AdvancedSettings';

interface FlowWizardProps {
  onComplete: (template: any) => void;
  onCancel: () => void;
  'data-testid'?: string;
}

/**
 * Multi-step wizard for creating flow templates based on business patterns
 */
export const FlowWizard: React.FC<FlowWizardProps> = ({
  onComplete,
  onCancel,
  'data-testid': testId = 'flow-wizard'
}) => {
  const { 
    selectedPattern, 
    generateTemplate, 
    completeWizard,
    initializeWizard,
    resetWizard,
    configuration
  } = useWizardStore();
  
  const {
    currentStep,
    currentStepInfo,
    canGoNext,
    canGoPrevious,
    progress,
    nextStep,
    previousStep
  } = useWizardNavigation();
  
  const {
    validateCurrentStep,
    validateTemplate,
    isValid
  } = useWizardValidation();

  // Get context-aware validation message
  const getValidationMessage = () => {
    const step = currentStepInfo;
    if (!step) return 'Please complete the current step before proceeding.';
    
    switch (step.id) {
      case 'pattern-selection':
        return 'Please select a business pattern to continue.';
      
      case 'basic-info':
        const missingFields = [];
        if (!configuration.title) missingFields.push('title');
        if (!configuration.description) missingFields.push('description');
        
        if (missingFields.length > 0) {
          return `Please provide a ${missingFields.join(' and ')} for your workflow.`;
        }
        return 'Please complete the basic information.';
      
      case 'step-configuration':
        if (!selectedPattern) return 'Please select a pattern first.';
        if (!configuration.steps || configuration.steps.length === 0) {
          return 'Please configure at least one workflow step.';
        }
        return 'Please complete the step configuration.';
      
      case 'assignment-configuration':
        return 'Please configure assignment rules for your workflow steps.';
      
      case 'advanced-settings':
        return 'Please review the advanced settings.';
      
      case 'review-preview':
        return 'Please review your workflow configuration. Some required fields may be missing.';
      
      default:
        return 'Please complete all required fields before proceeding.';
    }
  };

  // Handle wizard completion
  const handleComplete = () => {
    try {
      const template = generateTemplate();
      const patternSelection = completeWizard();
      
      onComplete({
        template,
        patternSelection
      });
    } catch (error) {
      console.error('Error completing wizard:', error);
    }
  };

  // Handle wizard cancellation
  const handleCancel = () => {
    if (window.confirm(getTranslationFromI18nKeyAndLabel('flow.wizard.cancelConfirm', 'Are you sure you want to cancel? All progress will be lost.'))) {
      resetWizard();
      onCancel();
    }
  };

  // Render current step component
  const renderCurrentStep = () => {
    switch (currentStepInfo.id) {
      case 'pattern-selection':
        return (
          <PatternSelector
            onNext={nextStep}
            data-testid={`${testId}-pattern-selector`}
          />
        );
      
      case 'basic-info':
        return (
          <BasicInfoForm
            data-testid={`${testId}-basic-info`}
          />
        );
      
      case 'step-configuration':
        return (
          <StepConfiguration
            onNext={nextStep}
            data-testid={`${testId}-step-config`}
          />
        );
      
      case 'assignment-configuration':
        return (
          <AssignmentConfiguration
            data-testid={`${testId}-assignment-configuration`}
          />
        );
      
      case 'advanced-settings':
        return (
          <AdvancedSettings
            data-testid={`${testId}-advanced-settings`}
          />
        );
      
      case 'review-preview':
        return (
          <div className="gba:space-y-6" data-testid={`${testId}-review-preview`}>
            <div className="gba:text-center gba:mb-6">
              <h3 className="gba:text-xl gba:font-semibold gba:mb-2">Review & Preview</h3>
              <p className="gba:text-gray-600">Review your workflow configuration before saving</p>
            </div>
            
            {selectedPattern && (
              <Card className="gba:bg-green-50 gba:border-green-200">
                <CardHeader>
                  <CardTitle className="gba:flex gba:items-center gba:space-x-2">
                    <span className="gba:text-xl">{selectedPattern.icon}</span>
                    <span>Ready to Create: {selectedPattern.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="gba:space-y-4">
                    <div>
                      <h4 className="gba:font-semibold gba:text-gray-900">Pattern</h4>
                      <p className="gba:text-gray-700">{selectedPattern.title} - {selectedPattern.description}</p>
                    </div>
                    
                    <div>
                      <h4 className="gba:font-semibold gba:text-gray-900">Configuration</h4>
                      <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:text-sm">
                        <div>
                          <span className="gba:font-medium">Execution:</span> {selectedPattern.configuration.executionStrategy}
                        </div>
                        <div>
                          <span className="gba:font-medium">Steps:</span> {selectedPattern.preConfiguredSteps.length}
                        </div>
                        <div>
                          <span className="gba:font-medium">Requires Assignment:</span> {selectedPattern.configuration.requiresAssignment ? 'Yes' : 'No'}
                        </div>
                        <div>
                          <span className="gba:font-medium">Requires Deadline:</span> {selectedPattern.configuration.requiresDeadline ? 'Yes' : 'No'}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      
      default:
        return (
          <div className="gba:text-center gba:py-12">
            <p className="gba:text-gray-600">Unknown step</p>
          </div>
        );
    }
  };

  return (
    <div className="gba:w-full" data-testid={testId}>
      {/* Header */}
      <div className="gba:mb-8 gba:px-6 gba:pt-6" data-testid={`${testId}-header`}>
        <h1 className="gba:text-3xl gba:font-bold gba:text-gray-900 gba:mb-2">
          {getTranslationFromI18nKeyAndLabel('flow.wizard.title', 'Create Workflow Template')}
        </h1>
        <p className="gba:text-gray-600 gba:text-lg">
          {getTranslationFromI18nKeyAndLabel('flow.wizard.subtitle', 'Follow the guided steps to create your workflow template')}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="gba:mb-8 gba:px-6" data-testid={`${testId}-progress`}>
        <div className="gba:flex gba:justify-between gba:items-center gba:mb-2">
          <span className="gba:text-sm gba:font-medium gba:text-gray-700">
            Step {currentStep + 1} of {useWizardStore.getState().steps.length}
          </span>
          <span className="gba:text-sm gba:text-gray-500">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <Progress value={progress} className="gba:w-full" />
      </div>

      {/* Step Navigation */}
      <div className="gba:mb-8 gba:px-6" data-testid={`${testId}-step-nav`}>
        <div className="gba:flex gba:space-x-4 gba:overflow-x-auto gba:pb-2">
          {useWizardStore.getState().steps.map((step, index) => (
            <div
              key={step.id}
              className={`gba:flex gba:items-center gba:space-x-2 gba:whitespace-nowrap gba:px-3 gba:py-2 gba:rounded-lg gba:border gba:transition-colors ${
                index === currentStep
                  ? 'gba:bg-blue-100 gba:border-blue-300 gba:text-blue-800'
                  : index < currentStep
                  ? 'gba:bg-green-100 gba:border-green-300 gba:text-green-800'
                  : 'gba:bg-gray-100 gba:border-gray-300 gba:text-gray-600'
              }`}
              data-testid={`${testId}-step-${index}`}
            >
              <div className={`gba:w-6 gba:h-6 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-medium ${
                index === currentStep
                  ? 'gba:bg-blue-500 gba:text-white'
                  : index < currentStep
                  ? 'gba:bg-green-500 gba:text-white'
                  : 'gba:bg-gray-400 gba:text-white'
              }`}>
                {index < currentStep ? '✓' : index + 1}
              </div>
              <span className="gba:font-medium">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Current Step Content */}
      <Card className="gba:mb-8 gba:mx-6" data-testid={`${testId}-content`}>
        <CardHeader>
          <CardTitle className="gba:text-xl">{currentStepInfo.title}</CardTitle>
          <p className="gba:text-gray-600">{currentStepInfo.description}</p>
        </CardHeader>
        <CardContent>
          {renderCurrentStep()}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="gba:flex gba:justify-between gba:items-center gba:px-6 gba:pb-6" data-testid={`${testId}-navigation`}>
        <div className="gba:flex gba:space-x-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            data-testid={`${testId}-cancel-button`}
          >
            {getTranslationFromI18nKeyAndLabel('flow.wizard.cancel', 'Cancel')}
          </Button>
          
          {canGoPrevious && (
            <Button
              variant="outline"
              onClick={previousStep}
              data-testid={`${testId}-previous-button`}
            >
              {getTranslationFromI18nKeyAndLabel('flow.wizard.previous', 'Previous')}
            </Button>
          )}
        </div>

        <div className="gba:flex gba:space-x-3">
          {canGoNext && (
            <Button
              onClick={nextStep}
              disabled={!validateCurrentStep()}
              data-testid={`${testId}-next-button`}
            >
              {getTranslationFromI18nKeyAndLabel('flow.wizard.next', 'Next')}
            </Button>
          )}
          
          {currentStep === useWizardStore.getState().steps.length - 1 && (
            <Button
              onClick={handleComplete}
              disabled={!validateCurrentStep()}
              className="gba:bg-green-600 gba:hover:bg-green-700"
              data-testid={`${testId}-complete-button`}
            >
              {getTranslationFromI18nKeyAndLabel('flow.wizard.complete', 'Create Template')}
            </Button>
          )}
        </div>
      </div>

      {/* Context-Aware Validation Warning */}
      {!validateCurrentStep() && (
        <div className="gba:px-6 gba:pb-6" data-testid={`${testId}-validation-warning`}>
          <div className="gba:flex gba:items-start gba:space-x-3 gba:p-4 gba:bg-amber-50 gba:border gba:border-amber-200 gba:rounded-lg">
            <ExclamationCircleOutlined className="gba:text-amber-600 gba:text-lg gba:mt-0.5 gba:flex-shrink-0" />
            <div className="gba:flex-1">
              <div className="gba:text-amber-800">
                <span className="gba:font-semibold">Action Required:</span> {getValidationMessage()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 