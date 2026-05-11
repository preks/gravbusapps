import { useEffect } from 'react'
import {
  ArrowRightIcon,
  BrainIcon,
  ChatTeardropTextIcon,
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
  onClose: () => void
}

const KIND_LABEL: Record<MeshEdgeKind, string> = {
  delegation: 'Delegation',
  tool_call: 'Tool call',
  expert_call: 'Expert call',
  skill_load: 'Skill load',
  completion: 'Completion'
}

function KindIcon({ kind }: { kind: MeshEdgeKind }) {
  const className = 'gba:h-4 gba:w-4 gba:text-primary'
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
  onClose
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
      className="gba:fixed gba:inset-0 gba:z-[60] gba:flex gba:items-center gba:justify-center gba:bg-background/70 gba:p-4 gba:backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
      data-testid="mesh-edge-detail-modal"
    >
      <div
        className="gba:flex gba:max-h-[80vh] gba:w-full gba:max-w-[560px] gba:flex-col gba:overflow-hidden gba:rounded-2xl gba:border gba:border-border gba:bg-background gba:shadow-2xl"
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${KIND_LABEL[edge.kind]} message`}
      >
        <header className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:border-b gba:border-border/60 gba:px-5 gba:py-4">
          <div className="gba:min-w-0">
            <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.12em] gba:text-primary">
              <KindIcon kind={edge.kind} />
              {KIND_LABEL[edge.kind]}
              {callTotal && callTotal > 1 && callIndex && (
                <span className="gba:ml-1 gba:rounded-full gba:bg-primary/10 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:text-primary gba:tracking-normal">
                  Call {callIndex} of {callTotal}
                </span>
              )}
            </div>
            <h2 className="gba:mt-1.5 gba:flex gba:items-center gba:gap-2 gba:text-[15px] gba:font-semibold gba:text-foreground">
              <span className="gba:truncate" title={sourceName}>
                {sourceName}
              </span>
              <ArrowRightIcon className="gba:h-4 gba:w-4 gba:shrink-0 gba:text-muted-foreground" />
              <span className="gba:truncate" title={targetName}>
                {targetName}
              </span>
            </h2>
            <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground">
              {formatTimestamp(edge.timestamp)}
              {edge.resolvedAt && (
                <>
                  {' · resolved '}
                  {formatTimestamp(edge.resolvedAt)}
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close message detail"
            className="gba:inline-flex gba:h-8 gba:w-8 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:border gba:border-border/60 gba:text-muted-foreground gba:hover:bg-muted/60 gba:hover:text-foreground gba:transition-colors"
            data-testid="mesh-edge-detail-close"
          >
            <XIcon className="gba:h-4 gba:w-4" />
          </button>
        </header>

        <div className="gba:flex gba:min-h-0 gba:flex-1 gba:flex-col gba:gap-3 gba:overflow-y-auto gba:px-5 gba:py-4">
          <section>
            <h3 className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.1em] gba:text-muted-foreground">
              Message
            </h3>
            <pre
              className="gba:mt-2 gba:max-h-[40vh] gba:overflow-auto gba:whitespace-pre-wrap gba:break-words gba:rounded-xl gba:border gba:border-border/60 gba:bg-muted/30 gba:p-3 gba:font-mono gba:text-[12px] gba:leading-relaxed gba:text-foreground"
              data-testid="mesh-edge-detail-body"
            >
              {edge.label?.trim() || '(No message body recorded for this edge.)'}
            </pre>
          </section>

          {edge.status && (
            <section className="gba:flex gba:items-center gba:gap-2 gba:text-[11px] gba:text-muted-foreground">
              <span className="gba:font-semibold gba:uppercase gba:tracking-[0.1em]">Status</span>
              <span
                className={`gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-[0.1em] ${
                  edge.status === 'failed'
                    ? 'gba:bg-destructive/15 gba:text-destructive'
                    : 'gba:bg-emerald-100 gba:text-emerald-700'
                }`}
              >
                {edge.status}
              </span>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
