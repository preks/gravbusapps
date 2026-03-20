import React from 'react'
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
import { ChevronsUpDown, Loader2 } from 'lucide-react'
import type { ExpressionSuggestionItem } from '@/common/components/flow/expression-editor'
import type { PromptParameterGroups } from '../../../utils/promptParameterUtils'
import translations from '../../../_i18n'

interface AgentParamMappingSectionProps {
  params: PromptParameterGroups
  values?: {
    systemParamsMap?: Record<string, string>
    userParamsMap?: Record<string, string>
  }
  loading?: boolean
  suggestions: ExpressionSuggestionItem[]
  onChangeParam: (groupId: 'system' | 'user', paramName: string, expression: string) => void
  testId: string
  description?: string
}

interface AgentParamRowProps {
  paramName: string
  groupId: 'system' | 'user'
  currentExpr: string
  suggestions: ExpressionSuggestionItem[]
  onChangeParam: (groupId: 'system' | 'user', paramName: string, expression: string) => void
  testId: string
  idx: number
  pickLabel: string
  searchLabel: string
  emptyLabel: string
  groupLabel: string
}

const AgentParamRow: React.FC<AgentParamRowProps> = ({
  paramName,
  groupId,
  currentExpr,
  suggestions,
  onChangeParam,
  testId,
  idx,
  pickLabel,
  searchLabel,
  emptyLabel,
  groupLabel
}) => {
  const selected = suggestions.find(item => `{{${item.expression}}}` === currentExpr)
  const displayLabel = selected?.label ?? currentExpr ?? pickLabel

  return (
    <div className="gba:grid gba:grid-cols-5 gba:gap-2 gba:items-start" data-testid={`${testId}-${groupId}-${idx}`}>
      <Label className="gba:col-span-2 gba:text-xs gba:font-mono gba:pt-2">{paramName}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="gba:col-span-3 gba:justify-between gba:h-9 gba:text-xs gba:bg-background"
            data-testid={`${testId}-pick-${groupId}-${idx}`}
          >
            <span className="gba:truncate">{displayLabel}</span>
            <ChevronsUpDown className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="gba:p-0" align="start">
          <Command>
            <CommandInput placeholder={searchLabel} />
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandList>
              <CommandGroup heading={groupLabel}>
                {suggestions.map(item => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => onChangeParam(groupId, paramName, `{{${item.expression}}}`)}
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

export const AgentParamMappingSection: React.FC<AgentParamMappingSectionProps> = ({
  params,
  values,
  loading = false,
  suggestions,
  onChangeParam,
  testId,
  description
}) => {
  const { t } = useTranslation(translations)
  const hasNoParams = params.system.length === 0 && params.user.length === 0
  const groups = [
    { id: 'system' as const, label: t('task-input-params-system'), params: params.system },
    { id: 'user' as const, label: t('task-input-params-user'), params: params.user }
  ]

  return (
    <div className="gba:flex gba:flex-col gba:gap-2 gba:pt-1" data-testid={testId}>
      <div className="gba:flex gba:flex-col gba:gap-1.5">
        <div className="gba:text-[11px] gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider">
          {t('task-input-params')}
        </div>
        {description ? <p className="gba:text-xs gba:text-muted-foreground">{description}</p> : null}
      </div>

      {loading ? (
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
          <Loader2 className="gba:h-4 gba:w-4 gba:animate-spin" />
          {t('task-input-params-loading')}
        </div>
      ) : hasNoParams ? (
        <div className="gba:text-xs gba:text-muted-foreground">{t('task-input-params-empty')}</div>
      ) : (
        <div className="gba:flex gba:flex-col gba:gap-3">
          {groups
            .filter(group => group.params.length > 0)
            .map(group => (
              <div key={group.id} className="gba:flex gba:flex-col gba:gap-2">
                <div className="gba:text-[10px] gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wider">
                  {group.label}
                </div>
                {group.params.map((paramName, idx) => {
                  const currentExpr =
                    group.id === 'system'
                      ? String(values?.systemParamsMap?.[paramName] ?? '')
                      : String(values?.userParamsMap?.[paramName] ?? '')
                  return (
                    <AgentParamRow
                      key={`${group.id}-${paramName}`}
                      paramName={paramName}
                      groupId={group.id}
                      currentExpr={currentExpr}
                      suggestions={suggestions}
                      onChangeParam={onChangeParam}
                      testId={`${testId}-param`}
                      idx={idx}
                      pickLabel={t('task-input-params-pick')}
                      searchLabel={t('flow-context-search')}
                      emptyLabel={t('logic-field-empty')}
                      groupLabel={t('flow-context-group')}
                    />
                  )
                })}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
