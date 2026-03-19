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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { ChevronsUpDown, Trash2 } from 'lucide-react'
import type { DecisionNodeConfig } from '../../../types/studioTypes'
import type { ExpressionSuggestionItem } from '@/common/components/flow/expression-editor'
import type { OperatorId, ValueType } from './decisionConfigUtils'
import { LogicValueInput } from './LogicValueInput'
import { OPERATORS_BY_TYPE } from './logicOperators'
import { buildConditionExpression, parseConditionExpression } from './logicExpressionUtils'
import type { DesignerMode } from '../../../types/studioTypes'

type LogicCondition = { expression: string; branchId: string }

interface LogicConditionRowProps {
  config: DecisionNodeConfig
  condition: LogicCondition
  index: number
  conditions: LogicCondition[]
  setConditions: (next: LogicCondition[]) => void
  testId: string
  t: (key: string) => string
  stepValueSuggestions: ExpressionSuggestionItem[]
  stringEnumOptionsByExpression?: Record<string, string[]>
  mode: DesignerMode
}

export const LogicConditionRow: React.FC<LogicConditionRowProps> = ({
  config,
  condition,
  index,
  conditions,
  setConditions,
  testId,
  t,
  stepValueSuggestions,
  stringEnumOptionsByExpression,
  mode
}) => {
  const parsed = parseConditionExpression(condition.expression)
  const selected = stepValueSuggestions.find(s => s.expression === parsed.lhs)
  const valueType = String(selected?.dataType || 'unknown') as ValueType
  const operators = OPERATORS_BY_TYPE[valueType] ?? OPERATORS_BY_TYPE.unknown
  const activeOpId = operators.some(o => o.id === parsed.opId) ? parsed.opId : operators[0].id

  const updateCondition = (partial: Partial<LogicCondition>) => {
    const updated = [...conditions]
    updated[index] = { ...updated[index], ...partial }
    setConditions(updated)
  }

  const handleSelectField = (item: ExpressionSuggestionItem) => {
    const nextType = String(item.dataType || 'unknown') as ValueType
    const allowedOps = OPERATORS_BY_TYPE[nextType] ?? OPERATORS_BY_TYPE.unknown
    const nextOpId = allowedOps.some(o => o.id === parsed.opId) ? parsed.opId : allowedOps[0].id
    const nextExpr = buildConditionExpression(item.expression, nextOpId, parsed.rhs)
    updateCondition({ expression: nextExpr })
  }

  const remove = () => setConditions(conditions.filter((_, i) => i !== index))

  return (
    <div
      className="gba:flex gba:flex-col gba:gap-1.5 gba:p-3 gba:rounded-lg gba:bg-muted"
      data-testid={`${testId}-logic-condition-${index}`}
    >
      <div className="gba:flex gba:items-center gba:justify-between">
        <span className="gba:text-xs gba:font-medium">
          Condition {index + 1} → {config.branches.find(b => b.id === condition.branchId)?.label ?? 'Unlinked'}
        </span>
        <Button variant="ghost" size="sm" onClick={remove}>
          <Trash2 className="gba:h-3 gba:w-3" />
        </Button>
      </div>

      <div className="gba:flex gba:flex-col gba:gap-2">
        <div className="gba:grid gba:grid-cols-3 gba:gap-2">
          <div className="gba:flex gba:flex-col gba:gap-1">
            <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">
              {t('logic-field-label')}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  title={selected?.label || undefined}
                  className="gba:w-full gba:justify-between gba:gap-2 gba:h-8 gba:text-xs gba:bg-background gba:min-w-0"
                  data-testid={`${testId}-logic-field-${index}`}
                >
                  <span className="gba:flex-1 gba:min-w-0 gba:truncate gba:text-left">
                    {selected ? selected.label : t('logic-field-placeholder')}
                  </span>
                  <ChevronsUpDown className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground gba:flex-shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="gba:p-0" align="start">
                <Command>
                  <CommandInput placeholder={t('logic-field-search')} />
                  <CommandEmpty>{t('logic-field-empty')}</CommandEmpty>
                  <CommandList>
                    <CommandGroup heading={t('logic-field-group-steps')}>
                      {stepValueSuggestions.map(item => (
                        <CommandItem
                          key={item.id}
                          onSelect={() => handleSelectField(item)}
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

          <div className="gba:flex gba:flex-col gba:gap-1">
            <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">
              {t('logic-operator-label')}
            </Label>
            <Select
              value={activeOpId}
              onValueChange={opId =>
                updateCondition({ expression: buildConditionExpression(parsed.lhs, opId as OperatorId, parsed.rhs) })
              }
            >
              <SelectTrigger
                className="gba:h-8 gba:text-xs gba:bg-background"
                data-testid={`${testId}-logic-op-${index}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {operators.map(o => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="gba:flex gba:flex-col gba:gap-1">
            <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">
              {t('logic-value-label')}
            </Label>
            <LogicValueInput
              valueType={valueType}
              rhs={parsed.rhs}
              lhs={parsed.lhs}
              activeOpId={activeOpId}
              testId={testId}
              index={index}
              stringEnumOptionsByExpression={stringEnumOptionsByExpression}
              valuePlaceholder={t('logic-value-placeholder')}
              buildConditionExpression={buildConditionExpression}
              onChangeExpr={nextExpr => updateCondition({ expression: nextExpr })}
            />
          </div>
        </div>

        {mode === 'advanced' ? (
          <span className="gba:text-[10px] gba:text-muted-foreground" data-testid={`${testId}-logic-preview-${index}`}>
            {t('logic-preview')} <span className="gba:font-mono">{condition.expression || '—'}</span>
          </span>
        ) : null}
      </div>

      <Select value={condition.branchId} onValueChange={v => updateCondition({ branchId: v })}>
        <SelectTrigger
          className="gba:h-8 gba:text-xs gba:bg-background"
          data-testid={`${testId}-logic-branch-${index}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {config.branches.map(branch => (
            <SelectItem key={branch.id} value={branch.id}>
              {branch.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
