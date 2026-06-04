import { useCallback, useEffect, useState } from 'react'
import { CheckCircleIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import { useEnterpriseAgentClient } from '../../../hooks/useEnterpriseAgentClient'
import { MemoryListSkeleton } from './SkeletonLoader'

interface PreferencesEditorProps {
  client: ReturnType<typeof useEnterpriseAgentClient>
  isOpen: boolean
}

interface PresetField {
  key: string
  label: string
  options: string[]
}

// Stable keys → the agent reads these from the `preferences` memory namespace and
// applies them on every task (see memory_factory `_retrieve_user_preferences`).
const PRESET_FIELDS: PresetField[] = [
  { key: 'response_length', label: 'Response length', options: ['Concise', 'Balanced', 'Detailed'] },
  { key: 'tone', label: 'Tone', options: ['Professional', 'Friendly', 'Direct', 'Casual'] },
  { key: 'format', label: 'Format', options: ['Prose', 'Bullet points', 'Tables when useful', 'Step-by-step'] },
  {
    key: 'expertise_level',
    label: 'Expertise level',
    options: ['Beginner-friendly', 'Balanced', 'Expert (skip basics)']
  }
]

const LANGUAGES = ['English', 'German', 'French', 'Spanish', 'Italian', 'Portuguese', 'Dutch']

const FREETEXT_FIELDS = [
  { key: 'about_you', label: 'About you', placeholder: 'e.g. I lead HR operations for a 2,000-person company.' },
  {
    key: 'custom_instructions',
    label: 'Custom instructions',
    placeholder: 'Anything else the agent should always keep in mind.'
  }
] as const

export const PreferencesEditor: React.FC<PreferencesEditorProps> = ({ client, isOpen }) => {
  const [values, setValues] = useState<Record<string, string>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const results = await client.getMemory('*')
      const map: Record<string, string> = {}
      for (const m of results ?? []) {
        if ((m.namespace ?? 'preferences') === 'preferences') map[m.key] = m.value
      }
      setValues(map)
      setDrafts(map)
    } catch {
      setValues({})
      setDrafts({})
    } finally {
      setIsLoading(false)
    }
  }, [client])

  useEffect(() => {
    if (isOpen) load()
  }, [isOpen, load])

  const flagSaved = useCallback((key: string) => {
    setSavedKey(key)
    setTimeout(() => setSavedKey(k => (k === key ? null : k)), 2000)
  }, [])

  const setPreference = useCallback(
    async (key: string, value: string) => {
      setValues(prev => ({ ...prev, [key]: value }))
      setSavingKey(key)
      try {
        await client.saveMemory(key, value, 'preferences')
        flagSaved(key)
      } catch {
        // best-effort; leave optimistic value in place
      } finally {
        setSavingKey(s => (s === key ? null : s))
      }
    },
    [client, flagSaved]
  )

  const clearPreference = useCallback(
    async (key: string) => {
      setValues(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      try {
        await client.deleteMemory(key, 'preferences')
      } catch {
        // best-effort
      }
    },
    [client]
  )

  const saveFreeText = useCallback(
    async (key: string) => {
      const value = (drafts[key] ?? '').trim()
      if (value === (values[key] ?? '')) return
      if (!value) {
        await clearPreference(key)
        return
      }
      await setPreference(key, value)
    },
    [drafts, values, clearPreference, setPreference]
  )

  if (isLoading) {
    return (
      <div className="gba:px-3 sm:gba:px-4 gba:pb-3">
        <MemoryListSkeleton />
      </div>
    )
  }

  return (
    <div className="gba:px-3 sm:gba:px-4 gba:pb-3 gba:space-y-4">
      <p className="gba:text-xs gba:text-muted-foreground">
        These apply to every task. The agent reads them at the start of each session, so you don’t have to repeat
        yourself.
      </p>

      {PRESET_FIELDS.map(field => {
        const selected = values[field.key]
        return (
          <div key={field.key}>
            <div className="gba:mb-1.5 gba:flex gba:items-center gba:gap-1.5">
              <span className="gba:text-xs gba:font-semibold gba:text-foreground">{field.label}</span>
              {savedKey === field.key && (
                <span className="gba:inline-flex gba:items-center gba:gap-0.5 gba:text-[10px] gba:text-emerald-600">
                  <CheckCircleIcon className="gba:h-3 gba:w-3" weight="fill" />
                  Saved
                </span>
              )}
              {savingKey === field.key && (
                <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin gba:text-muted-foreground" />
              )}
            </div>
            <div className="gba:flex gba:flex-wrap gba:gap-1.5">
              {field.options.map(option => {
                const isActive = selected === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => (isActive ? clearPreference(field.key) : setPreference(field.key, option))}
                    className={`gba:rounded-full gba:border gba:px-3 gba:py-1 gba:text-xs gba:font-medium gba:transition-colors ${
                      isActive
                        ? 'gba:border-foreground gba:bg-foreground gba:text-background'
                        : 'gba:border-border/60 gba:text-muted-foreground gba:hover:bg-muted/40'
                    }`}
                    data-testid={`pref-${field.key}-${option}`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      <div>
        <div className="gba:mb-1.5 gba:flex gba:items-center gba:gap-1.5">
          <span className="gba:text-xs gba:font-semibold gba:text-foreground">Language</span>
          {savedKey === 'language' && (
            <span className="gba:inline-flex gba:items-center gba:gap-0.5 gba:text-[10px] gba:text-emerald-600">
              <CheckCircleIcon className="gba:h-3 gba:w-3" weight="fill" />
              Saved
            </span>
          )}
        </div>
        <select
          value={values.language ?? ''}
          onChange={e => (e.target.value ? setPreference('language', e.target.value) : clearPreference('language'))}
          className="gba:h-8 gba:w-full gba:rounded-lg gba:border gba:border-border/60 gba:bg-background gba:px-2.5 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
          data-testid="pref-language"
        >
          <option value="">No preference</option>
          {LANGUAGES.map(lang => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </div>

      {FREETEXT_FIELDS.map(field => (
        <div key={field.key}>
          <div className="gba:mb-1.5 gba:flex gba:items-center gba:gap-1.5">
            <span className="gba:text-xs gba:font-semibold gba:text-foreground">{field.label}</span>
            {savedKey === field.key && (
              <span className="gba:inline-flex gba:items-center gba:gap-0.5 gba:text-[10px] gba:text-emerald-600">
                <CheckCircleIcon className="gba:h-3 gba:w-3" weight="fill" />
                Saved
              </span>
            )}
          </div>
          <textarea
            value={drafts[field.key] ?? ''}
            onChange={e => setDrafts(prev => ({ ...prev, [field.key]: e.target.value }))}
            onBlur={() => void saveFreeText(field.key)}
            placeholder={field.placeholder}
            rows={2}
            className="gba:w-full gba:resize-y gba:rounded-lg gba:border gba:border-border/60 gba:bg-background gba:px-2.5 gba:py-2 gba:text-sm gba:leading-relaxed gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
            data-testid={`pref-${field.key}`}
          />
        </div>
      ))}
    </div>
  )
}
