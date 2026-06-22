import React, { useCallback, useEffect, useState } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { ArrowLeftIcon, XIcon } from '@phosphor-icons/react'
import { BrowseSkillsView } from './BrowseSkillsView'
import { CreateSkillPanel } from './CreateSkillPanel'
import { SkillEditorPanel } from './SkillEditorPanel'
import { SkillToast } from './SkillToast'
import { useSkillToast } from './useSkillToast'
import translations from '../../_i18n'

interface SkillsScreenProps {
  accessToken: string
  onBack: () => void
  /** When true, the header bar is hidden (used when embedded inside SettingsScreen tabs). */
  embedded?: boolean
  /** Optional skill ID from URL state (when embedded in SettingsScreen). When provided, opens the skill editor. */
  skillId?: string | null
  /** Optional callback to update skill ID in URL state (when embedded in SettingsScreen). */
  onSkillChange?: (skillId: string | null) => void
}

/**
 * Dedicated `/platform/every-fabric/skills` page. Replaces the legacy Browse Skills modal
 * and is reachable from both the landing + Add Skill menu and the workspace "Browse Skills"
 * affordance.
 *
 * Layout is a master-detail split: a narrow single-column list on the left and a persistent
 * SKILL.md editor panel on the right. Clicking a row selects it for editing.
 */
export const SkillsScreen: React.FC<SkillsScreenProps> = ({
  accessToken,
  onBack,
  embedded = false,
  skillId: skillIdProp,
  onSkillChange
}) => {
  const { t } = useTranslation(translations)
  const { toast, showToast, dismissToast } = useSkillToast()

  // Initialize from prop if provided (for URL-driven state), otherwise use local state
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(skillIdProp ?? null)

  // Sync local state with prop changes (for browser back/forward navigation)
  useEffect(() => {
    if (skillIdProp !== undefined) {
      setSelectedSkillId(skillIdProp)
    }
  }, [skillIdProp])
  const [creatingNew, setCreatingNew] = useState(false)
  /** Bumped after a successful save so BrowseSkillsView re-fetches its manifest in the background. */
  const [manifestVersion, setManifestVersion] = useState(0)

  const handleCreateSkill = useCallback(() => {
    setSelectedSkillId(null)
    setCreatingNew(true)
  }, [])

  const handleSkillCreated = useCallback((skillId: string) => {
    setCreatingNew(false)
    setSelectedSkillId(skillId)
    setManifestVersion(v => v + 1)
  }, [])

  const handleEditSkill = useCallback(
    (skillId: string) => {
      setCreatingNew(false)
      setSelectedSkillId(prev => (prev === skillId ? prev : skillId))
      // Update URL state if callback is provided (embedded mode)
      if (onSkillChange) {
        onSkillChange(skillId)
      }
    },
    [onSkillChange]
  )

  const handleSaved = useCallback(() => {
    setManifestVersion(v => v + 1)
  }, [])

  const handleCloseEditor = useCallback(() => {
    setSelectedSkillId(null)
    // Clear URL state if callback is provided (embedded mode)
    if (onSkillChange) {
      onSkillChange(null)
    }
  }, [onSkillChange])

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid="fabric-skills-screen">
      {!embedded && (
        <div className="gba:shrink-0 gba:px-4 sm:gba:px-6 lg:gba:px-8 gba:py-4 sm:gba:py-5 gba:border-b gba:border-border/50">
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
            <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="gba:h-10 gba:w-10 gba:rounded-full"
                onClick={onBack}
                data-testid="skills-back-button"
              >
                <ArrowLeftIcon className="gba:h-5 gba:w-5" />
              </Button>
              <h1 className="gba:text-xl sm:gba:text-2xl gba:font-semibold gba:text-foreground">
                {t('skills-screen-title')}
              </h1>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="gba:h-10 gba:w-10 gba:rounded-full gba:shrink-0"
              onClick={onBack}
              data-testid="skills-close-button"
            >
              <XIcon className="gba:h-5 gba:w-5" />
            </Button>
          </div>
        </div>
      )}

      {/*
        Static two-column layout: the list sits in a fixed 360px left column and the SKILL.md
        editor fills the rest on the right. Both columns are always visible — no responsive
        collapsing — because this page is rendered inside an already narrow embedded pane
        and the previous viewport-breakpoint approach (`md:*`) never activated here.

        The outer `overflow-x-auto` + inner `min-w-[1120px]` pair guarantees that if the
        embedding shell ever shrinks the pane below the point where both columns still read
        comfortably, the browser adds a horizontal scrollbar instead of squishing the list
        into the editor (or vice versa).
      */}
      <div className="gba:flex-1 gba:min-h-0 gba:overflow-x-auto gba:overflow-y-hidden">
        <div className="gba:h-full gba:flex gba:flex-row gba:min-w-[1120px]">
          <aside
            className="gba:w-[720px] gba:shrink-0 gba:border-r gba:border-border/50 gba:overflow-y-auto"
            data-testid="skills-list-column"
          >
            <div className="gba:px-4 sm:gba:px-6 gba:py-5 sm:gba:py-6">
              <BrowseSkillsView
                accessToken={accessToken}
                showToast={showToast}
                onCreateSkill={handleCreateSkill}
                selectedSkillId={selectedSkillId}
                onEditSkill={handleEditSkill}
                manifestVersion={manifestVersion}
              />
            </div>
          </aside>

          <section className="gba:flex-1 gba:min-w-0 gba:overflow-y-auto" data-testid="skills-editor-column">
            {creatingNew ? (
              <CreateSkillPanel
                accessToken={accessToken}
                onClose={() => setCreatingNew(false)}
                onCreated={handleSkillCreated}
                showToast={showToast}
              />
            ) : (
              <SkillEditorPanel
                accessToken={accessToken}
                skillId={selectedSkillId}
                onSaved={handleSaved}
                onClose={handleCloseEditor}
                showToast={showToast}
              />
            )}
          </section>
        </div>
      </div>

      {toast && <SkillToast toast={toast} onDismiss={dismissToast} />}
    </div>
  )
}
