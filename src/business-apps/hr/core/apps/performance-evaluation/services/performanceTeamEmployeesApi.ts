import { env } from '@/common/env/EnvUtils'
import { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import {
  hasWorkingConditionHireDateStarted,
  type WorkingConditionWithHireDate
} from '@/business-apps/hr/core/utils/workingConditionHireDate'

interface TeamEmployeePosition {
  employee?: {
    userId?: string | null
    workingCondition?: WorkingConditionWithHireDate[] | null
  } | null
}

interface GetTeamEmployeePositionsResponse {
  EmployeePosition: TeamEmployeePosition[]
}

const GET_TEAM_EMPLOYEE_POSITIONS = /* GraphQL */ `
  query GetTeamEmployeePositions($structureId: uuid!, $organizationalUnitId: uuid!) {
    EmployeePosition(
      where: {
        _and: [
          { structureId: { _eq: $structureId } }
          { employee: { isDeleted: { _eq: false }, userId: { _isNull: false } } }
          { organizationalUnitEmployees: { organizationalUnit: { id: { _eq: $organizationalUnitId } } } }
        ]
      }
    ) {
      employee {
        userId
        workingCondition(where: { isDeleted: { _neq: true } }, orderBy: [{ activeFrom: DESC }, { createdAt: DESC }]) {
          hireDate
        }
      }
    }
  }
`

export async function getEligibleTeamEmployeeUserIds(
  accessToken: string,
  organizationalUnitId: string
): Promise<string[]> {
  const structureId = getCurrentActiveStructureId()
  if (!structureId) {
    throw new Error('No active structure ID available. Team employees are scoped to the current structure.')
  }

  const endpoint = env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')
  if (!endpoint) {
    throw new Error('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK is not set')
  }

  const client = new GraphQLClient(endpoint)
  client.setAccessToken(accessToken)

  const data = await client.request<GetTeamEmployeePositionsResponse>(GET_TEAM_EMPLOYEE_POSITIONS, {
    structureId,
    organizationalUnitId
  })

  const employeeUserIds = (data?.EmployeePosition ?? [])
    .filter(position => hasWorkingConditionHireDateStarted(position.employee?.workingCondition))
    .map(position => position.employee?.userId)
    .filter((userId): userId is string => Boolean(userId))

  return [...new Set(employeeUserIds)]
}
