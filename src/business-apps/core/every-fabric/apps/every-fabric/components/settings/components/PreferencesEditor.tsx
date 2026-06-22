import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { CheckCircleIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import { useEnterpriseAgentClient } from '../../../hooks/useEnterpriseAgentClient'
import { MemoryListSkeleton } from './SkeletonLoader'
import { UserProfileBriefEditor } from './UserProfileBriefEditor'
import translations from '../../../_i18n'

interface PreferencesEditorProps {
  client: ReturnType<typeof useEnterpriseAgentClient>
  isOpen: boolean
}

interface PresetField {
  key: string
  labelKey: string
  options: { value: string; labelKey: string }[]
}

const PRESET_FIELDS: PresetField[] = [
  {
    key: 'response_length',
    labelKey: 'settings-pref-response-length',
    options: [
      { value: 'Concise', labelKey: 'settings-pref-option-concise' },
      { value: 'Balanced', labelKey: 'settings-pref-option-balanced' },
      { value: 'Detailed', labelKey: 'settings-pref-option-detailed' }
    ]
  },
  {
    key: 'tone',
    labelKey: 'settings-pref-tone',
    options: [
      { value: 'Professional', labelKey: 'settings-pref-option-professional' },
      { value: 'Friendly', labelKey: 'settings-pref-option-friendly' },
      { value: 'Direct', labelKey: 'settings-pref-option-direct' },
      { value: 'Casual', labelKey: 'settings-pref-option-casual' }
    ]
  },
  {
    key: 'format',
    labelKey: 'settings-pref-format',
    options: [
      { value: 'Prose', labelKey: 'settings-pref-option-prose' },
      { value: 'Bullet points', labelKey: 'settings-pref-option-bullets' },
      { value: 'Tables when useful', labelKey: 'settings-pref-option-tables' },
      { value: 'Step-by-step', labelKey: 'settings-pref-option-steps' }
    ]
  },
  {
    key: 'expertise_level',
    labelKey: 'settings-pref-expertise',
    options: [
      { value: 'Beginner-friendly', labelKey: 'settings-pref-option-beginner' },
      { value: 'Balanced', labelKey: 'settings-pref-option-balanced' },
      { value: 'Expert (skip basics)', labelKey: 'settings-pref-option-expert' }
    ]
  }
]

const LANGUAGES = [
  { value: 'English', labelKey: 'settings-pref-lang-english' },
  { value: 'German', labelKey: 'settings-pref-lang-german' },
  { value: 'French', labelKey: 'settings-pref-lang-french' },
  { value: 'Spanish', labelKey: 'settings-pref-lang-spanish' },
  { value: 'Italian', labelKey: 'settings-pref-lang-italian' },
  { value: 'Portuguese', labelKey: 'settings-pref-lang-portuguese' },
  { value: 'Dutch', labelKey: 'settings-pref-lang-dutch' }
] as const

const FREETEXT_FIELDS = [
  {
    key: 'custom_instructions',
    labelKey: 'settings-pref-custom-instructions',
    placeholderKey: 'settings-pref-custom-placeholder'
  }
] as const

export const PreferencesEditor: React.FC<PreferencesEditorProps> = ({ client, isOpen }) => {
  const { t } = useTranslation(translations)
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
      <p className="gba:text-xs gba:text-muted-foreground">{t('settings-preferences-intro')}</p>

      <UserProfileBriefEditor client={client} isOpen={isOpen} />

      {PRESET_FIELDS.map(field => {
        const selected = values[field.key]
        return (
          <div key={field.key}>
            <div className="gba:mb-1.5 gba:flex gba:items-center gba:gap-1.5">
              <span className="gba:text-xs gba:font-semibold gba:text-foreground">{t(field.labelKey)}</span>
              {savedKey === field.key && (
                <span className="gba:inline-flex gba:items-center gba:gap-0.5 gba:text-[10px] gba:text-emerald-600">
                  <CheckCircleIcon className="gba:h-3 gba:w-3" weight="fill" />
                  {t('section-saved')}
                </span>
              )}
              {savingKey === field.key && (
                <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin gba:text-muted-foreground" />
              )}
            </div>
            <div className="gba:flex gba:flex-wrap gba:gap-1.5">
              {field.options.map(option => {
                const isActive = selected === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => (isActive ? clearPreference(field.key) : setPreference(field.key, option.value))}
                    className={`gba:rounded-full gba:border gba:px-3 gba:py-1 gba:text-xs gba:font-medium gba:transition-colors ${
                      isActive
                        ? 'gba:border-foreground gba:bg-foreground gba:text-background'
                        : 'gba:border-border/60 gba:text-muted-foreground gba:hover:bg-muted/40'
                    }`}
                    data-testid={`pref-${field.key}-${option.value}`}
                  >
                    {t(option.labelKey)}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      <div>
        <div className="gba:mb-1.5 gba:flex gba:items-center gba:gap-1.5">
          <span className="gba:text-xs gba:font-semibold gba:text-foreground">{t('settings-pref-language')}</span>
          {savedKey === 'language' && (
            <span className="gba:inline-flex gba:items-center gba:gap-0.5 gba:text-[10px] gba:text-emerald-600">
              <CheckCircleIcon className="gba:h-3 gba:w-3" weight="fill" />
              {t('section-saved')}
            </span>
          )}
        </div>
        <select
          value={values.language ?? ''}
          onChange={e => (e.target.value ? setPreference('language', e.target.value) : clearPreference('language'))}
          className="gba:h-8 gba:w-full gba:rounded-lg gba:border gba:border-border/60 gba:bg-background gba:px-2.5 gba:text-sm gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
          data-testid="pref-language"
        >
          <option value="">{t('settings-pref-language-none')}</option>
          {LANGUAGES.map(lang => (
            <option key={lang.value} value={lang.value}>
              {t(lang.labelKey)}
            </option>
          ))}
        </select>
      </div>

      {FREETEXT_FIELDS.map(field => (
        <div key={field.key}>
          <div className="gba:mb-1.5 gba:flex gba:items-center gba:gap-1.5">
            <span className="gba:text-xs gba:font-semibold gba:text-foreground">{t(field.labelKey)}</span>
            {savedKey === field.key && (
              <span className="gba:inline-flex gba:items-center gba:gap-0.5 gba:text-[10px] gba:text-emerald-600">
                <CheckCircleIcon className="gba:h-3 gba:w-3" weight="fill" />
                {t('section-saved')}
              </span>
            )}
          </div>
          <textarea
            value={drafts[field.key] ?? ''}
            onChange={e => setDrafts(prev => ({ ...prev, [field.key]: e.target.value }))}
            onBlur={() => void saveFreeText(field.key)}
            placeholder={t(field.placeholderKey)}
            rows={2}
            className="gba:w-full gba:resize-y gba:rounded-lg gba:border gba:border-border/60 gba:bg-background gba:px-2.5 gba:py-2 gba:text-sm gba:leading-relaxed gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
            data-testid={`pref-${field.key}`}
          />
        </div>
      ))}
    </div>
  )
}
