import { useCallback, useMemo, useState } from 'react'
import type { RestClient } from '@/common/network/rest/RestClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import {
  executeManagerTeamDraftSubmit,
  type SubmitOneDraftProposalFailure
} from '../utils/managerTeamProposalSubmitWorkflow'

type ManagerTeamDraftSubmitReady =
  | { ok: true; accessToken: string; managerEmployeeId: string }
  | { ok: false; errorMessage: string }

function resolveManagerTeamDraftSubmitReady(
  accessToken: string | undefined,
  managerEmployeeId: string | undefined,
  draftCount: number,
  tError: (key: string, args?: Record<string, string | number>) => string
): ManagerTeamDraftSubmitReady {
  if (!accessToken) {
    return { ok: false, errorMessage: tError('manager-team-save-no-token') }
  }
  if (!managerEmployeeId) {
    return { ok: false, errorMessage: tError('manager-team-save-no-employee') }
  }
  if (draftCount === 0) {
    return { ok: false, errorMessage: tError('manager-team-submit-no-drafts') }
  }
  return { ok: true, accessToken, managerEmployeeId }
}

function draftSubmitFailureUserMessage(
  tError: (key: string, args?: Record<string, string | number>) => string,
  result: SubmitOneDraftProposalFailure
): string {
  if (result.reason === 'missing-plan-ou') {
    return tError('manager-team-save-missing-plan-ou', { name: result.displayName })
  }
  return tError('manager-team-submit-missing-row-version')
}

export type ManagerEmployeeBudgetRowEntry = { rowId: string; status: 'draft' | 'submitted' }

export type ManagerEmployeeBudgetRowStateMap = Readonly<Record<string, ManagerEmployeeBudgetRowEntry>>

interface UseManagerTeamProposalSubmitParams {
  accessToken: string | undefined
  managerEmployeeId: string | undefined
  restClient: RestClient
  companyId: string | null
  activeCompensationBudgetPlanId: string | null
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
  companyId,
  activeCompensationBudgetPlanId,
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
  const graphqlClient = useGraphQLClient(accessToken)

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
    const ready = resolveManagerTeamDraftSubmitReady(accessToken, managerEmployeeId, draftEmployeeIds.length, tError)
    if (!ready.ok) {
      setErrorMessage(ready.errorMessage)
      return
    }

    const submittedAtIso = new Date().toISOString()

    setSubmitting(true)
    try {
      const result = await executeManagerTeamDraftSubmit({
        graphqlClient,
        companyId,
        activeCompensationBudgetPlanId,
        draftEmployeeIds,
        employeeBudgetRowState,
        teamMembers,
        planOuRowIdByOrganizationalUnitId,
        managerOrganizationalUnitId,
        managerEmployeeId: ready.managerEmployeeId,
        allocationByEmployeeId,
        memberById,
        restClient,
        accessToken: ready.accessToken,
        submittedAtIso
      })
      if (!result.ok) {
        setErrorMessage(draftSubmitFailureUserMessage(tError, result))
        return
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
    activeCompensationBudgetPlanId,
    allocationByEmployeeId,
    companyId,
    draftEmployeeIds,
    employeeBudgetRowState,
    graphqlClient,
    managerEmployeeId,
    managerOrganizationalUnitId,
    memberById,
    onDraftsSubmitted,
    planOuRowIdByOrganizationalUnitId,
    restClient,
    teamMembers,
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
