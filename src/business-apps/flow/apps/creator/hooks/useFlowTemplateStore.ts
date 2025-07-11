import { create } from 'zustand';
import { FlowTemplate, FlowStep, TaskAssignment, InputBlockType, StepType, TaskExecutionType, TimingType, TimeUnit, ContentBlockType } from '../types/flowTemplate';

interface FlowTemplateState {
  flowTemplate: FlowTemplate;
  isValid: boolean;
  errors: Record<string, string>;
  isSaving: boolean;
  
  // Flow-level assignment toggle
  isFlowLevelAssignmentEnabled: boolean;
  
  // General template actions
  updateTitle: (title: string) => void;
  updateDescription: (description: string) => void;
  updateExecutionStrategy: (type: TaskExecutionType) => void;
  updateFlowAssignment: (assignment?: TaskAssignment) => void;
  toggleFlowLevelAssignment: (enabled: boolean) => void;
  initializeTemplate: (template: FlowTemplate) => void;
  
  // Reminder actions
  updateReminderTiming: (type: TimingType, value: number, unit: TimeUnit) => void;
  
  // Escalation actions
  updateEscalationTiming: (type: TimingType, value: number, unit: TimeUnit) => void;
  
  // Step management actions
  addStep: () => void;
  removeStep: (stepId: string) => void;
  updateStep: (stepId: string, updates: Partial<FlowStep>) => void;
  reorderSteps: (stepIds: string[]) => void;
  
  // Content and input block actions
  addContentBlock: (stepId: string, type: ContentBlockType) => void;
  removeContentBlock: (stepId: string, blockId: string) => void;
  updateContentBlock: (stepId: string, blockId: string, content: string) => void;
  updateContentBlockDescription: (stepId: string, blockId: string, description: string) => void;
  updateContentBlockRequired: (stepId: string, blockId: string, required: boolean) => void;
  
  addInputBlock: (stepId: string, type: InputBlockType) => void;
  removeInputBlock: (stepId: string, blockId: string) => void;
  updateInputBlock: (stepId: string, blockId: string, updates: any) => void;
  
  // Template actions
  resetTemplate: () => void;
  saveTemplate: () => Promise<void>;
  validateTemplate: () => boolean;
}

// Initial empty step
const createEmptyStep = (): FlowStep => ({
  id: `step-${Date.now()}`,
  title: '',
  description: '',
  type: StepType.TASK, // Default type is 'TASK'
  contentBlocks: [],
  inputBlocks: [],
  assignment: {
    targets: [],
    assignToAll: true,
    allowReassignment: true // Default to true for new steps
  },
});

// Initial template state
const initialFlowTemplate: FlowTemplate = {
  title: '',
  description: '',
  executionStrategy: TaskExecutionType.SEQUENTIAL,
  steps: [createEmptyStep()],
  flowType: 'TEMPLATE', // Default to TEMPLATE for new flows
};

