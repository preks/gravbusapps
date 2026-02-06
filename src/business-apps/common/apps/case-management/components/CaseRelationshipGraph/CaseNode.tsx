/**
 * Case Node Component for React Flow Graph
 *
 * Custom node displaying case information with status, progress, and priority indicators.
 * Features:
 * - Live Status Animation: Pulsing effects for recently updated or attention-needed cases
 * - Mini Case Preview: Hover card with expanded details, activity, and assignee info
 */

import React, { memo, useState, useRef, useEffect, useCallback } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Badge, Avatar, AvatarFallback, AvatarImage, Progress } from '@newwork/nw-design-system'
import { FileText, ExternalLink, AlertTriangle, Clock, MessageSquare, Activity, CalendarClock, Zap } from 'lucide-react'
import { CaseStatus, CasePriority } from '../../types'
import { formatCaseId } from '../../utils/caseHelpers'

/**
 * Recent note preview
 */
export interface NotePreview {
  content: string
  createdBy: string
  createdAt: string
}

/**
 * Data structure for a case node - Extended with preview data
 */
export interface CaseNodeData {
  /** Unique case identifier */
  caseId: string
  /** Case title (displayed truncated) */
  title: string
  /** Case description */
  description?: string
  /** Current case status */
  status: CaseStatus
  /** Case priority level */
  priority: CasePriority
  /** Progress percentage (0-100) based on linked flows */
  progress: number
  /** Whether this is the currently viewed case */
  isCurrent: boolean
  /** Number of linked flows */
  flowCount: number
  /** Callback when clicking the node */
  onClick: (caseId: string) => void
  /** Callback when clicking external link */
  onNavigate?: (caseId: string) => void

  // Extended data for Mini Preview
  /** Assignee user ID */
  assigneeId?: string
  /** Assignee display name */
  assigneeName?: string
  /** Assignee photo (base64 or URL) */
  assigneePhoto?: string
  /** Due date ISO string */
  dueDate?: string
  /** Last updated timestamp */
  updatedAt?: string
  /** Recent notes preview */
  recentNotes?: NotePreview[]
  /** Number of total notes */
  notesCount?: number

  // Animation flags
  /** Whether this case was recently updated (within last 24h) */
  isRecentlyUpdated?: boolean
  /** Whether this case needs attention (blocked, overdue, etc.) */
  needsAttention?: boolean
  /** Whether flows are actively running */
  hasActiveFlows?: boolean

  // Name resolution
  /** Function to get user name from ID (for runtime resolution) */
  getUserName?: (userId: string) => string | undefined
}

/**
 * Status color configuration
 */
const STATUS_COLORS: Record<CaseStatus, { bg: string; border: string; text: string; badge: string; glow: string }> = {
  open: {
    bg: 'gba:bg-blue-50',
    border: 'gba:border-blue-400',
    text: 'gba:text-blue-700',
    badge: 'gba:bg-blue-100 gba:text-blue-700 gba:border-blue-300',
    glow: 'gba:shadow-blue-400/50'
  },
  in_progress: {
    bg: 'gba:bg-amber-50',
    border: 'gba:border-amber-400',
    text: 'gba:text-amber-700',
    badge: 'gba:bg-amber-100 gba:text-amber-700 gba:border-amber-300',
    glow: 'gba:shadow-amber-400/50'
  },
  blocked: {
    bg: 'gba:bg-red-50',
    border: 'gba:border-red-400',
    text: 'gba:text-red-700',
    badge: 'gba:bg-red-100 gba:text-red-700 gba:border-red-300',
    glow: 'gba:shadow-red-400/50'
  },
  completed: {
    bg: 'gba:bg-green-50',
    border: 'gba:border-green-400',
    text: 'gba:text-green-700',
    badge: 'gba:bg-green-100 gba:text-green-700 gba:border-green-300',
    glow: 'gba:shadow-green-400/50'
  },
  cancelled: {
    bg: 'gba:bg-gray-50',
    border: 'gba:border-gray-400',
    text: 'gba:text-gray-700',
    badge: 'gba:bg-gray-100 gba:text-gray-700 gba:border-gray-300',
    glow: 'gba:shadow-gray-400/50'
  }
}

/**
 * Priority border color configuration
 */
const PRIORITY_BORDERS: Record<CasePriority, string> = {
  low: 'gba:border-l-gray-400',
  medium: 'gba:border-l-blue-500',
  high: 'gba:border-l-orange-500',
  critical: 'gba:border-l-red-600'
}

