import React from 'react'
import { Handle, Position } from 'reactflow'
import { Badge } from '@newwork/nw-design-system'
import { Play, Zap, Calendar, Link as LinkIcon } from 'lucide-react'
import type { TriggerType, StepStatus } from '../types/viewerTypes'

interface StartNodeData {
  isSelected?: boolean
  triggerType?: TriggerType
  status?: StepStatus
  onSelect?: () => void
  testId?: string
}

const TRIGGER_ICONS: Record<string, React.ElementType> = {
  EVENT: Zap,
  SCHEDULE: Calendar,
  WEBHOOK: LinkIcon,
  MANUAL_FORM: Play
}

const TRIGGER_LABELS: Record<string, string> = {
  EVENT: 'Event',
  SCHEDULE: 'Schedule',
  WEBHOOK: 'Webhook',
  MANUAL_FORM: 'Manual'
}

function getStatusRing(status?: StepStatus): string {
  if (status === 'completed') return 'gba:border-success'
  if (status === 'active') return 'gba:border-primary gba:animate-pulse'
  if (status === 'failed') return 'gba:border-destructive'
  return 'gba:border-border'
}

export const StartNode: React.FC<{ data: StartNodeData }> = ({ data }) => {
  const isSelected = Boolean(data.isSelected)
  const triggerType = data.triggerType ?? 'MANUAL_FORM'
  const Icon = TRIGGER_ICONS[triggerType] ?? Play

  const borderClass = isSelected ? 'gba:border-primary' : getStatusRing(data.status)
  const bgClass = isSelected ? 'gba:bg-accent' : 'gba:bg-card'

  return (
    <button
      type="button"
      className={`nopan nodrag gba:rounded-full gba:w-[140px] gba:h-[140px] gba:border-2 gba:transition-all gba:duration-200 gba:cursor-pointer gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-1.5 gba:shadow-sm hover:gba:shadow-md hover:gba:scale-105 ${borderClass} ${bgClass}`}
      onClick={() => data.onSelect?.()}
      data-testid={data.testId ?? 'flow-viewer-start-node'}
    >
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ visibility: 'hidden', width: 10, height: 10, left: '50%', transform: 'translateX(-50%)' }}
      />

      <div
        className={`gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:rounded-full ${
          isSelected ? 'gba:bg-primary/10' : 'gba:bg-muted'
        }`}
      >
        <Icon
          className={`gba:h-5 gba:w-5 ${isSelected ? 'gba:text-primary' : 'gba:text-muted-foreground'}`}
          strokeWidth={2}
        />
      </div>

      <div className={`gba:font-semibold gba:text-sm ${isSelected ? 'gba:text-primary' : 'gba:text-foreground'}`}>
        Start
      </div>

      <Badge variant="outline" className="gba:text-xs">
        {TRIGGER_LABELS[triggerType] ?? 'Manual'}
      </Badge>
    </button>
  )
}
