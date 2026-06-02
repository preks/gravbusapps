/**
 * EmailTriggerFilterEditor - Structured editor for the per-flow email trigger filter.
 *
 * Renders one row per rule. Each row is (field, op, value). Empty list renders
 * the "matches every email" empty state. Mirrors the v1 backend shape in
 * custom-flow-engine `EmailTriggerFilterDto`.
 */

import React from 'react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch
} from '@newwork/nw-design-system'
import { PlusIcon, TrashIcon } from '@phosphor-icons/react'
import type {
  EmailFilterField,
  EmailFilterOp,
  EmailFilterRule,
  EmailTriggerFilterConfig
} from '../../types/studioTypes'

interface FieldDefinition {
  field: EmailFilterField
  label: string
  ops: EmailFilterOp[]
  valueKind: 'string' | 'string-list' | 'boolean'
  placeholder?: string
}

const FIELD_DEFINITIONS: FieldDefinition[] = [
  {
    field: 'accountEmail',
    label: 'Mailbox',
    ops: ['eq', 'in'],
    valueKind: 'string',
    placeholder: 'support@acme.com'
  },
  {
    field: 'from.address',
    label: 'From',
    ops: ['eq', 'endsWith', 'in'],
    valueKind: 'string',
    placeholder: 'jane@partner.com or @partner.com'
  },
  {
    field: 'subject',
    label: 'Subject',
    ops: ['contains', 'startsWith', 'regex'],
    valueKind: 'string',
    placeholder: '[Unfall] or ^Order #'
  },
  {
    field: 'hasAttachments',
    label: 'Has attachments',
    ops: ['eq'],
    valueKind: 'boolean'
  }
]

const OP_LABELS: Record<EmailFilterOp, string> = {
  eq: 'is',
  in: 'is one of',
  contains: 'contains',
  startsWith: 'starts with',
  endsWith: 'ends with',
  regex: 'matches regex'
}

const FIELD_BY_NAME: Record<EmailFilterField, FieldDefinition> = FIELD_DEFINITIONS.reduce(
  (acc, def) => {
    acc[def.field] = def
    return acc
  },
  {} as Record<EmailFilterField, FieldDefinition>
)

const getDefinition = (field: EmailFilterField): FieldDefinition => FIELD_BY_NAME[field] ?? FIELD_DEFINITIONS[0]

const getDefaultValue = (definition: FieldDefinition, op: EmailFilterOp): string | string[] | boolean => {
  if (definition.valueKind === 'boolean') return true
  if (definition.valueKind === 'string-list' || op === 'in') return []
  return ''
}

interface EmailTriggerFilterEditorProps {
  value?: EmailTriggerFilterConfig
  onChange: (next: EmailTriggerFilterConfig) => void
  testId?: string
}

export const EmailTriggerFilterEditor: React.FC<EmailTriggerFilterEditorProps> = ({
  value,
  onChange,
  testId = 'flow-studio-email-filter'
}) => {
  const filter: EmailTriggerFilterConfig = value ?? { match: 'all', rules: [] }

  const updateRules = (rules: EmailFilterRule[]) => {
    onChange({ match: 'all', rules })
  }

  const addRule = () => {
    const definition = FIELD_DEFINITIONS[0]
    const op = definition.ops[0]
    updateRules([...filter.rules, { field: definition.field, op, value: getDefaultValue(definition, op) }])
  }

  const removeRule = (index: number) => {
    updateRules(filter.rules.filter((_, i) => i !== index))
  }

  const updateRule = (index: number, partial: Partial<EmailFilterRule>) => {
    const next = filter.rules.map((rule, i) => (i === index ? { ...rule, ...partial } : rule))
    updateRules(next)
  }

  const handleFieldChange = (index: number, nextField: EmailFilterField) => {
    const definition = getDefinition(nextField)
    const previous = filter.rules[index]
    const op = definition.ops.includes(previous.op) ? previous.op : definition.ops[0]
    updateRule(index, {
      field: nextField,
      op,
      value: getDefaultValue(definition, op)
    })
  }

  const handleOpChange = (index: number, nextOp: EmailFilterOp) => {
    const definition = getDefinition(filter.rules[index].field)
    const previousValue = filter.rules[index].value
    const previousIsList = Array.isArray(previousValue)
    const nextIsList = nextOp === 'in'
    const nextValue = previousIsList === nextIsList ? previousValue : getDefaultValue(definition, nextOp)
    updateRule(index, { op: nextOp, value: nextValue })
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-3" data-testid={testId}>
      <div className="gba:flex gba:flex-col gba:gap-1">
        <Label className="gba:text-xs gba:font-medium">Trigger conditions</Label>
        <p className="gba:text-[11px] gba:text-muted-foreground">
          Trigger this flow when an incoming email matches all of the conditions below.
        </p>
      </div>

      {filter.rules.length === 0 ? (
        <div
          className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:rounded-md gba:border gba:border-dashed gba:border-border gba:bg-muted/40 gba:px-3 gba:py-2"
          data-testid={`${testId}-empty`}
        >
          <span className="gba:text-xs gba:text-muted-foreground">
            No conditions — this flow will run for every incoming email.
          </span>
        </div>
      ) : (
        <div className="gba:flex gba:flex-col gba:gap-2">
          {filter.rules.map((rule, index) => (
            <EmailFilterRuleRow
              key={`rule-${index}-${rule.field}`}
              rule={rule}
              index={index}
              onFieldChange={handleFieldChange}
              onOpChange={handleOpChange}
              onValueChange={nextValue => updateRule(index, { value: nextValue })}
              onRemove={() => removeRule(index)}
              testId={testId}
            />
          ))}
        </div>
      )}

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRule}
          data-testid={`${testId}-add-rule`}
          className="gba:gap-1.5"
        >
          <PlusIcon className="gba:h-3.5 gba:w-3.5" />
          Add condition
        </Button>
      </div>
    </div>
  )
}

