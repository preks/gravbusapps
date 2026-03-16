/**
 * Formula Evaluator
 *
 * Evaluates Excel-like formulas in spreadsheet cells.
 * Supports basic arithmetic, cell references, and common Excel functions.
 */

/**
 * Context for formula evaluation
 */
export interface FormulaContext {
  row: Record<string, unknown>
  allRows: Record<string, unknown>[]
  columns: Array<{ name: string; id: string }>
  currentRowIndex: number
}

/**
 * Evaluate a formula string
 * @param formula - Formula string (e.g., "=A1+B2", "=SUM(A1:A10)", "=price*quantity")
 * @param context - Evaluation context with row data and column info
 * @returns Evaluated result
 */
export function evaluateFormula(formula: string, context: FormulaContext): unknown {
  if (!formula || typeof formula !== 'string') {
    return null
  }

  const cleanFormula = formula.trim().startsWith('=') ? formula.trim().slice(1).trim() : formula.trim()

  if (!cleanFormula) {
    return null
  }

  try {
    return evaluateExpression(cleanFormula, context)
  } catch (error) {
    console.error('Formula evaluation error:', error, 'Formula:', formula)
    return '#ERROR!'
  }
}

/**
 * Check if a value is a formula
 */
export function isFormula(value: unknown): boolean {
  return typeof value === 'string' && value.trim().startsWith('=')
}

function evaluateExpression(expr: string, context: FormulaContext): unknown {
  const normalizedExpr = expr.trim()
  if (!normalizedExpr) {
    return null
  }

  const literalValue = getQuotedLiteral(normalizedExpr)
  if (literalValue !== null) {
    return literalValue
  }

  const functionCall = parseFunctionCall(normalizedExpr)
  if (functionCall) {
    return evaluateFunction(functionCall.name, functionCall.args, context)
  }

  const cellReferenceValue = getCellReferenceValue(normalizedExpr, context)
  if (cellReferenceValue.found) {
    return cellReferenceValue.value
  }

  const columnReferenceValue = getCurrentRowColumnValue(normalizedExpr, context)
  if (columnReferenceValue.found) {
    return columnReferenceValue.value
  }

  return evaluateArithmetic(normalizedExpr, context)
}

function getQuotedLiteral(expr: string): string | null {
  const quotedLiteral = /^"(.*)"$/.exec(expr)
  return quotedLiteral ? quotedLiteral[1] : null
}

function parseFunctionCall(expr: string): { name: string; args: string } | null {
  const functionMatch = /^([A-Z]+)\s*\((.*)\)$/i.exec(expr)
  if (!functionMatch) return null
  return {
    name: functionMatch[1].toUpperCase(),
    args: functionMatch[2]
  }
}

function getCellReferenceValue(
  expr: string,
  context: FormulaContext
): {
  found: boolean
  value: unknown
} {
  const cellRef = parseCellReference(expr, context)
  if (!cellRef) {
    return { found: false, value: null }
  }

  const { colIndex, rowIndex } = cellRef
  if (rowIndex < 0 || rowIndex >= context.allRows.length || colIndex < 0 || colIndex >= context.columns.length) {
    return { found: true, value: null }
  }

  const row = context.allRows[rowIndex]
  const col = context.columns[colIndex]
  return { found: true, value: getRowValueByColumn(row, col.name, col.id) }
}

function getCurrentRowColumnValue(
  expr: string,
  context: FormulaContext
): {
  found: boolean
  value: unknown
} {
  const col = context.columns.find(
    c => c.name.toLowerCase() === expr.toLowerCase() || c.id.toLowerCase() === expr.toLowerCase()
  )
  if (!col) {
    return { found: false, value: null }
  }

  return {
    found: true,
    value: context.row[col.name] ?? context.row[col.id]
  }
}

