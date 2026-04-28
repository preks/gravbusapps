import { create } from 'zustand'
import { BusinessPattern, WizardState, WizardStep, PatternSelection } from '@/common/data/flow/types/businessPatterns'
import { FlowTemplate, FlowStep, AssignmentMode, TaskAssignment } from '@/common/network/flows/FlowTemplateClient'
import { validateTemplateAgainstPattern, ValidationResult } from '@/common/data/flow/utils/patternValidation'
import { useFlowTemplateStore } from '@/common/data/flow/hooks/useFlowTemplateStore'

interface WizardStore extends WizardState {
  selectPattern: (pattern: BusinessPattern) => void
  clearPattern: () => void
  skipPattern: () => void
  updateConfiguration: (key: string, value: any) => void
  setConfiguration: (config: Record<string, any>) => void
  nextStep: () => void
  previousStep: () => void
  goToStep: (stepIndex: number) => void
  generateTemplate: () => FlowTemplate
  applyPatternDefaults: (pattern: BusinessPattern) => void
  validateCurrentStep: () => boolean
  validateTemplate: () => ValidationResult
  initializeForCreate: () => void
  initializeForEdit: (template: FlowTemplate) => void
  isEditMode: boolean
  initializeWizard: () => void
  resetWizard: () => void
  completeWizard: () => PatternSelection
}

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

const normalizeAssignmentTargets = (assignment: TaskAssignment | undefined): TaskAssignment | undefined => {
  if (!assignment) return undefined

  let normalizedTargets = null

  if (assignment.targets) {
    const normalizedTarget = { ...assignment.targets }

    Object.keys(normalizedTarget).forEach(key => {
      const value = normalizedTarget[key as keyof typeof normalizedTarget]
      if (Array.isArray(value) && value.length === 0) {
        normalizedTarget[key as keyof typeof normalizedTarget] = null as any
      }
    })

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
  isEditMode: false,

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

  applyPatternDefaults: (pattern: BusinessPattern) => {
    const defaultSteps = pattern.preConfiguredSteps.map((preStep, index) => ({
      id: `step-${index}`,
      title: preStep.title,
      message: preStep.description,
      type: preStep.type,
      inputs: preStep.inputs || [],
      links: preStep.links || [],
      assignment: preStep.assignment
        ? {
            targets:
              preStep.assignment.assignmentMode === AssignmentMode.ASSIGN
                ? null
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

    set(state => ({
      configuration: {
        ...state.configuration,
        steps: defaultSteps,
        title: state.configuration.title || `${pattern.title} Workflow`,
        description: state.configuration.description || pattern.description,
        requiresAssignment: pattern.configuration.requiresAssignment,
        requiresDeadline: pattern.configuration.requiresDeadline,
        requiresEscalation: pattern.configuration.requiresEscalation
      }
    }))

    const { initializeTemplate } = useFlowTemplateStore.getState()
    initializeTemplate({
      type: 'TEMPLATE',
      name: `${pattern.title} Workflow`,
      description: pattern.description,
      version: 1,
      steps: defaultSteps
    })
  },

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

  generateTemplate: (): FlowTemplate => {
    const { selectedPattern, configuration } = get()
    const { flowTemplate } = useFlowTemplateStore.getState()

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

  validateCurrentStep: (): boolean => {
    const { currentStep, steps, configuration } = get()
    const step = steps[currentStep]

    if (!step) return false

    switch (step.id) {
      case 'complete-configuration':
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

  initializeForCreate: () => {
    set({
      ...initialState,
      isEditMode: false,
      currentStep: 0
    })
  },

  initializeForEdit: (template: FlowTemplate) => {
    const normalizedTemplate: FlowTemplate = {
      ...template,
      version: template.version || 1,
      steps: (template.steps || []).map(step => ({
        ...step,
        form: step.form || step.inputs || [],
        inputs: step.inputs || step.form || [],
        links: step.links || [],
        dueInMinutes: step.dueInMinutes,
        assignment: normalizeAssignmentTargets(step.assignment) || {
          targets: null,
          assignmentMode: AssignmentMode.CLAIM,
          allowReassignment: true
        }
      }))
    }

    const { initializeTemplate } = useFlowTemplateStore.getState()
    initializeTemplate(normalizedTemplate)

    set({
      ...initialState,
      isEditMode: true,
      currentStep: 0,
      configuration: {
        title: normalizedTemplate.name,
        description: normalizedTemplate.description,
        steps: normalizedTemplate.steps,
        patternId: 'custom'
      },
      isValid: true
    })
  },

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
