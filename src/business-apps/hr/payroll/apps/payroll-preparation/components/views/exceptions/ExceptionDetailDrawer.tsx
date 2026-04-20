import React, { useMemo } from 'react'
import {
  ActionButton,
  Card,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Spinner
} from '@newwork/nw-design-system'
import { SparkleIcon } from '@phosphor-icons/react'
import { useAppActionData } from '@/common/hooks/useAppActionData'
import { Navigation, buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import type { PayrollEmployee, PayrollIssue } from '../../../types/payrollTypes'
import { payrollIssueCodeTitle } from '../../../utils/payrollIssueCodeLabels'
import { SeverityBadge } from '../../shared/StatusBadge'
import { EmployeeDrawerHero } from '../../shared/EmployeeDrawerHero'
import { resolveExceptionConfigs } from './exceptionDetailConfig'

interface ExceptionDetailDrawerProps {
  issue: PayrollIssue | null
  employee: PayrollEmployee | null
  accessToken?: string
  onClose: () => void
  t: (key: string) => string
}

const Section: React.FC<{
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}> = ({ title, children, action }) => (
  <Card className="gba:p-4">
    <div className="gba:mb-4 gba:flex gba:items-start gba:justify-between gba:gap-3">
      <h4 className="gba:min-w-0 gba:flex-1 gba:text-sm gba:font-semibold gba:text-foreground">{title}</h4>
      {action ? <div className="gba:max-w-[55%] gba:shrink-0">{action}</div> : null}
    </div>
    <div className="gba:space-y-2">{children}</div>
  </Card>
)

const FieldRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="gba:flex gba:items-start gba:justify-between gba:gap-3 gba:text-sm">
    <span className="gba:text-muted-foreground">{label}</span>
    <span className="gba:max-w-[60%] gba:text-right gba:font-medium gba:text-foreground">{value}</span>
  </div>
)

const SuggestedActionRow: React.FC<{ label: string; action: React.ReactNode }> = ({ label, action }) => (
  <div className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:text-sm">
    <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-2 gba:text-muted-foreground">
      <SparkleIcon className="gba:h-4 gba:w-4 gba:shrink-0" weight="fill" />
      <span className="gba:font-semibold">{label}</span>
    </div>
    <div className="gba:shrink-0">{action}</div>
  </div>
)

function renderSectionAction(
  resolvedActions: ReturnType<typeof useAppActionData>['combinedData'],
  testId: string,
  label: string
): React.ReactNode {
  if (resolvedActions.length === 0) {
    return null
  }

  return (
    <ActionButton
      actions={resolvedActions}
      autoExecuteSingleAction={true}
      emptyStateBehavior="enable"
      size="sm"
      data-testid={testId}
      className="gba:inline-flex gba:h-auto gba:min-h-10 gba:w-fit gba:max-w-full gba:whitespace-normal gba:break-words gba:px-2 gba:py-2 gba:text-center gba:leading-tight [&_button]:gba:w-fit"
    >
      <span className="gba:block gba:max-w-full gba:whitespace-normal gba:break-words gba:text-center gba:leading-tight">
        {label}
      </span>
    </ActionButton>
  )
}