function getRowValueByColumn(row: Record<string, unknown>, colName: string, colId: string): unknown {
  let value = row[colName]
  if (value === undefined) value = row[colId]
  if (value !== undefined) return value

  const rowKeys = Object.keys(row)
  const matchingKey = rowKeys.find(key => {
    const lowerKey = key.toLowerCase()
    return lowerKey === colName.toLowerCase() || lowerKey === colId.toLowerCase()
  })

  return matchingKey ? row[matchingKey] : undefined
}

function evaluateFunction(name: string, args: string, context: FormulaContext): unknown {
  switch (name) {
    case 'SUM':
      return sumFunction(args, context)
    case 'AVERAGE':
    case 'AVG':
      return averageFunction(args, context)
    case 'MAX':
      return maxFunction(args, context)
    case 'MIN':
      return minFunction(args, context)
    case 'COUNT':
      return countFunction(args, context)
    case 'IF':
      return ifFunction(args, context)
    case 'SUMIF':
      return sumIfFunction(args, context)
    default:
      throw new Error(`Unknown function: ${name}`)
  }
}

function sumFunction(args: string, context: FormulaContext): number {
  const values = parseFunctionArgs(args, context)
  const result = values.reduce((sum, val) => {
    const num = toNumber(val)
    return sum + (Number.isNaN(num) ? 0 : num)
  }, 0)
  return result
}

function averageFunction(args: string, context: FormulaContext): number {
  const values = parseFunctionArgs(args, context)
  const numbers = values.map(toNumber).filter(n => !Number.isNaN(n))
  if (numbers.length === 0) return 0
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length
}

function maxFunction(args: string, context: FormulaContext): number {
  const values = parseFunctionArgs(args, context)
  const numbers = values.map(toNumber).filter(n => !Number.isNaN(n))
  if (numbers.length === 0) return 0
  return Math.max(...numbers)
}

function minFunction(args: string, context: FormulaContext): number {
  const values = parseFunctionArgs(args, context)
  const numbers = values.map(toNumber).filter(n => !Number.isNaN(n))
  if (numbers.length === 0) return 0
  return Math.min(...numbers)
}

function countFunction(args: string, context: FormulaContext): number {
  const values = parseFunctionArgs(args, context)
  return values.filter(v => v !== null && v !== undefined && v !== '').length
}

function ifFunction(args: string, context: FormulaContext): unknown {
  const parts = splitFunctionArgs(args)
  if (parts.length < 3) {
    throw new Error('IF function requires 3 arguments')
  }

  const conditionExpr = parts[0].trim()
  const valueIfTrue = evaluateExpression(parts[1], context)
  const valueIfFalse = evaluateExpression(parts[2], context)

  const conditionValue = evaluateCondition(conditionExpr, context)
  return conditionValue ? valueIfTrue : valueIfFalse
}

function sumIfFunction(args: string, context: FormulaContext): number {
  const parts = splitFunctionArgs(args)
  if (parts.length < 2) {
    throw new Error('SUMIF function requires at least 2 arguments')
  }

  const criteriaRangeRef = parts[0].trim()
  const criteriaRaw = parts[1].trim()
  const sumRangeRef = (parts[2] ?? criteriaRangeRef).trim()

  const criteriaValues = resolveRangeExpression(criteriaRangeRef, context)
  const sumValues = resolveRangeExpression(sumRangeRef, context)

  if (criteriaValues.length === 0 || sumValues.length === 0) return 0

  const rowCount = Math.min(criteriaValues.length, sumValues.length)
  let total = 0
  for (let i = 0; i < rowCount; i++) {
    if (matchesCriteria(criteriaValues[i], criteriaRaw, context)) {
      const num = toNumber(sumValues[i])
      if (!Number.isNaN(num)) total += num
    }
  }
  return total
}

function resolveRangeExpression(rangeExpr: string, context: FormulaContext): unknown[] {
  const trimmed = rangeExpr.trim()
  const rangeMatch = /^(.+):(.+)$/.exec(trimmed)
  if (rangeMatch) {
    return getRangeValues(rangeMatch[1].trim(), rangeMatch[2].trim(), context)
  }
  return getRangeValues(trimmed, trimmed, context)
}

