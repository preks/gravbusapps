/**
 * HumanReadablePreview Component
 *
 * Renders a mixed text/expression string as a rich preview with
 * styled pills for expressions and plain text for static content.
 */

import React, { useMemo } from 'react'
import { Badge } from '@newwork/nw-design-system'
import { FlowTemplate } from '@/common/data/flow/types/flowTemplate'
import { ExpressionSegment, parseExpressionString } from '@/common/data/flow/utils/expressionParser'
import {
  EntityRefPill,
  EntityStructuredPill,
  EntityUrlPill,
  ExpressionPill,
  FileLinkPill,
  FileUrlPill
} from './ExpressionPill'

type SegmentWithKey = { segment: ExpressionSegment; key: string }

const createSegmentSignature = (segment: ExpressionSegment): string => {
  switch (segment.type) {
    case 'text':
      return `text-${segment.content}`
    case 'expression':
      return `expression-${segment.expression.raw}`
    case 'file-url':
      return `file-url-${segment.id.raw}-${segment.name?.raw ?? 'name'}-${segment.url?.raw ?? 'url'}`
    case 'entity-url':
      return `entity-url-${segment.entityType}-${segment.id.raw}-${segment.name?.raw ?? 'name'}`
    case 'file-link':
      return `file-link-${segment.fileName.raw}-${segment.downloadPath.raw}`
    case 'entity-ref':
      return `entity-ref-${segment.entityType}-${segment.expression.raw}`
    case 'entity-structured':
      return `entity-structured-${segment.entityType}-${segment.nameExpression.raw}-${segment.idExpression.raw}`
    default:
      return 'unknown'
  }
}

const buildSegmentsWithKeys = (segments: ExpressionSegment[]): SegmentWithKey[] => {
  const occurrences = new Map<string, number>()

  return segments.map(segment => {
    const signature = createSegmentSignature(segment)
    const occurrence = occurrences.get(signature) ?? 0
    occurrences.set(signature, occurrence + 1)
    return { segment, key: `${signature}-${occurrence}` }
  })
}

interface HumanReadablePreviewProps {
  value: string
  template?: FlowTemplate
  readableOverrides?: Record<string, string>
  'data-testid'?: string
}

/**
 * HumanReadablePreview - Renders expressions as rich pill components
 */
export const HumanReadablePreview: React.FC<HumanReadablePreviewProps> = ({
  value,
  template,
  readableOverrides,
  'data-testid': testId = 'human-readable-preview'
}) => {
  const segments = useMemo(() => {
    return parseExpressionString(value, template, readableOverrides)
  }, [value, template, readableOverrides])

  const segmentsWithKeys = useMemo(() => buildSegmentsWithKeys(segments), [segments])

  if (segments.length === 0) {
    return (
      <div className="gba:text-muted-foreground gba:text-sm gba:italic" data-testid={testId}>
        No expression content
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1 gba:leading-relaxed" data-testid={testId}>
      {segmentsWithKeys.map(({ segment, key }, index) => (
        <SegmentRenderer key={key} segment={segment} index={index} testId={testId} />
      ))}
    </div>
  )
}

interface SegmentRendererProps {
  segment: ExpressionSegment
  index: number
  testId: string
}

const SegmentRenderer: React.FC<SegmentRendererProps> = ({ segment, index, testId }) => {
  switch (segment.type) {
    case 'text':
      return (
        <span className="gba:text-sm gba:text-foreground" data-testid={`${testId}-text-${index}`}>
          {segment.content}
        </span>
      )
    case 'expression':
      return <ExpressionPill expression={segment.expression} data-testid={`${testId}-pill-${index}`} />
    case 'file-url':
      return (
        <FileUrlPill
          id={segment.id}
          name={segment.name}
          url={segment.url}
          data-testid={`${testId}-file-url-${index}`}
        />
      )
    case 'entity-url':
      return (
        <EntityUrlPill
          entityType={segment.entityType}
          id={segment.id}
          name={segment.name}
          data-testid={`${testId}-entity-url-${index}`}
        />
      )
    case 'file-link':
      return (
        <FileLinkPill
          fileName={segment.fileName}
          downloadPath={segment.downloadPath}
          data-testid={`${testId}-file-${index}`}
        />
      )
    case 'entity-ref':
      return (
        <EntityRefPill
          entityType={segment.entityType}
          expression={segment.expression}
          data-testid={`${testId}-entity-${index}`}
        />
      )
    case 'entity-structured':
      return (
        <EntityStructuredPill
          entityType={segment.entityType}
          nameExpression={segment.nameExpression}
          idExpression={segment.idExpression}
          data-testid={`${testId}-entity-structured-${index}`}
        />
      )
    default:
      return null
  }
}

interface CompactExpressionPreviewProps {
  value: string
  template?: FlowTemplate
  maxPills?: number
  'data-testid'?: string
}

export const CompactExpressionPreview: React.FC<CompactExpressionPreviewProps> = ({
  value,
  template,
  maxPills = 3,
  'data-testid': testId = 'compact-preview'
}) => {
  const segments = useMemo(() => {
    return parseExpressionString(value, template)
  }, [value, template])

  const expressionSegments = segments.filter(
    segment =>
      segment.type === 'expression' ||
      segment.type === 'file-url' ||
      segment.type === 'entity-url' ||
      segment.type === 'file-link' ||
      segment.type === 'entity-ref' ||
      segment.type === 'entity-structured'
  )

  const visibleSegments = expressionSegments.slice(0, maxPills)
  const hiddenCount = expressionSegments.length - maxPills
  const visibleSegmentsWithKeys = useMemo(() => buildSegmentsWithKeys(visibleSegments), [visibleSegments])

  return (
    <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1" data-testid={testId}>
      {visibleSegmentsWithKeys.map(({ segment, key }, index) => (
        <SegmentRenderer key={key} segment={segment} index={index} testId={testId} />
      ))}
      {hiddenCount > 0 && (
        <Badge variant="secondary" className="gba:text-xs">
          +{hiddenCount} more
        </Badge>
      )}
    </div>
  )
}

interface PreviewHeaderProps {
  showContainer?: boolean
}

export const ExpressionPreviewContainer: React.FC<
  React.PropsWithChildren<PreviewHeaderProps & HumanReadablePreviewProps>
> = ({
  value,
  template,
  readableOverrides,
  showContainer = true,
  'data-testid': testId = 'expression-preview-container'
}) => {
  if (!showContainer) {
    return (
      <HumanReadablePreview
        value={value}
        template={template}
        readableOverrides={readableOverrides}
        data-testid={testId}
      />
    )
  }

  return (
    <div
      className="gba:space-y-2 gba:rounded-lg gba:border gba:border-muted gba:bg-muted/30 gba:p-3"
      data-testid={testId}
    >
      <div className="gba:flex gba:items-center gba:gap-2">
        <Badge variant="secondary" className="gba:text-xs">
          Human-readable
        </Badge>
        <span className="gba:text-xs gba:text-muted-foreground">Contextual view of expressions</span>
      </div>
      <HumanReadablePreview
        value={value}
        template={template}
        readableOverrides={readableOverrides}
        data-testid={`${testId}-preview`}
      />
    </div>
  )
}
