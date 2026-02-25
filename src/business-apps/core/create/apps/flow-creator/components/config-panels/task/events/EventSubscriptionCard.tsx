import React from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch
} from '@newwork/nw-design-system'
import { Bell, Bot, ChevronDown, ChevronUp, Code, Trash2 } from 'lucide-react'
import type { FlowStudioData } from '../../../../hooks/useFlowStudioData'
import {
  EventHandlerType,
  type EventHandlerConfig,
  type EventSubscription
} from '@/business-apps/flow/apps/creator/types/flowTemplate'
import { EVENT_TYPE_OPTIONS } from './eventConstants'
import { AgentHandlerSection } from './AgentHandlerSection'
import { FunctionHandlerSection } from './FunctionHandlerSection'
import { NotifyHandlerSection } from './NotifyHandlerSection'
import { NEUTRAL_SWITCH_CLASSNAME } from '../../../../utils/neutralSwitchClassName'

interface EventSubscriptionCardProps {
  subscription: EventSubscription
  open: boolean
  studioData: FlowStudioData
  onToggleOpen: () => void
  onUpdate: (next: EventSubscription) => void
  onRemove: () => void
  testId: string
}

function handlerIcon(type: EventHandlerType) {
  switch (type) {
    case EventHandlerType.TASK_EXPERT:
      return <Bot className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
    case EventHandlerType.FUNCTION:
      return <Code className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
    case EventHandlerType.NOTIFY:
      return <Bell className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
  }
}

function handlerSummary(handler: EventHandlerConfig, studioData: FlowStudioData): string {
  switch (handler.type) {
    case EventHandlerType.TASK_EXPERT: {
      const agent = studioData.agents.find(a => a._id === handler.promptId)
      return agent?.name ?? 'Select agent'
    }
    case EventHandlerType.FUNCTION: {
      const fn = studioData.functions.find(f => f.id === handler.functionId)
      return fn?.name ?? 'Select function'
    }
    case EventHandlerType.NOTIFY: {
      const channels = handler.channels && handler.channels.length > 0 ? handler.channels : undefined
      if (!channels) return 'All channels'
      return channels.length === 1 ? channels[0] : `${channels.length} channels`
    }
  }
}

function createDefaultHandler(type: EventHandlerType): EventHandlerConfig {
  if (type === EventHandlerType.TASK_EXPERT) return { type: EventHandlerType.TASK_EXPERT, promptId: '' }
  if (type === EventHandlerType.FUNCTION) return { type: EventHandlerType.FUNCTION, functionId: '' }
  return { type: EventHandlerType.NOTIFY, channels: ['EMAIL', 'PUSH', 'WEB'] }
}

export const EventSubscriptionCard: React.FC<EventSubscriptionCardProps> = ({
  subscription,
  open,
  studioData,
  onToggleOpen,
  onUpdate,
  onRemove,
  testId
}) => {
  const enabled = subscription.enabled !== false
  const eventLabel =
    EVENT_TYPE_OPTIONS.find(o => String(o.value) === String(subscription.eventType))?.label ??
    String(subscription.eventType)

  const handlerTypeOptions = [
    { value: EventHandlerType.TASK_EXPERT, label: 'AI agent' },
    { value: EventHandlerType.FUNCTION, label: 'Function' },
    { value: EventHandlerType.NOTIFY, label: 'Notification' }
  ] as const

  const updateHandler = (next: EventHandlerConfig) => onUpdate({ ...subscription, handler: next })

  return (
    <Card data-testid={`${testId}-events-subscription-${subscription.id}`}>
      <CardHeader className="gba:py-3 gba:cursor-pointer" onClick={onToggleOpen}>
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
          <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
            <div className="gba:flex gba:items-center gba:justify-center gba:w-7 gba:h-7 gba:rounded-md gba:bg-muted gba:flex-shrink-0">
              {handlerIcon(subscription.handler.type)}
            </div>
            <div className="gba:flex gba:flex-col gba:min-w-0">
              <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:truncate">{eventLabel}</span>
              <span className="gba:text-[10px] gba:text-muted-foreground gba:truncate">
                {handlerSummary(subscription.handler, studioData)}
              </span>
            </div>
            {!enabled && <Badge variant="secondary">Disabled</Badge>}
          </div>

          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                onRemove()
              }}
              data-testid={`${testId}-events-remove-${subscription.id}`}
            >
              <Trash2 className="gba:h-4 gba:w-4" />
            </Button>
            {open ? <ChevronUp className="gba:h-4 gba:w-4" /> : <ChevronDown className="gba:h-4 gba:w-4" />}
          </div>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="gba:flex gba:flex-col gba:gap-4 gba:pt-0">
          <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
            <div className="gba:flex gba:flex-col gba:gap-1.5 gba:flex-1">
              <Label className="gba:text-xs gba:font-semibold gba:text-foreground">Description</Label>
              <Input
                value={subscription.description ?? ''}
                onChange={e => onUpdate({ ...subscription, description: e.target.value })}
                placeholder="Optional note (e.g. Notify stakeholders)"
                data-testid={`${testId}-events-description-${subscription.id}`}
              />
            </div>

            <div className="gba:flex gba:flex-col gba:gap-1.5">
              <Label className="gba:text-xs gba:font-semibold gba:text-foreground">Enabled</Label>
              <div className="gba:flex gba:items-center gba:gap-2">
                <Switch
                  checked={enabled}
                  onCheckedChange={checked => onUpdate({ ...subscription, enabled: Boolean(checked) })}
                  className={NEUTRAL_SWITCH_CLASSNAME}
                  data-testid={`${testId}-events-enabled-${subscription.id}`}
                />
                <span className="gba:text-xs gba:text-muted-foreground">{enabled ? 'On' : 'Off'}</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="gba:grid gba:grid-cols-2 gba:gap-3">
            <div className="gba:flex gba:flex-col gba:gap-1.5">
              <Label className="gba:text-xs gba:font-semibold gba:text-foreground">Event</Label>
              <Select
                value={String(subscription.eventType)}
                onValueChange={value => onUpdate({ ...subscription, eventType: value })}
              >
                <SelectTrigger data-testid={`${testId}-events-event-${subscription.id}`}>
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={String(opt.value)} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="gba:flex gba:flex-col gba:gap-1.5">
              <Label className="gba:text-xs gba:font-semibold gba:text-foreground">Handler</Label>
              <Select
                value={subscription.handler.type}
                onValueChange={value => updateHandler(createDefaultHandler(value as EventHandlerType))}
              >
                <SelectTrigger data-testid={`${testId}-events-handler-${subscription.id}`}>
                  <SelectValue placeholder="Select handler" />
                </SelectTrigger>
                <SelectContent>
                  {handlerTypeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {subscription.handler.type === EventHandlerType.TASK_EXPERT && (
            <AgentHandlerSection
              handler={subscription.handler}
              studioData={studioData}
              onChange={next => updateHandler(next)}
              testId={testId}
              subscriptionId={subscription.id}
            />
          )}

          {subscription.handler.type === EventHandlerType.FUNCTION && (
            <FunctionHandlerSection
              handler={subscription.handler}
              studioData={studioData}
              onChange={next => updateHandler(next)}
              testId={testId}
              subscriptionId={subscription.id}
            />
          )}

          {subscription.handler.type === EventHandlerType.NOTIFY && (
            <NotifyHandlerSection
              handler={subscription.handler}
              onChange={next => updateHandler(next)}
              testId={testId}
              subscriptionId={subscription.id}
            />
          )}
        </CardContent>
      )}
    </Card>
  )
}
