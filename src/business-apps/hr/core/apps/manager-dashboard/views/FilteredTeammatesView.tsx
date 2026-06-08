import React, { useMemo, useState } from 'react'
import { Button, Badge, DataTable, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { CaretLeftIcon as ChevronLeft } from '@phosphor-icons/react'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DirectReport } from '../hooks/useDirectReports'
import { getAbsenceStatusBadgeVariant } from '@/business-apps/hr/absences/utils/absenceStatusUtils'
import { avatarSrc } from '../utils/heatmapHelpers'

export interface FilteredTeammatesViewProps {
  directReports: DirectReport[]
  unallocatedEmployeeIds: string[]
  employeeAllocations: Array<{ id: string; allocationPercent: number }>
  filterAbsentOnly: boolean
  filterUnallocatedOnly: boolean
  loadingDirectReports: boolean
  directReportsError: Error | null
  onNavigateBack: () => void
  onNavigateToEmployee: (employeeId: string) => void
  onAssignProject: (employeeId: string) => void
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  jobTitle: string
  organizationalUnit: string
  profilePicture: string
  allocationPercent: number
  status?: string
  currentAbsence?: {
    type: string
    parentEntryId?: string
    startDate: string
    endDate: string
    status: string
  }
}

const EmployeeNameCell: React.FC<{ employee: Employee }> = ({ employee }) => {
  const image = avatarSrc(employee.profilePicture)
  return (
    <div className="gba:flex gba:items-center gba:gap-3">
      <Avatar className="gba:h-8 gba:w-8">
        <AvatarImage src={image} alt={`${employee.firstName} ${employee.lastName}`} />
        <AvatarFallback>
          {employee.firstName?.[0]}
          {employee.lastName?.[0]}
        </AvatarFallback>
      </Avatar>
      <span className="gba:font-medium">
        {employee.firstName} {employee.lastName}
      </span>
    </div>
  )
}

const AllocateAction: React.FC<{ employee: Employee; onAssign: (id: string) => void }> = ({ employee, onAssign }) => {
  if (employee.allocationPercent === 100) return null
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={e => {
        e.stopPropagation()
        onAssign(employee.id)
      }}
    >
      Allocate
    </Button>
  )
}

