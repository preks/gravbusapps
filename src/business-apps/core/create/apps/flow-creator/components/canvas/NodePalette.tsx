/**
 * NodePalette - Draggable node palette sidebar for the Flow Studio canvas.
 * Nodes can be dragged onto the canvas to add them to the flow.
 */

import React, { type DragEvent, useCallback } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { Play, ClipboardList, GitBranch, GitFork, Merge, Flag } from 'lucide-react'
import translations from '../../_i18n'
import type { FlowNodeType } from '@/common/components/flow/flow-viewer'
import type { DesignerMode } from '../../types/studioTypes'

interface PaletteItem {
  type: FlowNodeType
  label: string
  icon: React.ElementType
  description: string
  advancedOnly?: boolean
}

const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'start', label: 'palette-start', icon: Play, description: 'Trigger the flow' },
  { type: 'task', label: 'palette-task', icon: ClipboardList, description: 'User or system task' },
  { type: 'decision', label: 'palette-decision', icon: GitBranch, description: 'Decision point' },
  { type: 'fork', label: 'palette-fork', icon: GitFork, description: 'Run branches in parallel', advancedOnly: true },
  { type: 'join', label: 'palette-join', icon: Merge, description: 'Merge parallel branches', advancedOnly: true },
  { type: 'end', label: 'palette-end', icon: Flag, description: 'End and summary' }
]

interface NodePaletteProps {
  mode: DesignerMode
  'data-testid'?: string
}

export const NodePalette: React.FC<NodePaletteProps> = ({
  mode,
  'data-testid': testId = 'flow-studio-node-palette'
}) => {
  const { t } = useTranslation(translations)

  const visibleItems = mode === 'simple' ? PALETTE_ITEMS.filter(item => !item.advancedOnly) : PALETTE_ITEMS

  const onDragStart = useCallback((event: DragEvent<HTMLDivElement>, nodeType: FlowNodeType) => {
    event.dataTransfer.setData('application/flow-studio-node', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }, [])

  return (
    <div
      className="gba:flex gba:flex-col gba:gap-1 gba:p-3 gba:w-[180px] gba:border-r gba:border-border gba:bg-card gba:overflow-y-auto"
      data-testid={testId}
    >
      <div className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider gba:mb-2 gba:px-1">
        {t('palette-title')}
      </div>

      {visibleItems.map(item => {
        const Icon = item.icon
        return (
          <div
            key={item.type}
            role="button"
            tabIndex={0}
            draggable
            onDragStart={e => onDragStart(e, item.type)}
            data-testid={`${testId}-item-${item.type}`}
            className="gba:flex gba:items-center gba:gap-2 gba:px-2.5 gba:py-2 gba:rounded-md gba:cursor-grab gba:border gba:border-transparent gba:transition-all gba:hover:bg-accent/50 gba:hover:border-border gba:active:cursor-grabbing gba:select-none"
          >
            <div className="gba:flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-md gba:bg-muted">
              <Icon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
            </div>
            <span className="gba:text-sm gba:font-medium gba:text-foreground">{t(item.label)}</span>
          </div>
        )
      })}
    </div>
  )
}
