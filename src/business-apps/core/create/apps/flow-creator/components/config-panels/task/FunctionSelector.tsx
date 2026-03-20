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
import { Check, ChevronsUpDown, Code2, Loader2 } from 'lucide-react'
import translations from '../../../_i18n'
import type { TaskNodeConfig } from '../../../types/studioTypes'
import type { FlowStudioData } from '../../../hooks/useFlowStudioData'
import { useStudioExpressionSuggestions } from '../../../hooks/useStudioExpressionSuggestions'
import { FlowStepType } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import type { ExpressionSuggestionItem } from '@/common/components/flow/expression-editor'
import type { FunctionVersionMeta } from '@/common/network/functions/FunctionsServiceClient'
import { AutomationVersionSelect } from './AutomationVersionSelect'

interface FunctionParamRowProps {
  paramName: string
  currentExpr: string
  stepValueSuggestions: ExpressionSuggestionItem[]
  updateParam: (name: string, expression: string) => void
  testId: string
  idx: number
  pickLabel: string
  searchLabel: string
  emptyLabel: string
  suggestionsGroupLabel: string
}

const FunctionParamRow: React.FC<FunctionParamRowProps> = ({
  paramName,
  currentExpr,
  stepValueSuggestions,
  updateParam,
  testId,
  idx,
  pickLabel,
  searchLabel,
  emptyLabel,
  suggestionsGroupLabel
}) => {
  const selected = stepValueSuggestions.find(s => `{{${s.expression}}}` === currentExpr)
  const displayValue = selected?.label ?? currentExpr ?? pickLabel

  return (
    <div className="gba:grid gba:grid-cols-5 gba:gap-2 gba:items-start" data-testid={`${testId}-function-param-${idx}`}>
      <Label className="gba:col-span-2 gba:text-xs gba:font-mono gba:pt-2">{paramName}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="gba:col-span-3 gba:justify-between gba:h-9 gba:text-xs gba:bg-background"
            data-testid={`${testId}-function-param-pick-${idx}`}
          >
            <span className="gba:truncate">{displayValue}</span>
            <ChevronsUpDown className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="gba:p-0" align="start">
          <Command>
            <CommandInput placeholder={searchLabel} />
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandList>
              <CommandGroup heading={suggestionsGroupLabel}>
                {stepValueSuggestions.map(item => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => updateParam(paramName, `{{${item.expression}}}`)}
                    value={`${item.label} ${item.expression}`}
                  >
                    <span className="gba:flex gba:flex-col gba:min-w-0">
                      <span className="gba:text-xs gba:font-medium gba:truncate">{item.label}</span>
                      <span className="gba:text-[10px] gba:text-muted-foreground gba:truncate">{item.expression}</span>
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
}

interface FunctionSelectorProps {
  config: TaskNodeConfig
  update: (partial: Partial<TaskNodeConfig>) => void
  studioData: FlowStudioData
  testId: string
}

export const FunctionSelector: React.FC<FunctionSelectorProps> = ({ config, update, studioData, testId }) => {
  const { t } = useTranslation(translations)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { functions, functionsLoading } = studioData
  const suggestions = useStudioExpressionSuggestions()
  const stepValueSuggestions = useMemo(
    () =>
      suggestions.filter(
        s => s.source === 'steps' || s.source === 'trigger' || s.source === 'workflow' || s.source === 'orgchart'
      ),
    [suggestions]
  )

  const [versionsLoading, setVersionsLoading] = useState(false)
  const [versions, setVersions] = useState<FunctionVersionMeta[]>([])

  const filtered = search
    ? functions.filter(f => (f.name ?? '').toLowerCase().includes(search.toLowerCase()))
    : functions

  const selectedFunction = functions.find(f => f.id === config.functionConfig?.functionId)
  const selectedVersion = config.functionConfig?.version

  useEffect(() => {
    if (config.stepType !== FlowStepType.FUNCTION) return
    if (!selectedFunction) return
    if (typeof config.functionConfig?.version === 'number') return

    update({
      functionConfig: {
        ...config.functionConfig,
        functionId: selectedFunction.id,
        functionName: selectedFunction.name,
        version: selectedFunction.latestVersion?.version,
        outputSchema: selectedFunction.latestVersion?.outputSchema
      }
    })
  }, [config.functionConfig, config.stepType, selectedFunction, update])

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
      if (v?.inputSchema) return v.inputSchema
    }
    return (selectedFunction as any).latestVersion?.inputSchema ?? null
  }, [selectedFunction, selectedVersion, versions])

  const availableVersions = useMemo(() => {
    const loaded = versions.map(version => Number(version.version)).filter(version => Number.isFinite(version))
    const latest = Number(selectedFunction?.latestVersion?.version)
    return Array.from(new Set([...loaded, ...(Number.isFinite(latest) ? [latest] : [])])).sort((a, b) => b - a)
  }, [selectedFunction?.latestVersion?.version, versions])

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
    const map = { ...current.inputExpressionMap }
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
    const nextMap = { ...current.inputExpressionMap }
    nextMap[name] = expression
    update({
      functionConfig: {
        ...current,
        inputExpressionMap: nextMap
      }
    })
  }

  const updateVersion = (version: number) => {
    const current = config.functionConfig ?? { functionId: '', functionName: undefined }
    const selectedVersionMeta =
      versions.find(item => Number(item.version) === version) ??
      (Number(selectedFunction?.latestVersion?.version) === version ? selectedFunction?.latestVersion : undefined)

    update({
      functionConfig: {
        ...current,
        version,
        outputSchema: selectedVersionMeta?.outputSchema
      }
    })
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-muted">
      <Label className="gba:text-xs gba:font-semibold gba:text-foreground">
        <Code2 className="gba:h-3.5 gba:w-3.5 gba:inline gba:mr-1" />
        Function
      </Label>
      <div className={selectedFunction ? 'gba:grid gba:grid-cols-[minmax(0,1fr)_9rem] gba:gap-2 gba:items-end' : ''}>
        <div className="gba:flex gba:flex-col gba:gap-1.5">
          <Label className="gba:text-xs gba:font-medium">Function</Label>
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
                                  version: fn.latestVersion?.version,
                                  outputSchema: fn.latestVersion?.outputSchema
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
        </div>
        {selectedFunction && (
          <AutomationVersionSelect
            label={t('list-col-version')}
            value={selectedVersion}
            options={availableVersions}
            loading={versionsLoading}
            onChange={updateVersion}
            data-testid={`${testId}-function-version`}
          />
        )}
      </div>
      {selectedFunction?.description && (
        <p className="gba:text-[10px] gba:text-muted-foreground">{selectedFunction.description}</p>
      )}

      {selectedFunction && (
        <div className="gba:flex gba:flex-col gba:gap-2 gba:pt-1" data-testid={`${testId}-function-params`}>
          <div className="gba:text-[11px] gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider">
            Input parameters
          </div>

          {(() => {
            const hasNoParams = inputParams.length === 0
            if (versionsLoading) {
              return (
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
                  <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin" />
                  Loading function schema...
                </div>
              )
            }
            if (hasNoParams) {
              return <div className="gba:text-xs gba:text-muted-foreground">No parameters found.</div>
            }
            return (
              <div className="gba:flex gba:flex-col gba:gap-2">
                {inputParams.map((paramName, idx) => (
                  <FunctionParamRow
                    key={paramName}
                    paramName={paramName}
                    currentExpr={config.functionConfig?.inputExpressionMap?.[paramName] ?? ''}
                    stepValueSuggestions={stepValueSuggestions}
                    updateParam={updateParam}
                    testId={testId}
                    idx={idx}
                    pickLabel={t('logic-field-placeholder')}
                    searchLabel={t('flow-context-search')}
                    emptyLabel={t('logic-field-empty')}
                    suggestionsGroupLabel={t('flow-context-group')}
                  />
                ))}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
