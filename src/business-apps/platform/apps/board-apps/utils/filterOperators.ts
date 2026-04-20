/**
 * Filter operator definitions per column type.
 * Maps each BoardColumnType to its available operators with human-readable labels.
 */

import type { BoardColumnType, ViewFilterOperator } from '../types'

type TranslateFn = (key: string, args?: Record<string, unknown>) => string

export interface OperatorDef {
  value: ViewFilterOperator
  label: string
  needsValue: boolean
  needsSecondValue?: boolean
}

function buildCommonEmpty(t: TranslateFn): OperatorDef[] {
  return [
    { value: 'is_empty', label: t('filter-op-is-empty'), needsValue: false },
    { value: 'is_not_empty', label: t('filter-op-is-not-empty'), needsValue: false }
  ]
}

function buildTextOps(t: TranslateFn): OperatorDef[] {
  return [
    { value: 'contains', label: t('filter-op-contains'), needsValue: true },
    { value: 'not_contains', label: t('filter-op-does-not-contain'), needsValue: true },
    { value: 'equals', label: t('filter-op-is'), needsValue: true },
    { value: 'not_equals', label: t('filter-op-is-not'), needsValue: true },
    { value: 'starts_with', label: t('filter-op-starts-with'), needsValue: true },
    { value: 'ends_with', label: t('filter-op-ends-with'), needsValue: true },
    ...buildCommonEmpty(t)
  ]
}

function buildNumberOps(t: TranslateFn): OperatorDef[] {
  return [
    { value: 'equals', label: '=', needsValue: true },
    { value: 'not_equals', label: '≠', needsValue: true },
    { value: 'greater', label: '>', needsValue: true },
    { value: 'less', label: '<', needsValue: true },
    { value: 'greater_or_equal', label: '≥', needsValue: true },
    { value: 'less_or_equal', label: '≤', needsValue: true },
    { value: 'between', label: t('filter-op-between'), needsValue: true, needsSecondValue: true },
    ...buildCommonEmpty(t)
  ]
}

function buildDateOps(t: TranslateFn): OperatorDef[] {
  return [
    { value: 'equals', label: t('filter-op-is'), needsValue: true },
    { value: 'is_before', label: t('filter-op-is-before'), needsValue: true },
    { value: 'is_after', label: t('filter-op-is-after'), needsValue: true },
    { value: 'between', label: t('filter-op-is-between'), needsValue: true, needsSecondValue: true },
    { value: 'is_today', label: t('filter-op-is-today'), needsValue: false },
    { value: 'is_this_week', label: t('filter-op-is-this-week'), needsValue: false },
    { value: 'is_this_month', label: t('filter-op-is-this-month'), needsValue: false },
    ...buildCommonEmpty(t)
  ]
}

function buildSelectOps(t: TranslateFn): OperatorDef[] {
  return [
    { value: 'equals', label: t('filter-op-is'), needsValue: true },
    { value: 'not_equals', label: t('filter-op-is-not'), needsValue: true },
    { value: 'in', label: t('filter-op-is-any-of'), needsValue: true },
    { value: 'not_in', label: t('filter-op-is-none-of'), needsValue: true },
    ...buildCommonEmpty(t)
  ]
}

function buildBooleanOps(t: TranslateFn): OperatorDef[] {
  return [
    { value: 'is_true', label: t('filter-op-is-checked'), needsValue: false },
    { value: 'is_false', label: t('filter-op-is-not-checked'), needsValue: false }
  ]
}

function buildMultiOps(t: TranslateFn): OperatorDef[] {
  return [
    { value: 'in', label: t('filter-op-has-any-of'), needsValue: true },
    { value: 'not_in', label: t('filter-op-has-none-of'), needsValue: true },
    { value: 'contains', label: t('filter-op-contains'), needsValue: true },
    ...buildCommonEmpty(t)
  ]
}

export function getOperatorsForType(t: TranslateFn, type: BoardColumnType): OperatorDef[] {
  const textOps = buildTextOps(t)
  const numberOps = buildNumberOps(t)
  const dateOps = buildDateOps(t)
  const selectOps = buildSelectOps(t)
  const multiOps = buildMultiOps(t)
  const typeMap: Record<string, OperatorDef[]> = {
    text: textOps,
    email: textOps,
    phone: textOps,
    url: textOps,
    link: textOps,
    number: numberOps,
    currency: numberOps,
    percentage: numberOps,
    rating: numberOps,
    progress: numberOps,
    date: dateOps,
    datetime: dateOps,
    select: selectOps,
    status: selectOps,
    multiselect: multiOps,
    tags: multiOps,
    boolean: buildBooleanOps(t),
    people: multiOps,
    relation: multiOps
  }
  return typeMap[type] || textOps
}

export function getOperatorDef(t: TranslateFn, type: BoardColumnType, op: ViewFilterOperator): OperatorDef | undefined {
  return getOperatorsForType(t, type).find(o => o.value === op)
}

export function getDefaultOperator(t: TranslateFn, type: BoardColumnType): ViewFilterOperator {
  const ops = getOperatorsForType(t, type)
  return ops[0]?.value || 'contains'
}
