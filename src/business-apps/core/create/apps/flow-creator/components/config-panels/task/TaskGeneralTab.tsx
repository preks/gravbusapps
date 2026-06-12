import React, { useMemo } from 'react'
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { Info } from 'lucide-react'
import { FlowStepType } from '@/common/data/flow/types/flowTemplate'
import type { DesignerMode, TaskNodeConfig } from '../../../types/studioTypes'
import type { FlowStudioData } from '../../../hooks/useFlowStudioData'
import { useStudioExpressionSuggestions } from '../../../hooks/useStudioExpressionSuggestions'
import { TaskStepTypeSelector } from './TaskStepTypeSelector'
import { AgentSelector } from './AgentSelector'
import { FunctionSelector } from './FunctionSelector'
import { PermissionContextSection } from './PermissionContextSection'
import { AgentOutputSchemaSection } from './AgentOutputSchemaSection'
import { FlowContextExpressionEditor } from '../../shared/FlowContextExpressionEditor'
import { TaskLinksSection } from './TaskLinksSection'

interface TaskGeneralTabProps {
  nodeId: string
  mode: DesignerMode
  config: TaskNodeConfig
  accessToken: string
  studioData: FlowStudioData
  stepTypeOptions: FlowStepType[]
  update: (partial: Partial<TaskNodeConfig>) => void
  onUpdateLabel: (title: string) => void
  t: (key: string) => string
  testId: string
}