const StatusBadge: React.FC<{ employee: Employee }> = ({ employee }) => {
  if (employee.status === 'On Leave') {
    const absenceVariant = getAbsenceStatusBadgeVariant(employee.currentAbsence?.status)

    return (
      <Badge variant={absenceVariant}>
        {employee.currentAbsence?.type ||
          getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.on_leave', 'On Leave')}
      </Badge>
    )
  }
  if (employee.status === 'Available') {
    return (
      <Badge variant="success">
        {getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.available', 'Available')}
      </Badge>
    )
  }
  return <Badge variant="secondary">{employee.status || '-'}</Badge>
}

export const FilteredTeammatesView: React.FC<FilteredTeammatesViewProps> = ({
  directReports,
  unallocatedEmployeeIds,
  employeeAllocations,
  filterAbsentOnly,
  filterUnallocatedOnly,
  loadingDirectReports,
  directReportsError,
  onNavigateBack,
  onNavigateToEmployee,
  onAssignProject
}) => {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }])

  const allocationMap = useMemo(
    () => new Map(employeeAllocations.map(item => [item.id, item.allocationPercent])),
    [employeeAllocations]
  )

  const getFilteredDirectReports = () => {
    if (filterAbsentOnly) {
      return directReports.filter(report => report.status === 'On Leave')
    }
    if (filterUnallocatedOnly) {
      return directReports
    }
    return directReports
  }
  const filteredDirectReports = getFilteredDirectReports()

  const getHeaderTitle = () => {
    if (filterAbsentOnly) {
      return getTranslationFromI18nKeyAndLabel(
        'master-data:hr.manager_dashboard.absent_teammates',
        'Absent Team Members'
      )
    }
    if (filterUnallocatedOnly) {
      return getTranslationFromI18nKeyAndLabel(
        'master-data:hr.manager_dashboard.unallocated_teammates',
        'Unallocated Team Members'
      )
    }
    return getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.my_teammates', 'My Teammates')
  }

  const getBadgeText = (count: number) => {
    if (filterAbsentOnly) {
      return `${count} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.out_of_office', 'out of office')}`
    }
    if (filterUnallocatedOnly) {
      return `${unallocatedEmployeeIds.length} ${getTranslationFromI18nKeyAndLabel(
        'master-data:hr.manager_dashboard.not_allocated',
        'not allocated'
      )}`
    }
    return `${count} ${getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.total_teammates', 'team members').toLowerCase()}`
  }

  const getEmptyMessage = () => {
    if (filterAbsentOnly) {
      return getTranslationFromI18nKeyAndLabel(
        'master-data:hr.manager_dashboard.no_absent_members',
        'No team members are currently out of office'
      )
    }
    if (filterUnallocatedOnly) {
      return getTranslationFromI18nKeyAndLabel(
        'master-data:hr.manager_dashboard.no_unallocated_members',
        'All team members are allocated to projects'
      )
    }
    return getTranslationFromI18nKeyAndLabel(
      'master-data:hr.manager_dashboard.no_team_members',
      'No team members found'
    )
  }

  const transformedFilteredReports: Employee[] = filteredDirectReports.map(report => ({
    id: report.id,
    firstName: report.firstName,
    lastName: report.lastName,
    jobTitle: report.jobPositionName || '',
    organizationalUnit: report.organizationalUnitName || '',
    profilePicture: report.pictureThumbnail || '',
    allocationPercent: allocationMap.get(report.id) ?? 0,
    status: report.status === 'Away' ? 'On Leave' : report.status,
    currentAbsence: report.currentAbsence
      ? {
          type: report.currentAbsence.type,
          parentEntryId: report.currentAbsence.parentEntryId,
          startDate: report.currentAbsence.startDate,
          endDate: report.currentAbsence.endDate,
          status: report.currentAbsence.status
        }
      : undefined
  }))

  const columns = useMemo<ColumnDef<Employee>[]>(() => {
    const baseColumns: ColumnDef<Employee>[] = [
      {
        id: 'name',
        accessorFn: row => `${row.firstName} ${row.lastName}`,
        header: getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.team_member', 'Team Member'),
        size: 250,
        cell: ({ row }) => <EmployeeNameCell employee={row.original} />
      },
      {
        id: 'jobTitle',
        accessorKey: 'jobTitle',
        header: getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.position', 'Position'),
        size: 150
      },
      {
        id: 'organizationalUnit',
        accessorKey: 'organizationalUnit',
        header: getTranslationFromI18nKeyAndLabel('master-data:hr.manager_dashboard.department', 'Department'),
        size: 150
      }
    ]

    if (!filterUnallocatedOnly) {
      baseColumns.push({
        id: 'status',
        header: getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.status', 'Status'),
        size: 120,
        cell: ({ row }) => <StatusBadge employee={row.original} />
      })
    }

    if (filterUnallocatedOnly) {
      baseColumns.push({
        id: 'allocationPercent',
        accessorKey: 'allocationPercent',
        header: getTranslationFromI18nKeyAndLabel(
          'master-data:hr.manager_dashboard.total_allocation',
          'Total Allocation'
        ),
        size: 130,
        cell: ({ row }) => `${row.original.allocationPercent}%`
      })
    }

    return baseColumns
  }, [filterUnallocatedOnly])

  const getHeaderBadgeVariant = () => {
    if (filterAbsentOnly) return 'warning' as const
    if (filterUnallocatedOnly) return 'secondary' as const
    return 'secondary' as const
  }

  return (
    <div className="gba:p-6 gba:h-full gba:flex gba:flex-col">
      {/* Header section */}
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-6">
        <div className="gba:flex gba:items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateBack}
            className="gba:mr-4"
            data-testid="manager-dashboard-filtered-teammates-back-button"
          >
            <ChevronLeft size={16} className="gba:mr-1" />
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.absence_details.back_to_dashboard',
              'Back to Dashboard'
            )}
          </Button>
          <h1 className="gba:text-xl gba:font-semibold">{getHeaderTitle()}</h1>
          <Badge variant={getHeaderBadgeVariant()} className="gba:ml-3">
            {getBadgeText(transformedFilteredReports.length)}
          </Badge>
        </div>
      </div>

      {/* Team Members DataTable */}
      <div className="gba:flex-1 gba:overflow-auto">
        <DataTable
          data={transformedFilteredReports}
          columns={columns}
          loading={loadingDirectReports}
          error={directReportsError}
          emptyMessage={getEmptyMessage()}
          enableSorting={true}
          sorting={sorting}
          onSortingChange={setSorting}
          onRowClick={employee => onNavigateToEmployee(employee.id)}
          actions={
            filterUnallocatedOnly
              ? row => <AllocateAction employee={row.original} onAssign={onAssignProject} />
              : undefined
          }
        />
      </div>
    </div>
  )
}
