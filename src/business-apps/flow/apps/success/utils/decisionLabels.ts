import { formatStatusLabel } from './formatters'

interface DecisionStepLabelInput {
  decisionTitle?: string | null
  stepReference?: string | null
  decisionMode?: string | null
  promptName?: string | null
  policyDocumentTitle?: string | null
}

const GENERATED_STEP_REFERENCE_PATTERN = /^step[_-]?\d+$/i
const GENERIC_DECISION_TITLES = new Set(['decision', 'gateway', 'ai', 'user', 'logic'])

const normalizeValue = (value?: string | null) => value?.trim() || ''

const isGeneratedStepReference = (value?: string | null) => GENERATED_STEP_REFERENCE_PATTERN.test(normalizeValue(value))

const hasMeaningfulDecisionTitle = ({ decisionTitle, stepReference }: DecisionStepLabelInput) => {
  const normalizedTitle = normalizeValue(decisionTitle)
  const normalizedReference = normalizeValue(stepReference)

  if (!normalizedTitle) return false
  if (isGeneratedStepReference(normalizedTitle)) return false
  if (GENERIC_DECISION_TITLES.has(normalizedTitle.toLowerCase())) return false
  if (normalizedReference && normalizedTitle.toLowerCase() === normalizedReference.toLowerCase()) return false

  return true
}

export const getDecisionStepTypeLabel = (decisionMode?: string | null) => {
  const normalizedDecisionMode = normalizeValue(decisionMode)
  return normalizedDecisionMode ? formatStatusLabel(normalizedDecisionMode) : ''
}

export const getDecisionStepDisplayLabel = (input: DecisionStepLabelInput, fallbackLabel = 'n/a') => {
  if (hasMeaningfulDecisionTitle(input)) {
    return normalizeValue(input.decisionTitle)
  }

  const promptName = normalizeValue(input.promptName)
  if (promptName) return promptName

  const policyTitle = normalizeValue(input.policyDocumentTitle)
  if (policyTitle) return policyTitle

  const normalizedReference = normalizeValue(input.stepReference)
  if (normalizedReference && !isGeneratedStepReference(normalizedReference)) {
    return normalizedReference
  }

  const typeLabel = getDecisionStepTypeLabel(input.decisionMode)
  if (typeLabel) return typeLabel

  return fallbackLabel
}