export const useFlowTemplateStore = create<FlowTemplateState>((set, get) => ({
  flowTemplate: { ...initialFlowTemplate },
  isValid: false,
  errors: {},
  isSaving: false,
  
  // Flow-level assignment toggle
  isFlowLevelAssignmentEnabled: false,
  
  // General template actions
  updateTitle: (title) => set((state) => ({ 
    flowTemplate: { ...state.flowTemplate, title } 
  })),
  
  updateDescription: (description) => set((state) => ({ 
    flowTemplate: { ...state.flowTemplate, description } 
  })),
  
  updateExecutionStrategy: (executionStrategy) => set((state) => ({ 
    flowTemplate: { ...state.flowTemplate, executionStrategy } 
  })),
  
  updateFlowAssignment: (assignment) => set((state) => ({ 
    flowTemplate: { ...state.flowTemplate, assignment } 
  })),
  
  toggleFlowLevelAssignment: (enabled) => set((state) => {
    if (enabled) {
      // Enable flow-level assignment: clear all step-level assignments
      const stepsWithoutAssignment = state.flowTemplate.steps.map(step => ({
        ...step,
        assignment: undefined
      }));
      
      return {
        isFlowLevelAssignmentEnabled: true,
        flowTemplate: {
          ...state.flowTemplate,
          steps: stepsWithoutAssignment,
          assignment: state.flowTemplate.assignment || {
            targets: [],
            assignToAll: true,
            allowReassignment: true
          }
        }
      };
    } else {
      // Disable flow-level assignment: clear flow-level assignment, restore step-level assignments
      const stepsWithAssignment = state.flowTemplate.steps.map(step => ({
        ...step,
        assignment: step.assignment || {
          targets: [],
          assignToAll: true,
          allowReassignment: true
        }
      }));
      
      return {
        isFlowLevelAssignmentEnabled: false,
        flowTemplate: {
          ...state.flowTemplate,
          steps: stepsWithAssignment,
          assignment: undefined
        }
      };
    }
  }),
  

  
  // Reminder actions
  
  updateReminderTiming: (type, value, unit) => set((state) => {
    const currentReminder = state.flowTemplate.reminder || {
      timing: { type: TimingType.BEFORE, value: 24, unit: TimeUnit.HOURS }
    };
    
    return { 
      flowTemplate: { 
        ...state.flowTemplate, 
        reminder: {
          ...currentReminder,
          timing: { type, value, unit }
        }
      } 
    };
  }),
  
  // Escalation actions
  
  updateEscalationTiming: (type, value, unit) => set((state) => {
    const currentEscalation = state.flowTemplate.escalation || {
      timing: { type: TimingType.AFTER, value: 48, unit: TimeUnit.HOURS }
    };
    
    return { 
      flowTemplate: { 
        ...state.flowTemplate, 
        escalation: {
          ...currentEscalation,
          timing: { type, value, unit }
        }
      } 
    };
  }),
  

  
    // Step management actions
  addStep: () => set((state) => {
    const newStep = createEmptyStep();
    // Clear assignment if flow-level assignment is enabled
    if (state.isFlowLevelAssignmentEnabled) {
      newStep.assignment = undefined;
    }
    return { 
      flowTemplate: { 
        ...state.flowTemplate, 
        steps: [...state.flowTemplate.steps, newStep] 
      } 
    };
  }),

  removeStep: (stepId) => set((state) => ({ 
    flowTemplate: { 
      ...state.flowTemplate, 
      steps: state.flowTemplate.steps.filter(step => step.id !== stepId) 
    } 
  })),

  updateStep: (stepId, updates) => set((state) => ({ 
    flowTemplate: { 
      ...state.flowTemplate, 
      steps: state.flowTemplate.steps.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      )
    } 
  })),

  reorderSteps: (stepIds) => set((state) => {
    const stepMap = new Map(state.flowTemplate.steps.map(step => [step.id, step]));
    const reorderedSteps = stepIds
      .map(id => stepMap.get(id))
      .filter(Boolean) as FlowStep[];
      
    return { 
      flowTemplate: { 
        ...state.flowTemplate, 
        steps: reorderedSteps 
      } 
    };
  }),
  
    // Content and input block actions
  addContentBlock: (stepId, type) => set((state) => {
    const newBlock = {
      id: `content-${Date.now()}`,
      type,
      content: '',
      description: '', // Default empty description
      required: false, // Default not required
    };
    
    return { 
      flowTemplate: { 
        ...state.flowTemplate, 
        steps: state.flowTemplate.steps.map(step => 
          step.id === stepId 
            ? { ...step, contentBlocks: [...step.contentBlocks, newBlock] } 
            : step
        )
      } 
    };
  }),

  removeContentBlock: (stepId, blockId) => set((state) => ({ 
    flowTemplate: { 
      ...state.flowTemplate, 
      steps: state.flowTemplate.steps.map(step => 
        step.id === stepId 
          ? { 
              ...step, 
              contentBlocks: step.contentBlocks.filter(block => block.id !== blockId) 
            } 
          : step
      )
    } 
  })),

  updateContentBlock: (stepId, blockId, content) => set((state) => ({ 
    flowTemplate: { 
      ...state.flowTemplate, 
      steps: state.flowTemplate.steps.map(step => 
        step.id === stepId 
          ? {
              ...step,
              contentBlocks: step.contentBlocks.map(block =>
                block.id === blockId ? { ...block, content } : block
              )
            }
          : step
      )
    } 
  })),

  updateContentBlockDescription: (stepId, blockId, description) => set((state) => ({ 
    flowTemplate: { 
      ...state.flowTemplate, 
      steps: state.flowTemplate.steps.map(step => 
        step.id === stepId 
          ? {
              ...step,
              contentBlocks: step.contentBlocks.map(block =>
                block.id === blockId ? { ...block, description } : block
              )
            }
          : step
      )
    } 
  })),

  updateContentBlockRequired: (stepId, blockId, required) => set((state) => ({ 
    flowTemplate: { 
      ...state.flowTemplate, 
      steps: state.flowTemplate.steps.map(step => 
        step.id === stepId 
          ? {
              ...step,
              contentBlocks: step.contentBlocks.map(block =>
                block.id === blockId ? { ...block, required } : block
              )
            }
          : step
      )
    } 
  })),
  
  addInputBlock: (stepId, type) => set((state) => {
    const newBlock = {
      id: `input-${Date.now()}`,
      type,
      label: '',
      required: false,
      placeholder: '',
    };
    
    return { 
      flowTemplate: { 
        ...state.flowTemplate, 
        steps: state.flowTemplate.steps.map(step => 
          step.id === stepId 
            ? { ...step, inputBlocks: [...step.inputBlocks, newBlock] } 
            : step
        )
      } 
    };
  }),
  
  removeInputBlock: (stepId, blockId) => set((state) => ({ 
    flowTemplate: { 
      ...state.flowTemplate, 
      steps: state.flowTemplate.steps.map(step => 
        step.id === stepId 
          ? { 
              ...step, 
              inputBlocks: step.inputBlocks.filter(block => block.id !== blockId) 
            } 
          : step
      )
    } 
  })),
  
  updateInputBlock: (stepId, blockId, updates) => set((state) => ({ 
    flowTemplate: { 
      ...state.flowTemplate, 
      steps: state.flowTemplate.steps.map(step => 
        step.id === stepId 
          ? { 
              ...step, 
              inputBlocks: step.inputBlocks.map(block => 
                block.id === blockId ? { ...block, ...updates } : block
              ) 
            } 
          : step
      )
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
    if (!flowTemplate.title) {
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
      
      if (!step.description) {
        errors[`steps[${index}].description`] = 'Step description is required';
      }
    });
    
    set({ errors, isValid: Object.keys(errors).length === 0 });
    return Object.keys(errors).length === 0;
  },
}));
