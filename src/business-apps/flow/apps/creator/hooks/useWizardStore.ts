import { create } from 'zustand';
import { BusinessPattern, WizardState, WizardStep, PatternSelection } from '../types/businessPatterns';
import { FlowTemplate, FlowStep, FlowStepType, AssignmentMode } from '../types/flowTemplate';
import { validateTemplateAgainstPattern, ValidationResult } from '../utils/patternValidation';

interface WizardStore extends WizardState {
  // Pattern selection
  selectPattern: (pattern: BusinessPattern) => void;
  clearPattern: () => void;
  skipPattern: () => void; // NEW: Skip pattern selection
  
  // Configuration
  updateConfiguration: (key: string, value: any) => void;
  setConfiguration: (config: Record<string, any>) => void;
  
  // Navigation
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (stepIndex: number) => void;
  
  // Template generation with pattern defaults
  generateTemplate: () => FlowTemplate;
  applyPatternDefaults: (pattern: BusinessPattern) => void; // NEW: Apply smart defaults
  
  // Validation
  validateCurrentStep: () => boolean;
  validateTemplate: () => ValidationResult;
  
  // Mode management - NEW
  initializeForCreate: () => void;
  initializeForEdit: (template: FlowTemplate) => void;
  isEditMode: boolean;
  
  // Wizard management
  initializeWizard: () => void;
  resetWizard: () => void;
  completeWizard: () => PatternSelection;
}

// Wizard steps configuration - SIMPLIFIED SINGLE STEP
const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'complete-configuration',
    title: 'Create Workflow Template',
    description: 'Configure template details and workflow steps',
    component: 'CompleteConfigurationForm',
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
  isEditMode: false, // NEW
  
  // NEW: Skip pattern selection for custom workflows
  skipPattern: () => {
    set((state) => ({
      selectedPattern: undefined,
      configuration: {
        ...state.configuration,
        patternId: 'custom',
        customWorkflow: true
      },
      isValid: true,
      errors: {}
    }));
  },
  
  // NEW: Apply smart defaults from business patterns  
  applyPatternDefaults: (pattern: BusinessPattern) => {
    const defaultSteps = pattern.preConfiguredSteps.map((preStep, index) => ({
      id: `step-${index}`,
      title: preStep.title,
      message: preStep.description,
      type: preStep.type,
      inputs: preStep.inputs || [],
      links: preStep.links || [],
      // No default assignment - let users choose to add via toggle
      assignment: undefined
    }));
    
    set((state) => ({
      configuration: {
        ...state.configuration,
        steps: defaultSteps,
        title: state.configuration.title || `${pattern.title} Workflow`,
        description: state.configuration.description || pattern.description,
        // Apply pattern-specific defaults
        requiresAssignment: pattern.configuration.requiresAssignment,
        requiresDeadline: pattern.configuration.requiresDeadline,
        requiresEscalation: pattern.configuration.requiresEscalation
      }
    }));
  },
  
  // Enhanced pattern selection with defaults
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
    
    // Auto-apply pattern defaults
    get().applyPatternDefaults(pattern);
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
    
    // Use configured steps or pattern defaults
    const steps: FlowStep[] = configuration.steps || [];
    
    const template: FlowTemplate = {
      type: 'TEMPLATE',
      name: configuration.title || (selectedPattern ? `${selectedPattern.title} Workflow` : 'Custom Workflow'),
      description: configuration.description || (selectedPattern ? selectedPattern.description : ''),
      assignmentMode: configuration.assignmentMode || AssignmentMode.CLAIM,
      steps
    };
    
    return template;
  },
  
  // Validation
  validateCurrentStep: (): boolean => {
    const { currentStep, steps, selectedPattern, configuration, isEditMode } = get();
    const step = steps[currentStep];
    
    if (!step) return false;
    
    switch (step.id) {
      case 'complete-configuration':
        // Must have title and at least one step (pattern is optional)
        return !!(
          configuration.title && 
          configuration.title.trim().length > 0 &&
          configuration.steps && 
          configuration.steps.length > 0
        );
      
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
  
  // Mode management - NEW
  initializeForCreate: () => {
    set({
      ...initialState,
      isEditMode: false,
      currentStep: 0
    });
  },
  
  initializeForEdit: (template: FlowTemplate) => {
    set({
      ...initialState,
      isEditMode: true,
      currentStep: 0, // Single step wizard
      configuration: {
        title: template.name,
        description: template.description,
        steps: template.steps,
        patternId: 'custom' // Assume custom for existing templates
      },
      isValid: true
    });
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