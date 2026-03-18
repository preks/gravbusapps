import type { PayrollEmployee, ExportOptions, PayrollRun } from '../types/payrollTypes'

function escapeCSVField(value: string | number | boolean | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function getExportableEmployees(employees: PayrollEmployee[], options: ExportOptions): PayrollEmployee[] {
  switch (options.mode) {
    case 'ready_only':
      return employees.filter(e => e.readinessStatus === 'ready')
    case 'ready_and_warning':
      return employees.filter(e => e.readinessStatus === 'ready' || e.readinessStatus === 'warning')
    case 'all':
    default:
      return employees.filter(e => e.readinessStatus !== 'excluded')
  }
}

const BASE_HEADERS = [
  'Employee ID',
  'Employee Code',
  'First Name',
  'Last Name',
  'Country',
  'Legal Entity',
  'Employment Status',
  'Hire Date',
  'Termination Date',
  'Department',
  'Cost Center',
  'Work Location',
  'Contract Type',
  'FTE',
  'Weekly Hours',
  'Base Salary (Monthly)',
  'Currency',
  'Bank Details Present',
  'IBAN',
  'Paid Leave Days',
  'Sick Leave Days',
  'Unpaid Leave Days',
  'Other Leave Days',
  'Logged Hours',
  'Contract Capacity Hours',
  'Balance Hours',
  'Overtime Hours',
  'Readiness Status',
  'Open Issues',
  'Changed Since Last Payroll'
]

const ISSUE_HEADERS = ['Issue Codes', 'Blocker Count', 'Warning Count']

function employeeToRow(employee: PayrollEmployee, includeIssues: boolean): string[] {
  const row = [
    employee.employeeId,
    employee.code,
    employee.firstName,
    employee.lastName,
    employee.country,
    employee.legalEntityName,
    employee.employmentStatus,
    employee.hireDate || '',
    employee.terminationDate || '',
    employee.department,
    employee.costCenter,
    employee.workLocation,
    employee.contractType,
    employee.fte != null ? String(employee.fte) : '',
    employee.weeklyHours != null ? String(employee.weeklyHours) : '',
    employee.baseSalary != null ? String(employee.baseSalary) : '',
    employee.currency,
    String(employee.bankDetailsPresent),
    employee.bankAccountIban || '',
    String(employee.paidLeaveDays),
    String(employee.sickLeaveDays),
    String(employee.unpaidLeaveDays),
    String(employee.otherLeaveDays),
    employee.loggedHours != null ? String(employee.loggedHours) : '',
    employee.contractCapacityHours != null ? String(employee.contractCapacityHours) : '',
    employee.balanceHours != null ? String(employee.balanceHours) : '',
    employee.overtimeHours != null ? String(employee.overtimeHours) : '',
    employee.readinessStatus,
    String(employee.issues.filter(i => i.status === 'open').length),
    String(employee.changedSinceLastPayroll)
  ]

  if (includeIssues) {
    const openIssues = employee.issues.filter(i => i.status === 'open')
    row.push(
      openIssues.map(i => i.issueCode).join('; '),
      String(openIssues.filter(i => i.severity === 'blocker').length),
      String(openIssues.filter(i => i.severity === 'warning').length)
    )
  }

  return row
}

export function generatePayrollCSV(
  employees: PayrollEmployee[],
  payrollRun: PayrollRun,
  options: ExportOptions
): string {
  const exportEmployees = getExportableEmployees(employees, options)
  const headers = [...BASE_HEADERS, ...(options.includeIssueSummary ? ISSUE_HEADERS : [])]

  const metaRows = [
    `# Payroll Export`,
    `# Run ID: ${payrollRun.id}`,
    `# Period: ${payrollRun.year}-${String(payrollRun.month).padStart(2, '0')}`,
    `# Country: ${payrollRun.country}`,
    `# Legal Entity: ${payrollRun.legalEntityName}`,
    `# Export Mode: ${options.mode}`,
    `# Exported At: ${new Date().toISOString()}`,
    `# Employee Count: ${exportEmployees.length}`,
    ''
  ]

  const headerRow = headers.map(escapeCSVField).join(',')
  const dataRows = exportEmployees.map(emp =>
    employeeToRow(emp, options.includeIssueSummary).map(escapeCSVField).join(',')
  )

  return [...metaRows, headerRow, ...dataRows].join('\n')
}

export function generateExceptionsCSV(employees: PayrollEmployee[]): string {
  const headers = [
    'Employee ID',
    'Employee Name',
    'Issue Code',
    'Category',
    'Severity',
    'Message',
    'Recommended Action',
    'Status'
  ]

  const rows: string[][] = []
  for (const emp of employees) {
    for (const issue of emp.issues) {
      rows.push([
        emp.employeeId,
        `${emp.firstName} ${emp.lastName}`,
        issue.issueCode,
        issue.category,
        issue.severity,
        issue.message,
        issue.recommendedAction,
        issue.status
      ])
    }
  }

  const headerRow = headers.map(escapeCSVField).join(',')
  const dataRows = rows.map(row => row.map(escapeCSVField).join(','))

  return [headerRow, ...dataRows].join('\n')
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
