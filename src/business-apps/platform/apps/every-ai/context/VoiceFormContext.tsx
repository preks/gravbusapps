/**
 * VoiceFormContext - Manages voice-driven form interactions in EveryAI
 *
 * When in voice mode and a form appears:
 * 1. Speaks a summary of the form data
 * 2. Listens for confirmation ("yes", "submit", "looks good")
 * 3. Listens for modifications ("change X to Y")
 * 4. Auto-submits or cancels based on voice commands
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type { FlowProposalOutput } from '../types/models'

// Voice command patterns for form interactions
const CONFIRMATION_PHRASES = [
  'yes',
  'yeah',
  'yep',
  'submit',
  'confirm',
  'looks good',
  'that looks good',
  "that's correct",
  "that's right",
  'go ahead',
  'do it',
  'send it',
  'ok',
  'okay',
  'perfect',
  'great',
  'sure',
  'absolutely',
  'correct',
  'right',
  'approved',
  'approve'
]

const CANCELLATION_PHRASES = [
  'cancel',
  'no',
  'nope',
  'stop',
  'nevermind',
  'never mind',
  "don't submit",
  'abort',
  'forget it',
  'wait',
  'hold on'
]

const NEGATION_PREFIXES = ["don't", 'do not', 'not', "doesn't", 'does not', "won't", 'will not', "can't", 'cannot']

function matchesPhrase(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text)
}

function hasNegationBefore(text: string, phrase: string): boolean {
  const phraseIdx = text.toLowerCase().indexOf(phrase.toLowerCase())
  if (phraseIdx < 0) return false
  const preceding = text.slice(0, phraseIdx).trimEnd()
  return NEGATION_PREFIXES.some(neg => preceding.endsWith(neg))
}

const MODIFICATION_PATTERNS = [
  /change (?:the )?(.+?) to (.+)/i,
  /update (?:the )?(.+?) to (.+)/i,
  /set (?:the )?(.+?) to (.+)/i,
  /make (?:the )?(.+?) (.+)/i,
  /(?:the )?(.+?) should be (.+)/i
]

export type VoiceFormCommand =
  | { type: 'confirm' }
  | { type: 'cancel' }
  | { type: 'modify'; field: string; value: string }
  | { type: 'unknown'; text: string }

export interface ActiveForm {
  uuid: string
  flowName: string
  moduleName: string
  data: FlowProposalOutput
  formData: Record<string, any>
  submitHandler: () => void
  cancelHandler: () => void
  updateField: (field: string, value: any) => void
}

export interface VoiceFormContextValue {
  // Active form state
  activeForm: ActiveForm | null
  setActiveForm: (form: ActiveForm | null) => void

  // Voice mode state
  isVoiceMode: boolean
  setIsVoiceMode: (value: boolean) => void

  // Form summary for TTS
  pendingFormSummary: string | null
  clearPendingFormSummary: () => void

  // Parse voice command
  parseVoiceCommand: (transcript: string) => VoiceFormCommand

  // Check if transcript is a form command (vs regular chat)
  isFormCommand: (transcript: string) => boolean

  // Generate spoken summary of form
  generateFormSummary: (form: FlowProposalOutput, formData: Record<string, any>) => string
}

const VoiceFormContext = createContext<VoiceFormContextValue | null>(null)

export function VoiceFormProvider({ children }: { children: React.ReactNode }) {
  const [activeForm, setActiveFormState] = useState<ActiveForm | null>(null)
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [pendingFormSummary, setPendingFormSummary] = useState<string | null>(null)
  const lastFormUuidRef = useRef<string | null>(null)

  // Heuristic: infer the most likely "name-like" field to update when user omits field name
  function inferDefaultFieldName(form: ActiveForm | null): string | null {
    if (!form) return null
    const preferredOrder = ['name', 'displayName', 'title', 'subject']
    const candidatesSet = new Set<string>()
    try {
      // From current form data keys
      Object.keys(form.formData || {}).forEach(k => candidatesSet.add(k))
      // From top-level schema properties (best-effort)
      const props = (form.data as any)?.flow_schema?.properties
      if (props && typeof props === 'object') {
        Object.keys(props).forEach(k => candidatesSet.add(k))
      }
    } catch {
      // ignore schema parsing errors
    }
    const candidates = Array.from(candidatesSet).map(k => k.toString())
    // Exact preferred matches
    for (const p of preferredOrder) {
      if (candidates.includes(p)) return p
    }
    // Contains "name" anywhere
    const containsName = candidates.find(k => k.toLowerCase().includes('name'))
    if (containsName) return containsName
    // Contains "title"
    const containsTitle = candidates.find(k => k.toLowerCase().includes('title'))
    if (containsTitle) return containsTitle
    // As a last resort, try a common CRM alias
    const containsSubject = candidates.find(k => k.toLowerCase().includes('subject'))
    if (containsSubject) return containsSubject
    return null
  }

  // Set active form and generate summary if in voice mode
  const setActiveForm = useCallback(
    (form: ActiveForm | null) => {
      setActiveFormState(form)

      if (form && isVoiceMode && form.uuid !== lastFormUuidRef.current) {
        // Generate and queue summary for speaking
        const summary = generateFormSummary(form.data, form.formData)
        setPendingFormSummary(summary)
        lastFormUuidRef.current = form.uuid
      } else if (!form) {
        lastFormUuidRef.current = null
      }
    },
    [isVoiceMode]
  )

  // Clear pending summary after it's been spoken
  const clearPendingFormSummary = useCallback(() => {
    setPendingFormSummary(null)
  }, [])

  // Parse a voice transcript to determine the command type
  const parseVoiceCommand = useCallback(
    (transcript: string): VoiceFormCommand => {
      const lowerTranscript = transcript.toLowerCase().trim()

      // Check cancellation BEFORE confirmation to avoid "don't submit" matching "submit"
      if (CANCELLATION_PHRASES.some(phrase => matchesPhrase(lowerTranscript, phrase))) {
        return { type: 'cancel' }
      }

      // Check for confirmation (only if no negation precedes the phrase)
      if (
        CONFIRMATION_PHRASES.some(
          phrase => matchesPhrase(lowerTranscript, phrase) && !hasNegationBefore(lowerTranscript, phrase)
        )
      ) {
        return { type: 'confirm' }
      }

      // Check for explicit modification patterns ("change name to ...")
      for (const pattern of MODIFICATION_PATTERNS) {
        const match = lowerTranscript.match(pattern)
        if (match) {
          return { type: 'modify', field: match[1].trim(), value: match[2].trim() }
        }
      }

      // Fallback patterns that omit the field ("change to ...", "rename to ...")
      const renameMatch = lowerTranscript.match(/^rename\s+(?:to\s+)?(.+)/i)
      if (renameMatch) {
        const inferred = inferDefaultFieldName(activeForm)
        if (inferred) {
          return { type: 'modify', field: inferred, value: renameMatch[1].trim() }
        }
      }
      const defaultChangeMatch = lowerTranscript.match(/^(?:change|update|set|make)\s+(?:to\s+)?(.+)/i)
      if (defaultChangeMatch) {
        const inferred = inferDefaultFieldName(activeForm)
        if (inferred) {
          return { type: 'modify', field: inferred, value: defaultChangeMatch[1].trim() }
        }
      }

      return { type: 'unknown', text: transcript }
    },
    [activeForm]
  )

  // Check if a transcript looks like a form command
  const isFormCommand = useCallback(
    (transcript: string): boolean => {
      if (!activeForm) return false

      const command = parseVoiceCommand(transcript)
      return command.type !== 'unknown'
    },
    [activeForm, parseVoiceCommand]
  )

  // Generate a spoken summary of the form
  const generateFormSummary = useCallback((form: FlowProposalOutput, formData: Record<string, any>): string => {
    const flowName = formatFlowName(form.flow_name || 'form')

    // Helper to check if a value looks like a UUID
    const isUUID = (val: unknown): boolean => {
      if (typeof val !== 'string') return false
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
    }

    // Extract key fields to mention (skip UUIDs and technical fields)
    const keyFields: string[] = []
    const importantFields = [
      'name',
      'title',
      'firstName',
      'lastName',
      'email',
      'company',
      'amount',
      'date',
      'startDate',
      'endDate',
      'description',
      'type'
    ]

    for (const field of importantFields) {
      if (formData[field] !== undefined && formData[field] !== null && formData[field] !== '') {
        const value = formData[field]
        // Skip UUID values
        if (isUUID(value)) continue
        const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
        keyFields.push(`${formatFieldName(field)}: ${displayValue}`)
      }
    }

    // Also check for any field that has a value
    for (const [key, value] of Object.entries(formData)) {
      if (
        value !== undefined &&
        value !== null &&
        value !== '' &&
        !importantFields.includes(key) &&
        !key.toLowerCase().includes('id') &&
        !key.toLowerCase().includes('version') &&
        !key.toLowerCase().includes('ref') &&
        !key.toLowerCase().includes('employee') &&
        !key.toLowerCase().includes('owner') &&
        typeof value !== 'object' &&
        !isUUID(value)
      ) {
        if (keyFields.length < 5) {
          // Limit to 5 fields for brevity
          keyFields.push(`${formatFieldName(key)}: ${String(value)}`)
        }
      }
    }

    let summary = `I've prepared a ${flowName}.`

    if (keyFields.length > 0) {
      summary += ` Here's what I have: ${keyFields.join(', ')}.`
    }

    summary += ` Say "submit" to confirm, "cancel" to discard, or tell me what to change.`

    return summary
  }, [])

  // Reset form summary when voice mode changes
  useEffect(() => {
    if (!isVoiceMode) {
      setPendingFormSummary(null)
    }
  }, [isVoiceMode])

  // Memoize the context value to prevent infinite loops in consumers
  const value: VoiceFormContextValue = useMemo(
    () => ({
      activeForm,
      setActiveForm,
      isVoiceMode,
      setIsVoiceMode,
      pendingFormSummary,
      clearPendingFormSummary,
      parseVoiceCommand,
      isFormCommand,
      generateFormSummary
    }),
    [
      activeForm,
      setActiveForm,
      isVoiceMode,
      pendingFormSummary,
      clearPendingFormSummary,
      parseVoiceCommand,
      isFormCommand,
      generateFormSummary
    ]
  )

  return <VoiceFormContext.Provider value={value}>{children}</VoiceFormContext.Provider>
}

export function useVoiceForm() {
  const context = useContext(VoiceFormContext)
  if (!context) {
    throw new Error('useVoiceForm must be used within a VoiceFormProvider')
  }
  return context
}

/**
 * Optional hook that returns null if outside provider
 * Used by components that may or may not be within the voice context
 */
export function useVoiceFormContext(): VoiceFormContextValue | null {
  return useContext(VoiceFormContext)
}

// Helper functions
function formatFlowName(name: string): string {
  if (!name) return ''
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

function formatFieldName(name: string): string {
  if (!name) return ''
  let processedName = name
  if (processedName.endsWith('Ref')) {
    processedName = processedName.slice(0, -3)
  }
  return processedName
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase()
}

export default VoiceFormContext
