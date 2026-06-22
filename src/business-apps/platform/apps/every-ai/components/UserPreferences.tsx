/**
 * UserPreferences - Modal for viewing and editing user personalization settings
 */

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@newwork/nw-design-system'
import {
  X,
  Trash,
  Info,
  Wrench,
  Note,
  SpinnerGap,
  Plus,
  XCircle,
  PencilSimple,
  Check,
  User,
  Robot,
  FilePdf,
  Copy
} from '@phosphor-icons/react'
import { useUserPreferencesContext } from '../context/UserPreferencesContext'
import type { BehaviorNote, UserSelectableLlmModel, UserSelectableLlmProvider } from '../hooks/useUserPreferences'
import {
  DeveloperSettings,
  SettingRow,
  SettingSegmentedControl,
  SettingSelect,
  SettingToggle,
  type SegmentedControlOption,
  type SelectOption
} from './DeveloperSettings'
import { isDevTenant } from '../utils/tenantEnv'

/**
 * Choice surfaced in the LLM-provider segmented control. `'default'` is a
 * UI-only sentinel that maps to `null` on the wire (= "use server default").
 */
type LlmProviderChoice = 'default' | UserSelectableLlmProvider
const LLM_MODEL_DEFAULT_CHOICE = '__flowbot_default__'

const LLM_PROVIDER_OPTIONS: ReadonlyArray<SegmentedControlOption<LlmProviderChoice>> = [
  { value: 'default', label: 'Default' },
  { value: 'azure', label: 'Azure' },
  { value: 'stackit', label: 'StackIT' },
  { value: 'groq', label: 'Groq' },
  { value: 'anthropic', label: 'Anthropic' }
]

/**
 * Semantic model "kinds" used internally by the backend to pick a model
 * for a given use case (see ``_MODEL_KIND_PROVIDER_DEFAULTS`` in
 * ``flowbot/src/core/constants/config.py``). Surfaced in the UI as a
 * small badge next to each model so devs know *why* a particular model
 * would normally be chosen.
 *
 * Note: when the user chooses the UI's "Default" model option, we send
 * `llm_model: null` so Flowbot resolves the provider default from its own
 * config. These tags are only informational for specific model pins.
 */
type ModelKind = 'default' | 'smart' | 'fast' | 'cheap'

const MODEL_KIND_LABEL: Record<ModelKind, string> = {
  default: 'Default',
  smart: 'Smart',
  fast: 'Fast',
  cheap: 'Cheap'
}

/**
 * Mirror of ``_MODEL_KIND_PROVIDER_DEFAULTS`` from the backend config.
 * The **reverse** lookup (model -> kinds) is what the UI actually needs,
 * so we build it lazily below.
 */
const MODEL_KINDS_BY_PROVIDER: Record<UserSelectableLlmProvider, Record<ModelKind, string>> = {
  azure: {
    default: 'gpt-5.4',
    smart: 'gpt-5',
    fast: 'gpt-4.1-mini',
    cheap: 'gpt-4o-mini'
  },
  stackit: {
    default: 'Qwen/Qwen3-VL-235B-A22B-Instruct-FP8',
    smart: 'openai/gpt-oss-120b',
    fast: 'openai/gpt-oss-120b',
    cheap: 'openai/gpt-oss-20b'
  },
  groq: {
    default: 'openai/gpt-oss-120b',
    smart: 'openai/gpt-oss-120b',
    fast: 'openai/gpt-oss-120b',
    cheap: 'openai/gpt-oss-20b'
  },
  anthropic: {
    default: 'claude-sonnet-4-6',
    smart: 'claude-opus-4-1-20250805',
    fast: 'claude-sonnet-4-5-20250929',
    cheap: 'claude-haiku-4-5-20251001'
  }
}

const KIND_ORDER: ReadonlyArray<ModelKind> = ['default', 'smart', 'fast', 'cheap']

/** Returns the kinds (in stable order) that a given model fills for a provider. */
function kindsForModel(provider: UserSelectableLlmProvider, model: string): ModelKind[] {
  const mapping = MODEL_KINDS_BY_PROVIDER[provider]
  return KIND_ORDER.filter(kind => mapping[kind] === model)
}

