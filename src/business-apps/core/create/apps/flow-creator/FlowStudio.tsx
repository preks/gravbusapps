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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  useTranslation
} from '@newwork/nw-design-system'
import { ArrowLeft, ListPlus, Workflow } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PremiumHeroBackground } from '@/common/components/premium-hero-background'
import translations from './_i18n'
import { FlowStudioCanvas } from './components/canvas/FlowStudioCanvas'
import { NodeContextMenu } from './components/shared/NodeContextMenu'
import { PendingDeleteDialog } from './components/shared/PendingDeleteDialog'
import { TemplateLabelsDialog } from './components/shared/TemplateLabelsDialog'
import { useFlowStudioStore } from './hooks/useFlowStudioStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import type { DesignerMode } from './types/studioTypes'
import { FlowStudioListView } from './views/FlowStudioListView'

import { useFlowStudioClient } from './hooks/useFlowStudioClient'

const FLOW_ID_PARAM = 'flowId'
const UNTITLED_FLOW_NAME = 'Untitled Flow'

function getFlowIdFromUrl(): string | null {
  if (globalThis.window === undefined) return null
  const urlParams = new URLSearchParams(globalThis.location.search)
  const id = urlParams.get(FLOW_ID_PARAM)
  return id?.trim() || null
}

function updateUrlWithFlowId(flowId: string | null, push = false): void {
  if (globalThis.window === undefined) return
  const urlParams = new URLSearchParams(globalThis.location.search)
  if (flowId) {
    urlParams.set(FLOW_ID_PARAM, flowId)
  } else {
    urlParams.delete(FLOW_ID_PARAM)
  }
  const newUrl = `${globalThis.location.pathname}?${urlParams.toString()}${globalThis.location.hash}`
  if (push) {
    globalThis.history.pushState({}, '', newUrl)
  } else {
    globalThis.history.replaceState({}, '', newUrl)
  }
}

