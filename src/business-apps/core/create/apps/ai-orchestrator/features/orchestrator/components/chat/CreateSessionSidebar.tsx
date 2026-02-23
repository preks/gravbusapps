import { Button } from '@newwork/nw-design-system'
import { MessageSquare, X } from 'lucide-react'
import { AppIconBadge } from '../ui/AppIconBadge'
import type { BuildPlan } from '../../types'

const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface CreateSessionSidebarProps {
  plans: BuildPlan[]
  currentPlanId?: string
  loading: boolean
  onSelectSession: (jobId: string) => void
  onClose: () => void
  testId?: string
}

export const CreateSessionSidebar = ({
  plans,
  currentPlanId,
  loading,
  onSelectSession,
  onClose,
  testId = 'create-session-sidebar'
}: CreateSessionSidebarProps) => {
  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid={testId}>
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:border-b gba:border-border gba:shrink-0 gba:h-[56px]">
        <h2 className="gba:text-sm gba:font-bold gba:text-foreground gba:tracking-tight">Session History</h2>
        <Button
          variant="ghost"
          size="icon"
          className="gba:h-7 gba:w-7 gba:rounded-lg"
          onClick={onClose}
          data-testid={`${testId}-close`}
        >
          <X className="gba:h-4 gba:w-4" />
        </Button>
      </div>

      {/* Sessions List */}
      <div className="gba:flex-1 gba:overflow-y-auto gba:px-3 gba:py-3 gba:space-y-0.5">
        {loading && (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:space-y-2">
            <p className="gba:text-sm gba:text-muted-foreground">Loading sessions...</p>
          </div>
        )}

        {!loading && plans.length === 0 && (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:space-y-2">
            <MessageSquare className="gba:h-6 gba:w-6 gba:text-muted-foreground/40" />
            <p className="gba:text-sm gba:text-muted-foreground">No sessions yet</p>
          </div>
        )}

        {!loading &&
          plans.map(plan => {
            const appName = plan.appMetadata?.name
            const planTitle = plan.userSummary?.title || plan.originalPrompt
            const isActive = plan.jobId === currentPlanId

            return (
              <div
                key={plan.jobId}
                className={`gba:flex gba:items-start gba:gap-2.5 gba:rounded-xl gba:px-2.5 gba:py-2 gba:cursor-pointer gba:group gba:transition-all gba:duration-150 ${
                  isActive ? 'gba:bg-accent gba:text-accent-foreground' : 'gba:hover:bg-muted/70'
                }`}
                onClick={() => onSelectSession(plan.jobId)}
                data-testid={`${testId}-plan-${plan.jobId}`}
              >
                <AppIconBadge iconName={plan.appMetadata?.icon} size="sm" />
                <div className="gba:flex-1 gba:min-w-0">
                  <span className="gba:text-sm gba:truncate gba:block gba:font-medium">{appName || planTitle}</span>
                  {appName && (
                    <span className="gba:text-[10px] gba:text-muted-foreground/70 gba:truncate gba:block">
                      {planTitle}
                    </span>
                  )}
                  <span className="gba:text-[10px] gba:text-muted-foreground/50">
                    {formatRelativeTime(plan.createdAt)}
                  </span>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
