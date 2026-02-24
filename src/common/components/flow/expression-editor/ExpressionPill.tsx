/**
 * ExpressionPill - Rendered inside Tiptap as a ReactNodeView.
 * Displays a colored inline chip for each expression reference.
 */

import React from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import { Workflow, Footprints, BookOpen, Database, Building2, Zap } from 'lucide-react'
import type { ExpressionSourceType } from './types/expressionTypes'
import { SOURCE_COLOR_MAP } from './types/expressionTypes'

const ICON_MAP: Record<ExpressionSourceType, React.ElementType> = {
  trigger: Zap,
  workflow: Workflow,
  steps: Footprints,
  catalog: BookOpen,
  entity: Database,
  orgchart: Building2
}

interface ExpressionPillNodeAttrs {
  id: string
  label: string
  mentionType: ExpressionSourceType
  expression: string
}

export const ExpressionPillView: React.FC<{ node: { attrs: ExpressionPillNodeAttrs } }> = ({ node }) => {
  const source = node.attrs.mentionType || 'workflow'
  const Icon = ICON_MAP[source] || Workflow
  const colors = SOURCE_COLOR_MAP[source]

  return (
    <NodeViewWrapper as="span" className="gba:inline">
      <span
        contentEditable={false}
        data-testid="expression-pill"
        className={`gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:px-2 gba:py-0.5 gba:text-xs gba:font-medium gba:mx-0.5 gba:whitespace-nowrap gba:border ${colors.bg} ${colors.text} ${colors.border}`}
      >
        <Icon className="gba:h-3 gba:w-3" />
        {node.attrs.label || node.attrs.expression || node.attrs.id}
      </span>
    </NodeViewWrapper>
  )
}

ExpressionPillView.displayName = 'ExpressionPillView'
