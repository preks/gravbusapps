/**
 * DocumentAnnotationOverlay Component
 *
 * Renders visual annotations (highlights, comments, suggestions) on document content.
 * Supports different annotation types, severities, and interactive features.
 */

import React, { useMemo, useCallback, useState, useRef } from 'react'
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  ScrollArea
} from '@newwork/nw-design-system'
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  MessageSquare,
  Lightbulb,
  ChevronRight,
  ChevronLeft
} from 'lucide-react'
import type { DocumentAnnotation, AnnotationSeverity, AnnotationCategory, AnnotationType } from '../types'

// ============================================================================
// Types
// ============================================================================

export interface DocumentAnnotationOverlayProps {
  /** The document content (HTML or plain text) */
  content: string
  /** List of annotations to display */
  annotations: DocumentAnnotation[]
  /** Currently selected annotation ID */
  selectedAnnotationId?: string | null
  /** Whether annotations are visible */
  isVisible?: boolean
  /** Whether the review is loading */
  isLoading?: boolean
  /** Callback when an annotation is clicked */
  onAnnotationClick?: (annotation: DocumentAnnotation) => void
  /** Callback when applying a suggestion */
  onApplySuggestion?: (annotation: DocumentAnnotation) => void
  /** Callback when resolving/dismissing an annotation */
  onResolve?: (annotation: DocumentAnnotation) => void
  /** Callback when adding a comment */
  onAddComment?: (annotation: DocumentAnnotation, comment: string) => void
  /** Whether to show resolved annotations */
  showResolved?: boolean
  /** Filter by severities */
  severityFilter?: AnnotationSeverity[]
  /** Filter by categories */
  categoryFilter?: AnnotationCategory[]
  /** Custom class name */
  className?: string
  /** Test ID prefix */
  'data-testid'?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get color classes for severity
 */
const getSeverityColors = (severity: AnnotationSeverity) => {
  switch (severity) {
    case 'critical':
      return {
        bg: 'gba:bg-destructive/20',
        border: 'gba:border-destructive',
        text: 'gba:text-destructive',
        badge: 'destructive' as const
      }
    case 'warning':
      return {
        bg: 'gba:bg-warning/20',
        border: 'gba:border-warning',
        text: 'gba:text-warning-foreground',
        badge: 'warning' as const
      }
    case 'info':
      return {
        bg: 'gba:bg-info/20',
        border: 'gba:border-info',
        text: 'gba:text-info-foreground',
        badge: 'info' as const
      }
    case 'success':
      return {
        bg: 'gba:bg-success/20',
        border: 'gba:border-success',
        text: 'gba:text-success-foreground',
        badge: 'success' as const
      }
    default:
      return {
        bg: 'gba:bg-muted',
        border: 'gba:border-border',
        text: 'gba:text-foreground',
        badge: 'secondary' as const
      }
  }
}

/**
 * Get icon for severity
 */
const getSeverityIcon = (severity: AnnotationSeverity) => {
  switch (severity) {
    case 'critical':
      return AlertCircle
    case 'warning':
      return AlertTriangle
    case 'info':
      return Info
    case 'success':
      return CheckCircle
    default:
      return Info
  }
}

/**
 * Get icon for annotation type
 */
const getTypeIcon = (type: AnnotationType) => {
  switch (type) {
    case 'error':
      return AlertCircle
    case 'warning':
      return AlertTriangle
    case 'suggestion':
      return Lightbulb
    case 'comment':
      return MessageSquare
    case 'highlight':
    case 'info':
    default:
      return Info
  }
}

// ============================================================================
// Sub-Components
// ============================================================================

interface AnnotationMarkerProps {
  annotation: DocumentAnnotation
  isSelected: boolean
  onClick: () => void
}

const AnnotationMarker: React.FC<AnnotationMarkerProps> = ({ annotation, isSelected, onClick }) => {
  const colors = getSeverityColors(annotation.severity)
  const Icon = getSeverityIcon(annotation.severity)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={`
              gba:inline-flex gba:items-center gba:justify-center
              gba:w-5 gba:h-5 gba:rounded-full
              gba:cursor-pointer gba:transition-all
              ${colors.bg} ${colors.border} gba:border
              ${isSelected ? 'gba:ring-2 gba:ring-primary gba:ring-offset-1' : ''}
              gba:hover:scale-110
            `}
            data-testid={`annotation-marker-${annotation.id}`}
          >
            <Icon className={`gba:w-3 gba:h-3 ${colors.text}`} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="gba:max-w-xs">
          <p className="gba:font-medium">{annotation.category}</p>
          <p className="gba:text-sm gba:text-muted-foreground">{annotation.message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface AnnotationCardProps {
  annotation: DocumentAnnotation
  isSelected: boolean
  onSelect: () => void
  onApplySuggestion?: () => void
  onResolve?: () => void
}

const AnnotationCard: React.FC<AnnotationCardProps> = ({
  annotation,
  isSelected,
  onSelect,
  onApplySuggestion,
  onResolve
}) => {
  const colors = getSeverityColors(annotation.severity)
  const Icon = getTypeIcon(annotation.type)

  return (
    <Card
      className={`
        gba:cursor-pointer gba:transition-all
        ${isSelected ? 'gba:ring-2 gba:ring-primary' : ''}
        ${annotation.resolved ? 'gba:opacity-50' : ''}
        gba:hover:shadow-md
      `}
      onClick={onSelect}
      data-testid={`annotation-card-${annotation.id}`}
    >
      <CardHeader className="gba:p-3 gba:pb-2">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Icon className={`gba:w-4 gba:h-4 ${colors.text}`} />
            <Badge variant={colors.badge} className="gba:text-xs">
              {annotation.category}
            </Badge>
          </div>
          <Badge variant="outline" className="gba:text-xs">
            {annotation.severity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="gba:p-3 gba:pt-0 gba:space-y-2">
        {/* Original text */}
        <div className={`gba:p-2 gba:rounded ${colors.bg} gba:text-sm`}>
          <span className="gba:line-through gba:opacity-70">{annotation.originalText}</span>
        </div>

        {/* Message */}
        <p className="gba:text-sm gba:text-foreground">{annotation.message}</p>

        {/* Suggestion */}
        {annotation.suggestion && (
          <div className="gba:p-2 gba:rounded gba:bg-success/10 gba:border gba:border-success/30">
            <p className="gba:text-xs gba:text-muted-foreground gba:mb-1">Suggestion:</p>
            <p className="gba:text-sm gba:text-success-foreground gba:font-medium">{annotation.suggestion}</p>
          </div>
        )}

        {/* Details */}
        {annotation.details && <p className="gba:text-xs gba:text-muted-foreground">{annotation.details}</p>}

        {/* Actions */}
        <div className="gba:flex gba:items-center gba:gap-2 gba:pt-2">
          {annotation.suggestion && onApplySuggestion && !annotation.resolved && (
            <Button
              size="sm"
              variant="default"
              onClick={e => {
                e.stopPropagation()
                onApplySuggestion()
              }}
              data-testid={`annotation-apply-${annotation.id}`}
            >
              Apply Fix
            </Button>
          )}
          {onResolve && !annotation.resolved && (
            <Button
              size="sm"
              variant="outline"
              onClick={e => {
                e.stopPropagation()
                onResolve()
              }}
              data-testid={`annotation-resolve-${annotation.id}`}
            >
              Dismiss
            </Button>
          )}
          {annotation.resolved && (
            <Badge variant="success" className="gba:text-xs">
              <CheckCircle className="gba:w-3 gba:h-3 gba:mr-1" />
              Resolved
            </Badge>
          )}
        </div>

        {/* Confidence */}
        {annotation.confidence !== undefined && (
          <p className="gba:text-xs gba:text-muted-foreground gba:text-right">
            Confidence: {Math.round(annotation.confidence * 100)}%
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export const DocumentAnnotationOverlay: React.FC<DocumentAnnotationOverlayProps> = ({
  content,
  annotations,
  selectedAnnotationId,
  isVisible = true,
  isLoading = false,
  onAnnotationClick,
  onApplySuggestion,
  onResolve,
  showResolved = false,
  severityFilter,
  categoryFilter,
  className = '',
  'data-testid': testId = 'document-annotation-overlay'
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(true)
  const contentRef = useRef<HTMLDivElement>(null)

  // Filter annotations
  const filteredAnnotations = useMemo(() => {
    let filtered = annotations

    if (!showResolved) {
      filtered = filtered.filter(a => !a.resolved)
    }

    if (severityFilter?.length) {
      filtered = filtered.filter(a => severityFilter.includes(a.severity))
    }

    if (categoryFilter?.length) {
      filtered = filtered.filter(a => categoryFilter.includes(a.category))
    }

    return filtered.sort((a, b) => a.startOffset - b.startOffset)
  }, [annotations, showResolved, severityFilter, categoryFilter])

  // Group annotations by position for overlapping detection (reserved for future use)
  const _annotationsByPosition = useMemo(() => {
    const map = new Map<number, DocumentAnnotation[]>()
    filteredAnnotations.forEach(ann => {
      for (let i = ann.startOffset; i <= ann.endOffset; i++) {
        const existing = map.get(i) || []
        map.set(i, [...existing, ann])
      }
    })
    return map
  }, [filteredAnnotations])
  void _annotationsByPosition // Prevent unused warning

  // Navigate between annotations
  const navigateAnnotation = useCallback(
    (direction: 'prev' | 'next') => {
      if (!filteredAnnotations.length) return

      const currentIndex = selectedAnnotationId ? filteredAnnotations.findIndex(a => a.id === selectedAnnotationId) : -1

      let newIndex: number
      if (direction === 'next') {
        newIndex = currentIndex < filteredAnnotations.length - 1 ? currentIndex + 1 : 0
      } else {
        newIndex = currentIndex > 0 ? currentIndex - 1 : filteredAnnotations.length - 1
      }

      onAnnotationClick?.(filteredAnnotations[newIndex])
    },
    [filteredAnnotations, selectedAnnotationId, onAnnotationClick]
  )

  // Render content with inline highlights
  const renderHighlightedContent = useCallback(() => {
    if (!content || !filteredAnnotations.length) {
      return <div dangerouslySetInnerHTML={{ __html: content }} />
    }

    // Build highlighted HTML
    const segments: React.ReactNode[] = []
    let lastEnd = 0

    // Sort annotations by start position
    const sortedAnnotations = [...filteredAnnotations].sort((a, b) => a.startOffset - b.startOffset)

    sortedAnnotations.forEach((annotation, index) => {
      // Add text before this annotation
      if (annotation.startOffset > lastEnd) {
        const textBefore = content.slice(lastEnd, annotation.startOffset)
        segments.push(<span key={`text-${index}`} dangerouslySetInnerHTML={{ __html: textBefore }} />)
      }

      // Add highlighted annotation
      const colors = getSeverityColors(annotation.severity)
      const isSelected = annotation.id === selectedAnnotationId
      const highlightedText = content.slice(annotation.startOffset, annotation.endOffset)

      segments.push(
        <span
          key={`ann-${annotation.id}`}
          className={`
            gba:relative gba:cursor-pointer
            ${colors.bg} ${isSelected ? 'gba:ring-2 gba:ring-primary' : ''}
            gba:border-b-2 ${colors.border}
            gba:transition-all gba:hover:opacity-80
          `}
          onClick={() => onAnnotationClick?.(annotation)}
          data-annotation-id={annotation.id}
          data-testid={`annotation-highlight-${annotation.id}`}
        >
          <span dangerouslySetInnerHTML={{ __html: highlightedText }} />
          <AnnotationMarker
            annotation={annotation}
            isSelected={isSelected}
            onClick={() => onAnnotationClick?.(annotation)}
          />
        </span>
      )

      lastEnd = annotation.endOffset
    })

    // Add remaining text
    if (lastEnd < content.length) {
      segments.push(<span key="text-end" dangerouslySetInnerHTML={{ __html: content.slice(lastEnd) }} />)
    }

    return <>{segments}</>
  }, [content, filteredAnnotations, selectedAnnotationId, onAnnotationClick])

  // Summary stats
  const stats = useMemo(() => {
    const counts = { critical: 0, warning: 0, info: 0, success: 0, total: 0 }
    filteredAnnotations.forEach(a => {
      counts[a.severity]++
      counts.total++
    })
    return counts
  }, [filteredAnnotations])

  if (!isVisible) {
    return null
  }

  return (
    <div className={`gba:flex gba:gap-4 ${className}`} data-testid={testId}>
      {/* Document Content with Highlights */}
      <div className="gba:flex-1 gba:min-w-0" ref={contentRef}>
        {isLoading ? (
          <div className="gba:animate-pulse gba:space-y-4">
            <div className="gba:h-4 gba:bg-muted gba:rounded gba:w-3/4" />
            <div className="gba:h-4 gba:bg-muted gba:rounded gba:w-full" />
            <div className="gba:h-4 gba:bg-muted gba:rounded gba:w-5/6" />
          </div>
        ) : (
          <div className="gba:prose gba:prose-lg gba:max-w-none">{renderHighlightedContent()}</div>
        )}
      </div>

      {/* Annotations Panel */}
      {filteredAnnotations.length > 0 && (
        <div
          className={`
            gba:transition-all gba:duration-300
            ${isPanelOpen ? 'gba:w-80' : 'gba:w-10'}
            gba:flex-shrink-0
          `}
        >
          {/* Panel Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className="gba:mb-2"
            data-testid={`${testId}-toggle-panel`}
          >
            {isPanelOpen ? <ChevronRight /> : <ChevronLeft />}
          </Button>

          {isPanelOpen && (
            <Card className="gba:sticky gba:top-4">
              <CardHeader className="gba:p-3">
                <CardTitle className="gba:text-sm gba:flex gba:items-center gba:justify-between">
                  <span>Review Results</span>
                  <Badge variant="secondary">{stats.total} issues</Badge>
                </CardTitle>

                {/* Stats */}
                <div className="gba:flex gba:gap-2 gba:mt-2">
                  {stats.critical > 0 && (
                    <Badge variant="destructive" className="gba:text-xs">
                      {stats.critical} critical
                    </Badge>
                  )}
                  {stats.warning > 0 && (
                    <Badge variant="warning" className="gba:text-xs">
                      {stats.warning} warnings
                    </Badge>
                  )}
                  {stats.info > 0 && (
                    <Badge variant="info" className="gba:text-xs">
                      {stats.info} info
                    </Badge>
                  )}
                </div>

                {/* Navigation */}
                <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateAnnotation('prev')}
                    data-testid={`${testId}-nav-prev`}
                  >
                    <ChevronLeft className="gba:w-4 gba:h-4" />
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateAnnotation('next')}
                    data-testid={`${testId}-nav-next`}
                  >
                    Next
                    <ChevronRight className="gba:w-4 gba:h-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="gba:p-3 gba:pt-0">
                <ScrollArea className="gba:h-[500px]">
                  <div className="gba:space-y-3">
                    {filteredAnnotations.map(annotation => (
                      <AnnotationCard
                        key={annotation.id}
                        annotation={annotation}
                        isSelected={annotation.id === selectedAnnotationId}
                        onSelect={() => onAnnotationClick?.(annotation)}
                        onApplySuggestion={onApplySuggestion ? () => onApplySuggestion(annotation) : undefined}
                        onResolve={onResolve ? () => onResolve(annotation) : undefined}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default DocumentAnnotationOverlay
