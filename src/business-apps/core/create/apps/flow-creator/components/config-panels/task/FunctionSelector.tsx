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
import { Check, ChevronsUpDown, Cloud, Code2, ExternalLink, FolderOpen, Loader2 } from 'lucide-react'
import translations from '../../../_i18n'
import type { TaskNodeConfig } from '../../../types/studioTypes'
import type { FlowStudioData } from '../../../hooks/useFlowStudioData'
import { useStudioExpressionSuggestions } from '../../../hooks/useStudioExpressionSuggestions'
import { FlowStepType } from '@/business-apps/flow/apps/creator/types/flowTemplate'
import type { ExpressionSuggestionItem } from '@/common/components/flow/expression-editor'
import type { FunctionVersionMeta } from '@/common/network/functions/FunctionsServiceClient'
import { Navigation } from '@/common/utils/navigationUtils'
import { AutomationVersionSelect } from './AutomationVersionSelect'

/**
 * Build a link to the Function Manager editor for the given function id.
 * Opens in a new tab so the user doesn't lose the FlowStudio edit state.
 */
const buildFunctionEditorUrl = (functionId: string): string =>
  `${Navigation.CREATE_FUNCTION_MANAGER}?functionId=${encodeURIComponent(functionId)}`

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

/** Category filter shown as a segmented control above the dropdown. */
type CategoryFilter = 'all' | 'connectors' | 'functions'

