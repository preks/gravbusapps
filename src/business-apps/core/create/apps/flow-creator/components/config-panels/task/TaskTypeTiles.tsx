import React, { useMemo } from 'react'
import { Button, Label } from '@newwork/nw-design-system'
import { ClipboardList, UserCheck, Info, CheckCircle2, Code2, Bot, Brain } from 'lucide-react'
import type { FlowStepType } from '@/common/data/flow/types/flowTemplate'
const TYPE_META: Record<
  FlowStepType,
  {
    icon: React.ReactNode
  }
> = {
  TASK: {
    icon: <ClipboardList className="gba:h-4 gba:w-4" />
  },
  APPROVAL: {
    icon: <UserCheck className="gba:h-4 gba:w-4" />
  },
  INFORMATION: {
    icon: <Info className="gba:h-4 gba:w-4" />
  },
  ACKNOWLEDGE: {
    icon: <CheckCircle2 className="gba:h-4 gba:w-4" />
  },
  FUNCTION: {
    icon: <Code2 className="gba:h-4 gba:w-4" />
  },
  AI_AGENT: {
    icon: <Brain className="gba:h-4 gba:w-4" />
  },
  AI_TASK_EXPERT: {
    icon: <Bot className="gba:h-4 gba:w-4" />
  }
}

interface TaskTypeTilesProps {
  options: FlowStepType[]
  value: FlowStepType
  onChange: (next: FlowStepType) => void
  title: string
  getLabel: (type: FlowStepType) => string
  'data-testid'?: string
}

export const TaskTypeTiles: React.FC<TaskTypeTilesProps> = ({
  options,
  value,
  onChange,
  title,
  getLabel,
  'data-testid': testId = 'task-type-tiles'
}) => {
  const visibleOptions = useMemo(() => {
    // Keep simple mode tight; advanced shows everything passed in.
    return options
  }, [options])

  return (
    <div className="gba:flex gba:flex-col gba:gap-2" data-testid={testId}>
      <Label className="gba:text-xs gba:font-semibold gba:text-foreground">{title}</Label>

      <div className="gba:grid gba:grid-cols-2 gba:gap-2">
        {visibleOptions.map(type => {
          const isSelected = value === type
          const meta = TYPE_META[type]
          return (
            <Button
              key={type}
              type="button"
              variant="outline"
              onClick={() => onChange(type)}
              className={[
                'gba:h-auto gba:py-3 gba:px-3 gba:justify-start gba:items-start gba:flex gba:flex-col gba:gap-1 gba:bg-background',
                isSelected ? 'gba:border-primary gba:ring-1 gba:ring-ring' : 'gba:border-border'
              ].join(' ')}
              data-testid={`${testId}-tile-${String(type).toLowerCase()}`}
            >
              <div className="gba:flex gba:items-center gba:gap-2">
                <span className={isSelected ? 'gba:text-primary' : 'gba:text-muted-foreground'}>{meta?.icon}</span>
                <span className="gba:text-xs gba:font-semibold gba:text-foreground">{getLabel(type)}</span>
              </div>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
