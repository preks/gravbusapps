import { create } from 'zustand';
import { BusinessPattern, WizardState, WizardStep, PatternSelection } from '../types/businessPatterns';
import { FlowTemplate, SimplifiedStep, StepType, AssignmentMode } from '../types/flowTemplate';
import { PATTERN_BY_ID } from '../data/businessPatterns';
import { validateTemplateAgainstPattern, ValidationResult } from '../utils/patternValidation';

interface WizardStore extends WizardState {
  // Pattern selection
  selectPattern: (pattern: BusinessPattern) => void;
  clearPattern: () => void;
  
  // Configuration
  updateConfiguration: (key: string, value: any) => void;
  setConfiguration: (config: Record<string, any>) => void;
  
  // Navigation
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (stepIndex: number) => void;
  
  // Template generation
  generateTemplate: () => FlowTemplate;
  applyPatternToTemplate: (pattern: BusinessPattern) => FlowTemplate;
  
  // Validation
  validateCurrentStep: () => boolean;
  validateTemplate: () => ValidationResult;
  
  // Wizard management
  initializeWizard: () => void;
  resetWizard: () => void;
  completeWizard: () => PatternSelection;
}

// Wizard steps configuration
const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'pattern-selection',
    title: 'Select Pattern',
    description: 'Choose a business pattern for your workflow',
    component: 'PatternSelector',
    required: true,
    canSkip: false
  },
  {
    id: 'basic-info',
    title: 'Basic Information',
    description: 'Provide title and description for your workflow',
    component: 'BasicInfoForm',
    required: true,
    canSkip: false
  },
  {
    id: 'step-configuration',
    title: 'Configure Steps',
    description: 'Customize workflow steps and content',
    component: 'SimplifiedStepConfiguration',
    required: true,
    canSkip: false
  },
  {
    id: 'advanced-settings',
    title: 'Advanced Settings',
    description: 'Configure timing, escalation, and other advanced options',
    component: 'AdvancedSettings',
    required: false,
    canSkip: true
  },
  {
    id: 'review-preview',
    title: 'Review & Preview',
    description: 'Review your workflow configuration before saving',
    component: 'ReviewPreview',
    required: true,
    canSkip: false
  }
];

// Initial wizard state
const initialState: WizardState = {
  currentStep: 0,
  steps: WIZARD_STEPS,
  selectedPattern: undefined,
  configuration: {},
  isValid: false,
  errors: {}
};

