import React, { useCallback, useState } from 'react'
import { Button, Label } from '@newwork/nw-design-system'
import { Plus, Zap } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import type { TaskNodeConfig } from '../../../types/studioTypes'
import type { FlowStudioData } from '../../../hooks/useFlowStudioData'
import { EventHandlerType, type EventSubscription } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import { EventSubscriptionCard } from './events/EventSubscriptionCard'

interface TaskEventsTabProps {
  config: TaskNodeConfig
  studioData: FlowStudioData
  update: (partial: Partial<TaskNodeConfig>) => void
  title: string
  testId: string
}

export const TaskEventsTab: React.FC<TaskEventsTabProps> = ({ config, studioData, update, title, testId }) => {
  const subscriptions = config.eventSubscriptions ?? []
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const setSubscriptions = useCallback((next: EventSubscription[]) => update({ eventSubscriptions: next }), [update])

  const addSubscription = useCallback(() => {
    const id = uuid()
    const next: EventSubscription = {
      id,
      enabled: true,
      eventType: 'task.action.*',
      description: '',
      handler: { type: EventHandlerType.TASK_EXPERT, promptId: '' }
    }
    setSubscriptions([...subscriptions, next])
    setExpanded(prev => ({ ...prev, [id]: true }))
  }, [setSubscriptions, subscriptions])

  const removeSubscription = useCallback(
    (id: string) => setSubscriptions(subscriptions.filter(s => s.id !== id)),
    [setSubscriptions, subscriptions]
  )

  const replaceSubscription = useCallback(
    (id: string, next: EventSubscription) => setSubscriptions(subscriptions.map(s => (s.id === id ? next : s))),
    [setSubscriptions, subscriptions]
  )

  const toggleExpanded = useCallback((id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid={`${testId}-events`}>
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Zap className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
          <Label className="gba:text-xs gba:font-semibold gba:text-foreground">{title}</Label>
        </div>

        <Button variant="outline" size="sm" onClick={addSubscription} data-testid={`${testId}-events-add`}>
          <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
          Add automation
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <div
          className="gba:p-6 gba:border gba:border-dashed gba:border-border gba:rounded-lg gba:bg-muted gba:text-center gba:text-xs gba:text-muted-foreground"
          data-testid={`${testId}-events-empty`}
        >
          No automations yet. Add one to run something when an event happens on this task.
        </div>
      ) : (
        <div className="gba:flex gba:flex-col gba:gap-3">
          {subscriptions.map(sub => (
            <EventSubscriptionCard
              key={sub.id}
              subscription={sub}
              open={expanded[sub.id] ?? false}
              studioData={studioData}
              onToggleOpen={() => toggleExpanded(sub.id)}
              onUpdate={next => replaceSubscription(sub.id, next)}
              onRemove={() => removeSubscription(sub.id)}
              testId={testId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
