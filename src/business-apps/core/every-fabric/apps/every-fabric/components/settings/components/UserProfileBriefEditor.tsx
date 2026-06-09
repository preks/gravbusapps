import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowsClockwiseIcon, CheckCircleIcon, SpinnerGapIcon, WarningCircleIcon } from '@phosphor-icons/react'
import type { useEnterpriseAgentClient, UserProfileBrief } from '../../../hooks/useEnterpriseAgentClient'

interface UserProfileBriefEditorProps {
  client: ReturnType<typeof useEnterpriseAgentClient>
  isOpen: boolean
}

const statusLabel: Record<UserProfileBrief['status'], string> = {
  missing: 'Not generated yet',
  generating: 'Generating from employee data...',
  ready: 'Generated from employee data',
  failed: 'Could not generate',
  edited: 'Edited by you'
}

export const UserProfileBriefEditor: React.FC<UserProfileBriefEditorProps> = ({ client, isOpen }) => {
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
      setError(err instanceof Error ? err.message : 'Could not load your profile memory.')
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
      setError(err instanceof Error ? err.message : 'Could not save your profile memory.')
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
      setError(err instanceof Error ? err.message : 'Could not start profile generation.')
    } finally {
      setIsRegenerating(false)
    }
  }, [applyProfile, client])

  if (isLoading) {
    return (
      <div className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-muted/20 gba:p-3">
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
          <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin" />
          Loading your profile memory...
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
            <span className="gba:text-xs gba:font-semibold gba:text-foreground">About you</span>
            {saved && (
              <span className="gba:inline-flex gba:items-center gba:gap-0.5 gba:text-[10px] gba:text-emerald-600">
                <CheckCircleIcon className="gba:h-3 gba:w-3" weight="fill" />
                Saved
              </span>
            )}
            {(isSaving || isGenerating) && (
              <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin gba:text-muted-foreground" />
            )}
          </div>
          <p className="gba:mt-1 gba:text-xs gba:text-muted-foreground">
            Generated from your employee record so enterprise agents understand your role, team, manager, and skills.
          </p>
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
          Regenerate
        </button>
      </div>

      <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-[11px] gba:text-muted-foreground">
        {statusIcon}
        <span>{statusLabel[status]}</span>
        {profile?.updated_at && <span>Updated {new Date(profile.updated_at).toLocaleString()}</span>}
      </div>

      <textarea
        value={draft}
        onChange={event => setDraft(event.target.value)}
        onBlur={() => {
          save()
        }}
        placeholder="Your profile memory will appear here after it is generated from employee data."
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
