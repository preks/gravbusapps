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

  // Remove leading = if present
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

/**
 * Evaluate an expression (recursive)
 */
function evaluateExpression(expr: string, context: FormulaContext): unknown {
  // Remove whitespace
  expr = expr.trim()

  if (!expr) {
    return null
  }

  // Handle function calls (e.g., SUM(A1:A10), IF(A1>0, B1, C1))
  const functionMatch = expr.match(/^([A-Z]+)\s*\((.*)\)$/i)
  if (functionMatch) {
    const functionName = functionMatch[1].toUpperCase()
    const args = functionMatch[2]
    return evaluateFunction(functionName, args, context)
  }

  // Handle single cell references directly (e.g., A1, B2, or column names)
  const cellRef = parseCellReference(expr, context)
  if (cellRef) {
    const { colIndex, rowIndex } = cellRef
    if (rowIndex >= 0 && rowIndex < context.allRows.length && colIndex >= 0 && colIndex < context.columns.length) {
      const row = context.allRows[rowIndex]
      const col = context.columns[colIndex]
      const colName = col.name

      // Try multiple ways to get the value
      let value = row[colName]
      if (value === undefined) value = row[col.id]
      if (value === undefined) {
        const rowKeys = Object.keys(row)
        const matchingKey = rowKeys.find(
          key => key.toLowerCase() === colName.toLowerCase() || key.toLowerCase() === col.id.toLowerCase()
        )
        if (matchingKey) value = row[matchingKey]
      }

      // Return the value (even if undefined/null, let SUM handle it)
      return value
    }
    return null
  }

  // Check if it's a column name reference (for current row)
  const col = context.columns.find(
    c => c.name.toLowerCase() === expr.toLowerCase() || c.id.toLowerCase() === expr.toLowerCase()
  )
  if (col) {
    const value = context.row[col.name] ?? context.row[col.id]
    return value
  }

  // Handle arithmetic expressions
  return evaluateArithmetic(expr, context)
}

/**
 * Evaluate Excel functions
 */
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
    default:
      throw new Error(`Unknown function: ${name}`)
  }
}

/**
 * SUM function: SUM(A1:A10) or SUM(A1, B1, C1)
 */
function sumFunction(args: string, context: FormulaContext): number {
  const values = parseFunctionArgs(args, context)
  const result = values.reduce((sum, val) => {
    const num = toNumber(val)
    return sum + (isNaN(num) ? 0 : num)
  }, 0)
  return result
}

/**
 * AVERAGE function: AVERAGE(A1:A10) or AVERAGE(A1, B1, C1)
 */
function averageFunction(args: string, context: FormulaContext): number {
  const values = parseFunctionArgs(args, context)
  const numbers = values.map(toNumber).filter(n => !isNaN(n))
  if (numbers.length === 0) return 0
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length
}

/**
 * MAX function: MAX(A1:A10) or MAX(A1, B1, C1)
 */
function maxFunction(args: string, context: FormulaContext): number {
  const values = parseFunctionArgs(args, context)
  const numbers = values.map(toNumber).filter(n => !isNaN(n))
  if (numbers.length === 0) return 0
  return Math.max(...numbers)
}

/**
 * MIN function: MIN(A1:A10) or MIN(A1, B1, C1)
 */
function minFunction(args: string, context: FormulaContext): number {
  const values = parseFunctionArgs(args, context)
  const numbers = values.map(toNumber).filter(n => !isNaN(n))
  if (numbers.length === 0) return 0
  return Math.min(...numbers)
}

/**
 * COUNT function: COUNT(A1:A10) or COUNT(A1, B1, C1)
 */
function countFunction(args: string, context: FormulaContext): number {
  const values = parseFunctionArgs(args, context)
  return values.filter(v => v !== null && v !== undefined && v !== '').length
}

/**
 * IF function: IF(condition, value_if_true, value_if_false)
 */
function ifFunction(args: string, context: FormulaContext): unknown {
  const parts = splitFunctionArgs(args)
  if (parts.length < 3) {
    throw new Error('IF function requires 3 arguments')
  }

  const conditionExpr = parts[0].trim()
  const valueIfTrue = evaluateExpression(parts[1], context)
  const valueIfFalse = evaluateExpression(parts[2], context)

  // Evaluate condition - handle comparison operators
  const conditionValue = evaluateCondition(conditionExpr, context)
  return conditionValue ? valueIfTrue : valueIfFalse
}