/**
 * Format status for display
 */
const formatStatus = (status: CaseStatus): string => {
  const statusLabels: Record<CaseStatus, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    blocked: 'Blocked',
    completed: 'Completed',
    cancelled: 'Cancelled'
  }
  return statusLabels[status] || status
}

/**
 * Format priority for display
 */
const formatPriority = (priority: CasePriority): string => {
  const priorityLabels: Record<CasePriority, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical'
  }
  return priorityLabels[priority] || priority
}

/**
 * Format relative time
 */
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

/**
 * Check if date is overdue
 */
const isOverdue = (dueDate: string): boolean => {
  return new Date(dueDate) < new Date()
}

/**
 * Get initials from name
 */
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Case Node Component
 *
 * A custom React Flow node that displays case information in a card-like format
 * with status coloring, progress bar, priority indicator, live animations,
 * and mini case preview on hover.
 */
const CaseNodeComponent: React.FC<NodeProps<CaseNodeData>> = ({ data }) => {
  const {
    caseId,
    title,
    description,
    status,
    priority,
    progress,
    isCurrent,
    flowCount,
    onClick,
    onNavigate,
    assigneeName,
    assigneePhoto,
    dueDate,
    updatedAt,
    recentNotes,
    notesCount,
    isRecentlyUpdated,
    needsAttention,
    hasActiveFlows,
    getUserName
  } = data

  const [isHovered, setIsHovered] = useState(false)
  const [previewPosition, setPreviewPosition] = useState<{ top: number; maxHeight: number } | null>(null)
  const nodeRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  // Calculate preview position to fit in viewport
  const calculatePreviewPosition = useCallback(() => {
    if (!nodeRef.current || !isHovered) return

    const nodeRect = nodeRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const padding = 16 // Padding from viewport edges
    const estimatedPreviewHeight = 400 // Initial estimate

    // Calculate available space
    const spaceBelow = viewportHeight - nodeRect.top - padding
    const spaceAbove = nodeRect.bottom - padding

    // Determine max height based on available space
    let top = 0
    let maxHeight = Math.min(estimatedPreviewHeight, viewportHeight - padding * 2)

    if (spaceBelow >= estimatedPreviewHeight) {
      // Enough space below - align to top of node
      top = 0
      maxHeight = Math.min(estimatedPreviewHeight, spaceBelow)
    } else if (spaceAbove >= estimatedPreviewHeight) {
      // More space above - show above node
      top = nodeRect.height - estimatedPreviewHeight
      maxHeight = Math.min(estimatedPreviewHeight, spaceAbove)
    } else {
      // Limited space - center and constrain
      const availableHeight = Math.max(spaceBelow, spaceAbove)
      maxHeight = availableHeight
      if (spaceBelow >= spaceAbove) {
        top = 0
      } else {
        top = nodeRect.height - maxHeight
      }
    }

    // Adjust if preview would go above viewport
    const previewTop = nodeRect.top + top
    if (previewTop < padding) {
      top = padding - nodeRect.top
    }

    // Adjust if preview would go below viewport
    const previewBottom = nodeRect.top + top + maxHeight
    if (previewBottom > viewportHeight - padding) {
      maxHeight = viewportHeight - padding - (nodeRect.top + top)
    }

    setPreviewPosition({ top, maxHeight })
  }, [isHovered])

  // Recalculate position on hover and window resize
  useEffect(() => {
    if (isHovered) {
      calculatePreviewPosition()
      window.addEventListener('resize', calculatePreviewPosition)
      window.addEventListener('scroll', calculatePreviewPosition, true)
      return () => {
        window.removeEventListener('resize', calculatePreviewPosition)
        window.removeEventListener('scroll', calculatePreviewPosition, true)
      }
    }
  }, [isHovered, calculatePreviewPosition])

  const statusColors = STATUS_COLORS[status] || STATUS_COLORS.open
  const priorityBorder = PRIORITY_BORDERS[priority] || PRIORITY_BORDERS.medium

  // Determine animation classes
  const getAnimationClasses = () => {
    const classes: string[] = []

    // Current case glow
    if (isCurrent) {
      classes.push('gba:ring-2 gba:ring-primary gba:ring-offset-2 gba:shadow-lg gba:shadow-primary/20')
    }

    // Recently updated - subtle pulse
    if (isRecentlyUpdated && !isCurrent) {
      classes.push('gba:animate-pulse')
    }

    // Needs attention - animated border glow
    if (needsAttention || status === 'blocked') {
      classes.push(`gba:shadow-lg ${statusColors.glow}`)
    }

    // Active flows - subtle breathing effect
    if (hasActiveFlows && status === 'in_progress') {
      classes.push('gba:shadow-md gba:shadow-amber-300/40')
    }

    return classes.join(' ')
  }

  // Check if due date is overdue
  const isDueOverdue = dueDate && isOverdue(dueDate)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick(caseId)
  }

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation()
    onNavigate?.(caseId)
  }

  return (
    <div
      ref={nodeRef}
      className="gba:relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Node Card */}
      <div
        className={`gba:relative gba:w-[220px] gba:min-h-[120px] gba:rounded-lg gba:border-2 gba:border-l-4 gba:transition-all gba:duration-300 gba:cursor-pointer gba:shadow-md hover:gba:shadow-xl hover:gba:scale-[1.02] ${statusColors.bg} ${statusColors.border} ${priorityBorder} ${getAnimationClasses()}`}
        onClick={handleClick}
      >
        {/* Hidden handles for React Flow connections - all 4 sides for layout flexibility */}
        <Handle
          type="target"
          position={Position.Top}
          id="top"
          style={{ visibility: 'hidden', width: 10, height: 10, left: '50%', transform: 'translateX(-50%)' }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          style={{ visibility: 'hidden', width: 10, height: 10, left: '50%', transform: 'translateX(-50%)' }}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          style={{ visibility: 'hidden', width: 10, height: 10, top: '50%', transform: 'translateY(-50%)' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          style={{ visibility: 'hidden', width: 10, height: 10, top: '50%', transform: 'translateY(-50%)' }}
        />

        {/* Live Status Indicators */}
        {/* Recently Updated Indicator */}
        {isRecentlyUpdated && !isCurrent && (
          <div className="gba:absolute gba:-top-1 gba:-left-1 gba:flex gba:items-center gba:justify-center">
            <span className="gba:relative gba:flex gba:h-3 gba:w-3">
              <span className="gba:animate-ping gba:absolute gba:inline-flex gba:h-full gba:w-full gba:rounded-full gba:bg-blue-400 gba:opacity-75"></span>
              <span className="gba:relative gba:inline-flex gba:rounded-full gba:h-3 gba:w-3 gba:bg-blue-500"></span>
            </span>
          </div>
        )}

        {/* Needs Attention Indicator */}
        {(needsAttention || status === 'blocked') && (
          <div className="gba:absolute gba:-top-1 gba:-right-1 gba:flex gba:items-center gba:justify-center">
            <span className="gba:relative gba:flex gba:h-4 gba:w-4">
              <span className="gba:animate-ping gba:absolute gba:inline-flex gba:h-full gba:w-full gba:rounded-full gba:bg-red-400 gba:opacity-75"></span>
              <span className="gba:relative gba:inline-flex gba:items-center gba:justify-center gba:rounded-full gba:h-4 gba:w-4 gba:bg-red-500">
                <AlertTriangle className="gba:h-2.5 gba:w-2.5 gba:text-white" />
              </span>
            </span>
          </div>
        )}

        {/* Active Flows Indicator */}
        {hasActiveFlows && status === 'in_progress' && !needsAttention && (
          <div className="gba:absolute gba:-top-1 gba:-right-1 gba:flex gba:items-center gba:justify-center">
            <span className="gba:relative gba:flex gba:h-4 gba:w-4">
              <span className="gba:animate-pulse gba:absolute gba:inline-flex gba:h-full gba:w-full gba:rounded-full gba:bg-amber-400 gba:opacity-60"></span>
              <span className="gba:relative gba:inline-flex gba:items-center gba:justify-center gba:rounded-full gba:h-4 gba:w-4 gba:bg-amber-500">
                <Zap className="gba:h-2.5 gba:w-2.5 gba:text-white" />
              </span>
            </span>
          </div>
        )}

        {/* Current Case Indicator */}
        {isCurrent && (
          <div className="gba:absolute gba:-top-2 gba:left-1/2 gba:-translate-x-1/2 gba:bg-primary gba:text-primary-foreground gba:px-2 gba:py-0.5 gba:rounded-full gba:text-xs gba:font-medium gba:shadow-sm gba:whitespace-nowrap">
            Current
          </div>
        )}

        {/* Card Content */}
        <div className="gba:p-3 gba:flex gba:flex-col gba:h-full">
          {/* Header with Icon and Title */}
          <div className="gba:flex gba:items-start gba:gap-2 gba:mb-2">
            <div className={`gba:flex-shrink-0 gba:p-1.5 gba:rounded ${statusColors.bg}`}>
              <FileText className={`gba:h-4 gba:w-4 ${statusColors.text}`} />
            </div>
            <div className="gba:flex-1 gba:min-w-0">
              <h3 className="gba:font-semibold gba:text-sm gba:text-foreground gba:line-clamp-2 gba:leading-tight">
                {title}
              </h3>
              <p className="gba:text-[10px] gba:text-muted-foreground gba:font-mono gba:mt-0.5">
                {formatCaseId(caseId)}
              </p>
            </div>
          </div>

          {/* Status and Priority Badges */}
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:mb-2 gba:flex-wrap">
            <Badge variant="outline" className={`gba:text-xs gba:border ${statusColors.badge}`}>
              {formatStatus(status)}
            </Badge>
            {(priority === 'critical' || priority === 'high') && (
              <Badge
                variant="outline"
                className={`gba:text-xs gba:border gba:flex gba:items-center gba:gap-0.5 ${
                  priority === 'critical'
                    ? 'gba:bg-red-100 gba:text-red-700 gba:border-red-300'
                    : 'gba:bg-orange-100 gba:text-orange-700 gba:border-orange-300'
                }`}
              >
                <AlertTriangle className="gba:h-2.5 gba:w-2.5" />
                {formatPriority(priority)}
              </Badge>
            )}
          </div>

          {/* Progress Bar */}
          <div className="gba:mb-2">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
              <span className="gba:text-xs gba:text-muted-foreground">Progress</span>
              <span className="gba:text-xs gba:font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="gba:w-full gba:h-1.5 gba:bg-gray-200 gba:rounded-full gba:overflow-hidden">
              <div
                className={`gba:h-full gba:rounded-full gba:transition-all gba:duration-500 ${
                  progress >= 100 ? 'gba:bg-green-500' : progress >= 50 ? 'gba:bg-blue-500' : 'gba:bg-amber-500'
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          {/* Footer with Flow Count and Navigation */}
          <div className="gba:flex gba:items-center gba:justify-between gba:mt-auto gba:pt-1 gba:border-t gba:border-border/50">
            <span className="gba:text-xs gba:text-muted-foreground">
              {flowCount} {flowCount === 1 ? 'flow' : 'flows'}
            </span>
            {!isCurrent && onNavigate && (
              <button
                onClick={handleNavigate}
                className="gba:p-1 gba:rounded gba:hover:bg-muted gba:transition-colors"
                title="Open Case"
              >
                <ExternalLink className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground hover:gba:text-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mini Case Preview - Shows on Hover */}
      {isHovered && !isCurrent && previewPosition && (
        <div
          ref={previewRef}
          className="nopan nodrag gba:absolute gba:left-full gba:z-50 gba:flex gba:flex-row"
          style={{
            top: `${previewPosition.top}px`
          }}
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
        >
          {/* Invisible bridge to maintain hover between node and preview */}
          <div className="gba:w-3 gba:h-full gba:min-h-[120px]" />
          {/* Actual Preview Card */}
          <div
            className="gba:w-[280px] gba:bg-background gba:rounded-lg gba:border gba:shadow-xl gba:animate-in gba:fade-in gba:slide-in-from-left-2 gba:duration-200 gba:flex gba:flex-col"
            style={{
              maxHeight: `${previewPosition.maxHeight}px`
            }}
          >
            {/* Scrollable Content */}
            <div className="gba:p-4 gba:overflow-y-auto gba:flex-1">
              {/* Preview Header */}
              <div className="gba:flex gba:items-start gba:gap-3 gba:mb-3">
                <div className={`gba:p-2 gba:rounded-lg ${statusColors.bg}`}>
                  <FileText className={`gba:h-5 gba:w-5 ${statusColors.text}`} />
                </div>
                <div className="gba:flex-1 gba:min-w-0">
                  <h4 className="gba:font-semibold gba:text-sm gba:text-foreground gba:mb-1">{title}</h4>
                  <p className="gba:text-xs gba:text-muted-foreground gba:font-mono">{formatCaseId(caseId)}</p>
                </div>
              </div>

              {/* Description */}
              {description && (
                <p className="gba:text-xs gba:text-muted-foreground gba:mb-3 gba:line-clamp-2">{description}</p>
              )}

              {/* Stats Row */}
              <div className="gba:grid gba:grid-cols-2 gba:gap-2 gba:mb-3">
                {/* Progress */}
                <div className="gba:bg-muted/50 gba:rounded-lg gba:p-2">
                  <div className="gba:flex gba:items-center gba:gap-1.5 gba:mb-1">
                    <Activity className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
                    <span className="gba:text-xs gba:text-muted-foreground">Progress</span>
                  </div>
                  <Progress value={progress} className="gba:h-1.5" />
                  <span className="gba:text-xs gba:font-medium gba:mt-1 gba:block">{Math.round(progress)}%</span>
                </div>

                {/* Due Date */}
                <div className="gba:bg-muted/50 gba:rounded-lg gba:p-2">
                  <div className="gba:flex gba:items-center gba:gap-1.5 gba:mb-1">
                    <CalendarClock
                      className={`gba:h-3 gba:w-3 ${isDueOverdue ? 'gba:text-red-500' : 'gba:text-muted-foreground'}`}
                    />
                    <span className="gba:text-xs gba:text-muted-foreground">Due</span>
                  </div>
                  <span className={`gba:text-xs gba:font-medium ${isDueOverdue ? 'gba:text-red-600' : ''}`}>
                    {dueDate ? new Date(dueDate).toLocaleDateString() : 'Not set'}
                  </span>
                  {isDueOverdue && (
                    <Badge variant="destructive" className="gba:text-[10px] gba:px-1 gba:py-0 gba:ml-1">
                      Overdue
                    </Badge>
                  )}
                </div>
              </div>

              {/* Assignee */}
              {assigneeName && (
                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3 gba:p-2 gba:bg-muted/50 gba:rounded-lg">
                  <Avatar className="gba:h-6 gba:w-6">
                    {assigneePhoto && <AvatarImage src={assigneePhoto} alt={assigneeName} />}
                    <AvatarFallback className="gba:text-xs">{getInitials(assigneeName)}</AvatarFallback>
                  </Avatar>
                  <div className="gba:flex-1 gba:min-w-0">
                    <p className="gba:text-xs gba:font-medium gba:truncate">{assigneeName}</p>
                    <p className="gba:text-[10px] gba:text-muted-foreground">Assignee</p>
                  </div>
                </div>
              )}

              {/* Recent Notes Preview */}
              {recentNotes && recentNotes.length > 0 && (
                <div className="gba:border-t gba:pt-3">
                  <div className="gba:flex gba:items-center gba:gap-1.5 gba:mb-2">
                    <MessageSquare className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
                    <span className="gba:text-xs gba:font-medium">Recent Notes</span>
                    {notesCount && notesCount > 1 && (
                      <Badge variant="secondary" className="gba:text-[10px] gba:px-1 gba:py-0">
                        {notesCount}
                      </Badge>
                    )}
                  </div>
                  <div className="gba:space-y-2">
                    {recentNotes.slice(0, 2).map((note, idx) => {
                      // Resolve creator name using getUserName if available
                      const creatorName = getUserName?.(note.createdBy) || note.createdBy
                      return (
                        <div key={idx} className="gba:bg-muted/30 gba:rounded gba:p-2">
                          <p className="gba:text-xs gba:text-muted-foreground gba:line-clamp-2">{note.content}</p>
                          <p className="gba:text-[10px] gba:text-muted-foreground gba:mt-1">
                            {creatorName} • {formatRelativeTime(note.createdAt)}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Last Updated */}
              {updatedAt && (
                <div className="gba:flex gba:items-center gba:gap-1.5 gba:mt-3 gba:pt-2 gba:border-t">
                  <Clock className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
                  <span className="gba:text-[10px] gba:text-muted-foreground">
                    Updated {formatRelativeTime(updatedAt)}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Action - Fixed at bottom */}
            <div className="gba:p-3 gba:pt-0 gba:flex-shrink-0">
              <button
                onClick={handleNavigate}
                className="gba:w-full gba:py-2 gba:px-3 gba:bg-primary gba:text-primary-foreground gba:rounded-lg gba:text-xs gba:font-medium gba:flex gba:items-center gba:justify-center gba:gap-2 hover:gba:bg-primary/90 gba:transition-colors"
              >
                <ExternalLink className="gba:h-3.5 gba:w-3.5" />
                Open Case
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Memoized export for better React Flow performance
 */
export const CaseNode = memo(CaseNodeComponent)
