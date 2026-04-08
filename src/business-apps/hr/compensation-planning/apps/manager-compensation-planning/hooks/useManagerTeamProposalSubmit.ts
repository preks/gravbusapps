import { useCallback, useMemo, useState } from 'react'
import type { RestClient } from '@/common/network/rest/RestClient'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { CompensationBudgetPlanEmployeeRestRow } from '../../../types/compensationBudgetPlanEmployeeRestRow'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { loadDraftRowsForProposalSubmit, submitOneDraftProposal } from '../utils/managerTeamProposalSubmitWorkflow'
import type { DraftEmployeeRowForSubmit } from '../utils/resolveDraftEmployeeRowsForSubmit'

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
      let fetchedEmployeeRows: CompensationBudgetPlanEmployeeRestRow[] = []
      let serverDraftRowsByEmployeeId = new Map<string, DraftEmployeeRowForSubmit>()

      if (companyId && activeCompensationBudgetPlanId) {
        const loaded = await loadDraftRowsForProposalSubmit(
          graphqlClient,
          companyId,
          activeCompensationBudgetPlanId,
          draftEmployeeIds,
          employeeBudgetRowState,
          teamMembers,
          planOuRowIdByOrganizationalUnitId,
          managerOrganizationalUnitId
        )
        fetchedEmployeeRows = loaded.fetchedEmployeeRows
        serverDraftRowsByEmployeeId = loaded.serverDraftRowsByEmployeeId
      }

      for (const employeeId of draftEmployeeIds) {
        const entry = employeeBudgetRowState[employeeId]
        const member = memberById.get(employeeId)
        if (!entry || !member) {
          continue
        }
        const result = await submitOneDraftProposal({
          employeeId,
          entry,
          member,
          serverDraftRowsByEmployeeId,
          fetchedEmployeeRows,
          allocationByEmployeeId,
          planOuRowIdByOrganizationalUnitId,
          managerOrganizationalUnitId,
          managerEmployeeId,
          submittedAtIso,
          restClient,
          accessToken
        })
        if (!result.ok) {
          if (result.reason === 'missing-plan-ou') {
            setErrorMessage(tError('manager-team-save-missing-plan-ou', { name: result.displayName }))
            return
          }
          setErrorMessage(tError('manager-team-submit-missing-row-version'))
          return
        }
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
