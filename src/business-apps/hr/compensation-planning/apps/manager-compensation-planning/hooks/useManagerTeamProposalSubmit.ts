import { useCallback, useMemo, useState } from 'react'
import type { RestClient } from '@/common/network/rest/RestClient'
import { saveCompensationBudgetPlanEmployee } from '../../../api/saveCompensationBudgetPlan'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import {
  computeManagerProposalAmountsFromIncrease,
  resolvePlanOrganizationalUnitRowIdForTeamMember
} from '../utils/buildManagerEmployeeBudgetSaveBody'
import { buildSubmitEmployeeProposalUpdateBodyFromRow } from '../utils/buildSubmitEmployeeProposalUpdateBody'

export type ManagerEmployeeBudgetRowEntry = { rowId: string; status: 'draft' | 'submitted' }

export type ManagerEmployeeBudgetRowStateMap = Readonly<Record<string, ManagerEmployeeBudgetRowEntry>>

interface UseManagerTeamProposalSubmitParams {
  accessToken: string | undefined
  managerEmployeeId: string | undefined
  restClient: RestClient
  teamMembers: TeamMemberCompensationData[]
  allocationByEmployeeId: ReadonlyMap<string, number>
  planOuRowIdByOrganizationalUnitId: ReadonlyMap<string, string>
  managerOrganizationalUnitId: string | null
  employeeBudgetRowState: ManagerEmployeeBudgetRowStateMap
  onDraftsSubmitted: () => void
  tError: (key: string, args?: Record<string, string | number>) => string
}

export function useManagerTeamProposalSubmit({
  accessToken,
  managerEmployeeId,
  restClient,
  teamMembers,
  allocationByEmployeeId,
  planOuRowIdByOrganizationalUnitId,
  managerOrganizationalUnitId,
  employeeBudgetRowState,
  onDraftsSubmitted,
  tError
}: UseManagerTeamProposalSubmitParams) {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const memberById = useMemo(() => {
    const map = new Map<string, TeamMemberCompensationData>()
    for (const m of teamMembers) {
      map.set(m.employeeId, m)
    }
    return map
  }, [teamMembers])

  const draftEmployeeIds = useMemo(() => {
    return Object.entries(employeeBudgetRowState)
      .filter(([, v]) => v.status === 'draft')
      .map(([id]) => id)
  }, [employeeBudgetRowState])

  const submitDraftProposals = useCallback(async () => {
    setErrorMessage(null)
    if (!accessToken) {
      setErrorMessage(tError('manager-team-save-no-token'))
      return
    }
    if (!managerEmployeeId) {
      setErrorMessage(tError('manager-team-save-no-employee'))
      return
    }
    if (draftEmployeeIds.length === 0) {
      setErrorMessage(tError('manager-team-submit-no-drafts'))
      return
    }

    const submittedAtIso = new Date().toISOString()

    setSubmitting(true)
    try {
      for (const employeeId of draftEmployeeIds) {
        const entry = employeeBudgetRowState[employeeId]
        const member = memberById.get(employeeId)
        if (!entry || !member) {
          continue
        }
        const planOuId = resolvePlanOrganizationalUnitRowIdForTeamMember(
          member,
          planOuRowIdByOrganizationalUnitId,
          managerOrganizationalUnitId
        )
        if (!planOuId) {
          setErrorMessage(tError('manager-team-save-missing-plan-ou', { name: member.displayName }))
          return
        }
        const rawAmount = allocationByEmployeeId.get(employeeId) ?? 0
        const { proposedSalaryIncreaseAmount, proposedSalaryIncreasePercent, proposedNewSalary } =
          computeManagerProposalAmountsFromIncrease(member, rawAmount)
        const body = buildSubmitEmployeeProposalUpdateBodyFromRow(
          employeeId,
          entry.rowId,
          planOuId,
          managerEmployeeId,
          submittedAtIso,
          proposedSalaryIncreaseAmount,
          proposedSalaryIncreasePercent,
          proposedNewSalary
        )
        await saveCompensationBudgetPlanEmployee(restClient, accessToken, body)
      }
      onDraftsSubmitted()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : tError('manager-team-save-error-generic')
      setErrorMessage(tError('manager-team-submit-error', { message: msg }))
    } finally {
      setSubmitting(false)
    }
  }, [
    accessToken,
    allocationByEmployeeId,
    draftEmployeeIds,
    employeeBudgetRowState,
    managerEmployeeId,
    managerOrganizationalUnitId,
    memberById,
    onDraftsSubmitted,
    planOuRowIdByOrganizationalUnitId,
    restClient,
    tError
  ])

  return {
    submitDraftProposals,
    submitting,
    errorMessage,
    setErrorMessage,
    draftCount: draftEmployeeIds.length
  }
}