export const TaskGeneralTab: React.FC<TaskGeneralTabProps> = ({
  nodeId,
  mode,
  config,
  accessToken,
  studioData,
  stepTypeOptions,
  update,
  onUpdateLabel,
  t,
  testId
}) => {
  const expressionSuggestions = useStudioExpressionSuggestions()
  const dataSources = useMemo(
    () => ({
      catalogs: studioData.catalogs,
      catalogsLoading: studioData.catalogsLoading,
      catalogsError: studioData.catalogsError,
      catalogsQuery: studioData.catalogsQuery,
      catalogsHasMore: studioData.catalogsHasMore,
      searchCatalogs: studioData.searchCatalogs,
      loadMoreCatalogs: studioData.loadMoreCatalogs,
      entities: studioData.entities,
      entitiesLoading: studioData.entitiesLoading,
      entitiesError: studioData.entitiesError,
      loadEntities: studioData.loadEntities
    }),
    [
      studioData.catalogs,
      studioData.catalogsError,
      studioData.catalogsHasMore,
      studioData.catalogsLoading,
      studioData.catalogsQuery,
      studioData.entities,
      studioData.entitiesError,
      studioData.entitiesLoading,
      studioData.loadEntities,
      studioData.loadMoreCatalogs,
      studioData.searchCatalogs
    ]
  )

  type DueUnit = 'minutes' | 'hours' | 'days'
  const minutesPer: Record<DueUnit, number> = { minutes: 1, hours: 60, days: 24 * 60 }

  const deriveUnit = (mins?: number): DueUnit => {
    const m = Number(mins || 0)
    if (!m) return 'days'
    if (m % minutesPer.days === 0) return 'days'
    if (m % minutesPer.hours === 0) return 'hours'
    return 'minutes'
  }

  const unit = deriveUnit(config.dueInMinutes)
  const amountValue = (() => {
    const mins = Number(config.dueInMinutes || 0)
    if (!mins) return ''
    const per = minutesPer[unit]
    const val = Math.round(mins / per)
    return String(val > 0 ? val : '')
  })()
  const showLinksSection = ![FlowStepType.AI_TASK_EXPERT, FlowStepType.FUNCTION].includes(config.stepType)

  /**
   * Resolve the effective Connector-vs-Function sub-category for the FUNCTION-family
   * selector. Prefer the explicit studio-only hint on functionConfig; fall back to
   * "the currently selected function wraps a connector" so legacy steps authored
   * before this UI shipped still highlight the correct sub-tile. Default 'functions'
   * when there's no signal at all.
   */
  const effectiveFunctionCategory = useMemo<'connectors' | 'functions'>(() => {
    if (config.stepType !== FlowStepType.FUNCTION) return 'functions'
    const hint = config.functionConfig?.categoryHint
    if (hint === 'connectors' || hint === 'functions') return hint
    const fnId = config.functionConfig?.functionId
    const selectedFn = fnId ? studioData.functions.find(f => f.id === fnId) : undefined
    if (selectedFn?.connectorEnabled === true) return 'connectors'
    return 'functions'
  }, [config.stepType, config.functionConfig?.categoryHint, config.functionConfig?.functionId, studioData.functions])

  /**
   * Persist the sub-category choice on functionConfig.categoryHint. We keep the
   * rest of functionConfig untouched — stepType does not change, we only write
   * the studio-only hint. The FunctionSelector below reads this hint to seed its
   * segmented filter and the underlying dropdown groups.
   */
  const handleFunctionCategoryChange = (next: 'connectors' | 'functions') => {
    const current = config.functionConfig ?? { functionId: '' }
    if (current.categoryHint === next) return
    update({
      functionConfig: {
        ...current,
        categoryHint: next
      }
    })
  }

  const applyStepType = (nextType: FlowStepType) => {
    const isAutomation = [FlowStepType.FUNCTION, FlowStepType.AI_AGENT, FlowStepType.AI_TASK_EXPERT].includes(nextType)
    update({
      stepType: nextType,
      kind: isAutomation ? 'SYSTEM' : 'USER',
      humanFallback: isAutomation ? config.humanFallback : undefined,
      permissionContext:
        nextType === FlowStepType.AI_AGENT
          ? (config.permissionContext ?? {
              contextType: 'USER',
              permissions: ['read', 'write', 'execute']
            })
          : undefined,
      ...(mode === 'simple' && nextType === FlowStepType.AI_TASK_EXPERT
        ? {
            simpleAIConfig: {
              instruction: config.simpleAIConfig?.instruction ?? ''
            }
          }
        : {})
    })
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-4">
      <TaskStepTypeSelector
        options={stepTypeOptions}
        value={config.stepType}
        title={t('task-type')}
        getLabel={type => t(`task-type-${type.toLowerCase()}`)}
        humanGroupLabel={t('task-type-group-human')}
        aiGroupLabel={t('task-type-group-ai')}
        onChange={applyStepType}
        functionCategoryHint={effectiveFunctionCategory}
        onFunctionCategoryChange={handleFunctionCategoryChange}
        data-testid={`${testId}-task-type`}
      />

      {config.stepType === FlowStepType.APPROVAL && (
        <div
          className="gba:flex gba:items-start gba:gap-2 gba:rounded-lg gba:border gba:border-border gba:bg-muted gba:p-3"
          data-testid={`${testId}-approval-tip`}
        >
          <div className="gba:mt-0.5 gba:flex gba:items-center gba:justify-center gba:w-6 gba:h-6 gba:rounded-md gba:bg-info-secondary gba:flex-shrink-0">
            <Info className="gba:h-4 gba:w-4 gba:text-info-secondary-foreground" />
          </div>
          <div className="gba:flex gba:flex-col gba:gap-0.5">
            <span className="gba:text-xs gba:font-semibold gba:text-foreground">Tip</span>
            <span className="gba:text-xs gba:text-muted-foreground">
              If you need decision-based approvals with separate branches (Approve/Reject) or return-to-step flows, use
              a <span className="gba:font-medium gba:text-foreground">Decision</span> node in{' '}
              <span className="gba:font-medium gba:text-foreground">Approval</span> mode.
            </span>
          </div>
        </div>
      )}

      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <Label className="gba:text-xs gba:font-medium">{t('task-title')}</Label>
        <FlowContextExpressionEditor
          value={config.title}
          onChange={next => {
            update({ title: next })
            onUpdateLabel(next)
          }}
          suggestions={expressionSuggestions}
          dataSources={dataSources}
          placeholder="Enter task title… Type {{ to insert data."
          allowFreeText
          singleLine
          data-testid={`${testId}-title`}
        />
      </div>

      {![FlowStepType.AI_TASK_EXPERT, FlowStepType.FUNCTION].includes(config.stepType) && (
        <div className="gba:flex gba:flex-col gba:gap-1.5">
          <Label className="gba:text-xs gba:font-medium">
            {config.stepType === FlowStepType.AI_AGENT ? t('task-instruction') : t('task-message')}
          </Label>
          <FlowContextExpressionEditor
            value={config.message ?? ''}
            onChange={value => update({ message: value })}
            suggestions={expressionSuggestions}
            dataSources={dataSources}
            placeholder={
              config.stepType === FlowStepType.AI_AGENT
                ? 'Describe what the agent should do… Type {{ to insert data.'
                : 'Write a short message… Type {{ to insert data.'
            }
            allowFreeText
            multiline
            data-testid={`${testId}-message`}
          />
        </div>
      )}

      {showLinksSection && (
        <TaskLinksSection
          nodeId={nodeId}
          value={config.links ?? []}
          onChange={next => update({ links: next })}
          t={t}
          data-testid={`${testId}-links`}
        />
      )}

      {config.kind === 'USER' && (
        <div className="gba:flex gba:flex-col gba:gap-2">
          <Label className="gba:text-xs gba:font-semibold gba:text-foreground">{t('assignment-due-label')}</Label>
          <p className="gba:text-xs gba:text-muted-foreground">{t('assignment-due-description')}</p>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Input
              type="number"
              min={1}
              value={amountValue}
              placeholder={t('assignment-due-placeholder')}
              onChange={e => {
                const raw = String(e.target.value || '').trim()
                if (!raw) {
                  update({ dueInMinutes: undefined })
                  return
                }
                const n = Number.parseInt(raw, 10)
                if (!Number.isFinite(n) || n <= 0) {
                  update({ dueInMinutes: undefined })
                  return
                }
                update({ dueInMinutes: n * minutesPer[unit] })
              }}
              className="gba:flex-1"
              data-testid={`${testId}-due-amount`}
            />
            <Select
              value={unit}
              onValueChange={(next: string) => {
                const nextUnit = next as DueUnit
                const currentAmount = Number.parseInt(String(amountValue || '1'), 10) || 1
                update({ dueInMinutes: currentAmount * minutesPer[nextUnit] })
              }}
            >
              <SelectTrigger className="gba:w-32" data-testid={`${testId}-due-unit`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">{t('assignment-due-unit-minutes')}</SelectItem>
                <SelectItem value="hours">{t('assignment-due-unit-hours')}</SelectItem>
                <SelectItem value="days">{t('assignment-due-unit-days')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {mode === 'advanced' && config.stepType === FlowStepType.AI_TASK_EXPERT && (
        <AgentSelector config={config} update={update} studioData={studioData} testId={testId} />
      )}

      {mode === 'advanced' && config.stepType === FlowStepType.AI_AGENT && (
        <AgentOutputSchemaSection
          config={config}
          update={update}
          title={t('task-output-schema-title')}
          description={t('task-output-schema-desc')}
          testId={testId}
        />
      )}

      {mode === 'advanced' && config.stepType === FlowStepType.FUNCTION && (
        <FunctionSelector config={config} update={update} studioData={studioData} testId={testId} />
      )}

      {mode === 'advanced' && config.stepType === FlowStepType.AI_AGENT && (
        <PermissionContextSection
          mode={mode}
          value={config.permissionContext}
          accessToken={accessToken}
          onChange={next => update({ permissionContext: next })}
          data-testid={`${testId}-permission`}
        />
      )}
    </div>
  )
}
