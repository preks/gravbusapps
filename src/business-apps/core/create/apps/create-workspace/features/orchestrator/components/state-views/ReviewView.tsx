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
  isRefining: boolean
  refinementSummary: string | null
  refineError: string | null
  onStartBuild: (skipComponents?: string[]) => Promise<void>
  onCancel: () => void
  onReanalyze: (answers: Record<string, string>) => Promise<void>
  onEditModalOpen: () => void
  onEditModalClose: () => void
  onEditPlan: (updatedComponents: ComponentSpec[]) => Promise<void>
  onRefine: (feedback: string) => Promise<void>
  onReset: () => void
  onSkippedComponentsChange: (ids: string[]) => void
  onReanalyzePrompt?: (prompt: string) => Promise<void>
}

// CSS for blue glow effect on user prompt
const promptGlowStyles = `
  .prompt-glow {
    box-shadow: 0 0 20px hsl(var(--info) / 0.4);
  }
`

export const ReviewView: React.FC<ReviewViewProps> = ({
  plan,
  userPrompt,
  skippedCount,
  isEditModalOpen,
  isSavingPlan,
  editError,
  isAnalyzing,
  isRefining,
  refinementSummary,
  refineError,
  onStartBuild,
  onCancel,
  onReanalyze,
  onEditModalOpen,
  onEditModalClose,
  onEditPlan,
  onRefine,
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
    <>
      <style>{promptGlowStyles}</style>
      <Canvas
        title={plan.user_summary?.title || 'Review Plan'}
        subtitle={
          plan.user_summary
            ? 'Review what will be built and customize if needed'
            : 'Review the proposed components and make any adjustments'
        }
        actions={
          <Button variant="ghost" onClick={onReset} disabled={isAnalyzing || isRefining}>
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
        <div className="gba:space-y-4">
          {/* Show User Prompt */}
          {userPrompt && (
            <div className="prompt-glow gba:p-4 gba:bg-muted gba:rounded-xl gba:border-2 gba:border-info/50 gba:mt-4 gba:relative">
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
                    disabled={isAnalyzing || isRefining}
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
            onRefine={onRefine}
            isLoading={isAnalyzing}
            isRefining={isRefining}
            refinementSummary={refinementSummary}
            refineError={refineError}
            hideActions={true}
            onSkippedComponentsChange={onSkippedComponentsChange}
          />

          {/* Edit Plan Modal */}
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
    </>
  )
}
