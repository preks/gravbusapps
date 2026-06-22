import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { ArrowsClockwiseIcon, CheckCircleIcon, SpinnerGapIcon, WarningCircleIcon } from '@phosphor-icons/react'
import type { useEnterpriseAgentClient, UserProfileBrief } from '../../../hooks/useEnterpriseAgentClient'
import translations from '../../../_i18n'

interface UserProfileBriefEditorProps {
  client: ReturnType<typeof useEnterpriseAgentClient>
  isOpen: boolean
}

const STATUS_LABEL_KEYS: Record<UserProfileBrief['status'], string> = {
  missing: 'settings-profile-status-missing',
  generating: 'settings-profile-status-generating',
  ready: 'settings-profile-status-ready',
  failed: 'settings-profile-status-failed',
  edited: 'settings-profile-status-edited'
}

export const UserProfileBriefEditor: React.FC<UserProfileBriefEditorProps> = ({ client, isOpen }) => {
  const { t } = useTranslation(translations)
  const [profile, setProfile] = useState<UserProfileBrief | null>(null)
  const [draft, setDraft] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ensuredRef = useRef(false)

  const applyProfile = useCallback((next: UserProfileBrief) => {
    setProfile(next)
    setDraft(next.brief_text ?? '')
  }, [])

  const ensureIfMissing = useCallback(
    async (current: UserProfileBrief) => {
      if (ensuredRef.current || current.status !== 'missing') return current
      ensuredRef.current = true
      const ensured = await client.ensureUserProfileBrief()
      applyProfile(ensured)
      return ensured
    },
    [applyProfile, client]
  )

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const current = await client.getUserProfileBrief()
      applyProfile(current)
      await ensureIfMissing(current)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings-profile-error-load'))
    } finally {
      setIsLoading(false)
    }
  }, [applyProfile, client, ensureIfMissing])

  useEffect(() => {
    if (!isOpen) return
    load()
  }, [isOpen, load])

  useEffect(() => {
    if (!isOpen || profile?.status !== 'generating') return
    const interval = globalThis.setInterval(async () => {
      try {
        const next = await client.getUserProfileBrief()
        applyProfile(next)
      } catch {
        // Keep the current status visible; a later poll or manual refresh can recover.
      }
    }, 3000)
    return () => globalThis.clearInterval(interval)
  }, [applyProfile, client, isOpen, profile?.status])

  const flagSaved = useCallback(() => {
    setSaved(true)
    globalThis.setTimeout(() => setSaved(false), 2000)
  }, [])

  const save = useCallback(async () => {
    const value = draft.trim()
    if (value === (profile?.brief_text ?? '')) return
    setIsSaving(true)
    setError(null)
    try {
      const next = await client.updateUserProfileBrief(value)
      applyProfile(next)
      flagSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings-profile-error-save'))
    } finally {
      setIsSaving(false)
    }
  }, [applyProfile, client, draft, flagSaved, profile?.brief_text])

  const regenerate = useCallback(async () => {
    setIsRegenerating(true)
    setError(null)
    try {
      const next = await client.regenerateUserProfileBrief()
      applyProfile(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings-profile-error-regenerate'))
    } finally {
      setIsRegenerating(false)
    }
  }, [applyProfile, client])

  if (isLoading) {
    return (
      <div className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-muted/20 gba:p-3">
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
          <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
          {t('settings-profile-loading')}
        </div>
      </div>
    )
  }

  const status = profile?.status ?? 'missing'
  const isGenerating = status === 'generating'

  const statusIcon = (() => {
    if (status === 'failed') {
      return <WarningCircleIcon className="gba:h-3.5 gba:w-3.5 gba:text-destructive" />
    }
    if (status === 'ready' || status === 'edited') {
      return <CheckCircleIcon className="gba:h-3.5 gba:w-3.5 gba:text-emerald-600" weight="fill" />
    }
    return <SpinnerGapIcon className={`gba:h-3.5 gba:w-3.5 ${isGenerating ? 'gba:animate-spin' : ''}`} />
  })()

  return (
    <div className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-muted/20 gba:p-3 gba:space-y-3">
      <div className="gba:flex gba:flex-wrap gba:items-start gba:justify-between gba:gap-2">
        <div>
          <div className="gba:flex gba:items-center gba:gap-1.5">
            <span className="gba:text-xs gba:font-semibold gba:text-foreground">{t('settings-profile-about')}</span>
            {saved && (
              <span className="gba:inline-flex gba:items-center gba:gap-0.5 gba:text-[10px] gba:text-emerald-600">
                <CheckCircleIcon className="gba:h-3 gba:w-3" weight="fill" />
                {t('section-saved')}
              </span>
            )}
            {(isSaving || isGenerating) && (
              <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin gba:text-muted-foreground" />
            )}
          </div>
          <p className="gba:mt-1 gba:text-xs gba:text-muted-foreground">{t('settings-profile-desc')}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            regenerate()
          }}
          disabled={isRegenerating || isGenerating}
          className="gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-lg gba:border gba:border-border/60 gba:px-2.5 gba:py-1 gba:text-xs gba:font-medium gba:text-muted-foreground gba:transition-colors gba:hover:bg-background disabled:gba:opacity-50"
          data-testid="pref-user-profile-regenerate"
        >
          {isRegenerating ? (
            <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin" />
          ) : (
            <ArrowsClockwiseIcon className="gba:h-3 gba:w-3" />
          )}
          {t('settings-profile-regenerate')}
        </button>
      </div>

      <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-[11px] gba:text-muted-foreground">
        {statusIcon}
        <span>{t(STATUS_LABEL_KEYS[status])}</span>
        {profile?.updated_at && (
          <span>{t('settings-profile-updated', { date: new Date(profile.updated_at).toLocaleString() })}</span>
        )}
      </div>

      <textarea
        value={draft}
        onChange={event => setDraft(event.target.value)}
        onBlur={() => {
          save()
        }}
        placeholder={t('settings-profile-placeholder')}
        rows={5}
        disabled={isGenerating}
        className="gba:w-full gba:resize-y gba:rounded-lg gba:border gba:border-border/60 gba:bg-background gba:px-2.5 gba:py-2 gba:text-sm gba:leading-relaxed gba:text-foreground gba:outline-none gba:focus:ring-2 gba:focus:ring-ring disabled:gba:opacity-70"
        data-testid="pref-user-profile-brief"
      />

      {error && (
        <p className="gba:flex gba:items-start gba:gap-1.5 gba:text-[11px] gba:text-destructive">
          <WarningCircleIcon className="gba:mt-0.5 gba:h-3.5 gba:w-3.5 gba:shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