/** Formats the dropdown option: `model-id — Default · Smart`. */
function formatModelLabel(provider: UserSelectableLlmProvider, model: string): string {
  const kinds = kindsForModel(provider, model)
  if (kinds.length === 0) return model
  return `${model} — ${kinds.map(k => MODEL_KIND_LABEL[k]).join(' · ')}`
}

/**
 * Canonical model ids selectable per provider, kept in sync with the
 * backend's ``MODELS_BY_PROVIDER`` in ``flowbot/src/core/constants/config.py``
 * (``AZURE_MODELS`` / ``STACKIT_MODELS`` / ``GROQ_MODELS`` / ``ANTHROPIC_MODELS``).
 * Adding a model here without adding it there will make the backend silently
 * fall back to the provider's default (it rejects unknown pairings).
 *
 * Labels for specific model pins deliberately use the full canonical model
 * id -- no friendly renaming -- so the value the backend receives is
 * unambiguous from the label a developer sees. A kind badge
 * (Default/Smart/Fast/Cheap) is appended when the model is the provider's
 * current pick for that kind. The leading "Default" option is different:
 * it sends `llm_model: null` and lets Flowbot resolve its own default.
 */
const PROVIDER_MODEL_IDS: Record<UserSelectableLlmProvider, ReadonlyArray<UserSelectableLlmModel>> = {
  azure: [
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4o',
    'gpt-4o-mini',
    'o4-mini',
    'gpt-5',
    'gpt-5.3-chat',
    'gpt-5.4',
    'Mistral-Large-3'
  ],
  stackit: [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'cortecs/Llama-3.3-70B-Instruct-FP8-Dynamic',
    'Qwen/Qwen3-VL-235B-A22B-Instruct-FP8',
    'neuralmagic/Mistral-Nemo-Instruct-2407-FP8',
    'neuralmagic/Meta-Llama-3.1-8B-Instruct-FP8',
    'google/gemma-3-27b-it'
  ],
  groq: ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'],
  anthropic: [
    'claude-sonnet-4-5-20250929',
    'claude-sonnet-4-6',
    'claude-3-7-sonnet-latest',
    'claude-haiku-4-5-20251001',
    'claude-opus-4-1-20250805'
  ]
}

const MODELS_BY_PROVIDER: Record<UserSelectableLlmProvider, ReadonlyArray<SelectOption<string>>> = (
  Object.keys(PROVIDER_MODEL_IDS) as UserSelectableLlmProvider[]
).reduce(
  (acc, provider) => {
    acc[provider] = [
      { value: LLM_MODEL_DEFAULT_CHOICE, label: 'Default - use Flowbot config' },
      ...PROVIDER_MODEL_IDS[provider].map(model => ({
        value: model,
        label: formatModelLabel(provider, model)
      }))
    ]
    return acc
  },
  {} as Record<UserSelectableLlmProvider, ReadonlyArray<SelectOption<string>>>
)

interface UserPreferencesProps {
  darkMode?: boolean
  /**
   * Developer-only callback to export the current chat session as a PDF.
   * When provided and developer settings are visible, an extra row is
   * surfaced inside the developer settings card.
   */
  onPrintSession?: () => void
  /** Disable the print-session button (e.g. when the conversation is empty). */
  canPrintSession?: boolean
  /**
   * Current chat session id. Surfaced as a copyable pill in the modal
   * header so anyone (not just dev tenants) can paste it into Grafana to
   * pull up the matching backend session logs without having to first
   * search for one of their own messages.
   */
  sessionId?: string | null
}

