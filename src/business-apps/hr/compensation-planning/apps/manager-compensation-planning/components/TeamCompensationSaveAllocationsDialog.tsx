import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useTranslation
} from '@newwork/nw-design-system'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { RestClient } from '@/common/network/rest/RestClient'
import type { DistributionMethod, TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import compensationPlanningTranslations from '../../compensation-planning/_i18n'
import {
  persistAllocationsForSelectedEmployees,
  validateCustomPoolForSelected,
  validatePlanOuForAllSelected
} from '../utils/teamCompensationSaveAllocationsWorkflow'
import { roundMoney2 } from '../../../utils/budgetAmountPercentSync'
import translations from '../_i18n'
import { TeamCompensationSaveAllocationsDialogRows } from './TeamCompensationSaveAllocationsDialogRows'

const EMPTY_EMPLOYEE_ID_SET: ReadonlySet<string> = new Set()

export interface TeamCompensationSaveAllocationsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string | undefined
  managerEmployeeId: string | undefined
  restClient: RestClient
  teamMembers: TeamMemberCompensationData[]
  allocationByEmployeeId: ReadonlyMap<string, number>
  distributionMethod: DistributionMethod
  distributionPool: number | null
  currencyCode: string
  planOuRowIdByOrganizationalUnitId: ReadonlyMap<string, string>
  managerOrganizationalUnitId: string | null
  /** Called after successful saves; includes REST row ids keyed by employee id when returned by the API. */
  onSaved?: (createdIdsByEmployeeId?: Record<string, string>) => void | Promise<void>
  /**
   * Employees who already have a proposal in the review pipeline (e.g. submitted); cannot be
   * selected for another manager submit.
   */
  employeeIdsBlockedFromManagerResubmit?: ReadonlySet<string>
}

