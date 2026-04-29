import React, { useCallback, useMemo, useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { ArrowLeftIcon, XIcon } from '@phosphor-icons/react'
import { useFabric } from '../../context/FabricContext'
import { BrowseSkillsView, type BrowseSkillManifestEntry } from './BrowseSkillsView'
import { SkillEditorPanel } from './SkillEditorPanel'

interface SkillsScreenProps {
  accessToken: string
  onBack: () => void
}

/**
 * Dedicated `/platform/every-fabric/skills` page. Replaces the legacy Browse Skills modal
 * and is reachable from both the landing + Add Skill menu and the workspace "Browse Skills"
 * affordance.
 *
 * Layout is a master-detail split: a narrow single-column list on the left and a persistent
 * SKILL.md editor panel on the right. Clicking a row selects it for editing; clicking the
 * row's "Use skill" button attaches the skill to the composer (existing behavior).
 *
 * Picking "Use skill" attaches the skill to the landing composer (as a removable chip, same
 * look/behavior as the built-in skill-creator chip) and returns to the base
 * `/platform/every-fabric` URL. No verbose opener text is injected — the chip is the signal;
 * the user types their real prompt themselves.
 */
export const SkillsScreen: React.FC<SkillsScreenProps> = ({ accessToken, onBack }) => {
  const { setPendingPrefill, newSession, attachedSkillIds } = useFabric()

  const attachedSet = useMemo(() => new Set(attachedSkillIds), [attachedSkillIds])

  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null)
  /** Bumped after a successful save so BrowseSkillsView re-fetches its manifest in the background. */
  const [manifestVersion, setManifestVersion] = useState(0)

  const handleSelectSkill = useCallback(
    (skill: BrowseSkillManifestEntry) => {
      // Empty opener keeps the composer clean; the "Skill added: <Humanized>" chip inside
      // FabricInput (driven by `preload_skill_ids`) is the visual confirmation. Mirrors the
      // skill-creator flow where SKILL_CREATOR_AGENT_OPENER === ''.
      setPendingPrefill({
        text: '',
        config: { preload_skill_ids: [skill.skill_id] }
      })
      // Ensure we land on the LandingScreen composer (no active session) when returning.
      newSession()
      onBack()
    },
    [setPendingPrefill, newSession, onBack]
  )

  const handleEditSkill = useCallback((skillId: string) => {
    setSelectedSkillId(prev => (prev === skillId ? prev : skillId))
  }, [])

  const handleSaved = useCallback(() => {
    setManifestVersion(v => v + 1)
  }, [])

  const handleCloseEditor = useCallback(() => {
    setSelectedSkillId(null)
  }, [])

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid="fabric-skills-screen">
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
            <h1 className="gba:text-xl sm:gba:text-2xl gba:font-semibold gba:text-foreground">Enterprise Agent</h1>
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
                onSelectSkill={handleSelectSkill}
                attachedSkillIds={attachedSet}
                selectedSkillId={selectedSkillId}
                onEditSkill={handleEditSkill}
                manifestVersion={manifestVersion}
              />
            </div>
          </aside>

          <section className="gba:flex-1 gba:min-w-0 gba:overflow-y-auto" data-testid="skills-editor-column">
            <SkillEditorPanel
              accessToken={accessToken}
              skillId={selectedSkillId}
              onSaved={handleSaved}
              onClose={handleCloseEditor}
            />
          </section>
        </div>
      </div>
    </div>
  )
}
