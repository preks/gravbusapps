import type { EmployeesTabKey } from '../types/employeeTypes'

const VALID_EMPLOYEES_TABS = new Set<EmployeesTabKey>(['comparison', 'list'])

export const getInitialEmployeesTab = (): EmployeesTabKey => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  const tabFromUrl = urlParams.get('employeesTab') ?? urlParams.get('employeeTab')

  if (tabFromUrl && VALID_EMPLOYEES_TABS.has(tabFromUrl as EmployeesTabKey)) {
    return tabFromUrl as EmployeesTabKey
  }

  return 'comparison'
}

export const updateEmployeesTabUrl = (tab: EmployeesTabKey): void => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  urlParams.set('employeesTab', tab)
  const newUrl = `${globalThis.location.pathname}?${urlParams.toString()}`
  globalThis.history.replaceState({}, '', newUrl)
}

export const initializeEmployeesTabUrl = (currentTab: EmployeesTabKey): void => {
  const urlParams = new URLSearchParams(globalThis.location.search)
  if (!urlParams.has('employeesTab')) {
    updateEmployeesTabUrl(currentTab)
  }
}