export function TeamCompensationSaveAllocationsDialog({
  open,
  onOpenChange,
  accessToken,
  managerEmployeeId,
  restClient,
  teamMembers,
  allocationByEmployeeId,
  distributionMethod,
  distributionPool,
  currencyCode,
  planOuRowIdByOrganizationalUnitId,
  managerOrganizationalUnitId,
  onSaved,
  employeeIdsBlockedFromManagerResubmit = EMPTY_EMPLOYEE_ID_SET
}: Readonly<TeamCompensationSaveAllocationsDialogProps>) {
  const { t } = useTranslation(translations)
  const { t: tBudget } = useTranslation(compensationPlanningTranslations)
  const graphqlClient = useGraphQLClient(accessToken ?? '')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  /** Avoid resetting checkbox state when parent re-renders while the dialog stays open. */
  const hasInitializedSelectionForOpenRef = useRef(false)

  const sortedMembers = useMemo(
    () => [...teamMembers].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [teamMembers]
  )

  const memberById = useMemo(() => {
    const map = new Map<string, TeamMemberCompensationData>()
    for (const m of teamMembers) {
      map.set(m.employeeId, m)
    }
    return map
  }, [teamMembers])

  useEffect(() => {
    if (!open) {
      hasInitializedSelectionForOpenRef.current = false
      return
    }
    setErrorMessage(null)
    if (hasInitializedSelectionForOpenRef.current) {
      return
    }
    if (sortedMembers.length === 0) {
      return
    }
    hasInitializedSelectionForOpenRef.current = true
    const next = new Set<string>()
    for (const m of sortedMembers) {
      if (employeeIdsBlockedFromManagerResubmit.has(m.employeeId)) {
        continue
      }
      const raw = allocationByEmployeeId.get(m.employeeId) ?? 0
      if (roundMoney2(raw) > 0) {
        next.add(m.employeeId)
      }
    }
    setSelectedEmployeeIds(next)
  }, [open, sortedMembers, allocationByEmployeeId, employeeIdsBlockedFromManagerResubmit])

  useEffect(() => {
    if (!open) {
      return
    }
    setSelectedEmployeeIds(prev => {
      let changed = false
      const next = new Set(prev)
      for (const id of employeeIdsBlockedFromManagerResubmit) {
        if (next.has(id)) {
          next.delete(id)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [open, employeeIdsBlockedFromManagerResubmit])

  const toggleEmployee = useCallback(
    (employeeId: string, checked: boolean) => {
      if (employeeIdsBlockedFromManagerResubmit.has(employeeId)) {
        return
      }
      setSelectedEmployeeIds(prev => {
        const next = new Set(prev)
        if (checked) {
          next.add(employeeId)
        } else {
          next.delete(employeeId)
        }
        return next
      })
    },
    [employeeIdsBlockedFromManagerResubmit]
  )

  const selectAll = useCallback(() => {
    setSelectedEmployeeIds(
      new Set(
        sortedMembers.filter(m => !employeeIdsBlockedFromManagerResubmit.has(m.employeeId)).map(m => m.employeeId)
      )
    )
  }, [sortedMembers, employeeIdsBlockedFromManagerResubmit])

  const selectNone = useCallback(() => {
    setSelectedEmployeeIds(new Set())
  }, [])

  const poolOk = distributionPool != null && distributionPool > 0

  const handleConfirmSave = useCallback(async () => {
    setErrorMessage(null)
    if (!accessToken) {
      setErrorMessage(t('manager-team-save-no-token'))
      return
    }
    if (!managerEmployeeId) {
      setErrorMessage(t('manager-team-save-no-employee'))
      return
    }
    if (!poolOk) {
      setErrorMessage(t('manager-team-save-dialog-no-pool'))
      return
    }

    const ids = [...selectedEmployeeIds]
    if (ids.length === 0) {
      setErrorMessage(t('manager-team-save-dialog-none-selected'))
      return
    }

    const blockedSelected = ids.filter(id => employeeIdsBlockedFromManagerResubmit.has(id))
    if (blockedSelected.length > 0) {
      setErrorMessage(t('manager-team-save-dialog-includes-already-submitted'))
      return
    }

    if (!validateCustomPoolForSelected(distributionMethod, distributionPool, ids, allocationByEmployeeId)) {
      setErrorMessage(t('manager-team-save-dialog-custom-exceeds-pool-selected'))
      return
    }

    const planOuCheck = validatePlanOuForAllSelected(
      ids,
      memberById,
      planOuRowIdByOrganizationalUnitId,
      managerOrganizationalUnitId
    )
    if (!planOuCheck.ok) {
      setErrorMessage(t('manager-team-save-missing-plan-ou', { name: planOuCheck.displayName }))
      return
    }

    setSaving(true)
    try {
      /**
       * Inserts employee rows with `allocationAmount` in the REST payload (same value as `proposedSalaryIncreaseAmount`),
       * then rolls that sum into `compensation_budget_plan_organizational_unit.allocation_amount` per plan-OU row.
       */
      const createdIdsByEmployeeId = await persistAllocationsForSelectedEmployees({
        graphqlClient,
        restClient,
        accessToken,
        selectedIds: ids,
        memberById,
        allocationByEmployeeId,
        planOuRowIdByOrganizationalUnitId,
        managerOrganizationalUnitId,
        managerEmployeeId,
        employeeIdsBlockedFromManagerResubmit
      })
      await onSaved?.(createdIdsByEmployeeId)
      onOpenChange(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('manager-team-save-error-generic')
      setErrorMessage(t('manager-team-save-error', { message: msg }))
    } finally {
      setSaving(false)
    }
  }, [
    accessToken,
    allocationByEmployeeId,
    distributionMethod,
    distributionPool,
    graphqlClient,
    managerEmployeeId,
    memberById,
    managerOrganizationalUnitId,
    onOpenChange,
    onSaved,
    planOuRowIdByOrganizationalUnitId,
    poolOk,
    restClient,
    selectedEmployeeIds,
    t,
    employeeIdsBlockedFromManagerResubmit
  ])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gba:max-h-[85vh] gba:max-w-2xl gba:overflow-y-auto"
        data-testid="manager-team-save-allocations-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t('manager-team-save-dialog-title')}</DialogTitle>
        </DialogHeader>

        <p className="gba:text-sm gba:text-muted-foreground">{t('manager-team-save-dialog-description')}</p>

        <div className="gba:flex gba:flex-wrap gba:gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectAll}
            data-testid="manager-team-save-dialog-select-all"
          >
            {t('manager-team-save-dialog-select-all')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={selectNone}
            data-testid="manager-team-save-dialog-select-none"
          >
            {t('manager-team-save-dialog-select-none')}
          </Button>
        </div>

        {poolOk === false ? (
          <p className="gba:text-sm gba:text-destructive" data-testid="manager-team-save-dialog-pool-warning">
            {t('manager-team-save-dialog-no-pool')}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="gba:text-sm gba:text-destructive" data-testid="manager-team-save-dialog-error">
            {errorMessage}
          </p>
        ) : null}

        <TeamCompensationSaveAllocationsDialogRows
          sortedMembers={sortedMembers}
          allocationByEmployeeId={allocationByEmployeeId}
          selectedEmployeeIds={selectedEmployeeIds}
          employeeIdsBlockedFromManagerResubmit={employeeIdsBlockedFromManagerResubmit}
          distributionPool={distributionPool}
          poolOk={poolOk}
          currencyCode={currencyCode}
          saving={saving}
          onToggle={toggleEmployee}
          t={t}
          tBudget={tBudget}
        />

        <DialogFooter className="gba:gap-2 sm:gba:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            data-testid="manager-team-save-dialog-cancel"
          >
            {t('manager-team-save-dialog-cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => {
              handleConfirmSave().catch(() => {})
            }}
            disabled={saving || !poolOk || selectedEmployeeIds.size === 0}
            data-testid="manager-team-save-dialog-confirm"
          >
            {saving ? t('manager-team-save-dialog-saving') : t('manager-team-save-dialog-confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
