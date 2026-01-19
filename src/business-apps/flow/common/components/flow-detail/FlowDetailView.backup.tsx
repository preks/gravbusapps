import React, { useState, useCallback, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  Separator
} from '@newwork/nw-design-system'
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Activity,
  FileText,
  Settings,
  Download,
  Table,
  FileJson,
  Copy,
  MessageSquare,
  UserPlus,
  UserMinus,
  RefreshCw,
  X,
  Check,
  Play
} from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'
import ReactFlow, { Node, Edge, Controls, Background, useNodesState, useEdgesState, ConnectionMode } from 'reactflow'
import 'reactflow/dist/style.css'

// Enhanced interfaces matching our backend data
interface StepStatus {
  completed: number
  total: number
  remaining: number
}

interface ProcessHealth {
  isOnTrack: boolean
  hasFailures: boolean
  isStalled: boolean
  statusMessage: string
}

interface TimeInsights {
  avgStepDurationHours?: number
  estimatedCompletionDate?: string
  isOverdue: boolean
  daysRunning: number
  daysSinceLastUpdate: number
}

interface FlowDetailData {
  flowId: string
  flowName: string
  templateId: string
  status: string
  startTime: string
  updateTime: string
  endTime?: string
  progressPercentage: number
  stepStatus: StepStatus
  currentStep: number
  processHealth: ProcessHealth
  timeInsights: TimeInsights
  durationHours?: number
  durationMinutes?: number
}

// Real history data interfaces (from inbox implementation)
interface HistoryEvent {
  type: 'step' | 'assignment' | 'comment' | 'flow' | 'status'
  timestamp: string
  stepIndex: number
  stepTitle: string
  eventTitle: string
  description: string
  action?: string
  userId?: string
  userName?: string
  comment?: string
  metadata?: any
}

interface HistorySummary {
  totalSteps: number
  completedSteps: number
  totalAssignmentEvents: number
  totalComments: number
  participants: string[]
}

interface FlowDetailViewProps extends BusinessAppContextProps {
  flowId: string
  onBack: () => void
}

