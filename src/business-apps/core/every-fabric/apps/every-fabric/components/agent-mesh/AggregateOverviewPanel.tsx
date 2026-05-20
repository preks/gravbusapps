import { UsersIcon, ClockIcon, LightningIcon, BrainIcon, ArrowRightIcon } from '@phosphor-icons/react'
import type { MeshScope } from './meshScopes'
import type { AggregateStats } from '../../utils/meshAggregateModel'

interface AggregateOverviewPanelProps {
  scope: Exclude<MeshScope, 'session'>
  stats: AggregateStats
  onSelectUser?: (userId: string) => void
  onSelectSession?: (sessionId: string) => void
}

export const AggregateOverviewPanel: React.FC<AggregateOverviewPanelProps> = ({
  scope,
  stats,
  onSelectUser,
  onSelectSession
}) => {
  return (
    <div
      className="gba:flex gba:flex-col gba:gap-4 gba:overflow-y-auto gba:rounded-2xl gba:border gba:border-border/60 gba:bg-background gba:p-4"
      data-testid="aggregate-overview-panel"
    >
      <h2 className="gba:text-[13px] gba:font-semibold gba:uppercase gba:tracking-[0.08em] gba:text-muted-foreground">
        Overview
      </h2>

      <div className="gba:grid gba:grid-cols-2 gba:gap-3">
        <StatCard
          icon={<BrainIcon className="gba:h-4 gba:w-4" weight="duotone" />}
          label="Agents"
          value={stats.agentCount}
        />
        <StatCard
          icon={<LightningIcon className="gba:h-4 gba:w-4" weight="duotone" />}
          label="Tools"
          value={stats.toolCount}
        />
        <StatCard
          icon={<ClockIcon className="gba:h-4 gba:w-4" weight="duotone" />}
          label="Sessions"
          value={stats.sessionCount}
        />
        {(scope === 'company' || scope === 'user') && (
          <StatCard
            icon={<UsersIcon className="gba:h-4 gba:w-4" weight="duotone" />}
            label="Users"
            value={stats.userCount}
          />
        )}
      </div>

      <RankedList title="Top Agents" items={stats.topAgents} emptyLabel="No agents recorded" />

      <RankedList title="Top Skills" items={stats.topSkills} emptyLabel="No skills recorded" />

      <RankedList title="Top Tools" items={stats.topTools} emptyLabel="No tools recorded" />

      {stats.recentUsers && stats.recentUsers.length > 0 && onSelectUser && (
        <section className="gba:mt-2">
          <h3 className="gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-[0.1em] gba:text-muted-foreground gba:mb-2">
            Active Users
          </h3>
          <ul className="gba:space-y-1">
            {stats.recentUsers.map(user => (
              <li key={user.userId}>
                <button
                  type="button"
                  onClick={() => onSelectUser(user.userId)}
                  className="gba:flex gba:items-center gba:justify-between gba:w-full gba:text-xs gba:rounded-md gba:px-2 gba:py-1.5 gba:hover:bg-muted/50 gba:transition-colors gba:text-left"
                  data-testid={`user-drilldown-${user.userId}`}
                >
                  <span className="gba:truncate gba:text-foreground">
                    {user.displayName || user.userId.slice(0, 8) + '…'}
                  </span>
                  <span className="gba:flex gba:items-center gba:gap-1 gba:text-muted-foreground">
                    {user.sessionCount} sessions
                    <ArrowRightIcon className="gba:h-3 gba:w-3" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {stats.recentSessions && stats.recentSessions.length > 0 && onSelectSession && (
        <section className="gba:mt-2">
          <h3 className="gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-[0.1em] gba:text-muted-foreground gba:mb-2">
            Recent Sessions
          </h3>
          <ul className="gba:space-y-1">
            {stats.recentSessions.map(session => (
              <li key={session.sessionId}>
                <button
                  type="button"
                  onClick={() => onSelectSession(session.sessionId)}
                  className="gba:flex gba:items-center gba:justify-between gba:w-full gba:text-xs gba:rounded-md gba:px-2 gba:py-1.5 gba:hover:bg-muted/50 gba:transition-colors gba:text-left"
                  data-testid={`session-drilldown-${session.sessionId}`}
                >
                  <span className="gba:truncate gba:text-foreground gba:max-w-[180px]">{session.title}</span>
                  <span className="gba:flex gba:items-center gba:gap-1 gba:text-muted-foreground">
                    <StatusDot status={session.status} />
                    <ArrowRightIcon className="gba:h-3 gba:w-3" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="gba:flex gba:items-center gba:gap-2 gba:rounded-xl gba:border gba:border-border/60 gba:bg-muted/20 gba:px-3 gba:py-2.5">
      <span className="gba:text-primary">{icon}</span>
      <div>
        <p className="gba:text-[15px] gba:font-semibold gba:text-foreground gba:leading-tight">{value}</p>
        <p className="gba:text-[10px] gba:text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function RankedList({
  title,
  items,
  emptyLabel
}: {
  title: string
  items: { id: string; label: string; invocationCount: number }[]
  emptyLabel: string
}) {
  return (
    <section className="gba:mt-2">
      <h3 className="gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-[0.1em] gba:text-muted-foreground gba:mb-2">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="gba:text-xs gba:text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="gba:space-y-1.5">
          {items.map(item => (
            <li key={item.id} className="gba:flex gba:items-center gba:justify-between gba:text-xs">
              <span className="gba:truncate gba:text-foreground">{item.label}</span>
              <span className="gba:text-muted-foreground">{item.invocationCount}×</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'completed'
      ? 'gba:bg-emerald-500'
      : status === 'running'
        ? 'gba:bg-amber-500'
        : 'gba:bg-muted-foreground'
  return <span className={`gba:inline-block gba:h-1.5 gba:w-1.5 gba:rounded-full ${color}`} />
}
