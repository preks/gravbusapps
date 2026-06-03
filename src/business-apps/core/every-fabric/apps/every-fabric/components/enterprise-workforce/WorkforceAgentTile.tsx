// Workforce agent tile — minimal, modern, professional.
//
// Design intent:
//   - No glows, no gradient washes, no decorative rails.
//   - Each agent's accent colour is used only on the small avatar block.
//   - Active agents are visually distinct via a subtle green dot on the
//     avatar plus an "Active" pill in the header; the primary action
//     becomes a passive "Activated" indicator instead of "Run task".
//   - The card is hover-aware (border darkens slightly) but stays flat.

import { Button } from '@newwork/nw-design-system'
import { ArchiveIcon, CheckIcon, GearSixIcon, PlusIcon, SparkleIcon } from '@phosphor-icons/react'
import { getSourceDisplay } from '../agents/agentSourceUtils'
import type { FabricAgent } from '../agents/agentTypes'

export type WorkforceTileStatus = 'active' | 'inactive' | 'builtin' | 'archived'

interface WorkforceAgentTileProps {
  agent: FabricAgent
  status: WorkforceTileStatus
  isActivating?: boolean
  isArchiving?: boolean
  onActivate?: (agent: FabricAgent) => void
  onArchive?: (agent: FabricAgent) => void
  onConfigure?: (agent: FabricAgent) => void
  /** Optional 0-100 confidence shown as a corner badge when AI matching is active. */
  matchConfidence?: number
  /** Position 1-based within a ranked list. */
  matchRank?: number
}

