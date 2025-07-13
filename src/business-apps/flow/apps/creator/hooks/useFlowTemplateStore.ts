import { create } from 'zustand';
import { FlowTemplate, FlowStep, TaskAssignment, InputType, FlowStepType } from '../types/flowTemplate';

interface FlowTemplateState {
  flowTemplate: FlowTemplate;
  isValid: boolean;
  errors: Record<string, string>;
  isSaving: boolean;
  
  // General template actions
  updateTitle: (title: string) => void;
  updateDescription: (description: string) => void;
  initializeTemplate: (template: FlowTemplate) => void;
  
  // Step management actions
  addStep: () => void;
  removeStep: (stepIndex: number) => void;
  updateStep: (stepIndex: number, updates: Partial<FlowStep>) => void;
  reorderSteps: (newStepOrder: FlowStep[]) => void;
  
  // Template actions
  resetTemplate: () => void;
  saveTemplate: () => Promise<void>;
  validateTemplate: () => boolean;
}

// Initial empty step
const createEmptyStep = (): FlowStep => ({
  id: crypto.randomUUID(),
  title: '',
  message: '',
  links: [],
  inputs: [],
  type: FlowStepType.TASK
});

// Initial template state
const initialFlowTemplate: FlowTemplate = {
  type: 'TEMPLATE',
  name: '',
  description: '',
  steps: [createEmptyStep()]
};

export const useFlowTemplateStore = create<FlowTemplateState>((set, get) => ({
  flowTemplate: { ...initialFlowTemplate },
  isValid: false,
  errors: {},
  isSaving: false,
  
  // General template actions
  updateTitle: (title) => set((state) => ({ 
    flowTemplate: { ...state.flowTemplate, name: title } 
  })),
  
  updateDescription: (description) => set((state) => ({ 
    flowTemplate: { ...state.flowTemplate, description } 
  })),
  
  // Step management actions
  addStep: () => set((state) => {
    const newStep = createEmptyStep();
    return { 
      flowTemplate: { 
        ...state.flowTemplate, 
        steps: [...state.flowTemplate.steps, newStep] 
      } 
    };
  }),

  removeStep: (stepIndex) => set((state) => ({ 
    flowTemplate: { 
      ...state.flowTemplate, 
      steps: state.flowTemplate.steps.filter((_, index) => index !== stepIndex) 
    } 
  })),

  updateStep: (stepIndex, updates) => set((state) => ({ 
    flowTemplate: { 
      ...state.flowTemplate, 
      steps: state.flowTemplate.steps.map((step, index) => 
        index === stepIndex ? { ...step, ...updates } : step
      )
    } 
  })),

  reorderSteps: (newStepOrder) => set((state) => ({ 
    flowTemplate: { 
      ...state.flowTemplate, 
      steps: newStepOrder 
    } 
  })),
  
  // Template actions
  resetTemplate: () => set({ 
    flowTemplate: { ...initialFlowTemplate },
    isValid: false,
    errors: {},
  }),
  
  saveTemplate: async () => {
    const { flowTemplate, validateTemplate } = get();
    const isValid = validateTemplate();
    
    if (!isValid) {
      throw new Error('Template validation failed');
    }
    
    // Set saving state
    set({ isSaving: true });
    
    try {
      // TODO: Implement API call to save template
      console.log('Saving template:', flowTemplate);
      
      // Mock successful save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return;
    } finally {
      // Reset saving state
      set({ isSaving: false });
    }
  },
  
  initializeTemplate: (template) => {
    set({ 
      flowTemplate: { ...template },
      isValid: true,
      errors: {}
    });
  },
  
  validateTemplate: () => {
    const { flowTemplate } = get();
    const errors: Record<string, string> = {};
    
    // Basic validation
    if (!flowTemplate.name) {
      errors.title = 'Title is required';
    }
    
    if (!flowTemplate.description) {
      errors.description = 'Description is required';
    }
    
    if (flowTemplate.steps.length === 0) {
      errors.steps = 'At least one step is required';
    }
    
    // Step validation
    flowTemplate.steps.forEach((step, index) => {
      if (!step.title) {
        errors[`steps[${index}].title`] = 'Step title is required';
      }
      
      if (!step.message) {
        errors[`steps[${index}].message`] = 'Step message is required';
      }
    });
    
    set({ errors, isValid: Object.keys(errors).length === 0 });
    return Object.keys(errors).length === 0;
  },
}));
