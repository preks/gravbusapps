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
import { ArrowLeft, Network, Settings } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { useAgentMeshClient } from '@/business-apps/platform/apps/agent-mesh/hooks/useAgentMeshClient'
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
  const meshApi = useAgentMeshClient(context.accessToken)
  const [prompt, setPrompt] = useState<PromptODM | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ViewTab>('dashboard')
  const [meshStatus, setMeshStatus] = useState<string | null>(null)

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

  const handleAddToMesh = async () => {
    try {
      const layout = await meshApi.getMeshLayout()
      const existing = layout?.positions || []
      if (existing.some(p => p.agent_id === promptId)) {
        setMeshStatus(t('already-in-mesh'))
      } else {
        await meshApi.saveMeshLayout([...existing, { agent_id: promptId, x: 0, y: 0 }])
        setMeshStatus(t('added-to-mesh'))
      }
      setTimeout(() => setMeshStatus(null), 3000)
    } catch {
      console.error('Failed to add agent to mesh')
    }
  }

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
        <div className="gba:flex gba:items-center gba:gap-2">
          {prompt?.agentType === 'everyai' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddToMesh}
              data-testid="expert-view-add-to-mesh"
              type="button"
            >
              <Network className="gba:w-4 gba:h-4 gba:mr-1" />
              {t('add-to-mesh')}
            </Button>
          )}
          <Button variant="default" size="sm" onClick={onEdit} data-testid="expert-view-edit-button">
            <Settings className="gba:w-4 gba:h-4 gba:mr-1" />
            {t('view-edit-button')}
          </Button>
        </div>
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

      {meshStatus && (
        <div
          className="gba:fixed gba:bottom-4 gba:right-4 gba:z-50 gba:bg-card gba:border gba:border-border gba:rounded-lg gba:px-4 gba:py-3 gba:text-sm gba:text-foreground gba:shadow-lg"
          data-testid="mesh-status-toast"
        >
          {meshStatus}
        </div>
      )}
    </div>
  )
}

export default TaskExpertView
