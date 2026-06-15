export const buildTeamMemberIdsJson = (teamMemberIds: string[]): string => JSON.stringify(teamMemberIds)

export const buildCurrencyFilterClause = (currencyCode?: string): string => {
  if (!currencyCode) {
    return ''
  }

  return `\n        currencyRef: { _ilike: "%${currencyCode}" }`
}

export const buildWonOpportunityBaseWhere = (teamMemberIds: string[], currencyCode?: string): string => {
  const employeeIdsJson = buildTeamMemberIdsJson(teamMemberIds)
  const currencyFilter = buildCurrencyFilterClause(currencyCode)

  return `isDeleted: { _eq: false }
        opportunityStatus: { code: { _eq: "WON" } }
        ownerEmployeeId: { _in: ${employeeIdsJson} }
        estimatedAmount: { _isNull: false }${currencyFilter}`
}

export const buildPipelineFilterClause = (pipelineId?: string): string => {
  if (!pipelineId) {
    return ''
  }

  return `\n        salesPipelineRef: { _eq: "${pipelineId}" }`
}

export const buildOpenOpportunityBaseWhere = (
  teamMemberIds: string[],
  currencyCode?: string,
  pipelineId?: string
): string => {
  const employeeIdsJson = buildTeamMemberIdsJson(teamMemberIds)
  const currencyFilter = buildCurrencyFilterClause(currencyCode)
  const pipelineFilter = buildPipelineFilterClause(pipelineId)

  return `isDeleted: { _eq: false }
        opportunityStatus: { code: { _eq: "OPEN" } }
        ownerEmployeeId: { _in: ${employeeIdsJson} }
        estimatedAmount: { _isNull: false }${currencyFilter}${pipelineFilter}`
}

export const buildTeamOwnerOpportunityBaseWhere = (teamMemberIds: string[], currencyCode?: string): string => {
  const employeeIdsJson = buildTeamMemberIdsJson(teamMemberIds)
  const currencyFilter = buildCurrencyFilterClause(currencyCode)

  return `isDeleted: { _eq: false }
        ownerEmployeeId: { _in: ${employeeIdsJson} }${currencyFilter}`
}
