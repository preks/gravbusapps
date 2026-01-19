import { create } from 'zustand'
import {
  FlowTemplateClient,
  FlowTemplate,
  FlowStep,
  TaskAssignment,
  FlowStepType,
  InputBlock,
  AssignmentMode,
  InitStep
} from '@/common/network/flows/FlowTemplateClient'

interface FlowTemplateState {
  flowTemplate: FlowTemplate
  isValid: boolean
  errors: Record<string, string>
  isSaving: boolean

  // General template actions
  updateTitle: (title: string) => void
  updateDescription: (description: string) => void
  updateAssignmentMode: (assignmentMode: AssignmentMode) => void
  updateType: (type: 'TEMPLATE' | 'SELF_SERVICE') => void
  initializeTemplate: (template: FlowTemplate) => void
  resetTemplate: () => void

  // Self-service specific actions
  updateInitStep: (initStep: InitStep) => void
  updateInitStepTitle: (title: string) => void
  updateInitStepMessage: (message: string) => void
  addInitStepInput: (input: InputBlock) => void
  removeInitStepInput: (index: number) => void
  updateInitStepInput: (index: number, input: InputBlock) => void

  // Step management actions
  addStep: () => void
  removeStep: (stepIndex: number) => void
  updateStep: (stepIndex: number, updates: Partial<FlowStep>) => void
  moveStep: (fromIndex: number, toIndex: number) => void

  // Input management actions
  addInput: (stepIndex: number, input: InputBlock) => void
  removeInput: (stepIndex: number, inputIndex: number) => void
  updateInput: (stepIndex: number, inputIndex: number, input: InputBlock) => void

  // Assignment management actions
  updateAssignment: (stepIndex: number, assignment: TaskAssignment) => void

  // Validation
  validateTemplate: () => boolean

  // API actions
  saveTemplate: (client: FlowTemplateClient) => Promise<void>
  publishTemplate: (client: FlowTemplateClient) => Promise<void>
}

const createEmptyStep = (): FlowStep => ({
  id: `step-${Date.now()}`,
  title: 'New Step',
  message: '',
  type: FlowStepType.TASK,
  kind: 'USER',
  inputs: [],
  links: [],
  assignment: {
    targets: null,
    assignmentMode: AssignmentMode.CLAIM,
    allowReassignment: true
  }
})

const createEmptyTemplate = (): FlowTemplate => ({
  type: 'TEMPLATE',
  name: 'New Flow Template',
  description: '',
  version: 1,
  steps: [createEmptyStep()]
})

const createEmptyInitStep = (): InitStep => ({
  title: 'Initialize Flow',
  message: '',
  links: [],
  inputs: []
})

