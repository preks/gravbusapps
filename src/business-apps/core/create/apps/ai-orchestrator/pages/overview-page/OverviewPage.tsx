/**
 * Overview page for AI Orchestrator.
 * Guiding view: start a new plan or open an existing one by jobId.
 * Loads and displays recent plans from GET /orchestration/plans.
 */

import React from 'react'
import { Sparkles, Plus, FileText, Loader2 } from 'lucide-react'
import { Button, Card } from '@newwork/nw-design-system'
import { useListPlans } from '../../features/orchestrator/hooks'

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
    error
  } = useListPlans({
    accessToken,
    params: { limit: 25, offset: 0, sort: '-createdAt' },
    enabled: Boolean(accessToken)
  })

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
          <Button size="lg" onClick={onNewPlan} className="gba:gap-2" data-testid="ai-orchestrator-new-plan">
            <Plus className="gba:w-4 gba:h-4" />
            New plan
          </Button>
        </div>

        <section className="gba:space-y-3">
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">Recent plans</h2>
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
              {plans.map(plan => (
                <li key={plan.jobId}>
                  <Card
                    className="gba:cursor-pointer gba:transition-colors hover:gba:bg-muted/50"
                    onClick={() => onOpenPlan(plan.jobId)}
                    data-testid={`ai-orchestrator-plan-${plan.jobId}`}
                  >
                    <div className="gba:flex gba:items-center gba:gap-3 gba:p-4">
                      <FileText className="gba:w-5 gba:h-5 gba:text-muted-foreground gba:shrink-0" />
                      <div className="gba:min-w-0 gba:flex-1">
                        <p className="gba:font-medium gba:text-foreground gba:truncate">{planTitle(plan)}</p>
                        <p className="gba:text-sm gba:text-muted-foreground">
                          {plan.status} · {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : ''}
                        </p>
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
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
