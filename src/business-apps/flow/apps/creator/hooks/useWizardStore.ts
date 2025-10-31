import { create } from 'zustand'
import { BusinessPattern, WizardState, WizardStep, PatternSelection } from '../types/businessPatterns'
import { FlowTemplate, FlowStep, AssignmentMode, TaskAssignment } from '@/common/network/flows/FlowTemplateClient'
import { validateTemplateAgainstPattern, ValidationResult } from '../utils/patternValidation'
import { useFlowTemplateStore } from './useFlowTemplateStore'

interface WizardStore extends WizardState {
  // Pattern selection
  selectPattern: (pattern: BusinessPattern) => void
  clearPattern: () => void
  skipPattern: () => void // NEW: Skip pattern selection

  // Configuration
  updateConfiguration: (key: string, value: any) => void
  setConfiguration: (config: Record<string, any>) => void

  // Navigation
  nextStep: () => void
  previousStep: () => void
  goToStep: (stepIndex: number) => void

  // Template generation with pattern defaults
  generateTemplate: () => FlowTemplate
  applyPatternDefaults: (pattern: BusinessPattern) => void // NEW: Apply smart defaults

  // Validation
  validateCurrentStep: () => boolean
  validateTemplate: () => ValidationResult

  // Mode management - NEW
  initializeForCreate: () => void
  initializeForEdit: (template: FlowTemplate) => void
  isEditMode: boolean

  // Wizard management
  initializeWizard: () => void
  resetWizard: () => void
  completeWizard: () => PatternSelection
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
]

// Helper function to normalize assignment targets (convert empty arrays to null)
const normalizeAssignmentTargets = (assignment: TaskAssignment | undefined): TaskAssignment | undefined => {
  if (!assignment) return undefined

  let normalizedTargets = null

  if (assignment.targets) {
    const normalizedTarget = { ...assignment.targets }

    // Convert empty arrays to null for each field
    Object.keys(normalizedTarget).forEach(key => {
      const value = normalizedTarget[key as keyof typeof normalizedTarget]
      if (Array.isArray(value) && value.length === 0) {
        normalizedTarget[key as keyof typeof normalizedTarget] = null as any
      }
    })

    // Check if all fields are null/empty
    const hasAnyValues = Object.values(normalizedTarget).some(
      fieldValue => fieldValue && Array.isArray(fieldValue) && fieldValue.length > 0
    )

    normalizedTargets = hasAnyValues ? normalizedTarget : null
  }

  return {
    ...assignment,
    targets: normalizedTargets
  }
}

// Initial wizard state
const initialState: WizardState = {
  currentStep: 0,
  steps: WIZARD_STEPS,
  selectedPattern: undefined,
  configuration: {},
  isValid: false,
  errors: {}
}

