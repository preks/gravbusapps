import React from 'react'
import { HashIcon, UsersIcon, GaugeIcon } from '@phosphor-icons/react'
import type { MemoryStats, TopItem } from './memoryLensModel'

interface MemoryInsightsProps {
  stats: MemoryStats
  activeTopic: string | null
  onSelectTopic: (topic: string | null) => void
}

const Panel: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode; testId: string }> = ({
  icon,
  title,
  children,
  testId
}) => (
  <div className="gba:rounded-xl gba:border gba:border-border/60 gba:bg-card gba:p-3.5" data-testid={testId}>
    <div className="gba:flex gba:items-center gba:gap-1.5 gba:mb-2.5">
      {icon}
      <h3 className="gba:text-[12px] gba:font-semibold gba:text-foreground">{title}</h3>
    </div>
    {children}
  </div>
)

const EmptyHint: React.FC<{ label: string }> = ({ label }) => (
  <p className="gba:text-[12px] gba:text-muted-foreground/70">{label}</p>
)

const TopicChips: React.FC<{
  items: TopItem[]
  activeTopic: string | null
  onSelectTopic: (topic: string | null) => void
}> = ({ items, activeTopic, onSelectTopic }) => (
  <div className="gba:flex gba:flex-wrap gba:gap-1.5">
    {items.map(item => {
      const isActive = activeTopic === item.label
      return (
        <button
          key={item.label}
          type="button"
          onClick={() => onSelectTopic(isActive ? null : item.label)}
          className={`gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:px-2.5 gba:py-0.5 gba:text-[11px] gba:transition-colors ${
            isActive
              ? 'gba:bg-foreground gba:text-background'
              : 'gba:bg-muted/50 gba:text-muted-foreground gba:hover:bg-muted/70'
          }`}
          data-testid={`memory-lens-topic-${item.label}`}
        >
          <span>{item.label}</span>
          <span className={isActive ? 'gba:text-background/70' : 'gba:text-muted-foreground/60'}>{item.count}</span>
        </button>
      )
    })}
  </div>
)

const EntityChips: React.FC<{ items: TopItem[] }> = ({ items }) => (
  <div className="gba:flex gba:flex-wrap gba:gap-1.5">
    {items.map(item => (
      <span
        key={item.label}
        className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:bg-muted/50 gba:px-2.5 gba:py-0.5 gba:text-[11px] gba:text-muted-foreground"
      >
        <span>{item.label}</span>
        <span className="gba:text-muted-foreground/60">{item.count}</span>
      </span>
    ))}
  </div>
)

const SalienceBars: React.FC<{ stats: MemoryStats }> = ({ stats }) => {
  const max = Math.max(1, ...stats.salienceBuckets.map(bucket => bucket.count))
  return (
    <div className="gba:space-y-2">
      {stats.salienceBuckets.map(bucket => (
        <div key={bucket.id} className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:w-28 gba:shrink-0 gba:text-[11px] gba:text-muted-foreground">{bucket.label}</span>
          <div className="gba:relative gba:h-2 gba:flex-1 gba:overflow-hidden gba:rounded-full gba:bg-muted/40">
            <div
              className="gba:absolute gba:inset-y-0 gba:left-0 gba:rounded-full gba:bg-primary/70"
              style={{ width: `${Math.round((bucket.count / max) * 100)}%` }}
            />
          </div>
          <span className="gba:w-6 gba:shrink-0 gba:text-right gba:text-[11px] gba:text-muted-foreground">
            {bucket.count}
          </span>
        </div>
      ))}
    </div>
  )
}

export const MemoryInsights: React.FC<MemoryInsightsProps> = ({ stats, activeTopic, onSelectTopic }) => (
  <div className="gba:grid gba:grid-cols-1 gba:gap-2.5 lg:gba:grid-cols-3" data-testid="memory-lens-insights">
    <Panel
      icon={<HashIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />}
      title="Top topics"
      testId="memory-lens-top-topics"
    >
      {stats.topTags.length > 0 ? (
        <TopicChips items={stats.topTags} activeTopic={activeTopic} onSelectTopic={onSelectTopic} />
      ) : (
        <EmptyHint label="No tagged memories yet." />
      )}
    </Panel>

    <Panel
      icon={<UsersIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />}
      title="Top entities"
      testId="memory-lens-top-entities"
    >
      {stats.topEntities.length > 0 ? (
        <EntityChips items={stats.topEntities} />
      ) : (
        <EmptyHint label="No entities captured yet." />
      )}
    </Panel>

    <Panel
      icon={<GaugeIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />}
      title="Salience"
      testId="memory-lens-salience"
    >
      {stats.total > 0 ? <SalienceBars stats={stats} /> : <EmptyHint label="No memories to weigh yet." />}
    </Panel>
  </div>
)
