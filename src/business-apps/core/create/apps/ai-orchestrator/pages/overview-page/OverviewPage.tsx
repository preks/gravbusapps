/**
 * Overview page for AI Orchestrator.
 * Guiding view: start a new plan or open an existing one by jobId.
 * Loads and displays recent plans from GET /orchestration/plans.
 */

import React from 'react'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, Button } from '@newwork/nw-design-system'
import { useListPlans } from '../../features/orchestrator/hooks'
import { useSelectMode } from './hooks/useSelectMode'
import { useDeletePlans } from './hooks/useDeletePlans'
import { OverviewHeader } from './components/OverviewHeader'
import { BulkActionsToolbar } from './components/BulkActionsToolbar'
import { PlanList } from './components/PlanList'

export interface OverviewPageProps {
  accessToken: string
  onNewPlan: () => void
  onOpenPlan: (jobId: string) => void
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

  const { isSelectMode, selectedPlanIds, toggleSelectMode, togglePlanSelection, selectAllPlans, clearSelection } =
    useSelectMode()

  const { isDeleting, deleteError, deleteSelectedPlans, deleteSinglePlan, clearError } = useDeletePlans({
    accessToken,
    refetch,
    onDeleteComplete: () => {
      clearSelection()
      toggleSelectMode()
    }
  })

  const handleDeleteSelected = () => {
    deleteSelectedPlans(Array.from(selectedPlanIds))
  }

  const handleSelectAll = () => {
    selectAllPlans(plans.map(p => p.jobId))
  }

  return (
    <div className="gba:min-h-screen gba:flex gba:flex-col gba:bg-background gba:px-6 gba:py-8">
      <div className="gba:max-w-2xl gba:mx-auto gba:w-full gba:space-y-8">
        <OverviewHeader
          onNewPlan={onNewPlan}
          hasPlans={plans.length > 0}
          isSelectMode={isSelectMode}
          toggleSelectMode={toggleSelectMode}
          isDeleting={isDeleting}
        />

        <section className="gba:space-y-3">
          <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">Recent plans</h2>

          {deleteError && (
            <Alert variant="destructive">
              <AlertCircle className="gba:h-4 gba:w-4" />
              <AlertDescription className="gba:whitespace-pre-wrap">{deleteError}</AlertDescription>
              <Button variant="outline" size="sm" onClick={clearError} className="gba:mt-2">
                Dismiss
              </Button>
            </Alert>
          )}

          {isSelectMode && plans.length > 0 && (
            <BulkActionsToolbar
              selectedCount={selectedPlanIds.size}
              totalCount={plans.length}
              onSelectAll={handleSelectAll}
              onClear={clearSelection}
              onDeleteSelected={handleDeleteSelected}
              isDeleting={isDeleting}
            />
          )}

          <PlanList
            plans={plans}
            loading={loading}
            error={error}
            paging={paging}
            isSelectMode={isSelectMode}
            selectedPlanIds={selectedPlanIds}
            onToggleSelection={togglePlanSelection}
            onOpenPlan={onOpenPlan}
            onDeleteSingle={deleteSinglePlan}
          />
        </section>
      </div>
    </div>
  )
}
