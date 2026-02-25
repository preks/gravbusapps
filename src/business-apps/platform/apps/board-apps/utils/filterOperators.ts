/**
 * Filter operator definitions per column type.
 * Maps each BoardColumnType to its available operators with human-readable labels.
 */

import type { BoardColumnType, ViewFilterOperator } from '../types'

export interface OperatorDef {
  value: ViewFilterOperator
  label: string
  needsValue: boolean
  needsSecondValue?: boolean
}

const COMMON_EMPTY: OperatorDef[] = [
  { value: 'is_empty', label: 'is empty', needsValue: false },
  { value: 'is_not_empty', label: 'is not empty', needsValue: false }
]

const TEXT_OPS: OperatorDef[] = [
  { value: 'contains', label: 'contains', needsValue: true },
  { value: 'not_contains', label: 'does not contain', needsValue: true },
  { value: 'equals', label: 'is', needsValue: true },
  { value: 'not_equals', label: 'is not', needsValue: true },
  { value: 'starts_with', label: 'starts with', needsValue: true },
  { value: 'ends_with', label: 'ends with', needsValue: true },
  ...COMMON_EMPTY
]

const NUMBER_OPS: OperatorDef[] = [
  { value: 'equals', label: '=', needsValue: true },
  { value: 'not_equals', label: '≠', needsValue: true },
  { value: 'greater', label: '>', needsValue: true },
  { value: 'less', label: '<', needsValue: true },
  { value: 'greater_or_equal', label: '≥', needsValue: true },
  { value: 'less_or_equal', label: '≤', needsValue: true },
  { value: 'between', label: 'between', needsValue: true, needsSecondValue: true },
  ...COMMON_EMPTY
]

const DATE_OPS: OperatorDef[] = [
  { value: 'equals', label: 'is', needsValue: true },
  { value: 'is_before', label: 'is before', needsValue: true },
  { value: 'is_after', label: 'is after', needsValue: true },
  { value: 'between', label: 'is between', needsValue: true, needsSecondValue: true },
  { value: 'is_today', label: 'is today', needsValue: false },
  { value: 'is_this_week', label: 'is this week', needsValue: false },
  { value: 'is_this_month', label: 'is this month', needsValue: false },
  ...COMMON_EMPTY
]

const SELECT_OPS: OperatorDef[] = [
  { value: 'equals', label: 'is', needsValue: true },
  { value: 'not_equals', label: 'is not', needsValue: true },
  { value: 'in', label: 'is any of', needsValue: true },
  { value: 'not_in', label: 'is none of', needsValue: true },
  ...COMMON_EMPTY
]

const BOOLEAN_OPS: OperatorDef[] = [
  { value: 'is_true', label: 'is checked', needsValue: false },
  { value: 'is_false', label: 'is not checked', needsValue: false }
]

const MULTI_OPS: OperatorDef[] = [
  { value: 'in', label: 'has any of', needsValue: true },
  { value: 'not_in', label: 'has none of', needsValue: true },
  { value: 'contains', label: 'contains', needsValue: true },
  ...COMMON_EMPTY
]

const TYPE_MAP: Record<string, OperatorDef[]> = {
  text: TEXT_OPS,
  email: TEXT_OPS,
  phone: TEXT_OPS,
  url: TEXT_OPS,
  link: TEXT_OPS,
  number: NUMBER_OPS,
  currency: NUMBER_OPS,
  percentage: NUMBER_OPS,
  rating: NUMBER_OPS,
  progress: NUMBER_OPS,
  date: DATE_OPS,
  datetime: DATE_OPS,
  select: SELECT_OPS,
  status: SELECT_OPS,
  multiselect: MULTI_OPS,
  tags: MULTI_OPS,
  boolean: BOOLEAN_OPS,
  people: MULTI_OPS,
  relation: MULTI_OPS
}

export function getOperatorsForType(type: BoardColumnType): OperatorDef[] {
  return TYPE_MAP[type] || TEXT_OPS
}

export function getOperatorDef(type: BoardColumnType, op: ViewFilterOperator): OperatorDef | undefined {
  return getOperatorsForType(type).find(o => o.value === op)
}

export function getDefaultOperator(type: BoardColumnType): ViewFilterOperator {
  const ops = getOperatorsForType(type)
  return ops[0]?.value || 'contains'
}
