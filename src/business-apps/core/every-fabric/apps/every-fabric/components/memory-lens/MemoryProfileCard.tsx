import React, { useMemo, useState } from 'react'
import { Badge, Button } from '@newwork/nw-design-system'
import { ArrowsClockwiseIcon, CaretDownIcon, CaretRightIcon, UserCircleIcon } from '@phosphor-icons/react'
import type { UserProfileBrief } from '../../hooks/useEnterpriseAgentClient'
import { relativeDate } from './memoryLensModel'

interface MemoryProfileCardProps {
  profile: UserProfileBrief | null
  regenerating: boolean
  onRegenerate: () => void
}

type BadgeVariant = 'success' | 'info' | 'warning' | 'destructive' | 'secondary'

const STATUS_VARIANT: Record<UserProfileBrief['status'], BadgeVariant> = {
  ready: 'success',
  edited: 'info',
  generating: 'warning',
  failed: 'destructive',
  missing: 'secondary'
}

const STATUS_LABEL: Record<UserProfileBrief['status'], string> = {
  ready: 'Ready',
  edited: 'Edited',
  generating: 'Generating',
  failed: 'Failed',
  missing: 'Not generated'
}

const hasFacts = (facts: Record<string, unknown> | undefined): boolean =>
  Boolean(facts && Object.keys(facts).length > 0)

export const MemoryProfileCard: React.FC<MemoryProfileCardProps> = ({ profile, regenerating, onRegenerate }) => {
  const [showFacts, setShowFacts] = useState(false)

  const factsJson = useMemo(
    () => (hasFacts(profile?.source_facts) ? JSON.stringify(profile?.source_facts, null, 2) : ''),
    [profile?.source_facts]
  )

  const briefText = profile?.brief_text?.trim() || profile?.generated_brief_text?.trim() || ''
  const generatedWhen = relativeDate(profile?.generated_at ?? profile?.updated_at ?? undefined)

  return (
    <section
      className="gba:rounded-2xl gba:border gba:border-border/60 gba:bg-card gba:p-4 sm:gba:p-5"
      data-testid="memory-lens-profile"
    >
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
        <div className="gba:flex gba:items-center gba:gap-2.5 gba:min-w-0">
          <UserCircleIcon className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:shrink-0" />
          <div className="gba:min-w-0">
            <h2 className="gba:text-sm gba:font-semibold gba:text-foreground">Profile brief</h2>
            <p className="gba:text-[12px] gba:text-muted-foreground gba:truncate">
              The agent&apos;s natural-language summary of who you are.
            </p>
          </div>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:shrink-0">
          {profile && <Badge variant={STATUS_VARIANT[profile.status]}>{STATUS_LABEL[profile.status]}</Badge>}
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={regenerating}
            data-testid="memory-lens-regenerate"
          >
            <ArrowsClockwiseIcon
              className={`gba:h-3.5 gba:w-3.5 gba:mr-1.5 ${regenerating ? 'gba:animate-spin' : ''}`}
            />
            {regenerating ? 'Regenerating' : 'Regenerate'}
          </Button>
        </div>
      </div>

      <div className="gba:mt-3">
        {briefText ? (
          <p className="gba:whitespace-pre-wrap gba:text-[13px] gba:leading-relaxed gba:text-foreground">{briefText}</p>
        ) : (
          <p className="gba:text-[13px] gba:text-muted-foreground">
            No profile brief yet. It is generated from your workspace facts and recent sessions — use Regenerate to
            build one.
          </p>
        )}
      </div>

      <div className="gba:mt-3 gba:flex gba:flex-wrap gba:items-center gba:gap-x-4 gba:gap-y-1 gba:text-[11px] gba:text-muted-foreground/80">
        {profile?.model && <span>Model: {profile.model}</span>}
        {generatedWhen && <span>Updated {generatedWhen}</span>}
        {typeof profile?.generation_version === 'number' && <span>v{profile.generation_version}</span>}
      </div>

      {profile?.status === 'failed' && profile.last_error && (
        <p className="gba:mt-2 gba:text-[12px] gba:text-destructive">{profile.last_error}</p>
      )}

      {factsJson && (
        <div className="gba:mt-3 gba:border-t gba:border-border/50 gba:pt-3">
          <button
            type="button"
            onClick={() => setShowFacts(value => !value)}
            className="gba:inline-flex gba:items-center gba:gap-1.5 gba:text-[12px] gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
            data-testid="memory-lens-facts-toggle"
          >
            {showFacts ? (
              <CaretDownIcon className="gba:h-3.5 gba:w-3.5" />
            ) : (
              <CaretRightIcon className="gba:h-3.5 gba:w-3.5" />
            )}
            Source facts
          </button>
          {showFacts && (
            <pre className="gba:mt-2 gba:max-h-64 gba:overflow-auto gba:rounded-lg gba:bg-muted/40 gba:p-3 gba:text-[11px] gba:leading-relaxed gba:text-muted-foreground">
              {factsJson}
            </pre>
          )}
        </div>
      )}
    </section>
  )
}
