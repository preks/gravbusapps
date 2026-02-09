import React, { useCallback, useEffect, useState } from 'react'
import '@newwork/nw-design-system/style'
import { PageLayout, Tabs, TabsList, TabsTrigger, TabsContent, useTranslation } from '@newwork/nw-design-system'
import { Bot } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TaskExpertsSpace } from './components/TaskExpertsSpace'
import { TaskExpertEditor } from './components/TaskExpertEditor'
import { TaskExpertView } from './components/TaskExpertView'
import { ToolsSpace } from './components/ToolsSpace'
import MonitoringTab from './components/monitoring/MonitoringTab'
import translations from './_i18n'
import type { KnowledgeSource } from '@/common/network/ai/prompt-manager/PromptManagerClient'
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

  // Handle URL parameter for direct expert access
  useEffect(() => {
    if (editingPromptId || viewingPromptId || isCreateOpen) return
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
  }, [])

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
  const renderMonitoringTab = () => <MonitoringTab {...context} />

  // Create mode (keep editor mounted; allow switching to Tools tab)
  if (isCreateOpen) {
    return (
      <div data-testid="prompt-manager-app" className="gba:w-full gba:bg-muted/50">
        <PageLayout
          headerIcon={Bot}
          headerTitle={t('create-task-expert')}
          headerDescription={t('page-description')}
          onBack={onEditorClosed}
          variant="default"
          className="gba:min-h-screen gba:bg-muted/50"
        >
          <TaskExpertEditor
            {...context}
            mode="create"
            promptId={null}
            initialState={createInitialState}
            onSaved={() => {
              onEditorClosed()
              onEditorSaved()
            }}
          />
        </PageLayout>
      </div>
    )
  }

  // Edit mode
  if (editingPromptId) {
    return (
      <div data-testid="prompt-manager-app" className="gba:w-full gba:bg-muted/50">
        <PageLayout
          headerIcon={Bot}
          headerTitle={editingPromptName || t('edit-task-expert')}
          headerDescription={t('page-description')}
          onBack={onEditorClosed}
          variant="default"
          className="gba:min-h-screen gba:bg-muted/50"
        >
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
              // Navigate to the View screen (Dashboard tab) for this expert
              setEditingPromptId(null)
              setEditingPromptName('')
              setViewingPromptId(editingPromptId)
              setViewingPromptName(editingPromptName)
              updateUrl(editingPromptId, 'view')
            }}
          />
        </PageLayout>
      </div>
    )
  }

  // View mode (read-only: dashboard, test, monitoring)
  if (viewingPromptId) {
    return (
      <div data-testid="prompt-manager-app" className="gba:w-full gba:bg-muted/50">
        <PageLayout
          headerIcon={Bot}
          headerTitle={viewingPromptName || t('view-task-expert')}
          headerDescription={t('page-description')}
          onBack={onViewClosed}
          variant="default"
          className="gba:min-h-screen gba:bg-muted/50"
        >
          <TaskExpertView
            {...context}
            promptId={viewingPromptId}
            onBack={onViewClosed}
            onEdit={() => onEditPrompt(viewingPromptId, viewingPromptName)}
            onNameLoaded={setViewingPromptName}
          />
        </PageLayout>
      </div>
    )
  }

  // List mode
  return (
    <div data-testid="prompt-manager-app" className="gba:w-full gba:bg-muted/50">
      <PageLayout
        headerIcon={Bot}
        headerTitle={t('page-title')}
        headerDescription={t('page-description')}
        variant="default"
        className="gba:min-h-screen gba:bg-muted/50"
      >
        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)} className="gba:w-full">
          <TabsList className="gba:mb-4" data-testid="prompt-manager-tabs">
            <TabsTrigger value="task-experts" data-testid="prompt-manager-tab-task-experts">
              {t('tab-task-experts')}
            </TabsTrigger>
            <TabsTrigger value="monitoring" data-testid="prompt-manager-tab-monitoring">
              {t('tab-monitoring')}
            </TabsTrigger>
            <TabsTrigger value="tools" data-testid="prompt-manager-tab-tools">
              {t('tab-tools')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="task-experts" data-testid="prompt-manager-tab-content-task-experts">
            <TaskExpertsSpace
              {...context}
              translations={translations}
              onCreateTaskExpert={onCreateTaskExpert}
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
      </PageLayout>
    </div>
  )
}

export default TaskExpertStudio
