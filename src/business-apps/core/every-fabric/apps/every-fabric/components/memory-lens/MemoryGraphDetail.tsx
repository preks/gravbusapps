import React, { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Badge, Button, useTranslation } from '@newwork/nw-design-system'
import { ChatCircleTextIcon, HashIcon, NotebookIcon, UsersIcon, XIcon } from '@phosphor-icons/react'
import EntityLink, { markdownUrlTransform } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { formatMemoryTitle, relativeDate } from './memoryLensModel'
import { memoryMarkdownComponents } from './MemoryMarkdownBody'
import { extractReferences, sanitizeMemoryBody } from './memoryReferences'
import { memoryNamespaceLabel } from './memoryNamespaceI18n'
import type { GraphNode } from './memoryGraphModel'
import translations from '../../_i18n'

interface MemoryGraphDetailProps {
  node: GraphNode
  neighbors: GraphNode[]
  accessToken: string
  hubHasMore: boolean
  loading: boolean
  onLoadMore: () => void
  onSelectNode: (id: string) => void
  onClose: () => void
}

const salienceLabel = (value: number, t: (key: string) => string): string => {
  if (value >= 9) return t('memory-lens-graph-detail-salience-critical')
  if (value >= 7) return t('memory-lens-graph-detail-salience-important')
  if (value >= 4) return t('memory-lens-graph-detail-salience-notable')
  return t('memory-lens-graph-detail-salience-routine')
}

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="gba:mb-1.5 gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground/70">
    {children}
  </p>
)