export function UserPreferences({
  darkMode = false,
  onPrintSession,
  canPrintSession = true,
  sessionId
}: UserPreferencesProps) {
  const {
    preferences,
    isLoading,
    error,
    isModalOpen,
    closeModal,
    clearPreferences,
    updatePreferences,
    hasPreferences,
    refresh
  } = useUserPreferencesContext()

  const [isClearing, setIsClearing] = useState(false)
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingText, setEditingText] = useState('')
  const [sessionIdCopied, setSessionIdCopied] = useState(false)

  const handleCopySessionId = useCallback(async () => {
    if (!sessionId) return
    try {
      await navigator.clipboard.writeText(sessionId)
      setSessionIdCopied(true)
      setTimeout(() => setSessionIdCopied(false), 1500)
    } catch (err) {
      console.error('Failed to copy session id:', err)
    }
  }, [sessionId])

  // Handle Escape key to close modal (accessibility)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeModal()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen, closeModal])

  const handleClear = useCallback(async () => {
    setIsClearing(true)
    const success = await clearPreferences()
    setIsClearing(false)
    setShowConfirmClear(false)
    if (success) {
      closeModal()
    }
  }, [clearPreferences, closeModal])

  const handleAddNote = useCallback(async () => {
    if (!newNote.trim()) return

    setIsSaving(true)
    const currentNotes = preferences?.behavior_notes || []
    // User-added notes are marked with source='user' and protected from consolidation
    const newBehaviorNote: BehaviorNote = { text: newNote.trim(), source: 'user' }
    const success = await updatePreferences({
      behavior_notes: [...currentNotes, newBehaviorNote]
    })
    setIsSaving(false)

    if (success) {
      setNewNote('')
      setIsAddingNote(false)
      refresh()
    }
  }, [newNote, preferences, updatePreferences, refresh])

  const handleRemoveNote = useCallback(
    async (index: number) => {
      setIsSaving(true)
      const currentNotes = [...(preferences?.behavior_notes || [])]
      currentNotes.splice(index, 1)
      const success = await updatePreferences({ behavior_notes: currentNotes })
      setIsSaving(false)

      if (success) {
        refresh()
      }
    },
    [preferences, updatePreferences, refresh]
  )

  const startEditing = useCallback(
    (index: number) => {
      const notes = preferences?.behavior_notes || []
      setEditingIndex(index)
      setEditingText(notes[index]?.text || '')
    },
    [preferences]
  )

  const handleSaveEdit = useCallback(async () => {
    if (editingIndex === null || !editingText.trim()) return

    setIsSaving(true)
    const currentNotes = [...(preferences?.behavior_notes || [])]
    // When user edits a note, it becomes a user note (protected from consolidation)
    currentNotes[editingIndex] = { text: editingText.trim(), source: 'user' }
    const success = await updatePreferences({ behavior_notes: currentNotes })
    setIsSaving(false)

    if (success) {
      setEditingIndex(null)
      setEditingText('')
      refresh()
    }
  }, [editingIndex, editingText, preferences, updatePreferences, refresh])

  const cancelEditing = useCallback(() => {
    setEditingIndex(null)
    setEditingText('')
  }, [])

  // ---- Developer settings ---------------------------------------------------
  // Only surfaced on dev tenants (newwork-dev). On stage/prod the entire
  // section -- and therefore the LLM-provider override and chat-cache
  // toggle -- is hidden, so non-developer users can never opt themselves
  // into experimental behaviour they don't see.
  const showDeveloperSettings = isDevTenant()
  const settings = preferences?.settings ?? {}
  const chatCacheEnabled = settings.chat_cache_enabled === true
  const showTechnicalReasoning = settings.show_technical_reasoning === true
  const llmProviderChoice: LlmProviderChoice = settings.llm_provider ?? 'default'
  const settingsDisabled = isLoading || isSaving || preferences === null

  // Model dropdown is only meaningful once a concrete provider has been
  // pinned -- when on 'default' we hide it so users aren't confused into
  // thinking the model pick applies.
  const pinnedProvider: UserSelectableLlmProvider | null = llmProviderChoice === 'default' ? null : llmProviderChoice
  const modelOptions = pinnedProvider ? MODELS_BY_PROVIDER[pinnedProvider] : []
  const pinnedModel: UserSelectableLlmModel | null = settings.llm_model ?? null
  // Missing or stale model pins render as "Default", which sends
  // `llm_model: null` and lets Flowbot use its own current provider default.
  const effectiveModel = pinnedProvider
    ? pinnedModel && PROVIDER_MODEL_IDS[pinnedProvider].includes(pinnedModel)
      ? pinnedModel
      : LLM_MODEL_DEFAULT_CHOICE
    : ''

  const handleToggleChatCache = useCallback(
    async (next: boolean) => {
      setIsSaving(true)
      const success = await updatePreferences({
        settings: { chat_cache_enabled: next }
      })
      setIsSaving(false)
      if (success) refresh()
    },
    [updatePreferences, refresh]
  )

  const handleToggleTechnicalReasoning = useCallback(
    async (next: boolean) => {
      setIsSaving(true)
      const success = await updatePreferences({
        settings: { show_technical_reasoning: next }
      })
      setIsSaving(false)
      if (success) refresh()
    },
    [updatePreferences, refresh]
  )

  const handleSelectLlmProvider = useCallback(
    async (next: LlmProviderChoice) => {
      // 'default' is the UI sentinel for "no override"; send null on the wire
      // so the backend clears any previously-pinned provider (and any
      // dangling pinned model -- the model is meaningless without a
      // provider and could be invalid for whatever the server picks next).
      const wireProvider: UserSelectableLlmProvider | null = next === 'default' ? null : next
      setIsSaving(true)
      const success = await updatePreferences({
        settings: { llm_provider: wireProvider, llm_model: null }
      })
      setIsSaving(false)
      if (success) refresh()
    },
    [updatePreferences, refresh]
  )

  const handleSelectLlmModel = useCallback(
    async (next: string) => {
      const wireModel: UserSelectableLlmModel | null = next === LLM_MODEL_DEFAULT_CHOICE ? null : next
      setIsSaving(true)
      const success = await updatePreferences({
        settings: { llm_model: wireModel }
      })
      setIsSaving(false)
      if (success) refresh()
    },
    [updatePreferences, refresh]
  )

  if (!isModalOpen) return null

  const goldRgb = '183, 142, 78'

  return (
    <div
      className="gba:fixed gba:inset-0 gba:z-50 gba:flex gba:items-center gba:justify-center gba:bg-black/50"
      onClick={closeModal}
      onKeyDown={e => e.key === 'Escape' && closeModal()}
      role="presentation"
    >
      <div
        className={`gba:relative gba:w-full gba:max-w-md gba:mx-4 gba:rounded-2xl gba:shadow-2xl gba:overflow-hidden ${
          darkMode ? 'gba:bg-slate-900' : 'gba:bg-white'
        }`}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preferences-modal-title"
      >
        {/* Header */}
        <div
          className="gba:px-6 gba:py-4 gba:border-b"
          style={{
            borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            background: darkMode
              ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))'
              : `linear-gradient(135deg, rgba(${goldRgb}, 0.05), rgba(${goldRgb}, 0.02))`
          }}
        >
          <div className="gba:flex gba:items-center gba:justify-between">
            <h2
              id="preferences-modal-title"
              className="gba:text-lg gba:font-semibold"
              style={{ color: darkMode ? 'white' : 'var(--nw-foreground)' }}
            >
              My Preferences
            </h2>
            <button
              onClick={closeModal}
              className="gba:p-2 gba:rounded-full gba:transition-colors hover:gba:bg-black/10"
            >
              <X className="gba:h-5 gba:w-5" style={{ color: darkMode ? 'white' : '#666' }} />
            </button>
          </div>
          <p className="gba:text-sm gba:mt-1" style={{ color: darkMode ? 'rgba(255,255,255,0.6)' : '#666' }}>
            Preferences learned from your previous sessions
          </p>
          {sessionId && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:mt-3 gba:text-xs">
              <span style={{ color: darkMode ? 'rgba(255,255,255,0.5)' : '#888' }}>Session ID</span>
              <code
                className="gba:font-mono gba:px-2 gba:py-0.5 gba:rounded gba:truncate gba:min-w-0 gba:flex-1"
                style={{
                  background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  color: darkMode ? 'rgba(255,255,255,0.85)' : '#444',
                  fontSize: '11px'
                }}
                title={sessionId}
              >
                {sessionId}
              </code>
              <button
                type="button"
                onClick={handleCopySessionId}
                aria-label={sessionIdCopied ? 'Session ID copied' : 'Copy session ID'}
                title={sessionIdCopied ? 'Copied!' : 'Copy session ID'}
                className="gba:p-1 gba:rounded gba:transition-colors hover:gba:bg-black/10 gba:flex-shrink-0"
                style={{ color: sessionIdCopied ? `rgb(${goldRgb})` : darkMode ? 'rgba(255,255,255,0.6)' : '#888' }}
              >
                {sessionIdCopied ? (
                  <Check className="gba:h-3.5 gba:w-3.5" weight="bold" />
                ) : (
                  <Copy className="gba:h-3.5 gba:w-3.5" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="gba:px-6 gba:py-4 gba:max-h-[60vh] gba:overflow-y-auto">
          {isLoading && !preferences ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
              <SpinnerGap className="gba:h-8 gba:w-8 gba:animate-spin" style={{ color: `rgb(${goldRgb})` }} />
            </div>
          ) : error ? (
            <div className="gba:text-center gba:py-8">
              <p className="gba:text-red-500">{error}</p>
              <Button variant="ghost" onClick={refresh} className="gba:mt-2">
                Try Again
              </Button>
            </div>
          ) : !hasPreferences && !isAddingNote ? (
            <div className="gba:text-center gba:py-8">
              <Info
                className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4"
                style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : '#999' }}
              />
              <p style={{ color: darkMode ? 'rgba(255,255,255,0.7)' : '#666' }}>No preferences stored yet.</p>
              <p
                className="gba:text-sm gba:mt-2 gba:mb-4"
                style={{ color: darkMode ? 'rgba(255,255,255,0.5)' : '#999' }}
              >
                As you use the assistant, we'll learn your preferences. You can also add notes manually.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingNote(true)}
                className="gba:inline-flex gba:items-center gba:gap-2"
              >
                <Plus className="gba:h-4 gba:w-4" />
                Add a note
              </Button>
            </div>
          ) : !hasPreferences && isAddingNote ? (
            <div className="gba:py-4">
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
                <Note className="gba:h-4 gba:w-4" style={{ color: `rgb(${goldRgb})` }} />
                <h3
                  className="gba:text-sm gba:font-semibold"
                  style={{ color: darkMode ? 'white' : 'var(--nw-foreground)' }}
                >
                  Add a note
                </h3>
              </div>
              <div className="gba:flex gba:gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleAddNote()
                    } else if (e.key === 'Escape') {
                      setIsAddingNote(false)
                      setNewNote('')
                    }
                  }}
                  placeholder="e.g., prefers concise answers"
                  className="gba:flex-1 gba:text-sm gba:px-3 gba:py-2 gba:rounded-lg gba:border gba:outline-none"
                  style={{
                    background: darkMode ? 'rgba(255,255,255,0.05)' : 'white',
                    borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                    color: darkMode ? 'white' : 'inherit'
                  }}
                  autoFocus
                  disabled={isSaving}
                />
                <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim() || isSaving}>
                  {isSaving ? 'Saving...' : 'Add'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddingNote(false)
                    setNewNote('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="gba:space-y-6">
              {/* Frequently Used Tools */}
              {preferences && Object.keys(preferences.tool_affinities).length > 0 && (
                <div>
                  <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
                    <Wrench className="gba:h-4 gba:w-4" style={{ color: `rgb(${goldRgb})` }} />
                    <h3
                      className="gba:text-sm gba:font-semibold"
                      style={{ color: darkMode ? 'white' : 'var(--nw-foreground)' }}
                    >
                      Frequently Used
                    </h3>
                  </div>
                  <div className="gba:flex gba:flex-wrap gba:gap-2">
                    {Object.entries(preferences.tool_affinities)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([tool, count]) => (
                        <span
                          key={tool}
                          className="gba:px-3 gba:py-1.5 gba:rounded-full gba:text-sm"
                          style={{
                            background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                            color: darkMode ? 'rgba(255,255,255,0.8)' : '#555'
                          }}
                        >
                          {tool.replace(/_/g, ' ')}
                          <span className="gba:ml-1.5 gba:opacity-60">({count}x)</span>
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Behavior Notes */}
              <div>
                <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Note className="gba:h-4 gba:w-4" style={{ color: `rgb(${goldRgb})` }} />
                    <h3
                      className="gba:text-sm gba:font-semibold"
                      style={{ color: darkMode ? 'white' : 'var(--nw-foreground)' }}
                    >
                      Notes
                    </h3>
                  </div>
                  {!isAddingNote && (
                    <button
                      onClick={() => setIsAddingNote(true)}
                      className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:px-2 gba:py-1 gba:rounded-lg gba:transition-colors"
                      style={{
                        color: `rgb(${goldRgb})`,
                        background: darkMode ? 'rgba(255,255,255,0.05)' : `rgba(${goldRgb}, 0.08)`
                      }}
                    >
                      <Plus className="gba:h-3 gba:w-3" />
                      Add note
                    </button>
                  )}
                </div>

                {/* Add note input */}
                {isAddingNote && (
                  <div className="gba:mb-3 gba:flex gba:gap-2">
                    <input
                      type="text"
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleAddNote()
                        } else if (e.key === 'Escape') {
                          setIsAddingNote(false)
                          setNewNote('')
                        }
                      }}
                      placeholder="e.g., prefers concise answers"
                      className="gba:flex-1 gba:text-sm gba:px-3 gba:py-2 gba:rounded-lg gba:border gba:outline-none gba:transition-colors"
                      style={{
                        background: darkMode ? 'rgba(255,255,255,0.05)' : 'white',
                        borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        color: darkMode ? 'white' : 'inherit'
                      }}
                      autoFocus
                      disabled={isSaving}
                    />
                    <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim() || isSaving}>
                      {isSaving ? 'Saving...' : 'Add'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsAddingNote(false)
                        setNewNote('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {preferences && preferences.behavior_notes.length > 0 ? (
                  <ul className="gba:space-y-2">
                    {preferences.behavior_notes.map((note, idx) => {
                      const isUserNote = note.source === 'user'
                      return (
                        <li
                          key={idx}
                          className="gba:text-sm gba:flex gba:items-center gba:gap-2"
                          style={{ color: darkMode ? 'rgba(255,255,255,0.7)' : '#555' }}
                        >
                          {editingIndex === idx ? (
                            <>
                              <span
                                className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:flex-shrink-0"
                                style={{ background: `rgb(${goldRgb})` }}
                              />
                              <input
                                type="text"
                                value={editingText}
                                onChange={e => setEditingText(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSaveEdit()
                                  } else if (e.key === 'Escape') {
                                    cancelEditing()
                                  }
                                }}
                                className="gba:flex-1 gba:text-sm gba:px-2 gba:py-1 gba:rounded-md gba:border gba:outline-none"
                                style={{
                                  background: darkMode ? 'rgba(255,255,255,0.05)' : 'white',
                                  borderColor: `rgb(${goldRgb})`,
                                  color: darkMode ? 'white' : 'inherit'
                                }}
                                autoFocus
                                disabled={isSaving}
                              />
                              <button
                                onClick={handleSaveEdit}
                                className="gba:p-1 gba:rounded gba:transition-colors"
                                title="Save"
                                disabled={!editingText.trim() || isSaving}
                                style={{ color: `rgb(${goldRgb})` }}
                              >
                                <Check className="gba:h-4 gba:w-4" weight="bold" />
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="gba:p-1 gba:rounded gba:transition-colors"
                                title="Cancel"
                              >
                                <X className="gba:h-4 gba:w-4" style={{ color: darkMode ? '#aaa' : '#888' }} />
                              </button>
                            </>
                          ) : (
                            <>
                              <span title={isUserNote ? 'Added by you' : 'Learned by AI'}>
                                {isUserNote ? (
                                  <User
                                    className="gba:h-4 gba:w-4 gba:flex-shrink-0"
                                    style={{ color: `rgb(${goldRgb})` }}
                                  />
                                ) : (
                                  <Robot
                                    className="gba:h-4 gba:w-4 gba:flex-shrink-0"
                                    style={{ color: darkMode ? 'rgba(255,255,255,0.4)' : '#999' }}
                                  />
                                )}
                              </span>
                              <span className="gba:flex-1">{note.text}</span>
                              <button
                                onClick={() => startEditing(idx)}
                                className="gba:p-1 gba:rounded hover:gba:bg-black/10"
                                title="Edit note"
                                disabled={isSaving}
                              >
                                <PencilSimple
                                  className="gba:h-4 gba:w-4"
                                  style={{ color: darkMode ? 'rgba(255,255,255,0.5)' : '#999' }}
                                />
                              </button>
                              <button
                                onClick={() => handleRemoveNote(idx)}
                                className="gba:p-1 gba:rounded hover:gba:bg-red-100"
                                title="Remove note"
                                disabled={isSaving}
                              >
                                <XCircle
                                  className="gba:h-4 gba:w-4"
                                  style={{ color: darkMode ? '#f87171' : '#ef4444' }}
                                />
                              </button>
                            </>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  !isAddingNote && (
                    <p
                      className="gba:text-sm gba:italic"
                      style={{ color: darkMode ? 'rgba(255,255,255,0.5)' : '#999' }}
                    >
                      No notes yet. Add notes to help personalize your experience.
                    </p>
                  )
                )}
              </div>

              {/* Sessions Analyzed */}
              {preferences && preferences.sessions_analyzed > 0 && (
                <div
                  className="gba:text-xs gba:pt-4 gba:border-t"
                  style={{
                    borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    color: darkMode ? 'rgba(255,255,255,0.5)' : '#999'
                  }}
                >
                  Based on {preferences.sessions_analyzed} session
                  {preferences.sessions_analyzed !== 1 ? 's' : ''}
                  {preferences.updated_at && (
                    <>
                      {' '}
                      · Last updated{' '}
                      {new Date(preferences.updated_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Developer settings — dev tenants only. Always rendered once
              the initial spinner is gone, even when preferences failed to
              load: the toggles auto-disable themselves via
              `settingsDisabled` and the print-session button is purely
              client-side, so it must remain available when the backend
              is unreachable. */}
          {showDeveloperSettings && !(isLoading && !preferences) && (
            <div className="gba:mt-6">
              <DeveloperSettings darkMode={darkMode}>
                <SettingRow
                  darkMode={darkMode}
                  label="Cache chat answers"
                  description="Reuse answers for identical or semantically similar questions to make replies faster and cheaper."
                  control={
                    <SettingToggle
                      darkMode={darkMode}
                      checked={chatCacheEnabled}
                      disabled={settingsDisabled}
                      ariaLabel="Toggle chat answer caching"
                      onChange={handleToggleChatCache}
                    />
                  }
                />
                <SettingRow
                  darkMode={darkMode}
                  label="Show technical reasoning"
                  description="Show raw tool names, queries, inputs/outputs, and errors in chat reasoning. For debugging only."
                  control={
                    <SettingToggle
                      darkMode={darkMode}
                      checked={showTechnicalReasoning}
                      disabled={settingsDisabled}
                      ariaLabel="Toggle technical reasoning display"
                      onChange={handleToggleTechnicalReasoning}
                    />
                  }
                />
                <SettingRow
                  darkMode={darkMode}
                  layout="stacked"
                  label="LLM provider"
                  description="Pin chats to a specific provider, or leave on Default to use the server's choice."
                  control={
                    <SettingSegmentedControl<LlmProviderChoice>
                      darkMode={darkMode}
                      value={llmProviderChoice}
                      options={LLM_PROVIDER_OPTIONS}
                      disabled={settingsDisabled}
                      ariaLabel="Select LLM provider"
                      onChange={handleSelectLlmProvider}
                    />
                  }
                />
                {pinnedProvider && (
                  <SettingRow
                    darkMode={darkMode}
                    layout="stacked"
                    label="LLM model"
                    description="Pick a specific model within the chosen provider's family. Only applies when a provider is pinned."
                    control={
                      <SettingSelect<string>
                        darkMode={darkMode}
                        value={effectiveModel}
                        options={modelOptions}
                        disabled={settingsDisabled}
                        ariaLabel="Select LLM model"
                        onChange={handleSelectLlmModel}
                      />
                    }
                  />
                )}
                {onPrintSession && (
                  <SettingRow
                    darkMode={darkMode}
                    label="Print session"
                    description="Open the current conversation in a print-ready view to save it as a PDF."
                    control={
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onPrintSession}
                        disabled={!canPrintSession}
                        aria-label="Print session as PDF"
                        className="gba:inline-flex gba:items-center gba:gap-2"
                      >
                        <FilePdf className="gba:h-4 gba:w-4" />
                        Save PDF
                      </Button>
                    }
                  />
                )}
              </DeveloperSettings>
            </div>
          )}
        </div>

        {/* Footer */}
        {hasPreferences && (
          <div
            className="gba:px-6 gba:py-4 gba:border-t gba:flex gba:justify-between gba:items-center"
            style={{ borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
          >
            {showConfirmClear ? (
              <div className="gba:flex gba:items-center gba:gap-3 gba:w-full">
                <span className="gba:text-sm" style={{ color: darkMode ? 'rgba(255,255,255,0.7)' : '#666' }}>
                  Clear all preferences?
                </span>
                <div className="gba:flex gba:gap-2 gba:ml-auto">
                  <Button variant="ghost" size="sm" onClick={() => setShowConfirmClear(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleClear} disabled={isClearing}>
                    {isClearing ? 'Clearing...' : 'Clear'}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowConfirmClear(true)}
                  className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-red-500 hover:gba:text-red-600 gba:transition-colors"
                >
                  <Trash className="gba:h-4 gba:w-4" />
                  Clear preferences
                </button>
                <Button variant="ghost" onClick={closeModal}>
                  Done
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default UserPreferences