/**
 * Evaluate a condition expression (e.g., "A1>10", "price<100", "quantity=5")
 */
function evaluateCondition(expr: string, context: FormulaContext): boolean {
  // Replace cell references first
  expr = replaceCellReferences(expr, context)

  // Check for comparison operators
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
      const parts = expr.split(comp.pattern)
      if (parts.length === 2) {
        const left = toNumber(parts[0].trim())
        const right = toNumber(parts[1].trim())
        return comp.fn(left, right)
      }
    }
  }

  // If no comparison operator, evaluate as boolean
  const value = evaluateArithmetic(expr, context)
  return toBoolean(value)
}

/**
 * Parse function arguments (handles ranges and individual cells)
 */
function parseFunctionArgs(args: string, context: FormulaContext): unknown[] {
  const parts = splitFunctionArgs(args)
  const values: unknown[] = []

  for (const part of parts) {
    const trimmed = part.trim()

    // Check for range (e.g., A1:A10)
    const rangeMatch = trimmed.match(/^([A-Z]+[0-9]*|[A-Za-z_][A-Za-z0-9_]*):([A-Z]+[0-9]*|[A-Za-z_][A-Za-z0-9_]*)$/i)
    if (rangeMatch) {
      const startRef = rangeMatch[1]
      const endRef = rangeMatch[2]
      const rangeValues = getRangeValues(startRef, endRef, context)
      values.push(...rangeValues)
    } else {
      // Single cell reference or value
      const value = evaluateExpression(trimmed, context)
      values.push(value)
    }
  }

  return values
}

/**
 * Split function arguments by comma, handling nested parentheses
 */
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

/**
 * Get values from a range (e.g., A1:A10 or price:quantity)
 */
function getRangeValues(startRef: string, endRef: string, context: FormulaContext): unknown[] {
  if (isExcelStyleCellRef(startRef) && isExcelStyleCellRef(endRef)) {
    return getExcelRangeValues(startRef, endRef, context)
  }

  const byColumnRange = getColumnRangeValues(startRef, endRef, context)
  if (byColumnRange) return byColumnRange

  return getFallbackCellRangeValues(startRef, endRef, context) || []
}

function isExcelStyleCellRef(ref: string): boolean {
  return /^[A-Z]+[0-9]+$/i.test(ref)
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

/**
 * Parse Excel-style cell reference (A1, B2, etc.) or column name
 */
function parseCellReference(ref: string, context: FormulaContext): { colIndex: number; rowIndex: number } | null {
  // Excel-style reference (A1, B2, etc.)
  const excelMatch = ref.match(/^([A-Z]+)([0-9]+)$/i)
  if (excelMatch) {
    const colLetter = excelMatch[1].toUpperCase()
    const rowNum = parseInt(excelMatch[2], 10) - 1 // Convert to 0-based index

    // Convert column letter to index (A=0, B=1, etc.)
    let colIndex = 0
    for (let i = 0; i < colLetter.length; i++) {
      colIndex = colIndex * 26 + (colLetter.charCodeAt(i) - 64)
    }
    colIndex -= 1 // Convert to 0-based

    // Validate indices
    if (colIndex < 0 || colIndex >= context.columns.length) {
      return null
    }
    if (rowNum < 0 || rowNum >= context.allRows.length) {
      return null
    }

    return { colIndex, rowIndex: rowNum }
  }

  // Column name reference
  const col = context.columns.find(
    c => c.name.toLowerCase() === ref.toLowerCase() || c.id.toLowerCase() === ref.toLowerCase()
  )
  if (col) {
    const colIndex = context.columns.findIndex(c => c.id === col.id)
    return { colIndex, rowIndex: context.currentRowIndex }
  }
  return null
}

/**
 * Evaluate arithmetic expression with proper operator precedence
 */
function evaluateArithmetic(expr: string, context: FormulaContext): unknown {
  // Replace cell references with values first
  expr = replaceCellReferences(expr, context)

  // Handle parentheses recursively
  while (expr.includes('(')) {
    const match = expr.match(/\(([^()]+)\)/)
    if (!match) break

    const innerExpr = match[1]
    const innerResult = evaluateArithmetic(innerExpr, context)
    expr = expr.replace(match[0], String(innerResult))
  }

  // Tokenize the expression
  const tokens = tokenizeExpression(expr)
  if (tokens.length === 0) return 0

  // Evaluate using shunting yard algorithm for proper precedence
  return evaluateTokens(tokens)
}

/**
 * Tokenize expression into numbers and operators
 */
function tokenizeExpression(expr: string): Array<string | number> {
  const tokens: Array<string | number> = []
  let current = ''

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i]

    if (char === ' ') {
      continue
    }

    if (['+', '-', '*', '/'].includes(char)) {
      // Handle unary minus
      if (char === '-' && (tokens.length === 0 || typeof tokens[tokens.length - 1] === 'string')) {
        current += char
        continue
      }

      if (current) {
        const num = parseFloat(current)
        tokens.push(isNaN(num) ? 0 : num)
        current = ''
      }
      tokens.push(char)
    } else {
      current += char
    }
  }

  if (current) {
    const num = parseFloat(current)
    tokens.push(isNaN(num) ? 0 : num)
  }

  return tokens
}

