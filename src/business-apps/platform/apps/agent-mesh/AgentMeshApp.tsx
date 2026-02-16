import { useState, useCallback, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent, Spinner } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { MeshView, AgentRegistryEntry, ExecutionAnalytics } from './types/agentMesh'
import { MeshDashboard } from './components/mesh-dashboard/MeshDashboard'
import { AgentRegistry } from './components/agent-registry/AgentRegistry'
import { AgentDetail } from './components/agent-detail/AgentDetail'
import { SteeringConsole } from './components/steering-console/SteeringConsole'
import { TraceExplorer } from './components/trace-view/TraceExplorer'
import { CommunicationPatterns } from './components/trace-view/CommunicationPatterns'
import { AlertRulesManager } from './components/trace-view/AlertRulesManager'
import { useAgentMeshClient } from './hooks/useAgentMeshClient'

export interface AgentMeshAppProps extends BusinessAppContextProps {
  'data-testid'?: string
}

export const AgentMeshApp: React.FC<AgentMeshAppProps> = ({
  accessToken,
  userInfo,
  'data-testid': testId = 'agent-mesh'
}) => {
  const [activeView, setActiveView] = useState<MeshView>('dashboard')
  const [, setViewParams] = useState<Record<string, string>>({})
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  const handleNavigate = useCallback((view: MeshView, params?: Record<string, string>) => {
    setActiveView(view)
    setViewParams(params || {})
    if (view !== 'registry') setSelectedAgentId(null)
  }, [])

  const handleAgentClick = useCallback((agentId: string) => {
    setSelectedAgentId(agentId)
  }, [])

  const handleBackFromDetail = useCallback(() => {
    setSelectedAgentId(null)
  }, [])

  // If an agent is selected in registry, show detail view
  if (selectedAgentId) {
    return (
      <div className="gba:h-full gba:flex gba:flex-col" data-testid={testId}>
        <AgentDetail agentId={selectedAgentId} accessToken={accessToken} onBack={handleBackFromDetail} />
      </div>
    )
  }

  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid={testId}>
      <Tabs
        value={activeView}
        onValueChange={v => handleNavigate(v as MeshView)}
        className={`gba:flex gba:flex-col ${activeView === 'console' ? '' : 'gba:h-full'}`}
      >
        <div className="gba:border-b gba:border-border gba:px-4">
          <TabsList data-testid="agent-mesh-tabs">
            <TabsTrigger value="dashboard" data-testid="agent-mesh-tab-dashboard">
              Mesh Dashboard
            </TabsTrigger>
            <TabsTrigger value="registry" data-testid="agent-mesh-tab-registry">
              Agent Registry
            </TabsTrigger>
            <TabsTrigger value="console" data-testid="agent-mesh-tab-console">
              Steering Console
            </TabsTrigger>
            <TabsTrigger value="traces" data-testid="agent-mesh-tab-traces">
              Traces & Analytics
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="gba:flex-1 gba:overflow-hidden gba:mt-0">
          <MeshDashboard accessToken={accessToken} userInfo={userInfo} onNavigate={handleNavigate} />
        </TabsContent>

        <TabsContent value="registry" className="gba:flex-1 gba:overflow-auto gba:mt-0 gba:p-4">
          <RegistryView accessToken={accessToken} onAgentClick={handleAgentClick} />
        </TabsContent>

        <TabsContent value="traces" className="gba:flex-1 gba:overflow-hidden gba:mt-0">
          <TracesView accessToken={accessToken} />
        </TabsContent>
      </Tabs>

      {/* Render SteeringConsole outside TabsContent to prevent unmount on tab switch */}
      <div
        className={`gba:flex-1 gba:overflow-hidden ${activeView === 'console' ? 'gba:block' : 'gba:hidden'}`}
        style={activeView === 'console' ? {} : { position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}
      >
        <SteeringConsole accessToken={accessToken} userInfo={userInfo} />
      </div>
    </div>
  )
}

/** Sub-view: Agent Registry with data fetching */
function RegistryView({ accessToken, onAgentClick }: { accessToken: string; onAgentClick: (id: string) => void }) {
  const api = useAgentMeshClient(accessToken)
  const [agents, setAgents] = useState<AgentRegistryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api
      .getAgentRegistry()
      .then(data => {
        if (mounted) setAgents(data)
      })
      .catch(err => console.error('Failed to load agents:', err))
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [api])

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-12" data-testid="registry-view-loading">
        <Spinner />
      </div>
    )
  }

  return <AgentRegistry agents={agents} onAgentClick={onAgentClick} />
}

/** Sub-view: Traces with sub-tabs */
function TracesView({ accessToken }: { accessToken: string }) {
  const [subTab, setSubTab] = useState<'traces' | 'patterns' | 'alerts'>('traces')
  const api = useAgentMeshClient(accessToken)
  const [analytics, setAnalytics] = useState<ExecutionAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  useEffect(() => {
    if (subTab !== 'patterns') return
    let mounted = true
    setAnalyticsLoading(true)
    api
      .getExecutionAnalytics({ days: 30 })
      .then(data => {
        if (mounted) setAnalytics(data)
      })
      .catch(err => console.error('Failed to load analytics:', err))
      .finally(() => {
        if (mounted) setAnalyticsLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [api, subTab])

  return (
    <Tabs
      value={subTab}
      onValueChange={v => setSubTab(v as typeof subTab)}
      className="gba:flex gba:flex-col gba:h-full"
    >
      <div className="gba:px-4 gba:border-b gba:border-border">
        <TabsList>
          <TabsTrigger value="traces" data-testid="traces-sub-traces">
            Traces
          </TabsTrigger>
          <TabsTrigger value="patterns" data-testid="traces-sub-patterns">
            Communication Patterns
          </TabsTrigger>
          <TabsTrigger value="alerts" data-testid="traces-sub-alerts">
            Alert Rules
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="traces" className="gba:flex-1 gba:overflow-hidden gba:mt-0">
        <TraceExplorer accessToken={accessToken} />
      </TabsContent>
      <TabsContent value="patterns" className="gba:flex-1 gba:overflow-auto gba:mt-0 gba:p-4">
        {analyticsLoading ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
            <Spinner />
          </div>
        ) : (
          <CommunicationPatterns analytics={analytics} />
        )}
      </TabsContent>
      <TabsContent value="alerts" className="gba:flex-1 gba:overflow-auto gba:mt-0 gba:p-4">
        <AlertRulesManager accessToken={accessToken} />
      </TabsContent>
    </Tabs>
  )
}