function evaluateCondition(expr: string, context: FormulaContext): boolean {
  const resolved = replaceCellReferences(expr, context)

  const comparisonResult = findComparisonResult(resolved)
  if (comparisonResult !== null) {
    return comparisonResult
  }

  const value = evaluateArithmetic(resolved, context)
  return toBoolean(value)
}

function findComparisonResult(expr: string): boolean | null {
  const comparisons = [
    { pattern: />=/g, fn: (a: number, b: number) => a >= b },
    { pattern: /<=/g, fn: (a: number, b: number) => a <= b },
    { pattern: /<>/g, fn: (a: number, b: number) => a !== b },
    { pattern: /!=/g, fn: (a: number, b: number) => a !== b },
    { pattern: />/g, fn: (a: number, b: number) => a > b },
    { pattern: /</g, fn: (a: number, b: number) => a < b },
    { pattern: /=/g, fn: (a: number, b: number) => a === b }
  ]

  for (const comp of comparisons) {
    if (comp.pattern.test(expr)) {
      comp.pattern.lastIndex = 0
      const parts = expr.split(comp.pattern)
      if (parts.length === 2) {
        const left = toNumber(parts[0].trim())
        const right = toNumber(parts[1].trim())
        return comp.fn(left, right)
      }
    }
  }

  return null
}

function parseFunctionArgs(args: string, context: FormulaContext): unknown[] {
  const parts = splitFunctionArgs(args)
  const values: unknown[] = []

  for (const part of parts) {
    const trimmed = part.trim()

    const rangeMatch = /^([A-Z]+\d*|[a-z_][a-z\d_]*):([A-Z]+\d*|[a-z_][a-z\d_]*)$/i.exec(trimmed)
    if (rangeMatch) {
      const startRef = rangeMatch[1]
      const endRef = rangeMatch[2]
      const rangeValues = getRangeValues(startRef, endRef, context)
      values.push(...rangeValues)
    } else {
      const value = evaluateExpression(trimmed, context)
      values.push(value)
    }
  }

  return values
}

