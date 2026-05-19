import { LightbulbIcon, XIcon } from '@phosphor-icons/react'
import type { MeshEdge, MeshNode } from '../../utils/traceModel'

interface SkillInfo {
  nodeId: string
  name: string
  category?: string
  description?: string
  wasAutoDetected?: boolean
}

interface MeshNodeDetailPopoverProps {
  node: MeshNode
  inboundEdges: MeshEdge[]
  outboundEdges: MeshEdge[]
  /** Skills loaded by this node (for agent/expert nodes). */
  skills: SkillInfo[]
  onClose: () => void
  /** Focus a skill node on the canvas. */
  onFocusSkill?: (nodeId: string) => void
}

function formatDuration(ms: number): string | null {
  if (!ms || ms <= 0) return null
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.round((ms - minutes * 60_000) / 1000)
  return `${minutes}m ${seconds}s`
}

function formatTime(iso: string): string {
  if (!iso) return '—'
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) return iso
  return new Date(parsed).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export const MeshNodeDetailPopover: React.FC<MeshNodeDetailPopoverProps> = ({
  node,
  inboundEdges,
  outboundEdges,
  skills,
  onClose,
  onFocusSkill
}) => {
  const duration = formatDuration(node.totalDurationMs)

  return (
    <div
      className="gba:w-[300px] gba:max-w-[calc(100vw-2rem)] gba:rounded-[1.25rem] gba:border gba:border-border/60 gba:bg-card gba:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_36px_-16px_rgba(15,23,42,0.18)]"
      data-testid="mesh-node-detail-popover"
      role="dialog"
      aria-label={`Node detail: ${node.label}`}
    >
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-2 gba:px-4 gba:pt-3 gba:pb-2">
        <div className="gba:min-w-0 gba:flex-1">
          <p className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.1em] gba:text-muted-foreground">
            {node.kind}
          </p>
          <h3 className="gba:mt-0.5 gba:truncate gba:text-sm gba:font-semibold gba:text-foreground">{node.label}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail"
          className="gba:inline-flex gba:items-center gba:justify-center gba:h-7 gba:w-7 gba:rounded-lg gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
          data-testid="mesh-node-detail-close"
        >
          <XIcon className="gba:h-3.5 gba:w-3.5" />
        </button>
      </div>

      {node.description && (
        <p className="gba:px-4 gba:pb-2 gba:text-[12px] gba:leading-snug gba:text-muted-foreground">
          {node.description}
        </p>
      )}

      <dl className="gba:grid gba:grid-cols-2 gba:gap-x-3 gba:gap-y-2 gba:border-t gba:border-border/40 gba:px-4 gba:py-3 gba:text-[11px]">
        <div>
          <dt className="gba:text-muted-foreground/80">Status</dt>
          <dd className="gba:font-medium gba:text-foreground">{node.status}</dd>
        </div>
        <div>
          <dt className="gba:text-muted-foreground/80">Invocations</dt>
          <dd className="gba:font-medium gba:text-foreground">{node.invocationCount}</dd>
        </div>
        {duration && (
          <div>
            <dt className="gba:text-muted-foreground/80">Duration</dt>
            <dd className="gba:font-medium gba:text-foreground">{duration}</dd>
          </div>
        )}
        {node.firstSeenAt && (
          <div>
            <dt className="gba:text-muted-foreground/80">First seen</dt>
            <dd className="gba:font-medium gba:text-foreground">{formatTime(node.firstSeenAt)}</dd>
          </div>
        )}
      </dl>

      {(inboundEdges.length > 0 || outboundEdges.length > 0) && (
        <div className="gba:border-t gba:border-border/40 gba:px-4 gba:py-3 gba:text-[11px]">
          {inboundEdges.length > 0 && (
            <div className="gba:mb-2">
              <p className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.1em] gba:text-muted-foreground gba:mb-1">
                Inbound ({inboundEdges.length})
              </p>
              <ul className="gba:space-y-1">
                {inboundEdges.slice(0, 4).map(edge => (
                  <li key={edge.id} className="gba:truncate gba:text-foreground/80">
                    ← {edge.label ?? edge.kind}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {outboundEdges.length > 0 && (
            <div>
              <p className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.1em] gba:text-muted-foreground gba:mb-1">
                Outbound ({outboundEdges.length})
              </p>
              <ul className="gba:space-y-1">
                {outboundEdges.slice(0, 4).map(edge => (
                  <li key={edge.id} className="gba:truncate gba:text-foreground/80">
                    → {edge.label ?? edge.kind}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {skills.length > 0 && (
        <div className="gba:border-t gba:border-border/40 gba:px-4 gba:py-3 gba:text-[11px]">
          <p className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.1em] gba:text-muted-foreground gba:mb-2">
            Skills ({skills.length})
          </p>
          <ul className="gba:space-y-2">
            {skills.map(skill => (
              <li key={skill.nodeId}>
                <button
                  type="button"
                  onClick={() => onFocusSkill?.(skill.nodeId)}
                  className="gba:flex gba:items-start gba:gap-2 gba:w-full gba:text-left gba:rounded-md gba:p-1.5 gba:-mx-1.5 gba:hover:bg-muted/40 gba:transition-colors gba:group/skill"
                  data-testid={`popover-skill-${skill.name}`}
                >
                  <span className="gba:flex gba:h-5 gba:w-5 gba:items-center gba:justify-center gba:rounded-md gba:bg-teal-500/10 gba:text-teal-600 dark:gba:text-teal-400 gba:shrink-0 gba:mt-px">
                    <LightbulbIcon className="gba:h-3 gba:w-3" weight="bold" />
                  </span>
                  <div className="gba:min-w-0 gba:flex-1">
                    <p className="gba:font-medium gba:text-foreground gba:truncate gba:group-hover/skill:text-primary gba:transition-colors">
                      {skill.name}
                    </p>
                    {skill.category && (
                      <span className="gba:text-[9px] gba:uppercase gba:tracking-wider gba:text-muted-foreground">
                        {skill.category}
                      </span>
                    )}
                    {skill.description && (
                      <p className="gba:text-[10px] gba:text-muted-foreground gba:leading-snug gba:mt-0.5 gba:line-clamp-2">
                        {skill.description}
                      </p>
                    )}
                    {skill.wasAutoDetected && (
                      <span className="gba:inline-flex gba:items-center gba:mt-1 gba:px-1.5 gba:py-0.5 gba:rounded-full gba:bg-emerald-500/10 gba:text-[9px] gba:font-medium gba:text-emerald-600 dark:gba:text-emerald-400">
                        Auto-detected
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
