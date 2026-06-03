import React, { useCallback, useEffect, useState } from 'react'
import { ClockCounterClockwise, UploadSimple } from '@phosphor-icons/react'
import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'
import type { AdminSkill, SkillVersionSummary } from '../../types/enterpriseAgent'

export interface SkillVersionHistoryProps {
  accessToken: string
  skillId: string | null
  head?: Pick<AdminSkill, 'version' | 'published_version' | 'is_active'> | null
  refreshKey?: number
  onPreviewVersion?: (version: number, content: string) => void
  onRestored?: () => void
  onPublished?: () => void
  publishDisabled?: boolean
  publishDisabledReason?: string
  showToast?: (message: string, variant: 'success' | 'error') => void
}

export const SkillVersionHistory: React.FC<SkillVersionHistoryProps> = ({
  accessToken,
  skillId,
  head,
  refreshKey,
  onPreviewVersion,
  onRestored,
  onPublished,
  publishDisabled = false,
  publishDisabledReason,
  showToast
}) => {
  const client = useEnterpriseAgentClient(accessToken)
  const [versions, setVersions] = useState<SkillVersionSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [busyVersion, setBusyVersion] = useState<number | null>(null)

  const loadVersions = useCallback(async () => {
    if (!skillId) {
      setVersions([])
      return
    }
    setLoading(true)
    try {
      const rows = await client.listSkillVersions(skillId)
      setVersions(rows)
    } catch {
      setVersions([])
      showToast?.('Failed to load version history', 'error')
    } finally {
      setLoading(false)
    }
  }, [skillId, client, showToast])

  useEffect(() => {
    void loadVersions()
  }, [loadVersions, refreshKey])

  const handlePreview = useCallback(
    async (version: number) => {
      if (!skillId) return
      try {
        const row = await client.getSkillVersion(skillId, version)
        onPreviewVersion?.(version, row.content)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        showToast?.(`Failed to load version: ${msg}`, 'error')
      }
    },
    [skillId, client, onPreviewVersion, showToast]
  )

  const handleRestore = useCallback(
    async (version: number) => {
      if (!skillId) return
      if (!window.confirm(`Restore version ${version} into a new draft?`)) return
      setBusyVersion(version)
      try {
        await client.restoreSkillVersion(skillId, version)
        showToast?.(`Restored v${version} as new draft`, 'success')
        onRestored?.()
        void loadVersions()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        showToast?.(`Restore failed: ${msg}`, 'error')
      } finally {
        setBusyVersion(null)
      }
    },
    [skillId, client, onRestored, showToast, loadVersions]
  )

  const handlePublish = useCallback(
    async (version: number) => {
      if (!skillId) return
      if (publishDisabled) {
        showToast?.(publishDisabledReason ?? 'Save the current draft before publishing.', 'error')
        return
      }
      setBusyVersion(version)
      try {
        await client.publishSkillVersion(skillId, version)
        showToast?.(`Published v${version}`, 'success')
        onPublished?.()
        void loadVersions()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        showToast?.(`Publish failed: ${msg}`, 'error')
      } finally {
        setBusyVersion(null)
      }
    },
    [skillId, publishDisabled, publishDisabledReason, client, onPublished, showToast, loadVersions]
  )

  if (!skillId) return null

  return (
    <div
      className="gba:rounded-lg gba:border gba:border-border gba:bg-muted/15 gba:p-3"
      data-testid="skill-version-history"
    >
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:mb-2">
        <div className="gba:flex gba:items-center gba:gap-1.5">
          <ClockCounterClockwise className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
          <p className="gba:text-xs gba:font-semibold gba:text-foreground">Version history</p>
        </div>
        {head && (
          <p className="gba:text-[10px] gba:text-muted-foreground">
            Draft v{head.version}
            {head.published_version != null ? ` · Published v${head.published_version}` : ' · Unpublished'}
            {head.is_active ? ' · Live' : ''}
          </p>
        )}
      </div>
      {loading ? (
        <p className="gba:text-xs gba:text-muted-foreground">Loading versions…</p>
      ) : versions.length === 0 ? (
        <p className="gba:text-xs gba:text-muted-foreground">No versions yet.</p>
      ) : (
        <ul className="gba:space-y-1.5 gba:max-h-40 gba:overflow-y-auto">
          {versions.map(row => (
            <li
              key={row.version}
              className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:rounded-md gba:border gba:border-border/60 gba:bg-background gba:px-2 gba:py-1.5"
              data-testid={`skill-version-row-${row.version}`}
            >
              <button
                type="button"
                className="gba:min-w-0 gba:flex-1 gba:text-left"
                onClick={() => void handlePreview(row.version)}
              >
                <span className="gba:text-xs gba:font-medium">
                  v{row.version}
                  {row.is_published_pointer && (
                    <span className="gba:ml-1 gba:text-[10px] gba:text-primary">published</span>
                  )}
                  {row.is_current && <span className="gba:ml-1 gba:text-[10px] gba:text-muted-foreground">draft</span>}
                </span>
                {row.note && (
                  <span className="gba:block gba:text-[10px] gba:text-muted-foreground gba:truncate">{row.note}</span>
                )}
              </button>
              <div className="gba:flex gba:shrink-0 gba:items-center gba:gap-1">
                <button
                  type="button"
                  className="gba:text-[10px] gba:px-1.5 gba:py-0.5 gba:rounded gba:border gba:border-border gba:hover:bg-muted"
                  disabled={busyVersion === row.version}
                  onClick={() => void handleRestore(row.version)}
                  data-testid={`skill-version-restore-${row.version}`}
                >
                  Restore
                </button>
                <button
                  type="button"
                  className="gba:inline-flex gba:items-center gba:gap-0.5 gba:text-[10px] gba:px-1.5 gba:py-0.5 gba:rounded gba:border gba:border-primary/40 gba:text-primary gba:hover:bg-primary/10"
                  disabled={busyVersion === row.version || publishDisabled}
                  title={publishDisabled ? publishDisabledReason : undefined}
                  onClick={() => void handlePublish(row.version)}
                  data-testid={`skill-version-publish-${row.version}`}
                >
                  <UploadSimple className="gba:h-3 gba:w-3" />
                  Publish
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
