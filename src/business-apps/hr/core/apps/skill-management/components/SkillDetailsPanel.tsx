import { useMemo } from 'react'
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { InfoIcon, UsersIcon } from '@phosphor-icons/react'
import SheetWrapperComponent from '@/business-apps/mdm/apps/generic-components/sheet-wrapper/SheetWrapperComponent'
import { EmployeeSkillStatus } from '../types'
import type { SkillRecord, EmployeeSkillRecord } from '../types'
import translations from '../_i18n'

interface SkillDetailsPanelProps {
  skill: SkillRecord | null
  employees: EmployeeSkillRecord[]
  totalEmployees: number
  isLoading: boolean
  isOpen: boolean
  onClose: () => void
  onLoadMore: () => void
  categoryName?: string
  prefixDataTestId?: string
}

function getStartOfTodayIso(): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.toISOString()
}

function isSkillActive(skill: SkillRecord): boolean {
  if (skill.activeTo) {
    return skill.activeTo >= getStartOfTodayIso()
  }

  return true
}

function getEmployeeName(emp: EmployeeSkillRecord['employee']): string {
  if (emp?.displayName) return emp.displayName
  return `${emp?.firstName ?? ''} ${emp?.lastName ?? ''}`.trim()
}

function getInitials(firstName?: string | null, lastName?: string | null): string {
  return `${(firstName?.[0] ?? '').toUpperCase()}${(lastName?.[0] ?? '').toUpperCase()}` || '?'
}

function EmployeeRow({ es }: Readonly<{ es: EmployeeSkillRecord }>) {
  const { t } = useTranslation(translations)
  return (
    <div className="gba:flex gba:items-center gba:gap-3 gba:py-1.5">
      <Avatar className="gba:h-7 gba:w-7">
        {es.employee?.pictureThumbnail && <AvatarImage src={es.employee.pictureThumbnail} />}
        <AvatarFallback className="gba:text-xs">
          {getInitials(es.employee?.firstName, es.employee?.lastName)}
        </AvatarFallback>
      </Avatar>
      <div className="gba:flex-1 gba:min-w-0">
        <span className="gba:text-sm gba:font-medium gba:truncate gba:block">{getEmployeeName(es.employee)}</span>
      </div>
      <div className="gba:flex gba:items-center gba:gap-2 gba:shrink-0">
        {es.level != null && <Badge variant="outline">{t('pending-level-value', { level: String(es.level) })}</Badge>}
        {(es.employeeSkillStatus === EmployeeSkillStatus.UNKNOWN ||
          es.employeeSkillStatus === EmployeeSkillStatus.APPROVED) && (
          <Badge variant="success">{t('status-approved')}</Badge>
        )}
        {es.employeeSkillStatus === EmployeeSkillStatus.PENDING && (
          <Badge variant="warning">{t('status-pending')}</Badge>
        )}
        {es.employeeSkillStatus === EmployeeSkillStatus.REJECTED && (
          <Badge variant="destructive">{t('status-rejected')}</Badge>
        )}
      </div>
    </div>
  )
}

export default function SkillDetailsPanel({
  skill,
  employees,
  totalEmployees,
  isLoading,
  isOpen,
  onClose,
  onLoadMore,
  categoryName,
  prefixDataTestId
}: Readonly<SkillDetailsPanelProps>) {
  const { t } = useTranslation(translations)

  const drawerItems = useMemo(() => {
    if (!skill) return []
    const skillIsActive = isSkillActive(skill)

    return [
      {
        icon: <InfoIcon />,
        title: t('skill-details-title'),
        verticalTable: true,
        items: [
          { label: t('skill-name'), value: skill.name },
          {
            label: t('skill-status'),
            value: (
              <Badge variant={skillIsActive ? 'success' : 'destructive'}>
                {skillIsActive ? t('status-active') : t('status-inactive')}
              </Badge>
            )
          },
          ...(categoryName
            ? [{ label: t('skill-category'), value: <Badge variant="secondary">{categoryName}</Badge> }]
            : []),
          ...(skill.description ? [{ label: t('skill-description'), value: skill.description }] : []),
          ...(skill.levelScale != null ? [{ label: t('skill-level-scale'), value: `1 – ${skill.levelScale}` }] : []),
          { label: t('skill-mandatory'), value: skill.mandatory ? t('value-yes') : t('value-no') },
          { label: t('skill-employees'), value: String(totalEmployees) },
          ...(skill.createdAt
            ? [{ label: t('skill-created'), value: new Date(skill.createdAt).toLocaleDateString() }]
            : []),
          ...(skill.updatedAt
            ? [{ label: t('skill-updated'), value: new Date(skill.updatedAt).toLocaleDateString() }]
            : [])
        ]
      }
    ]
  }, [skill, categoryName, totalEmployees, t])

  const hasMore = totalEmployees > employees.length

  const employeesSection = useMemo(() => {
    if (!skill) return null
    if (isLoading && employees.length === 0) {
      return (
        <div className="gba:flex gba:justify-center gba:py-6">
          <Spinner />
        </div>
      )
    }
    if (employees.length === 0) {
      return (
        <p className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-4">
          {t('skill-details-no-employees')}
        </p>
      )
    }
    return (
      <div className="gba:space-y-1">
        {employees.map(es => (
          <EmployeeRow key={es.id} es={es} />
        ))}
      </div>
    )
  }, [skill, employees, isLoading, t])

  return (
    <SheetWrapperComponent
      prefixDataTestId={prefixDataTestId ?? ''}
      isDrawerVisible={isOpen}
      onOpenChange={openStatus => {
        if (openStatus) {
          return
        }

        onClose()
      }}
      title={skill?.name ?? t('skill-details-title')}
      titleIcon={InfoIcon}
      drawerItems={drawerItems}
      extraContent={
        skill && (
          <div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-3">
              <UsersIcon className="gba:h-4 gba:w-4" />
              <span className="gba:text-sm gba:font-semibold">
                {t('skill-details-employees-title')} ({totalEmployees})
              </span>
            </div>
            {employeesSection}
            {hasMore && (
              <div className="gba:flex gba:flex-col gba:items-center gba:gap-1 gba:pt-3">
                <p className="gba:text-xs gba:text-muted-foreground">
                  {t('showing-count', { shown: String(employees.length), total: String(totalEmployees) })}
                </p>
                <Button size="sm" variant="outline" onClick={onLoadMore} disabled={isLoading}>
                  {isLoading ? <Spinner /> : t('load-more')}
                </Button>
              </div>
            )}
          </div>
        )
      }
      isFooterVisible={true}
    />
  )
}
