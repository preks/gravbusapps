import React, { useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { ArrowLeft, Settings } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { PromptODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import translations from '../_i18n'
import ExpertDashboardTab from './monitoring/ExpertDashboardTab'
import ExpertMonitoringTab from './monitoring/ExpertMonitoringTab'
import { InlineTestPanel } from './InlineTestPanel'

export interface TaskExpertViewProps extends BusinessAppContextProps {
  promptId: string
  onBack: () => void
  onEdit: () => void
  onNameLoaded?: (name: string) => void
}

type ViewTab = 'dashboard' | 'test' | 'monitoring'

export const TaskExpertView: React.FC<TaskExpertViewProps> = ({
  promptId,
  onBack,
  onEdit,
  onNameLoaded,
  ...context
}) => {
  const { t } = useTranslation(translations)
  const client = usePromptManagerClient(context.accessToken)
  const [prompt, setPrompt] = useState<PromptODM | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard')

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    client
      .getPrompt(promptId)
      .then(p => {
        if (cancelled) return
        setPrompt(p)
        if (p.name && onNameLoaded) onNameLoaded(p.name)
      })
      .catch(() => {
        if (!cancelled) setPrompt(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [client, promptId, onNameLoaded])

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-12" data-testid="expert-view-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid="expert-view">
      {/* Header */}
      <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-3">
          <Button variant="outline" size="sm" onClick={onBack} data-testid="expert-view-back" type="button">
            <ArrowLeft className="gba:w-4 gba:h-4 gba:mr-1" />
            {t('back-to-list')}
          </Button>
          {prompt?.agentType && <Badge variant="secondary">{prompt.agentType}</Badge>}
        </div>
        <Button variant="default" size="sm" onClick={onEdit} data-testid="expert-view-edit-button">
          <Settings className="gba:w-4 gba:h-4 gba:mr-1" />
          {t('view-edit-button')}
        </Button>
      </div>

      {prompt?.description && <p className="gba:text-sm gba:text-muted-foreground">{prompt.description}</p>}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as ViewTab)} className="gba:w-full">
        <TabsList className="gba:w-full gba:justify-start gba:bg-background" data-testid="expert-view-tabs">
          <TabsTrigger value="dashboard" data-testid="expert-view-tab-dashboard">
            {t('tab-dashboard')}
          </TabsTrigger>
          <TabsTrigger value="monitoring" data-testid="expert-view-tab-monitoring">
            {t('tab-monitoring')}
          </TabsTrigger>
          <TabsTrigger value="test" data-testid="expert-view-tab-test">
            {t('view-tab-test')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="gba:mt-4">
          <ExpertDashboardTab {...context} promptId={promptId} />
        </TabsContent>

        <TabsContent value="test" className="gba:mt-4">
          <InlineTestPanel promptId={promptId} accessToken={context.accessToken} />
        </TabsContent>

        <TabsContent value="monitoring" className="gba:mt-4">
          <ExpertMonitoringTab {...context} promptId={promptId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default TaskExpertView
