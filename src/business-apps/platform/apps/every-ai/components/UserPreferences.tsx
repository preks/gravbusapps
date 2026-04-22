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
  Robot
} from '@phosphor-icons/react'
import { useUserPreferencesContext } from '../context/UserPreferencesContext'
import type { BehaviorNote, UserSelectableLlmProvider } from '../hooks/useUserPreferences'
import {
  DeveloperSettings,
  SettingRow,
  SettingSegmentedControl,
  SettingToggle,
  type SegmentedControlOption
} from './DeveloperSettings'
import { isDevTenant } from '../utils/tenantEnv'

/**
 * Choice surfaced in the LLM-provider segmented control. `'default'` is a
 * UI-only sentinel that maps to `null` on the wire (= "use server default").
 */
type LlmProviderChoice = 'default' | UserSelectableLlmProvider

const LLM_PROVIDER_OPTIONS: ReadonlyArray<SegmentedControlOption<LlmProviderChoice>> = [
  { value: 'default', label: 'Default' },
  { value: 'azure', label: 'Azure' },
  { value: 'stackit', label: 'StackIT' }
]

interface UserPreferencesProps {
  darkMode?: boolean
}

export function UserPreferences({ darkMode = false }: UserPreferencesProps) {
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
  const llmProviderChoice: LlmProviderChoice = settings.llm_provider ?? 'default'
  const settingsDisabled = isLoading || isSaving || preferences === null

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

  const handleSelectLlmProvider = useCallback(
    async (next: LlmProviderChoice) => {
      // 'default' is the UI sentinel for "no override"; send null on the wire
      // so the backend clears any previously-pinned provider.
      const wireValue: UserSelectableLlmProvider | null = next === 'default' ? null : next
      setIsSaving(true)
      const success = await updatePreferences({
        settings: { llm_provider: wireValue }
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

          {/* Developer settings — dev tenants only. Always available once
              data is loaded, even when the user has no notes or tool
              affinities yet. */}
          {showDeveloperSettings && !error && !(isLoading && !preferences) && (
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
