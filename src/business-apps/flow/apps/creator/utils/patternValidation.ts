/**
 * Pattern validation utilities for enforcing business rules
 */

import { BusinessPattern, ValidationRule } from '../types/businessPatterns'
import { FlowTemplate, FlowStep, FlowStepType, InputType } from '../types/flowTemplate'

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface ValidationWarning {
  field: string
  message: string
  suggestion?: string
}

/**
 * Validates a flow template against a business pattern
 */
export function validateTemplateAgainstPattern(template: FlowTemplate, pattern: BusinessPattern): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Run pattern-specific validation rules
  for (const rule of pattern.validationRules) {
    const result = validateRule(template, rule)
    if (!result.isValid) {
      errors.push({
        field: rule.field,
        message: rule.message,
        severity: 'error'
      })
    }
  }

  // Run pattern configuration validation
  const configValidation = validatePatternConfiguration(template, pattern)
  errors.push(...configValidation.errors)
  warnings.push(...configValidation.warnings)

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validates a single validation rule
 */
function validateRule(template: FlowTemplate, rule: ValidationRule): { isValid: boolean } {
  const value = getFieldValue(template, rule.field)

  switch (rule.rule) {
    case 'required':
      return { isValid: value !== undefined && value !== null && value !== '' }

    case 'min':
      if (Array.isArray(value)) {
        return { isValid: value.length >= (rule.value || 0) }
      }
      if (typeof value === 'number') {
        return { isValid: value >= (rule.value || 0) }
      }
      return { isValid: true }

    case 'max':
      if (Array.isArray(value)) {
        return { isValid: value.length <= (rule.value || Infinity) }
      }
      if (typeof value === 'number') {
        return { isValid: value <= (rule.value || Infinity) }
      }
      return { isValid: true }

    case 'pattern':
      if (typeof value === 'string' && rule.value instanceof RegExp) {
        return { isValid: rule.value.test(value) }
      }
      return { isValid: true }

    case 'custom':
      if (rule.customValidator) {
        return { isValid: rule.customValidator(value, template) }
      }
      return { isValid: true }

    default:
      return { isValid: true }
  }
}

/**
 * Validates pattern configuration requirements
 */
function validatePatternConfiguration(
  template: FlowTemplate,
  pattern: BusinessPattern
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  const config = pattern.configuration

  // Validate step count
  if (template.steps.length < pattern.configuration.minSteps) {
    errors.push({
      field: 'steps',
      message: `Pattern "${pattern.title}" requires at least ${pattern.configuration.minSteps} steps`,
      severity: 'error'
    })
  }

  if (template.steps.length > pattern.configuration.maxSteps) {
    warnings.push({
      field: 'steps',
      message: `Pattern "${pattern.title}" typically uses no more than ${pattern.configuration.maxSteps} steps`,
      suggestion: 'Consider simplifying the workflow to match the pattern'
    })
  }

  // Validate step types
  for (let i = 0; i < template.steps.length; i++) {
    const step = template.steps[i]

    // Check forbidden step types
    if (config.forbiddenFlowStepTypes.includes(step.type)) {
      errors.push({
        field: `steps[${i}].type`,
        message: `Step type ${step.type} is not allowed for ${pattern.title} pattern`,
        severity: 'error'
      })
    }

    // Check recommended step types
    if (config.recommendedFlowStepTypes.length > 0 && !config.recommendedFlowStepTypes.includes(step.type)) {
      warnings.push({
        field: `steps[${i}].type`,
        message: `Step type ${step.type} is not recommended for ${pattern.title} pattern`,
        suggestion: `Consider using: ${config.recommendedFlowStepTypes.join(', ')}`
      })
    }

    // Validate assignments
    if (config.requiresAssignment && (!step.assignment || step.assignment.targets.length === 0)) {
      errors.push({
        field: `steps[${i}].assignment`,
        message: `Step "${step.title}" requires assignment`,
        severity: 'error'
      })
    }
  }

  // Validate pattern-specific rules
  validatePatternSpecificRules(template, pattern, errors, warnings)

  return { errors, warnings }
}

/**
 * Validates pattern-specific business rules
 */