/**
 * Evaluate tokens with proper operator precedence
 */
function evaluateTokens(tokens: Array<string | number>): number {
  if (tokens.length === 0) return 0
  if (tokens.length === 1) return typeof tokens[0] === 'number' ? tokens[0] : 0

  // First pass: multiplication and division
  const afterMulDiv: Array<string | number> = []
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const prev = afterMulDiv[afterMulDiv.length - 1]

    if (token === '*' || token === '/') {
      const left = typeof prev === 'number' ? prev : 0
      const right = typeof tokens[i + 1] === 'number' ? tokens[i + 1] : 0
      afterMulDiv.pop()

      if (token === '*') {
        afterMulDiv.push(left * right)
      } else {
        afterMulDiv.push(right !== 0 ? left / right : 0)
      }
      i++ // Skip the right operand
    } else {
      afterMulDiv.push(token)
    }
  }

  // Second pass: addition and subtraction
  let result = typeof afterMulDiv[0] === 'number' ? afterMulDiv[0] : 0
  for (let i = 1; i < afterMulDiv.length; i += 2) {
    const op = afterMulDiv[i]
    const right = typeof afterMulDiv[i + 1] === 'number' ? afterMulDiv[i + 1] : 0

    if (op === '+') {
      result += right
    } else if (op === '-') {
      result -= right
    }
  }

  return result
}

/**
 * Replace cell references in expression with actual values
 */
function replaceCellReferences(expr: string, context: FormulaContext): string {
  // Replace Excel-style references (A1, B2, etc.)
  expr = expr.replace(/\b([A-Z]+)([0-9]+)\b/gi, (match, colLetter, rowNum) => {
    const colIndex = columnLetterToIndex(colLetter)
    const rowIndex = parseInt(rowNum, 10) - 1

    if (rowIndex >= 0 && rowIndex < context.allRows.length && colIndex >= 0 && colIndex < context.columns.length) {
      const col = context.columns[colIndex]
      const value = context.allRows[rowIndex][col.name] ?? context.allRows[rowIndex][col.id]
      return String(value ?? 0)
    }
    return '0'
  })

  // Replace column name references
  for (const col of context.columns) {
    const replaceToken = (token: string) => {
      const regex = new RegExp(`\\b${escapeRegex(token)}\\b`, 'gi')
      expr = expr.replace(regex, () => {
        const value = context.row[col.name] ?? context.row[col.id]
        return String(value ?? 0)
      })
    }

    replaceToken(col.name)
    if (col.id && col.id !== col.name) {
      replaceToken(col.id)
    }
  }

  return expr
}

/**
 * Convert column letter to index (A=0, B=1, etc.)
 */
function columnLetterToIndex(letter: string): number {
  let index = 0
  const upper = letter.toUpperCase()
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64)
  }
  return index - 1
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Convert value to number
 */
function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value
  }
  if (typeof value === 'string') {
    const num = parseFloat(value.replace(/[^\d.-]/g, ''))
    return isNaN(num) ? 0 : num
  }
  return 0
}

/**
 * Convert value to boolean
 */
function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim()
    if (lower === 'true' || lower === '1' || lower === 'yes') return true
    if (lower === 'false' || lower === '0' || lower === 'no') return false
    // Try numeric comparison
    const num = parseFloat(lower)
    if (!isNaN(num)) return num !== 0
  }
  return Boolean(value)
}
