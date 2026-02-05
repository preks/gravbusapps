import React, { useCallback, useEffect, useState } from 'react'
import '@newwork/nw-design-system/style'
import { PageLayout, Tabs, TabsList, TabsTrigger, TabsContent, useTranslation } from '@newwork/nw-design-system'
import { Bot } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TaskExpertsSpace } from './components/TaskExpertsSpace'
import { TaskExpertEditor } from './components/TaskExpertEditor'
import { ToolsSpace } from './components/ToolsSpace'
import translations from './_i18n'

const TaskExpertStudio: React.FC<BusinessAppContextProps> = context => {
  const { t } = useTranslation(translations)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null)
  const [editingPromptName, setEditingPromptName] = useState<string>('')
  const [shouldRefresh, setShouldRefresh] = useState(0)
  const [activeTab, setActiveTab] = useState<'task-experts' | 'tools'>('task-experts')

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
    const urlParams = new URLSearchParams(window.location.search)
    const expertId = urlParams.get('expertId')
    if (expertId && !editingPromptId && !isCreateOpen) {
      if (expertId === 'new') {
        setIsCreateOpen(true)
      } else {
        setEditingPromptId(expertId)
      }
    }
  }, [])

  const updateUrl = useCallback((expertId: string | null) => {
    const urlParams = new URLSearchParams(window.location.search)
    if (expertId) {
      urlParams.set('expertId', expertId)
    } else {
      urlParams.delete('expertId')
    }
    const newUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname
    window.history.pushState({}, '', newUrl)
  }, [])

  const onCreateTaskExpert = useCallback(() => {
    setIsCreateOpen(true)
    updateUrl('new')
  }, [updateUrl])

  const onEditPrompt = useCallback(
    (id: string, name: string) => {
      setEditingPromptId(id)
      setEditingPromptName(name)
      updateUrl(id)
    },
    [updateUrl]
  )

  const onEditorClosed = useCallback(() => {
    setEditingPromptId(null)
    setEditingPromptName('')
    setIsCreateOpen(false)
    updateUrl(null)
  }, [updateUrl])

  const onEditorSaved = useCallback(() => {
    setShouldRefresh(prev => prev + 1)
  }, [])

  const renderToolsTab = () => <ToolsSpace {...context} />

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
            onSaved={() => {
              onEditorClosed()
              onEditorSaved()
            }}
          />
        </PageLayout>
      </div>
    )
  }

  // Edit mode (keep editor mounted; allow switching to Tools tab)
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
            onSaved={onEditorSaved}
            onNameLoaded={setEditingPromptName}
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
            <TabsTrigger value="tools" data-testid="prompt-manager-tab-tools">
              {t('tab-tools')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="task-experts" data-testid="prompt-manager-tab-content-task-experts">
            <TaskExpertsSpace
              {...context}
              translations={translations}
              onCreateTaskExpert={onCreateTaskExpert}
              onEditPrompt={onEditPrompt}
              refreshKey={shouldRefresh}
            />
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