interface EmailFilterRuleRowProps {
  rule: EmailFilterRule
  index: number
  onFieldChange: (index: number, field: EmailFilterField) => void
  onOpChange: (index: number, op: EmailFilterOp) => void
  onValueChange: (value: string | string[] | boolean) => void
  onRemove: () => void
  testId: string
}

const EmailFilterRuleRow: React.FC<EmailFilterRuleRowProps> = ({
  rule,
  index,
  onFieldChange,
  onOpChange,
  onValueChange,
  onRemove,
  testId
}) => {
  const definition = getDefinition(rule.field)
  return (
    <div
      className="gba:flex gba:flex-col gba:gap-2 gba:rounded-md gba:bg-muted gba:p-3"
      data-testid={`${testId}-rule-${index}`}
    >
      <div className="gba:flex gba:items-center gba:justify-between">
        <span className="gba:text-[11px] gba:font-medium gba:text-muted-foreground">Condition {index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          aria-label="Remove condition"
          data-testid={`${testId}-rule-${index}-remove`}
        >
          <TrashIcon className="gba:h-3 gba:w-3" />
        </Button>
      </div>

      <div className="gba:grid gba:grid-cols-3 gba:gap-2">
        <div className="gba:flex gba:flex-col gba:gap-1">
          <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Field</Label>
          <Select value={rule.field} onValueChange={next => onFieldChange(index, next as EmailFilterField)}>
            <SelectTrigger
              className="gba:h-8 gba:text-xs gba:bg-background"
              data-testid={`${testId}-rule-${index}-field`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_DEFINITIONS.map(def => (
                <SelectItem key={def.field} value={def.field}>
                  {def.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="gba:flex gba:flex-col gba:gap-1">
          <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Operator</Label>
          <Select value={rule.op} onValueChange={next => onOpChange(index, next as EmailFilterOp)}>
            <SelectTrigger className="gba:h-8 gba:text-xs gba:bg-background" data-testid={`${testId}-rule-${index}-op`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {definition.ops.map(op => (
                <SelectItem key={op} value={op}>
                  {OP_LABELS[op]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="gba:flex gba:flex-col gba:gap-1">
          <Label className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">Value</Label>
          <EmailFilterRuleValueInput
            rule={rule}
            definition={definition}
            onValueChange={onValueChange}
            testId={`${testId}-rule-${index}-value`}
          />
        </div>
      </div>
    </div>
  )
}

interface EmailFilterRuleValueInputProps {
  rule: EmailFilterRule
  definition: FieldDefinition
  onValueChange: (value: string | string[] | boolean) => void
  testId: string
}

const EmailFilterRuleValueInput: React.FC<EmailFilterRuleValueInputProps> = ({
  rule,
  definition,
  onValueChange,
  testId
}) => {
  if (definition.valueKind === 'boolean') {
    const checked = typeof rule.value === 'boolean' ? rule.value : true
    return (
      <div className="gba:flex gba:items-center gba:gap-2 gba:h-8">
        <Switch checked={checked} onCheckedChange={next => onValueChange(Boolean(next))} data-testid={testId} />
        <span className="gba:text-xs gba:text-muted-foreground">{checked ? 'true' : 'false'}</span>
      </div>
    )
  }

  if (rule.op === 'in') {
    const list = Array.isArray(rule.value) ? rule.value : []
    const text = list.join(', ')
    return (
      <Input
        value={text}
        onChange={e =>
          onValueChange(
            e.target.value
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
          )
        }
        placeholder="value1, value2"
        className="gba:h-8 gba:text-xs gba:bg-background"
        data-testid={testId}
      />
    )
  }

  const text = typeof rule.value === 'string' ? rule.value : ''
  return (
    <Input
      value={text}
      onChange={e => onValueChange(e.target.value)}
      placeholder={definition.placeholder}
      className="gba:h-8 gba:text-xs gba:bg-background"
      data-testid={testId}
    />
  )
}
