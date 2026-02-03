import React, { useCallback, useEffect, useState } from 'react'
import '@newwork/nw-design-system/style'
import { PageLayout, Button, useTranslation } from '@newwork/nw-design-system'
import { Bot, WrenchIcon } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TaskExpertsSpace } from './components/TaskExpertsSpace'
import { TaskExpertEditor } from './components/TaskExpertEditor'
import { InternalToolsPanel } from './components/InternalToolsPanel'
import translations from './_i18n'

const TaskExpertStudio: React.FC<BusinessAppContextProps> = context => {
  const { t } = useTranslation(translations)
  const [showInternalTools, setShowInternalTools] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null)
  const [editingPromptName, setEditingPromptName] = useState<string>('')
  const [shouldRefresh, setShouldRefresh] = useState(0)

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

  // Create mode
  if (isCreateOpen) {
    return (
      <div data-testid="prompt-manager-app" className="gba:w-full">
        <PageLayout
          headerIcon={Bot}
          headerTitle={t('create-task-expert')}
          headerDescription={t('page-description')}
          onBack={onEditorClosed}
          variant="default"
          className="gba:min-h-screen"
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

  // Edit mode
  if (editingPromptId) {
    return (
      <div data-testid="prompt-manager-app" className="gba:w-full">
        <PageLayout
          headerIcon={Bot}
          headerTitle={editingPromptName || t('edit-task-expert')}
          headerDescription={t('page-description')}
          onBack={onEditorClosed}
          variant="default"
          className="gba:min-h-screen"
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
    <div data-testid="prompt-manager-app" className="gba:w-full">
      <PageLayout
        headerIcon={Bot}
        headerTitle={t('page-title')}
        headerDescription={t('page-description')}
        headerContent={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInternalTools(true)}
            data-testid="prompt-manager-internal-tools-button"
          >
            <WrenchIcon className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('internal-tools')}
          </Button>
        }
        variant="default"
        className="gba:min-h-screen"
      >
        <TaskExpertsSpace
          {...context}
          translations={translations}
          onCreateTaskExpert={onCreateTaskExpert}
          onEditPrompt={onEditPrompt}
          refreshKey={shouldRefresh}
        />
      </PageLayout>

      <InternalToolsPanel
        open={showInternalTools}
        onClose={() => setShowInternalTools(false)}
        accessToken={context.accessToken}
      />
    </div>
  )
}

export default TaskExpertStudio
