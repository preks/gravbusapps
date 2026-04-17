import React, { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { ActionMenu, Button, Card, Spinner } from '@newwork/nw-design-system'
import { ArrowSquareOutIcon, UserIcon, XIcon } from '@phosphor-icons/react'
import { useAppActionData } from '@/common/hooks/useAppActionData'
import { Navigation, buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import type { PayrollEmployee, PayrollIssue } from '../../../types/payrollTypes'
import { payrollIssueCodeTitle } from '../../../utils/payrollIssueCodeLabels'
import { SeverityBadge } from '../../shared/StatusBadge'
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
    <div className="gba:mb-4 gba:flex gba:items-center gba:justify-between gba:gap-3">
      <h4 className="gba:text-sm gba:font-semibold gba:text-foreground">{title}</h4>
      {action}
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

export const ExceptionDetailDrawer: React.FC<ExceptionDetailDrawerProps> = ({
  issue,
  employee,
  accessToken,
  onClose,
  t
}) => {
  if (issue === null || employee === null) {
    return null
  }

  const configs = resolveExceptionConfigs(issue, employee, t)
  const actionableConfig = configs.find(config => config.flowContext)
  const actionableFlowContext = actionableConfig?.flowContext
  const actionLookupConfig = useMemo(
    () => ({
      contextsArray: actionableFlowContext ? [actionableFlowContext] : undefined,
      externalContextData: actionableFlowContext ? { employeeId: employee.employeeId } : undefined,
      accessToken,
      deferMainContextRequestsUntilClick: false,
      emptyStateBehavior: 'enable' as const
    }),
    [accessToken, actionableFlowContext, employee.employeeId]
  )
  const { combinedData, shouldShowLoading } = useAppActionData(actionLookupConfig, 'ExceptionDetailDrawerAction')
  const isResolvingAction = Boolean(actionableFlowContext && accessToken && shouldShowLoading)
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

  const openEmployeeRecord = () => {
    navigateTo(buildPlatformUrl(Navigation.HR_EMPLOYEE_RECORD, { id: employee.employeeId }))
  }

  const panel = (
    <>
      <button
        type="button"
        aria-label={t('close')}
        className="gba:fixed gba:inset-0 gba:z-[100] gba:bg-black/20"
        onClick={onClose}
        data-testid="payroll-prep-exception-drawer-backdrop"
      />
      <aside
        className="gba:fixed gba:top-0 gba:bottom-0 gba:right-0 gba:z-[101] gba:w-[480px] gba:max-w-[100vw] gba:overflow-y-auto gba:border-l gba:border-border gba:bg-background gba:shadow-2xl"
        data-testid="payroll-prep-exception-drawer"
      >
        <div className="gba:sticky gba:top-0 gba:z-10 gba:border-b gba:border-border gba:bg-background gba:px-6 gba:py-4">
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:flex gba:h-10 gba:w-10 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted">
                {employee.pictureThumbnail ? (
                  <img
                    src={`data:image/jpeg;base64,${employee.pictureThumbnail}`}
                    alt=""
                    className="gba:h-10 gba:w-10 gba:rounded-full gba:object-cover"
                  />
                ) : (
                  <UserIcon size={20} className="gba:text-muted-foreground" />
                )}
              </div>
              <div>
                <h3 className="gba:text-base gba:font-semibold gba:text-foreground">{employee.fullName}</h3>
                <p className="gba:text-xs gba:text-muted-foreground">
                  {t('grid-employee-code')}: {employee.code}
                </p>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={openEmployeeRecord}
                title={t('exception-detail-open-employee')}
                data-testid="payroll-prep-exception-drawer-open-record-button"
              >
                <ArrowSquareOutIcon size={18} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                data-testid="payroll-prep-exception-drawer-close-button"
              >
                <XIcon size={18} />
              </Button>
            </div>
          </div>
        </div>

        {isResolvingAction ? (
          <div className="gba:flex gba:min-h-[320px] gba:flex-col gba:items-center gba:justify-center gba:gap-3 gba:px-6 gba:py-4">
            <Spinner size="lg" />
            <p className="gba:text-sm gba:text-muted-foreground">{t('loading')}</p>
          </div>
        ) : (
          <div className="gba:space-y-4 gba:px-6 gba:py-4">
            <Section title={t('exception-detail-issue')}>
              <FieldRow label={t('exception-detail-title')} value={payrollIssueCodeTitle(issue.issueCode, t)} />
              <FieldRow label={t('label-severity')} value={<SeverityBadge severity={issue.severity} t={t} />} />
              <FieldRow label={t('label-code')} value={issue.issueCode} />
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
              const action = hasResolvedActions ? (
                resolvedActions.length === 1 ? (
                  <Button
                    size="sm"
                    onClick={() => resolvedActions[0].onClick?.()}
                    data-testid={`payroll-prep-exception-action-${issue.issueCode.toLowerCase()}`}
                  >
                    {t(config.actionLabelKey || 'exception-action-review')}
                  </Button>
                ) : (
                  <ActionMenu actions={resolvedActions} emptyStateBehavior="enable">
                    <Button size="sm" data-testid={`payroll-prep-exception-action-${issue.issueCode.toLowerCase()}`}>
                      {t(config.actionLabelKey || 'exception-action-review')}
                    </Button>
                  </ActionMenu>
                )
              ) : null

              return (
                <Section key={config.sectionTitleKey} title={t(config.sectionTitleKey)} action={action}>
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
        )}
      </aside>
    </>
  )

  return createPortal(panel, document.body)
}
