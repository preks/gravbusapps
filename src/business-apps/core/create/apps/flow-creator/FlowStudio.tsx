/**
 * FlowStudio - Main entry component for the Flow Studio application.
 * Provides the visual flow designer with Simple/Advanced mode toggle.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  CreateLayout,
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
import { FileText, Sparkles, Workflow } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FlowCanvas, FlowCanvasProvider } from '@/common/components/flow'
import { PremiumHeroBackground } from '@/common/components/premium-hero-background'
import { FlowLaunchSheet, type TestScope } from '@/business-apps/flow/apps/launcher/components/FlowLaunchSheet'
import translations from './_i18n'
import { FlowStudioCanvas } from './components/canvas/FlowStudioCanvas'
import { FlowStudioChatPanel } from './components/FlowStudioChatPanel'
import { ConfigPanelContainer } from './components/config-panels/ConfigPanelContainer'
import { NodeContextMenu } from './components/shared/NodeContextMenu'
import { PendingDeleteDialog } from './components/shared/PendingDeleteDialog'
import { TemplateLabelsDialog } from './components/shared/TemplateLabelsDialog'
import { useFlowStudioStore } from './hooks/useFlowStudioStore'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import type { DesignerMode } from './types/studioTypes'
import { MockDataProvider } from '@/business-apps/flow/providers'
import { useFlowStudioClient } from './hooks/useFlowStudioClient'
import { useFlowStudioData } from './hooks/useFlowStudioData'
import { validateFlow } from './hooks/useFlowValidation'
import { studioGraphToTemplate, templateToStudioGraph } from './utils/templateConverter'
import { buildFlowTestExecutionState } from './utils/flowTestExecutionMapper'
import { buildStepIndexByNodeId } from './utils/studioStepOrder'
import { FlowStudioCreateView } from './views/FlowStudioCreateView'
import { FlowStudioListView } from './views/FlowStudioListView'
import type { FlowTemplate } from '@/common/network/flows/FlowTemplateClient'
import type { FlowTestExecutionSnapshot } from '@/common/network/flows/flowTestExecutionTypes'
import { AssignmentMode, FlowStepType } from '@/common/data/flow/types/flowTemplate'

const FLOW_ID_PARAM = 'flowId'
const DRAFT_ID_PARAM = 'draftId'
const FLOW_ID_NEW = 'new'
const UNTITLED_FLOW_NAME = 'Untitled Flow'
const LIST_VIEW_CREATE = 'create'
const LIST_VIEW_FLOWS = 'flows'
const FLOW_HEADER_MAX_TAG_PILLS = 4
const FLOW_HEADER_PRIORITY_TAG_KEYS = ['app', 'serviceCategory', 'digitalWorkplaceCategory'] as const
type ListSubView = typeof LIST_VIEW_CREATE | typeof LIST_VIEW_FLOWS

function getExportFileName(name: string): string {
  const safeName = String(name || 'flow')
    .trim()
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return `${safeName || 'flow'}.flow.json`
}

function getImportedTemplate(value: unknown): FlowTemplate {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : null
  const template = raw && raw.template && typeof raw.template === 'object' ? raw.template : raw
  if (!template || typeof template !== 'object') {
    throw new Error('Invalid flow export')
  }
  const candidate = template as FlowTemplate
  if (!String(candidate.name || '').trim() || !Array.isArray((candidate as any).steps)) {
    throw new Error('Invalid flow template')
  }
  return candidate
}

function getImportedDraftName(name: string): string {
  const baseName = String(name || UNTITLED_FLOW_NAME).trim() || UNTITLED_FLOW_NAME
  const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ').replace(/:/g, '-')
  return `${baseName} (import ${timestamp})`
}

function getTemplateTagLabel(tagKey: string): string {
  if (tagKey === 'app') return 'App'
  if (tagKey === 'serviceCategory') return 'Service'
  if (tagKey === 'digitalWorkplaceCategory') return 'DWP'
  return tagKey
}

function getTemplateTagValueCode(tagValue: string): string {
  const tagValueParts = tagValue.split(':')
  return tagValueParts[tagValueParts.length - 1] || tagValue
}

function getTemplateTagPills(templateTags: Record<string, unknown> | null | undefined): string[] {
  const templateTagEntries = Object.entries(templateTags ?? {})
    .map(([rawTagKey, rawTagValue]) => ({
      key: String(rawTagKey || '').trim(),
      value: typeof rawTagValue === 'string' ? rawTagValue.trim() : ''
    }))
    .filter(({ key, value }) => Boolean(key) && Boolean(value))

  templateTagEntries.sort((leftEntry, rightEntry) => {
    const leftPriorityIndex = FLOW_HEADER_PRIORITY_TAG_KEYS.indexOf(
      leftEntry.key as (typeof FLOW_HEADER_PRIORITY_TAG_KEYS)[number]
    )
    const rightPriorityIndex = FLOW_HEADER_PRIORITY_TAG_KEYS.indexOf(
      rightEntry.key as (typeof FLOW_HEADER_PRIORITY_TAG_KEYS)[number]
    )

    if (leftPriorityIndex === -1 && rightPriorityIndex === -1) {
      return leftEntry.key.localeCompare(rightEntry.key)
    }

    if (leftPriorityIndex === -1) return 1
    if (rightPriorityIndex === -1) return -1
    return leftPriorityIndex - rightPriorityIndex
  })

  return templateTagEntries
    .slice(0, FLOW_HEADER_MAX_TAG_PILLS)
    .map(({ key, value }) => `${getTemplateTagLabel(key)}: ${getTemplateTagValueCode(value)}`)
}

/** Returns flow id from URL, or null when param is missing or equals "new" (create-new screen). */
function getFlowIdFromUrl(): string | null {
  if (globalThis.window === undefined) return null
  const urlParams = new URLSearchParams(globalThis.location.search)
  const id = urlParams.get(FLOW_ID_PARAM)?.trim() ?? ''
  if (id.toLowerCase() === FLOW_ID_NEW) return null
  return id || null
}

