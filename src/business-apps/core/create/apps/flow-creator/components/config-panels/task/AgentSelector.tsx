import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import { Bot, Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import translations from '../../../_i18n'
import type { TaskNodeConfig } from '../../../types/studioTypes'
import type { FlowStudioData } from '../../../hooks/useFlowStudioData'
import { useStudioExpressionSuggestions } from '../../../hooks/useStudioExpressionSuggestions'

interface AgentSelectorProps {
  config: TaskNodeConfig
  update: (partial: Partial<TaskNodeConfig>) => void
  studioData: FlowStudioData
  testId: string
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({ config, update, studioData, testId }) => {
  const { t } = useTranslation(translations)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { agents, agentsLoading } = studioData
  const suggestions = useStudioExpressionSuggestions()
  const stepValueSuggestions = useMemo(
    () => suggestions.filter(s => s.source === 'steps' || s.source === 'trigger'),
    [suggestions]
  )

  const [paramsLoading, setParamsLoading] = useState(false)
  const [params, setParams] = useState<{ system: string[]; user: string[] }>({ system: [], user: [] })

  const filtered = search ? agents.filter(a => (a.name ?? '').toLowerCase().includes(search.toLowerCase())) : agents

  const selectedAgent = agents.find(a => a._id === config.agentConfig?.promptId)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!selectedAgent?._id) {
        setParams({ system: [], user: [] })
        return
      }
      setParamsLoading(true)
      try {
        const next = await studioData.loadAgentParameters(selectedAgent._id)
        if (!cancelled) setParams(next)
      } finally {
        if (!cancelled) setParamsLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [selectedAgent?._id, studioData])

  // Auto-initialize parameter maps when new parameters appear
  useEffect(() => {
    if (!selectedAgent?._id) return
    const current = config.agentConfig ?? { promptId: selectedAgent._id, promptName: selectedAgent.name }
    const systemMap = { ...current.systemParamsMap }
    const userMap = { ...current.userParamsMap }

    let changed = false
    for (const p of params.system) {
      if (!(p in systemMap)) {
        systemMap[p] = ''
        changed = true
      }
    }
    for (const p of params.user) {
      if (!(p in userMap)) {
        userMap[p] = ''
        changed = true
      }
    }
    if (changed) {
      update({
        agentConfig: {
          ...current,
          systemParamsMap: systemMap,
          userParamsMap: userMap
        }
      })
    }
  }, [config.agentConfig, params.system, params.user, selectedAgent?._id, selectedAgent?.name, update])

  const updateParam = (type: 'system' | 'user', name: string, expression: string) => {
    const current = config.agentConfig ?? { promptId: selectedAgent?._id ?? '', promptName: selectedAgent?.name }
    const mapKey = type === 'system' ? 'systemParamsMap' : 'userParamsMap'
    const nextMap = { ...current?.[mapKey] }
    nextMap[name] = expression
    update({
      agentConfig: {
        ...current,
        [mapKey]: nextMap
      }
    })
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-muted">
      <Label className="gba:text-xs gba:font-semibold gba:text-foreground">
        <Bot className="gba:h-3.5 gba:w-3.5 gba:inline gba:mr-1" />
        {t('task-type-ai_task_expert')}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="gba:w-full gba:justify-between gba:h-9 gba:text-xs gba:font-normal gba:bg-background"
            data-testid={`${testId}-agent-select`}
          >
            {selectedAgent ? (
              <span className="gba:flex gba:items-center gba:gap-1.5 gba:text-foreground gba:truncate">
                <Bot className="gba:h-3.5 gba:w-3.5 gba:text-primary gba:flex-shrink-0" />
                {selectedAgent.name}
              </span>
            ) : (
              <span className="gba:text-muted-foreground">
                {agentsLoading ? 'Loading agents...' : 'Select an agent...'}
              </span>
            )}
            <ChevronsUpDown className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="gba:w-[--radix-popover-trigger-width] gba:p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search agents..." value={search} onValueChange={setSearch} />
            <CommandList>
              {agentsLoading ? (
                <div className="gba:flex gba:items-center gba:justify-center gba:py-6 gba:text-xs gba:text-muted-foreground gba:gap-2">
                  <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin" />
                  Loading agents...
                </div>
              ) : (
                <>
                  <CommandEmpty>No agents found.</CommandEmpty>
                  <CommandGroup>
                    {filtered.map(agent => (
                      <CommandItem
                        key={agent._id}
                        value={agent._id ?? ''}
                        onSelect={() => {
                          update({
                            agentConfig: {
                              ...config.agentConfig,
                              promptId: agent._id ?? '',
                              promptName: agent.name
                            }
                          })
                          setOpen(false)
                        }}
                      >
                        <Bot className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-muted-foreground" />
                        <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0">
                          <span className="gba:truncate gba:text-foreground">{agent.name}</span>
                          {agent.description && (
                            <span className="gba:text-[10px] gba:text-muted-foreground gba:truncate">
                              {agent.description}
                            </span>
                          )}
                        </div>
                        {config.agentConfig?.promptId === agent._id && (
                          <Check className="gba:h-3.5 gba:w-3.5 gba:text-primary gba:flex-shrink-0" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedAgent?.description && (
        <p className="gba:text-[10px] gba:text-muted-foreground">{selectedAgent.description}</p>
      )}

      <div className="gba:flex gba:flex-col gba:gap-2 gba:pt-1" data-testid={`${testId}-ai-task-expert-params`}>
        <div className="gba:text-[11px] gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider">
          {t('task-input-params')}
        </div>

        {(() => {
          const hasNoParams = params.system.length === 0 && params.user.length === 0
          if (paramsLoading) {
            return (
              <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
                <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin" />
                {t('task-input-params-loading')}
              </div>
            )
          }
          if (hasNoParams) {
            return <div className="gba:text-xs gba:text-muted-foreground">{t('task-input-params-empty')}</div>
          }
          return (
            <div className="gba:flex gba:flex-col gba:gap-3">
              {(
                [
                  { id: 'system' as const, label: t('task-input-params-system'), params: params.system },
                  { id: 'user' as const, label: t('task-input-params-user'), params: params.user }
                ] as const
              )
                .filter(group => group.params.length > 0)
                .map(group => (
                  <div key={group.id} className="gba:flex gba:flex-col gba:gap-2">
                    <div className="gba:text-[10px] gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider">
                      {group.label}
                    </div>
                    {group.params.map((paramName, idx) => {
                      const currentExpr =
                        group.id === 'system'
                          ? (config.agentConfig?.systemParamsMap?.[paramName] ?? '')
                          : (config.agentConfig?.userParamsMap?.[paramName] ?? '')

                      const selected = stepValueSuggestions.find(s => `{{${s.expression}}}` === currentExpr)
                      const displayLabel = selected?.label ?? currentExpr ?? t('task-input-params-pick')

                      return (
                        <div
                          key={`${group.id}-${paramName}`}
                          className="gba:grid gba:grid-cols-5 gba:gap-2 gba:items-start"
                          data-testid={`${testId}-ai-task-expert-param-${group.id}-${idx}`}
                        >
                          <Label className="gba:col-span-2 gba:text-xs gba:font-mono gba:pt-2">{paramName}</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="gba:col-span-3 gba:justify-between gba:h-9 gba:text-xs gba:bg-background"
                                data-testid={`${testId}-ai-task-expert-param-pick-${group.id}-${idx}`}
                              >
                                <span className="gba:truncate">{displayLabel}</span>
                                <ChevronsUpDown className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="gba:p-0" align="start">
                              <Command>
                                <CommandInput placeholder={t('logic-field-search')} />
                                <CommandEmpty>{t('logic-field-empty')}</CommandEmpty>
                                <CommandList>
                                  <CommandGroup heading={t('logic-field-group-steps')}>
                                    {stepValueSuggestions.map(item => {
                                      const handleSuggestionSelect = () =>
                                        updateParam(group.id, paramName, `{{${item.expression}}}`)
                                      return (
                                        <CommandItem
                                          key={item.id}
                                          onSelect={handleSuggestionSelect}
                                          value={`${item.label} ${item.expression}`}
                                        >
                                          <span className="gba:flex gba:flex-col gba:min-w-0">
                                            <span className="gba:text-xs gba:font-medium gba:truncate">
                                              {item.label}
                                            </span>
                                            <span className="gba:text-[10px] gba:text-muted-foreground gba:truncate">
                                              {item.expression}
                                            </span>
                                          </span>
                                        </CommandItem>
                                      )
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      )
                    })}
                  </div>
                ))}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