function splitFunctionArgs(args: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0

  for (let i = 0; i < args.length; i++) {
    const char = args[i]
    if (char === '(') {
      depth++
      current += char
    } else if (char === ')') {
      depth--
      current += char
    } else if (char === ',' && depth === 0) {
      parts.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  if (current.trim()) {
    parts.push(current.trim())
  }

  return parts
}

function getRangeValues(startRef: string, endRef: string, context: FormulaContext): unknown[] {
  if (startRef === endRef) {
    const singleRange = getSingleRangeValues(startRef, context)
    if (singleRange) return singleRange
  }

  if (isExcelStyleColumnRef(startRef) && isExcelStyleColumnRef(endRef)) {
    return getExcelColumnRangeValues(startRef, endRef, context)
  }

  if (isExcelStyleCellRef(startRef) && isExcelStyleCellRef(endRef)) {
    return getExcelRangeValues(startRef, endRef, context)
  }

  const byColumnRange = getColumnRangeValues(startRef, endRef, context)
  if (byColumnRange) return byColumnRange

  return getFallbackCellRangeValues(startRef, endRef, context) || []
}

function isExcelStyleCellRef(ref: string): boolean {
  return /^[A-Z]+\d+$/i.test(ref)
}

function isExcelStyleColumnRef(ref: string): boolean {
  return /^[A-Z]+$/i.test(ref)
}

function getSingleRangeValues(ref: string, context: FormulaContext): unknown[] | null {
  const columnByNameOrId = context.columns.find(
    c => c.name.toLowerCase() === ref.toLowerCase() || c.id.toLowerCase() === ref.toLowerCase()
  )
  if (columnByNameOrId) {
    return context.allRows.map(row => row[columnByNameOrId.name] ?? row[columnByNameOrId.id])
  }

  if (isExcelStyleColumnRef(ref)) {
    const colIndex = columnLetterToIndex(ref)
    if (colIndex < 0 || colIndex >= context.columns.length) return null
    const column = context.columns[colIndex]
    return context.allRows.map(row => row[column.name] ?? row[column.id])
  }

  return null
}

function getExcelColumnRangeValues(startRef: string, endRef: string, context: FormulaContext): unknown[] {
  const startCol = columnLetterToIndex(startRef)
  const endCol = columnLetterToIndex(endRef)
  return collectValuesFromRect({
    startCol,
    endCol,
    startRow: 0,
    endRow: Math.max(0, context.allRows.length - 1),
    context
  })
}

function collectValuesFromRect(params: {
  startCol: number
  endCol: number
  startRow: number
  endRow: number
  context: FormulaContext
}): unknown[] {
  const { context } = params
  const values: unknown[] = []

  const minRow = Math.min(params.startRow, params.endRow)
  const maxRow = Math.max(params.startRow, params.endRow)
  const minCol = Math.min(params.startCol, params.endCol)
  const maxCol = Math.max(params.startCol, params.endCol)

  for (let rowIdx = minRow; rowIdx <= maxRow; rowIdx++) {
    if (rowIdx < 0 || rowIdx >= context.allRows.length) continue
    const row = context.allRows[rowIdx]
    for (let colIdx = minCol; colIdx <= maxCol; colIdx++) {
      if (colIdx < 0 || colIdx >= context.columns.length) continue
      const col = context.columns[colIdx]
      values.push(row[col.name] ?? row[col.id])
    }
  }

  return values
}

function getExcelRangeValues(startRef: string, endRef: string, context: FormulaContext): unknown[] {
  const startCell = parseCellReference(startRef, context)
  const endCell = parseCellReference(endRef, context)
  if (!startCell || !endCell) return []

  return collectValuesFromRect({
    startCol: startCell.colIndex,
    endCol: endCell.colIndex,
    startRow: startCell.rowIndex,
    endRow: endCell.rowIndex,
    context
  })
}

function getColumnRangeValues(startRef: string, endRef: string, context: FormulaContext): unknown[] | null {
  const startCol = context.columns.find(
    c => c.name.toLowerCase() === startRef.toLowerCase() || c.id.toLowerCase() === startRef.toLowerCase()
  )
  const endCol = context.columns.find(
    c => c.name.toLowerCase() === endRef.toLowerCase() || c.id.toLowerCase() === endRef.toLowerCase()
  )
  if (!startCol || !endCol) return null

  const startIdx = context.columns.findIndex(c => c.id === startCol.id)
  const endIdx = context.columns.findIndex(c => c.id === endCol.id)
  const minIdx = Math.min(startIdx, endIdx)
  const maxIdx = Math.max(startIdx, endIdx)

  const values: unknown[] = []
  for (const row of context.allRows) {
    for (let i = minIdx; i <= maxIdx; i++) {
      if (i < 0 || i >= context.columns.length) continue
      const col = context.columns[i]
      values.push(row[col.name] ?? row[col.id])
    }
  }
  return values
}

function getFallbackCellRangeValues(startRef: string, endRef: string, context: FormulaContext): unknown[] | null {
  const startCell = parseCellReference(startRef, context)
  const endCell = parseCellReference(endRef, context)
  if (!startCell || !endCell) return null

  return collectValuesFromRect({
    startCol: startCell.colIndex,
    endCol: endCell.colIndex,
    startRow: startCell.rowIndex,
    endRow: endCell.rowIndex,
    context
  })
}

function parseCellReference(ref: string, context: FormulaContext): { colIndex: number; rowIndex: number } | null {
  const excelMatch = /^([A-Z]+)(\d+)$/i.exec(ref)
  if (excelMatch) {
    const colLetter = excelMatch[1].toUpperCase()
    const rowNum = Number.parseInt(excelMatch[2], 10) - 1

    let colIndex = 0
    for (let i = 0; i < colLetter.length; i++) {
      colIndex = colIndex * 26 + ((colLetter.codePointAt(i) ?? 0) - 64)
    }
    colIndex -= 1

    if (colIndex < 0 || colIndex >= context.columns.length) {
      return null
    }
    if (rowNum < 0 || rowNum >= context.allRows.length) {
      return null
    }

    return { colIndex, rowIndex: rowNum }
  }

  const col = context.columns.find(
    c => c.name.toLowerCase() === ref.toLowerCase() || c.id.toLowerCase() === ref.toLowerCase()
  )
  if (col) {
    const colIndex = context.columns.findIndex(c => c.id === col.id)
    return { colIndex, rowIndex: context.currentRowIndex }
  }
  return null
}

function evaluateArithmetic(expr: string, context: FormulaContext): unknown {
  expr = replaceCellReferences(expr, context)

  while (expr.includes('(')) {
    const match = /\(([^()]+)\)/.exec(expr)
    if (!match) break

    const innerExpr = match[1]
    const innerResult = evaluateArithmetic(innerExpr, context)
    expr = expr.replace(match[0], String(innerResult))
  }

  const tokens = tokenizeExpression(expr)
  if (tokens.length === 0) return 0

  return evaluateTokens(tokens)
}

function tokenizeExpression(expr: string): Array<string | number> {
  const tokens: Array<string | number> = []
  let current = ''

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i]

    if (char === ' ') {
      continue
    }

    if (['+', '-', '*', '/'].includes(char)) {
      if (char === '-' && (tokens.length === 0 || typeof tokens[tokens.length - 1] === 'string')) {
        current += char
        continue
      }

      if (current) {
        const num = Number.parseFloat(current)
        tokens.push(Number.isNaN(num) ? 0 : num)
        current = ''
      }
      tokens.push(char)
    } else {
      current += char
    }
  }

  if (current) {
    const num = Number.parseFloat(current)
    tokens.push(Number.isNaN(num) ? 0 : num)
  }

  return tokens
}

