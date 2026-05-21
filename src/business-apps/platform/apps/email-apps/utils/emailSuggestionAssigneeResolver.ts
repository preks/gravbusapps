import { getWorkEmailFromCommunication, type EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import { assigneeIdFromEmployee } from './emailSuggestionQuickTaskHelpers'

export interface ParsedAssignee {
  raw: string
  email?: string
  name?: string
}

export type AssigneeMatchStatus = 'matched' | 'ambiguous' | 'unmatched'

export interface AssigneeMatchResult {
  status: AssigneeMatchStatus
  employee?: EmployeeLiteOption
  parsed: ParsedAssignee
}

const ASSIGNEE_DELIMITERS = new Set(['<', '>', '(', ')', '"', "'", '[', ']', ',', ';', ':'])
const LOCAL_EMAIL_CHARS = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._%+-')
const DOMAIN_EMAIL_CHARS = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-')

function compactWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function isEmailCandidate(value: string): boolean {
  const at = value.indexOf('@')
  if (at <= 0 || at !== value.lastIndexOf('@') || at >= value.length - 1) return false

  const local = value.slice(0, at)
  const domain = value.slice(at + 1)
  if (!domain.includes('.')) return false
  if (domain.split('.').some(part => part.length === 0)) return false

  return (
    Array.from(local).every(char => LOCAL_EMAIL_CHARS.has(char)) &&
    Array.from(domain).every(char => DOMAIN_EMAIL_CHARS.has(char))
  )
}

function assigneeTokens(value: string): string[] {
  const out: string[] = []
  let current = ''
  for (const char of value) {
    if (ASSIGNEE_DELIMITERS.has(char) || char.trim() === '') {
      if (current) out.push(current)
      current = ''
    } else {
      current += char
    }
  }
  if (current) out.push(current)
  return out
}

function extractEmail(value: string): string | undefined {
  return assigneeTokens(value).find(isEmailCandidate)
}

function nameWithoutEmail(value: string, email: string | undefined): string {
  const withoutEmail = email ? value.split(email).join(' ') : value
  return compactWhitespace(
    Array.from(withoutEmail)
      .map(char => (ASSIGNEE_DELIMITERS.has(char) ? ' ' : char))
      .join('')
  )
}

function normalizeComparable(value: string | undefined): string {
  return compactWhitespace(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function uniqueEmployees(employees: EmployeeLiteOption[]): EmployeeLiteOption[] {
  const map = new Map<string, EmployeeLiteOption>()
  for (const employee of employees) {
    const id = assigneeIdFromEmployee(employee)
    if (id) {
      map.set(id, employee)
    }
  }
  return Array.from(map.values())
}

function matchResult(parsed: ParsedAssignee, matches: EmployeeLiteOption[]): AssigneeMatchResult | null {
  const uniqueMatches = uniqueEmployees(matches)
  if (uniqueMatches.length === 1) {
    return { status: 'matched', employee: uniqueMatches[0], parsed }
  }
  if (uniqueMatches.length > 1) {
    return { status: 'ambiguous', parsed }
  }
  return null
}

function matchesEmail(employee: EmployeeLiteOption, email: string): boolean {
  return normalizeComparable(getWorkEmailFromCommunication(employee.communication)) === normalizeComparable(email)
}

function fullName(employee: EmployeeLiteOption): string {
  return compactWhitespace(`${employee.firstName || ''} ${employee.lastName || ''}`)
}

function matchesName(employee: EmployeeLiteOption, name: string): boolean {
  const normalizedName = normalizeComparable(name)
  if (!normalizedName) return false

  const isSingleToken = !normalizedName.includes(' ')
  if (isSingleToken) {
    return normalizeComparable(employee.firstName) === normalizedName
  }

  return (
    normalizeComparable(employee.displayName) === normalizedName ||
    normalizeComparable(fullName(employee)) === normalizedName
  )
}

export function parseRawAssignee(raw: string): ParsedAssignee {
  const trimmedRaw = compactWhitespace(raw)
  const email = extractEmail(trimmedRaw)
  const name = nameWithoutEmail(trimmedRaw, email)

  return {
    raw: trimmedRaw,
    ...(email ? { email } : {}),
    ...(name && name !== email ? { name } : {})
  }
}

export function resolveAssigneeFromEmployees(
  parsed: ParsedAssignee,
  employees: EmployeeLiteOption[]
): AssigneeMatchResult {
  if (parsed.email) {
    const emailResult = matchResult(
      parsed,
      employees.filter(employee => matchesEmail(employee, parsed.email || ''))
    )
    if (emailResult) return emailResult
  }

  if (parsed.name) {
    const nameResult = matchResult(
      parsed,
      employees.filter(employee => matchesName(employee, parsed.name || ''))
    )
    if (nameResult) return nameResult
  }

  return { status: 'unmatched', parsed }
}
