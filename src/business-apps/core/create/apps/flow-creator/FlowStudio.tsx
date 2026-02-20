/**
 * FlowStudio - Main entry component for the Flow Studio application.
 * Provides the visual flow designer with Simple/Advanced mode toggle.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  useTranslation
} from '@newwork/nw-design-system'
import { ArrowLeft, ListPlus, Workflow } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SpaceHeroBackground } from '@/business-apps/platform/apps/spaces/components/SpaceHeroBackground'
import translations from './_i18n'
import { FlowStudioCanvas } from './components/canvas/FlowStudioCanvas'
import { NodeContextMenu } from './components/shared/NodeContextMenu'
import { PendingDeleteDialog } from './components/shared/PendingDeleteDialog'
import { TemplateLabelsDialog } from './components/shared/TemplateLabelsDialog'
import { useFlowStudioStore } from './hooks/useFlowStudioStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import type { DesignerMode } from './types/studioTypes'
import { FlowStudioListView } from './views/FlowStudioListView'
import type { FlowTags } from '@/business-apps/flow/types'
import { useFlowStudioClient } from './hooks/useFlowStudioClient'

// Video background - same logic as EveryPagesHero and SpaceHero
const hostedVideoUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SPACE_HERO_VIDEO_URL
const localVideoUrl = '/space-hero-background.mp4'
const useVideo = hostedVideoUrl || (typeof import.meta !== 'undefined' && import.meta.env?.DEV && localVideoUrl)
const HERO_VIDEO_SRC = hostedVideoUrl || localVideoUrl

interface FlowStudioProps extends BusinessAppContextProps {
  /** Optional template ID to load for editing */
  templateId?: string
  /** Callback when flow is saved */
  onSave?: () => void
  /** Callback when user cancels */
  onCancel?: () => void
  'data-testid'?: string
}

