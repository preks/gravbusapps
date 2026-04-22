/**
 * Maps between persisted `requiredSubtypeKey` and UI `FormLayoutChoice`.
 * Layout is always one of three subtype tables (plus main investment); there is no "main only" mode.
 */
import type { FieldGroup, FormLayoutChoice, RequiredSubtypeKey } from '../types'

/** Used when catalog has no key yet or paths are ambiguous / investment-only. */
export const DEFAULT_REQUIRED_SUBTYPE_KEY: RequiredSubtypeKey = 'equityInvestment'

const ALL_FORM_LAYOUT_CHOICES: FormLayoutChoice[] = ['EQUITY', 'REAL_ESTATE', 'LIQUID_FUND']

export function isFormLayoutChoice(value: unknown): value is FormLayoutChoice {
  return value === 'EQUITY' || value === 'REAL_ESTATE' || value === 'LIQUID_FUND'
}

export function isRequiredSubtypeKey(value: unknown): value is RequiredSubtypeKey {
  return value === 'equityInvestment' || value === 'realEstateInvestment' || value === 'liquidFundInvestment'
}

export function requiredSubtypeKeyToFormLayoutChoice(key: RequiredSubtypeKey): FormLayoutChoice {
  if (key === 'equityInvestment') return 'EQUITY'
  if (key === 'realEstateInvestment') return 'REAL_ESTATE'
  return 'LIQUID_FUND'
}

export function formLayoutChoiceToRequiredSubtypeKey(choice: FormLayoutChoice): RequiredSubtypeKey {
  if (choice === 'EQUITY') return 'equityInvestment'
  if (choice === 'REAL_ESTATE') return 'realEstateInvestment'
  return 'liquidFundInvestment'
}

export function getFormLayoutChoices(): FormLayoutChoice[] {
  return ALL_FORM_LAYOUT_CHOICES
}

export function coerceFormLayoutChoice(choice: unknown): FormLayoutChoice {
  if (isFormLayoutChoice(choice)) return choice
  return 'EQUITY'
}

/** Normalizes persisted subtype key; unknown/missing → default. */
export function coerceRequiredSubtypeKey(key: unknown): RequiredSubtypeKey {
  if (isRequiredSubtypeKey(key)) return key
  return DEFAULT_REQUIRED_SUBTYPE_KEY
}

function firstPathSegment(property: string): string {
  return property.split('.')[0] || ''
}

const SUBTYPE_PREFIXES = ['equityInvestment', 'realEstateInvestment', 'liquidFundInvestment'] as const

/**
 * Infer subtype from field paths. `null` = multiple subtype roots; `undefined` = none or only `investment.*`.
 */
export function inferRequiredSubtypeKeyFromFormFields(
  fieldGroups: FieldGroup[] | undefined
): RequiredSubtypeKey | undefined | null {
  if (!fieldGroups?.length) {
    return undefined
  }

  const used = new Set<string>()
  for (const g of fieldGroups) {
    for (const f of g.fields || []) {
      const prop = f.property?.trim()
      if (!prop) continue
      const root = firstPathSegment(prop)
      if (SUBTYPE_PREFIXES.includes(root as (typeof SUBTYPE_PREFIXES)[number])) {
        used.add(root)
      }
    }
  }
  if (used.size === 0) return undefined
  if (used.size > 1) return null

  const only = [...used][0]
  if (only === 'equityInvestment') return 'equityInvestment'
  if (only === 'realEstateInvestment') return 'realEstateInvestment'
  if (only === 'liquidFundInvestment') return 'liquidFundInvestment'
  return undefined
}

export function formLayoutChoiceOptionLabel(value: FormLayoutChoice): string {
  switch (value) {
    case 'EQUITY':
      return 'Investment + equity'
    case 'REAL_ESTATE':
      return 'Investment + real estate'
    case 'LIQUID_FUND':
      return 'Investment + liquid fund'
    default:
      return value
  }
}
