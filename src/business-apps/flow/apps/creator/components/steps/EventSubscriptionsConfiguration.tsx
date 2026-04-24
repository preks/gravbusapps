import React, { useState, useEffect } from 'react'
import {
  Label,
  Button,
  Card,
  CardContent,
  CardHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Checkbox,
  Badge,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../_i18n'
import { Plus, Trash2, Zap, Bot, Code, Bell, ChevronDown, ChevronUp } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import {
  FunctionsServiceClient,
  type LatestFunctionItem,
  type FunctionVersionMeta
} from '@/common/network/functions/FunctionsServiceClient'
import type { PromptODM } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import {
  EventSubscription,
  EventHandlerType,
  TaskExpertHandlerConfig,
  FunctionHandlerConfig,
  NotifyHandlerConfig
} from '../../types/flowTemplate'

interface EventSubscriptionsConfigurationProps {
  subscriptions: EventSubscription[]
  onUpdate: (subscriptions: EventSubscription[]) => void
  stepIndex: number
  testId: string
  accessToken: string
  isFlowLevel?: boolean
}

const EVENT_TYPE_OPTIONS = [
  { value: 'task.created', label: 'Task Created' },
  { value: 'task.action.*', label: 'Any Action' },
  { value: 'task.action.claimed', label: 'Claim' },
  { value: 'task.action.unclaimed', label: 'Unclaim' },
  { value: 'task.action.reassigned', label: 'Reassign' },
  { value: 'task.action.completed', label: 'Complete' },
  { value: 'task.action.rejected', label: 'Reject' },
  { value: 'task.comment.created', label: 'Comment Created' }
]
const NO_OPTIONS_VALUE = '__no_options__'

const NOTIFY_CHANNEL_OPTIONS = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'PUSH', label: 'Push' },
  { value: 'WEB', label: 'Web' }
] as const

// (Filters removed for simplicity – selection is done via Event Type)