export const useWizardStore = create<WizardStore>((set, get) => ({
  ...initialState,
  
  // Pattern selection
  selectPattern: (pattern: BusinessPattern) => {
    set((state) => {
      const newConfiguration = {
        ...state.configuration,
        patternId: pattern.id,
        requiresAssignment: pattern.configuration.requiresAssignment,
        requiresDeadline: pattern.configuration.requiresDeadline,
        requiresEscalation: pattern.configuration.requiresEscalation
      };
      
      return {
        selectedPattern: pattern,
        configuration: newConfiguration,
        isValid: get().validateCurrentStep(),
        errors: {}
      };
    });
  },
  
  clearPattern: () => {
    set((state) => ({
      selectedPattern: undefined,
      configuration: {},
      isValid: false,
      errors: {}
    }));
  },
  
  // Configuration
  updateConfiguration: (key: string, value: any) => {
    set((state) => ({
      configuration: {
        ...state.configuration,
        [key]: value
      }
    }));
  },
  
  setConfiguration: (config: Record<string, any>) => {
    set((state) => ({
      configuration: {
        ...state.configuration,
        ...config
      }
    }));
  },
  
  // Navigation
  nextStep: () => {
    const { currentStep, steps, validateCurrentStep } = get();
    
    if (validateCurrentStep() && currentStep < steps.length - 1) {
      set({ currentStep: currentStep + 1 });
    }
  },
  
  previousStep: () => {
    const { currentStep } = get();
    
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },
  
  goToStep: (stepIndex: number) => {
    const { steps } = get();
    
    if (stepIndex >= 0 && stepIndex < steps.length) {
      set({ currentStep: stepIndex });
    }
  },
  
  // Template generation
  generateTemplate: (): FlowTemplate => {
    const { selectedPattern, configuration } = get();
    
    if (!selectedPattern) {
      throw new Error('No pattern selected');
    }
    
    return get().applyPatternToTemplate(selectedPattern);
  },
  
  applyPatternToTemplate: (pattern: BusinessPattern): FlowTemplate => {
    const { configuration } = get();
    
    // Create steps from pattern's pre-configured steps
    const steps: SimplifiedStep[] = pattern.preConfiguredSteps.map((preStep, index) => ({
      title: preStep.title,
      message: preStep.description, // Use description as message
      attachments: [], // Start with empty attachments
      requestInput: {
        enabled: preStep.inputBlocks.length > 0,
        inputs: preStep.inputBlocks.map((block) => ({
          type: block.type,
          label: block.label,
          required: block.required,
          placeholder: block.placeholder,
          options: block.options?.map(opt => typeof opt === 'string' ? opt : opt.value)
        }))
      },
      usePredefinedAssignment: {
        enabled: preStep.assignmentRequired,
        assignment: preStep.assignmentRequired ? {
          targets: [],
          assignmentMode: preStep.assignmentType === 'all' ? AssignmentMode.ASSIGN : AssignmentMode.CLAIM,
          allowReassignment: true
        } : undefined
      },
      type: preStep.type
    }));
    
    // Apply configuration overrides
    if (configuration.customSteps) {
      // Allow custom step modifications
      configuration.customSteps.forEach((customStep: any, index: number) => {
        if (steps[index]) {
          steps[index] = { ...steps[index], ...customStep };
        }
      });
    }
    
    const template: FlowTemplate = {
      title: configuration.title || `${pattern.title} Workflow`,
      description: configuration.description || pattern.description,
      steps,
      flowType: 'TEMPLATE'
    };
    
    // Apply timing configurations
    if (configuration.reminder) {
      template.reminder = configuration.reminder;
    }
    
    if (configuration.escalation) {
      template.escalation = configuration.escalation;
    }
    
    return template;
  },
  
  // Validation
  validateCurrentStep: (): boolean => {
    const { currentStep, steps, selectedPattern, configuration } = get();
    const step = steps[currentStep];
    
    if (!step) return false;
    
    switch (step.id) {
      case 'pattern-selection':
        return !!selectedPattern;
      
      case 'basic-info':
        return !!(configuration.title && configuration.description);
      
      case 'step-configuration':
        if (!selectedPattern) return false;
        
        // Validate that steps are configured
        if (configuration.steps && configuration.steps.length > 0) {
          return true;
        }
        
        // If no steps in configuration yet, check if pattern has pre-configured steps
        // This allows the user to proceed with default pattern steps
        return !!(selectedPattern.preConfiguredSteps && selectedPattern.preConfiguredSteps.length > 0);
      
      case 'advanced-settings':
        // Advanced settings are optional
        return true;
      
      case 'review-preview':
        // Final validation
        try {
          const template = get().generateTemplate();
          const validation = get().validateTemplate();
          return validation.isValid;
        } catch {
          return false;
        }
      
      default:
        return true;
    }
  },
  
  validateTemplate: (): ValidationResult => {
    const { selectedPattern } = get();
    
    if (!selectedPattern) {
      return {
        isValid: false,
        errors: [{ field: 'pattern', message: 'No pattern selected', severity: 'error' }],
        warnings: []
      };
    }
    
    try {
      const template = get().generateTemplate();
      return validateTemplateAgainstPattern(template, selectedPattern);
    } catch (error) {
      return {
        isValid: false,
        errors: [{ 
          field: 'template', 
          message: error instanceof Error ? error.message : 'Template generation failed', 
          severity: 'error' 
        }],
        warnings: []
      };
    }
  },
  
  // Wizard management
  initializeWizard: () => {
    set({ ...initialState });
  },
  
  resetWizard: () => {
    set({ ...initialState });
  },
  
  completeWizard: (): PatternSelection => {
    const { selectedPattern, configuration, generateTemplate } = get();
    
    if (!selectedPattern) {
      throw new Error('No pattern selected');
    }
    
    const template = generateTemplate();
    
    return {
      pattern: selectedPattern,
      customizations: configuration,
      selectedSteps: selectedPattern.preConfiguredSteps
    };
  }
}));

// Utility functions for working with wizard state
export const useWizardNavigation = () => {
  const { currentStep, steps, nextStep, previousStep, goToStep } = useWizardStore();
  
  const canGoNext = currentStep < steps.length - 1;
  const canGoPrevious = currentStep > 0;
  const currentStepInfo = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  
  return {
    currentStep,
    currentStepInfo,
    canGoNext,
    canGoPrevious,
    progress,
    nextStep,
    previousStep,
    goToStep
  };
};

export const useWizardValidation = () => {
  const { validateCurrentStep, validateTemplate, isValid, errors } = useWizardStore();
  
  return {
    validateCurrentStep,
    validateTemplate,
    isValid,
    errors
  };
};

export const usePatternSelection = () => {
  const { selectedPattern, selectPattern, clearPattern } = useWizardStore();
  
  return {
    selectedPattern,
    selectPattern,
    clearPattern
  };
}; 