function getDraftIdFromUrl(): string | null {
  if (globalThis.window === undefined) return null
  const urlParams = new URLSearchParams(globalThis.location.search)
  const id = urlParams.get(DRAFT_ID_PARAM)?.trim() ?? ''
  return id || null
}

function updateUrlWithFlowId(flowId: string | null, push = false): void {
  if (globalThis.window === undefined) return
  const urlParams = new URLSearchParams(globalThis.location.search)
  if (flowId) {
    urlParams.set(FLOW_ID_PARAM, flowId)
    urlParams.delete(DRAFT_ID_PARAM)
  } else {
    urlParams.delete(FLOW_ID_PARAM)
    urlParams.delete(DRAFT_ID_PARAM)
  }
  const query = urlParams.toString()
  const newUrl = query
    ? `${globalThis.location.pathname}?${query}${globalThis.location.hash}`
    : `${globalThis.location.pathname}${globalThis.location.hash}`
  if (push) {
    globalThis.history.pushState({}, '', newUrl)
  } else {
    globalThis.history.replaceState({}, '', newUrl)
  }
}

function updateUrlWithDraftId(draftId: string | null, push = false): void {
  if (globalThis.window === undefined) return
  const urlParams = new URLSearchParams(globalThis.location.search)
  if (draftId) {
    urlParams.set(DRAFT_ID_PARAM, draftId)
    urlParams.delete(FLOW_ID_PARAM)
  } else {
    urlParams.delete(DRAFT_ID_PARAM)
    urlParams.delete(FLOW_ID_PARAM)
  }
  const query = urlParams.toString()
  const hash = draftId ? '#manage' : globalThis.location.hash
  const newUrl = query ? `${globalThis.location.pathname}?${query}${hash}` : `${globalThis.location.pathname}${hash}`
  if (push) {
    globalThis.history.pushState({}, '', newUrl)
  } else {
    globalThis.history.replaceState({}, '', newUrl)
  }
}

function getListSubViewFromHash(): ListSubView {
  if (globalThis.window === undefined) return LIST_VIEW_CREATE
  const hash = globalThis.location.hash.replace('#', '')
  if (hash === LIST_VIEW_FLOWS) return LIST_VIEW_FLOWS
  return LIST_VIEW_CREATE
}

