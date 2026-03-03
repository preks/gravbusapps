/**
 * Overview page for AI Orchestrator.
 * Guiding view: start a new plan or open an existing one by jobId.
 * Loads and displays recent plans from GET /orchestration/plans.
 */

import React, { useState } from 'react'
import { Sparkles, Plus, Loader2, Trash2, CheckSquare, X, AlertCircle } from 'lucide-react'
import { Button, Card, Checkbox, Alert, AlertDescription } from '@newwork/nw-design-system'
import { useListPlans } from '../../features/orchestrator/hooks'
import { AppIconBadge } from '../../features/orchestrator/components/ui/AppIconBadge'
import { createOrchestratorClient } from '@/common/network/ai/orchestrator/OrchestratorClient'

export interface OverviewPageProps {
  accessToken: string
  onNewPlan: () => void
  onOpenPlan: (jobId: string) => void
}

function planTitle(plan: { userSummary?: { title?: string }; originalPrompt?: string }): string {
  const title = plan.userSummary?.title?.trim()
  if (title) return title
  const prompt = plan.originalPrompt?.trim() ?? ''
  return prompt.length > 60 ? `${prompt.slice(0, 60)}…` : prompt || 'Untitled plan'
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ accessToken, onNewPlan, onOpenPlan }) => {
  const {
    data: plans,
    paging,
    loading,
    error,
    refetch
  } = useListPlans({
    accessToken,
    params: { limit: 25, offset: 0, sort: '-createdAt' },
    enabled: Boolean(accessToken)
  })

  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const toggleSelectMode = () => {
    setIsSelectMode(prev => !prev)
    if (isSelectMode) {
      setSelectedPlanIds(new Set())
    }
  }

  const togglePlanSelection = (jobId: string) => {
    setSelectedPlanIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(jobId)) {
        newSet.delete(jobId)
      } else {
        newSet.add(jobId)
      }
      return newSet
    })
  }

  const selectAllPlans = () => {
    setSelectedPlanIds(new Set(plans.map(p => p.jobId)))
  }

  const clearSelection = () => {
    setSelectedPlanIds(new Set())
  }

  const deleteSelectedPlans = async () => {
    if (selectedPlanIds.size === 0) return

    const jobIds = Array.from(selectedPlanIds)
    if (!confirm(`Delete ${jobIds.length} selected plan(s)? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    setDeleteError(null)
    try {
      const client = createOrchestratorClient(accessToken)
      await Promise.all(jobIds.map(jobId => client.cancelBuild(jobId)))

      setSelectedPlanIds(new Set())
      setIsSelectMode(false)

      // Refresh the list
      refetch()

      alert(`Successfully deleted ${jobIds.length} plan(s).`)
    } catch (error: any) {
      console.error('Failed to delete selected plans:', error)
      const errorMsg = error?.message || 'Failed to delete selected plans. Please try again.'

      // Check if it's an unpublished resource error
      if (errorMsg.includes('not published yet') || errorMsg.includes('Resource IDs')) {
        setDeleteError(errorMsg)
      } else {
        alert(errorMsg)
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const deleteSinglePlan = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm('Delete this plan? This action cannot be undone.')) {
      return
    }

    setDeleteError(null)
    try {
      const client = createOrchestratorClient(accessToken)
      await client.cancelBuild(jobId)
      refetch()
    } catch (error: any) {
      console.error('Failed to delete plan:', error)
      const errorMsg = error?.message || 'Failed to delete plan. Please try again.'

      // Check if it's an unpublished resource error
      if (errorMsg.includes('not published yet') || errorMsg.includes('Resource IDs')) {
        setDeleteError(errorMsg)
      } else {
        alert(errorMsg)
      }
    }
  }

  return (
    <div className="gba:min-h-screen gba:flex gba:flex-col gba:bg-background gba:px-6 gba:py-8">
      <div className="gba:max-w-2xl gba:mx-auto gba:w-full gba:space-y-8">
        <div className="gba:text-center gba:space-y-4">
          <div className="gba:inline-flex gba:p-4 gba:rounded-2xl gba:bg-primary/10">
            <Sparkles className="gba:w-12 gba:h-12 gba:text-primary" />
          </div>
          <h1 className="gba:text-2xl gba:font-bold gba:text-foreground">AI Orchestrator</h1>
          <p className="gba:text-muted-foreground">
            Create build plans and generate screens, flows, and data models from a single prompt.
          </p>
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-2">
            <Button size="lg" onClick={onNewPlan} className="gba:gap-2" data-testid="ai-orchestrator-new-plan">
              <Plus className="gba:w-4 gba:h-4" />
              New plan
            </Button>
            {plans.length > 0 && (
              <Button
                size="lg"
                variant={isSelectMode ? 'default' : 'outline'}
                onClick={toggleSelectMode}
                className="gba:gap-2"
                disabled={isDeleting}
              >
                {isSelectMode ? (
                  <>
                    <X className="gba:w-4 gba:h-4" />
                    Cancel
                  </>
                ) : (
                  <>
                    <CheckSquare className="gba:w-4 gba:h-4" />
                    Select
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <section className="gba:space-y-3">
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">Recent plans</h2>

          {/* Error Alert for Unpublished Resources */}
          {deleteError && (
            <Alert variant="destructive">
              <AlertCircle className="gba:h-4 gba:w-4" />
              <AlertDescription className="gba:whitespace-pre-wrap">{deleteError}</AlertDescription>
              <Button variant="outline" size="sm" onClick={() => setDeleteError(null)} className="gba:mt-2">
                Dismiss
              </Button>
            </Alert>
          )}

          {/* Bulk Actions Toolbar */}
          {isSelectMode && plans.length > 0 && (
            <div className="gba:bg-primary/10 gba:border gba:border-primary/20 gba:rounded-lg gba:p-4 gba:flex gba:items-center gba:justify-between gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-3">
                <CheckSquare className="gba:w-5 gba:h-5 gba:text-primary" />
                <span className="gba:text-sm gba:font-medium">
                  {selectedPlanIds.size} of {plans.length} selected
                </span>
              </div>
              <div className="gba:flex gba:items-center gba:gap-2">
                <Button
                  onClick={selectAllPlans}
                  variant="outline"
                  size="sm"
                  disabled={selectedPlanIds.size === plans.length || isDeleting}
                >
                  Select All
                </Button>
                <Button
                  onClick={clearSelection}
                  variant="outline"
                  size="sm"
                  disabled={selectedPlanIds.size === 0 || isDeleting}
                >
                  Clear
                </Button>
                <Button
                  onClick={deleteSelectedPlans}
                  variant="destructive"
                  size="sm"
                  disabled={selectedPlanIds.size === 0 || isDeleting}
                  className="gba:gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="gba:w-4 gba:h-4" />
                      Delete Selected ({selectedPlanIds.size})
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {loading && (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-8 gba:text-muted-foreground">
              <Loader2 className="gba:w-6 gba:h-6 gba:animate-spin gba:mr-2" />
              Loading…
            </div>
          )}
          {error && (
            <p className="gba:text-destructive gba:py-4" data-testid="ai-orchestrator-list-error">
              {error}
            </p>
          )}
          {!loading && !error && plans.length === 0 && (
            <p className="gba:text-muted-foreground gba:py-4">No plans yet. Create one with &quot;New plan&quot;.</p>
          )}
          {!loading && plans.length > 0 && (
            <ul className="gba:space-y-2" data-testid="ai-orchestrator-plan-list">
              {plans.map(plan => {
                const isSelected = selectedPlanIds.has(plan.jobId)
                return (
                  <li key={plan.jobId}>
                    <Card
                      className={`gba:cursor-pointer gba:transition-colors hover:gba:bg-muted/50 gba:relative ${
                        isSelected ? 'gba:border-primary gba:ring-2 gba:ring-primary/20 gba:bg-primary/5' : ''
                      }`}
                      onClick={() => {
                        if (isSelectMode) {
                          togglePlanSelection(plan.jobId)
                        } else {
                          onOpenPlan(plan.jobId)
                        }
                      }}
                      data-testid={`ai-orchestrator-plan-${plan.jobId}`}
                    >
                      {/* Selection checkbox */}
                      {isSelectMode && (
                        <div className="gba:absolute gba:top-4 gba:left-4 gba:z-10">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => togglePlanSelection(plan.jobId)}
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                      )}

                      <div className={`gba:flex gba:items-center gba:gap-3 gba:p-4 ${isSelectMode ? 'gba:pl-12' : ''}`}>
                        <AppIconBadge iconName={plan.appMetadata?.icon} size="sm" />
                        <div className="gba:min-w-0 gba:flex-1">
                          <p className="gba:font-medium gba:text-foreground gba:truncate">
                            {plan.appMetadata?.name || planTitle(plan)}
                          </p>
                          <p className="gba:text-sm gba:text-muted-foreground">
                            {plan.status} · {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : ''}
                          </p>
                        </div>
                        {!isSelectMode && (
                          <button
                            type="button"
                            onClick={e => deleteSinglePlan(plan.jobId, e)}
                            className="gba:shrink-0 gba:text-muted-foreground hover:gba:text-destructive gba:p-1.5 gba:rounded gba:transition-colors"
                            title="Delete plan"
                          >
                            <Trash2 className="gba:w-4 gba:h-4" />
                          </button>
                        )}
                      </div>
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
          {!loading && paging && paging.totalRecords > plans.length && (
            <p className="gba:text-sm gba:text-muted-foreground">
              Showing {plans.length} of {paging.totalRecords} plans.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
