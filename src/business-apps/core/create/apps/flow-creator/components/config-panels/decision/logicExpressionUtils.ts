import type { OperatorId } from './decisionConfigUtils'

export function opIdToSymbol(id: OperatorId): string {
  switch (id) {
    case 'eq':
      return '=='
    case 'neq':
      return '!='
    case 'gt':
      return '>'
    case 'gte':
      return '>='
    case 'lt':
      return '<'
    case 'lte':
      return '<='
    default:
      return '=='
  }
}

export function symbolToOpId(symbol: string): OperatorId {
  switch (symbol) {
    case '==':
      return 'eq'
    case '!=':
      return 'neq'
    case '>':
      return 'gt'
    case '>=':
      return 'gte'
    case '<':
      return 'lt'
    case '<=':
      return 'lte'
    default:
      return 'eq'
  }
}

export function parseConditionExpression(expression: string): { lhs: string; opId: OperatorId; rhs: string } {
  const raw = String(expression || '').trim()
  if (!raw) return { lhs: '', opId: 'eq', rhs: '' }

  // Basic comparisons: {{lhs}} <op> rhs
  const cmp = /^\s*\{\{([^}]*)\}\}\s*(==|!=|>=|<=|>|<)\s*(.*)/.exec(raw)
  if (cmp) {
    return {
      lhs: (cmp[1] || '').trim(),
      opId: symbolToOpId(String(cmp[2] || '==').trim()),
      rhs: (cmp[3] || '').trim()
    }
  }

  // String contains / startsWith / endsWith
  const contains = /^String\(\s*\{\{([^}]*)\}\}\s*\|\|\s*''\s*\)\.includes\(([^)]*)\)\s*$/.exec(raw)
  if (contains) return { lhs: (contains[1] || '').trim(), opId: 'contains', rhs: (contains[2] || '').trim() }

  const notContains = /^!String\(\s*\{\{([^}]*)\}\}\s*\|\|\s*''\s*\)\.includes\(([^)]*)\)\s*$/.exec(raw)
  if (notContains)
    return { lhs: (notContains[1] || '').trim(), opId: 'not_contains', rhs: (notContains[2] || '').trim() }

  const startsWith = /^String\(\s*\{\{([^}]*)\}\}\s*\|\|\s*''\s*\)\.startsWith\(([^)]*)\)\s*$/.exec(raw)
  if (startsWith) return { lhs: (startsWith[1] || '').trim(), opId: 'starts_with', rhs: (startsWith[2] || '').trim() }

  const endsWith = /^String\(\s*\{\{([^}]*)\}\}\s*\|\|\s*''\s*\)\.endsWith\(([^)]*)\)\s*$/.exec(raw)
  if (endsWith) return { lhs: (endsWith[1] || '').trim(), opId: 'ends_with', rhs: (endsWith[2] || '').trim() }

  return { lhs: '', opId: 'eq', rhs: '' }
}

export function buildConditionExpression(lhs: string, opId: OperatorId, rhs: string): string {
  const cleanLhs = String(lhs || '').trim()
  const cleanRhs = String(rhs || '').trim()
  if (!cleanLhs) return ''

  if (opId === 'contains') {
    return `String({{${cleanLhs}}} || '').includes(${cleanRhs || "''"})`
  }
  if (opId === 'not_contains') {
    return `!String({{${cleanLhs}}} || '').includes(${cleanRhs || "''"})`
  }
  if (opId === 'starts_with') {
    return `String({{${cleanLhs}}} || '').startsWith(${cleanRhs || "''"})`
  }
  if (opId === 'ends_with') {
    return `String({{${cleanLhs}}} || '').endsWith(${cleanRhs || "''"})`
  }

  const symbol = opIdToSymbol(opId)
  if (!cleanRhs) return `{{${cleanLhs}}} ${symbol} `
  return `{{${cleanLhs}}} ${symbol} ${cleanRhs}`
}
