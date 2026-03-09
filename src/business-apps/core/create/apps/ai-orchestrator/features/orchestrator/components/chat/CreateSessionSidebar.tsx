import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@newwork/nw-design-system'
import { MessageSquare, X, Trash2, AlertCircle } from 'lucide-react'
import { AppIconBadge } from '../ui/AppIconBadge'
import type { BuildPlan } from '../../types'
import { createOrchestratorClient } from '@/common/network/ai/orchestrator/OrchestratorClient'
import { useState } from 'react'

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
  onRefresh?: () => void
  accessToken?: string
  testId?: string
}

export const CreateSessionSidebar = ({
  plans,
  currentPlanId,
  loading,
  onSelectSession,
  onClose,
  onRefresh,
  accessToken,
  testId = 'create-session-sidebar'
}: CreateSessionSidebarProps) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<{ title: string; message: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ jobId: string; name: string } | null>(null)

  const deleteSinglePlan = async (jobId: string, planName: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!accessToken) {
      setDeleteError({ title: 'Error', message: 'No access token available' })
      return
    }

    // Show confirmation dialog
    setConfirmDelete({ jobId, name: planName })
  }

  const executeDelete = async () => {
    if (!confirmDelete || !accessToken) return

    const { jobId } = confirmDelete
    setConfirmDelete(null)
    setIsDeleting(true)

    try {
      const client = createOrchestratorClient(accessToken)
      await client.cancelBuild(jobId)
      onRefresh?.()
    } catch (error: any) {
      console.error('Failed to delete plan:', error)
      const errorMsg = error?.message || 'Failed to delete plan.'

      // Determine error type and show appropriate dialog
      if (errorMsg.toLowerCase().includes('cannot delete') || errorMsg.toLowerCase().includes('not published')) {
        setDeleteError({
          title: 'Cannot Delete Plan',
          message: errorMsg
        })
      } else {
        setDeleteError({
          title: 'Delete Failed',
          message: errorMsg
        })
      }
    } finally {
      setIsDeleting(false)
    }
  }
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
                role="button"
                tabIndex={0}
                key={plan.jobId}
                className={`gba:w-full gba:text-left gba:flex gba:items-start gba:gap-2.5 gba:rounded-xl gba:px-2.5 gba:py-2 gba:cursor-pointer gba:group gba:transition-all gba:duration-150 gba:border-0 gba:bg-transparent ${
                  isActive ? 'gba:bg-accent gba:text-accent-foreground' : 'gba:hover:bg-muted/70'
                }`}
                onClick={() => onSelectSession(plan.jobId)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectSession(plan.jobId)
                  }
                }}
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
                {accessToken && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="gba:h-6 gba:w-6 gba:rounded-md gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity gba:shrink-0"
                    onClick={e => {
                      e.stopPropagation()
                      deleteSinglePlan(plan.jobId, appName || planTitle, e)
                    }}
                    disabled={isDeleting}
                    data-testid={`${testId}-delete-${plan.jobId}`}
                  >
                    <Trash2 className="gba:h-3 gba:w-3" />
                  </Button>
                )}
              </div>
            )
          })}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={open => !open && setConfirmDelete(null)}>
        <DialogContent className="gba:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{confirmDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gba:flex gba:gap-2 gba:justify-end">
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={executeDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={!!deleteError} onOpenChange={open => !open && setDeleteError(null)}>
        <DialogContent className="gba:max-w-2xl">
          <DialogHeader>
            <div className="gba:flex gba:items-start gba:gap-3">
              <div className="gba:rounded-full gba:bg-destructive/10 gba:p-2">
                <AlertCircle className="gba:h-5 gba:w-5 gba:text-destructive" />
              </div>
              <div className="gba:flex-1">
                <DialogTitle>{deleteError?.title}</DialogTitle>
                <DialogDescription className="gba:mt-2 gba:whitespace-pre-wrap">
                  {deleteError?.message}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDeleteError(null)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
