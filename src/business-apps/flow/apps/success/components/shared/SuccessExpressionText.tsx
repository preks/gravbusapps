import React, { useMemo } from 'react'
import { Badge, useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'
import { detectSourceType } from '@/common/components/flow/expression-editor/expressionSerializer'
import type { ExpressionSourceType } from '@/common/components/flow/expression-editor/types/expressionTypes'

interface SuccessExpressionTextProps {
  value?: string | null
  fallback?: string
  'data-testid'?: string
}

type ExpressionSegment = { type: 'text'; value: string } | { type: 'expression'; expression: string }

const EXPRESSION_PATTERN = /\{\{([^}]+)\}\}/g

function splitExpressionSegments(value: string): ExpressionSegment[] {
  const segments: ExpressionSegment[] = []
  let lastIndex = 0

  for (const match of value.matchAll(EXPRESSION_PATTERN)) {
    const matchIndex = match.index ?? 0
    if (matchIndex > lastIndex) {
      segments.push({ type: 'text', value: value.slice(lastIndex, matchIndex) })
    }

    segments.push({ type: 'expression', expression: String(match[1] || '').trim() })
    lastIndex = matchIndex + match[0].length
  }

  if (lastIndex < value.length) {
    segments.push({ type: 'text', value: value.slice(lastIndex) })
  }

  return segments.length ? segments : [{ type: 'text', value }]
}

export const SuccessExpressionText: React.FC<SuccessExpressionTextProps> = ({
  value,
  fallback,
  'data-testid': testId = 'success-expression-text'
}) => {
  const { t } = useTranslation(translations)
  const normalizedValue = String(value || '').trim()
  const segments = useMemo(() => splitExpressionSegments(normalizedValue), [normalizedValue])
  const resolvedFallback = fallback || t('value-not-available')

  const getExpressionLabel = (expression: string) => {
    const source = detectSourceType(expression)
    const labelBySource: Record<ExpressionSourceType, string> = {
      trigger: t('expression-pill-workflow-variable'),
      workflow: t('expression-pill-workflow-variable'),
      steps: t('expression-pill-step-variable'),
      catalog: t('expression-pill-catalog-variable'),
      entity: t('expression-pill-entity-variable'),
      orgchart: t('expression-pill-orgchart-variable')
    }

    return labelBySource[source]
  }

  if (!normalizedValue) {
    return <span data-testid={testId}>{resolvedFallback}</span>
  }

  return (
    <span className="gba:flex gba:flex-wrap gba:items-center gba:gap-1.5" data-testid={testId}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          const text = segment.value.trim()
          if (!text) return null
          return (
            <span key={`text-${index}`} className="gba:whitespace-pre-wrap">
              {text}
            </span>
          )
        }

        return (
          <Badge
            key={`expr-${index}`}
            variant="secondary"
            className="gba:h-5 gba:border-none gba:bg-muted gba:px-2 gba:text-xs gba:font-medium gba:text-muted-foreground"
            title={`{{${segment.expression}}}`}
          >
            {getExpressionLabel(segment.expression)}
          </Badge>
        )
      })}
    </span>
  )
}
