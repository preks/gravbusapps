import React from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { ArrowsClockwiseIcon } from '@phosphor-icons/react'
import type { UserProfileBrief } from '../../hooks/useEnterpriseAgentClient'
import { relativeDate } from './memoryLensModel'
import translations from '../../_i18n'

interface MemoryProfileCardProps {
  profile: UserProfileBrief | null
  regenerating: boolean
  onRegenerate: () => void
}

const STATUS_DOT: Record<UserProfileBrief['status'], string> = {
  ready: 'gba:bg-success',
  edited: 'gba:bg-info',
  generating: 'gba:bg-warning',
  failed: 'gba:bg-destructive',
  missing: 'gba:bg-muted-foreground'
}

const STATUS_LABEL: Record<UserProfileBrief['status'], string> = {
  ready: 'Up to date',
  edited: 'Edited',
  generating: 'Generating',
  failed: 'Failed',
  missing: 'Not generated'
}

export const MemoryProfileCard: React.FC<MemoryProfileCardProps> = ({ profile, regenerating, onRegenerate }) => {
  const { t } = useTranslation(translations)
  const briefText = profile?.brief_text?.trim() || profile?.generated_brief_text?.trim() || ''
  const generatedWhen = relativeDate(profile?.generated_at ?? profile?.updated_at ?? undefined, t)

  return (
    <section className="gba:rounded-2xl gba:bg-card gba:p-6 sm:gba:p-8" data-testid="memory-lens-profile">
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
        <div className="gba:flex gba:items-center gba:gap-2.5">
          <span className="gba:text-xs gba:font-medium gba:uppercase gba:tracking-[0.12em] gba:text-muted-foreground">
            Memory brief
          </span>
          {profile && (
            <span className="gba:inline-flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground">
              <span className={`gba:h-1.5 gba:w-1.5 gba:rounded-full ${STATUS_DOT[profile.status]}`} aria-hidden="true" />
              {STATUS_LABEL[profile.status]}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          disabled={regenerating}
          data-testid="memory-lens-regenerate"
        >
          <ArrowsClockwiseIcon className={`gba:h-3.5 gba:w-3.5 gba:mr-1.5 ${regenerating ? 'gba:animate-spin' : ''}`} />
          {regenerating ? 'Regenerating' : 'Regenerate'}
        </Button>
      </div>

      <div className="gba:mt-4 gba:max-w-3xl">
        {briefText ? (
          <p className="gba:whitespace-pre-wrap gba:text-[15px] gba:leading-7 gba:text-foreground sm:gba:text-base">
            {briefText}
          </p>
        ) : (
          <p className="gba:text-[15px] gba:leading-7 gba:text-muted-foreground">
            Every hasn&apos;t written a brief yet. It builds one from your sessions and saved facts. Select Regenerate
            to create it.
          </p>
        )}
      </div>

      {generatedWhen && <p className="gba:mt-5 gba:text-xs gba:text-muted-foreground">Updated {generatedWhen}</p>}

      {profile?.status === 'failed' && profile.last_error && (
        <p className="gba:mt-2 gba:text-xs gba:text-destructive">{profile.last_error}</p>
      )}
    </section>
  )
}
