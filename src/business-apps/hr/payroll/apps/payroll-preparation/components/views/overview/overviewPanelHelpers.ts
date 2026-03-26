import type { PayrollEmployee } from '../../../types/payrollTypes'

export type PanelCategory = 'total' | 'ready' | 'warning' | 'blocked' | 'excluded' | 'blockers' | 'changed' | null

export function filterEmployeesForPanel(employees: PayrollEmployee[], panelCategory: PanelCategory): PayrollEmployee[] {
  if (!panelCategory) return []

  switch (panelCategory) {
    case 'total':
      return employees
    case 'ready':
      return employees.filter(e => e.readinessStatus === 'ready')
    case 'warning':
      return employees.filter(e => e.readinessStatus === 'warning')
    case 'blocked':
      return employees.filter(e => e.readinessStatus === 'blocked')
    case 'excluded':
      return employees.filter(e => e.readinessStatus === 'excluded')
    case 'blockers':
      return employees.filter(e => e.issues.some(i => i.severity === 'blocker' && i.status === 'open'))
    case 'changed':
      return employees.filter(e => e.changedSinceLastPayroll)
    default:
      return []
  }
}

export function panelTitleForCategory(panelCategory: PanelCategory, t: (key: string) => string): string {
  switch (panelCategory) {
    case 'total':
      return t('summary-total')
    case 'ready':
      return t('summary-ready')
    case 'warning':
      return t('summary-warning')
    case 'blocked':
      return t('summary-blocked')
    case 'excluded':
      return t('summary-excluded')
    case 'blockers':
      return t('summary-blockers')
    case 'changed':
      return t('summary-changed')
    default:
      return ''
  }
}

export function countOpenWarningsAcrossEmployees(employees: PayrollEmployee[]): number {
  return employees.reduce((acc, emp) => {
    return acc + emp.issues.filter(i => i.severity === 'warning' && i.status === 'open').length
  }, 0)
}
