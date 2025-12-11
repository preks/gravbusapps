import React, { useEffect } from 'react'
import '@newwork/nw-design-system/style'
import { PageLayout } from '@newwork/nw-design-system'
import { Bot } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TaskExpertsSpace } from './components/TaskExpertsSpace'

const TaskExpertStudio: React.FC<BusinessAppContextProps> = context => {
  // Legacy tab param cleanup
  // no tabs anymore

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

  return (
    <div data-testid="task-expert-studio-app" className="gba:w-full">
      <PageLayout
        headerIcon={Bot}
        headerTitle="Task Expert Studio"
        headerDescription="Create AI task experts from prompts and test integrations."
        variant="default"
        className="gba:min-h-screen"
      >
        <TaskExpertsSpace {...context} />
      </PageLayout>
    </div>
  )
}

export default TaskExpertStudio