function isUntitledTemplateName(value: string): boolean {
  const trimmed = String(value || '').trim()
  return trimmed.length === 0 || trimmed === UNTITLED_FLOW_NAME
}

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
  onSave: onSaveComplete,
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
  const nodes = useFlowStudioStore(s => s.nodes)
  const edges = useFlowStudioStore(s => s.edges)
  const resetStore = useFlowStudioStore(s => s.resetStore)
  const selectNode = useFlowStudioStore(s => s.selectNode)
  const selectEdge = useFlowStudioStore(s => s.selectEdge)

  const { saveFlow, loadFlow, isLoading: isLoadingTemplate } = useFlowStudioClient(accessToken)
  const urlFlowIdOnMount = getFlowIdFromUrl()
  const [view, setView] = useState<'list' | 'designer'>(templateId || urlFlowIdOnMount ? 'designer' : 'list')
  const [labelsOpen, setLabelsOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [saveNameDialogOpen, setSaveNameDialogOpen] = useState(false)
  const [pendingTemplateName, setPendingTemplateName] = useState('')
  const [saveNameError, setSaveNameError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showValidationIssues, setShowValidationIssues] = useState(false)

  const handleModeChange = useCallback(
    (newMode: DesignerMode) => {
      setMode(newMode)
    },
    [setMode]
  )

  const tagPills = useMemo(() => {
    const tags = (templateTags || {}) as Record<string, unknown>
    const entries = Object.entries(tags)
      .map(([k, v]) => ({ k: String(k || '').trim(), v: (typeof v === 'string' ? v : '').trim() }))
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

  const getSaveErrorMessage = useCallback(
    (error: unknown) => (error instanceof Error ? error.message : 'Failed to save flow'),
    []
  )

  const openTemplateFromList = useCallback(
    async (id: string) => {
      setSaveError(null)
      updateUrlWithFlowId(id, true)
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
    setSaveError(null)
    updateUrlWithFlowId(null)
    resetStore()
    setView('designer')
  }, [resetStore])

  const backToList = useCallback(() => {
    setSaveError(null)
    updateUrlWithFlowId(null)
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

  const executeSave = useCallback(async () => {
    setSaveError(null)
    await saveFlow()
    setShowValidationIssues(false)
    onSaveComplete?.()
  }, [onSaveComplete, saveFlow])

  const requestSave = useCallback(async () => {
    if (view !== 'designer') return
    setShowValidationIssues(true)

    if (!isUntitledTemplateName(templateName)) {
      try {
        await executeSave()
      } catch (error) {
        setSaveError(getSaveErrorMessage(error))
      }
      return
    }

    setPendingTemplateName('')
    setSaveNameError(null)
    setSaveNameDialogOpen(true)
  }, [executeSave, getSaveErrorMessage, templateName, view])

  useEffect(() => {
    setShowValidationIssues(false)
  }, [edges, nodes])

  const confirmSaveWithName = useCallback(async () => {
    const trimmedName = pendingTemplateName.trim()

    if (isUntitledTemplateName(trimmedName)) {
      setSaveNameError(t('studio-save-name-validation'))
      return
    }

    setTemplateMetadata({ name: trimmedName })
    setSaveNameError(null)

    try {
      await executeSave()
      setSaveNameDialogOpen(false)
    } catch (error) {
      const message = getSaveErrorMessage(error)
      setSaveError(message)
      setSaveNameError(message)
      // Keep the dialog open so the user can retry after the save error is resolved.
    }
  }, [executeSave, getSaveErrorMessage, pendingTemplateName, setTemplateMetadata, t])

  useEffect(() => {
    if (!saveNameDialogOpen) return
    setSaveNameError(null)
  }, [saveNameDialogOpen])

  // Load flow when templateId prop is set (parent control)
  useEffect(() => {
    if (!templateId) return
    setView('designer')
    loadFlow(templateId).catch(() => undefined)
  }, [loadFlow, templateId])

  // Load flow from URL on mount when no templateId prop (direct link / bookmark)
  useEffect(() => {
    if (templateId || !urlFlowIdOnMount) return
    setView('designer')
    loadFlow(urlFlowIdOnMount).catch(() => updateUrlWithFlowId(null))
  }, [loadFlow, templateId, urlFlowIdOnMount])

  // React to browser back/forward (URL change)
  useEffect(() => {
    const handlePopState = () => {
      const id = getFlowIdFromUrl()
      if (id) {
        setView('designer')
        loadFlow(id).catch(() => updateUrlWithFlowId(null))
      } else {
        setView('list')
      }
    }
    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [loadFlow])

  useKeyboardShortcuts({ onSave: requestSave, enabled: view === 'designer' })

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:w-full gba:bg-background" data-testid={testId}>
      <div className="gba:relative gba:overflow-hidden gba:shrink-0" data-testid={`${testId}-hero`}>
        <PremiumHeroBackground data-testid={`${testId}-hero-background`} />
        <div className="gba:absolute gba:inset-0 gba:pointer-events-none gba:space-hero-overlay" aria-hidden />

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
      <div className="gba:flex gba:flex-1 gba:min-h-0 gba:overflow-hidden">
        {view === 'list' ? (
          <FlowStudioListView
            accessToken={accessToken}
            onOpenTemplate={openTemplateFromList}
            data-testid={`${testId}-list`}
          />
        ) : (
          <div className="gba:flex gba:flex-1 gba:flex-col gba:min-h-0">
            {saveError ? (
              <div
                className="gba:border-b gba:border-destructive-secondary gba:bg-destructive-secondary gba:px-5 gba:py-3"
                data-testid={`${testId}-save-error`}
              >
                <p className="gba:text-sm gba:text-destructive-secondary-foreground">{saveError}</p>
              </div>
            ) : null}
            <FlowStudioCanvas
              accessToken={accessToken}
              userInfo={userInfo}
              mode={mode}
              onModeChange={handleModeChange}
              onSave={requestSave}
              showValidationIssues={showValidationIssues}
              data-testid={`${testId}-canvas`}
            />
          </div>
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
          value={templateTags}
          onChange={setTemplateTags}
          data-testid={`${testId}-labels-dialog`}
        />
      )}

      <Dialog
        open={saveNameDialogOpen}
        onOpenChange={open => {
          setSaveNameDialogOpen(open)
          if (!open) {
            setPendingTemplateName('')
            setSaveNameError(null)
          }
        }}
      >
        <DialogContent className="gba:max-w-md" data-testid={`${testId}-save-name-dialog`}>
          <DialogHeader>
            <DialogTitle data-testid={`${testId}-save-name-title`}>{t('studio-save-name-title')}</DialogTitle>
            <DialogDescription data-testid={`${testId}-save-name-description`}>
              {t('studio-save-name-description')}
            </DialogDescription>
          </DialogHeader>
          <div className="gba:flex gba:flex-col gba:gap-2">
            <Label htmlFor={`${testId}-save-name-input`}>{t('studio-save-name-label')}</Label>
            <Input
              id={`${testId}-save-name-input`}
              value={pendingTemplateName}
              onChange={event => {
                setPendingTemplateName(event.target.value)
                if (saveError) {
                  setSaveError(null)
                }
                if (saveNameError) {
                  setSaveNameError(null)
                }
              }}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void confirmSaveWithName()
                }
              }}
              placeholder={t('studio-save-name-placeholder')}
              autoFocus
              data-testid={`${testId}-save-name-input`}
            />
            {saveNameError ? (
              <p className="gba:text-sm gba:text-destructive" data-testid={`${testId}-save-name-error`}>
                {saveNameError}
              </p>
            ) : null}
          </div>
          <DialogFooter className="gba:gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setSaveNameDialogOpen(false)
                setPendingTemplateName('')
                setSaveNameError(null)
              }}
              data-testid={`${testId}-save-name-cancel`}
            >
              {t('studio-save-name-cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => void confirmSaveWithName()}
              data-testid={`${testId}-save-name-confirm`}
            >
              {t('studio-save-name-confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
