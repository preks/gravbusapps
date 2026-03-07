import React from 'react'
import { Button, Badge } from '@newwork/nw-design-system'
import { GitBranch, ListChecks, ArrowRight } from 'lucide-react'
import type { FlowEntityKind } from '../../services/flowEngine'

interface FlowEntityPickerProps {
  selected: FlowEntityKind
  onSelect: (kind: FlowEntityKind) => void
  onNext: () => void
  'data-testid'?: string
}

export const FlowEntityPicker: React.FC<FlowEntityPickerProps> = ({
  selected,
  onSelect,
  onNext,
  'data-testid': testId = 'flow-entity-picker'
}) => {
  const options: Array<{
    kind: FlowEntityKind
    label: string
    desc: string
    hint: string
    icon: React.ReactNode
  }> = [
    {
      kind: 'flows',
      label: 'Flow instances',
      desc: 'One row per flow. Expand any row to see its steps, assignees and status inline.',
      hint: 'Best for tracking overall progress — e.g. "how many requests are open?"',
      icon: <GitBranch className="gba:w-5 gba:h-5" />
    },
    {
      kind: 'tasks',
      label: 'Tasks / Steps',
      desc: 'One row per individual task or step, across all matching flows.',
      hint: 'Best for tracking individual work items — e.g. "what is assigned to me?"',
      icon: <ListChecks className="gba:w-5 gba:h-5" />
    }
  ]

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      <div>
        <h3 className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">What do you want to import?</h3>
        <p className="gba:text-xs gba:text-muted-foreground">
          Choose whether to import entire flow instances or individual tasks/steps.
        </p>
      </div>

      <div className="gba:space-y-2">
        {options.map(opt => {
          const isActive = selected === opt.kind
          return (
            <button
              key={opt.kind}
              onClick={() => onSelect(opt.kind)}
              className={`gba:w-full gba:flex gba:items-start gba:gap-3 gba:p-3 gba:rounded-lg gba:border gba:text-left gba:transition-colors ${
                isActive
                  ? 'gba:border-primary gba:bg-primary/5'
                  : 'gba:border-border gba:hover:border-primary/40 gba:hover:bg-muted/30'
              }`}
              data-testid={`${testId}-${opt.kind}`}
            >
              <div
                className={`gba:mt-0.5 gba:flex-shrink-0 ${isActive ? 'gba:text-primary' : 'gba:text-muted-foreground'}`}
              >
                {opt.icon}
              </div>
              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span className="gba:text-sm gba:font-medium gba:text-foreground">{opt.label}</span>
                  {isActive && (
                    <Badge variant="info" className="gba:text-[10px]">
                      Selected
                    </Badge>
                  )}
                </div>
                <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{opt.desc}</p>
                <p className="gba:text-[11px] gba:text-muted-foreground/70 gba:mt-0.5 gba:italic">{opt.hint}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="gba:flex gba:justify-end gba:pt-2">
        <Button size="sm" onClick={onNext} data-testid={`${testId}-next`}>
          Next <ArrowRight className="gba:w-3.5 gba:h-3.5 gba:ml-1" />
        </Button>
      </div>
    </div>
  )
}
