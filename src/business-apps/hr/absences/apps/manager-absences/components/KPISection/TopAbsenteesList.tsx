import React from 'react'
import { Card } from '@newwork/nw-design-system'
import { MedalIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface EmployeeAbsence {
  id: string
  employee: {
    id: string
    lastName: string
    firstName: string
    pictureThumbnail?: string
    employeePosition: {
      organizationalUnit: {
        name: string
      }
    }
  }
  type: {
    objectValue: string
    translations: {
      localeCode: string
      value: string
    }[]
    id: string
    value: string
    parentEntryId: string
    groupName?: string
  }
  startDate: string
  endDate: string
  calendarDays: number
  effectiveDays: number
  status: string
}

interface TopAbsenteesListProps {
  topAbsentees: Array<{
    name: string
    department: string
    total: number
    colorIdx: number
    absences: EmployeeAbsence[]
  }>
  maxAbsenceDays: number
  onNavigateToAbsenceListPage?: (preFilter?: any) => void
}

export const TopAbsenteesList: React.FC<TopAbsenteesListProps> = ({
  topAbsentees,
  maxAbsenceDays,
  onNavigateToAbsenceListPage
}) => {
  const maxEmployeesToShow = 4
  const displayedEmployees = topAbsentees.slice(0, maxEmployeesToShow)

  const getAvatarInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarBgColor = (name: string) => {
    const colors = [
      'var(--nw-chart-1)',
      'var(--nw-chart-2)',
      'var(--nw-chart-3)',
      'var(--nw-chart-4)',
      'var(--nw-chart-5)',
      'var(--nw-chart-6)',
      'var(--nw-chart-7)',
      'var(--nw-chart-8)'
    ]
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  const generateEmail = (name: string) => {
    const nameParts = name.toLowerCase().split(' ')
    if (nameParts.length >= 2) {
      return `${nameParts[0]}${nameParts[1].charAt(0)}@gmail.com`
    }
    return `${nameParts[0]}@gmail.com`
  }

  const handleCardClick = () => {
    if (onNavigateToAbsenceListPage) {
      const employeeIds = topAbsentees
        .flatMap(emp => emp.absences.map(absence => absence.employee.id))
        .filter((id, index, array) => array.indexOf(id) === index)

      onNavigateToAbsenceListPage({
        type: 'top-absentees',
        status: ['APPROVED'],
        employees: employeeIds
      })
    }
  }

  return (
    <Card
      className="gba:hover:shadow-md gba:transition-shadow gba:w-full gba:h-[510px] gba:cursor-pointer"
      onClick={handleCardClick}
      data-testid="top-absentees-card"
    >
      <div className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-4 gba:p-6">
        <div>
          <h5 className="gba:text-sm gba:font-medium">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_manager.dashboard.top_absentees_btn',
              'Top Absentees'
            )}
          </h5>
          <p className="gba:text-xs gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_manager.dashboard.employees_most_absence_days',
              'Employees with most absence days'
            )}
          </p>
          <div className="gba:text-2xl gba:font-bold gba:pt-2 gba:text-left">{maxAbsenceDays}</div>
          <div className="gba:text-xs gba:text-muted-foreground gba:text-left">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_manager.dashboard.max_absence_days',
              'Max Absence Days'
            )}
          </div>
        </div>
        <MedalIcon size={24} className="gba:h-6 gba:w-6 gba:text-muted-foreground gba:ml-2" />
      </div>

      <div className="gba:flex gba:flex-col gba:gap-2 gba:px-6 gba:pb-6">
        {displayedEmployees.length > 0 ? (
          displayedEmployees.map((emp, idx) => (
            <div key={emp.name + idx} className="gba:flex gba:items-center gba:justify-between gba:py-3">
              {/* Left side: Avatar + Name & Email */}
              <div className="gba:flex gba:items-center gba:gap-3">
                {/* Avatar */}
                <div
                  className="gba:w-11 gba:h-11 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-white gba:text-sm gba:font-medium gba:flex-shrink-0"
                  style={{ backgroundColor: getAvatarBgColor(emp.name) }}
                >
                  {getAvatarInitials(emp.name)}
                </div>

                {/* Name and Email */}
                <div>
                  <div className="gba:text-sm gba:font-medium gba:text-foreground gba:leading-5 gba:text-left">
                    {emp.name}
                  </div>
                  <div className="gba:text-xs gba:text-muted-foreground gba:leading-4 gba:mt-1 gba:text-left">
                    {generateEmail(emp.name)}
                  </div>
                </div>
              </div>

              {/* Right side: Total days - RIGHT ALIGNED */}
              <div className="gba:text-lg gba:font-semibold gba:text-foreground gba:text-right gba:min-w-[3rem]">
                {emp.total}
              </div>
            </div>
          ))
        ) : (
          <div className="gba:text-center gba:text-muted-foreground gba:py-8">
            <p className="gba:text-sm">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_manager.dashboard.emptyMessage',
                'No absence data available'
              )}
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
