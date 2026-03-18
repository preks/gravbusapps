import type {
  EmailAssistantCapabilities,
  EmailAssistantDraft,
  EmailAssistantInsights,
  EmailAssistantMeta,
  EmailAssistantMissingContextPrompt,
  EmailAssistantPolicy,
  EmailAssistantResponse,
  EmailAssistantTemperatureCheck
} from '../types/emailAssistant.types'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(item => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean)
}

export function parseEmailAssistantDraft(raw: unknown): EmailAssistantDraft | null {
  const data = asRecord(raw)
  const subject = asString(data.subject)
  const textBody = asString(data.textBody)
  const htmlBody = asString(data.htmlBody)

  if (!subject && !textBody && !htmlBody) return null
  return { subject, textBody, htmlBody }
}

export function parseEmailAssistantInsights(raw: unknown): EmailAssistantInsights | null {
  const data = asRecord(raw)
  const parsed: EmailAssistantInsights = {
    clarity: asNullableNumber(data.clarity) ?? asNullableNumber(data.clarityScore),
    formality: asNullableNumber(data.formality) ?? asNullableNumber(data.formalityScore),
    directness: asNullableNumber(data.directness) ?? asNullableNumber(data.directnessScore),
    recipientFit: asNullableNumber(data.recipientFit) ?? asNullableNumber(data.recipientFitScore),
    suggestions: asStringArray(data.suggestions)
  }

  if (
    parsed.clarity === null &&
    parsed.formality === null &&
    parsed.directness === null &&
    parsed.recipientFit === null &&
    parsed.suggestions.length === 0
  ) {
    return null
  }

  return parsed
}

export function parseEmailAssistantTemperatureCheck(raw: unknown): EmailAssistantTemperatureCheck | null {
  const data = asRecord(raw)
  const risk = asString(data.riskLevel)
  const riskLevel = risk === 'low' || risk === 'medium' || risk === 'high' ? risk : 'low'

  const parsed: EmailAssistantTemperatureCheck = {
    riskLevel,
    flags: asStringArray(data.flags),
    explanations: asStringArray(data.explanations),
    alternatives: asStringArray(data.alternatives)
  }

  if (parsed.flags.length === 0 && parsed.explanations.length === 0 && parsed.alternatives.length === 0) {
    return null
  }

  return parsed
}

export function parseEmailAssistantMeta(raw: unknown): EmailAssistantMeta | null {
  const data = asRecord(raw)
  const model = asString(data.model) || null
  const promptVersion = asString(data.promptVersion) || null
  const cacheHit = typeof data.cacheHit === 'boolean' ? data.cacheHit : null
  const latency = asNullableNumber(data.latency) ?? asNullableNumber(data.latencyMs)

  if (model === null && promptVersion === null && cacheHit === null && latency === null) return null

  return {
    model,
    latency,
    promptVersion,
    cacheHit
  }
}

export function parseEmailAssistantMissingContextPrompts(raw: unknown): EmailAssistantMissingContextPrompt[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(item => {
      const data = asRecord(item)
      const key = asString(data.key)
      const label = asString(data.label)
      if (!key || !label) return null
      return { key, label }
    })
    .filter((item): item is EmailAssistantMissingContextPrompt => Boolean(item))
}

export function parseEmailAssistantResponse(raw: unknown): EmailAssistantResponse {
  const data = asRecord(raw)
  const directTemperatureCheck = parseEmailAssistantTemperatureCheck(data)
  const directInsights = parseEmailAssistantInsights(data)
  const directMeta = parseEmailAssistantMeta(data)
  return {
    draft: parseEmailAssistantDraft(data.draft),
    insights: parseEmailAssistantInsights(data.insights) ?? directInsights,
    temperatureCheck: parseEmailAssistantTemperatureCheck(data.temperatureCheck) ?? directTemperatureCheck,
    meta: parseEmailAssistantMeta(data.meta) ?? directMeta,
    missingContextPrompts: parseEmailAssistantMissingContextPrompts(data.missingContextPrompts)
  }
}

export function parseEmailAssistantCapabilities(raw: unknown): EmailAssistantCapabilities {
  const data = asRecord(raw)
  return {
    enabled: Boolean(data.enabled)
  }
}

export function parseEmailAssistantPolicy(raw: unknown): EmailAssistantPolicy {
  const data = asRecord(raw)
  const formality = asString(data.defaultFormality)
  return {
    cultureSummary: asString(data.cultureSummary),
    preferredPhrases: asStringArray(data.preferredPhrases),
    disallowedPhrases: asStringArray(data.disallowedPhrases),
    requiredCourtesyMarkers: asStringArray(data.requiredCourtesyMarkers),
    defaultFormality: formality === 'formal' || formality === 'informal' ? formality : 'neutral',
    advisoryOnly: Boolean(data.advisoryOnly),
    historyWindowSize: typeof data.historyWindowSize === 'number' ? Math.max(1, Math.floor(data.historyWindowSize)) : 3
  }
}
