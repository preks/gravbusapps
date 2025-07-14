import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system';
import { Progress } from '@newwork/nw-design-system';
import { Button } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { 
  Shield, 
  Megaphone, 
  Target, 
  MessageSquare, 
  FileText, 
  HandHeart,
  UserCheck,
  GitBranch,
  CheckSquare,
  LucideIcon
} from 'lucide-react';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { useWizardStore } from '../../hooks/useWizardStore';
import { PatternSelector } from './PatternSelector';
import { BasicInfoForm } from './BasicInfoForm';
import { FlowStepConfiguration } from './FlowStepConfiguration';
import { AdvancedSettings } from './AdvancedSettings';

interface FlowWizardProps {
  onComplete: (template: any) => void;
  onCancel: () => void;
  'data-testid'?: string;
}

// Icon mapping for patterns
const PATTERN_ICONS: Record<string, LucideIcon> = {
  'approval': Shield,
  'announcement': Megaphone,
  'goal-setting': Target,
  'feedback': MessageSquare,
  'document-review': FileText,
  'onboarding': HandHeart,
  'compliance': UserCheck,
  'decision': GitBranch,
  'task-management': CheckSquare
};

const renderIcon = (iconName: string) => {
  const IconComponent = PATTERN_ICONS[iconName];
  return IconComponent ? <IconComponent className="gba:w-5 gba:h-5" /> : null;
};

/**
 * Multi-step wizard for creating workflow templates
 */
export const FlowWizard: React.FC<FlowWizardProps> = ({
  onComplete,
  onCancel,
  'data-testid': testId = 'flow-wizard'
}) => {
  const { 
    currentStep, 
    nextStep, 
    previousStep, 
    selectedPattern,
    configuration,
    steps
  } = useWizardStore();

  const progress = ((currentStep + 1) / useWizardStore.getState().steps.length) * 100;
  const currentStepInfo = useWizardStore.getState().steps[currentStep];

  // Navigation helpers
  const canGoNext = currentStep < useWizardStore.getState().steps.length - 1;
  const canGoPrevious = currentStep > 0;

  // Validation logic for each step
  const validateCurrentStep = (): boolean => {
    switch (currentStepInfo.id) {
      case 'pattern-selection':
        return selectedPattern !== null;
      
      case 'basic-info':
        return !!(configuration.title && configuration.description);
      
      case 'step-configuration':
        return configuration.steps && configuration.steps.length > 0;
      
      case 'advanced-settings':
        return true; // Advanced settings are optional
      
      case 'review-preview':
        return true; // Review step is always valid
      
      default:
        return false;
    }
  };

  // Get validation message for current step
  const getValidationMessage = () => {
    switch (currentStepInfo.id) {
      case 'pattern-selection':
        return 'Please select a workflow pattern to continue.';
      
      case 'basic-info':
        if (!configuration.title) return 'Please enter a workflow title.';
        if (!configuration.description) return 'Please enter a workflow description.';
        return '';
      
      case 'step-configuration':
        if (!configuration.steps || configuration.steps.length === 0) return 'Please add at least one workflow step.';
        return '';
      
      default:
        return '';
    }
  };

  const handleComplete = () => {
    if (!validateCurrentStep()) return;
    
    const template = {
      pattern: selectedPattern,
      configuration,
      createdAt: new Date().toISOString()
    };
    
    onComplete(template);
  };

  const handleCancel = () => {
    onCancel();
  };

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
          <FlowStepConfiguration
            steps={configuration.steps || []}
            onStepsChange={(steps) => useWizardStore.getState().updateConfiguration('steps', steps)}
            data-testid={`${testId}-step-configuration`}
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
          <div className="gba:space-y-4" data-testid={`${testId}-review-preview`}>
            <h3 className="gba:text-lg gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('flow.creator.reviewPreview', 'Review & Preview')}
            </h3>
            <div className="gba:p-4 gba:bg-gray-50 gba:rounded">
              <pre className="gba:text-sm">{JSON.stringify(configuration, null, 2)}</pre>
            </div>
          </div>
        );
      
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="gba:mx-auto gba:p-6" data-testid={testId}>
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-3">
            {selectedPattern && renderIcon(selectedPattern.icon)}
            <span>
              {getTranslationFromI18nKeyAndLabel('flow.creator.createWorkflow', 'Create Workflow Template')}
            </span>
          </CardTitle>
          <div className="gba:mt-4">
            <Progress value={progress} className="gba:w-full" />
            <div className="gba:flex gba:justify-between gba:mt-2 gba:text-sm gba:text-gray-600">
              <span>{currentStepInfo.title}</span>
              <span>{currentStep + 1} of {steps.length}</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="gba:space-y-6">
          {renderCurrentStep()}
          
          {!validateCurrentStep() && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:bg-amber-50 gba:border gba:border-amber-200 gba:rounded">
              <ExclamationCircleOutlined className="gba:text-amber-600" />
              <span className="gba:text-sm gba:text-amber-800">
                {getValidationMessage()}
              </span>
            </div>
          )}
          
          <div className="gba:flex gba:justify-between gba:pt-4 gba:border-t">
            <Button
              onClick={handleCancel}
              data-testid={`${testId}-cancel-button`}
            >
              {getTranslationFromI18nKeyAndLabel('flow.creator.cancel', 'Cancel')}
            </Button>
            
            <div className="gba:flex gba:gap-2">
              {canGoPrevious && (
                <Button
                  onClick={previousStep}
                  data-testid={`${testId}-previous-button`}
                >
                  {getTranslationFromI18nKeyAndLabel('flow.creator.previous', 'Previous')}
                </Button>
              )}
              
              {canGoNext ? (
                <Button
                  type="primary"
                  onClick={nextStep}
                  disabled={!validateCurrentStep()}
                  data-testid={`${testId}-next-button`}
                >
                  {getTranslationFromI18nKeyAndLabel('flow.creator.next', 'Next')}
                </Button>
              ) : (
                <Button
                  type="primary"
                  onClick={handleComplete}
                  disabled={!validateCurrentStep()}
                  data-testid={`${testId}-complete-button`}
                >
                  {getTranslationFromI18nKeyAndLabel('flow.creator.complete', 'Complete')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 