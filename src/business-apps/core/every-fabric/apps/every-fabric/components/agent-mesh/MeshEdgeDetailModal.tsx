import { useEffect } from 'react'
import {
  ArrowRightIcon,
  BrainIcon,
  ChatTeardropTextIcon,
  ClockIcon,
  HandshakeIcon,
  LightbulbIcon,
  WrenchIcon,
  XIcon
} from '@phosphor-icons/react'
import type { MeshEdge, MeshEdgeKind, MeshNode } from '../../utils/traceModel'

interface MeshEdgeDetailModalProps {
  edge: MeshEdge
  source: MeshNode | undefined
  target: MeshNode | undefined
  /** 1-based position of this call among siblings sharing the same node pair. */
  callIndex?: number
  /** Total number of edges between the same node pair (>= 1). */
  callTotal?: number
  sessionTitleMap?: Map<string, string>
  onClose: () => void
  onDrillToSession?: (sessionId: string) => void
}

const KIND_LABEL: Record<MeshEdgeKind, string> = {
  delegation: 'Delegation',
  tool_call: 'Tool call',
  expert_call: 'Expert call',
  skill_load: 'Skill load',
  completion: 'Completion'
}

function KindIcon({ kind }: { kind: MeshEdgeKind }) {
  const className = 'gba:h-3.5 gba:w-3.5 gba:text-primary'
  switch (kind) {
    case 'tool_call':
      return <WrenchIcon className={className} weight="duotone" />
    case 'expert_call':
      return <BrainIcon className={className} weight="duotone" />
    case 'skill_load':
      return <LightbulbIcon className={className} weight="duotone" />
    case 'completion':
      return <HandshakeIcon className={className} weight="duotone" />
    case 'delegation':
    default:
      return <ChatTeardropTextIcon className={className} weight="duotone" />
  }
}

function formatTimestamp(iso: string): string {
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return iso
  return new Date(ts).toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: 'short'
  })
}

export const MeshEdgeDetailModal: React.FC<MeshEdgeDetailModalProps> = ({
  edge,
  source,
  target,
  callIndex,
  callTotal,
  sessionTitleMap,
  onClose,
  onDrillToSession
}) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const sourceName = source?.label ?? 'Unknown source'
  const targetName = target?.label ?? 'Unknown target'

  return (
    <div
      className="gba:w-[340px] gba:max-w-[calc(100vw-2rem)] gba:max-h-[50vh] gba:flex gba:flex-col gba:overflow-hidden gba:rounded-[1.25rem] gba:border gba:border-border/60 gba:bg-card gba:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_36px_-16px_rgba(15,23,42,0.18)]"
      data-testid="mesh-edge-detail-panel"
      role="dialog"
      aria-label={`${KIND_LABEL[edge.kind]} message`}
    >
      <header className="gba:flex gba:items-start gba:justify-between gba:gap-2 gba:px-4 gba:pt-3 gba:pb-2">
        <div className="gba:min-w-0 gba:flex-1">
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.12em] gba:text-primary">
            <KindIcon kind={edge.kind} />
            {KIND_LABEL[edge.kind]}
            {callTotal && callTotal > 1 && callIndex && (
              <span className="gba:ml-1 gba:rounded-full gba:bg-primary/10 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:text-primary gba:tracking-normal">
                {callIndex}/{callTotal}
              </span>
            )}
          </div>
          <h3 className="gba:mt-1 gba:flex gba:items-center gba:gap-1.5 gba:text-[13px] gba:font-semibold gba:text-foreground">
            <span className="gba:truncate gba:max-w-[100px]" title={sourceName}>
              {sourceName}
            </span>
            <ArrowRightIcon className="gba:h-3 gba:w-3 gba:shrink-0 gba:text-muted-foreground" />
            <span className="gba:truncate gba:max-w-[100px]" title={targetName}>
              {targetName}
            </span>
          </h3>
          <p className="gba:mt-0.5 gba:text-[10px] gba:text-muted-foreground">
            {formatTimestamp(edge.timestamp)}
            {edge.resolvedAt && ` · ${formatTimestamp(edge.resolvedAt)}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close message detail"
          className="gba:inline-flex gba:h-7 gba:w-7 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-lg gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
          data-testid="mesh-edge-detail-close"
        >
          <XIcon className="gba:h-3.5 gba:w-3.5" />
        </button>
      </header>

      <div className="gba:flex gba:min-h-0 gba:flex-1 gba:flex-col gba:gap-2 gba:overflow-y-auto gba:px-4 gba:pb-3">
        <pre
          className="gba:max-h-[30vh] gba:overflow-auto gba:whitespace-pre-wrap gba:break-words gba:rounded-xl gba:border gba:border-border/40 gba:bg-muted/20 gba:p-3 gba:font-mono gba:text-[11px] gba:leading-relaxed gba:text-foreground"
          data-testid="mesh-edge-detail-body"
        >
          {edge.label?.trim() || '(No message body recorded.)'}
        </pre>

        {edge.status && (
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-[11px] gba:text-muted-foreground gba:pt-1">
            <span className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.1em]">Status</span>
            <span
              className={`gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:uppercase ${
                edge.status === 'failed'
                  ? 'gba:bg-destructive/15 gba:text-destructive'
                  : 'gba:bg-emerald-100 gba:text-emerald-700'
              }`}
            >
              {edge.status}
            </span>
          </div>
        )}

        {onDrillToSession && hasSessionIds(edge) && (
          <div className="gba:border-t gba:border-border/40 gba:pt-2 gba:mt-1">
            <p className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.1em] gba:text-muted-foreground gba:mb-1.5">
              Sessions ({(edge as EdgeWithSessions).sampleSessionIds.length})
            </p>
            <ul className="gba:space-y-1">
              {(edge as EdgeWithSessions).sampleSessionIds.slice(0, 5).map(sessionId => (
                <li key={sessionId}>
                  <button
                    type="button"
                    onClick={() => onDrillToSession(sessionId)}
                    className="gba:flex gba:items-center gba:gap-2 gba:w-full gba:text-left gba:rounded-md gba:p-1.5 gba:-mx-1.5 gba:hover:bg-muted/40 gba:transition-colors gba:group/session"
                    data-testid={`edge-session-${sessionId}`}
                  >
                    <ClockIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:shrink-0" />
                    <span className="gba:flex-1 gba:truncate gba:text-[11px] gba:text-foreground gba:group-hover/session:text-primary gba:transition-colors">
                      {sessionTitleMap?.get(sessionId) || sessionId.slice(0, 8) + '…'}
                    </span>
                    <ArrowRightIcon className="gba:h-3 gba:w-3 gba:text-muted-foreground/60 gba:shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

interface EdgeWithSessions extends MeshEdge {
  sampleSessionIds: string[]
}

function hasSessionIds(edge: MeshEdge): edge is EdgeWithSessions {
  return (
    Array.isArray((edge as EdgeWithSessions).sampleSessionIds) && (edge as EdgeWithSessions).sampleSessionIds.length > 0
  )
}
