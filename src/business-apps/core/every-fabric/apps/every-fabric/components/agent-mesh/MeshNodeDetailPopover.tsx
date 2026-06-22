import { ArrowRightIcon, LightbulbIcon, UserIcon, ClockIcon, XIcon } from '@phosphor-icons/react'
import type { MeshEdge, MeshNode } from '../../utils/traceModel'
import type { AggregateNodeProvenance, AggregateSessionRef } from '../../utils/meshAggregateModel'
import { useAgentMeshI18n } from './useAgentMeshI18n'

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
  skills: SkillInfo[]
  onClose: () => void
  onFocusSkill?: (nodeId: string) => void
  onDrillToUser?: (userId: string) => void
  onDrillToSession?: (sessionId: string) => void
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

function formatDate(iso: string): string {
  if (!iso) return '—'
  const parsed = Date.parse(iso)
  if (Number.isNaN(parsed)) return iso
  return new Date(parsed).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const MeshNodeDetailPopover: React.FC<MeshNodeDetailPopoverProps> = ({
  node,
  inboundEdges,
  outboundEdges,
  skills,
  onClose,
  onFocusSkill,
  onDrillToUser,
  onDrillToSession
}) => {
  const { t, nodeCategoryLabel, edgeKindLabel } = useAgentMeshI18n()
  const duration = formatDuration(node.totalDurationMs)

  const users: AggregateNodeProvenance[] = (node as { users?: AggregateNodeProvenance[] }).users ?? []
  const sessions: AggregateSessionRef[] = (node as { sessions?: AggregateSessionRef[] }).sessions ?? []
  const hasProvenance = users.length > 0 || sessions.length > 0

  return (
    <div
      className="gba:w-[300px] gba:max-h-[420px] gba:overflow-y-auto gba:max-w-[calc(100vw-2rem)] gba:rounded-[1.25rem] gba:border gba:border-border/60 gba:bg-card gba:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_36px_-16px_rgba(15,23,42,0.18)]"
      data-testid="mesh-node-detail-popover"
      role="dialog"
      aria-label={t('agent-mesh-node-detail-aria', { label: node.label })}
    >
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-2 gba:px-4 gba:pt-3 gba:pb-2">
        <div className="gba:min-w-0 gba:flex-1">
          <p className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.1em] gba:text-muted-foreground">
            {nodeCategoryLabel(node.kind)}
          </p>
          <h3 className="gba:mt-0.5 gba:truncate gba:text-sm gba:font-semibold gba:text-foreground">{node.label}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('agent-mesh-node-detail-close')}
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
          <dt className="gba:text-muted-foreground/80">{t('agent-mesh-node-detail-status')}</dt>
          <dd className="gba:font-medium gba:text-foreground">{node.status}</dd>
        </div>
        <div>
          <dt className="gba:text-muted-foreground/80">{t('agent-mesh-node-detail-invocations')}</dt>
          <dd className="gba:font-medium gba:text-foreground">{node.invocationCount}</dd>
        </div>
        {duration && (
          <div>
            <dt className="gba:text-muted-foreground/80">{t('agent-mesh-node-detail-duration')}</dt>
            <dd className="gba:font-medium gba:text-foreground">{duration}</dd>
          </div>
        )}
        {node.firstSeenAt && (
          <div>
            <dt className="gba:text-muted-foreground/80">{t('agent-mesh-node-detail-first-seen')}</dt>
            <dd className="gba:font-medium gba:text-foreground">{formatTime(node.firstSeenAt)}</dd>
          </div>
        )}
      </dl>

      {hasProvenance && (
        <div className="gba:border-t gba:border-border/40 gba:px-4 gba:py-3 gba:text-[11px]">
          {users.length > 0 && onDrillToUser && (
            <div className="gba:mb-2">
              <p className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.1em] gba:text-muted-foreground gba:mb-1.5">
                {t('agent-mesh-node-detail-used-by', { count: users.length })}
              </p>
              <ul className="gba:space-y-1">
                {users.slice(0, 5).map(user => (
                  <li key={user.userId}>
                    <button
                      type="button"
                      onClick={() => onDrillToUser(user.userId)}
                      className="gba:flex gba:items-center gba:gap-2 gba:w-full gba:text-left gba:rounded-md gba:p-1.5 gba:-mx-1.5 gba:hover:bg-muted/40 gba:transition-colors gba:group/user"
                      data-testid={`popover-user-${user.userId}`}
                    >
                      <UserIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:shrink-0" />
                      <span className="gba:flex-1 gba:truncate gba:text-foreground gba:group-hover/user:text-primary gba:transition-colors">
                        {user.displayName || user.userId.slice(0, 8) + '…'}
                      </span>
                      <span className="gba:text-[9px] gba:text-muted-foreground gba:shrink-0">
                        {user.invocationCount}×
                      </span>
                      <ArrowRightIcon className="gba:h-3 gba:w-3 gba:text-muted-foreground/60 gba:shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {sessions.length > 0 && onDrillToSession && (
            <div>
              <p className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.1em] gba:text-muted-foreground gba:mb-1.5">
                {t('agent-mesh-node-detail-sessions', { count: sessions.length })}
              </p>
              <ul className="gba:space-y-1">
                {sessions.slice(0, 5).map(session => (
                  <li key={session.sessionId}>
                    <button
                      type="button"
                      onClick={() => onDrillToSession(session.sessionId)}
                      className="gba:flex gba:items-center gba:gap-2 gba:w-full gba:text-left gba:rounded-md gba:p-1.5 gba:-mx-1.5 gba:hover:bg-muted/40 gba:transition-colors gba:group/session"
                      data-testid={`popover-session-${session.sessionId}`}
                    >
                      <ClockIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:shrink-0" />
                      <span className="gba:flex-1 gba:truncate gba:text-foreground gba:group-hover/session:text-primary gba:transition-colors">
                        {session.title || session.sessionId.slice(0, 8) + '…'}
                      </span>
                      <span className="gba:text-[9px] gba:text-muted-foreground gba:shrink-0">
                        {formatDate(session.createdAt)}
                      </span>
                      <ArrowRightIcon className="gba:h-3 gba:w-3 gba:text-muted-foreground/60 gba:shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {(inboundEdges.length > 0 || outboundEdges.length > 0) && (
        <div className="gba:border-t gba:border-border/40 gba:px-4 gba:py-3 gba:text-[11px]">
          {inboundEdges.length > 0 && (
            <div className="gba:mb-2">
              <p className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.1em] gba:text-muted-foreground gba:mb-1">
                {t('agent-mesh-node-detail-inbound', { count: inboundEdges.length })}
              </p>
              <ul className="gba:space-y-1">
                {inboundEdges.slice(0, 4).map(edge => (
                  <li key={edge.id} className="gba:truncate gba:text-foreground/80">
                    ← {edge.label ?? edgeKindLabel(edge.kind)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {outboundEdges.length > 0 && (
            <div>
              <p className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.1em] gba:text-muted-foreground gba:mb-1">
                {t('agent-mesh-node-detail-outbound', { count: outboundEdges.length })}
              </p>
              <ul className="gba:space-y-1">
                {outboundEdges.slice(0, 4).map(edge => (
                  <li key={edge.id} className="gba:truncate gba:text-foreground/80">
                    → {edge.label ?? edgeKindLabel(edge.kind)}
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
            {t('agent-mesh-node-detail-skills', { count: skills.length })}
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
                        {t('agent-mesh-node-detail-auto-detected')}
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
