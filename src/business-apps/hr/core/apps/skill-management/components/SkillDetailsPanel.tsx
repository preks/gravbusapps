import { useMemo } from 'react'
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { UsersIcon } from '@phosphor-icons/react'
import { DetailSheet } from '@/business-apps/hr/core/apps/monthly-compensation-changes/components/DetailSheet'
import { DetailPanelField, DetailPanelSection } from '@/business-apps/hr/core/apps/shared/components/DetailPanelLayout'
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

function getTodayDateKey(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function toDateKey(value?: string | null): string {
  return value?.split('T')[0] ?? ''
}

function isSkillActive(skill: SkillRecord): boolean {
  const todayDateKey = getTodayDateKey()
  const activeFromDate = toDateKey(skill.activeFrom)
  const activeToDate = toDateKey(skill.activeTo)
  const hasStarted = !activeFromDate || activeFromDate <= todayDateKey
  const hasNotEnded = !activeToDate || activeToDate > todayDateKey

  return hasStarted && hasNotEnded
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

  const hasMore = totalEmployees > employees.length
  const skillIsActive = skill ? isSkillActive(skill) : false

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
    <DetailSheet open={isOpen} onClose={onClose} title={t('skill-details-title')}>
      {!skill && isLoading && (
        <div className="gba:flex gba:justify-center gba:py-10">
          <Spinner />
        </div>
      )}

      {skill && (
        <div data-testid={`${prefixDataTestId ?? ''}-skill-details-panel`}>
          <div className="gba:mb-6 gba:min-w-0">
            <div className="gba:break-words gba:text-base gba:font-semibold gba:leading-tight">{skill.name}</div>
          </div>

          <DetailPanelSection title={t('skill-details-title')}>
            <DetailPanelField label={t('skill-name')}>{skill.name}</DetailPanelField>
            <DetailPanelField label={t('skill-status')}>
              <Badge variant={skillIsActive ? 'success' : 'destructive'}>
                {skillIsActive ? t('status-active') : t('status-inactive')}
              </Badge>
            </DetailPanelField>
            <DetailPanelField label={t('skill-category')}>
              {categoryName ? <Badge variant="secondary">{categoryName}</Badge> : null}
            </DetailPanelField>
            <DetailPanelField label={t('skill-description')}>{skill.description}</DetailPanelField>
            <DetailPanelField label={t('skill-level-scale')}>
              {skill.levelScale != null ? `1 - ${skill.levelScale}` : null}
            </DetailPanelField>
            <DetailPanelField label={t('skill-mandatory')}>
              {skill.mandatory ? t('value-yes') : t('value-no')}
            </DetailPanelField>
            <DetailPanelField label={t('skill-employees')}>{String(totalEmployees)}</DetailPanelField>
          </DetailPanelSection>

          <DetailPanelSection
            title={`${t('skill-details-employees-title')} (${totalEmployees})`}
            action={<UsersIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />}
          >
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
          </DetailPanelSection>
        </div>
      )}
    </DetailSheet>
  )
}