const HubChip: React.FC<{ node: GraphNode; onSelect: () => void }> = ({ node, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    className="gba:inline-flex gba:max-w-full gba:items-center gba:gap-1 gba:rounded-full gba:border gba:border-border/60 gba:bg-muted/40 gba:px-2 gba:py-0.5 gba:text-[11px] gba:text-foreground gba:transition-colors gba:hover:border-primary/50 gba:hover:bg-primary/5"
    data-testid="memory-detail-hub-chip"
  >
    {node.kind === 'topic' ? (
      <HashIcon className="gba:h-3 gba:w-3 gba:text-primary" />
    ) : (
      <UsersIcon className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
    )}
    <span className="gba:truncate">{node.label}</span>
  </button>
)

const MemoryView: React.FC<{
  node: GraphNode
  neighbors: GraphNode[]
  accessToken: string
  onSelectNode: (id: string) => void
  t: (key: string, vars?: Record<string, unknown>) => string
}> = ({ node, neighbors, accessToken, onSelectNode, t }) => {
  const entry = node.entry
  const references = useMemo(() => extractReferences(entry?.value), [entry?.value])
  const body = useMemo(() => sanitizeMemoryBody(entry?.value), [entry?.value])
  const date = relativeDate(node.occurredAt ?? entry?.updatedAt, t)
  const topics = neighbors.filter(item => item.kind === 'topic')
  const people = neighbors.filter(item => item.kind === 'entity')

  return (
    <>
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1.5">
        {node.namespace && (
          <Badge variant="secondary" className="gba:gap-1">
            <NotebookIcon className="gba:h-3 gba:w-3" />
            {memoryNamespaceLabel(node.namespace, t)}
          </Badge>
        )}
        {typeof node.salience === 'number' && (
          <Badge variant="outline">
            {salienceLabel(node.salience, t)} · {node.salience}/10
          </Badge>
        )}
        {date && <span className="gba:text-[11px] gba:text-muted-foreground">{date}</span>}
      </div>

      <h3 className="gba:mt-2.5 gba:text-[15px] gba:font-semibold gba:leading-snug gba:text-foreground">
        {entry ? formatMemoryTitle(entry) : node.label}
      </h3>

      {body && (
        <div className="gba:mt-1.5">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            urlTransform={markdownUrlTransform}
            components={memoryMarkdownComponents(accessToken)}
          >
            {body}
          </ReactMarkdown>
        </div>
      )}

      {references.length > 0 && (
        <div className="gba:mt-4">
          <SectionTitle>{t('memory-lens-references-open')}</SectionTitle>
          <div className="gba:flex gba:flex-col gba:gap-1.5">
            {references.map(ref => (
              <EntityLink key={ref.id} href={ref.href} accessToken={accessToken} appearance="chip" openInNewTab>
                {ref.label}
              </EntityLink>
            ))}
          </div>
        </div>
      )}

      {people.length > 0 && (
        <div className="gba:mt-4">
          <SectionTitle>{t('memory-lens-graph-detail-entities')}</SectionTitle>
          <div className="gba:flex gba:flex-wrap gba:gap-1.5">
            {people.map(item => (
              <HubChip key={item.id} node={item} onSelect={() => onSelectNode(item.id)} />
            ))}
          </div>
        </div>
      )}

      {topics.length > 0 && (
        <div className="gba:mt-4">
          <SectionTitle>{t('memory-lens-graph-detail-topics')}</SectionTitle>
          <div className="gba:flex gba:flex-wrap gba:gap-1.5">
            {topics.map(item => (
              <HubChip key={item.id} node={item} onSelect={() => onSelectNode(item.id)} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

const HubView: React.FC<{
  node: GraphNode
  neighbors: GraphNode[]
  hubHasMore: boolean
  loading: boolean
  onLoadMore: () => void
  onSelectNode: (id: string) => void
  t: (key: string, vars?: Record<string, unknown>) => string
}> = ({ node, neighbors, hubHasMore, loading, onLoadMore, onSelectNode, t }) => {
  const memories = neighbors.filter(item => item.kind === 'memory')
  const hubKindLabel =
    node.kind === 'topic' ? t('memory-lens-graph-detail-topic') : t('memory-lens-graph-detail-person')

  return (
    <>
      <div className="gba:flex gba:items-center gba:gap-2">
        {node.kind === 'topic' ? (
          <HashIcon className="gba:h-4 gba:w-4 gba:text-primary" />
        ) : (
          <UsersIcon className="gba:h-4 gba:w-4 gba:text-foreground" />
        )}
        <h3 className="gba:truncate gba:text-[15px] gba:font-semibold gba:text-foreground">{node.label}</h3>
      </div>
      <div className="gba:mt-2 gba:flex gba:flex-wrap gba:gap-1.5">
        <Badge variant="outline">{hubKindLabel}</Badge>
        {typeof node.count === 'number' && (
          <Badge variant="secondary">{t('memory-lens-graph-detail-memories-count', { count: node.count })}</Badge>
        )}
      </div>

      {memories.length > 0 && (
        <div className="gba:mt-4">
          <SectionTitle>{t('memory-lens-graph-detail-connected')}</SectionTitle>
          <div className="gba:flex gba:flex-col gba:gap-1">
            {memories.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectNode(item.id)}
                className="gba:flex gba:w-full gba:items-center gba:gap-2 gba:rounded-lg gba:border gba:border-transparent gba:px-2 gba:py-1.5 gba:text-left gba:text-[12px] gba:text-foreground gba:transition-colors gba:hover:border-border/60 gba:hover:bg-muted/40"
                data-testid="memory-detail-connected-memory"
              >
                <ChatCircleTextIcon className="gba:h-3.5 gba:w-3.5 gba:shrink-0 gba:text-muted-foreground" />
                <span className="gba:truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {hubHasMore && (
        <Button variant="outline" size="sm" className="gba:mt-3 gba:w-full" disabled={loading} onClick={onLoadMore}>
          {loading ? t('memory-lens-graph-detail-loading') : t('memory-lens-graph-detail-load-more')}
        </Button>
      )}
      {!hubHasMore && memories.length === 0 && (
        <p className="gba:mt-3 gba:text-xs gba:text-muted-foreground">{t('memory-lens-graph-detail-hub-empty')}</p>
      )}
    </>
  )
}

export const MemoryGraphDetail: React.FC<MemoryGraphDetailProps> = ({
  node,
  neighbors,
  accessToken,
  hubHasMore,
  loading,
  onLoadMore,
  onSelectNode,
  onClose
}) => {
  const { t } = useTranslation(translations)

  return (
    <aside
      className="gba:pointer-events-auto gba:absolute gba:right-3 gba:top-3 gba:bottom-3 gba:w-80 gba:overflow-y-auto gba:rounded-2xl gba:border gba:border-border/60 gba:bg-card/95 gba:p-4 gba:shadow-lg gba:backdrop-blur"
      data-testid="memory-graph-detail"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label={t('memory-lens-graph-detail-close-aria')}
        className="gba:absolute gba:right-2.5 gba:top-2.5 gba:inline-flex gba:h-7 gba:w-7 gba:items-center gba:justify-center gba:rounded-full gba:text-muted-foreground/70 gba:transition-colors gba:hover:bg-muted/60 gba:hover:text-foreground"
        data-testid="memory-graph-detail-close"
      >
        <XIcon className="gba:h-3.5 gba:w-3.5" />
      </button>
      <div className="gba:pr-6">
        {node.kind === 'memory' ? (
          <MemoryView node={node} neighbors={neighbors} accessToken={accessToken} onSelectNode={onSelectNode} t={t} />
        ) : (
          <HubView
            node={node}
            neighbors={neighbors}
            hubHasMore={hubHasMore}
            loading={loading}
            onLoadMore={onLoadMore}
            onSelectNode={onSelectNode}
            t={t}
          />
        )}
      </div>
    </aside>
  )
}
