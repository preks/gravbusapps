import React, { useEffect, useState } from 'react'
import '@newwork/nw-design-system/style'
import { PageLayout, Button } from '@newwork/nw-design-system'
import { Bot, WrenchIcon } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { TaskExpertsSpace } from './components/TaskExpertsSpace'
import { InternalToolsPanel } from './components/InternalToolsPanel'

const TaskExpertStudio: React.FC<BusinessAppContextProps> = context => {
  const [showInternalTools, setShowInternalTools] = useState(false)

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
        <div className="gba:flex gba:flex-col gba:gap-4">
          {/* Developer Tools Bar */}
          <div className="gba:flex gba:justify-end gba:gap-2 gba:px-6 gba:pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInternalTools(true)}
              data-testid="task-expert-studio-internal-tools-button"
            >
              <WrenchIcon className="gba:w-4 gba:h-4 gba:mr-2" />
              Internal Tools
            </Button>
          </div>

          <TaskExpertsSpace {...context} />
        </div>
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
