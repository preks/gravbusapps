import type { EmailAddress } from './index'

export type EmailAssistantTone = 'formal' | 'informal' | 'friendly' | 'professional' | 'concise'

export type EmailAssistantFormality = 'formal' | 'neutral' | 'informal'

export type EmailAssistantLength = 'short' | 'medium' | 'long'

export type EmailAssistantRewriteAction = 'improve' | 'tone' | 'shorten' | 'expand' | 'custom'

export type EmailAssistantRiskLevel = 'low' | 'medium' | 'high'

export interface EmailAssistantDraft {
  subject: string
  textBody: string
  htmlBody: string
}

export interface EmailAssistantInsights {
  clarity: number | null
  formality: number | null
  directness: number | null
  recipientFit: number | null
  suggestions: string[]
}

export interface EmailAssistantTemperatureCheck {
  riskLevel: EmailAssistantRiskLevel
  flags: string[]
  explanations: string[]
  alternatives: string[]
}

export interface EmailAssistantMeta {
  model: string | null
  latency: number | null
  promptVersion: string | null
  cacheHit: boolean | null
}

export interface EmailAssistantMissingContextPrompt {
  key: string
  label: string
}

export interface EmailAssistantResponse {
  draft: EmailAssistantDraft | null
  insights: EmailAssistantInsights | null
  temperatureCheck: EmailAssistantTemperatureCheck | null
  meta: EmailAssistantMeta | null
  missingContextPrompts: EmailAssistantMissingContextPrompt[]
}

export interface EmailAssistantCapabilities {
  enabled: boolean
}

export interface EmailAssistantDraftRequest {
  accountId: string
  mode: string
  bulletDraft: string
  recipients?: EmailAddress[]
  tone?: EmailAssistantTone
  formality?: EmailAssistantFormality
  length?: EmailAssistantLength
}

export interface EmailAssistantRewriteRequest {
  accountId: string
  action: EmailAssistantRewriteAction
  draft: {
    subject?: string
    textBody?: string
    htmlBody?: string
  }
  tone?: EmailAssistantTone
  length?: EmailAssistantLength
  instruction?: string
}

export interface EmailAssistantTemperatureCheckRequest {
  subject: string
  textBody: string
  recipients?: EmailAddress[]
}

export interface EmailAssistantReplySuggestRequest {
  accountId: string
  messageId?: string
  threadId?: string
  userBulletDraft?: string
  tone?: EmailAssistantTone
  formality?: EmailAssistantFormality
  length?: EmailAssistantLength
}

export interface EmailAssistantPolicy {
  cultureSummary: string
  preferredPhrases: string[]
  disallowedPhrases: string[]
  requiredCourtesyMarkers: string[]
  defaultFormality: EmailAssistantFormality
  advisoryOnly: boolean
  historyWindowSize: number
}

export type EmailAssistantPolicyUpdateRequest = EmailAssistantPolicy
