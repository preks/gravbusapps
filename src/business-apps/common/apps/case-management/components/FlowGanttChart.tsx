/**
 * Flow Gantt Chart Component
 *
 * Enterprise-grade Gantt chart visualization for linked flows
 * Features:
 * - Timeline visualization with zoom controls
 * - Progress tracking with visual indicators
 * - SLA/deadline indicators
 * - Interactive tooltips and click handlers
 * - Responsive design with horizontal scrolling
 * - Status-based color coding
 * - Current time indicator
 */

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  Maximize2,
  Eye,
  ExternalLink,
  User,
  CalendarDays
} from 'lucide-react'
import { LinkedFlow } from '../types'
import { isFlowTerminal, formatDate } from '../utils'
import { BusinessAppContextProps } from '@/business-apps/types'

// ============================================================================
// Types
// ============================================================================

type ZoomLevel = '1h' | '4h' | '12h' | '1d' | '3d' | '1w' | '2w' | '1m' | '1y'

interface GanttTimeRange {
  start: Date
  end: Date
  pixelsPerHour: number
}

interface FlowGanttChartProps {
  flows: LinkedFlow[]
  caseCreatedAt?: string
  caseDueDate?: string
  onFlowClick?: (flow: LinkedFlow) => void
  onFlowAction?: (flow: LinkedFlow, action: 'view' | 'open' | 'remove') => void
  context?: BusinessAppContextProps
  employeeNames?: Map<string, string>
  employeeData?: Map<string, { pictureThumbnail?: string; id?: string }>
  readOnly?: boolean
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const ZOOM_CONFIGS: Record<ZoomLevel, { label: string; hours: number; pixelsPerHour: number; gridInterval: number }> = {
  '1h': { label: '1 Hour', hours: 1, pixelsPerHour: 200, gridInterval: 15 }, // 15 min intervals
  '4h': { label: '4 Hours', hours: 4, pixelsPerHour: 60, gridInterval: 30 }, // 30 min intervals
  '12h': { label: '12 Hours', hours: 12, pixelsPerHour: 25, gridInterval: 60 }, // 1 hour intervals
  '1d': { label: '1 Day', hours: 24, pixelsPerHour: 15, gridInterval: 120 }, // 2 hour intervals
  '3d': { label: '3 Days', hours: 72, pixelsPerHour: 6, gridInterval: 360 }, // 6 hour intervals
  '1w': { label: '1 Week', hours: 168, pixelsPerHour: 4, gridInterval: 1440 }, // 1 day intervals
  '2w': { label: '2 Weeks', hours: 336, pixelsPerHour: 2.5, gridInterval: 2880 }, // 2 day intervals
  '1m': { label: '1 Month', hours: 720, pixelsPerHour: 1.5, gridInterval: 10080 }, // 1 week intervals (7 days)
  '1y': { label: '1 Year', hours: 8760, pixelsPerHour: 0.15, gridInterval: 43200 } // 1 month intervals (30 days)
}

const ROW_HEIGHT = 56
const HEADER_HEIGHT = 48
const LABEL_WIDTH = 240
const MIN_BAR_WIDTH = 24

// ============================================================================
// Utility Functions
// ============================================================================

const getFlowStartDate = (flow: LinkedFlow): Date => {
  const dateStr = flow.startTime || flow.createdAt || flow.addedAt
  return dateStr ? new Date(dateStr) : new Date()
}

const getFlowEndDate = (flow: LinkedFlow): Date | null => {
  if (isFlowTerminal(flow) && flow.updateTime) {
    return new Date(flow.updateTime)
  }
  return null
}

const getEstimatedEndDate = (flow: LinkedFlow): Date => {
  const start = getFlowStartDate(flow)
  const progress = flow.progressPercentage || 0

  if (progress === 0) {
    // No progress yet - estimate 1 day from start
    return new Date(start.getTime() + 24 * 60 * 60 * 1000)
  }

  const elapsed = Date.now() - start.getTime()
  const estimated = (elapsed / progress) * 100
  return new Date(start.getTime() + estimated)
}

const getFlowStatusColor = (flow: LinkedFlow): { bg: string; border: string; text: string } => {
  const status = flow.status || 'UNKNOWN'

  if (status === 'COMPLETED') {
    return { bg: 'gba:bg-green-500', border: 'gba:border-green-600', text: 'gba:text-white' }
  }
  if (status === 'FAILED' || status === 'TERMINATED') {
    return { bg: 'gba:bg-red-500', border: 'gba:border-red-600', text: 'gba:text-white' }
  }
  if (status === 'PAUSED') {
    return { bg: 'gba:bg-amber-500', border: 'gba:border-amber-600', text: 'gba:text-white' }
  }
  if (status === 'RUNNING' || status === 'IN_PROGRESS') {
    return { bg: 'gba:bg-blue-500', border: 'gba:border-blue-600', text: 'gba:text-white' }
  }
  return { bg: 'gba:bg-gray-400', border: 'gba:border-gray-500', text: 'gba:text-white' }
}

const getFlowStatusIcon = (flow: LinkedFlow) => {
  const status = flow.status || 'UNKNOWN'

  if (status === 'COMPLETED') return <CheckCircle className="gba:h-3.5 gba:w-3.5" />
  if (status === 'FAILED' || status === 'TERMINATED') return <XCircle className="gba:h-3.5 gba:w-3.5" />
  if (status === 'PAUSED') return <Pause className="gba:h-3.5 gba:w-3.5" />
  if (status === 'RUNNING' || status === 'IN_PROGRESS') return <Play className="gba:h-3.5 gba:w-3.5" />
  return <Clock className="gba:h-3.5 gba:w-3.5" />
}

const formatFlowId = (id: string): string => {
  if (!id) return 'REQ-UNKNOWN'
  return `REQ-${id.slice(-8).toUpperCase()}`
}

const formatDuration = (ms: number): string => {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return `${days}d ${remainingHours}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

const formatGridTime = (date: Date, zoomLevel: ZoomLevel): string => {
  const hours = ZOOM_CONFIGS[zoomLevel].hours

  if (hours <= 12) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (hours <= 72) {
    return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  }
  // For year view, show month and year only
  if (hours >= 8760) {
    return date.toLocaleDateString([], { month: 'long', year: 'numeric' })
  }
  // For week/month views, include year
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

// ============================================================================
// Sub-components
// ============================================================================

// Step status type for visualization
type StepStatus = 'completed' | 'current' | 'pending'

// Get step color based on status
const getStepColor = (status: StepStatus, flowStatus: string): { bg: string; border: string } => {
  if (status === 'completed') {
    return { bg: 'gba:bg-green-500', border: 'gba:border-green-600' }
  }
  if (status === 'current') {
    if (flowStatus === 'PAUSED') {
      return { bg: 'gba:bg-amber-500', border: 'gba:border-amber-600' }
    }
    return { bg: 'gba:bg-blue-500', border: 'gba:border-blue-600' }
  }
  // Pending
  return { bg: 'gba:bg-gray-300', border: 'gba:border-gray-400' }
}

interface GanttBarProps {
  flow: LinkedFlow
  timeRange: GanttTimeRange
  onClick?: () => void
  onAction?: (action: 'view' | 'open' | 'remove') => void
  employeeName?: string
  employeeData?: { pictureThumbnail?: string; id?: string }
}

const GanttBar: React.FC<GanttBarProps> = ({ flow, timeRange, onClick, onAction, employeeName }) => {
  const startDate = getFlowStartDate(flow)
  const endDate = getFlowEndDate(flow) || (isFlowTerminal(flow) ? new Date() : getEstimatedEndDate(flow))
  const colors = getFlowStatusColor(flow)
  const progress = flow.progressPercentage || 0
  const isCompleted = isFlowTerminal(flow)
  const totalSteps = flow.totalSteps || 1
  const completedSteps = flow.completedSteps || 0

  // Calculate position and width
  const startOffset =
    Math.max(0, (startDate.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60)) * timeRange.pixelsPerHour
  const endOffset = Math.min(
    ((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60)) * timeRange.pixelsPerHour,
    ((endDate.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60)) * timeRange.pixelsPerHour
  )
  const totalWidth = Math.max(MIN_BAR_WIDTH, endOffset - startOffset)

  // Check if bar is visible
  if (
    startOffset >
    ((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60)) * timeRange.pixelsPerHour
  ) {
    return null
  }
  if (endOffset < 0) {
    return null
  }

  const duration = endDate.getTime() - startDate.getTime()

  // Calculate step segments
  const stepWidth = totalWidth / totalSteps
  const connectorWidth = Math.min(12, stepWidth * 0.1) // Connector line width
  const segmentWidth = Math.max(24, stepWidth - connectorWidth) // Actual step segment width
  const minStepWidth = 30 // Minimum width to show step-level view

  // Determine if we should show step-level or single bar view
  const showStepLevel = totalSteps > 1 && stepWidth >= minStepWidth

  // Generate step data - use stepHistory from backend if available
  const steps =
    flow.stepHistory && flow.stepHistory.length > 0
      ? flow.stepHistory.map(step => ({
          index: step.index,
          status: step.status as StepStatus,
          name: step.name,
          reference: step.reference,
          taskId: step.taskId,
          assignee: step.assignee,
          startedAt: step.startedAt,
          completedAt: step.completedAt
        }))
      : Array.from({ length: totalSteps }, (_, index) => {
          let status: StepStatus = 'pending'
          if (index < completedSteps) {
            status = 'completed'
          } else if (index === completedSteps && !isCompleted) {
            status = 'current'
          } else if (isCompleted && flow.status === 'COMPLETED') {
            status = 'completed' // All steps completed for finished flows
          }

          return {
            index,
            status,
            name: index === completedSteps && flow.currentStepName ? flow.currentStepName : `Step ${index + 1}`
          }
        })

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div
            className="gba:absolute gba:top-2 gba:h-10 gba:cursor-pointer gba:transition-all hover:gba:scale-[1.01]"
            style={{
              left: `${startOffset}px`,
              width: `${totalWidth}px`
            }}
            onClick={onClick}
          >
            {showStepLevel ? (
              /* Step-level visualization */
              <div className="gba:h-full gba:flex gba:items-center">
                {steps.map((step, idx) => {
                  const stepColors = getStepColor(step.status, flow.status || 'UNKNOWN')
                  const isLast = idx === steps.length - 1
                  const showStepName = segmentWidth > 60
                  const showStepNumber = segmentWidth > 30

                  return (
                    <React.Fragment key={idx}>
                      {/* Step segment with tooltip */}
                      <TooltipProvider>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <div
                              className={`gba:h-8 gba:rounded ${stepColors.bg} ${stepColors.border} gba:border gba:flex gba:items-center gba:gap-1 gba:px-1.5 gba:shadow-sm gba:relative gba:overflow-hidden ${
                                step.status === 'current' ? 'gba:ring-2 gba:ring-blue-300 gba:ring-offset-1' : ''
                              }`}
                              style={{
                                width: `${segmentWidth}px`,
                                minWidth: '12px'
                              }}
                            >
                              {/* Step number/icon */}
                              {showStepNumber && (
                                <span
                                  className={`gba:text-[10px] gba:font-bold gba:flex-shrink-0 ${step.status === 'pending' ? 'gba:text-gray-700' : 'gba:text-white'}`}
                                >
                                  {step.status === 'completed' ? '✓' : idx + 1}
                                </span>
                              )}

                              {/* Step name */}
                              {showStepName && (
                                <span
                                  className={`gba:text-[10px] gba:font-medium gba:truncate ${step.status === 'pending' ? 'gba:text-gray-700' : 'gba:text-white'}`}
                                >
                                  {step.name}
                                </span>
                              )}

                              {/* Pulse animation for current step */}
                              {step.status === 'current' && (
                                <div className="gba:absolute gba:inset-0 gba:rounded gba:bg-white/20 gba:animate-pulse" />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="gba:text-xs">
                            <div className="gba:font-medium">{step.name}</div>
                            <div className="gba:text-muted-foreground gba:capitalize">{step.status}</div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Connector line between steps */}
                      {!isLast && (
                        <div
                          className={`gba:h-0.5 gba:flex-shrink-0 ${
                            step.status === 'completed'
                              ? 'gba:bg-green-500'
                              : step.status === 'current'
                                ? 'gba:bg-blue-400'
                                : 'gba:bg-gray-300'
                          }`}
                          style={{ width: `${connectorWidth}px` }}
                        />
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            ) : (
              /* Single bar view (when steps too small or single step) */
              <div
                className={`gba:h-full gba:rounded-md gba:shadow-sm hover:gba:shadow-md ${colors.bg} ${colors.border} gba:border gba:overflow-hidden`}
              >
                {/* Progress fill for running flows */}
                {!isCompleted && progress > 0 && (
                  <div
                    className="gba:absolute gba:inset-0 gba:bg-white/20 gba:rounded-md"
                    style={{ width: `${progress}%` }}
                  />
                )}

                {/* Content */}
                <div
                  className={`gba:h-full gba:flex gba:items-center gba:gap-1.5 gba:px-2 ${colors.text} gba:text-xs gba:font-medium gba:truncate`}
                >
                  {getFlowStatusIcon(flow)}
                  {totalWidth > 100 && (
                    <span className="gba:truncate">{flow.workflowName || flow.templateId || 'Flow'}</span>
                  )}
                  {totalWidth > 150 && !isCompleted && (
                    <span className="gba:ml-auto gba:opacity-80">
                      {completedSteps}/{totalSteps}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="gba:max-w-xs gba:p-0">
          <div className="gba:p-3 gba:space-y-2">
            {/* Header */}
            <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
              <span className="gba:font-semibold gba:text-sm">
                {flow.workflowName || flow.templateId || 'Unnamed Flow'}
              </span>
              <Badge
                variant={flow.status === 'COMPLETED' ? 'success' : flow.status === 'RUNNING' ? 'default' : 'secondary'}
                className="gba:text-xs"
              >
                {flow.status}
              </Badge>
            </div>

            {/* Flow ID */}
            <div className="gba:text-xs gba:text-muted-foreground gba:font-mono">{formatFlowId(flow.workflowId)}</div>

            {/* Progress */}
            <div className="gba:space-y-1">
              <div className="gba:flex gba:justify-between gba:text-xs">
                <span>Progress</span>
                <span className="gba:font-medium">
                  {flow.completedSteps || 0}/{flow.totalSteps || 0} steps ({progress}%)
                </span>
              </div>
              <div className="gba:h-1.5 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                <div
                  className={`gba:h-full gba:rounded-full ${flow.status === 'COMPLETED' ? 'gba:bg-green-500' : 'gba:bg-primary'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Time info */}
            <div className="gba:grid gba:grid-cols-2 gba:gap-2 gba:text-xs">
              <div>
                <span className="gba:text-muted-foreground">Started:</span>
                <div className="gba:font-medium">{formatDate(startDate.toISOString())}</div>
              </div>
              <div>
                <span className="gba:text-muted-foreground">{isCompleted ? 'Completed:' : 'Est. End:'}</span>
                <div className="gba:font-medium">{formatDate(endDate.toISOString())}</div>
              </div>
            </div>

            {/* Duration */}
            <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
              <Clock className="gba:h-3 gba:w-3" />
              Duration: {formatDuration(duration)}
            </div>

            {/* Current step */}
            {flow.currentStepName && !isCompleted && (
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
                <Play className="gba:h-3 gba:w-3" />
                Current: {flow.currentStepName}
              </div>
            )}

            {/* Assignee */}
            {(flow.currentAssignee || employeeName) && (
              <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs">
                <User className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
                <span className="gba:text-muted-foreground">Assignee:</span>
                <span className="gba:font-medium">{employeeName || flow.currentAssignee}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          {onAction && (
            <div className="gba:flex gba:border-t gba:bg-muted/50">
              <button
                className="gba:flex-1 gba:flex gba:items-center gba:justify-center gba:gap-1 gba:py-2 gba:text-xs hover:gba:bg-muted gba:transition-colors"
                onClick={e => {
                  e.stopPropagation()
                  onAction('view')
                }}
              >
                <Eye className="gba:h-3 gba:w-3" />
                Details
              </button>
              <button
                className="gba:flex-1 gba:flex gba:items-center gba:justify-center gba:gap-1 gba:py-2 gba:text-xs hover:gba:bg-muted gba:transition-colors gba:border-l"
                onClick={e => {
                  e.stopPropagation()
                  onAction('open')
                }}
              >
                <ExternalLink className="gba:h-3 gba:w-3" />
                Open
              </button>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export const FlowGanttChart: React.FC<FlowGanttChartProps> = props => {
  const {
    flows,
    caseDueDate,
    onFlowClick,
    onFlowAction,
    employeeNames = new Map(),
    employeeData = new Map(),
    className = ''
  } = props
  const scrollRef = useRef<HTMLDivElement>(null)
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('1m')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Calculate time range based on flows
  const timeRange = useMemo((): GanttTimeRange => {
    const config = ZOOM_CONFIGS[zoomLevel]

    if (flows.length === 0) {
      const now = new Date()
      return {
        start: new Date(now.getTime() - config.hours * 0.25 * 60 * 60 * 1000),
        end: new Date(now.getTime() + config.hours * 0.75 * 60 * 60 * 1000),
        pixelsPerHour: config.pixelsPerHour
      }
    }

    // Find earliest start and latest end
    let minStart = Infinity
    let maxEnd = -Infinity

    flows.forEach(flow => {
      const start = getFlowStartDate(flow).getTime()
      const end = (getFlowEndDate(flow) || getEstimatedEndDate(flow)).getTime()

      if (start < minStart) minStart = start
      if (end > maxEnd) maxEnd = end
    })

    // Add padding
    const padding = config.hours * 0.1 * 60 * 60 * 1000
    const now = Date.now()

    // Include current time in range
    if (now < minStart) minStart = now
    if (now > maxEnd) maxEnd = now

    return {
      start: new Date(minStart - padding),
      end: new Date(Math.max(maxEnd + padding, minStart + config.hours * 60 * 60 * 1000)),
      pixelsPerHour: config.pixelsPerHour
    }
  }, [flows, zoomLevel])

  // Generate time grid lines
  const gridLines = useMemo(() => {
    const config = ZOOM_CONFIGS[zoomLevel]
    const lines: { position: number; label: string; isHour: boolean }[] = []

    const intervalMs = config.gridInterval * 60 * 1000
    let current = new Date(Math.ceil(timeRange.start.getTime() / intervalMs) * intervalMs)

    while (current <= timeRange.end) {
      const position = ((current.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60)) * timeRange.pixelsPerHour
      const isHour = current.getMinutes() === 0

      lines.push({
        position,
        label: formatGridTime(current, zoomLevel),
        isHour
      })

      current = new Date(current.getTime() + intervalMs)
    }

    return lines
  }, [timeRange, zoomLevel])

  // Current time indicator position
  const currentTimePosition = useMemo(() => {
    return ((currentTime.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60)) * timeRange.pixelsPerHour
  }, [currentTime, timeRange])

  // Due date position
  const dueDatePosition = useMemo(() => {
    if (!caseDueDate) return null
    const dueDate = new Date(caseDueDate)
    return ((dueDate.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60)) * timeRange.pixelsPerHour
  }, [caseDueDate, timeRange])

  // Total chart width
  const chartWidth = useMemo(() => {
    return ((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60)) * timeRange.pixelsPerHour
  }, [timeRange])

  // Filter active flows (not removed)
  const activeFlows = useMemo(() => {
    return flows.filter(f => !f.removedAt)
  }, [flows])

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    const levels: ZoomLevel[] = ['1y', '1m', '2w', '1w', '3d', '1d', '12h', '4h', '1h']
    const currentIndex = levels.indexOf(zoomLevel)
    if (currentIndex < levels.length - 1) {
      setZoomLevel(levels[currentIndex + 1])
    }
  }, [zoomLevel])

  const handleZoomOut = useCallback(() => {
    const levels: ZoomLevel[] = ['1y', '1m', '2w', '1w', '3d', '1d', '12h', '4h', '1h']
    const currentIndex = levels.indexOf(zoomLevel)
    if (currentIndex > 0) {
      setZoomLevel(levels[currentIndex - 1])
    }
  }, [zoomLevel])

  // Scroll to current time
  const scrollToNow = useCallback(() => {
    if (scrollRef.current) {
      const containerWidth = scrollRef.current.clientWidth - LABEL_WIDTH
      scrollRef.current.scrollLeft = Math.max(0, currentTimePosition - containerWidth / 2)
    }
  }, [currentTimePosition])

  // Auto-scroll to show current time on mount
  useEffect(() => {
    scrollToNow()
  }, [zoomLevel])

  // Handle scroll
  const handleScroll = useCallback((direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.5
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }, [])

  if (activeFlows.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="gba:py-12">
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-muted-foreground">
            <CalendarDays className="gba:h-12 gba:w-12 gba:mb-3 gba:opacity-50" />
            <p className="gba:text-sm">No flows to display in timeline</p>
            <p className="gba:text-xs gba:mt-1">Add flows to see them visualized here</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${className} ${isFullscreen ? 'gba:fixed gba:inset-4 gba:z-50 gba:m-0' : ''}`}>
      {/* Header with controls */}
      <CardHeader className="gba:pb-2">
        <div className="gba:flex gba:items-center gba:justify-between gba:flex-wrap gba:gap-2">
          <CardTitle className="gba:text-lg gba:flex gba:items-center gba:gap-2">
            <CalendarDays className="gba:h-5 gba:w-5" />
            Flow Timeline
            <Badge variant="secondary" className="gba:ml-2">
              {activeFlows.length} flows
            </Badge>
          </CardTitle>

          <div className="gba:flex gba:items-center gba:gap-3">
            {/* Zoom controls - grouped with border */}
            <div className="gba:flex gba:items-center gba:h-9 gba:border gba:border-border gba:rounded-lg gba:bg-background gba:shadow-sm">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gba:h-full gba:w-9 gba:p-0 gba:rounded-l-lg gba:rounded-r-none hover:gba:bg-muted"
                      onClick={handleZoomOut}
                      disabled={zoomLevel === '1y'}
                    >
                      <ZoomOut className="gba:h-4 gba:w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Zoom Out</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="gba:border-x gba:border-border gba:h-full gba:flex gba:items-center">
                <Select value={zoomLevel} onValueChange={v => setZoomLevel(v as ZoomLevel)}>
                  <SelectTrigger className="gba:h-full gba:w-[120px] gba:border-0 gba:rounded-none gba:bg-transparent gba:font-medium gba:text-sm gba:justify-center focus:gba:ring-0 focus:gba:ring-offset-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="center">
                    {Object.entries(ZOOM_CONFIGS).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gba:h-full gba:w-9 gba:p-0 gba:rounded-r-lg gba:rounded-l-none hover:gba:bg-muted"
                      onClick={handleZoomIn}
                      disabled={zoomLevel === '1h'}
                    >
                      <ZoomIn className="gba:h-4 gba:w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Zoom In</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Divider */}
            <div className="gba:h-6 gba:w-px gba:bg-border" />

            {/* Navigation controls - grouped with border */}
            <div className="gba:flex gba:items-center gba:h-9 gba:border gba:border-border gba:rounded-lg gba:bg-background gba:shadow-sm">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gba:h-full gba:w-9 gba:p-0 gba:rounded-l-lg gba:rounded-r-none hover:gba:bg-muted"
                      onClick={() => handleScroll('left')}
                    >
                      <ChevronLeft className="gba:h-4 gba:w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Scroll Left</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="gba:border-x gba:border-border gba:h-full gba:flex gba:items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gba:h-full gba:px-3 gba:rounded-none gba:font-medium gba:text-sm hover:gba:bg-muted"
                        onClick={scrollToNow}
                      >
                        <Clock className="gba:h-4 gba:w-4 gba:mr-1.5" />
                        Now
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Jump to Current Time</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gba:h-full gba:w-9 gba:p-0 gba:rounded-r-lg gba:rounded-l-none hover:gba:bg-muted"
                      onClick={() => handleScroll('right')}
                    >
                      <ChevronRight className="gba:h-4 gba:w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Scroll Right</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Divider */}
            <div className="gba:h-6 gba:w-px gba:bg-border" />

            {/* Fullscreen toggle - standalone with border */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gba:h-9 gba:w-9 gba:p-0 gba:shadow-sm"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                  >
                    <Maximize2 className="gba:h-4 gba:w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Legend */}
        <div className="gba:flex gba:items-center gba:gap-4 gba:mt-2 gba:text-xs gba:text-muted-foreground gba:flex-wrap">
          <span className="gba:font-medium gba:text-foreground">Steps:</span>
          <div className="gba:flex gba:items-center gba:gap-1.5">
            <div className="gba:w-4 gba:h-4 gba:rounded gba:bg-green-500" />
            <span>Completed</span>
          </div>
          <div className="gba:flex gba:items-center gba:gap-1.5">
            <div className="gba:w-4 gba:h-4 gba:rounded gba:bg-blue-500 gba:ring-2 gba:ring-blue-300 gba:ring-offset-1" />
            <span>Current</span>
          </div>
          <div className="gba:flex gba:items-center gba:gap-1.5">
            <div className="gba:w-4 gba:h-4 gba:rounded gba:bg-gray-300" />
            <span>Pending</span>
          </div>
          <div className="gba:flex gba:items-center gba:gap-1.5">
            <div className="gba:w-4 gba:h-4 gba:rounded gba:bg-amber-500" />
            <span>Paused</span>
          </div>
          <div className="gba:flex gba:items-center gba:gap-1.5">
            <div className="gba:w-6 gba:h-0.5 gba:bg-green-500" />
            <span>Connector</span>
          </div>
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:ml-4">
            <div className="gba:w-0.5 gba:h-4 gba:bg-red-500" />
            <span>Current Time</span>
          </div>
          {caseDueDate && (
            <div className="gba:flex gba:items-center gba:gap-1.5">
              <div className="gba:w-0.5 gba:h-4 gba:bg-orange-500 gba:border-dashed" />
              <span>Due Date</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="gba:p-0">
        {/* Gantt chart container */}
        <div
          ref={scrollRef}
          className="gba:overflow-x-auto gba:overflow-y-auto gba:border-t"
          style={{ maxHeight: isFullscreen ? 'calc(100vh - 200px)' : '400px' }}
        >
          <div className="gba:relative" style={{ width: `${LABEL_WIDTH + chartWidth}px`, minWidth: '100%' }}>
            {/* Time header */}
            <div
              className="gba:sticky gba:top-0 gba:z-20 gba:bg-muted/95 gba:backdrop-blur gba:border-b gba:flex"
              style={{ height: `${HEADER_HEIGHT}px` }}
            >
              {/* Label column header */}
              <div
                className="gba:sticky gba:left-0 gba:z-30 gba:bg-muted gba:border-r gba:flex gba:items-center gba:px-3 gba:font-medium gba:text-sm"
                style={{ width: `${LABEL_WIDTH}px`, minWidth: `${LABEL_WIDTH}px` }}
              >
                Flow Name
              </div>

              {/* Time scale */}
              <div className="gba:relative gba:flex-1" style={{ width: `${chartWidth}px` }}>
                {gridLines.map((line, index) => (
                  <div
                    key={index}
                    className="gba:absolute gba:top-0 gba:bottom-0 gba:flex gba:flex-col gba:items-center gba:justify-center"
                    style={{ left: `${line.position}px` }}
                  >
                    <span
                      className={`gba:text-xs gba:whitespace-nowrap ${line.isHour ? 'gba:font-medium' : 'gba:text-muted-foreground'}`}
                    >
                      {line.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Flow rows */}
            {activeFlows.map((flow, index) => {
              const assigneeId = flow.currentAssignee || flow.initiator
              const assigneeName = assigneeId ? employeeNames.get(assigneeId) : undefined
              const assigneeInfo = assigneeId ? employeeData.get(assigneeId) : undefined

              return (
                <div
                  key={flow.workflowId}
                  className={`gba:flex gba:border-b hover:gba:bg-muted/30 gba:transition-colors ${index % 2 === 0 ? '' : 'gba:bg-muted/10'}`}
                  style={{ height: `${ROW_HEIGHT}px` }}
                >
                  {/* Label column */}
                  <div
                    className="gba:sticky gba:left-0 gba:z-10 gba:bg-background gba:border-r gba:flex gba:items-center gba:gap-2 gba:px-3"
                    style={{ width: `${LABEL_WIDTH}px`, minWidth: `${LABEL_WIDTH}px` }}
                  >
                    {/* Status indicator */}
                    <div className={`gba:w-2 gba:h-2 gba:rounded-full ${getFlowStatusColor(flow).bg}`} />

                    {/* Flow info */}
                    <div className="gba:flex-1 gba:min-w-0">
                      <div className="gba:text-sm gba:font-medium gba:truncate">
                        {flow.workflowName || flow.templateId || 'Unnamed Flow'}
                      </div>
                      <div className="gba:text-xs gba:text-muted-foreground gba:truncate">
                        {formatFlowId(flow.workflowId)}
                      </div>
                    </div>

                    {/* Assignee avatar */}
                    {assigneeId && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Avatar className="gba:h-6 gba:w-6">
                              {assigneeInfo?.pictureThumbnail ? (
                                <AvatarImage
                                  src={`data:image/png;base64,${assigneeInfo.pictureThumbnail}`}
                                  alt={assigneeName || 'Assignee'}
                                />
                              ) : null}
                              <AvatarFallback className="gba:text-[10px]">
                                {assigneeName
                                  ?.split(' ')
                                  .map((n: string) => n[0])
                                  .join('')
                                  .slice(0, 2) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>{assigneeName || assigneeId}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>

                  {/* Chart area */}
                  <div className="gba:relative gba:flex-1" style={{ width: `${chartWidth}px` }}>
                    {/* Grid lines */}
                    {gridLines.map((line, lineIndex) => (
                      <div
                        key={lineIndex}
                        className={`gba:absolute gba:top-0 gba:bottom-0 gba:w-px ${line.isHour ? 'gba:bg-border' : 'gba:bg-border/50'}`}
                        style={{ left: `${line.position}px` }}
                      />
                    ))}

                    {/* Current time indicator */}
                    {currentTimePosition >= 0 && currentTimePosition <= chartWidth && (
                      <div
                        className="gba:absolute gba:top-0 gba:bottom-0 gba:w-0.5 gba:bg-red-500 gba:z-10"
                        style={{ left: `${currentTimePosition}px` }}
                      />
                    )}

                    {/* Due date indicator */}
                    {dueDatePosition !== null && dueDatePosition >= 0 && dueDatePosition <= chartWidth && (
                      <div
                        className="gba:absolute gba:top-0 gba:bottom-0 gba:w-0.5 gba:bg-orange-500 gba:z-10 gba:border-dashed"
                        style={{ left: `${dueDatePosition}px` }}
                      />
                    )}

                    {/* Gantt bar */}
                    <GanttBar
                      flow={flow}
                      timeRange={timeRange}
                      onClick={() => onFlowClick?.(flow)}
                      onAction={onFlowAction ? action => onFlowAction(flow, action) : undefined}
                      employeeName={assigneeName}
                      employeeData={assigneeInfo}
                    />
                  </div>
                </div>
              )
            })}

            {/* Current time marker in header area */}
            {currentTimePosition >= 0 && currentTimePosition <= chartWidth && (
              <div
                className="gba:absolute gba:top-0 gba:z-30 gba:flex gba:flex-col gba:items-center"
                style={{
                  left: `${LABEL_WIDTH + currentTimePosition}px`,
                  height: `${HEADER_HEIGHT}px`
                }}
              >
                <div className="gba:bg-red-500 gba:text-white gba:text-[10px] gba:px-1.5 gba:py-0.5 gba:rounded gba:font-medium gba:mt-1">
                  NOW
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary footer */}
        <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2 gba:bg-muted/50 gba:border-t gba:text-xs gba:text-muted-foreground">
          <div className="gba:flex gba:items-center gba:gap-4">
            <span>
              <strong>{activeFlows.filter(f => f.status === 'COMPLETED').length}</strong> completed
            </span>
            <span>
              <strong>{activeFlows.filter(f => f.status === 'RUNNING' || f.status === 'IN_PROGRESS').length}</strong>{' '}
              running
            </span>
            <span>
              <strong>{activeFlows.filter(f => f.status === 'PAUSED').length}</strong> paused
            </span>
            <span>
              <strong>{activeFlows.filter(f => f.status === 'FAILED' || f.status === 'TERMINATED').length}</strong>{' '}
              failed
            </span>
          </div>

          {caseDueDate && (
            <div className="gba:flex gba:items-center gba:gap-1">
              <AlertTriangle className="gba:h-3.5 gba:w-3.5 gba:text-orange-500" />
              Case due: {formatDate(caseDueDate)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default FlowGanttChart
