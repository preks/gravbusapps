import type { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import type { RestClient } from '@/common/network/rest/RestClient'
import { fetchCompensationBudgetPlanEmployeesForPlanAndCompany } from '../../../api/fetchCompensationBudgetPlanEmployeesForPlanAndCompany'
import { saveCompensationBudgetPlanEmployee } from '../../../api/saveCompensationBudgetPlan'
import type { CompensationBudgetPlanEmployeeRestRow } from '../../../types/compensationBudgetPlanEmployeeRestRow'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import {
  computeManagerProposalAmountsFromIncrease,
  resolvePlanOrganizationalUnitRowIdForTeamMember
} from './buildManagerEmployeeBudgetSaveBody'
import type { DraftEmployeeRowForSubmit } from './resolveDraftEmployeeRowsForSubmit'
import { resolveDraftEmployeeRowsForSubmit } from './resolveDraftEmployeeRowsForSubmit'
import { buildSubmitEmployeeProposalUpdateBodyFromRow } from './buildSubmitEmployeeProposalUpdateBody'

export type EmployeeBudgetRowStateForSubmit = Readonly<Record<string, { rowId: string; status: 'draft' | 'submitted' }>>

export interface LoadDraftRowsForProposalSubmitInput {
  graphqlClient: GraphQLClient
  companyId: string
  activeCompensationBudgetPlanId: string
  draftEmployeeIds: readonly string[]
  employeeBudgetRowState: EmployeeBudgetRowStateForSubmit
  teamMembers: TeamMemberCompensationData[]
  planOuRowIdByOrganizationalUnitId: ReadonlyMap<string, string>
  managerOrganizationalUnitId: string | null
}

export async function loadDraftRowsForProposalSubmit(input: LoadDraftRowsForProposalSubmitInput): Promise<{
  fetchedEmployeeRows: CompensationBudgetPlanEmployeeRestRow[]
  serverDraftRowsByEmployeeId: Map<string, DraftEmployeeRowForSubmit>
}> {
  const {
    graphqlClient,
    companyId,
    activeCompensationBudgetPlanId,
    draftEmployeeIds,
    employeeBudgetRowState,
    teamMembers,
    planOuRowIdByOrganizationalUnitId,
    managerOrganizationalUnitId
  } = input
  try {
    const rows = await fetchCompensationBudgetPlanEmployeesForPlanAndCompany(
      graphqlClient,
      companyId,
      activeCompensationBudgetPlanId
    )
    const preferredRowIdByEmployeeId = new Map<string, string>()
    for (const id of draftEmployeeIds) {
      const rowId = employeeBudgetRowState[id]?.rowId
      if (rowId) {
        preferredRowIdByEmployeeId.set(id, rowId)
      }
    }
    const serverDraftRowsByEmployeeId = resolveDraftEmployeeRowsForSubmit(
      rows,
      teamMembers,
      planOuRowIdByOrganizationalUnitId,
      managerOrganizationalUnitId,
      draftEmployeeIds,
      preferredRowIdByEmployeeId
    )
    return { fetchedEmployeeRows: rows, serverDraftRowsByEmployeeId }
  } catch {
    return { fetchedEmployeeRows: [], serverDraftRowsByEmployeeId: new Map() }
  }
}

export interface SubmitOneDraftProposalParams {
  employeeId: string
  entry: { rowId: string; status: 'draft' | 'submitted' }
  member: TeamMemberCompensationData
  serverDraftRowsByEmployeeId: ReadonlyMap<string, DraftEmployeeRowForSubmit>
  fetchedEmployeeRows: readonly CompensationBudgetPlanEmployeeRestRow[]
  allocationByEmployeeId: ReadonlyMap<string, number>
  planOuRowIdByOrganizationalUnitId: ReadonlyMap<string, string>
  managerOrganizationalUnitId: string | null
  managerEmployeeId: string
  submittedAtIso: string
  restClient: RestClient
  accessToken: string
}

export type SubmitOneDraftProposalFailure =
  | { ok: false; reason: 'missing-plan-ou'; displayName: string }
  | { ok: false; reason: 'missing-row-version' }

export async function submitOneDraftProposal(
  p: SubmitOneDraftProposalParams
): Promise<SubmitOneDraftProposalFailure | { ok: true }> {
  const planOuId = resolvePlanOrganizationalUnitRowIdForTeamMember(
    p.member,
    p.planOuRowIdByOrganizationalUnitId,
    p.managerOrganizationalUnitId
  )
  if (!planOuId) {
    return { ok: false, reason: 'missing-plan-ou', displayName: p.member.displayName }
  }

  const resolved = p.serverDraftRowsByEmployeeId.get(p.employeeId)
  const rowIdForUpdate = resolved?.id ?? p.entry.rowId
  const rawAmount = p.allocationByEmployeeId.get(p.employeeId) ?? 0
  const { proposedSalaryIncreaseAmount, proposedSalaryIncreasePercent, proposedNewSalary } =
    computeManagerProposalAmountsFromIncrease(p.member, rawAmount)
  const versionForUpdate = resolved?.version ?? p.fetchedEmployeeRows.find(r => r.id === rowIdForUpdate)?.version
  if (versionForUpdate === undefined) {
    return { ok: false, reason: 'missing-row-version' }
  }

  const body = buildSubmitEmployeeProposalUpdateBodyFromRow({
    employeeId: p.employeeId,
    employeeBudgetRowId: rowIdForUpdate,
    rowVersion: versionForUpdate,
    planOrganizationalUnitRowId: planOuId,
    submittedByEmployeeId: p.managerEmployeeId,
    submittedAtIso: p.submittedAtIso,
    proposedSalaryIncreaseAmount,
    proposedSalaryIncreasePercent,
    proposedNewSalary
  })
  await saveCompensationBudgetPlanEmployee(p.restClient, p.accessToken, body)
  return { ok: true }
}

export interface ExecuteManagerTeamDraftSubmitInput {
  graphqlClient: GraphQLClient
  companyId: string | null
  activeCompensationBudgetPlanId: string | null
  draftEmployeeIds: readonly string[]
  employeeBudgetRowState: EmployeeBudgetRowStateForSubmit
  teamMembers: TeamMemberCompensationData[]
  planOuRowIdByOrganizationalUnitId: ReadonlyMap<string, string>
  managerOrganizationalUnitId: string | null
  managerEmployeeId: string
  allocationByEmployeeId: ReadonlyMap<string, number>
  memberById: ReadonlyMap<string, TeamMemberCompensationData>
  restClient: RestClient
  accessToken: string
  submittedAtIso: string
}

export async function executeManagerTeamDraftSubmit(
  input: ExecuteManagerTeamDraftSubmitInput
): Promise<SubmitOneDraftProposalFailure | { ok: true }> {
  let fetchedEmployeeRows: CompensationBudgetPlanEmployeeRestRow[] = []
  let serverDraftRowsByEmployeeId = new Map<string, DraftEmployeeRowForSubmit>()

  if (input.companyId && input.activeCompensationBudgetPlanId) {
    const loaded = await loadDraftRowsForProposalSubmit({
      graphqlClient: input.graphqlClient,
      companyId: input.companyId,
      activeCompensationBudgetPlanId: input.activeCompensationBudgetPlanId,
      draftEmployeeIds: input.draftEmployeeIds,
      employeeBudgetRowState: input.employeeBudgetRowState,
      teamMembers: input.teamMembers,
      planOuRowIdByOrganizationalUnitId: input.planOuRowIdByOrganizationalUnitId,
      managerOrganizationalUnitId: input.managerOrganizationalUnitId
    })
    fetchedEmployeeRows = loaded.fetchedEmployeeRows
    serverDraftRowsByEmployeeId = loaded.serverDraftRowsByEmployeeId
  }

  for (const employeeId of input.draftEmployeeIds) {
    const entry = input.employeeBudgetRowState[employeeId]
    const member = input.memberById.get(employeeId)
    if (!entry || !member) {
      continue
    }
    const result = await submitOneDraftProposal({
      employeeId,
      entry,
      member,
      serverDraftRowsByEmployeeId,
      fetchedEmployeeRows,
      allocationByEmployeeId: input.allocationByEmployeeId,
      planOuRowIdByOrganizationalUnitId: input.planOuRowIdByOrganizationalUnitId,
      managerOrganizationalUnitId: input.managerOrganizationalUnitId,
      managerEmployeeId: input.managerEmployeeId,
      submittedAtIso: input.submittedAtIso,
      restClient: input.restClient,
      accessToken: input.accessToken
    })
    if (!result.ok) {
      return result
    }
  }
  return { ok: true }
}
