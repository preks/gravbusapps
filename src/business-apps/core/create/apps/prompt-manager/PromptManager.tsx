import React, { useCallback, useEffect, useMemo, useState } from 'react'
import '@newwork/nw-design-system/style'
import { Button, Tabs, TabsContent, TabsList, TabsTrigger, useTranslation } from '@newwork/nw-design-system'
import { Bot, ListPlus } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { KnowledgeSource } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { CreateHeroHeader } from '../../components/CreateHeroHeader'
import { TaskExpertsSpace } from './components/TaskExpertsSpace'
import { TaskExpertEditor } from './components/TaskExpertEditor'
import { TaskExpertView } from './components/TaskExpertView'
import MonitoringTab from './components/monitoring/MonitoringTab'
import { ToolsSpace } from './components/ToolsSpace'
import translations from './_i18n'
import type { AgentBuilderInitialState } from './hooks/useAgentBuilderState'

/** Build the initial state for a policy-based expert from URL params. */
const buildPolicyInitialState = (params: URLSearchParams): AgentBuilderInitialState | undefined => {
  const sourceContentEntryId = params.get('sourceContentEntryId')
  const policyRootId = params.get('policyRootId')
  const policyTitle = params.get('policyTitle')
  if (!sourceContentEntryId && !policyRootId) return undefined

  const now = new Date().toISOString()
  const knowledgeSources: KnowledgeSource[] = sourceContentEntryId
    ? [
        {
          type: 'content_entry',
          name: policyTitle ? `Policy: ${policyTitle}` : 'Policy',
          description: policyTitle ? `Knowledge source: ${policyTitle}` : undefined,
          contentEntryId: sourceContentEntryId,
          lastUpdated: now,
          createdAt: now
        }
      ]
    : []

  const tags = [`policy:${policyRootId || sourceContentEntryId || ''}`]

  return {
    name: policyTitle ? `Policy expert — ${policyTitle}` : '',
    agentType: 'everyai',
    specialty: policyTitle ? `Policy: ${policyTitle}` : 'Policy expert',
    knowledgeSources,
    tags
  }
}

type UrlAction =
  | { type: 'create'; initialState?: AgentBuilderInitialState }
  | { type: 'edit'; expertId: string }
  | { type: 'view'; expertId: string }
  | { type: 'tab'; tab: 'monitoring' }
  | null

/** Parse URL search params into a navigation action. */
const parseUrlAction = (search: string): UrlAction => {
  const params = new URLSearchParams(search)
  const pmTab = params.get('pmTab')
  const expertId = params.get('expertId')
  const expertMode = params.get('expertMode')

  if (expertId === 'new') {
    return { type: 'create', initialState: buildPolicyInitialState(params) }
  }
  if (expertId && expertMode === 'edit') {
    return { type: 'edit', expertId }
  }
  if (expertId) {
    return { type: 'view', expertId }
  }
  if (pmTab === 'monitoring') {
    return { type: 'tab', tab: 'monitoring' }
  }
  return null
}