export const useFlowTemplateStore = create<FlowTemplateState>((set, get) => ({
  flowTemplate: createEmptyTemplate(),
  isValid: false,
  errors: {},
  isSaving: false,

  // General template actions
  updateTitle: (title: string) => {
    set(state => ({
      flowTemplate: { ...state.flowTemplate, name: title }
    }))
  },

  updateDescription: (description: string) => {
    set(state => ({
      flowTemplate: { ...state.flowTemplate, description }
    }))
  },

  updateAssignmentMode: (assignmentMode: AssignmentMode) => {
    set(state => ({
      flowTemplate: { ...state.flowTemplate, assignmentMode }
    }))
  },

  updateType: (type: 'TEMPLATE' | 'SELF_SERVICE') => {
    set(state => ({
      flowTemplate: {
        ...state.flowTemplate,
        type,
        // Add empty initStep if switching to SELF_SERVICE
        initStep: type === 'SELF_SERVICE' ? state.flowTemplate.initStep || createEmptyInitStep() : undefined
      }
    }))
  },

  initializeTemplate: (template: FlowTemplate) => {
    // Normalize template to ensure all required arrays exist
    const normalizedTemplate = {
      ...template,
      steps: (template.steps || []).map(step => ({
        ...step,
        inputs: (step.inputs || step.form || []).map((input: any) => ({
          ...input,
          options: input.options || [] // Ensure options array always exists
        })),
        form: (step.form || step.inputs || []).map((input: any) => ({
          ...input,
          options: input.options || [] // Ensure options array always exists
        })),
        links: step.links || [],
        // Ensure assignment exists with proper structure - always provide valid assignment
        assignment: step.assignment || {
          targets: null,
          assignmentMode: AssignmentMode.CLAIM,
          allowReassignment: true
        }
      }))
    }
    set({ flowTemplate: normalizedTemplate })
  },

  resetTemplate: () => {
    set({
      flowTemplate: createEmptyTemplate(),
      isValid: false,
      errors: {},
      isSaving: false
    })
  },

  // Self-service specific actions
  updateInitStep: (initStep: InitStep) => {
    set(state => ({
      flowTemplate: { ...state.flowTemplate, initStep }
    }))
  },

  updateInitStepTitle: (title: string) => {
    set(state => ({
      flowTemplate: {
        ...state.flowTemplate,
        initStep: state.flowTemplate.initStep ? { ...state.flowTemplate.initStep, title } : createEmptyInitStep()
      }
    }))
  },

  updateInitStepMessage: (message: string) => {
    set(state => ({
      flowTemplate: {
        ...state.flowTemplate,
        initStep: state.flowTemplate.initStep ? { ...state.flowTemplate.initStep, message } : createEmptyInitStep()
      }
    }))
  },

  addInitStepInput: (input: InputBlock) => {
    set(state => {
      const initStep = state.flowTemplate.initStep || createEmptyInitStep()
      return {
        flowTemplate: {
          ...state.flowTemplate,
          initStep: {
            ...initStep,
            inputs: [...(initStep.inputs || []), input]
          }
        }
      }
    })
  },

  removeInitStepInput: (index: number) => {
    set(state => {
      const initStep = state.flowTemplate.initStep
      if (!initStep || !initStep.inputs) return state

      return {
        flowTemplate: {
          ...state.flowTemplate,
          initStep: {
            ...initStep,
            inputs: initStep.inputs.filter((_, i) => i !== index)
          }
        }
      }
    })
  },

  updateInitStepInput: (index: number, input: InputBlock) => {
    set(state => {
      const initStep = state.flowTemplate.initStep
      if (!initStep || !initStep.inputs) return state

      return {
        flowTemplate: {
          ...state.flowTemplate,
          initStep: {
            ...initStep,
            inputs: initStep.inputs.map((existing, i) => (i === index ? input : existing))
          }
        }
      }
    })
  },

  // Step management actions
  addStep: () => {
    set(state => ({
      flowTemplate: {
        ...state.flowTemplate,
        steps: [...state.flowTemplate.steps, createEmptyStep()]
      }
    }))
  },

  removeStep: (stepIndex: number) => {
    set(state => ({
      flowTemplate: {
        ...state.flowTemplate,
        steps: state.flowTemplate.steps.filter((_, index) => index !== stepIndex)
      }
    }))
  },

  updateStep: (stepIndex: number, updates: Partial<FlowStep>) => {
    set(state => ({
      flowTemplate: {
        ...state.flowTemplate,
        steps: state.flowTemplate.steps.map((step, index) => (index === stepIndex ? { ...step, ...updates } : step))
      }
    }))
  },

  moveStep: (fromIndex: number, toIndex: number) => {
    set(state => {
      const steps = [...state.flowTemplate.steps]
      const [movedStep] = steps.splice(fromIndex, 1)
      steps.splice(toIndex, 0, movedStep)

      return {
        flowTemplate: {
          ...state.flowTemplate,
          steps
        }
      }
    })
  },

  // Input management actions
  addInput: (stepIndex: number, input: InputBlock) => {
    set(state => ({
      flowTemplate: {
        ...state.flowTemplate,
        steps: state.flowTemplate.steps.map((step, index) =>
          index === stepIndex ? { ...step, inputs: [...(step.inputs || []), input] } : step
        )
      }
    }))
  },

  removeInput: (stepIndex: number, inputIndex: number) => {
    set(state => ({
      flowTemplate: {
        ...state.flowTemplate,
        steps: state.flowTemplate.steps.map((step, index) =>
          index === stepIndex ? { ...step, inputs: step.inputs?.filter((_, i) => i !== inputIndex) || [] } : step
        )
      }
    }))
  },

  updateInput: (stepIndex: number, inputIndex: number, input: InputBlock) => {
    set(state => ({
      flowTemplate: {
        ...state.flowTemplate,
        steps: state.flowTemplate.steps.map((step, index) =>
          index === stepIndex
            ? {
                ...step,
                inputs: step.inputs?.map((existing, i) => (i === inputIndex ? input : existing)) || []
              }
            : step
        )
      }
    }))
  },

  // Assignment management actions
  updateAssignment: (stepIndex: number, assignment: TaskAssignment) => {
    set(state => ({
      flowTemplate: {
        ...state.flowTemplate,
        steps: state.flowTemplate.steps.map((step, index) => (index === stepIndex ? { ...step, assignment } : step))
      }
    }))
  },

  // Validation
  validateTemplate: () => {
    const { flowTemplate } = get()
    const errors: Record<string, string> = {}

    // Basic validation
    if (!flowTemplate.name.trim()) {
      errors.name = 'Template name is required'
    }

    if (flowTemplate.steps.length === 0) {
      errors.steps = 'At least one step is required'
    }

    // Self-service validation
    if (flowTemplate.type === 'SELF_SERVICE') {
      if (!flowTemplate.initStep?.title?.trim()) {
        errors.initStepTitle = 'Init step title is required for self-service flows'
      }
    }

    // Step validation
    flowTemplate.steps.forEach((step, index) => {
      if (!step.title.trim()) {
        errors[`step-${index}-title`] = `Step ${index + 1} title is required`
      }
    })

    const isValid = Object.keys(errors).length === 0

    set({ errors, isValid })
    return isValid
  },

  // API actions
  saveTemplate: async (client: FlowTemplateClient) => {
    set({ isSaving: true })
    try {
      const { flowTemplate } = get()

      if (!get().validateTemplate()) {
        throw new Error('Template validation failed')
      }

      if (flowTemplate.id) {
        await client.updateTemplate(flowTemplate.id, flowTemplate)
      } else {
        const savedTemplate = await client.createTemplate(flowTemplate)
        set(state => ({
          flowTemplate: { ...state.flowTemplate, id: savedTemplate.id }
        }))
      }
    } finally {
      set({ isSaving: false })
    }
  },

  publishTemplate: async (client: FlowTemplateClient) => {
    set({ isSaving: true })
    try {
      const { flowTemplate } = get()

      if (!flowTemplate.id) {
        throw new Error('Template must be saved before publishing')
      }

      await client.publishTemplate(flowTemplate.id)
    } finally {
      set({ isSaving: false })
    }
  }
}))
