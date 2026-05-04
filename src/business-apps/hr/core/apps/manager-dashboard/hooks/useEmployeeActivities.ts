import { useMemo } from 'react'
import { TeamAbsence } from './useTeamAbsences'
import { ApprovalRequest } from './useRequestsToApprove'
import { PendingPersonalDataChange } from './usePersonalDataChanges'

export type ActivityType = 'absence' | 'data-change' | 'expense' | 'leave' | 'approval-request'

export interface EmployeeActivity {
  id: string
  type: ActivityType
  title: string
  description?: string | null
  status?: string
  date: string
  endDate?: string
  createdAt: string
  employeeName: string
  employeeId: string
  priority?: 'high' | 'medium' | 'low'
  amount?: number
  leaveType?: string
}

interface UseEmployeeActivitiesProps {
  absences: TeamAbsence[]
  personalDataChanges: PendingPersonalDataChange[]
  approvalTasks: ApprovalRequest[]
  loadingAbsences: boolean
  loadingDataChanges: boolean
  loadingApprovals: boolean
}

function normalizeDate(dateString: string | undefined): string {
  if (!dateString) return new Date(0).toISOString()
  try {
    return new Date(dateString).toISOString()
  } catch {
    return new Date(0).toISOString()
  }
}

function getActivityPriority(type: ActivityType, status?: string, amount?: number): 'high' | 'medium' | 'low' {
  if (status === 'PENDING' || status === 'WAITING_FOR_LINE_MANAGER') return 'high'
  if (type === 'absence' || type === 'leave') return 'medium'
  if (type === 'expense' && amount && amount >= 500) return 'medium'
  return 'low'
}

export function useEmployeeActivities({
  absences,
  personalDataChanges,
  approvalTasks,
  loadingAbsences,
  loadingDataChanges,
  loadingApprovals
}: UseEmployeeActivitiesProps) {
  const activities = useMemo<EmployeeActivity[]>(() => {
    const absenceActivities: EmployeeActivity[] = absences.map(absence => ({
      id: `absence-${absence.id}`,
      type: 'absence',
      title: `${absence.type.value || 'Absence'}`,
      description: absence.description || undefined,
      status: absence.status,
      date: normalizeDate(absence.startDate),
      endDate: absence.endDate,
      createdAt: normalizeDate(absence.startDate),
      employeeName: `${absence.employee.firstName} ${absence.employee.lastName}`,
      employeeId: absence.employee.id,
      priority: getActivityPriority('absence', absence.status),
      leaveType: absence.type.value
    }))

    const dataChangeActivities: EmployeeActivity[] = personalDataChanges.map(change => ({
      id: `change-${change.id}`,
      type: 'data-change',
      title: change.fieldName,
      description: `Changed from "${change.oldValue}" to "${change.newValue}"`,
      status: change.status,
      date: normalizeDate(change.changedAt),
      createdAt: normalizeDate(change.changedAt),
      employeeName: change.employeeName,
      employeeId: change.employeeId,
      priority: getActivityPriority('data-change', change.status)
    }))

    const approvalActivities: EmployeeActivity[] = approvalTasks.map(task => {
      const type: ActivityType =
        task.type === 'leave' ? 'leave' : task.type.startsWith('expense') ? 'expense' : 'approval-request'
      return {
        id: `approval-${task.id}`,
        type,
        title: task.title,
        description: task.description || undefined,
        status: task.status,
        date: normalizeDate(task.requestDate),
        createdAt: normalizeDate(task.createdAt),
        employeeName: task.employee.fullName,
        employeeId: task.employee.id,
        priority: getActivityPriority(type, task.status, task.totalAmount),
        amount: type === 'expense' ? task.totalAmount : undefined,
        leaveType: task.leaveType
      }
    })

    const all = [...absenceActivities, ...dataChangeActivities, ...approvalActivities]

    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return all
  }, [absences, personalDataChanges, approvalTasks])

  const groupedByEmployee = useMemo(() => {
    const map = new Map<string, EmployeeActivity[]>()
    for (const activity of activities) {
      const list = map.get(activity.employeeId) ?? []
      list.push(activity)
      map.set(activity.employeeId, list)
    }
    return map
  }, [activities])

  const loading = loadingAbsences || loadingDataChanges || loadingApprovals

  return { activities, groupedByEmployee, loading }
}