// Custom node component for React Flow
const FlowStepNode = ({ data }: { data: any }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '#10b981'
      case 'IN_PROGRESS':
        return '#3b82f6'
      case 'SCHEDULED':
        return '#f59e0b'
      case 'QUEUED':
        return '#6b7280'
      default:
        return '#6b7280'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="gba:w-4 gba:h-4" />
      case 'IN_PROGRESS':
        return <Activity className="gba:w-4 gba:h-4" />
      case 'SCHEDULED':
        return <Clock className="gba:w-4 gba:h-4" />
      default:
        return <AlertCircle className="gba:w-4 gba:h-4" />
    }
  }

  return (
    <div
      className="gba:bg-white gba:border-2 gba:rounded-lg gba:p-4 gba:min-w-[200px] gba:shadow-sm"
      style={{ borderColor: getStatusColor(data.status) }}
    >
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
        <div style={{ color: getStatusColor(data.status) }}>{getStatusIcon(data.status)}</div>
        <Badge
          variant="outline"
          style={{
            backgroundColor: getStatusColor(data.status),
            color: 'white',
            border: 'none'
          }}
          className="gba:text-xs"
        >
          {data.status}
        </Badge>
      </div>

      <div className="gba:font-semibold gba:text-sm gba:mb-1 gba:text-gray-900">{data.title}</div>

      {data.assignedTo && (
        <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-gray-600 gba:mb-1">
          <User className="gba:w-3 gba:h-3" />
          {data.assignedTo}
        </div>
      )}

      {data.dueDate && (
        <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-gray-600">
          <Calendar className="gba:w-3 gba:h-3" />
          {new Date(data.dueDate).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}

const nodeTypes = {
  flowStep: FlowStepNode
}

export const FlowDetailView: React.FC<FlowDetailViewProps> = ({ flowId, onBack, accessToken }) => {
  const [flowData, setFlowData] = useState<FlowDetailData | null>(null)
  const [flowSteps, setFlowSteps] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Real history data state
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([])
  const [historySummary, setHistorySummary] = useState<HistorySummary | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const [filteredEvents, setFilteredEvents] = useState<HistoryEvent[]>([])

  // Load real history data
  const loadHistoryData = async () => {
    setHistoryLoading(true)
    setHistoryError(null)

    try {
      const API_BASE = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'https://newwork-dev.newwork.com/flow-engine'
      const response = await fetch(`${API_BASE}/api/flows/${flowId}/history`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch history: ${response.status}`)
      }

      const data = await response.json()
      setHistoryEvents(data.events || [])
      setHistorySummary(data.summary || null)
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Failed to load history data')
    } finally {
      setHistoryLoading(false)
    }
  }

  // Helper functions for history display (from inbox implementation)
  const getEventIcon = (event: HistoryEvent) => {
    switch (event.type) {
      case 'flow':
        // Handle flow events
        if (event.action === 'FLOW_START') {
          return <Play className="gba:h-4 gba:w-4" />
        } else if (event.action === 'FLOW_COMPLETED') {
          return <CheckCircle className="gba:h-4 gba:w-4" />
        } else if (event.action === 'FLOW_TERMINATED') {
          return <X className="gba:h-4 gba:w-4" />
        } else {
          return <Play className="gba:h-4 gba:w-4" />
        }
      case 'step':
        return <CheckCircle className="gba:h-4 gba:w-4" />
      case 'status':
        return <RefreshCw className="gba:h-4 gba:w-4" />
      case 'assignment':
        switch (event.action) {
          case 'CLAIM':
            return <UserPlus className="gba:h-4 gba:w-4" />
          case 'UNCLAIM':
            return <UserMinus className="gba:h-4 gba:w-4" />
          case 'REASSIGN':
            return <RefreshCw className="gba:h-4 gba:w-4" />
          case 'COMPLETE':
            return <Check className="gba:h-4 gba:w-4" />
          case 'REJECT':
            return <X className="gba:h-4 gba:w-4" />
          default:
            return <Play className="gba:h-4 gba:w-4" />
        }
      case 'comment':
        return <MessageSquare className="gba:h-4 gba:w-4" />
      default:
        return <Clock className="gba:h-4 gba:w-4" />
    }
  }

  const getEventColor = (event: HistoryEvent) => {
    switch (event.type) {
      case 'flow':
        // Handle flow events
        if (event.action === 'FLOW_START') {
          return '#3b82f6' // blue for start
        } else if (event.action === 'FLOW_COMPLETED') {
          return '#10b981' // green for success
        } else if (event.action === 'FLOW_TERMINATED') {
          return '#ef4444' // red for termination
        } else {
          return '#3b82f6' // blue default
        }
      case 'step':
        return '#10b981' // green for regular steps
      case 'status':
        return '#8b5cf6' // purple for status changes
      case 'assignment':
        switch (event.action) {
          case 'CLAIM':
            return '#3b82f6' // blue
          case 'UNCLAIM':
            return '#f59e0b' // orange
          case 'REASSIGN':
            return '#8b5cf6' // purple
          case 'COMPLETE':
            return '#10b981' // green
          case 'REJECT':
            return '#ef4444' // red
          default:
            return '#3b82f6' // blue
        }
      case 'comment':
        return '#06b6d4' // cyan
      default:
        return '#6b7280' // gray
    }
  }

  const getEventBgColor = (event: HistoryEvent) => {
    switch (event.type) {
      case 'flow':
        // Handle flow events
        if (event.action === 'FLOW_START') {
          return 'gba:bg-blue-50'
        } else if (event.action === 'FLOW_COMPLETED') {
          return 'gba:bg-green-50'
        } else if (event.action === 'FLOW_TERMINATED') {
          return 'gba:bg-red-50'
        } else {
          return 'gba:bg-blue-50'
        }
      case 'step':
        return 'gba:bg-green-50'
      case 'status':
        return 'gba:bg-purple-50'
      case 'assignment':
        switch (event.action) {
          case 'CLAIM':
            return 'gba:bg-blue-50'
          case 'UNCLAIM':
            return 'gba:bg-orange-50'
          case 'REASSIGN':
            return 'gba:bg-purple-50'
          case 'COMPLETE':
            return 'gba:bg-green-50'
          case 'REJECT':
            return 'gba:bg-red-50'
          default:
            return 'gba:bg-blue-50'
        }
      case 'comment':
        return 'gba:bg-cyan-50'
      default:
        return 'gba:bg-gray-50'
    }
  }

  const toggleFilter = (filterType: string) => {
    const newFilters = new Set(activeFilters)
    if (newFilters.has(filterType)) {
      newFilters.delete(filterType)
    } else {
      newFilters.add(filterType)
    }
    setActiveFilters(newFilters)
  }

  const clearAllFilters = () => {
    setActiveFilters(new Set())
  }

  // Filter events whenever events or activeFilters change
  React.useEffect(() => {
    if (activeFilters.size === 0) {
      setFilteredEvents(historyEvents)
    } else {
      const filtered = historyEvents.filter(event => {
        if (activeFilters.has('steps') && event.type === 'step') return true
        if (activeFilters.has('assignmentEvents') && event.type === 'assignment') return true
        if (activeFilters.has('statusChanges') && event.type === 'status') return true
        if (activeFilters.has('comments') && event.type === 'comment') return true
        return false
      })
      setFilteredEvents(filtered)
    }
  }, [historyEvents, activeFilters])

  // Load history when tab becomes active or flowId changes
  React.useEffect(() => {
    if (activeTab === 'audit' && flowId && accessToken) {
      loadHistoryData()
    }
  }, [activeTab, flowId, accessToken])

  // Mock data for flow details - replace with actual API calls
  React.useEffect(() => {
    const fetchFlowDetail = async () => {
      try {
        setIsLoading(true)

        // TODO: Replace with actual API calls
        // const flowResponse = await fetch(`/api/flows/${flowId}`, { headers: { Authorization: `Bearer ${accessToken}` }});
        // const stepsResponse = await fetch(`/api/flows/${flowId}/steps`, { headers: { Authorization: `Bearer ${accessToken}` }});

        // Mock data for demonstration
        setTimeout(() => {
          setFlowData({
            flowId: flowId,
            flowName: 'Employee Onboarding Process',
            templateId: 'employee-onboarding',
            status: 'IN_PROGRESS',
            startTime: '2025-08-01T10:00:00Z',
            updateTime: '2025-08-06T14:30:00Z',
            progressPercentage: 60,
            stepStatus: { completed: 3, total: 5, remaining: 2 },
            currentStep: 4,
            processHealth: {
              isOnTrack: true,
              hasFailures: false,
              isStalled: false,
              statusMessage: 'On Track'
            },
            timeInsights: {
              avgStepDurationHours: 10.5,
              estimatedCompletionDate: '2025-08-08T16:00:00Z',
              isOverdue: false,
              daysRunning: 5,
              daysSinceLastUpdate: 0
            },
            durationHours: 52.5,
            durationMinutes: 3150
          })

          setFlowSteps([
            {
              id: 'step-1',
              title: 'Document Preparation',
              status: 'COMPLETED',
              assignedTo: 'HR Team',
              dueDate: '2025-08-01T16:00:00Z',
              completedAt: '2025-08-01T15:30:00Z'
            },
            {
              id: 'step-2',
              title: 'Manager Approval',
              status: 'COMPLETED',
              assignedTo: 'John Manager',
              dueDate: '2025-08-02T12:00:00Z',
              completedAt: '2025-08-02T11:45:00Z'
            },
            {
              id: 'step-3',
              title: 'IT Setup',
              status: 'COMPLETED',
              assignedTo: 'IT Department',
              dueDate: '2025-08-03T17:00:00Z',
              completedAt: '2025-08-03T16:20:00Z'
            },
            {
              id: 'step-4',
              title: 'Onboarding Meeting',
              status: 'IN_PROGRESS',
              assignedTo: 'Sarah HR',
              dueDate: '2025-08-06T14:00:00Z'
            },
            {
              id: 'step-5',
              title: 'Final Review',
              status: 'SCHEDULED',
              assignedTo: 'Manager',
              dueDate: '2025-08-08T10:00:00Z'
            }
          ])

          setIsLoading(false)
        }, 1000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load flow details')
        setIsLoading(false)
      }
    }

    fetchFlowDetail()
  }, [flowId, accessToken])

  // Create React Flow nodes and edges
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = flowSteps.map((step, index) => ({
      id: step.id,
      type: 'flowStep',
      position: { x: index * 250, y: 100 },
      data: step
    }))

    const edges: Edge[] = flowSteps.slice(0, -1).map((step, index) => ({
      id: `${step.id}-${flowSteps[index + 1].id}`,
      source: step.id,
      target: flowSteps[index + 1].id,
      type: 'smoothstep',
      style: { strokeWidth: 3, stroke: '#6b7280' },
      markerEnd: {
        type: 'arrowclosed',
        width: 20,
        height: 20,
        color: '#6b7280'
      },
      animated: step.status === 'COMPLETED' ? false : index === flowSteps.findIndex(s => s.status === 'IN_PROGRESS') - 1
    }))

    return { nodes, edges }
  }, [flowSteps])

  const [nodesState, setNodes, onNodesChange] = useNodesState(nodes)
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(edges)

  React.useEffect(() => {
    setNodes(nodes)
    setEdges(edges)
  }, [nodes, edges, setNodes, setEdges])

  if (isLoading) {
    return (
      <div className="gba:h-screen gba:flex gba:items-center gba:justify-center">
        <div className="gba:text-center">
          <div className="gba:animate-spin gba:rounded-full gba:h-12 gba:w-12 gba:border-b-2 gba:border-blue-600 gba:mx-auto gba:mb-4"></div>
          <p className="gba:text-gray-600">Loading flow details...</p>
        </div>
      </div>
    )
  }

  if (error || !flowData) {
    return (
      <div className="gba:h-screen gba:flex gba:items-center gba:justify-center">
        <Alert variant="destructive" className="gba:max-w-md">
          <AlertCircle className="gba:h-4 gba:w-4" />
          <div>
            <h4 className="gba:font-semibold">Error Loading Flow</h4>
            <p className="gba:text-sm gba:mt-1">{error || 'Flow not found'}</p>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div className="gba:h-screen gba:bg-gray-50 gba:flex gba:flex-col">
      {/* Header */}
      <div className="gba:bg-white gba:border-b gba:border-gray-200 gba:px-6 gba:py-4">
        <div className="gba:flex gba:items-center gba:gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="gba:flex gba:items-center gba:gap-2">
            <ArrowLeft className="gba:h-4 gba:w-4" />
            Back to Flows
          </Button>

          <Separator orientation="vertical" className="gba:h-6" />

          <div className="gba:flex-1">
            <div className="gba:flex gba:items-center gba:gap-3 gba:mb-1">
              <h1 className="gba:text-xl gba:font-semibold gba:text-gray-900">{flowData.flowName}</h1>
              <Badge
                variant="outline"
                className="gba:border-0 gba:text-white"
                style={{
                  backgroundColor:
                    flowData.status === 'COMPLETED'
                      ? '#10b981'
                      : flowData.status === 'IN_PROGRESS'
                        ? '#3b82f6'
                        : flowData.status === 'TIMED_OUT'
                          ? '#f59e0b'
                          : '#6b7280'
                }}
              >
                {flowData.status}
              </Badge>
            </div>

            <div className="gba:flex gba:items-center gba:gap-6 gba:text-sm gba:text-gray-600">
              <span className="gba:flex gba:items-center gba:gap-1">
                <Calendar className="gba:h-4 gba:w-4" />
                Started {new Date(flowData.startTime).toLocaleDateString()}
              </span>
              <span className="gba:flex gba:items-center gba:gap-1">
                <Clock className="gba:h-4 gba:w-4" />
                Running {flowData.timeInsights.daysRunning} day{flowData.timeInsights.daysRunning !== 1 ? 's' : ''}
              </span>
              <span>
                Progress: {flowData.progressPercentage}% • {flowData.stepStatus.completed}/{flowData.stepStatus.total}{' '}
                steps
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="gba:h-full gba:flex gba:flex-col">
          <div className="gba:bg-white gba:border-b gba:border-gray-200 gba:px-6">
            <TabsList className="gba:grid gba:w-full gba:grid-cols-4 gba:max-w-md">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="workflow">Definition</TabsTrigger>
              <TabsTrigger value="data">Data</TabsTrigger>
              <TabsTrigger value="audit">Audit</TabsTrigger>
            </TabsList>
          </div>

          <div className="gba:flex-1 gba:overflow-auto gba:p-6">
            <TabsContent value="overview" className="gba:space-y-6 gba:mt-0">
              <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-3 gba:gap-6">
                {/* Progress Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
                      <Activity className="gba:h-5 gba:w-5" />
                      Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="gba:space-y-4">
                    <div>
                      <div className="gba:flex gba:justify-between gba:mb-2">
                        <span className="gba:text-sm gba:text-gray-600">Overall Progress</span>
                        <span className="gba:text-sm gba:font-medium">{flowData.progressPercentage}%</span>
                      </div>
                      <Progress value={flowData.progressPercentage} className="gba:h-2" />
                    </div>

                    <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:text-center">
                      <div>
                        <div className="gba:text-2xl gba:font-bold gba:text-green-600">
                          {flowData.stepStatus.completed}
                        </div>
                        <div className="gba:text-xs gba:text-gray-600">Completed</div>
                      </div>
                      <div>
                        <div className="gba:text-2xl gba:font-bold gba:text-blue-600">{flowData.currentStep}</div>
                        <div className="gba:text-xs gba:text-gray-600">Current</div>
                      </div>
                      <div>
                        <div className="gba:text-2xl gba:font-bold gba:text-gray-600">
                          {flowData.stepStatus.remaining}
                        </div>
                        <div className="gba:text-xs gba:text-gray-600">Remaining</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Time Insights Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
                      <Clock className="gba:h-5 gba:w-5" />
                      Time Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="gba:space-y-3">
                    <div className="gba:flex gba:justify-between">
                      <span className="gba:text-sm gba:text-gray-600">Running Time</span>
                      <span className="gba:text-sm gba:font-medium">
                        {flowData.timeInsights.daysRunning} day{flowData.timeInsights.daysRunning !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {flowData.timeInsights.avgStepDurationHours && (
                      <div className="gba:flex gba:justify-between">
                        <span className="gba:text-sm gba:text-gray-600">Avg per Step</span>
                        <span className="gba:text-sm gba:font-medium">
                          {flowData.timeInsights.avgStepDurationHours.toFixed(1)}h
                        </span>
                      </div>
                    )}

                    {flowData.timeInsights.estimatedCompletionDate && (
                      <div className="gba:flex gba:justify-between">
                        <span className="gba:text-sm gba:text-gray-600">Est. Completion</span>
                        <span className="gba:text-sm gba:font-medium gba:text-blue-600">
                          {new Date(flowData.timeInsights.estimatedCompletionDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Process Health Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
                      <CheckCircle className="gba:h-5 gba:w-5" />
                      Process Health
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="gba:text-center">
                      <Badge
                        variant="outline"
                        className="gba:mb-3 gba:text-sm gba:px-4 gba:py-2 gba:border-0"
                        style={{
                          backgroundColor: flowData.processHealth.isOnTrack ? '#10b981' : '#f59e0b',
                          color: 'white'
                        }}
                      >
                        {flowData.processHealth.statusMessage}
                      </Badge>

                      <div className="gba:space-y-2 gba:text-sm">
                        <div className="gba:flex gba:justify-between">
                          <span className="gba:text-gray-600">Failures</span>
                          <span
                            className={flowData.processHealth.hasFailures ? 'gba:text-red-600' : 'gba:text-green-600'}
                          >
                            {flowData.processHealth.hasFailures ? 'Yes' : 'None'}
                          </span>
                        </div>
                        <div className="gba:flex gba:justify-between">
                          <span className="gba:text-gray-600">Stalled</span>
                          <span
                            className={flowData.processHealth.isStalled ? 'gba:text-red-600' : 'gba:text-green-600'}
                          >
                            {flowData.processHealth.isStalled ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Steps List */}
              <Card>
                <CardHeader>
                  <CardTitle className="gba:text-base">Steps Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="gba:space-y-4">
                    {flowSteps.map((step, index) => (
                      <div
                        key={step.id}
                        className="gba:flex gba:items-center gba:gap-4 gba:p-3 gba:border gba:rounded-lg"
                      >
                        <div
                          className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-full gba:text-sm gba:font-medium"
                          style={{
                            backgroundColor:
                              step.status === 'COMPLETED'
                                ? '#10b981'
                                : step.status === 'IN_PROGRESS'
                                  ? '#3b82f6'
                                  : '#e5e7eb',
                            color: step.status === 'COMPLETED' || step.status === 'IN_PROGRESS' ? 'white' : '#6b7280'
                          }}
                        >
                          {index + 1}
                        </div>

                        <div className="gba:flex-1">
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                            <h4 className="gba:font-medium gba:text-sm">{step.title}</h4>
                            <Badge variant="outline" className="gba:text-xs">
                              {step.status}
                            </Badge>
                          </div>
                          <div className="gba:flex gba:items-center gba:gap-4 gba:text-xs gba:text-gray-600">
                            {step.assignedTo && (
                              <span className="gba:flex gba:items-center gba:gap-1">
                                <User className="gba:w-3 gba:h-3" />
                                {step.assignedTo}
                              </span>
                            )}
                            {step.dueDate && (
                              <span className="gba:flex gba:items-center gba:gap-1">
                                <Calendar className="gba:w-3 gba:h-3" />
                                Due: {new Date(step.dueDate).toLocaleDateString()}
                              </span>
                            )}
                            {step.completedAt && (
                              <span className="gba:text-green-600">
                                ✓ Completed {new Date(step.completedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="workflow" className="gba:mt-0">
              <Card className="gba:h-[600px]">
                <CardHeader>
                  <CardTitle className="gba:text-base">Flow Visualization</CardTitle>
                </CardHeader>
                <CardContent className="gba:h-full gba:p-0">
                  <div className="gba:h-full">
                    <ReactFlow
                      nodes={nodesState}
                      edges={edgesState}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      nodeTypes={nodeTypes}
                      connectionMode={ConnectionMode.Strict}
                      fitView
                      className="gba:bg-gray-50"
                    >
                      <Controls />
                      <Background />
                    </ReactFlow>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="data" className="gba:mt-0 gba:space-y-6">
              {/* Flow Overview Data */}
              <Card>
                <CardHeader>
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
                      <FileText className="gba:h-5 gba:w-5" />
                      Flow Data
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gba:flex gba:items-center gba:gap-2"
                      onClick={() => {
                        // TODO: Implement full flow data export
                        const data = JSON.stringify(flowData, null, 2)
                        const blob = new Blob([data], { type: 'application/json' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `flow-${flowData.flowId}-data.json`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                    >
                      <Download className="gba:h-4 gba:w-4" />
                      Export Flow Data
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 lg:gba:grid-cols-3 gba:gap-4">
                    <Card className="gba:bg-gray-50">
                      <CardContent className="gba:p-4">
                        <div className="gba:text-sm gba:text-gray-600 gba:mb-1">Flow ID</div>
                        <div className="gba:font-mono gba:text-sm gba:break-all">{flowData.flowId}</div>
                      </CardContent>
                    </Card>

                    <Card className="gba:bg-gray-50">
                      <CardContent className="gba:p-4">
                        <div className="gba:text-sm gba:text-gray-600 gba:mb-1">Template ID</div>
                        <div className="gba:font-mono gba:text-sm">{flowData.templateId}</div>
                      </CardContent>
                    </Card>

                    <Card className="gba:bg-gray-50">
                      <CardContent className="gba:p-4">
                        <div className="gba:text-sm gba:text-gray-600 gba:mb-1">Status</div>
                        <Badge
                          variant="outline"
                          style={{
                            backgroundColor:
                              flowData.status === 'COMPLETED'
                                ? '#10b981'
                                : flowData.status === 'IN_PROGRESS'
                                  ? '#3b82f6'
                                  : flowData.status === 'TIMED_OUT'
                                    ? '#f59e0b'
                                    : '#6b7280',
                            color: 'white'
                          }}
                        >
                          {flowData.status}
                        </Badge>
                      </CardContent>
                    </Card>

                    <Card className="gba:bg-gray-50">
                      <CardContent className="gba:p-4">
                        <div className="gba:text-sm gba:text-gray-600 gba:mb-1">Start Time</div>
                        <div className="gba:text-sm">{new Date(flowData.startTime).toLocaleString()}</div>
                      </CardContent>
                    </Card>

                    <Card className="gba:bg-gray-50">
                      <CardContent className="gba:p-4">
                        <div className="gba:text-sm gba:text-gray-600 gba:mb-1">Last Update</div>
                        <div className="gba:text-sm">{new Date(flowData.updateTime).toLocaleString()}</div>
                      </CardContent>
                    </Card>

                    <Card className="gba:bg-gray-50">
                      <CardContent className="gba:p-4">
                        <div className="gba:text-sm gba:text-gray-600 gba:mb-1">Duration</div>
                        <div className="gba:text-sm">
                          {flowData.timeInsights.daysRunning} day{flowData.timeInsights.daysRunning !== 1 ? 's' : ''}
                          {flowData.durationHours && ` (${flowData.durationHours.toFixed(1)}h)`}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {/* Step Data Table */}
              <Card>
                <CardHeader>
                  <div className="gba:flex gba:items-center gba:justify-between">
                    <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
                      <Table className="gba:h-5 gba:w-5" />
                      Step Data Details
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gba:flex gba:items-center gba:gap-2"
                      onClick={() => {
                        // TODO: Implement step data export via API
                        const csvContent = [
                          ['Step ID', 'Title', 'Status', 'Assigned To', 'Due Date', 'Completed At'].join(','),
                          ...flowSteps.map(step =>
                            [
                              step.id,
                              `"${step.title}"`,
                              step.status,
                              step.assignedTo || '',
                              step.dueDate || '',
                              step.completedAt || ''
                            ].join(',')
                          )
                        ].join('\n')

                        const blob = new Blob([csvContent], { type: 'text/csv' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `flow-${flowData.flowId}-steps.csv`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                    >
                      <Download className="gba:h-4 gba:w-4" />
                      Export Step Data
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="gba:overflow-x-auto">
                    <table className="gba:w-full gba:text-sm">
                      <thead>
                        <tr className="gba:border-b">
                          <th className="gba:text-left gba:p-3 gba:font-medium gba:text-gray-600">Step</th>
                          <th className="gba:text-left gba:p-3 gba:font-medium gba:text-gray-600">Status</th>
                          <th className="gba:text-left gba:p-3 gba:font-medium gba:text-gray-600">Assigned To</th>
                          <th className="gba:text-left gba:p-3 gba:font-medium gba:text-gray-600">Due Date</th>
                          <th className="gba:text-left gba:p-3 gba:font-medium gba:text-gray-600">Completed</th>
                          <th className="gba:text-left gba:p-3 gba:font-medium gba:text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flowSteps.map((step, index) => (
                          <tr key={step.id} className="gba:border-b gba:hover:bg-gray-50">
                            <td className="gba:p-3">
                              <div className="gba:flex gba:items-center gba:gap-3">
                                <div
                                  className="gba:flex gba:items-center gba:justify-center gba:w-6 gba:h-6 gba:rounded-full gba:text-xs gba:font-medium"
                                  style={{
                                    backgroundColor:
                                      step.status === 'COMPLETED'
                                        ? '#10b981'
                                        : step.status === 'IN_PROGRESS'
                                          ? '#3b82f6'
                                          : '#e5e7eb',
                                    color:
                                      step.status === 'COMPLETED' || step.status === 'IN_PROGRESS' ? 'white' : '#6b7280'
                                  }}
                                >
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="gba:font-medium">{step.title}</div>
                                  <div className="gba:text-xs gba:text-gray-500 gba:font-mono">{step.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="gba:p-3">
                              <Badge variant="outline" className="gba:text-xs">
                                {step.status}
                              </Badge>
                            </td>
                            <td className="gba:p-3">
                              <div className="gba:flex gba:items-center gba:gap-1">
                                <User className="gba:h-3 gba:w-3 gba:text-gray-500" />
                                {step.assignedTo || '-'}
                              </div>
                            </td>
                            <td className="gba:p-3">
                              {step.dueDate ? new Date(step.dueDate).toLocaleDateString() : '-'}
                            </td>
                            <td className="gba:p-3">
                              {step.completedAt ? (
                                <div className="gba:text-green-600 gba:text-xs">
                                  ✓ {new Date(step.completedAt).toLocaleDateString()}
                                </div>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="gba:p-3">
                              <div className="gba:flex gba:items-center gba:gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gba:h-6 gba:w-6 gba:p-0"
                                  onClick={() => {
                                    // TODO: Copy step data to clipboard
                                    navigator.clipboard.writeText(JSON.stringify(step, null, 2))
                                  }}
                                >
                                  <Copy className="gba:h-3 gba:w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gba:h-6 gba:w-6 gba:p-0"
                                  onClick={() => {
                                    // TODO: Export individual step data
                                    const data = JSON.stringify(step, null, 2)
                                    const blob = new Blob([data], { type: 'application/json' })
                                    const url = URL.createObjectURL(blob)
                                    const a = document.createElement('a')
                                    a.href = url
                                    a.download = `step-${step.id}-data.json`
                                    a.click()
                                    URL.revokeObjectURL(url)
                                  }}
                                >
                                  <FileJson className="gba:h-3 gba:w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit" className="gba:mt-0 gba:space-y-6">
              {/* Real Audit Summary from API */}
              {historySummary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
                      <Settings className="gba:h-5 gba:w-5" />
                      Audit Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Summary Cards in One Row */}
                    <div className="gba:grid gba:grid-cols-4 gba:gap-4">
                      <Card className="gba:bg-blue-50">
                        <CardContent className="gba:p-4 gba:text-center">
                          <div className="gba:text-2xl gba:font-bold gba:text-blue-600">{historyEvents.length}</div>
                          <div className="gba:text-sm gba:text-gray-600">Total Events</div>
                        </CardContent>
                      </Card>

                      <Card className="gba:bg-green-50">
                        <CardContent className="gba:p-4 gba:text-center">
                          <div className="gba:text-2xl gba:font-bold gba:text-green-600">
                            {historySummary.completedSteps}
                          </div>
                          <div className="gba:text-sm gba:text-gray-600">Step Actions</div>
                        </CardContent>
                      </Card>

                      <Card className="gba:bg-purple-50">
                        <CardContent className="gba:p-4 gba:text-center">
                          <div className="gba:text-2xl gba:font-bold gba:text-purple-600">
                            {historySummary.totalAssignmentEvents}
                          </div>
                          <div className="gba:text-sm gba:text-gray-600">Assignments</div>
                        </CardContent>
                      </Card>

                      <Card className="gba:bg-amber-50">
                        <CardContent className="gba:p-4 gba:text-center">
                          <div className="gba:text-2xl gba:font-bold gba:text-amber-600">
                            {historySummary.totalComments}
                          </div>
                          <div className="gba:text-sm gba:text-gray-600">Comments</div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Real Audit Trail from API */}
              <Card>
                <CardHeader>
                  <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
                    <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
                      <Activity className="gba:h-5 gba:w-5" />
                      Audit Trail
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gba:flex gba:items-center gba:gap-2 gba:flex-shrink-0"
                      onClick={() => {
                        // Export real history events
                        const csvContent = [
                          ['Timestamp', 'Type', 'Action', 'Step', 'User', 'Description'].join(','),
                          ...historyEvents.map(event =>
                            [
                              new Date(event.timestamp).toISOString(),
                              event.type,
                              event.action || '',
                              `"${event.stepTitle}"`,
                              event.userName || event.userId || '',
                              `"${event.description}"`
                            ].join(',')
                          )
                        ].join('\n')

                        const blob = new Blob([csvContent], { type: 'text/csv' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `flow-${flowId}-audit-trail.csv`
                        a.click()
                        URL.revokeObjectURL(url)
                      }}
                    >
                      <Download className="gba:h-4 gba:w-4" />
                      Export Audit Trail
                    </Button>
                  </div>

                  {/* Filter Controls moved into audit trail card */}
                  {historySummary && (
                    <div className="gba:mt-4 gba:p-4 gba:bg-gray-50 gba:rounded-lg gba:border">
                      <div className="gba:flex gba:items-center gba:gap-3 gba:flex-wrap">
                        <span className="gba:text-sm gba:font-medium gba:text-gray-600">Filter by:</span>

                        <Button
                          variant={activeFilters.has('steps') ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleFilter('steps')}
                          className="gba:text-xs"
                        >
                          {historySummary.totalSteps} Steps
                        </Button>

                        <Button
                          variant={activeFilters.has('assignmentEvents') ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleFilter('assignmentEvents')}
                          className="gba:text-xs"
                          style={{
                            backgroundColor: activeFilters.has('assignmentEvents') ? '#8b5cf6' : undefined,
                            borderColor: activeFilters.has('assignmentEvents') ? '#8b5cf6' : undefined
                          }}
                        >
                          {historySummary.totalAssignmentEvents} Assignments
                        </Button>

                        <Button
                          variant={activeFilters.has('statusChanges') ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleFilter('statusChanges')}
                          className="gba:text-xs"
                          style={{
                            backgroundColor: activeFilters.has('statusChanges') ? '#8b5cf6' : undefined,
                            borderColor: activeFilters.has('statusChanges') ? '#8b5cf6' : undefined
                          }}
                        >
                          Status Changes
                        </Button>

                        <Button
                          variant={activeFilters.has('comments') ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleFilter('comments')}
                          className="gba:text-xs"
                          style={{
                            backgroundColor: activeFilters.has('comments') ? '#06b6d4' : undefined,
                            borderColor: activeFilters.has('comments') ? '#06b6d4' : undefined
                          }}
                        >
                          {historySummary.totalComments} Comments
                        </Button>

                        {activeFilters.size > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllFilters}
                            className="gba:text-xs gba:text-gray-600"
                          >
                            Clear All ({filteredEvents.length}/{historyEvents.length})
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
                      <div className="gba:text-center">
                        <div className="gba:animate-spin gba:rounded-full gba:h-8 gba:w-8 gba:border-b-2 gba:border-blue-600 gba:mx-auto gba:mb-4"></div>
                        <p className="gba:text-gray-600">Loading audit trail...</p>
                      </div>
                    </div>
                  ) : historyError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="gba:h-4 gba:w-4" />
                      <div>
                        <h4 className="gba:font-semibold">Error Loading Audit Trail</h4>
                        <p className="gba:text-sm gba:mt-1">{historyError}</p>
                        <Button variant="outline" size="sm" onClick={loadHistoryData} className="gba:mt-2">
                          Retry
                        </Button>
                      </div>
                    </Alert>
                  ) : filteredEvents.length === 0 ? (
                    <div className="gba:text-center gba:py-12 gba:text-gray-500">
                      <Clock className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-4 gba:text-gray-300" />
                      <p>No audit events found{activeFilters.size > 0 ? ' matching the selected filters' : ''}</p>
                    </div>
                  ) : (
                    <div className="gba:space-y-4">
                      {filteredEvents.map((event, index) => (
                        <div
                          key={`${event.type}-${event.stepIndex}-${index}`}
                          className={`gba:flex gba:items-start gba:gap-4 gba:p-4 gba:border gba:rounded-lg ${getEventBgColor(event)}`}
                        >
                          <div
                            className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full gba:bg-white gba:shadow-sm"
                            style={{
                              backgroundColor: getEventColor(event) + '20',
                              color: getEventColor(event)
                            }}
                          >
                            {getEventIcon(event)}
                          </div>
                          <div className="gba:flex-1">
                            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                              <span className="gba:font-medium gba:text-sm">{event.eventTitle}</span>
                              <Badge
                                variant="outline"
                                className="gba:text-xs gba:border-0"
                                style={{
                                  backgroundColor: getEventColor(event) + '20',
                                  color: getEventColor(event)
                                }}
                              >
                                {event.type.toUpperCase()}
                              </Badge>
                              {event.action && (
                                <Badge variant="outline" className="gba:text-xs">
                                  {event.action}
                                </Badge>
                              )}
                            </div>
                            <div className="gba:text-sm gba:text-gray-600 gba:mb-2">{event.description}</div>
                            <div className="gba:text-xs gba:text-gray-500">
                              {new Date(event.timestamp).toLocaleString()} • {event.stepTitle}
                              {event.userName && ` • ${event.userName}`}
                            </div>

                            {/* Show comment if this is a comment event */}
                            {event.type === 'comment' && event.comment && (
                              <div className="gba:mt-3 gba:p-3 gba:bg-green-50 gba:border gba:border-green-200 gba:rounded-md">
                                <div className="gba:flex gba:items-start gba:gap-2">
                                  <MessageSquare className="gba:h-4 gba:w-4 gba:text-green-600 gba:mt-0.5 gba:flex-shrink-0" />
                                  <p className="gba:text-sm gba:italic gba:text-green-800">"{event.comment}"</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
