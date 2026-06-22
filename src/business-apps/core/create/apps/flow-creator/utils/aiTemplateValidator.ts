/**
 * AI Template Contract Validator
 *
 * Validates that a template returned by the flow AI (set_flow_draft tool result) conforms
 * to the strict save-compatible contract required by the backend. Use before calling
 * templateToStudioGraph so the frontend does not apply a draft that the save endpoint will reject.
 *
 * ---
 * AI TEMPLATE CONTRACT (for backend / query-agentic)
 * ---
 * - Root: object with `name`, `steps`, and optional integer `version >= 1`.
 * - start.form / step.form entries must use backend-supported input types only and must have
 *   `type`, `name`, and `label`.
 * - steps[].reference is required. `id`-only payloads are rejected in the AI path.
 * - steps[].type must be one of the backend-supported canonical types. `GATEWAY` is rejected.
 * - DECISION(LOGIC): branches must have `id` + `label`; logicConfig.conditions must be an array
 *   of `{ expression: string, branchId: string }`.
 * - FORK: parallelBranches must be `{ id, label, steps: string[] }`; steps[0] must be a string.
 * - JOIN: forkReference must be a non-empty string.
 * - CLAIM assignments must contain at least one non-empty target array with specific values.
 */

export interface AiTemplateValidationResult {
  valid: boolean
  errors: string[]
}

function safeIsArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

function safeIsString(value: unknown): value is string {
  return typeof value === 'string'
}

const ALLOWED_INPUT_TYPES = new Set([
  'NUMBER',
  'TEXT',
  'TEXTAREA',
  'SELECT',
  'MULTISELECT',
  'CHECKBOX',
  'DATE',
  'DATETIME',
  'FILE'
])

const ALLOWED_STEP_TYPES = new Set([
  'TASK',
  'APPROVAL',
  'INFORMATION',
  'ACKNOWLEDGE',
  'DECISION',
  'FORK',
  'JOIN',
  'FUNCTION',
  'AI_AGENT',
  'AI_TASK_EXPERT',
  'CUSTOM_DATA_MUTATION'
])

const ALLOWED_CUSTOM_DATA_OPERATIONS = new Set(['create', 'update', 'delete', 'append'])

function hasSpecificAssignmentTargetValues(targets: unknown): boolean {
  if (targets == null || typeof targets !== 'object') return false
  const targetObject = targets as Record<string, unknown>
  return [
    targetObject.users,
    targetObject.organizationalUnits,
    targetObject.matrixTeams,
    targetObject.companies,
    targetObject.siteLocations,
    targetObject.costCenters,
    targetObject.capabilities
  ].some(fieldValue => {
    if (!Array.isArray(fieldValue) || fieldValue.length === 0) return false
    return !fieldValue.every(value => typeof value === 'string' && (value.trim() === '' || value === 'ANY'))
  })
}

function validateFormArray(form: unknown, path: string, errors: string[]) {
  if (!safeIsArray(form)) return
  for (let formIndex = 0; formIndex < form.length; formIndex++) {
    const field = form[formIndex] as Record<string, unknown> | undefined
    const fieldPath = `${path}.${formIndex}`
    const fieldType = String(field?.type ?? '')
      .trim()
      .toUpperCase()
    if (!ALLOWED_INPUT_TYPES.has(fieldType)) {
      errors.push(`${fieldPath}.type must be one of ${Array.from(ALLOWED_INPUT_TYPES).join(', ')}`)
    }
    if (!safeIsString(field?.name)) {
      errors.push(`${fieldPath}.name must be a string`)
    }
    if (!safeIsString(field?.label)) {
      errors.push(`${fieldPath}.label must be a string`)
    }
  }
}

/**
 * Validates that the template has the strict shape required by the AI save-parity flow.
 * Returns a result with valid: true or a list of error messages for logging and rejection.
 */
