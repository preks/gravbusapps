import React from 'react'
import { WalletIcon, CalendarCheckIcon, UserCircleIcon, BuildingsIcon, BriefcaseIcon, ChartLineIcon, GearIcon } from '@phosphor-icons/react'
export type ModuleType = 'expenses' | 'absence' | 'hr' | 'crm' | 'finance' | 'admin' | 'platform' | 'unknown'

export interface ModuleInfo {
  icon: React.ComponentType<{ className?: string }>
  name: string
  color: string
}

export const MODULE_ICONS: Record<ModuleType, ModuleInfo> = {
  expenses: {
    icon: WalletIcon,
    name: 'Expenses+',
    color: 'gba:text-info' // Blue for all icons
  },
  absence: {
    icon: CalendarCheckIcon,
    name: 'Time Off',
    color: 'gba:text-info' // Blue for all icons
  },
  hr: {
    icon: UserCircleIcon,
    name: 'HR+',
    color: 'gba:text-info' // Blue for all icons
  },
  crm: {
    icon: BriefcaseIcon,
    name: 'CRM',
    color: 'gba:text-info' // Blue for all icons
  },
  finance: {
    icon: ChartLineIcon,
    name: 'Finance',
    color: 'gba:text-info' // Blue for all icons
  },
  admin: {
    icon: GearIcon,
    name: 'Admin',
    color: 'gba:text-info' // Blue for all icons
  },
  platform: {
    icon: BuildingsIcon,
    name: 'Platform',
    color: 'gba:text-info' // Blue for all icons
  },
  unknown: {
    icon: BriefcaseIcon,
    name: 'Task',
    color: 'gba:text-info' // Blue for all icons
  }
}

/**
 * Get module type from task name/type
 */
export const getModuleFromTask = (taskName?: string, taskType?: string): ModuleType => {
  const name = (taskName || '').toLowerCase()
  const type = (taskType || '').toLowerCase()

  // Expense-related tasks
  if (name.includes('expense') || type.includes('expense')) {
    return 'expenses'
  }

  // HR acknowledgement tasks (prioritize over absence)
  // Tasks where HR staff acknowledges/processes employee absences
  if (
    (name.includes('acknowledge') && (name.includes('hr') || name.includes('manager'))) ||
    name.includes('acknowledgehr') ||
    name.includes('acknowledgemanager')
  ) {
    return 'hr'
  }

  // Absence/vacation-related tasks (employee-submitted)
  if (
    name.includes('absence') ||
    name.includes('vacation') ||
    name.includes('timeoff') ||
    name.includes('sickleave') ||
    type.includes('absence')
  ) {
    return 'absence'
  }

  // HR-related tasks
  if (name.includes('employee') || name.includes('hr') || type.includes('hr')) {
    return 'hr'
  }

  // CRM-related tasks
  if (name.includes('lead') || name.includes('opportunity') || name.includes('crm') || type.includes('crm')) {
    return 'crm'
  }

  // Finance-related tasks
  if (name.includes('invoice') || name.includes('payment') || name.includes('finance')) {
    return 'finance'
  }

  // Admin-related tasks
  if (name.includes('admin') || name.includes('settings') || name.includes('config')) {
    return 'admin'
  }

  return 'unknown'
}

/**
 * Get module info for a task
 */
export const getModuleInfo = (taskName?: string, taskType?: string): ModuleInfo => {
  const moduleType = getModuleFromTask(taskName, taskType)
  return MODULE_ICONS[moduleType]
}