export const FunctionSelector: React.FC<FunctionSelectorProps> = ({ config, update, studioData, testId }) => {
  const { t } = useTranslation(translations)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  // Seed the category filter from the step's authored intent (Connector tile vs Function tile
  // at the task-category level). Falls back to 'all' for legacy steps without a hint.
  const hintFromConfig = config.functionConfig?.categoryHint
  const categoryFromHint: CategoryFilter =
    hintFromConfig === 'connectors' ? 'connectors' : hintFromConfig === 'functions' ? 'functions' : 'all'
  const [category, setCategory] = useState<CategoryFilter>(categoryFromHint)
  const { functions, functionsLoading } = studioData

  /**
   * Keep the local filter state in sync with the persisted hint. This is what
   * makes the Task Type sub-tile above (Connector / Function) actually drive the
   * segmented control + grouped dropdown below — without this effect, useState
   * only seeds once on mount and external hint changes wouldn't propagate.
   *
   * Writes from the segmented control are already handled by setCategoryAndPersist
   * (which writes the hint back), and this effect then runs as a no-op because the
   * local state already matches. Safe loop.
   */
  useEffect(() => {
    setCategory(prev => (prev === categoryFromHint ? prev : categoryFromHint))
  }, [categoryFromHint])

  /**
   * When the user clicks a pill in the local segmented control, persist the hint
   * back into functionConfig so the Task Type sub-tile above, the segmented
   * control, and the dropdown filter all share a single source of truth.
   * 'all' clears the hint so the step isn't locked into a category.
   */
  const setCategoryAndPersist = (next: CategoryFilter) => {
    setCategory(next)
    const current = config.functionConfig ?? { functionId: '' }
    const nextHint = next === 'connectors' ? 'connectors' : next === 'functions' ? 'functions' : undefined
    if (current.categoryHint === nextHint) return
    update({
      functionConfig: {
        ...current,
        categoryHint: nextHint
      }
    })
  }
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

  // Counts are derived from the full list (pre-search, pre-category) so the segmented control
  // always shows how many items exist in each category regardless of current filters.
  const totalConnectors = useMemo(() => functions.filter(f => f.connectorEnabled === true).length, [functions])
  const totalBusinessFunctions = useMemo(() => functions.filter(f => f.connectorEnabled !== true).length, [functions])

  const searchFiltered = search
    ? functions.filter(f => (f.name ?? '').toLowerCase().includes(search.toLowerCase()))
    : functions

  const filtered = useMemo(() => {
    if (category === 'connectors') return searchFiltered.filter(f => f.connectorEnabled === true)
    if (category === 'functions') return searchFiltered.filter(f => f.connectorEnabled !== true)
    return searchFiltered
  }, [searchFiltered, category])

  // Split the filtered list into three peer groups so users see Connectors as a first-class
  // category, matching the Task Expert builder's Capabilities layout (MCP / Connectors / Functions).
  const anypointConnectors = useMemo(
    () => filtered.filter(f => f.connectorEnabled === true && f.connectorKind === 'structured'),
    [filtered]
  )
  const dataBridgeConnectors = useMemo(
    () => filtered.filter(f => f.connectorEnabled === true && f.connectorKind === 'unstructured'),
    [filtered]
  )
  const businessFunctions = useMemo(() => filtered.filter(f => f.connectorEnabled !== true), [filtered])

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

  const renderFunctionItem = (
    fn: (typeof functions)[number],
    LeadingIcon: React.ComponentType<{ className?: string }>
  ) => {
    const isConnector = fn.connectorEnabled === true
    const configureLabel = isConnector ? 'Configure connector in Function Manager' : 'Edit function in Function Manager'
    const editorUrl = buildFunctionEditorUrl(fn.id)
    return (
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
        <LeadingIcon className="gba:h-3.5 gba:w-3.5 gba:mr-2 gba:text-muted-foreground" />
        <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0">
          <span className="gba:truncate gba:text-foreground">{fn.name}</span>
          {fn.description && (
            <span className="gba:text-[10px] gba:text-muted-foreground gba:truncate">{fn.description}</span>
          )}
        </div>
        <a
          href={editorUrl}
          target="_blank"
          rel="noopener noreferrer"
          // cmdk fires selection on pointerdown as well as click, so block both to ensure the
          // Configure link never doubles as "select this function in the flow step".
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          title={configureLabel}
          aria-label={configureLabel}
          className="gba:flex gba:items-center gba:gap-1 gba:text-[10px] gba:text-muted-foreground gba:hover:text-foreground gba:px-1.5 gba:py-0.5 gba:rounded gba:border gba:border-transparent gba:hover:border-border gba:transition-colors gba:flex-shrink-0"
          data-testid={`${testId}-function-configure-${fn.id}`}
        >
          <ExternalLink className="gba:h-3 gba:w-3" />
          Configure
        </a>
        {config.functionConfig?.functionId === fn.id && (
          <Check className="gba:h-3.5 gba:w-3.5 gba:text-primary gba:flex-shrink-0 gba:ml-1" />
        )}
      </CommandItem>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-2 gba:p-3 gba:rounded-lg gba:bg-muted">
      <Label className="gba:text-xs gba:font-semibold gba:text-foreground gba:flex gba:items-center gba:gap-1">
        <Code2 className="gba:h-3.5 gba:w-3.5" />
        Function
        <span className="gba:text-[10px] gba:font-normal gba:text-muted-foreground">
          · call a <span className="gba:text-primary">connector</span> or a function
        </span>
      </Label>
      {/**
       * Segmented category filter: promotes "Connectors" to a first-class, always-visible
       * concept so users don't have to open the dropdown to learn that connectors exist.
       * Pure UI filter — the underlying step type stays FUNCTION and the selection
       * payload is identical across categories.
       */}
      <div
        className="gba:inline-flex gba:items-center gba:gap-0.5 gba:p-0.5 gba:rounded-md gba:bg-background gba:border gba:border-border gba:self-start"
        role="tablist"
        aria-label="Filter by category"
        data-testid={`${testId}-function-category-filter`}
      >
        {(
          [
            { id: 'all', label: 'All', count: totalConnectors + totalBusinessFunctions, icon: Code2 },
            { id: 'connectors', label: 'Connectors', count: totalConnectors, icon: Cloud },
            { id: 'functions', label: 'Functions', count: totalBusinessFunctions, icon: Code2 }
          ] as const
        ).map(opt => {
          const Icon = opt.icon
          const active = category === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCategoryAndPersist(opt.id)}
              className={`gba:flex gba:items-center gba:gap-1 gba:text-[11px] gba:font-medium gba:px-2 gba:py-1 gba:rounded gba:transition-colors ${
                active
                  ? 'gba:bg-primary/10 gba:text-primary'
                  : 'gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted'
              }`}
              data-testid={`${testId}-function-category-${opt.id}`}
            >
              <Icon className="gba:h-3 gba:w-3" />
              {opt.label}
              <span
                className={`gba:text-[10px] gba:px-1 gba:rounded ${
                  active ? 'gba:bg-primary/20 gba:text-primary' : 'gba:bg-muted gba:text-muted-foreground'
                }`}
              >
                {opt.count}
              </span>
            </button>
          )
        })}
      </div>

      <div className={selectedFunction ? 'gba:grid gba:grid-cols-[minmax(0,1fr)_9rem] gba:gap-2 gba:items-end' : ''}>
        <div className="gba:flex gba:flex-col gba:gap-1.5">
          <Label className="gba:text-xs gba:font-medium">
            {category === 'connectors' ? 'Connector' : category === 'functions' ? 'Function' : 'Connector or function'}
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
                    {selectedFunction.connectorEnabled === true ? (
                      selectedFunction.connectorKind === 'unstructured' ? (
                        <FolderOpen className="gba:h-3.5 gba:w-3.5 gba:text-primary gba:flex-shrink-0" />
                      ) : (
                        <Cloud className="gba:h-3.5 gba:w-3.5 gba:text-primary gba:flex-shrink-0" />
                      )
                    ) : (
                      <Code2 className="gba:h-3.5 gba:w-3.5 gba:text-primary gba:flex-shrink-0" />
                    )}
                    <span className="gba:truncate">{selectedFunction.name}</span>
                    {selectedFunction.connectorEnabled === true && (
                      <span className="gba:text-[10px] gba:px-1 gba:py-px gba:rounded gba:bg-primary/10 gba:text-primary gba:flex-shrink-0">
                        {selectedFunction.connectorKind === 'unstructured' ? 'Data Bridge' : 'Anypoint Connect'}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="gba:text-muted-foreground">
                    {functionsLoading
                      ? 'Loading...'
                      : category === 'connectors'
                        ? 'Select a connector...'
                        : category === 'functions'
                          ? 'Select a function...'
                          : 'Select a connector or function...'}
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
                      {anypointConnectors.length > 0 && (
                        <CommandGroup heading="Anypoint Connect (structured)">
                          {anypointConnectors.map(fn => renderFunctionItem(fn, Cloud))}
                        </CommandGroup>
                      )}
                      {dataBridgeConnectors.length > 0 && (
                        <CommandGroup heading="Data Bridge (unstructured)">
                          {dataBridgeConnectors.map(fn => renderFunctionItem(fn, FolderOpen))}
                        </CommandGroup>
                      )}
                      {businessFunctions.length > 0 && (
                        <CommandGroup heading="Functions">
                          {businessFunctions.map(fn => renderFunctionItem(fn, Code2))}
                        </CommandGroup>
                      )}
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
        <a
          href={buildFunctionEditorUrl(selectedFunction.id)}
          target="_blank"
          rel="noopener noreferrer"
          title={
            selectedFunction.connectorEnabled === true
              ? 'Configure connector in Function Manager'
              : 'Edit function in Function Manager'
          }
          className="gba:inline-flex gba:items-center gba:gap-1 gba:self-start gba:text-[10px] gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
          data-testid={`${testId}-function-configure-selected`}
        >
          <ExternalLink className="gba:h-3 gba:w-3" />
          {selectedFunction.connectorEnabled === true ? 'Configure connector' : 'Edit function'}
        </a>
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