function formatAgentName(name: string): string {
  return name.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function resolveInitials(name: string): string {
  const parts = name.replace(/[_-]/g, ' ').split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function getStatusPill(status: WorkforceTileStatus): { label: string; className: string } {
  switch (status) {
    case 'active':
      return {
        label: 'Active',
        className: 'gba:bg-emerald-50 gba:text-emerald-700'
      }
    case 'inactive':
      return {
        label: 'Inactive',
        className: 'gba:bg-muted gba:text-muted-foreground'
      }
    case 'builtin':
      return {
        label: 'Built-in',
        className: 'gba:bg-amber-50 gba:text-amber-700'
      }
    case 'archived':
      return {
        label: 'Archived',
        className: 'gba:bg-muted gba:text-muted-foreground'
      }
  }
}

interface MatchBadgeProps {
  confidence: number
  rank?: number
}

const MatchBadge: React.FC<MatchBadgeProps> = ({ confidence, rank }) => {
  if (rank === 1) {
    return (
      <span className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:bg-foreground gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wider gba:text-background">
        <SparkleIcon className="gba:h-3 gba:w-3" weight="fill" />
        Best match
      </span>
    )
  }
  return (
    <span className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:bg-muted gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:text-muted-foreground">
      <SparkleIcon className="gba:h-3 gba:w-3" />
      {confidence}%
    </span>
  )
}

export const WorkforceAgentTile: React.FC<WorkforceAgentTileProps> = ({
  agent,
  status,
  isActivating = false,
  isArchiving = false,
  onActivate,
  onArchive,
  onConfigure,
  matchConfidence,
  matchRank
}) => {
  const displayName = formatAgentName(agent.name)
  const sourceDisplay = getSourceDisplay(agent.source)
  const accentColor = agent.color ?? '#6366f1'
  const statusPill = getStatusPill(status)
  const isActive = status === 'active'
  const isBuiltin = status === 'builtin'
  const isArchived = status === 'archived'
  const canArchive = isActive && (agent.source === 'prompt_odm' || agent.source === 'autonomous_agent')
  const isTopMatch = matchRank === 1

  return (
    <div
      className={`gba:group gba:relative gba:flex gba:flex-col gba:rounded-xl gba:border gba:bg-card gba:transition-colors gba:duration-150 ${
        isTopMatch ? 'gba:border-foreground/30' : 'gba:border-border gba:hover:border-foreground/20'
      } ${isArchived ? 'gba:opacity-75' : ''}`}
      data-testid={`workforce-agent-tile-${agent.id}`}
    >
      <div className="gba:flex gba:flex-1 gba:flex-col gba:p-4">
        {/* Header */}
        <div className="gba:flex gba:items-start gba:gap-3">
          <div className="gba:relative gba:shrink-0">
            <div
              className="gba:flex gba:h-10 gba:w-10 gba:items-center gba:justify-center gba:rounded-lg gba:text-xs gba:font-semibold gba:text-white"
              style={{ backgroundColor: accentColor }}
            >
              {resolveInitials(agent.name)}
            </div>
            {isActive && (
              <span
                aria-hidden
                className="gba:absolute gba:-bottom-0.5 gba:-right-0.5 gba:h-2.5 gba:w-2.5 gba:rounded-full gba:border-2 gba:border-card gba:bg-emerald-500"
              />
            )}
          </div>

          <div className="gba:flex-1 gba:min-w-0">
            <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
              <h3 className="gba:truncate gba:text-sm gba:font-semibold gba:text-foreground">{displayName}</h3>
              {matchConfidence !== undefined ? (
                <MatchBadge confidence={matchConfidence} rank={matchRank} />
              ) : (
                <span
                  className={`gba:shrink-0 gba:rounded-full gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium ${statusPill.className}`}
                >
                  {statusPill.label}
                </span>
              )}
            </div>
            <p className="gba:mt-0.5 gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
              <span
                className={`gba:inline-flex gba:items-center gba:rounded-full gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium ${sourceDisplay.badgeClass}`}
              >
                {sourceDisplay.label}
              </span>
              {agent.specialty && (
                <span className="gba:truncate" title={agent.specialty}>
                  · {agent.specialty}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="gba:mt-3 gba:line-clamp-2 gba:min-h-[2.5rem] gba:text-sm gba:leading-relaxed gba:text-muted-foreground">
          {agent.description || 'No description provided yet.'}
        </p>

        {/* Action row pinned at the bottom */}
        <div className="gba:mt-4 gba:flex gba:items-center gba:gap-2">
          {isActive ? (
            <>
              <div
                className="gba:flex gba:h-9 gba:flex-1 gba:items-center gba:justify-center gba:gap-1.5 gba:rounded-md gba:border gba:border-emerald-200 gba:bg-emerald-50 gba:text-xs gba:font-medium gba:text-emerald-700"
                data-testid={`workforce-agent-activated-${agent.id}`}
              >
                <CheckIcon className="gba:h-3.5 gba:w-3.5" weight="bold" />
                Activated
              </div>
              {onConfigure && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onConfigure(agent)}
                  data-testid={`workforce-agent-configure-${agent.id}`}
                  aria-label="Configure agent"
                >
                  <GearSixIcon className="gba:h-3.5 gba:w-3.5" />
                </Button>
              )}
              {canArchive && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isArchiving}
                  onClick={() => onArchive?.(agent)}
                  data-testid={`workforce-agent-archive-${agent.id}`}
                  aria-label="Archive agent"
                >
                  <ArchiveIcon className="gba:h-3.5 gba:w-3.5" />
                </Button>
              )}
            </>
          ) : isBuiltin ? (
            <div className="gba:flex gba:h-9 gba:flex-1 gba:items-center gba:justify-center gba:rounded-md gba:bg-muted/50 gba:text-xs gba:text-muted-foreground">
              Activated automatically
            </div>
          ) : (
            <Button
              size="sm"
              className="gba:flex-1"
              disabled={isActivating}
              onClick={() => onActivate?.(agent)}
              data-testid={`workforce-agent-activate-${agent.id}`}
            >
              <PlusIcon className="gba:mr-1 gba:h-3.5 gba:w-3.5" />
              {isActivating ? 'Activating…' : 'Activate'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
