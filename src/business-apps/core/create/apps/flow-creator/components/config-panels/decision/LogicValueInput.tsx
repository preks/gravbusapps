import React from 'react'
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import type { OperatorId, ValueType } from './decisionConfigUtils'
import {
  normalizeDatetimeLocal,
  quoteSingle,
  stripQuotes,
  stripTaskExpertPrefixForDisplay
} from './decisionConfigUtils'

interface LogicValueInputProps {
  valueType: ValueType
  rhs: string
  lhs: string
  activeOpId: OperatorId
  testId: string
  index: number
  stringEnumOptionsByExpression?: Record<string, string[]>
  valuePlaceholder: string
  onChangeExpr: (nextExpr: string) => void
  buildConditionExpression: (lhs: string, opId: OperatorId, rhs: string) => string
}

export const LogicValueInput: React.FC<LogicValueInputProps> = ({
  valueType,
  rhs,
  lhs,
  activeOpId,
  testId,
  index,
  stringEnumOptionsByExpression,
  valuePlaceholder,
  onChangeExpr,
  buildConditionExpression
}) => {
  if (valueType === 'boolean') {
    return (
      <Select value={rhs || 'true'} onValueChange={v => onChangeExpr(buildConditionExpression(lhs, activeOpId, v))}>
        <SelectTrigger className="gba:h-8 gba:text-xs gba:bg-background" data-testid={`${testId}-logic-value-${index}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">true</SelectItem>
          <SelectItem value="false">false</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  if (valueType === 'date') {
    return (
      <Input
        type="date"
        value={stripQuotes(rhs).slice(0, 10)}
        onChange={e => {
          const raw = String(e.target.value || '').trim()
          onChangeExpr(buildConditionExpression(lhs, activeOpId, raw ? quoteSingle(raw) : ''))
        }}
        className="gba:h-8 gba:text-xs gba:bg-background"
        data-testid={`${testId}-logic-value-${index}`}
      />
    )
  }

  if (valueType === 'datetime') {
    const rawDt = stripQuotes(rhs)
    const dtValue = normalizeDatetimeLocal(rawDt)
    return (
      <Input
        type="datetime-local"
        value={dtValue}
        onChange={e => {
          const raw = String(e.target.value || '').trim()
          onChangeExpr(buildConditionExpression(lhs, activeOpId, raw ? quoteSingle(raw) : ''))
        }}
        className="gba:h-8 gba:text-xs gba:bg-background"
        data-testid={`${testId}-logic-value-${index}`}
      />
    )
  }

  const enumOptions = valueType === 'string' ? stringEnumOptionsByExpression?.[String(lhs || '').trim()] : undefined
  if (Array.isArray(enumOptions) && enumOptions.length > 0) {
    const NONE = '__none__'
    const raw = stripQuotes(rhs)
    const value = raw || NONE
    const options = raw && !enumOptions.includes(raw) ? [raw, ...enumOptions] : enumOptions
    return (
      <Select
        value={value}
        onValueChange={v => onChangeExpr(buildConditionExpression(lhs, activeOpId, v === NONE ? '' : quoteSingle(v)))}
      >
        <SelectTrigger className="gba:h-8 gba:text-xs gba:bg-background" data-testid={`${testId}-logic-value-${index}`}>
          <SelectValue placeholder={valuePlaceholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>—</SelectItem>
          {options.map(opt => (
            <SelectItem key={opt} value={opt}>
              {stripTaskExpertPrefixForDisplay(opt)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <Input
      value={rhs}
      onChange={e => onChangeExpr(buildConditionExpression(lhs, activeOpId, e.target.value))}
      placeholder={valueType === 'number' ? 'e.g. 1000' : valuePlaceholder}
      className="gba:h-8 gba:text-xs gba:bg-background"
      data-testid={`${testId}-logic-value-${index}`}
    />
  )
}