function validatePatternSpecificRules(
  template: FlowTemplate,
  pattern: BusinessPattern,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  switch (pattern.id) {
    case 'single-approver':
      validateSingleApproverRules(template, errors, warnings)
      break

    case 'approval-chain':
      validateApprovalChainRules(template, errors, warnings)
      break

    case 'announcement':
      validateAnnouncementRules(template, errors, warnings)
      break

    case 'acknowledgment-required':
      validateAcknowledgmentRules(template, errors, warnings)
      break

    case 'task-assignment':
      validateTaskAssignmentRules(template, errors, warnings)
      break

    case 'consultation':
      validateConsultationRules(template, errors, warnings)
      break

    case 'document-review':
      validateDocumentReviewRules(template, errors, warnings)
      break

    case 'service-request':
      validateServiceRequestRules(template, errors, warnings)
      break
  }
}

/**
 * Single Approver pattern validation
 */
function validateSingleApproverRules(
  template: FlowTemplate,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const step = template.steps[0]

  if (step && step.type !== FlowStepType.APPROVAL) {
    errors.push({
      field: 'steps[0].type',
      message: 'Single approver pattern must use APPROVAL step type',
      severity: 'error'
    })
  }

  if (step && step.assignment && step.assignment.targets.length > 1) {
    errors.push({
      field: 'steps[0].assignment',
      message: 'Single approver pattern can only have one approver',
      severity: 'error'
    })
  }

  if (step && step.assignment && step.assignment.targets && step.assignment.targets.length > 0) {
    warnings.push({
      field: 'steps[0].assignment',
      message: 'Single approver should not assign to all targets',
      suggestion: 'Set assignmentMode to CLAIM for single approver pattern'
    })
  }
}

/**
 * Approval Chain pattern validation
 */
function validateApprovalChainRules(
  template: FlowTemplate,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // All steps must be approval steps
  template.steps.forEach((step, index) => {
    if (step.type !== FlowStepType.APPROVAL) {
      errors.push({
        field: `steps[${index}].type`,
        message: 'Approval chain pattern requires all steps to be APPROVAL type',
        severity: 'error'
      })
    }

    if (!step.assignment || step.assignment.targets.length === 0) {
      errors.push({
        field: `steps[${index}].assignment`,
        message: `Approval step "${step.title}" must have an assigned approver`,
        severity: 'error'
      })
    }

    if (step.assignment && step.assignment.targets.length > 1) {
      warnings.push({
        field: `steps[${index}].assignment`,
        message: `Approval step "${step.title}" has multiple approvers, consider using committee pattern`,
        suggestion: 'Use single approver per step or switch to approval committee pattern'
      })
    }
  })
}

/**
 * Announcement pattern validation
 */
function validateAnnouncementRules(
  template: FlowTemplate,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const step = template.steps[0]

  if (step && step.type !== FlowStepType.INFORMATION) {
    errors.push({
      field: 'steps[0].type',
      message: 'Announcement pattern must use INFORMATION step type',
      severity: 'error'
    })
  }

  if ((step && step.inputs?.length) || 0 > 0) {
    errors.push({
      field: 'steps[0].inputs',
      message: 'Announcement pattern should not have input blocks',
      severity: 'error'
    })
  }

  if (step && step.inputs?.length === 0) {
    warnings.push({
      field: 'steps[0].inputs',
      message: 'Announcement should have content to share',
      suggestion: 'Add content blocks to provide information to recipients'
    })
  }
}

/**
 * Acknowledgment pattern validation
 */
function validateAcknowledgmentRules(
  template: FlowTemplate,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const step = template.steps[0]

  if (step && step.type !== FlowStepType.ACKNOWLEDGE) {
    errors.push({
      field: 'steps[0].type',
      message: 'Acknowledgment pattern must use ACKNOWLEDGE step type',
      severity: 'error'
    })
  }

  if (step && step.inputs?.length === 0) {
    errors.push({
      field: 'steps[0].inputs',
      message: 'Acknowledgment pattern requires input blocks for confirmation',
      severity: 'error'
    })
  }

  // Check for checkbox input block
  const hasCheckbox = step?.inputs?.some(block => block.type === 'CHECKBOX')
  if (step && !hasCheckbox) {
    warnings.push({
      field: 'steps[0].inputs',
      message: 'Acknowledgment pattern typically uses checkbox for confirmation',
      suggestion: 'Consider adding a checkbox input block for acknowledgment'
    })
  }
}

/**
 * Task Assignment pattern validation
 */
