/**
 * ReviewView - Displays the build plan for review.
 * Refinement is now handled by the agent chat side panel.
 */

import React from 'react'
import { Canvas } from '../layouts/Canvas'
import { BuildPlanReview } from '../widgets/buildPlanReview'
import { EditPlanModal } from '../modals/EditPlanModal'
import { FloatingActionButton } from '../widgets/FloatingActionButton'
import { AppIconBadge } from '../ui/AppIconBadge'
import type { BuildPlan, ComponentSpec } from '../../types'

export interface ReviewViewProps {
  plan: BuildPlan
  userPrompt: string
  skippedCount: number
  isEditModalOpen: boolean
  isSavingPlan: boolean
  editError: string | null
  isAnalyzing: boolean
  isRefining?: boolean
  onStartBuild: (skipComponents?: string[]) => Promise<void>
  onCancel: () => void
  onReanalyze: (answers: Record<string, string>) => Promise<void>
  onEditModalOpen: () => void
  onEditModalClose: () => void
  onEditPlan: (updatedComponents: ComponentSpec[]) => Promise<void>
  onReset: () => void
  onSkippedComponentsChange: (ids: string[]) => void
  onReanalyzePrompt?: (prompt: string) => Promise<void>
}

export const ReviewView: React.FC<ReviewViewProps> = ({
  plan,
  skippedCount,
  isEditModalOpen,
  isSavingPlan,
  editError,
  isAnalyzing,
  isRefining = false,
  onStartBuild,
  onCancel,
  onReanalyze,
  onEditModalOpen,
  onEditModalClose,
  onEditPlan,
  onSkippedComponentsChange
}) => {
  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0">
      {/* App Identity Header */}
      {plan.appMetadata && (
        <div className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:border-b gba:border-border gba:bg-background gba:shrink-0">
          <AppIconBadge iconName={plan.appMetadata.icon} size="md" />
          <div className="gba:min-w-0">
            <p className="gba:font-semibold gba:text-foreground gba:text-base gba:leading-tight">
              {plan.appMetadata.name}
            </p>
            <p className="gba:text-sm gba:text-muted-foreground gba:truncate">{plan.appMetadata.description}</p>
          </div>
        </div>
      )}

      <Canvas
        title={plan.userSummary?.title || 'Review Plan'}
        subtitle="Review what will be built — use the chat panel to refine"
        floatingAction={
          <FloatingActionButton
            label="Start Building"
            count={plan.components.length - skippedCount}
            onClick={() => onStartBuild()}
            disabled={isAnalyzing}
            variant="primary"
          />
        }
      >
        <div className="gba:space-y-4 gba:relative">
          {/* Loading overlay when refining */}
          {isRefining && (
            <div className="gba:absolute gba:inset-0 gba:bg-background/80 gba:backdrop-blur-sm gba:z-50 gba:flex gba:items-center gba:justify-center gba:rounded-xl">
              <div className="gba:flex gba:flex-col gba:items-center gba:gap-3">
                <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-primary" />
                <p className="gba:text-sm gba:text-muted-foreground">Refining plan...</p>
              </div>
            </div>
          )}

          <BuildPlanReview
            plan={plan}
            onConfirm={onStartBuild}
            onCancel={onCancel}
            onReanalyze={onReanalyze}
            onEdit={onEditModalOpen}
            isLoading={isAnalyzing}
            hideActions={true}
            onSkippedComponentsChange={onSkippedComponentsChange}
          />

          <EditPlanModal
            plan={plan}
            isOpen={isEditModalOpen}
            onClose={onEditModalClose}
            onSave={onEditPlan}
            isSaving={isSavingPlan}
            error={editError}
          />
        </div>
      </Canvas>
    </div>
  )
}