export const EventSubscriptionsConfiguration: React.FC<EventSubscriptionsConfigurationProps> = ({
  subscriptions,
  onUpdate,
  testId,
  accessToken,
  isFlowLevel = false
}) => {
  const { t } = useTranslation(translations)
  const promptClient = usePromptManagerClient(accessToken)
  const [agents, setAgents] = useState<PromptODM[]>([])
  const [functions, setFunctions] = useState<LatestFunctionItem[]>([])
  const [functionsError, setFunctionsError] = useState<string | null>(null)
  const [versionsByFunctionId, setVersionsByFunctionId] = useState<Record<string, FunctionVersionMeta[]>>({})
  const [versionsLoadingByFunctionId, setVersionsLoadingByFunctionId] = useState<Record<string, boolean>>({})
  const [expandedSubscriptions, setExpandedSubscriptions] = useState<Record<string, boolean>>({})

  // Load agents + workflow-enabled functions
  useEffect(() => {
    const loadData = async () => {
      try {
        const agentsRes = await promptClient.getPrompts({ limit: 100, offset: 0 })
        setAgents(agentsRes.data || [])
      } catch (error) {
        console.error('Failed to load agents:', error)
      }

      try {
        setFunctionsError(null)
        const client = new FunctionsServiceClient(accessToken)
        const fn = await client.listLatest({ workflowEnabled: true })
        setFunctions(fn || [])
      } catch (e) {
        setFunctions([])
        setFunctionsError(e instanceof Error ? e.message : 'Failed to load functions')
      }
    }
    if (accessToken) {
      loadData()
    }
  }, [accessToken, promptClient])

  // Load function versions for any selected function IDs
  useEffect(() => {
    const selectedFnIds = Array.from(
      new Set(
        (subscriptions || [])
          .filter(s => s.handler?.type === EventHandlerType.FUNCTION)
          .map(s => (s.handler as FunctionHandlerConfig)?.functionId)
          .filter((id): id is string => Boolean(id))
      )
    )

    const missing = selectedFnIds.filter(id => !versionsByFunctionId[id] && !versionsLoadingByFunctionId[id])
    if (missing.length === 0) return

    missing.forEach(async functionId => {
      try {
        setVersionsLoadingByFunctionId(prev => ({ ...prev, [functionId]: true }))
        const client = new FunctionsServiceClient(accessToken)
        const resp = await client.getVersions(functionId)
        const sorted = (resp.versions || []).slice().sort((a, b) => (b.version || 0) - (a.version || 0))
        setVersionsByFunctionId(prev => ({ ...prev, [functionId]: sorted }))
      } catch {
        setVersionsByFunctionId(prev => ({ ...prev, [functionId]: [] }))
      } finally {
        setVersionsLoadingByFunctionId(prev => ({ ...prev, [functionId]: false }))
      }
    })
  }, [accessToken, subscriptions, versionsByFunctionId, versionsLoadingByFunctionId])

  const addSubscription = () => {
    const newId = `sub_${Date.now()}`
    const newSubscription: EventSubscription = {
      id: newId,
      // Default to “all actions” to keep configuration simple.
      eventType: 'task.action.*',
      handler: {
        type: EventHandlerType.TASK_EXPERT,
        promptId: ''
      }
    }
    onUpdate([...subscriptions, newSubscription])
    setExpandedSubscriptions({ ...expandedSubscriptions, [newId]: true })
  }

  const removeSubscription = (id: string) => {
    onUpdate(subscriptions.filter(s => s.id !== id))
  }

  const updateSubscription = (id: string, updates: Partial<EventSubscription>) => {
    onUpdate(subscriptions.map(s => (s.id === id ? { ...s, ...updates } : s)))
  }

  const toggleExpanded = (id: string) => {
    setExpandedSubscriptions({
      ...expandedSubscriptions,
      [id]: !expandedSubscriptions[id]
    })
  }

  const getHandlerIcon = (type: EventHandlerType) => {
    switch (type) {
      case EventHandlerType.TASK_EXPERT:
        return <Bot className="gba:h-4 gba:w-4" />
      case EventHandlerType.FUNCTION:
        return <Code className="gba:h-4 gba:w-4" />
      case EventHandlerType.NOTIFY:
        return <Bell className="gba:h-4 gba:w-4" />
    }
  }

  const getHandlerName = (handler: EventSubscription['handler']) => {
    switch (handler.type) {
      case EventHandlerType.TASK_EXPERT:
        const agent = agents.find(a => a._id === (handler as TaskExpertHandlerConfig).promptId)
        return agent?.name || 'Select Agent'
      case EventHandlerType.FUNCTION:
        const fn = functions.find(f => f.id === (handler as FunctionHandlerConfig).functionId)
        return fn?.name || 'Select Function'
      case EventHandlerType.NOTIFY:
        const notify = handler as NotifyHandlerConfig
        const channels = (notify.channels && notify.channels.length > 0 ? notify.channels : undefined) || undefined
        if (!channels) return 'All channels'
        return channels.length === 1 ? channels[0] : 'All channels'
    }
  }

  const renderSubscriptionEditor = (subscription: EventSubscription) => {
    const isExpanded = expandedSubscriptions[subscription.id]

    return (
      <Card key={subscription.id} className="gba:mb-3" data-testid={`${testId}-subscription-${subscription.id}`}>
        <CardHeader className="gba:py-3 gba:cursor-pointer" onClick={() => toggleExpanded(subscription.id)}>
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-2">
              {getHandlerIcon(subscription.handler.type)}
              <span className="gba:font-medium">
                {EVENT_TYPE_OPTIONS.find(e => e.value === subscription.eventType)?.label || subscription.eventType}
              </span>
              <Badge variant="secondary">{getHandlerName(subscription.handler)}</Badge>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={e => {
                  e.stopPropagation()
                  removeSubscription(subscription.id)
                }}
                data-testid={`${testId}-remove-${subscription.id}`}
              >
                <Trash2 className="gba:h-4 gba:w-4" />
              </Button>
              {isExpanded ? <ChevronUp className="gba:h-4 gba:w-4" /> : <ChevronDown className="gba:h-4 gba:w-4" />}
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="gba:space-y-4 gba:pt-0">
            {/* Event Type */}
            <div className="gba:space-y-2">
              <Label>Event Type</Label>
              <Select
                value={subscription.eventType}
                onValueChange={value => updateSubscription(subscription.id, { eventType: value })}
              >
                <SelectTrigger data-testid={`${testId}-event-type-${subscription.id}`}>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Handler Type */}
            <div className="gba:space-y-2">
              <Label>Handler Type</Label>
              <Select
                value={subscription.handler.type}
                onValueChange={value => {
                  const newHandler =
                    value === EventHandlerType.TASK_EXPERT
                      ? { type: EventHandlerType.TASK_EXPERT as const, promptId: '' }
                      : value === EventHandlerType.FUNCTION
                        ? { type: EventHandlerType.FUNCTION as const, functionId: '' }
                        : { type: EventHandlerType.NOTIFY as const, channels: ['EMAIL', 'PUSH', 'WEB'] }
                  updateSubscription(subscription.id, { handler: newHandler })
                }}
              >
                <SelectTrigger data-testid={`${testId}-handler-type-${subscription.id}`}>
                  <SelectValue placeholder="Select handler type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EventHandlerType.TASK_EXPERT}>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Bot className="gba:h-4 gba:w-4" />
                      {t('event-handler-enterprise-agent')}
                    </div>
                  </SelectItem>
                  <SelectItem value={EventHandlerType.FUNCTION}>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Code className="gba:h-4 gba:w-4" />
                      Function
                    </div>
                  </SelectItem>
                  <SelectItem value={EventHandlerType.NOTIFY}>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Bell className="gba:h-4 gba:w-4" />
                      Notification
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Handler-specific configuration */}
            {renderHandlerConfig(subscription)}
          </CardContent>
        )}
      </Card>
    )
  }

  const renderHandlerConfig = (subscription: EventSubscription) => {
    const handler = subscription.handler

    switch (handler.type) {
      case EventHandlerType.TASK_EXPERT:
        return renderTaskExpertConfig(subscription, handler as TaskExpertHandlerConfig)
      case EventHandlerType.FUNCTION:
        return renderFunctionConfig(subscription, handler as FunctionHandlerConfig)
      case EventHandlerType.NOTIFY:
        return renderNotifyConfig(subscription, handler as NotifyHandlerConfig)
    }
  }

  const renderTaskExpertConfig = (subscription: EventSubscription, handler: TaskExpertHandlerConfig) => {
    const updateHandler = (updates: Partial<TaskExpertHandlerConfig>) => {
      updateSubscription(subscription.id, {
        handler: { ...handler, ...updates }
      })
    }

    return (
      <div className="gba:space-y-4">
        {/* Agent Selection */}
        <div className="gba:space-y-2">
          <Label>Agent</Label>
          <Select value={handler.promptId || ''} onValueChange={value => updateHandler({ promptId: value })}>
            <SelectTrigger data-testid={`${testId}-agent-${subscription.id}`}>
              <SelectValue placeholder="Select an agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.filter(agent => Boolean(agent._id)).length === 0 ? (
                <SelectItem value={NO_OPTIONS_VALUE} disabled>
                  No agents found
                </SelectItem>
              ) : (
                agents
                  .filter(agent => Boolean(agent._id))
                  .map(agent => (
                    <SelectItem key={agent._id} value={agent._id as string}>
                      {agent.name}
                    </SelectItem>
                  ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  const renderFunctionConfig = (subscription: EventSubscription, handler: FunctionHandlerConfig) => {
    const updateHandler = (updates: Partial<FunctionHandlerConfig>) => {
      updateSubscription(subscription.id, {
        handler: { ...handler, ...updates }
      })
    }

    const selectedFn = functions.find(f => f.id === handler.functionId)
    const versions = handler.functionId ? versionsByFunctionId[handler.functionId] || [] : []
    const isLoadingVersions = handler.functionId ? versionsLoadingByFunctionId[handler.functionId] === true : false
    const VERSION_LATEST = '__latest__'

    return (
      <div className="gba:space-y-4">
        <div className="gba:space-y-2">
          <Label>Function</Label>
          <Select
            value={handler.functionId || ''}
            onValueChange={value => updateHandler({ functionId: value, version: undefined })}
          >
            <SelectTrigger data-testid={`${testId}-function-${subscription.id}`}>
              <SelectValue placeholder="Select a function" />
            </SelectTrigger>
            <SelectContent>
              {functions.length === 0 ? (
                <SelectItem value={NO_OPTIONS_VALUE} disabled>
                  {functionsError ? 'Failed to load functions' : 'No functions found'}
                </SelectItem>
              ) : (
                functions.map(fn => (
                  <SelectItem key={fn.id} value={fn.id}>
                    {fn.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedFn?.description && <p className="gba:text-xs gba:text-muted-foreground">{selectedFn.description}</p>}
        </div>

        <div className="gba:space-y-2">
          <Label>Version</Label>
          <Select
            value={handler.version ? String(handler.version) : VERSION_LATEST}
            onValueChange={value => updateHandler({ version: value === VERSION_LATEST ? undefined : Number(value) })}
            disabled={!handler.functionId}
          >
            <SelectTrigger data-testid={`${testId}-function-version-${subscription.id}`}>
              <SelectValue placeholder={handler.functionId ? 'Select version' : 'Select function first'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={VERSION_LATEST}>Latest</SelectItem>
              {isLoadingVersions ? (
                <SelectItem value={NO_OPTIONS_VALUE} disabled>
                  Loading versions…
                </SelectItem>
              ) : (
                versions
                  .filter(v => typeof v.version === 'number')
                  .map(v => (
                    <SelectItem key={String(v.version)} value={String(v.version)}>
                      v{v.version}
                    </SelectItem>
                  ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  const renderNotifyConfig = (subscription: EventSubscription, handler: NotifyHandlerConfig) => {
    const updateHandler = (updates: Partial<NotifyHandlerConfig>) => {
      updateSubscription(subscription.id, {
        handler: { ...handler, ...updates }
      })
    }

    const selected = new Set(
      (handler.channels && handler.channels.length > 0 ? handler.channels : undefined) || ['EMAIL', 'PUSH', 'WEB']
    )

    return (
      <div className="gba:space-y-4">
        <div className="gba:space-y-2">
          <Label>Channels</Label>
          <div className="gba:flex gba:flex-wrap gba:gap-2">
            {NOTIFY_CHANNEL_OPTIONS.map(opt => {
              const isChecked = selected.has(opt.value)
              return (
                <div key={opt.value} className="gba:flex gba:items-center gba:gap-1">
                  <Checkbox
                    id={`${subscription.id}-notify-channel-${opt.value}`}
                    checked={isChecked}
                    onCheckedChange={checked => {
                      const next = new Set(selected)
                      if (checked) next.add(opt.value)
                      else next.delete(opt.value)
                      const arr = Array.from(next)
                      updateHandler({ channels: arr.length > 0 ? arr : undefined })
                    }}
                  />
                  <Label htmlFor={`${subscription.id}-notify-channel-${opt.value}`} className="gba:text-xs">
                    {opt.label}
                  </Label>
                </div>
              )
            })}
          </div>
          <p className="gba:text-xs gba:text-muted-foreground">
            Defaults to all channels. Deselect channels only if you want to restrict delivery.
          </p>
        </div>

        <div className="gba:space-y-2">
          <Label>Template ID (optional)</Label>
          <Input
            value={handler.templateId || ''}
            onChange={e => updateHandler({ templateId: e.target.value })}
            placeholder="Notification template ID"
            data-testid={`${testId}-template-${subscription.id}`}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid={`${testId}-event-subscriptions`}>
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Zap className="gba:h-5 gba:w-5" />
          <Label className="gba:text-base gba:font-semibold">
            {getTranslationFromI18nKeyAndLabel(
              isFlowLevel ? 'flow.creator.flowEventSubscriptions' : 'flow.creator.eventSubscriptions',
              isFlowLevel ? 'Flow Event Subscriptions' : 'Event Subscriptions'
            )}
          </Label>
        </div>
        <Button variant="outline" size="sm" onClick={addSubscription} data-testid={`${testId}-add-subscription`}>
          <Plus className="gba:h-4 gba:w-4 gba:mr-1" />
          Add Subscription
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <Card className="gba:bg-muted">
          <CardContent className="gba:py-6 gba:text-center">
            <Zap className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:text-muted-foreground" />
            <p className="gba:text-sm gba:text-muted-foreground">
              No event subscriptions configured. Add one to enable reactive automation.
            </p>
          </CardContent>
        </Card>
      ) : (
        subscriptions.map(subscription => renderSubscriptionEditor(subscription))
      )}
    </div>
  )
}