function validateTaskAssignmentRules(
  template: FlowTemplate,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  template.steps.forEach((step, index) => {
    if (step.type !== FlowStepType.TASK) {
      errors.push({
        field: `steps[${index}].type`,
        message: 'Task assignment pattern should use TASK step type',
        severity: 'error'
      })
    }

    if (!step.assignment || step.assignment.targets.length === 0) {
      errors.push({
        field: `steps[${index}].assignment`,
        message: `Task "${step.title}" must be assigned to someone`,
        severity: 'error'
      })
    }

    if (step.inputs?.length === 0) {
      warnings.push({
        field: `steps[${index}].inputs`,
        message: `Task "${step.title}" should have input blocks for results`,
        suggestion: 'Add input blocks to collect task completion information'
      })
    }
  })
}

/**
 * Consultation pattern validation
 */
function validateConsultationRules(
  template: FlowTemplate,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const step = template.steps[0]

  if (step && step.type !== FlowStepType.TASK) {
    errors.push({
      field: 'steps[0].type',
      message: 'Consultation pattern should use TASK step type',
      severity: 'error'
    })
  }

  if (step && (!step.assignment || step.assignment.targets.length === 0)) {
    errors.push({
      field: 'steps[0].assignment',
      message: 'Consultation requires assigned consultants',
      severity: 'error'
    })
  }

  if (step && step.assignment && step.assignment.targets.length < 2) {
    warnings.push({
      field: 'steps[0].assignment',
      message: 'Consultation works best with multiple consultants',
      suggestion: 'Consider assigning multiple people for diverse input'
    })
  }
}

/**
 * Document Review pattern validation
 */
function validateDocumentReviewRules(
  template: FlowTemplate,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const step = template.steps[0]

  if (step && step.type !== FlowStepType.TASK) {
    errors.push({
      field: 'steps[0].type',
      message: 'Document review pattern should use TASK step type',
      severity: 'error'
    })
  }

  if (step && step.inputs?.length === 0) {
    warnings.push({
      field: 'steps[0].inputs',
      message: 'Document review should have input blocks for feedback',
      suggestion: 'Add input blocks to collect review feedback'
    })
  }

  const hasDocumentInput = step?.inputs?.some(block => block.type === InputType.FILE)
  if (step && !hasDocumentInput) {
    warnings.push({
      field: 'steps[0].inputs',
      message: 'Document review typically includes file input blocks',
      suggestion: 'Consider adding file input blocks for review materials'
    })
  }
}

/**
 * Service Request pattern validation
 */
function validateServiceRequestRules(
  template: FlowTemplate,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const step = template.steps[0]

  if (step && step.type !== FlowStepType.TASK) {
    errors.push({
      field: 'steps[0].type',
      message: 'Service request pattern should use TASK step type',
      severity: 'error'
    })
  }

  if (step && (!step.assignment || step.assignment.targets.length === 0)) {
    errors.push({
      field: 'steps[0].assignment',
      message: 'Service request must be assigned to service providers',
      severity: 'error'
    })
  }

  if (step && step.assignment && step.assignment.targets && step.assignment.targets.length > 0) {
    warnings.push({
      field: 'steps[0].assignment',
      message: 'Service request typically assigns to any available provider',
      suggestion: 'Consider setting assignmentMode to CLAIM for service requests'
    })
  }
}

/**
 * Gets a field value from the template using dot notation
 */
function getFieldValue(template: FlowTemplate, fieldPath: string): any {
  const parts = fieldPath.split('.')
  let current: any = template

  for (const part of parts) {
    // Handle array notation like steps[0]
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/)
    if (arrayMatch) {
      const [, arrayName, index] = arrayMatch
      current = current?.[arrayName]?.[parseInt(index, 10)]
    } else {
      current = current?.[part]
    }

    if (current === undefined) {
      break
    }
  }

  return current
}

/**
 * Checks if a pattern allows certain step types
 */
export function isFlowStepTypeAllowed(pattern: BusinessPattern, stepType: FlowStepType): boolean {
  return !pattern.configuration.forbiddenFlowStepTypes.includes(stepType)
}

/**
 * Gets recommended step types for a pattern
 */
export function getRecommendedFlowStepTypes(pattern: BusinessPattern): FlowStepType[] {
  return pattern.configuration.recommendedFlowStepTypes
}

/**
 * Checks if a pattern requires assignments
 */
export function patternRequiresAssignment(pattern: BusinessPattern): boolean {
  return pattern.configuration.requiresAssignment
}