function setHashForListSubView(subView: ListSubView): void {
  if (globalThis.window === undefined) return
  globalThis.location.hash = subView
}

function isUntitledTemplateName(value: string): boolean {
  const trimmed = String(value || '').trim()
  return trimmed.length === 0 || trimmed === UNTITLED_FLOW_NAME
}

function getPatternClaimCapability(role: string | undefined): string {
  return String(role || '').trim() || 'Flow participant'
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
  const selectedNodeId = useFlowStudioStore(s => s.selectedNodeId)
  const selectedEdgeId = useFlowStudioStore(s => s.selectedEdgeId)
  const resetStore = useFlowStudioStore(s => s.resetStore)
  const selectNode = useFlowStudioStore(s => s.selectNode)
  const selectEdge = useFlowStudioStore(s => s.selectEdge)
  const loadTemplateIntoStore = useFlowStudioStore(s => s.loadTemplate)
  const toGraphDefinition = useFlowStudioStore(s => s.toGraphDefinition)

  const { saveFlow, loadFlow, loadDraft, isLoading } = useFlowStudioClient(accessToken)
  const studioData = useFlowStudioData(accessToken)
  const urlFlowIdOnMount = getFlowIdFromUrl()
  const urlDraftIdOnMount = getDraftIdFromUrl()
  const [view, setView] = useState<'list' | 'designer'>(
    templateId || urlFlowIdOnMount || urlDraftIdOnMount ? 'designer' : 'list'
  )
  const [listSubView, setListSubView] = useState<ListSubView>(() => getListSubViewFromHash())
  const [labelsOpen, setLabelsOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [designerInitialPrompt, setDesignerInitialPrompt] = useState('')
  const initialPromptConsumedRef = useRef(false)
  const [chatPanelCollapsed, setChatPanelCollapsed] = useState(false)
  const [saveNameDialogOpen, setSaveNameDialogOpen] = useState(false)
  const [pendingTemplateName, setPendingTemplateName] = useState('')
  const [saveNameError, setSaveNameError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showValidationIssues, setShowValidationIssues] = useState(false)
  const [testSheetOpen, setTestSheetOpen] = useState(false)
  const [testSheetKey, setTestSheetKey] = useState(0)
  const [canvasResetKey, setCanvasResetKey] = useState(0)
  const [testTemplateDefinition, setTestTemplateDefinition] = useState<any | null>(null)
  const [initialTestStepKey, setInitialTestStepKey] = useState<string | null>(null)
  const [singleStepSelectionRequest, setSingleStepSelectionRequest] = useState<{
    stepKey: string | null
    requestId: number
  } | null>(null)
  const [testSheetScope, setTestSheetScope] = useState<TestScope>('flow')
  const [testExecutionSnapshot, setTestExecutionSnapshot] = useState<FlowTestExecutionSnapshot | null>(null)
  const handleTestExecutionSnapshot = useCallback((snapshot: FlowTestExecutionSnapshot | null) => {
    setTestExecutionSnapshot(current => {
      if (!snapshot) return null
      if (!current || current.workflowId !== snapshot.workflowId) return snapshot
      return {
        ...snapshot,
        outcomes: { ...current.outcomes, ...snapshot.outcomes },
        summaryData: snapshot.summaryData.length > 0 ? snapshot.summaryData : current.summaryData
      }
    })
  }, [])
  const importFileInputRef = useRef<HTMLInputElement | null>(null)
  const testExecutionState = useMemo(
    () => buildFlowTestExecutionState(nodes, edges, testExecutionSnapshot),
    [edges, nodes, testExecutionSnapshot]
  )
  useEffect(() => {
    if (view !== 'list') return
    const onHashChange = () => setListSubView(getListSubViewFromHash())
    globalThis.window?.addEventListener('hashchange', onHashChange)
    return () => globalThis.window?.removeEventListener('hashchange', onHashChange)
  }, [view])

  useEffect(() => {
    if (view !== 'list') return
    const current = getListSubViewFromHash()
    if (current !== listSubView) setHashForListSubView(listSubView)
  }, [view, listSubView])

  const handleModeChange = useCallback(
    (newMode: DesignerMode) => {
      setMode(newMode)
    },
    [setMode]
  )
  const templateTagPills = getTemplateTagPills(templateTags as Record<string, unknown>)
  const getSaveErrorMessage = useCallback(
    (error: unknown) => (error instanceof Error ? error.message : 'Failed to save flow'),
    []
  )

  const resetTestFlowState = useCallback(() => {
    setTestSheetOpen(false)
    setTestTemplateDefinition(null)
    setSingleStepSelectionRequest(null)
    setTestExecutionSnapshot(null)
    setTestSheetScope('flow')
    setCanvasResetKey(current => current + 1)
  }, [])

  const openTemplateFromList = useCallback(
    async (id: string) => {
      setSaveError(null)
      resetTestFlowState()
      updateUrlWithFlowId(id, true)
      setView('designer')
      try {
        await loadFlow(id)
      } catch {
        // ignore; list view shows its own errors
      }
    },
    [loadFlow, resetTestFlowState]
  )

  const openTemplateAfterCreate = useCallback(
    (templateId: string) => {
      resetTestFlowState()
      updateUrlWithFlowId(templateId, true)
      setView('designer')
      loadFlow(templateId).catch(() => undefined)
    },
    [loadFlow, resetTestFlowState]
  )

  const createNewFlow = useCallback(() => {
    setSaveError(null)
    resetTestFlowState()
    updateUrlWithFlowId(FLOW_ID_NEW)
    setDesignerInitialPrompt('')
    resetStore()
    setView('designer')
  }, [resetStore, resetTestFlowState])

  const openDesignerWithAI = useCallback(
    (prompt: string) => {
      resetTestFlowState()
      updateUrlWithFlowId(FLOW_ID_NEW)
      initialPromptConsumedRef.current = false
      setDesignerInitialPrompt(prompt)
      resetStore()
      setView('designer')
    },
    [resetStore, resetTestFlowState]
  )

  const createNewFlowFromPattern = useCallback(
    (pattern: { name: string; description: string; steps: string[]; roles: string[] }) => {
      setSaveError(null)
      updateUrlWithFlowId(FLOW_ID_NEW)
      setDesignerInitialPrompt('')

      const template: any = {
        type: 'TEMPLATE',
        name: pattern.name,
        description: pattern.description,
        version: 1,
        start: {
          triggers: [{ id: 'start_manual', type: 'MANUAL_FORM', active: true, config: {} }]
        },
        steps: pattern.steps.map((stepName, i) => ({
          id: `step_${i}`,
          reference: `step_${i}`,
          type: FlowStepType.TASK,
          title: stepName,
          assignment: {
            targets: { capabilities: [getPatternClaimCapability(pattern.roles[i])] },
            assignmentMode: AssignmentMode.CLAIM
          }
        }))
      }

      const graph = templateToStudioGraph(template)
      loadTemplateIntoStore(undefined, graph.nodes, graph.edges, {
        name: pattern.name,
        description: pattern.description,
        version: 1,
        tags: {}
      })
      useFlowStudioStore.setState({ isDirty: false, templateId: undefined })
      setShowValidationIssues(false)
      setView('designer')
    },
    [loadTemplateIntoStore]
  )

  const backToList = useCallback(() => {
    setSaveError(null)
    resetTestFlowState()
    updateUrlWithFlowId(null)
    selectNode(null)
    selectEdge(null)
    setView('list')
    onCancel?.()
  }, [onCancel, resetTestFlowState, selectEdge, selectNode])

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

  const requestTestFlow = useCallback(
    (singleStepKey?: string | null) => {
      if (view !== 'designer') return
      const rawSingleStepKey = typeof singleStepKey === 'string' && singleStepKey.trim() ? singleStepKey : null
      const state = useFlowStudioStore.getState()
      const stepIndexByNodeId = rawSingleStepKey ? buildStepIndexByNodeId(state.nodes, state.edges) : null
      const requestedSingleStepKey =
        rawSingleStepKey && /^step_\d+$/.test(rawSingleStepKey)
          ? rawSingleStepKey
          : rawSingleStepKey && stepIndexByNodeId?.has(rawSingleStepKey)
            ? `step_${stepIndexByNodeId.get(rawSingleStepKey)}`
            : rawSingleStepKey

      setShowValidationIssues(true)
      setSaveError(null)
      setInitialTestStepKey(requestedSingleStepKey)

      const validationErrors = validateFlow(state.nodes, state.edges).filter(issue => issue.severity === 'error')
      if (validationErrors.length > 0) {
        setSaveError(
          `Validation failed: ${validationErrors
            .slice(0, 3)
            .map(issue => issue.message)
            .join('; ')}${validationErrors.length > 3 ? '...' : ''}`
        )
        return
      }

      if (testSheetOpen) {
        setTestExecutionSnapshot(null)
        return
      }

      setTestExecutionSnapshot(null)
      setTestTemplateDefinition(null)
      selectNode(null)
      selectEdge(null)

      const template = studioGraphToTemplate(
        state.nodes,
        state.edges,
        state.templateName,
        state.templateDescription,
        { ...(state.templateTags ?? {}), execution: 'test' } as any,
        state.templateVersion
      )

      setTestTemplateDefinition(template)
      setTestSheetKey(current => current + 1)
      setTestSheetOpen(true)
    },
    [selectEdge, selectNode, testSheetOpen, view]
  )

  const testOverlayGraphDefinition = useMemo(() => {
    const definition = toGraphDefinition()
    const issues = validateFlow(nodes, edges)
    const issuesByNode = new Map<string, typeof issues>()
    for (const issue of issues) {
      if (!issue.nodeId) continue
      issuesByNode.set(issue.nodeId, [...(issuesByNode.get(issue.nodeId) ?? []), issue])
    }
    return {
      ...definition,
      nodes: definition.nodes.map(node => {
        return {
          ...node,
          metadata: {
            ...(node.metadata ?? {}),
            validationIssues: issuesByNode.get(node.id)?.map(issue => ({
              severity: issue.severity,
              message: issue.message
            })),
            actions:
              node.type === 'task'
                ? {
                    onTest: () => requestTestFlow(node.id)
                  }
                : undefined
          }
        }
      })
    }
  }, [edges, nodes, requestTestFlow, toGraphDefinition])

  const testPreviewRightPanel =
    selectedNodeId || selectedEdgeId ? (
      <ConfigPanelContainer
        mode={mode}
        accessToken={accessToken}
        studioData={studioData}
        onTestStep={requestTestFlow}
        readOnly
        data-testid={`${testId}-test-preview-config-panel`}
      />
    ) : null

  const handleTestSheetOpenChange = useCallback((open: boolean) => {
    setTestSheetOpen(open)
    if (!open) {
      setTestTemplateDefinition(null)
      setInitialTestStepKey(null)
      setSingleStepSelectionRequest(null)
      setTestExecutionSnapshot(null)
      setTestSheetScope('flow')
    }
  }, [])

  const handleTestPreviewNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id)
      if (testSheetScope !== 'single-step') return

      const state = useFlowStudioStore.getState()
      if (state.nodes.find(item => item.id === node.id)?.type !== 'task') return

      const stepIndex = buildStepIndexByNodeId(state.nodes, state.edges).get(node.id)
      if (typeof stepIndex !== 'number') return

      setSingleStepSelectionRequest(current => ({
        stepKey: `step_${stepIndex}`,
        requestId: (current?.requestId ?? 0) + 1
      }))
    },
    [selectNode, testSheetScope]
  )

  const handleSingleStepSelectionChange = useCallback(
    (stepKey: string | null) => {
      if (!stepKey) {
        selectNode(null)
        selectEdge(null)
        return
      }

      const match = /^step_(\d+)$/.exec(stepKey)
      if (!match) return

      const selectedStepIndex = Number(match[1])
      if (!Number.isInteger(selectedStepIndex)) return

      const state = useFlowStudioStore.getState()
      const stepIndexByNodeId = buildStepIndexByNodeId(state.nodes, state.edges)
      const selectedNodeEntry = Array.from(stepIndexByNodeId.entries()).find(
        ([, stepIndex]) => stepIndex === selectedStepIndex
      )
      const selectedNodeIdFromStep = selectedNodeEntry?.[0]
      if (!selectedNodeIdFromStep) return

      selectEdge(null)
      selectNode(selectedNodeIdFromStep)
    },
    [selectEdge, selectNode]
  )

  const exportFlow = useCallback(() => {
    if (view !== 'designer') return
    setSaveError(null)

    const state = useFlowStudioStore.getState()
    const template = studioGraphToTemplate(
      state.nodes,
      state.edges,
      state.templateName,
      state.templateDescription,
      state.templateTags,
      state.templateVersion,
      state.templateId
    )
    const exportPayload = {
      format: 'newwork-flow-template',
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      template
    }
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = getExportFileName(template.name)
    anchor.click()
    URL.revokeObjectURL(url)
  }, [view])

  const importFlow = useCallback(() => {
    importFileInputRef.current?.click()
  }, [])

  const handleImportFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return

      try {
        const parsed = JSON.parse(await file.text())
        const template = getImportedTemplate(parsed)
        const importedName = getImportedDraftName(template.name)
        const graph = templateToStudioGraph(template)
        loadTemplateIntoStore(undefined, graph.nodes, graph.edges, {
          name: importedName,
          description: template.description,
          version: template.version || 1,
          tags: template.tags
        })
        resetTestFlowState()
        useFlowStudioStore.setState({ isDirty: true, templateId: undefined })
        updateUrlWithFlowId(FLOW_ID_NEW, true)
        setDesignerInitialPrompt('')
        setShowValidationIssues(false)
        setSaveError(null)
        setView('designer')
      } catch {
        setSaveError(t('studio-import-failed'))
      }
    },
    [loadTemplateIntoStore, resetTestFlowState, t]
  )

  useEffect(() => {
    setShowValidationIssues(false)
    if (testSheetOpen) return
    setTestExecutionSnapshot(null)
  }, [edges, nodes, testSheetOpen])

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

  const loadFlowOrDraft = useCallback(
    async (id: string) => {
      try {
        await loadFlow(id)
      } catch (flowError) {
        try {
          await loadDraft(id)
          updateUrlWithDraftId(id)
        } catch {
          throw flowError
        }
      }
    },
    [loadDraft, loadFlow]
  )

  // Load flow when templateId prop is set (parent control)
  useEffect(() => {
    if (!templateId) return
    resetTestFlowState()
    setView('designer')
    loadFlow(templateId).catch(() => undefined)
  }, [loadFlow, resetTestFlowState, templateId])

  // Load flow from URL on mount when no templateId prop (direct link / bookmark)
  useEffect(() => {
    if (templateId || !urlFlowIdOnMount) return
    resetTestFlowState()
    setView('designer')
    loadFlowOrDraft(urlFlowIdOnMount).catch(() => updateUrlWithFlowId(null))
  }, [loadFlowOrDraft, resetTestFlowState, templateId, urlFlowIdOnMount])

  // Load draft from URL on mount when no persisted flow id is present.
  useEffect(() => {
    if (templateId || urlFlowIdOnMount || !urlDraftIdOnMount) return
    resetTestFlowState()
    setView('designer')
    loadDraft(urlDraftIdOnMount).catch(() => updateUrlWithFlowId(null))
  }, [loadDraft, resetTestFlowState, templateId, urlDraftIdOnMount, urlFlowIdOnMount])

  // React to browser back/forward (URL change)
  useEffect(() => {
    const handlePopState = () => {
      const flowId = getFlowIdFromUrl()
      const draftId = getDraftIdFromUrl()
      resetTestFlowState()
      if (flowId) {
        setView('designer')
        loadFlowOrDraft(flowId).catch(() => updateUrlWithFlowId(null))
      } else if (draftId) {
        setView('designer')
        loadDraft(draftId).catch(() => updateUrlWithFlowId(null))
      } else {
        setView('list')
      }
    }
    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [loadDraft, loadFlowOrDraft, resetTestFlowState])

  useKeyboardShortcuts({ onSave: requestSave, enabled: view === 'designer' })

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0 gba:w-full gba:bg-background" data-testid={testId}>
      {view === 'designer' ? (
        <>
          {saveError ? (
            <div
              className="gba:shrink-0 gba:border-b gba:border-destructive-secondary gba:bg-destructive-secondary gba:px-5 gba:py-3"
              data-testid={`${testId}-save-error`}
            >
              <p className="gba:text-sm gba:text-destructive-secondary-foreground">{saveError}</p>
            </div>
          ) : null}
          <CreateLayout
            heroVariant="editor"
            heroOverline={t('app-eyebrow')}
            heroIcon={<Workflow className="gba:w-5 gba:h-5 gba:text-white" />}
            heroBackground={<PremiumHeroBackground />}
            heroTitle={
              <input
                type="text"
                value={templateName}
                onChange={event => setTemplateMetadata({ name: event.target.value })}
                className="gba:w-[min(72vw,72rem)] gba:max-w-none gba:text-xl gba:sm:text-3xl gba:font-semibold gba:bg-transparent gba:border-none gba:outline-none gba:p-0 gba:leading-tight gba:text-white placeholder:gba:text-white/50"
                placeholder={t('app-title')}
                aria-label={t('app-title')}
                data-testid={`${testId}-name-input`}
              />
            }
            heroSubtitle={t('app-description')}
            onBack={requestCloseToList}
            heroBackLabel={t('studio-back-to-list')}
            heroExtra={
              <div
                className="gba:flex gba:flex-col gba:items-end gba:gap-2"
                data-testid={`${testId}-hero-extra-content`}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  tone="inverse"
                  onClick={() => setLabelsOpen(true)}
                  data-testid={`${testId}-labels-trigger`}
                  type="button"
                >
                  {t('labels-title')}
                </Button>
                {templateTagPills.length > 0 || isLoading ? (
                  <div
                    className="gba:flex gba:max-w-sm gba:flex-wrap gba:justify-end gba:gap-2"
                    data-testid={`${testId}-labels-row`}
                  >
                    {templateTagPills.map((templateTagPill, templateTagPillIndex) => (
                      <Badge
                        key={`${templateTagPill}-${templateTagPillIndex}`}
                        variant="outline"
                        size="sm"
                        className="gba:border-white/15 gba:bg-white/10 gba:text-white/80"
                        data-testid={`${testId}-tag-pill-${templateTagPillIndex}`}
                      >
                        {templateTagPill}
                      </Badge>
                    ))}
                    {isLoading ? (
                      <Badge
                        variant="outline"
                        size="sm"
                        className="gba:border-white/15 gba:bg-white/10 gba:text-white/80"
                        data-testid={`${testId}-loading-pill`}
                      >
                        {t('studio-loading')}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}
                <Badge variant={isDirty ? 'info' : 'success'} size="sm" data-testid={`${testId}-save-status-pill`}>
                  {isDirty ? t('studio-unsaved-changes') : t('studio-saved')}
                </Badge>
              </div>
            }
            chatPanel={
              <FlowStudioChatPanel
                accessToken={accessToken}
                userInfo={userInfo}
                initialPrompt={initialPromptConsumedRef.current ? '' : designerInitialPrompt}
                onInitialPromptConsumed={() => {
                  initialPromptConsumedRef.current = true
                  setDesignerInitialPrompt('')
                }}
                onClose={() => setChatPanelCollapsed(true)}
                data-testid={`${testId}-chat-panel`}
              />
            }
            canvasPanel={
              <FlowStudioCanvas
                key={canvasResetKey}
                accessToken={accessToken}
                userInfo={userInfo}
                mode={mode}
                onModeChange={handleModeChange}
                onSave={requestSave}
                onTestFlow={requestTestFlow}
                onImportFlow={importFlow}
                onExportFlow={exportFlow}
                testExecutionState={testExecutionState}
                showValidationIssues={showValidationIssues}
                data-testid={`${testId}-canvas`}
              />
            }
            chatPanelCollapsed={chatPanelCollapsed}
            onChatPanelCollapseChange={setChatPanelCollapsed}
            data-testid={`${testId}-create-layout`}
          />
        </>
      ) : null}
      {view === 'list' ? (
        <CreateLayout
          heroVariant="overview"
          heroOverline={t('app-eyebrow')}
          heroIcon={<Workflow className="gba:w-8 gba:h-8 gba:text-white" />}
          heroBackground={<PremiumHeroBackground />}
          heroTitle={t('list-title')}
          heroSubtitle={listSubView === LIST_VIEW_CREATE ? t('list-subtitle-create') : t('list-subtitle')}
          views={[
            {
              value: LIST_VIEW_CREATE,
              label: t('list-tab-create'),
              icon: <Sparkles className="gba:h-4 gba:w-4" />
            },
            {
              value: LIST_VIEW_FLOWS,
              label: t('list-tab-flows'),
              icon: <FileText className="gba:h-4 gba:w-4" />
            }
          ]}
          currentView={listSubView}
          onViewChange={value => {
            if (value === LIST_VIEW_CREATE || value === LIST_VIEW_FLOWS) {
              setListSubView(value)
            }
          }}
          canvasPanel={
            listSubView === LIST_VIEW_CREATE ? (
              <MockDataProvider>
                <FlowStudioCreateView
                  accessToken={accessToken}
                  userInfo={userInfo}
                  onCreateNewFlow={createNewFlow}
                  onOpenDesignerWithAI={openDesignerWithAI}
                  onCreateFromPattern={createNewFlowFromPattern}
                  onTemplateCreated={openTemplateAfterCreate}
                  data-testid={`${testId}-create-view`}
                />
              </MockDataProvider>
            ) : (
              <FlowStudioListView
                accessToken={accessToken}
                onCreateFlow={createNewFlow}
                onImportFlow={importFlow}
                onOpenTemplate={openTemplateFromList}
                data-testid={`${testId}-list`}
              />
            )
          }
          data-testid={`${testId}-overview-layout`}
        />
      ) : null}

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

      <FlowLaunchSheet
        key={testSheetKey}
        open={testSheetOpen}
        onOpenChange={handleTestSheetOpenChange}
        accessToken={accessToken}
        userInfo={userInfo}
        templateId={null}
        templateDefinition={testTemplateDefinition}
        mode="test"
        initialSingleStepKey={initialTestStepKey}
        singleStepSelectionRequest={singleStepSelectionRequest}
        onTestScopeChange={setTestSheetScope}
        onSingleStepSelectionChange={handleSingleStepSelectionChange}
        onTestExecutionSnapshot={handleTestExecutionSnapshot}
        testPreview={
          <div className="gba:flex gba:h-full gba:min-h-0 gba:flex-col" data-testid={`${testId}-test-preview`}>
            <div className="gba:shrink-0 gba:border-b gba:border-border gba:bg-background/95 gba:px-5 gba:py-3">
              <div className="gba:text-sm gba:font-semibold">Live test preview</div>
              <div className="gba:text-xs gba:text-muted-foreground">
                This preview mirrors the current flow while the editor canvas stays unchanged underneath.
              </div>
            </div>
            <div className="gba:min-h-0 gba:flex-1">
              <FlowCanvasProvider
                isInteractive={false}
                selectedNodeId={selectedNodeId}
                onNodeSelect={selectNode}
                selectedEdgeId={selectedEdgeId}
                onEdgeSelect={selectEdge}
                executionState={testExecutionState}
              >
                <FlowCanvas
                  definition={testOverlayGraphDefinition}
                  rightPanel={testPreviewRightPanel}
                  onNodeClick={handleTestPreviewNodeClick}
                  onPaneClick={() => {
                    selectNode(null)
                    selectEdge(null)
                  }}
                  useForwardEdgesOnlyForRanking={true}
                  fitViewOptions={{ padding: 0.26, minZoom: 0.65, maxZoom: 0.95 }}
                  showMiniMap={false}
                  elementsSelectable={false}
                  data-testid={`${testId}-test-preview-canvas`}
                />
              </FlowCanvasProvider>
            </div>
          </div>
        }
        data-testid={`${testId}-test-flow-sheet`}
      />

      <input
        ref={importFileInputRef}
        type="file"
        accept="application/json,.json,.flow.json"
        className="gba:hidden"
        onChange={event => {
          void handleImportFileChange(event)
        }}
        data-testid={`${testId}-import-file-input`}
      />

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
