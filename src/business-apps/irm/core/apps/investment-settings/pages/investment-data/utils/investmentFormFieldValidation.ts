import type { FieldGroup, RequiredSubtypeKey } from '../types'

export interface FormFieldsValidationIssue {
  property: string
  message: string
}

export interface FormFieldsValidationResult {
  valid: boolean
  issues: FormFieldsValidationIssue[]
}

const SUBTYPE_PREFIXES = ['equityInvestment', 'realEstateInvestment', 'liquidFundInvestment'] as const

function firstPathSegment(property: string): string {
  return property.split('.')[0] || ''
}

function allowedRootsForRequiredSubtypeKey(key: RequiredSubtypeKey): Set<string> {
  const roots = new Set<string>(['investment'])
  if (key === 'equityInvestment') roots.add('equityInvestment')
  if (key === 'realEstateInvestment') roots.add('realEstateInvestment')
  if (key === 'liquidFundInvestment') roots.add('liquidFundInvestment')
  return roots
}

/**
 * Validates form field paths against persisted `requiredSubtypeKey` (which tables are in scope).
 */
export function validateInvestmentFormFieldsForLayout(
  fieldGroups: FieldGroup[] | undefined,
  requiredSubtypeKey: RequiredSubtypeKey
): FormFieldsValidationResult {
  const issues: FormFieldsValidationIssue[] = []

  if (!fieldGroups?.length) {
    return { valid: true, issues: [] }
  }

  const allowedRoots = allowedRootsForRequiredSubtypeKey(requiredSubtypeKey)
  const usedSubtypeRoots = new Set<string>()

  for (const group of fieldGroups) {
    for (const field of group.fields || []) {
      const prop = field.property?.trim()
      if (!prop) {
        issues.push({ property: '', message: 'Field has empty property path' })
        continue
      }

      const root = firstPathSegment(prop)
      if (!allowedRoots.has(root)) {
        issues.push({
          property: prop,
          message: `Path prefix "${root}" is not allowed for the selected required subtype (${requiredSubtypeKey}).`
        })
      }

      if (SUBTYPE_PREFIXES.includes(root as (typeof SUBTYPE_PREFIXES)[number])) {
        usedSubtypeRoots.add(root)
      }
    }
  }

  if (usedSubtypeRoots.size > 1) {
    issues.push({
      property: [...usedSubtypeRoots].join(', '),
      message: 'Fields must not mix multiple subtype tables (equity, real estate, liquid fund) in one configuration'
    })
  }

  return { valid: issues.length === 0, issues }
}
