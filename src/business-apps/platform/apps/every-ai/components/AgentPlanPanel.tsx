import { Badge, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { CaretDown, CaretRight, CheckCircle, Circle, ListChecks, SpinnerGap, XCircle } from '@phosphor-icons/react'
import React, { useMemo, useState } from 'react'

import type { AgentPlanItem, AgentPlanItemStatus } from '../types/models'

const STATUS_COPY: Record<AgentPlanItemStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled'
}

interface StatusIconProps {
  status: AgentPlanItemStatus
}

function StatusIcon({ status }: StatusIconProps) {
  const className = 'gba:h-4 gba:w-4 gba:shrink-0'

  if (status === 'in_progress') {
    return (
      <SpinnerGap
        className={`${className} gba:animate-spin gba:text-primary`}
        weight="bold"
        aria-label={STATUS_COPY[status]}
      />
    )
  }

  if (status === 'completed') {
    return <CheckCircle className={`${className} gba:text-success`} weight="fill" aria-label={STATUS_COPY[status]} />
  }

  if (status === 'cancelled') {
    return (
      <XCircle className={`${className} gba:text-muted-foreground`} weight="fill" aria-label={STATUS_COPY[status]} />
    )
  }

  return <Circle className={`${className} gba:text-muted-foreground`} aria-label={STATUS_COPY[status]} />
}

export interface AgentPlanPanelProps {
  planId: string
  items: AgentPlanItem[]
  defaultExpanded?: boolean
}

export function AgentPlanPanel({ planId, items, defaultExpanded = true }: AgentPlanPanelProps) {
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded)

  const stats = useMemo(() => {
    const total = items.length
    const completed = items.filter(item => item.status === 'completed').length
    const inProgress = items.filter(item => item.status === 'in_progress').length
    return { total, completed, inProgress }
  }, [items])

  if (items.length === 0) {
    return null
  }

  const toggleExpanded = () => setExpanded(prev => !prev)

  return (
    <Card className="gba:border-primary/20 gba:bg-card" data-testid="agent-plan-panel" data-plan-id={planId}>
      <CardHeader
        className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:gap-2 gba:cursor-pointer gba:select-none"
        onClick={toggleExpanded}
        role="button"
        tabIndex={0}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            toggleExpanded()
          }
        }}
        aria-expanded={expanded}
      >
        <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
          <ListChecks className="gba:h-4 gba:w-4 gba:text-primary" weight="bold" />
          <span>Plan</span>
          <Badge variant="secondary" data-testid="agent-plan-progress">
            {stats.completed} / {stats.total}
          </Badge>
          {stats.inProgress > 0 ? (
            <Badge variant="outline" data-testid="agent-plan-active">
              {stats.inProgress} active
            </Badge>
          ) : null}
        </CardTitle>
        {expanded ? (
          <CaretDown className="gba:h-4 gba:w-4 gba:text-muted-foreground" aria-label="Collapse plan" />
        ) : (
          <CaretRight className="gba:h-4 gba:w-4 gba:text-muted-foreground" aria-label="Expand plan" />
        )}
      </CardHeader>

      {expanded ? (
        <CardContent className="gba:pt-0">
          <ul className="gba:flex gba:flex-col gba:gap-2" data-testid="agent-plan-items">
            {items.map(item => (
              <li
                key={item.id}
                className="gba:flex gba:items-start gba:gap-2 gba:text-sm"
                data-testid="agent-plan-item"
                data-status={item.status}
                aria-label={`${item.content} (${STATUS_COPY[item.status]})`}
              >
                <StatusIcon status={item.status} />
                <span
                  className={
                    item.status === 'completed' ? 'gba:line-through gba:text-muted-foreground' : 'gba:text-foreground'
                  }
                >
                  {item.content}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      ) : null}
    </Card>
  )
}
