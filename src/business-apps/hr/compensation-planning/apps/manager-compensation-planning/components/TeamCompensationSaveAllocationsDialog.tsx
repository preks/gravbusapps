import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useTranslation
} from '@newwork/nw-design-system'
import type { RestClient } from '@/common/network/rest/RestClient'
import { saveCompensationBudgetPlanEmployee } from '../../../api/saveCompensationBudgetPlan'
import type { DistributionMethod, TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import compensationPlanningTranslations from '../../compensation-planning/_i18n'
import {
  buildSaveCompensationBudgetPlanEmployeeInsertBody,
  resolvePlanOrganizationalUnitRowIdForTeamMember
} from '../utils/buildManagerEmployeeBudgetSaveBody'
import translations from '../_i18n'
import { TeamCompensationSaveAllocationsDialogRows } from './TeamCompensationSaveAllocationsDialogRows'

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
  onSaved?: () => void | Promise<void>
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
  onSaved
}: Readonly<TeamCompensationSaveAllocationsDialogProps>) {
  const { t } = useTranslation(translations)
  const { t: tBudget } = useTranslation(compensationPlanningTranslations)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
      return
    }
    setErrorMessage(null)
    setSelectedEmployeeIds(new Set(sortedMembers.map(m => m.employeeId)))
  }, [open, sortedMembers])

  const toggleEmployee = useCallback((employeeId: string, checked: boolean) => {
    setSelectedEmployeeIds(prev => {
      const next = new Set(prev)
      if (checked) {
        next.add(employeeId)
      } else {
        next.delete(employeeId)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedEmployeeIds(new Set(sortedMembers.map(m => m.employeeId)))
  }, [sortedMembers])

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

    if (distributionMethod === 'custom' && distributionPool != null) {
      let sumSelected = 0
      for (const id of ids) {
        sumSelected += allocationByEmployeeId.get(id) ?? 0
      }
      if (sumSelected > distributionPool + 0.01) {
        setErrorMessage(t('manager-team-save-dialog-custom-exceeds-pool-selected'))
        return
      }
    }

    for (const id of ids) {
      const m = memberById.get(id)
      if (!m) {
        continue
      }
      const planOuId = resolvePlanOrganizationalUnitRowIdForTeamMember(
        m,
        planOuRowIdByOrganizationalUnitId,
        managerOrganizationalUnitId
      )
      if (!planOuId) {
        setErrorMessage(t('manager-team-save-missing-plan-ou', { name: m.displayName }))
        return
      }
    }

    const submittedAt = new Date().toISOString()

    setSaving(true)
    try {
      for (const id of ids) {
        const m = memberById.get(id)
        if (!m) {
          continue
        }
        const planOuId = resolvePlanOrganizationalUnitRowIdForTeamMember(
          m,
          planOuRowIdByOrganizationalUnitId,
          managerOrganizationalUnitId
        )
        if (!planOuId) {
          continue
        }
        const rawAmount = allocationByEmployeeId.get(id) ?? 0
        const body = buildSaveCompensationBudgetPlanEmployeeInsertBody(m, rawAmount, planOuId, managerEmployeeId, {
          submittedAt
        })
        await saveCompensationBudgetPlanEmployee(restClient, accessToken, body)
      }
      await onSaved?.()
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
    managerEmployeeId,
    memberById,
    managerOrganizationalUnitId,
    onOpenChange,
    onSaved,
    planOuRowIdByOrganizationalUnitId,
    poolOk,
    restClient,
    selectedEmployeeIds,
    t
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
            onClick={() => void handleConfirmSave()}
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
