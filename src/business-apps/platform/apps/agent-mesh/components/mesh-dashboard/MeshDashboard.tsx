import { useState, useCallback, useEffect, type MutableRefObject } from 'react'
import { type Connection as RFConnection } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system'
import { Trash2 } from 'lucide-react'
import type { MeshView } from '../../types/agentMesh'
import { useMeshEdgeColors } from '../../hooks/useMeshEdgeColors'
import { useMeshDashboardData } from '../../hooks/useMeshDashboardData'
import { useMeshConnections } from '../../hooks/useMeshConnections'
import { MeshCanvasCard } from './MeshCanvasCard'
import { MeshSidebar } from './MeshSidebar'
import { LiveCommunicationFeed } from './LiveCommunicationFeed'

interface MeshDashboardProps {
  accessToken: string
  onNavigate: (view: MeshView, params?: Record<string, string>) => void
  editMode: boolean
  onAutoLayoutRef: MutableRefObject<(() => void) | null>
}

export const MeshDashboard: React.FC<MeshDashboardProps> = ({ accessToken, onNavigate, editMode, onAutoLayoutRef }) => {
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [connectSource, setConnectSource] = useState<string | null>(null)
  const edgeColors = useMeshEdgeColors()

  const {
    agents,
    connections,
    executions,
    analytics,
    alerts,
    nodes,
    edges,
    onEdgesChange,
    handleNodesChange,
    handleAutoLayout,
    meshAgents,
    mergedEdges,
    loadData
  } = useMeshDashboardData(accessToken, edgeColors, selectedEdgeId, editMode)

  useEffect(() => {
    onAutoLayoutRef.current = handleAutoLayout
    return () => {
      onAutoLayoutRef.current = null
    }
  }, [onAutoLayoutRef, handleAutoLayout])

  const { onConnect, handleEdgeClick, handleNodeClick, selectedEdgeInfo, handleDeleteConnection } = useMeshConnections({
    accessToken,
    agents,
    connections,
    mergedEdges,
    editMode,
    selectedEdgeId,
    setSelectedEdgeId,
    connectSource,
    setConnectSource,
    loadData
  })

  const handlePaneClick = useCallback(() => {
    setSelectedEdgeId(null)
    setConnectSource(null)
  }, [])

  const handleTraceClick = useCallback(
    (correlationId: string) => {
      onNavigate('traces', { correlationId })
    },
    [onNavigate]
  )

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:w-full gba:bg-background" data-testid="mesh-dashboard">
      {/* Edit-mode contextual hints */}
      {editMode && (
        <MeshEditHint
          connectSource={connectSource}
          agents={agents}
          selectedEdgeInfo={selectedEdgeInfo}
          onCancelConnect={() => setConnectSource(null)}
          onDeselectEdge={() => setSelectedEdgeId(null)}
          onDeleteConnection={handleDeleteConnection}
        />
      )}

      {/* Main content - flex layout matching FlowStudio canvas+panel */}
      <div className="gba:flex gba:flex-1 gba:overflow-hidden">
        {/* Canvas area - takes remaining space */}
        <div className="gba:flex gba:flex-col gba:flex-1">
          <div className="gba:flex-1 gba:relative">
            <MeshCanvasCard
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect as (params: RFConnection) => void}
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              onPaneClick={handlePaneClick}
              data-testid="mesh-canvas"
            />
          </div>
        </div>

        {/* Side panel - fixed width like ConfigPanelContainer */}
        <div
          className="gba:w-[420px] gba:min-w-[420px] gba:h-full gba:border-l gba:border-border gba:bg-background gba:flex gba:flex-col gba:overflow-hidden"
          data-testid="mesh-status-panel"
        >
          <Tabs defaultValue="status" className="gba:flex gba:flex-col gba:h-full">
            <div className="gba:px-4 gba:pt-3 gba:border-b gba:border-border gba:shrink-0">
              <TabsList data-testid="mesh-panel-tabs">
                <TabsTrigger value="status" data-testid="mesh-panel-tab-status">
                  Status
                </TabsTrigger>
                <TabsTrigger value="timeline" data-testid="mesh-panel-tab-timeline">
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="actions" data-testid="mesh-panel-tab-actions">
                  Actions
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="status" className="gba:flex-1 gba:overflow-y-auto gba:p-4 gba:mt-0">
              <MeshSidebar agents={meshAgents} alerts={alerts} analytics={analytics} />
            </TabsContent>

            <TabsContent value="timeline" className="gba:flex-1 gba:overflow-hidden gba:mt-0">
              <LiveCommunicationFeed executions={executions} onTraceClick={handleTraceClick} />
            </TabsContent>

            <TabsContent value="actions" className="gba:flex-1 gba:overflow-y-auto gba:p-4 gba:mt-0">
              <div className="gba:space-y-2">
                <Button
                  variant="outline"
                  className="gba:w-full gba:justify-start"
                  onClick={() => onNavigate('console')}
                  data-testid="mesh-panel-action-console"
                >
                  Open Console
                </Button>
                <Button
                  variant="outline"
                  className="gba:w-full gba:justify-start"
                  onClick={() => onNavigate('traces')}
                  data-testid="mesh-panel-action-traces"
                >
                  View Traces
                </Button>
                <Button
                  variant="outline"
                  className="gba:w-full gba:justify-start"
                  onClick={() => onNavigate('registry')}
                  data-testid="mesh-panel-action-registry"
                >
                  Agent Registry
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

/** Edit-mode hint bar rendered below the hero */
function MeshEditHint({
  connectSource,
  agents,
  selectedEdgeInfo,
  onCancelConnect,
  onDeselectEdge,
  onDeleteConnection
}: {
  connectSource: string | null
  agents: { id: string; name: string }[]
  selectedEdgeInfo: { sourceName: string; targetName: string; isBidirectional: boolean } | null
  onCancelConnect: () => void
  onDeselectEdge: () => void
  onDeleteConnection: () => void
}) {
  return (
    <div className="gba:px-5 gba:py-2 gba:border-b gba:border-border gba:bg-muted/30 gba:shrink-0">
      {!connectSource && !selectedEdgeInfo && (
        <span className="gba:text-xs gba:text-muted-foreground">
          Click an agent to connect, drag between handles, or click a line to select it
        </span>
      )}
      {connectSource && (
        <span className="gba:text-xs gba:text-primary">
          Now click the target agent to connect from &quot;
          {agents.find(a => a.id === connectSource)?.name}&quot;
          <button className="gba:ml-2 gba:text-muted-foreground gba:hover:text-foreground" onClick={onCancelConnect}>
            ×
          </button>
        </span>
      )}
      {selectedEdgeInfo && (
        <span className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-destructive">
          {selectedEdgeInfo.isBidirectional
            ? `${selectedEdgeInfo.sourceName} ↔ ${selectedEdgeInfo.targetName}`
            : `${selectedEdgeInfo.sourceName} → ${selectedEdgeInfo.targetName}`}
          <Button variant="destructive" size="sm" onClick={onDeleteConnection} data-testid="mesh-delete-connection">
            <Trash2 className="gba:w-3 gba:h-3 gba:mr-1" /> Remove
          </Button>
          <button className="gba:ml-1 gba:text-muted-foreground gba:hover:text-foreground" onClick={onDeselectEdge}>
            ×
          </button>
        </span>
      )}
    </div>
  )
}