function evaluateTokens(tokens: Array<string | number>): number {
  if (tokens.length === 0) return 0
  if (tokens.length === 1) return typeof tokens[0] === 'number' ? tokens[0] : 0

  const afterMulDiv = applyMultiplicationAndDivision(tokens)
  return applyAdditionAndSubtraction(afterMulDiv)
}

function applyMultiplicationAndDivision(tokens: Array<string | number>): Array<string | number> {
  const result: Array<string | number> = []
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const prev = result[result.length - 1]

    if (token === '*' || token === '/') {
      const left = typeof prev === 'number' ? prev : 0
      const right = typeof tokens[i + 1] === 'number' ? (tokens[i + 1] as number) : 0
      result.pop()

      if (token === '*') {
        result.push(left * right)
      } else {
        result.push(right !== 0 ? left / right : 0)
      }
      i++
    } else {
      result.push(token)
    }
  }
  return result
}

function applyAdditionAndSubtraction(tokens: Array<string | number>): number {
  let result = typeof tokens[0] === 'number' ? tokens[0] : 0
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i]
    const right = typeof tokens[i + 1] === 'number' ? (tokens[i + 1] as number) : 0

    if (op === '+') {
      result += right
    } else if (op === '-') {
      result -= right
    }
  }
  return result
}

function replaceColumnToken(
  expr: string,
  token: string,
  col: { name: string; id: string },
  row: Record<string, unknown>
): string {
  const regex = new RegExp(String.raw`\b${escapeRegex(token)}\b`, 'gi')
  return expr.replaceAll(regex, () => {
    const value = row[col.name] ?? row[col.id]
    return String(value ?? 0)
  })
}