export function validateAiTemplateContract(template: unknown): AiTemplateValidationResult {
  const errors: string[] = []

  if (template === null || typeof template !== 'object' || Array.isArray(template)) {
    return { valid: false, errors: ['Template must be a non-null object'] }
  }

  const t = template as Record<string, unknown>
  if (!safeIsString(t.name)) {
    errors.push('name must be a string')
  }
  if (t.version !== undefined) {
    if (!Number.isInteger(t.version)) {
      errors.push('version must be an integer number')
    } else if ((t.version as number) < 1) {
      errors.push('version must not be less than 1')
    }
  }
  if (!safeIsArray(t.steps)) {
    return { valid: false, errors: ['Template must have a "steps" array'] }
  }

  validateFormArray((t.start as Record<string, unknown> | undefined)?.form, 'start.form', errors)

  const steps = t.steps as Record<string, unknown>[]

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (!step || typeof step !== 'object') {
      errors.push(`steps[${i}]: must be an object`)
      continue
    }

    if (!safeIsString(step.reference) || !step.reference.trim()) {
      errors.push(`steps[${i}].reference must be a non-empty string`)
    }
    if (!safeIsString(step.title) || !step.title.trim()) {
      errors.push(`steps[${i}].title must be a non-empty string`)
    }

    const type = String(step.type ?? '')
      .trim()
      .toUpperCase()
    if (!ALLOWED_STEP_TYPES.has(type)) {
      errors.push(`steps[${i}].type must be one of ${Array.from(ALLOWED_STEP_TYPES).join(', ')}`)
    }

    const nextStep = step.nextStep
    if (nextStep !== undefined && nextStep !== null && !Number.isInteger(nextStep)) {
      errors.push(`steps[${i}].nextStep must be an integer or null`)
    }

    validateFormArray(step.form, `steps[${i}].form`, errors)

    const assignment = step.assignment as Record<string, unknown> | undefined
    const assignmentMode = String(assignment?.assignmentMode ?? '')
      .trim()
      .toUpperCase()
    if (assignmentMode === 'CLAIM' && !hasSpecificAssignmentTargetValues(assignment?.targets)) {
      errors.push(
        `steps[${i}].assignment.targets must have at least one non-empty target array with specific values for CLAIM mode`
      )
    }

    if (type === 'FORK') {
      const branches = step.parallelBranches
      if (!safeIsArray(branches)) {
        errors.push(`steps[${i}] (FORK): missing or invalid parallelBranches array`)
      } else {
        for (let b = 0; b < branches.length; b++) {
          const branch = branches[b] as Record<string, unknown> | undefined
          if (!safeIsString(branch?.id) || !branch.id.trim()) {
            errors.push(`steps[${i}] (FORK) branch ${b}: id must be a non-empty string`)
          }
          if (!safeIsString(branch?.label) || !branch.label.trim()) {
            errors.push(`steps[${i}] (FORK) branch ${b}: label must be a non-empty string`)
          }
          const branchSteps = branch?.steps
          if (!safeIsArray(branchSteps) || branchSteps.length === 0) {
            errors.push(`steps[${i}] (FORK) branch ${b}: steps must be a non-empty array of step references`)
          } else if (!safeIsString(branchSteps[0])) {
            errors.push(`steps[${i}] (FORK) branch ${b}: first step must be a step reference (string), not an index`)
          }
        }
      }
    }

    if (type === 'JOIN') {
      const forkRef = step.forkReference
      if (!safeIsString(forkRef) || !forkRef.trim()) {
        errors.push(`steps[${i}] (JOIN): forkReference must be a non-empty string (the FORK step's reference/id)`)
      }
    }

    if (type === 'DECISION') {
      const branches = step.branches
      if (!safeIsArray(branches)) {
        errors.push(`steps[${i}] (DECISION): branches must be an array`)
      } else {
        for (let branchIndex = 0; branchIndex < branches.length; branchIndex++) {
          const branch = branches[branchIndex] as Record<string, unknown> | undefined
          if (!safeIsString(branch?.id) || !branch.id.trim()) {
            errors.push(`steps[${i}].branches.${branchIndex}.id must be a non-empty string`)
          }
          if (!safeIsString(branch?.label) || !branch.label.trim()) {
            errors.push(`steps[${i}].branches.${branchIndex}.label must be a non-empty string`)
          }
        }
      }

      const decisionMode = String(step.decisionMode ?? '')
        .trim()
        .toUpperCase()
      if (decisionMode === 'LOGIC') {
        const conditions = (step.logicConfig as Record<string, unknown> | undefined)?.conditions
        if (!safeIsArray(conditions)) {
          errors.push(`steps[${i}].logicConfig.conditions must be an array`)
        } else {
          for (let conditionIndex = 0; conditionIndex < conditions.length; conditionIndex++) {
            const condition = conditions[conditionIndex] as Record<string, unknown> | undefined
            if (!safeIsString(condition?.expression)) {
              errors.push(`steps[${i}].logicConfig.conditions.${conditionIndex}.expression must be a string`)
            }
            if (!safeIsString(condition?.branchId)) {
              errors.push(`steps[${i}].logicConfig.conditions.${conditionIndex}.branchId must be a string`)
            }
          }
        }
      }
    }

    if (type === 'CUSTOM_DATA_MUTATION') {
      const customDataConfig = step.customDataConfig as Record<string, unknown> | undefined
      if (customDataConfig == null || typeof customDataConfig !== 'object' || Array.isArray(customDataConfig)) {
        errors.push(`steps[${i}] (CUSTOM_DATA_MUTATION): customDataConfig must be an object`)
      } else if (customDataConfig.useAiAgent === true) {
        // AI mode: an agent resolves the operation/values at runtime. Only a typed
        // entity target (namespace + entityName) is required.
        if (!safeIsString(customDataConfig.namespace) || !customDataConfig.namespace.trim()) {
          errors.push(`steps[${i}].customDataConfig.namespace is required when useAiAgent is true`)
        }
        if (!safeIsString(customDataConfig.entityName) || !customDataConfig.entityName.trim()) {
          errors.push(`steps[${i}].customDataConfig.entityName is required when useAiAgent is true`)
        }
      } else {
        const operation = String(customDataConfig.operation ?? '')
          .trim()
          .toLowerCase()
        if (!ALLOWED_CUSTOM_DATA_OPERATIONS.has(operation)) {
          errors.push(
            `steps[${i}].customDataConfig.operation must be one of ${Array.from(ALLOWED_CUSTOM_DATA_OPERATIONS).join(', ')}`
          )
        }
        const target =
          customDataConfig.target === undefined ? 'ENTITY' : String(customDataConfig.target).trim().toUpperCase()
        if (target !== 'ENTITY' && target !== 'FLOW_DATA') {
          errors.push(`steps[${i}].customDataConfig.target must be ENTITY or FLOW_DATA`)
        }
        if (
          target === 'ENTITY' &&
          (!safeIsString(customDataConfig.entityName) || !customDataConfig.entityName.trim())
        ) {
          errors.push(`steps[${i}].customDataConfig.entityName is required for the ENTITY target`)
        }
        const values = customDataConfig.values
        if (values !== undefined && (typeof values !== 'object' || values === null || Array.isArray(values))) {
          errors.push(`steps[${i}].customDataConfig.values must be an object map of field to expression`)
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return { valid: true, errors: [] }
}

const ADVANCED_STEP_TYPES = new Set([
  'GATEWAY',
  'FORK',
  'JOIN',
  'AI_AGENT',
  'AI_TASK_EXPERT',
  'FUNCTION',
  'CUSTOM_DATA_MUTATION'
])

function hasExpressionValue(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return value.includes('{{') && value.includes('}}')
}

function hasNonEmptyTargets(targets: unknown): boolean {
  if (targets == null || typeof targets !== 'object') return false
  const targetObject = targets as Record<string, unknown>
  return [
    targetObject.users,
    targetObject.organizationalUnits,
    targetObject.matrixTeams,
    targetObject.companies,
    targetObject.siteLocations,
    targetObject.costCenters,
    targetObject.capabilities
  ].some(fieldValue => Array.isArray(fieldValue) && fieldValue.length > 0)
}

/**
 * Returns true if the template uses features that require Flow Studio to be in advanced mode
 * (expressions, GATEWAY/FORK/JOIN, system steps, assignment targets, branch conditions).
 * When true, the frontend should call setMode('advanced') after applying or loading this template.
 */
export function templateRequiresAdvancedMode(template: unknown): boolean {
  if (template === null || typeof template !== 'object' || !Array.isArray((template as any).steps)) {
    return false
  }
  const steps = (template as { steps: Record<string, unknown>[] }).steps
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (!step || typeof step !== 'object') continue
    const type = String(step.type ?? 'TASK')

    if (ADVANCED_STEP_TYPES.has(type)) return true

    const form = step.form
    if (Array.isArray(form)) {
      for (const field of form) {
        if (field && typeof field === 'object' && hasExpressionValue((field as any).value)) return true
      }
    }

    const assignment = step.assignment
    if (assignment && typeof assignment === 'object' && hasNonEmptyTargets((assignment as any).targets)) return true

    const branches = step.branches
    if (Array.isArray(branches)) {
      for (const b of branches) {
        if (b && typeof b === 'object' && typeof (b as any).condition === 'string' && (b as any).condition.trim())
          return true
      }
    }

    if (step.logicConfig && typeof step.logicConfig === 'object') {
      const conditions = (step.logicConfig as any).conditions
      if (Array.isArray(conditions) && conditions.length > 0) return true
    }
  }
  return false
}
