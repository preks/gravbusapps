/**
 * ReviewView - Displays the build plan for review.
 * Refinement is now handled by the agent chat side panel.
 */

import React, { useState } from 'react'
import { Button, Textarea } from '@newwork/nw-design-system'
import { Edit2, X, Check } from 'lucide-react'
import { Canvas } from '../layouts/Canvas'
import { BuildPlanReview } from '../widgets/buildPlanReview'
import { EditPlanModal } from '../modals/EditPlanModal'
import { FloatingActionButton } from '../widgets/FloatingActionButton'
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
  userPrompt,
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
  onReset,
  onSkippedComponentsChange,
  onReanalyzePrompt
}) => {
  const [isEditingPrompt, setIsEditingPrompt] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState(userPrompt)

  const handleEditPromptClick = () => {
    setEditedPrompt(userPrompt)
    setIsEditingPrompt(true)
  }

  const handleCancelEdit = () => {
    setIsEditingPrompt(false)
    setEditedPrompt(userPrompt)
  }

  const handleUpdatePrompt = async () => {
    if (editedPrompt.trim() && onReanalyzePrompt) {
      await onReanalyzePrompt(editedPrompt.trim())
      setIsEditingPrompt(false)
    }
  }

  return (
    <Canvas
      title={plan.userSummary?.title || 'Review Plan'}
      subtitle="Review what will be built — use the chat panel to refine"
      actions={
        <Button variant="ghost" onClick={onReset} disabled={isAnalyzing}>
          ← Start Over
        </Button>
      }
      showGradientFade={true}
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

        {userPrompt && (
          <div className="gba:p-4 gba:bg-muted gba:rounded-xl gba:border gba:border-border gba:mt-4 gba:relative">
            {isEditingPrompt ? (
              <div className="gba:space-y-3">
                <p className="gba:text-xs gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:font-semibold">
                  Edit Your Request:
                </p>
                <Textarea
                  value={editedPrompt}
                  onChange={e => setEditedPrompt(e.target.value)}
                  placeholder="Describe what you want to build..."
                  rows={3}
                  className="gba:resize-none gba:text-sm"
                  autoFocus
                />
                <div className="gba:flex gba:items-center gba:justify-end gba:gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={isAnalyzing}>
                    <X className="gba:w-3 gba:h-3 gba:mr-1.5" />
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleUpdatePrompt}
                    disabled={!editedPrompt.trim() || editedPrompt === userPrompt || isAnalyzing}
                  >
                    <Check className="gba:w-3 gba:h-3 gba:mr-1.5" />
                    Update & Re-analyze
                  </Button>
                </div>
              </div>
            ) : (
              <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
                <div className="gba:flex-1">
                  <p className="gba:text-xs gba:text-muted-foreground gba:mb-2 gba:uppercase gba:tracking-wider gba:font-semibold">
                    Building:
                  </p>
                  <p className="gba:text-sm gba:text-foreground gba:leading-relaxed">"{userPrompt}"</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditPromptClick}
                  disabled={isAnalyzing}
                  className="gba:text-xs gba:shrink-0"
                >
                  <Edit2 className="gba:w-3 gba:h-3 gba:mr-1.5" />
                  Edit Prompt
                </Button>
              </div>
            )}
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
  )
}
