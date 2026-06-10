import React, { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  DataDisplay,
  Spinner,
  toast,
  useTranslation
} from '@newwork/nw-design-system'
import { XCircleIcon } from '@phosphor-icons/react'
import { ErrorBoundary } from '@/business-apps/core/every/apps/every-box/components/ErrorBoundary'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { EmployeeSkillRecord } from '../types'
import { useSkillMutations } from '../hooks/useSkillMutations'
import ConfirmSkillActionDialog from './ConfirmSkillActionDialog'
import { TabDataTable } from '@/business-apps/hr/core/apps/monthly-compensation-changes/components/TabDataTable'
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
  const [searchTerm, setSearchTerm] = useState('')
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

  const filteredPendingSkills = useMemo(() => {
    if (!searchTerm.trim()) {
      return pendingSkills
    }

    const query = searchTerm.toLowerCase()
    return pendingSkills.filter(skill => {
      return getSkillName(skill).toLowerCase().includes(query) || getEmployeeName(skill).toLowerCase().includes(query)
    })
  }, [pendingSkills, searchTerm])

  const titleSections = useMemo(
    () => [
      {
        id: 'all',
        label: t('tab-pending-skills'),
        metadata: { count: searchTerm.trim() ? filteredPendingSkills.length : totalCount }
      }
    ],
    [filteredPendingSkills.length, searchTerm, totalCount, t]
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
      <DataDisplay
        titleSections={titleSections}
        currentSection="all"
        onSectionChange={() => {}}
        searchValue={searchTerm}
        searchPlaceholder={t('search-skills')}
        onSearchChange={setSearchTerm}
        filters={{}}
        onFilterChange={() => {}}
        filterSheetTitle={t('tab-pending-skills')}
        filterSheetDescription={t('pending-description')}
        toolbarDensity="compact"
      >
        <ErrorBoundary>
          <TabDataTable
            data={filteredPendingSkills}
            columns={columns}
            loading={isLoading}
            error={null}
            emptyMessage={searchTerm ? t('empty-no-matching-skills') : t('pending-no-requests')}
          />
        </ErrorBoundary>
      </DataDisplay>

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
