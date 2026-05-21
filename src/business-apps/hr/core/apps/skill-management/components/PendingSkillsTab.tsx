import React, { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  DataTable,
  Spinner,
  toast,
  useTranslation
} from '@newwork/nw-design-system'
import { SortingState } from '@tanstack/react-table'
import { ClockCountdownIcon, XCircleIcon } from '@phosphor-icons/react'
import { ErrorBoundary } from '@/business-apps/core/every/apps/every-box/components/ErrorBoundary'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { EmployeeSkillRecord } from '../types'
import { useSkillMutations } from '../hooks/useSkillMutations'
import ConfirmSkillActionDialog from './ConfirmSkillActionDialog'
import {
  buildPendingSkillsColumns,
  getEmployeeName,
  getSkillName,
  type PendingSkillAction,
  type PendingSkillActionState
} from './pendingSkillsColumns'
import translations from '../_i18n'

export interface PendingSkillsTabProps extends BusinessAppContextProps {
  pendingSkills: EmployeeSkillRecord[]
  totalCount: number
  isLoading: boolean
  error: string | null
  prefixDataTestId?: string
  onDataChange: () => void
}

function PendingSkillsTab({
  prefixDataTestId,
  accessToken,
  userInfo,
  pendingSkills,
  totalCount,
  isLoading,
  error,
  onDataChange
}: Readonly<PendingSkillsTabProps>) {
  const { t } = useTranslation(translations)
  const [sorting, setSorting] = useState<SortingState>([])
  const [pendingAction, setPendingAction] = useState<PendingSkillActionState | null>(null)
  const { approveEmployeeSkill, rejectEmployeeSkill, isApprovalLoading } = useSkillMutations(accessToken)

  const handleStartAction = useCallback((skill: EmployeeSkillRecord, action: PendingSkillAction) => {
    setPendingAction({ skill, action })
  }, [])

  const handleConfirmAction = useCallback(async () => {
    const actionToComplete = pendingAction

    if (!actionToComplete?.skill.flowTask) {
      toast.error(t('pending-no-process-instance'))
      return
    }

    setPendingAction(null)

    try {
      if (actionToComplete.action === 'approve') {
        await approveEmployeeSkill(actionToComplete.skill.flowTask, userInfo?.id)
        toast.success(t('toast-skill-approved'))
      } else {
        await rejectEmployeeSkill(actionToComplete.skill.flowTask, userInfo?.id)
        toast.success(t('toast-skill-rejected'))
      }

      onDataChange()
    } catch (err) {
      const description = err instanceof Error ? err.message : undefined
      toast.error(t('toast-skill-error'), { description })
    }
  }, [approveEmployeeSkill, onDataChange, pendingAction, rejectEmployeeSkill, t, userInfo?.id])

  const columns = useMemo(
    () => buildPendingSkillsColumns(t, prefixDataTestId, handleStartAction, isApprovalLoading),
    [handleStartAction, isApprovalLoading, prefixDataTestId, t]
  )
  const pendingActionDescription = useMemo(() => {
    if (!pendingAction) {
      return ''
    }

    const translationKey = pendingAction.action === 'reject' ? 'pending-confirm-reject' : 'pending-confirm-approve'

    return t(translationKey, {
      skillName: getSkillName(pendingAction.skill),
      employeeName: getEmployeeName(pendingAction.skill)
    })
  }, [pendingAction, t])

  if (error) {
    return (
      <div className="gba:p-4">
        <Alert className="gba:w-full gba:!flex gba:justify-between gba:!items-center" variant="destructive">
          <AlertTitle className="gba:flex gba:items-center gba:gap-2">
            <XCircleIcon className="h-4 w-4" />
            {t('error-loading-pending')}
          </AlertTitle>
          <AlertDescription>
            <Button size="sm" variant="destructive" onClick={onDataChange}>
              {t('skill-actions-retry')}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isLoading && pendingSkills.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
        <Spinner />
      </div>
    )
  }

  return (
    <>
      <Card className="gba:rounded-lg gba:border gba:bg-card gba:text-card-foreground gba:shadow-sm gba:overflow-hidden">
        <div className="gba:p-6 gba:pb-0">
          <h3 className="gba:text-lg gba:font-semibold">
            {t('tab-pending-skills')} ({totalCount})
          </h3>
          <p className="gba:text-sm gba:text-muted-foreground">{t('pending-description')}</p>
        </div>

        <CardContent className="gba:pt-4">
          {pendingSkills.length === 0 ? (
            <div className="gba:text-center gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
              <ClockCountdownIcon className="gba:h-12 gba:w-12 gba:text-gray-400" />
              <p className="gba:font-normal gba:text-gray-500 gba:mt-2">{t('pending-no-requests')}</p>
            </div>
          ) : (
            <ErrorBoundary>
              <DataTable
                data={pendingSkills}
                columns={columns}
                sorting={sorting}
                onSortingChange={setSorting}
                enableSorting
                enablePagination
              />
            </ErrorBoundary>
          )}
        </CardContent>
      </Card>

      <ConfirmSkillActionDialog
        open={!!pendingAction}
        onOpenChange={open => !open && setPendingAction(null)}
        title={pendingAction?.action === 'reject' ? t('pending-reject') : t('pending-approve')}
        description={pendingActionDescription}
        confirmLabel={pendingAction?.action === 'reject' ? t('pending-reject') : t('pending-approve')}
        cancelLabel={t('confirm-delete-cancel')}
        onConfirm={handleConfirmAction}
        variant={pendingAction?.action === 'reject' ? 'destructive' : 'default'}
        isLoading={isApprovalLoading}
      />
    </>
  )
}

export default React.memo(PendingSkillsTab)
