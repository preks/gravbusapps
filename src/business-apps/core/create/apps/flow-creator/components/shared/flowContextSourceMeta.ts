import type { ComponentType } from 'react'
import type { ExpressionSourceType } from '@/common/components/flow/expression-editor'
import { Workflow, Footprints, BookOpen, Database, Building2, Zap } from 'lucide-react'

export const FLOW_CONTEXT_SOURCE_ORDER: ExpressionSourceType[] = [
  'trigger',
  'workflow',
  'steps',
  'catalog',
  'entity',
  'orgchart'
]

export const FLOW_CONTEXT_SOURCE_LABEL: Record<ExpressionSourceType, string> = {
  trigger: 'Trigger',
  workflow: 'Workflow',
  steps: 'Steps',
  catalog: 'Catalog',
  entity: 'Entity',
  orgchart: 'Org Chart'
}

export const FLOW_CONTEXT_SOURCE_ICON: Record<ExpressionSourceType, ComponentType<{ className?: string }>> = {
  trigger: Zap,
  workflow: Workflow,
  steps: Footprints,
  catalog: BookOpen,
  entity: Database,
  orgchart: Building2
}