function replaceCellReferences(expr: string, context: FormulaContext): string {
  expr = expr.replaceAll(/\b([A-Z]+)(\d+)\b/gi, (_match, colLetter: string, rowNum: string) => {
    const colIndex = columnLetterToIndex(colLetter)
    const rowIndex = Number.parseInt(rowNum, 10) - 1

    if (rowIndex >= 0 && rowIndex < context.allRows.length && colIndex >= 0 && colIndex < context.columns.length) {
      const col = context.columns[colIndex]
      const value = context.allRows[rowIndex][col.name] ?? context.allRows[rowIndex][col.id]
      return String(value ?? 0)
    }
    return '0'
  })

  for (const col of context.columns) {
    expr = replaceColumnToken(expr, col.name, col, context.row)
    if (col.id && col.id !== col.name) {
      expr = replaceColumnToken(expr, col.id, col, context.row)
    }
  }

  return expr
}

function matchesCriteria(value: unknown, criteriaRaw: string, context: FormulaContext): boolean {
  const parsedCriterion = parseCriteriaToken(criteriaRaw, context)
  const operatorMatch = typeof parsedCriterion === 'string' ? /^(<=|>=|<>|=|<|>)(.*)$/.exec(parsedCriterion) : null

  if (!operatorMatch) {
    return compareWithoutOperator(value, parsedCriterion)
  }

  const operator = operatorMatch[1]
  const operandRaw = operatorMatch[2].trim()
  return compareWithOperator(value, operator, operandRaw)
}

function compareWithoutOperator(value: unknown, parsedCriterion: string | number): boolean {
  if (typeof parsedCriterion === 'number') {
    return toNumber(value) === parsedCriterion
  }

  return normalizedString(value) === normalizedString(parsedCriterion)
}

function compareWithOperator(value: unknown, operator: string, operandRaw: string): boolean {
  const operandMaybeNumber = Number(operandRaw)
  const operandIsNumber = operandRaw !== '' && Number.isFinite(operandMaybeNumber)

  if (operator === '=') {
    if (operandIsNumber) {
      return toNumber(value) === operandMaybeNumber
    }
    return normalizedString(value) === normalizedString(operandRaw)
  }

  if (operator === '<>') {
    if (operandIsNumber) {
      return toNumber(value) !== operandMaybeNumber
    }
    return normalizedString(value) !== normalizedString(operandRaw)
  }

  if (!operandIsNumber) return false

  const leftNumber = toNumber(value)
  const numericComparator: Record<string, (left: number, right: number) => boolean> = {
    '>': (left, right) => left > right,
    '>=': (left, right) => left >= right,
    '<': (left, right) => left < right,
    '<=': (left, right) => left <= right
  }

  const comparator = numericComparator[operator]
  return comparator ? comparator(leftNumber, operandMaybeNumber) : false
}

function normalizedString(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
}

function parseCriteriaToken(criteriaRaw: string, context: FormulaContext): string | number {
  const trimmed = criteriaRaw.trim()
  const quoted = /^"(.*)"$/.exec(trimmed)
  if (quoted) return quoted[1]
  const numberValue = Number(trimmed)
  if (Number.isFinite(numberValue)) return numberValue
  const evaluated = evaluateExpression(trimmed, context)
  if (typeof evaluated === 'number') return evaluated
  return String(evaluated ?? trimmed)
}

function columnLetterToIndex(letter: string): number {
  let index = 0
  const upper = letter.toUpperCase()
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + ((upper.codePointAt(i) ?? 0) - 64)
  }
  return index - 1
}

function escapeRegex(str: string): string {
  return str.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isNaN(value) ? 0 : value
  }
  if (typeof value === 'string') {
    const num = Number.parseFloat(value.replaceAll(/[^\d.-]/g, ''))
    return Number.isNaN(num) ? 0 : num
  }
  return 0
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim()
    if (lower === 'true' || lower === '1' || lower === 'yes') return true
    if (lower === 'false' || lower === '0' || lower === 'no') return false
    const num = Number.parseFloat(lower)
    if (!Number.isNaN(num)) return num !== 0
  }
  return Boolean(value)
}
