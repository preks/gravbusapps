import React from 'react';
import { Card, CardContent } from '@newwork/nw-design-system';
import { Progress } from '@newwork/nw-design-system';
import { Button } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { AssignmentMode } from '../../types/flowTemplate';
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
import { TemplateSetupForm } from './TemplateSetupForm';
import { CompleteConfigurationForm } from './CompleteConfigurationForm';

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
    steps,
    isEditMode,
    generateTemplate
  } = useWizardStore();

  const progress = ((currentStep + 1) / useWizardStore.getState().steps.length) * 100;
  const currentStepInfo = useWizardStore.getState().steps[currentStep];

  // Navigation helpers
  const canGoNext = currentStep < useWizardStore.getState().steps.length - 1;
  const canGoPrevious = currentStep > 0;

  // Use wizard store validation
  const isValid = useWizardStore.getState().validateCurrentStep();

  // Get validation message
  const getValidationMessage = () => {
    if (!configuration.title || configuration.title.trim().length === 0) {
      return 'Please provide a flow title';
    }
    if (!configuration.steps || configuration.steps.length === 0) {
      return 'Please add at least one flow step';
    }
    return '';
  };

  const handleComplete = () => {
    if (!isValid) return;
    
    // Generate the actual FlowTemplate using the wizard store
    const flowTemplate = generateTemplate();
    
    const template = {
      template: flowTemplate,
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
      case 'complete-configuration':
        return (
          <CompleteConfigurationForm
            data-testid={`${testId}-complete-configuration`}
          />
        );
      
      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <div className="gba:mx-auto gba:p-6" data-testid={testId}>
      <Card>
        <CardContent className="gba:space-y-6">
          {renderCurrentStep()}
          
          {!isValid && (
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
              <Button
                type="primary"
                onClick={handleComplete}
                disabled={!isValid}
                data-testid={`${testId}-complete-button`}
              >
                {isEditMode 
                  ? getTranslationFromI18nKeyAndLabel('flow.creator.saveChanges', 'Save Changes')
                  : getTranslationFromI18nKeyAndLabel('flow.creator.complete', 'Create Flow')
                }
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 