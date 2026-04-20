import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Spinner
} from '@newwork/nw-design-system'
import { ArrowLeft, BookOpen, Zap, Network, Activity, FileText, Link2, Database, Globe } from 'lucide-react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { AgentRegistryEntry, ExecutionListItem } from '../../types/agentMesh'
import { AgentOverviewTab } from './AgentOverviewTab'

interface AgentDetailProps {
  agentId: string
  accessToken: string
  onBack: () => void
}

export const AgentDetail = ({ agentId, accessToken, onBack }: AgentDetailProps) => {
  const [agent, setAgent] = useState<AgentRegistryEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const promptManagerClient = usePromptManagerClient(accessToken)

  useEffect(() => {
    let mounted = true
    const fetchAgent = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await promptManagerClient.getAgentDetail(agentId)
        if (!mounted) return
        setAgent(data)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Failed to load agent details')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (accessToken) {
      fetchAgent()
    }
    return () => {
      mounted = false
    }
  }, [agentId, accessToken, promptManagerClient])

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-full" data-testid="agent-detail-loading">
        <Spinner />
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-4"
        data-testid="agent-detail-error"
      >
        <div className="gba:text-destructive">{error || 'Agent not found'}</div>
        <Button variant="outline" onClick={onBack} data-testid="agent-detail-error-back">
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid="agent-detail">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:gap-4 gba:p-4 gba:border-b gba:border-border">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="agent-detail-back">
          <ArrowLeft className="gba:w-4 gba:h-4" />
        </Button>
        <div className="gba:flex-1">
          <h1 className="gba:text-xl gba:font-semibold gba:text-foreground" data-testid="agent-detail-title">
            {agent.name}
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="overview"
        className="gba:flex-1 gba:flex gba:flex-col gba:overflow-hidden"
        data-testid="agent-detail-tabs"
      >
        <TabsList className="gba:mx-4 gba:mt-4" data-testid="agent-detail-tabs-list">
          <TabsTrigger value="overview" data-testid="agent-detail-tab-overview">
            Overview
          </TabsTrigger>
          <TabsTrigger value="knowledge" data-testid="agent-detail-tab-knowledge">
            <BookOpen className="gba:w-4 gba:h-4 gba:mr-2" />
            Knowledge
          </TabsTrigger>
          <TabsTrigger value="capabilities" data-testid="agent-detail-tab-capabilities">
            <Zap className="gba:w-4 gba:h-4 gba:mr-2" />
            Capabilities
          </TabsTrigger>
          <TabsTrigger value="connections" data-testid="agent-detail-tab-connections">
            <Network className="gba:w-4 gba:h-4 gba:mr-2" />
            Connections
          </TabsTrigger>
          <TabsTrigger value="activity" data-testid="agent-detail-tab-activity">
            <Activity className="gba:w-4 gba:h-4 gba:mr-2" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent
          value="overview"
          className="gba:flex-1 gba:overflow-y-auto gba:p-6"
          data-testid="agent-detail-tab-content-overview"
        >
          <AgentOverviewTab agent={agent} />
        </TabsContent>

        {/* Knowledge Tab */}
        <TabsContent
          value="knowledge"
          className="gba:flex-1 gba:overflow-y-auto gba:p-6"
          data-testid="agent-detail-tab-content-knowledge"
        >
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Sources ({agent.knowledge_sources?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {agent.knowledge_sources && agent.knowledge_sources.length > 0 ? (
                <div className="gba:space-y-3">
                  {agent.knowledge_sources.map((ks, idx) => {
                    const icon =
                      ks.type === 'url'
                        ? Globe
                        : ks.type === 'document'
                          ? FileText
                          : ks.type === 'catalog'
                            ? Database
                            : Link2
                    const Icon = icon
                    return (
                      <div
                        key={ks.id || idx}
                        className="gba:flex gba:items-start gba:gap-3 gba:p-3 gba:border gba:border-border gba:rounded-md"
                        data-testid={`agent-detail-knowledge-source-${ks.id || idx}`}
                      >
                        <Icon className="gba:w-5 gba:h-5 gba:text-muted-foreground gba:mt-0.5 gba:flex-shrink-0" />
                        <div className="gba:flex-1 gba:min-w-0">
                          <div className="gba:font-medium gba:text-sm gba:text-foreground gba:truncate">{ks.name}</div>
                          {ks.description && (
                            <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">{ks.description}</div>
                          )}
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1">
                            <Badge variant="outline" className="gba:text-xs">
                              {ks.type}
                            </Badge>
                            {ks.url && (
                              <span className="gba:text-xs gba:text-muted-foreground gba:truncate">{ks.url}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div
                  className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-8"
                  data-testid="agent-detail-knowledge-empty"
                >
                  No knowledge sources configured
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Capabilities Tab */}
        <TabsContent
          value="capabilities"
          className="gba:flex-1 gba:overflow-y-auto gba:p-6"
          data-testid="agent-detail-tab-content-capabilities"
        >
          <Card>
            <CardHeader>
              <CardTitle>Connected Tools ({agent.tools?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {agent.tools && agent.tools.length > 0 ? (
                <div className="gba:space-y-2">
                  {agent.tools.map((toolCode, idx) => {
                    const isExpert = toolCode.startsWith('expert.')
                    const displayName = isExpert ? toolCode.replace('expert.', '') : toolCode
                    return (
                      <div
                        key={idx}
                        className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:border gba:border-border gba:rounded-md"
                        data-testid={`agent-detail-tool-${idx}`}
                      >
                        <Zap className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:flex-shrink-0" />
                        <div className="gba:flex-1 gba:min-w-0">
                          <div className="gba:font-medium gba:text-sm gba:text-foreground">{displayName}</div>
                        </div>
                        <Badge variant={isExpert ? 'info' : 'outline'} className="gba:text-xs">
                          {isExpert ? 'Agent' : 'Tool'}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div
                  className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-8"
                  data-testid="agent-detail-capabilities-empty"
                >
                  No tools connected
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Connections Tab */}
        <TabsContent
          value="connections"
          className="gba:flex-1 gba:overflow-y-auto gba:p-6"
          data-testid="agent-detail-tab-content-connections"
        >
          <div className="gba:space-y-4">
            {/* Incoming connections */}
            <Card>
              <CardHeader>
                <CardTitle>Incoming Connections</CardTitle>
              </CardHeader>
              <CardContent>
                {agent.incoming_connections && agent.incoming_connections.length > 0 ? (
                  <div className="gba:space-y-2">
                    {agent.incoming_connections.map(conn => (
                      <div
                        key={conn.connection_id}
                        className="gba:flex gba:items-center gba:justify-between gba:p-2 gba:border gba:border-border gba:rounded-md"
                        data-testid={`agent-detail-incoming-connection-${conn.connection_id}`}
                      >
                        <div>
                          <div
                            className="gba:font-medium gba:text-sm gba:text-foreground"
                            data-testid={`agent-detail-incoming-connection-${conn.connection_id}-source`}
                          >
                            {conn.source_name || conn.source_id || 'Unknown'}
                          </div>
                          <div
                            className="gba:text-xs gba:text-muted-foreground"
                            data-testid={`agent-detail-incoming-connection-${conn.connection_id}-status`}
                          >
                            Status: {conn.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="gba:text-sm gba:text-muted-foreground"
                    data-testid="agent-detail-incoming-connections-empty"
                  >
                    No incoming connections
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Outgoing connections */}
            <Card>
              <CardHeader>
                <CardTitle>Outgoing Connections</CardTitle>
              </CardHeader>
              <CardContent>
                {agent.outgoing_connections && agent.outgoing_connections.length > 0 ? (
                  <div className="gba:space-y-2">
                    {agent.outgoing_connections.map(conn => (
                      <div
                        key={conn.connection_id}
                        className="gba:flex gba:items-center gba:justify-between gba:p-2 gba:border gba:border-border gba:rounded-md"
                        data-testid={`agent-detail-outgoing-connection-${conn.connection_id}`}
                      >
                        <div>
                          <div
                            className="gba:font-medium gba:text-sm gba:text-foreground"
                            data-testid={`agent-detail-outgoing-connection-${conn.connection_id}-target`}
                          >
                            {conn.target_name || conn.target_id || 'Unknown'}
                          </div>
                          <div
                            className="gba:text-xs gba:text-muted-foreground"
                            data-testid={`agent-detail-outgoing-connection-${conn.connection_id}-status`}
                          >
                            Status: {conn.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="gba:text-sm gba:text-muted-foreground"
                    data-testid="agent-detail-outgoing-connections-empty"
                  >
                    No outgoing connections
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent
          value="activity"
          className="gba:flex-1 gba:overflow-y-auto gba:p-6"
          data-testid="agent-detail-tab-content-activity"
        >
          <AgentActivitySection agentId={agentId} accessToken={accessToken} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/** Fetches and displays execution logs for this agent */
function AgentActivitySection({ agentId, accessToken }: { agentId: string; accessToken: string }) {
  const promptManagerClient = usePromptManagerClient(accessToken)
  const [executions, setExecutions] = useState<ExecutionListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    promptManagerClient
      .getMeshExecutions({ promptId: agentId, limit: 50 })
      .then(data => {
        if (mounted) setExecutions(data)
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [agentId, promptManagerClient])

  if (loading) {
    return (
      <Card>
        <CardContent className="gba:flex gba:items-center gba:justify-center gba:py-8">
          <Spinner />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Executions ({executions.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {executions.length === 0 ? (
          <div
            className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-8"
            data-testid="agent-detail-activity-empty"
          >
            No executions recorded yet
          </div>
        ) : (
          <div className="gba:space-y-2">
            {executions.map(exec => (
              <div
                key={exec.execution_id}
                className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:border-border gba:rounded-md"
                data-testid={`agent-detail-execution-${exec.execution_id}`}
              >
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:text-sm gba:text-foreground gba:truncate">
                    {exec.input_preview || exec.execution_id}
                  </div>
                  <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                    {new Date(exec.created_at).toLocaleString()} · {exec.duration_ms}ms · {exec.tool_calls_count} tools
                  </div>
                </div>
                <Badge
                  variant={exec.status === 'success' ? 'success' : exec.status === 'error' ? 'destructive' : 'warning'}
                >
                  {exec.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
