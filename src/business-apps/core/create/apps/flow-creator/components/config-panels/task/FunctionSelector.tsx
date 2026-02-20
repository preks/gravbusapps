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
  PopoverTrigger
} from '@newwork/nw-design-system'
import { Check, ChevronsUpDown, Code2, Loader2 } from 'lucide-react'
import type { TaskNodeConfig } from '../../../types/studioTypes'
import type { FlowStudioData } from '../../../hooks/useFlowStudioData'
import { useStudioExpressionSuggestions } from '../../../hooks/useStudioExpressionSuggestions'
import { FlowStepType } from '@/business-apps/flow/apps/creator/types/flowTemplate'

interface FunctionSelectorProps {
  config: TaskNodeConfig
  update: (partial: Partial<TaskNodeConfig>) => void
  studioData: FlowStudioData
  testId: string
}

export const FunctionSelector: React.FC<FunctionSelectorProps> = ({ config, update, studioData, testId }) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { functions, functionsLoading } = studioData
  const suggestions = useStudioExpressionSuggestions()
  const stepValueSuggestions = useMemo(
    () => suggestions.filter(s => s.source === 'steps' || s.source === 'trigger'),
    [suggestions]
  )

  const [versionsLoading, setVersionsLoading] = useState(false)
  const [versions, setVersions] = useState<Array<{ version?: number; inputSchema?: any }>>([])

  const filtered = search
    ? functions.filter(f => (f.name ?? '').toLowerCase().includes(search.toLowerCase()))
    : functions

  const selectedFunction = functions.find(f => f.id === config.functionConfig?.functionId)
  const selectedVersion = config.functionConfig?.version

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const fnId = config.functionConfig?.functionId
      if (!fnId) {
        setVersions([])
        return
      }
      setVersionsLoading(true)
      try {
        const res = await studioData.loadFunctionVersions(fnId)
        if (!cancelled) setVersions(res as any)
      } finally {
        if (!cancelled) setVersionsLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [config.functionConfig?.functionId, studioData])

  const effectiveInputSchema = useMemo(() => {
    if (!selectedFunction) return null
    const ver = selectedVersion
    if (ver && versions.length > 0) {
      const v = versions.find((x: any) => x.version === ver)
      if (v?.inputSchema) return v.inputSchema as any
    }
    return (selectedFunction as any).latestVersion?.inputSchema ?? null
  }, [selectedFunction, selectedVersion, versions])

  const inputParams = useMemo(() => {
    const schema: any = effectiveInputSchema
    const props = schema?.type === 'object' ? schema?.properties : undefined
    if (!props || typeof props !== 'object') return []
    return Object.keys(props)
  }, [effectiveInputSchema])

  // auto-init mapping keys
  useEffect(() => {
    if (config.stepType !== FlowStepType.FUNCTION) return
    if (inputParams.length === 0) return
    const current = config.functionConfig ?? { functionId: '', functionName: undefined }
    const map = { ...(current.inputExpressionMap ?? {}) }
    let changed = false
    for (const p of inputParams) {
      if (!(p in map)) {
        map[p] = ''
        changed = true
      }
    }
    if (changed) {
      update({
        functionConfig: {
          ...current,
          inputExpressionMap: map
        }
      })
    }
  }, [config.functionConfig, config.stepType, inputParams, update])

  const updateParam = (name: string, expression: string) => {
    const current = config.functionConfig ?? { functionId: '', functionName: undefined }
    const nextMap = { ...(current.inputExpressionMap ?? {}) }
    nextMap[name] = expression
    update({
      functionConfig: {
        ...current,
        inputExpressionMap: nextMap
      }
    })
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-muted">
      <Label className="gba:text-xs gba:font-semibold gba:text-foreground">
        <Code2 className="gba:h-3.5 gba:w-3.5 gba:inline gba:mr-1" />
        Function
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="gba:w-full gba:justify-between gba:h-9 gba:text-xs gba:font-normal gba:bg-background"
            data-testid={`${testId}-function-select`}
          >
            {selectedFunction ? (
              <span className="gba:flex gba:items-center gba:gap-1.5 gba:text-foreground gba:truncate">
                <Code2 className="gba:h-3.5 gba:w-3.5 gba:text-primary gba:flex-shrink-0" />
                {selectedFunction.name}
              </span>
            ) : (
              <span className="gba:text-muted-foreground">
                {functionsLoading ? 'Loading functions...' : 'Select a function...'}
              </span>
            )}
            <ChevronsUpDown className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="gba:w-[--radix-popover-trigger-width] gba:p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search functions..." value={search} onValueChange={setSearch} />
            <CommandList>
              {functionsLoading ? (
                <div className="gba:flex gba:items-center gba:justify-center gba:py-6 gba:text-xs gba:text-muted-foreground gba:gap-2">
                  <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin" />
                  Loading functions...
                </div>
              ) : (
                <>
                  <CommandEmpty>No workflow-enabled functions found.</CommandEmpty>
                  <CommandGroup>
                    {filtered.map(fn => (
                      <CommandItem
                        key={fn.id}
                        value={fn.id}
                        onSelect={() => {
                          update({
                            functionConfig: {
                              ...config.functionConfig,
                              functionId: fn.id,
                              functionName: fn.name,
                              version: undefined
                            }
                          })
                          setOpen(false)
                        }}
                      >
                        <Code2 className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-muted-foreground" />
                        <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0">
                          <span className="gba:truncate gba:text-foreground">{fn.name}</span>
                          {fn.description && (
                            <span className="gba:text-[10px] gba:text-muted-foreground gba:truncate">
                              {fn.description}
                            </span>
                          )}
                        </div>
                        {config.functionConfig?.functionId === fn.id && (
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
      {selectedFunction?.description && (
        <p className="gba:text-[10px] gba:text-muted-foreground">{selectedFunction.description}</p>
      )}

      {selectedFunction && (
        <div className="gba:flex gba:flex-col gba:gap-2 gba:pt-1" data-testid={`${testId}-function-params`}>
          <div className="gba:text-[11px] gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider">
            Input parameters
          </div>

          {versionsLoading ? (
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
              <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin" />
              Loading function schema...
            </div>
          ) : inputParams.length === 0 ? (
            <div className="gba:text-xs gba:text-muted-foreground">No parameters found.</div>
          ) : (
            <div className="gba:flex gba:flex-col gba:gap-2">
              {inputParams.map((paramName, idx) => {
                const currentExpr = config.functionConfig?.inputExpressionMap?.[paramName] ?? ''
                const selected = stepValueSuggestions.find(s => `{{${s.expression}}}` === currentExpr)
                return (
                  <div
                    key={paramName}
                    className="gba:grid gba:grid-cols-5 gba:gap-2 gba:items-start"
                    data-testid={`${testId}-function-param-${idx}`}
                  >
                    <Label className="gba:col-span-2 gba:text-xs gba:font-mono gba:pt-2">{paramName}</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="gba:col-span-3 gba:justify-between gba:h-9 gba:text-xs gba:bg-background"
                          data-testid={`${testId}-function-param-pick-${idx}`}
                        >
                          <span className="gba:truncate">
                            {selected ? selected.label : currentExpr ? currentExpr : 'Select value'}
                          </span>
                          <ChevronsUpDown className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="gba:p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search step data..." />
                          <CommandEmpty>No matching values</CommandEmpty>
                          <CommandList>
                            <CommandGroup heading="Step data">
                              {stepValueSuggestions.map(item => (
                                <CommandItem
                                  key={item.id}
                                  onSelect={() => updateParam(paramName, `{{${item.expression}}}`)}
                                  value={`${item.label} ${item.expression}`}
                                >
                                  <span className="gba:flex gba:flex-col gba:min-w-0">
                                    <span className="gba:text-xs gba:font-medium gba:truncate">{item.label}</span>
                                    <span className="gba:text-[10px] gba:text-muted-foreground gba:truncate">
                                      {item.expression}
                                    </span>
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