export const FlowStudio: React.FC<FlowStudioProps> = ({
  accessToken,
  userInfo,
  templateId,
  onSave,
  onCancel,
  'data-testid': testId = 'flow-studio'
}) => {
  const { t } = useTranslation(translations)

  const mode = useFlowStudioStore(s => s.mode)
  const setMode = useFlowStudioStore(s => s.setMode)
  const templateName = useFlowStudioStore(s => s.templateName)
  const setTemplateMetadata = useFlowStudioStore(s => s.setTemplateMetadata)
  const templateTags = useFlowStudioStore(s => s.templateTags)
  const setTemplateTags = useFlowStudioStore(s => s.setTemplateTags)
  const isDirty = useFlowStudioStore(s => s.isDirty)
  const resetStore = useFlowStudioStore(s => s.resetStore)
  const selectNode = useFlowStudioStore(s => s.selectNode)
  const selectEdge = useFlowStudioStore(s => s.selectEdge)

  const { loadFlow, isLoading: isLoadingTemplate } = useFlowStudioClient(accessToken)
  const [view, setView] = useState<'list' | 'designer'>(templateId ? 'designer' : 'list')
  const [labelsOpen, setLabelsOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)

  // Keyboard shortcuts
  useKeyboardShortcuts({ onSave, enabled: true })

  const handleModeChange = useCallback(
    (newMode: DesignerMode) => {
      setMode(newMode)
    },
    [setMode]
  )

  const tagPills = useMemo(() => {
    const tags = (templateTags || {}) as Record<string, unknown>
    const entries = Object.entries(tags)
      .map(([k, v]) => ({ k: String(k || '').trim(), v: String(v ?? '').trim() }))
      .filter(e => Boolean(e.k) && Boolean(e.v))

    // reserved keys first
    const order = ['app', 'serviceCategory', 'digitalWorkplaceCategory']
    entries.sort((a, b) => {
      const ia = order.indexOf(a.k)
      const ib = order.indexOf(b.k)
      if (ia === -1 && ib === -1) return a.k.localeCompare(b.k)
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    })

    const parseCode = (v: string) => {
      const parts = v.split(':')
      return parts[parts.length - 1] || v
    }
    const labelForKey = (k: string) => {
      if (k === 'app') return 'App'
      if (k === 'serviceCategory') return 'Service'
      if (k === 'digitalWorkplaceCategory') return 'DWP'
      return k
    }

    return entries.slice(0, 4).map(e => `${labelForKey(e.k)}: ${parseCode(e.v)}`)
  }, [templateTags])

  const hasAnyTags = tagPills.length > 0

  const openTemplateFromList = useCallback(
    async (id: string) => {
      setView('designer')
      try {
        await loadFlow(id)
      } catch {
        // ignore; list view shows its own errors
      }
    },
    [loadFlow]
  )

  const createNewFlow = useCallback(() => {
    resetStore()
    setView('designer')
  }, [resetStore])

  const backToList = useCallback(() => {
    selectNode(null)
    selectEdge(null)
    setView('list')
    onCancel?.()
  }, [onCancel, selectEdge, selectNode])

  const requestCloseToList = useCallback(() => {
    if (isDirty) {
      setDiscardOpen(true)
      return
    }
    backToList()
  }, [backToList, isDirty])

  const discardAndClose = useCallback(() => {
    setDiscardOpen(false)
    // Reset to a clean state so the list doesn't show "Unsaved changes".
    // Preserve the current designer mode for the next session.
    const currentMode = mode
    resetStore()
    setMode(currentMode)
    backToList()
  }, [backToList, mode, resetStore, setMode])

  useEffect(() => {
    if (!templateId) return
    setView('designer')
    loadFlow(templateId).catch(() => undefined)
  }, [loadFlow, templateId])

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:w-full gba:bg-background" data-testid={testId}>
      {/* Hero header with video / animated gradient background */}
      <div className="gba:relative gba:overflow-hidden gba:shrink-0" data-testid={`${testId}-hero`}>
        {/* Video background when available, otherwise canvas animation */}
        {useVideo ? (
          <video
            src={HERO_VIDEO_SRC}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="gba:absolute gba:inset-0 gba:w-full gba:h-full gba:object-cover gba:pointer-events-none"
            aria-hidden
            data-testid={`${testId}-hero-video`}
          />
        ) : (
          <SpaceHeroBackground />
        )}

        {/* Dark overlay for text readability */}
        {/* eslint-disable newwork-local/no-hardcoded-colors */}
        <div
          className="gba:absolute gba:inset-0 gba:pointer-events-none"
          style={{
            background:
              'linear-gradient(105deg, rgba(15, 23, 42, 0.38) 0%, rgba(15, 23, 42, 0.12) 40%, transparent 60%)'
          }}
          aria-hidden
        />
        {/* eslint-enable newwork-local/no-hardcoded-colors */}

        {/* Content */}
        <div className="gba:relative gba:px-6 gba:py-5">
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
            <div className="gba:flex gba:items-start gba:gap-3">
              <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-lg gba:bg-white/15">
                <Workflow className="gba:h-5 gba:w-5 gba:text-white" />
              </div>
              <div className="gba:flex gba:flex-col gba:gap-0.5">
                <span className="gba:text-xs gba:font-medium gba:tracking-[0.3em] gba:text-white/60 gba:uppercase">
                  {t('app-eyebrow')}
                </span>
                {view === 'designer' ? (
                  <>
                    <input
                      type="text"
                      value={templateName}
                      onChange={e => setTemplateMetadata({ name: e.target.value })}
                      className="gba:text-xl gba:font-semibold gba:bg-transparent gba:border-none gba:outline-none gba:p-0 gba:leading-tight gba:text-white placeholder:gba:text-white/50"
                      placeholder={t('app-title')}
                      data-testid={`${testId}-name-input`}
                    />
                    <span className="gba:text-sm gba:text-white/80">{t('app-description')}</span>
                  </>
                ) : (
                  <>
                    <div className="gba:text-xl gba:font-semibold gba:text-white" data-testid={`${testId}-list-title`}>
                      {t('list-title')}
                    </div>
                    <span className="gba:text-sm gba:text-white/80">{t('list-subtitle')}</span>
                  </>
                )}
              </div>
            </div>

            {view === 'designer' && (
              <div className="gba:flex gba:items-center gba:gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  tone="inverse"
                  onClick={requestCloseToList}
                  data-testid={`${testId}-close`}
                  type="button"
                >
                  <ArrowLeft className="gba:h-4 gba:w-4 gba:mr-1" />
                  {t('studio-back-to-list')}
                </Button>
              </div>
            )}

            {view === 'list' && (
              <div className="gba:flex gba:items-center gba:gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  tone="inverse"
                  onClick={createNewFlow}
                  data-testid={`${testId}-hero-create`}
                  type="button"
                >
                  <ListPlus className="gba:h-4 gba:w-4 gba:mr-1" />
                  {t('list-create')}
                </Button>
              </div>
            )}
          </div>

          <div className="gba:flex gba:items-center gba:gap-2 gba:mt-3">
            {}
            {view === 'designer' && (
              <>
                {hasAnyTags ? (
                  <>
                    {tagPills.map((pill, index) => (
                      <Badge
                        key={pill}
                        variant="secondary"
                        className="gba:bg-white/15 gba:text-white gba:border-none"
                        data-testid={`${testId}-tag-pill-${index}`}
                      >
                        {pill}
                      </Badge>
                    ))}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setLabelsOpen(true)}
                      className="gba:h-7 gba:bg-white/15 gba:text-white gba:border-none"
                      data-testid={`${testId}-manage-labels`}
                      type="button"
                    >
                      {t('labels-title')}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setLabelsOpen(true)}
                    className="gba:h-7 gba:bg-white/15 gba:text-white gba:border-none"
                    data-testid={`${testId}-add-labels`}
                    type="button"
                  >
                    {t('labels-custom-add')}
                  </Button>
                )}
              </>
            )}
            {isDirty && (
              <Badge variant="secondary" className="gba:bg-warning gba:text-warning-foreground gba:border-none">
                Unsaved changes
              </Badge>
            )}
            {view === 'designer' && isLoadingTemplate && (
              <Badge
                variant="secondary"
                className="gba:bg-white/15 gba:text-white gba:border-none"
                data-testid={`${testId}-loading`}
              >
                Loading…
              </Badge>
            )}
            {}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="gba:flex gba:flex-1 gba:overflow-hidden">
        {view === 'list' ? (
          <FlowStudioListView
            accessToken={accessToken}
            onOpenTemplate={openTemplateFromList}
            data-testid={`${testId}-list`}
          />
        ) : (
          <FlowStudioCanvas
            accessToken={accessToken}
            userInfo={userInfo}
            mode={mode}
            onModeChange={handleModeChange}
            onBackToList={requestCloseToList}
            data-testid={`${testId}-canvas`}
          />
        )}
      </div>

      {/* Context menu */}
      {view === 'designer' ? (
        <>
          <NodeContextMenu data-testid={`${testId}-context-menu`} />
          <PendingDeleteDialog data-testid={`${testId}-pending-delete`} />
        </>
      ) : null}

      {view === 'designer' && (
        <TemplateLabelsDialog
          open={labelsOpen}
          onClose={() => setLabelsOpen(false)}
          accessToken={accessToken}
          value={templateTags as FlowTags}
          onChange={setTemplateTags}
          data-testid={`${testId}-labels-dialog`}
        />
      )}

      <AlertDialog open={discardOpen} onOpenChange={open => !open && setDiscardOpen(false)}>
        <AlertDialogContent data-testid={`${testId}-discard-dialog`}>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid={`${testId}-discard-title`}>{t('studio-discard-title')}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription
            data-testid={`${testId}-discard-desc`}
            className="gba:text-sm gba:text-muted-foreground"
          >
            {t('studio-discard-desc')}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDiscardOpen(false)} data-testid={`${testId}-discard-cancel`}>
              {t('studio-discard-cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={discardAndClose}
              className="gba:bg-destructive gba:text-destructive-foreground gba:hover:bg-destructive"
              data-testid={`${testId}-discard-confirm`}
            >
              {t('studio-discard-confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default FlowStudio
