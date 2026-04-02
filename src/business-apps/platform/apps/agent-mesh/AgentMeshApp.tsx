import { useState, useCallback, useEffect, useRef } from 'react'
import { Button, Spinner } from '@newwork/nw-design-system'
import { Network, Edit, Eye, Plus, LayoutGrid } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CreateHeroHeader } from '@/business-apps/core/create/components/CreateHeroHeader'
import type { MeshView, AgentRegistryEntry, ExecutionAnalytics } from './types/agentMesh'
import { MeshDashboard } from './components/mesh-dashboard/MeshDashboard'
import { AgentRegistry } from './components/agent-registry/AgentRegistry'
import { AgentDetail } from './components/agent-detail/AgentDetail'
import { SteeringConsole } from './components/steering-console/SteeringConsole'
import { TraceExplorer } from './components/trace-view/TraceExplorer'
import { CommunicationPatterns } from './components/trace-view/CommunicationPatterns'
import { AlertRulesManager } from './components/trace-view/AlertRulesManager'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { WorkspaceODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'

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
  const [editMode, setEditMode] = useState(false)
  const autoLayoutRef = useRef<(() => void) | null>(null)

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

  if (selectedAgentId) {
    return (
      <div className="gba:h-full gba:flex gba:flex-col" data-testid={testId}>
        <AgentDetail agentId={selectedAgentId} accessToken={accessToken} onBack={handleBackFromDetail} />
      </div>
    )
  }

  const VIEW_LABELS: Record<MeshView, string> = {
    dashboard: 'Dashboard',
    registry: 'Registry',
    console: 'Console',
    traces: 'Analytics'
  }

  return (
    <div className="gba:h-full gba:flex gba:flex-col gba:bg-background" data-testid={testId}>
      {/* Shared hero */}
      <CreateHeroHeader
        icon={Network}
        appLabel="Agent Mesh"
        title="Agent Mesh"
        description="Monitor, orchestrate and manage your AI agent network"
        data-testid="agent-mesh-hero"
        actions={
          activeView === 'dashboard' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gba:bg-white/10 gba:border-white/20 gba:text-white gba:hover:bg-white/15"
                onClick={() => autoLayoutRef.current?.()}
                data-testid="mesh-auto-layout"
              >
                <LayoutGrid className="gba:h-4 gba:w-4 gba:mr-1.5" />
                Layout
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gba:bg-white/10 gba:border-white/20 gba:text-white gba:hover:bg-white/15"
                onClick={() => setEditMode(prev => !prev)}
                data-testid="mesh-edit-toggle"
              >
                {editMode ? (
                  <>
                    <Eye className="gba:h-4 gba:w-4 gba:mr-1.5" />
                    View
                  </>
                ) : (
                  <>
                    <Edit className="gba:h-4 gba:w-4 gba:mr-1.5" />
                    Edit
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gba:bg-white/10 gba:border-white/20 gba:text-white gba:hover:bg-white/15"
                onClick={() => handleNavigate('registry')}
                data-testid="mesh-add-agent"
              >
                <Plus className="gba:h-4 gba:w-4 gba:mr-1.5" />
                Add Agent
              </Button>
            </>
          ) : undefined
        }
      />

      {/* Subtle navigation below hero */}
      <div className="gba:shrink-0 gba:border-b gba:border-border gba:bg-background">
        <nav
          className="gba:flex gba:items-center gba:gap-1 gba:px-5 gba:overflow-x-auto gba:scrollbar-none"
          data-testid="agent-mesh-nav"
        >
          {(['dashboard', 'registry', 'console', 'traces'] as MeshView[]).map(view => (
            <button
              key={view}
              onClick={() => handleNavigate(view)}
              className={`gba:relative gba:px-3 gba:py-2.5 gba:text-xs gba:font-medium gba:whitespace-nowrap gba:transition-colors gba:rounded-none gba:border-b-2 ${
                activeView === view
                  ? 'gba:text-foreground gba:border-primary'
                  : 'gba:text-muted-foreground gba:border-transparent gba:hover:text-foreground'
              }`}
              data-testid={`agent-mesh-nav-${view}`}
            >
              {VIEW_LABELS[view]}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:overflow-hidden">
        {activeView === 'dashboard' && (
          <MeshDashboard
            accessToken={accessToken}
            onNavigate={handleNavigate}
            editMode={editMode}
            onAutoLayoutRef={autoLayoutRef}
          />
        )}
        {activeView === 'registry' && <RegistryView accessToken={accessToken} onAgentClick={handleAgentClick} />}
        {activeView === 'traces' && <TracesView accessToken={accessToken} />}
        {activeView === 'console' && <SteeringConsole accessToken={accessToken} userInfo={userInfo} />}
      </div>
    </div>
  )
}

/** Sub-view: Agent Registry with data fetching and Add-to-Mesh support */
function RegistryView({ accessToken, onAgentClick }: { accessToken: string; onAgentClick: (id: string) => void }) {
  const pmClient = usePromptManagerClient(accessToken)
  const [agents, setAgents] = useState<AgentRegistryEntry[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [meshAgentIds, setMeshAgentIds] = useState<Set<string>>(new Set())
  const [workspaces, setWorkspaces] = useState<WorkspaceODM[]>([])
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('all')

  // Fetch workspaces once on mount (same pattern as TaskExpertsSpace)
  useEffect(() => {
    let mounted = true
    pmClient
      .getWorkspaces({ limit: 100 })
      .then(res => {
        if (mounted) setWorkspaces(res.data)
      })
      .catch(() => undefined)
    return () => {
      mounted = false
    }
  }, [pmClient])

  // Fetch agents + mesh layout; re-fetch when workspace filter changes
  useEffect(() => {
    let mounted = true
    const wsParam = selectedWorkspace !== 'all' ? selectedWorkspace : undefined
    Promise.allSettled([pmClient.getAgentRegistry({ workspaceId: wsParam }), pmClient.getMeshLayout()])
      .then(([agentsRes, layoutRes]) => {
        if (!mounted) return
        if (agentsRes.status === 'fulfilled') setAgents(agentsRes.value)
        if (layoutRes.status === 'fulfilled' && layoutRes.value?.positions) {
          setMeshAgentIds(new Set(layoutRes.value.positions.map((p: { agent_id: string }) => p.agent_id)))
        }
      })
      .catch(err => console.error('Failed to load registry data:', err))
      .finally(() => {
        if (mounted) setInitialLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [pmClient, selectedWorkspace])

  const handleAddToMesh = useCallback(
    async (agentId: string) => {
      try {
        const layout = await pmClient.getMeshLayout()
        const positions = layout?.positions || []
        if (positions.some((p: { agent_id: string }) => p.agent_id === agentId)) return
        const maxX = positions.reduce((max: number, p: { x: number }) => Math.max(max, p.x), 0)
        const newPositions = [...positions, { agent_id: agentId, x: maxX + 280, y: 100 }]
        await pmClient.saveMeshLayout(newPositions)
        setMeshAgentIds(prev => new Set([...prev, agentId]))
      } catch (err) {
        console.error('Failed to add agent to mesh:', err)
      }
    },
    [pmClient]
  )

  const handleRemoveFromMesh = useCallback(
    async (agentId: string) => {
      try {
        const layout = await pmClient.getMeshLayout()
        const positions = (layout?.positions || []).filter((p: { agent_id: string }) => p.agent_id !== agentId)
        await pmClient.saveMeshLayout(positions)
        setMeshAgentIds(prev => {
          const next = new Set(prev)
          next.delete(agentId)
          return next
        })
      } catch (err) {
        console.error('Failed to remove agent from mesh:', err)
      }
    },
    [pmClient]
  )

  if (initialLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-12" data-testid="registry-view-loading">
        <Spinner />
      </div>
    )
  }

  return (
    <AgentRegistry
      agents={agents}
      onAgentClick={onAgentClick}
      meshAgentIds={meshAgentIds}
      onAddToMesh={handleAddToMesh}
      onRemoveFromMesh={handleRemoveFromMesh}
      workspaces={workspaces}
      selectedWorkspace={selectedWorkspace}
      onWorkspaceChange={setSelectedWorkspace}
    />
  )
}

/** Sub-view: Traces with sub-tabs */
function TracesView({ accessToken }: { accessToken: string }) {
  const [subTab, setSubTab] = useState<'traces' | 'patterns' | 'alerts'>('traces')
  const promptManagerClient = usePromptManagerClient(accessToken)
  const [analytics, setAnalytics] = useState<ExecutionAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  useEffect(() => {
    if (subTab !== 'patterns') return
    let mounted = true
    setAnalyticsLoading(true)
    promptManagerClient
      .getMeshExecutionAnalytics({ days: 30 })
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
  }, [promptManagerClient, subTab])

  const SUB_TABS: { key: typeof subTab; label: string }[] = [
    { key: 'traces', label: 'Traces' },
    { key: 'patterns', label: 'Patterns' },
    { key: 'alerts', label: 'Alert Rules' }
  ]

  return (
    <div className="gba:flex gba:flex-col gba:h-full">
      {/* 2nd-level pill nav */}
      <div className="gba:flex gba:items-center gba:gap-1 gba:px-4 gba:py-2 gba:bg-muted/40 gba:border-b gba:border-border gba:shrink-0 gba:overflow-x-auto">
        {SUB_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`gba:px-3 gba:py-1 gba:rounded-full gba:text-[11px] gba:font-medium gba:whitespace-nowrap gba:transition-colors ${
              subTab === tab.key
                ? 'gba:bg-background gba:text-foreground gba:shadow-sm gba:border gba:border-border'
                : 'gba:text-muted-foreground gba:hover:text-foreground'
            }`}
            data-testid={`traces-sub-${tab.key}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'traces' && (
        <div className="gba:flex-1 gba:overflow-hidden">
          <TraceExplorer accessToken={accessToken} />
        </div>
      )}
      {subTab === 'patterns' && (
        <div className="gba:flex-1 gba:overflow-auto gba:p-4">
          {analyticsLoading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
              <Spinner />
            </div>
          ) : (
            <CommunicationPatterns analytics={analytics} />
          )}
        </div>
      )}
      {subTab === 'alerts' && (
        <div className="gba:flex-1 gba:overflow-auto gba:p-4">
          <AlertRulesManager accessToken={accessToken} />
        </div>
      )}
    </div>
  )
}