const TaskExpertStudio: React.FC<BusinessAppContextProps> = context => {
  const { t } = useTranslation(translations)
  const [labelsReady, setLabelsReady] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewingPromptId, setViewingPromptId] = useState<string | null>(null)
  const [viewingPromptName, setViewingPromptName] = useState<string>('')
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null)
  const [editingPromptName, setEditingPromptName] = useState<string>('')
  const [shouldRefresh, setShouldRefresh] = useState(0)
  const [activeTab, setActiveTab] = useState<'task-experts' | 'tools' | 'monitoring'>('task-experts')
  const [createInitialState, setCreateInitialState] = useState<AgentBuilderInitialState | undefined>(undefined)

  // Legacy tab param cleanup
  useEffect(() => {
    const onPop = () => {
      const url = new URL(globalThis.location?.href || 'http://localhost')
      if (url.searchParams.has('tab')) {
        url.searchParams.delete('tab')
        globalThis.history?.replaceState?.({}, '', url.toString())
      }
    }
    globalThis.addEventListener?.('popstate', onPop)
    return () => globalThis.removeEventListener?.('popstate', onPop)
  }, [])

  // Force one post-mount rerender so late i18n bundle registration does not leave raw keys on first paint.
  useEffect(() => {
    setLabelsReady(true)
  }, [])

  // Handle URL parameter for direct expert access
  useEffect(() => {
    if (editingPromptId || viewingPromptId || isCreateOpen) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('pmTab') === 'connections') {
      navigateTo(buildPlatformUrl('/platform/create/connect'))
      return
    }
    const action = parseUrlAction(window.location.search)
    if (!action) return

    switch (action.type) {
      case 'create':
        setCreateInitialState(action.initialState)
        setIsCreateOpen(true)
        break
      case 'edit':
        setEditingPromptId(action.expertId)
        break
      case 'view':
        setViewingPromptId(action.expertId)
        break
      case 'tab':
        setActiveTab(action.tab)
        break
    }
  }, [editingPromptId, viewingPromptId, isCreateOpen])

  const updateUrl = useCallback((expertId: string | null, mode?: 'view' | 'edit') => {
    const urlParams = new URLSearchParams(window.location.search)
    if (expertId) {
      urlParams.set('expertId', expertId)
      if (mode === 'edit') {
        urlParams.set('expertMode', 'edit')
      } else {
        urlParams.delete('expertMode')
      }
    } else {
      urlParams.delete('expertId')
      urlParams.delete('expertMode')
    }
    const newUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname
    window.history.pushState({}, '', newUrl)
  }, [])

  const setTabAndUrl = useCallback((tab: 'task-experts' | 'tools' | 'monitoring') => {
    setActiveTab(tab)
    const urlParams = new URLSearchParams(window.location.search)
    if (tab === 'monitoring') urlParams.set('pmTab', 'monitoring')
    else urlParams.delete('pmTab')
    const newUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname
    window.history.pushState({}, '', newUrl)
  }, [])

  const onCreateTaskExpert = useCallback(() => {
    setIsCreateOpen(true)
    setCreateInitialState(undefined)
    updateUrl('new')
  }, [updateUrl])

  const onViewPrompt = useCallback(
    (id: string, name: string) => {
      setViewingPromptId(id)
      setViewingPromptName(name)
      updateUrl(id, 'view')
    },
    [updateUrl]
  )

  const onEditPrompt = useCallback(
    (id: string, name: string) => {
      setEditingPromptId(id)
      setEditingPromptName(name)
      updateUrl(id, 'edit')
    },
    [updateUrl]
  )

  const onViewClosed = useCallback(() => {
    setViewingPromptId(null)
    setViewingPromptName('')
    updateUrl(null)
  }, [updateUrl])

  const onEditorClosed = useCallback(() => {
    // If we came from the view, go back to view; otherwise go to list
    if (viewingPromptId) {
      setEditingPromptId(null)
      setEditingPromptName('')
      updateUrl(viewingPromptId, 'view')
    } else {
      setEditingPromptId(null)
      setEditingPromptName('')
      setIsCreateOpen(false)
      setCreateInitialState(undefined)
      updateUrl(null)
    }
  }, [updateUrl, viewingPromptId])

  const onEditorSaved = useCallback(() => {
    setShouldRefresh(prev => prev + 1)
  }, [])

  const renderToolsTab = () => <ToolsSpace {...context} />
  const renderMonitoringTab = () => <MonitoringTab {...context} labelsReady={labelsReady} />

  const pageTitle = useMemo(() => t('page-title'), [t, labelsReady])
  const pageDescription = useMemo(() => t('page-description'), [t, labelsReady])
  const createTaskExpertLabel = useMemo(() => t('create-task-expert'), [t, labelsReady])
  const editTaskExpertLabel = useMemo(() => t('edit-task-expert'), [t, labelsReady])
  const viewTaskExpertLabel = useMemo(() => t('view-task-expert'), [t, labelsReady])
  const newTaskExpertLabel = useMemo(() => t('new-task-expert'), [t, labelsReady])
  const taskExpertsTabLabel = useMemo(() => t('tab-task-experts'), [t, labelsReady])
  const monitoringTabLabel = useMemo(() => t('tab-monitoring'), [t, labelsReady])
  const toolsTabLabel = useMemo(() => t('tab-tools'), [t, labelsReady])

  // Create mode
  if (isCreateOpen) {
    return (
      <div data-testid="prompt-manager-app" className="gba:flex gba:flex-col gba:h-full gba:w-full gba:bg-background">
        <CreateHeroHeader
          icon={Bot}
          appLabel="Create"
          title={createTaskExpertLabel}
          description={pageDescription}
          data-testid="prompt-manager-hero"
        />
        <div className="gba:flex gba:flex-1 gba:overflow-hidden">
          <div className="gba:flex-1 gba:overflow-auto gba:p-6 gba:bg-muted/50">
            <TaskExpertEditor
              {...context}
              mode="create"
              promptId={null}
              initialState={createInitialState}
              onSaved={() => {
                onEditorClosed()
                onEditorSaved()
              }}
              onBack={onEditorClosed}
            />
          </div>
        </div>
      </div>
    )
  }

  // Edit mode
  if (editingPromptId) {
    return (
      <div data-testid="prompt-manager-app" className="gba:flex gba:flex-col gba:h-full gba:w-full gba:bg-background">
        <CreateHeroHeader
          icon={Bot}
          appLabel="Create"
          title={editingPromptName || editTaskExpertLabel}
          description={pageDescription}
          data-testid="prompt-manager-hero"
        />
        <div className="gba:flex gba:flex-1 gba:overflow-hidden">
          <div className="gba:flex-1 gba:overflow-auto gba:p-6 gba:bg-muted/50">
            <TaskExpertEditor
              {...context}
              mode="edit"
              promptId={editingPromptId}
              onSaved={() => {
                onEditorSaved()
                onEditorClosed()
              }}
              onNameLoaded={setEditingPromptName}
              onGoToDashboard={() => {
                setEditingPromptId(null)
                setEditingPromptName('')
                setViewingPromptId(editingPromptId)
                setViewingPromptName(editingPromptName)
                updateUrl(editingPromptId, 'view')
              }}
              onBack={onEditorClosed}
            />
          </div>
        </div>
      </div>
    )
  }

  // View mode
  if (viewingPromptId) {
    return (
      <div data-testid="prompt-manager-app" className="gba:flex gba:flex-col gba:h-full gba:w-full gba:bg-background">
        <CreateHeroHeader
          icon={Bot}
          appLabel="Create"
          title={viewingPromptName || viewTaskExpertLabel}
          description={pageDescription}
          data-testid="prompt-manager-hero"
        />
        <div className="gba:flex gba:flex-1 gba:overflow-hidden">
          <div className="gba:flex-1 gba:overflow-auto gba:p-6 gba:bg-muted/50">
            <TaskExpertView
              {...context}
              promptId={viewingPromptId}
              onBack={onViewClosed}
              onEdit={() => onEditPrompt(viewingPromptId, viewingPromptName)}
              onNameLoaded={setViewingPromptName}
            />
          </div>
        </div>
      </div>
    )
  }

  // List mode
  return (
    <div data-testid="prompt-manager-app" className="gba:flex gba:flex-col gba:h-full gba:w-full gba:bg-background">
      <CreateHeroHeader
        icon={Bot}
        appLabel="Create"
        title={pageTitle}
        description={pageDescription}
        actions={
          <Button
            variant="secondary"
            tone="inverse"
            size="sm"
            onClick={onCreateTaskExpert}
            data-testid="prompt-manager-create-button"
            type="button"
          >
            <ListPlus className="gba:h-4 gba:w-4 gba:mr-1" />
            {newTaskExpertLabel}
          </Button>
        }
        data-testid="prompt-manager-hero"
      />
      <div className="gba:flex gba:flex-1 gba:overflow-hidden">
        <div className="gba:flex-1 gba:overflow-auto gba:p-6 gba:bg-muted/50">
          <Tabs value={activeTab} onValueChange={v => setTabAndUrl(v as any)} className="gba:w-full">
            <TabsList className="gba:mb-4" data-testid="prompt-manager-tabs">
              <TabsTrigger value="task-experts" data-testid="prompt-manager-tab-task-experts">
                {taskExpertsTabLabel}
              </TabsTrigger>
              <TabsTrigger value="monitoring" data-testid="prompt-manager-tab-monitoring">
                {monitoringTabLabel}
              </TabsTrigger>
              <TabsTrigger value="tools" data-testid="prompt-manager-tab-tools">
                {toolsTabLabel}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="task-experts" data-testid="prompt-manager-tab-content-task-experts">
              <TaskExpertsSpace
                {...context}
                labelsReady={labelsReady}
                onViewPrompt={onViewPrompt}
                onEditPrompt={onEditPrompt}
                refreshKey={shouldRefresh}
              />
            </TabsContent>

            <TabsContent value="monitoring" data-testid="prompt-manager-tab-content-monitoring">
              {renderMonitoringTab()}
            </TabsContent>

            <TabsContent value="tools" data-testid="prompt-manager-tab-content-tools">
              {renderToolsTab()}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default TaskExpertStudio