export const useWizardStore = create<WizardStore>((set, get) => ({
  ...initialState,
  isEditMode: false, // NEW

  // NEW: Skip pattern selection for custom workflows
  skipPattern: () => {
    set(state => ({
      selectedPattern: undefined,
      configuration: {
        ...state.configuration,
        patternId: 'custom',
        customWorkflow: true
      },
      isValid: true,
      errors: {}
    }))
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
      // Apply pre-configured assignment if specified, otherwise default assignment
      assignment: preStep.assignment
        ? {
            targets:
              preStep.assignment.assignmentMode === AssignmentMode.ASSIGN
                ? null // For ASSIGN mode, null targets means "prompt user to assign during launch"
                : {
                    users: [],
                    organizationalUnits: [],
                    matrixTeams: [],
                    companies: [],
                    siteLocations: [],
                    costCenters: [],
                    capabilities: []
                  },
            assignmentMode: preStep.assignment.assignmentMode,
            allowReassignment: preStep.assignment.allowReassignment ?? true
          }
        : {
            targets: null,
            assignmentMode: AssignmentMode.CLAIM,
            allowReassignment: true
          }
    }))

    // Update wizard configuration
    set(state => ({
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
    }))

    // Also update the flow template store with the generated steps
    const { initializeTemplate } = useFlowTemplateStore.getState()
    initializeTemplate({
      type: 'TEMPLATE',
      name: `${pattern.title} Workflow`,
      description: pattern.description,
      version: 1,
      steps: defaultSteps
    })
  },

  // Enhanced pattern selection with defaults
  selectPattern: (pattern: BusinessPattern) => {
    set(state => {
      const newConfiguration = {
        ...state.configuration,
        patternId: pattern.id,
        requiresAssignment: pattern.configuration.requiresAssignment,
        requiresDeadline: pattern.configuration.requiresDeadline,
        requiresEscalation: pattern.configuration.requiresEscalation
      }

      return {
        selectedPattern: pattern,
        configuration: newConfiguration,
        isValid: get().validateCurrentStep(),
        errors: {}
      }
    })

    // Auto-apply pattern defaults
    get().applyPatternDefaults(pattern)
  },

  clearPattern: () => {
    set(() => ({
      selectedPattern: undefined,
      configuration: {},
      isValid: false,
      errors: {}
    }))
  },

  // Configuration
  updateConfiguration: (key: string, value: any) => {
    set(state => ({
      configuration: {
        ...state.configuration,
        [key]: value
      }
    }))
  },

  setConfiguration: (config: Record<string, any>) => {
    set(state => ({
      configuration: {
        ...state.configuration,
        ...config
      }
    }))
  },

  // Navigation
  nextStep: () => {
    const { currentStep, steps, validateCurrentStep } = get()

    if (validateCurrentStep() && currentStep < steps.length - 1) {
      set({ currentStep: currentStep + 1 })
    }
  },

  previousStep: () => {
    const { currentStep } = get()

    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 })
    }
  },

  goToStep: (stepIndex: number) => {
    const { steps } = get()

    if (stepIndex >= 0 && stepIndex < steps.length) {
      set({ currentStep: stepIndex })
    }
  },

  // Template generation
  generateTemplate: (): FlowTemplate => {
    const { selectedPattern, configuration } = get()
    const { flowTemplate } = useFlowTemplateStore.getState()

    // Use steps from flowTemplate store (these have the latest updates including assignments)
    // not from configuration (which only has the initial pattern defaults)
    const steps: FlowStep[] = flowTemplate.steps || []

    const template: FlowTemplate = {
      type: 'TEMPLATE',
      name:
        configuration.title ||
        flowTemplate.name ||
        (selectedPattern ? `${selectedPattern.title} Workflow` : 'Custom Workflow'),
      description:
        configuration.description || flowTemplate.description || (selectedPattern ? selectedPattern.description : ''),
      version: flowTemplate.version || 1,
      steps
    }

    return template
  },

  // Validation
  validateCurrentStep: (): boolean => {
    const { currentStep, steps, configuration } = get()
    const step = steps[currentStep]

    if (!step) return false

    switch (step.id) {
      case 'complete-configuration':
        // Must have title and at least one step (pattern is optional)
        return !!(
          configuration.title &&
          configuration.title.trim().length > 0 &&
          configuration.steps &&
          configuration.steps.length > 0
        )

      default:
        return true
    }
  },

  validateTemplate: (): ValidationResult => {
    const { selectedPattern } = get()

    if (!selectedPattern) {
      return {
        isValid: false,
        errors: [{ field: 'pattern', message: 'No pattern selected', severity: 'error' }],
        warnings: []
      }
    }

    try {
      const template = get().generateTemplate()
      return validateTemplateAgainstPattern(template as any, selectedPattern)
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            field: 'template',
            message: error instanceof Error ? error.message : 'Template generation failed',
            severity: 'error'
          }
        ],
        warnings: []
      }
    }
  },

  // Mode management - NEW
  initializeForCreate: () => {
    set({
      ...initialState,
      isEditMode: false,
      currentStep: 0
    })
  },

  initializeForEdit: (template: FlowTemplate) => {
    // Normalize the template to ensure all required arrays exist and required fields are set
    const normalizedTemplate: FlowTemplate = {
      ...template,
      version: template.version || 1, // Ensure version is set
      steps: (template.steps || []).map(step => ({
        ...step,
        form: step.form || step.inputs || [],
        inputs: step.inputs || step.form || [],
        links: step.links || [],
        // Preserve timing-related fields
        dueInMinutes: step.dueInMinutes,
        // Ensure assignment is set and normalized - required by client interface
        assignment: normalizeAssignmentTargets(step.assignment) || {
          targets: null,
          assignmentMode: AssignmentMode.CLAIM,
          allowReassignment: true
        }
      }))
    }

    // Initialize the flow template store with the normalized template
    const { initializeTemplate } = useFlowTemplateStore.getState()
    initializeTemplate(normalizedTemplate)

    set({
      ...initialState,
      isEditMode: true,
      currentStep: 0, // Single step wizard
      configuration: {
        title: normalizedTemplate.name,
        description: normalizedTemplate.description,
        steps: normalizedTemplate.steps,
        patternId: 'custom' // Assume custom for existing templates
      },
      isValid: true
    })
  },

  // Wizard management
  initializeWizard: () => {
    set({ ...initialState })
  },

  resetWizard: () => {
    set({ ...initialState })
  },

  completeWizard: (): PatternSelection => {
    const { selectedPattern, configuration, generateTemplate } = get()

    if (!selectedPattern) {
      throw new Error('No pattern selected')
    }

    generateTemplate()

    return {
      pattern: selectedPattern,
      customizations: configuration,
      selectedSteps: selectedPattern.preConfiguredSteps
    }
  }
}))

// Utility functions for working with wizard state
export const useWizardNavigation = () => {
  const { currentStep, steps, nextStep, previousStep, goToStep } = useWizardStore()

  const canGoNext = currentStep < steps.length - 1
  const canGoPrevious = currentStep > 0
  const currentStepInfo = steps[currentStep]
  const progress = ((currentStep + 1) / steps.length) * 100

  return {
    currentStep,
    currentStepInfo,
    canGoNext,
    canGoPrevious,
    progress,
    nextStep,
    previousStep,
    goToStep
  }
}

export const useWizardValidation = () => {
  const { validateCurrentStep, validateTemplate, isValid, errors } = useWizardStore()

  return {
    validateCurrentStep,
    validateTemplate,
    isValid,
    errors
  }
}

export const usePatternSelection = () => {
  const { selectedPattern, selectPattern, clearPattern } = useWizardStore()

  return {
    selectedPattern,
    selectPattern,
    clearPattern
  }
}