export const ExceptionDetailDrawer: React.FC<ExceptionDetailDrawerProps> = ({
  issue,
  employee,
  accessToken,
  onClose,
  t
}) => {
  const hasSelection = issue !== null && employee !== null
  const configs = useMemo(() => {
    if (!issue || !employee) {
      return []
    }

    return resolveExceptionConfigs(issue, employee, t)
  }, [employee, issue, t])
  const actionableConfig = configs.find(config => config.flowContext)
  const actionableFlowContext = actionableConfig?.flowContext
  const employeeId = employee?.employeeId
  const actionLookupConfig = useMemo(
    () => ({
      contextsArray: actionableFlowContext && employeeId ? [actionableFlowContext] : undefined,
      externalContextData: actionableFlowContext && employeeId ? { employeeId } : undefined,
      accessToken,
      deferMainContextRequestsUntilClick: false,
      emptyStateBehavior: 'enable' as const
    }),
    [accessToken, actionableFlowContext, employeeId]
  )
  const { combinedData, shouldShowLoading } = useAppActionData(actionLookupConfig, 'ExceptionDetailDrawerAction')
  const isResolvingAction = Boolean(hasSelection && actionableFlowContext && accessToken && shouldShowLoading)
  const resolvedActions = useMemo(
    () =>
      combinedData.map(action => ({
        ...action,
        onClick: () => {
          onClose()
          action.onClick?.()
        }
      })),
    [combinedData, onClose]
  )

  if (!hasSelection || !issue || !employee) {
    return null
  }

  const openEmployeeRecord = () => {
    navigateTo(buildPlatformUrl(Navigation.HR_EMPLOYEE_RECORD, { id: employee.employeeId }))
  }

  return (
    <Sheet open={hasSelection} onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className="gba:flex gba:flex-col gba:p-0" data-testid="payroll-prep-exception-drawer">
        <SheetHeader className="gba:border-b gba:border-border gba:px-6 gba:py-4 gba:pr-14">
          <SheetTitle className="gba:text-left">{t('employee-information-title')}</SheetTitle>
        </SheetHeader>

        {isResolvingAction ? (
          <div className="gba:flex gba:min-h-[320px] gba:flex-1 gba:flex-col gba:items-center gba:justify-center gba:gap-3 gba:px-6 gba:py-4">
            <Spinner size="lg" data-testid="payroll-prep-exception-drawer-loading" />
            <p className="gba:text-sm gba:text-muted-foreground">{t('loading')}</p>
          </div>
        ) : (
          <ScrollArea className="gba:flex-1 gba:min-h-0">
            <div className="gba:space-y-4 gba:px-6 gba:py-4">
              <EmployeeDrawerHero
                employee={employee}
                onOpenProfile={openEmployeeRecord}
                t={t}
                testIdPrefix="payroll-prep-exception-drawer"
              />

              {actionableConfig && resolvedActions.length > 0 && (
                <SuggestedActionRow
                  label={t('exception-detail-suggested-actions')}
                  action={renderSectionAction(
                    resolvedActions,
                    `payroll-prep-exception-action-${issue.issueCode.toLowerCase()}`,
                    t(actionableConfig.actionLabelKey || 'exception-action-review')
                  )}
                />
              )}

              <Section title={t('exception-detail-issue')}>
                <FieldRow label={t('exception-detail-title')} value={payrollIssueCodeTitle(issue.issueCode, t)} />
                <FieldRow label={t('label-severity')} value={<SeverityBadge severity={issue.severity} t={t} />} />
                <FieldRow label={t('label-message')} value={issue.message} />
                <FieldRow label={t('label-category')} value={t(`category-${issue.category.replace(/_/g, '-')}`)} />
              </Section>

              <Section title={t('exception-detail-employee')}>
                <FieldRow label={t('grid-status')} value={employee.employmentStatus || '-'} />
                <FieldRow label={t('grid-department')} value={employee.department || '-'} />
                <FieldRow label={t('grid-location')} value={employee.workLocation || '-'} />
                <FieldRow label={t('grid-legal-entity')} value={employee.legalEntityName || '-'} />
              </Section>

              {configs.map(config => {
                const hasResolvedActions = Boolean(
                  config.flowContext && config.flowContext === actionableFlowContext && resolvedActions.length > 0
                )

                return (
                  <Section key={config.sectionTitleKey} title={t(config.sectionTitleKey)}>
                    {config.fields.map(field => (
                      <FieldRow key={field.label} label={field.label} value={field.value} />
                    ))}
                    {(!config.flowContext || !accessToken || !hasResolvedActions) && (
                      <p className="gba:text-xs gba:text-muted-foreground">{t('exception-detail-no-direct-action')}</p>
                    )}
                  </Section>
                )
              })}
              {configs.length === 0 && (
                <Section title={t('exception-section-review')}>
                  <p className="gba:text-sm gba:text-muted-foreground">{t('exception-detail-no-direct-action')}</p>
                </Section>
              )}
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  )
}
