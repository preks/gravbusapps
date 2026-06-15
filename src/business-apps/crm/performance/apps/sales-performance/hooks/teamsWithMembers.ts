import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { type TopTeam } from '../types'
import { SALES_ASSOCIATE_CAPABILITY } from './salesAssociateEmployees'

export interface TeamMemberRef {
  employeeId: string
  employee: {
    id: string
    displayName: string
    picture: string | null
    pictureThumbnail: string | null
  } | null
}

export interface TeamWithMembers {
  id: string
  name: string
  organizationalUnitEmployee: TeamMemberRef[]
}

export interface MemberRevenue {
  revenue: number
  opportunitiesWon: number
  currencyCode: string
}

export type MemberRevenueMap = Map<string, MemberRevenue>

/**
 * Aggregates per-member WON revenue into per-team totals for every provided team.
 * Returns one entry per team (including teams with zero revenue), unsorted, so the
 * result can feed both the Top Teams and Teams Needing Attention cards.
 */
export const computeTeamPerformance = (teams: TeamWithMembers[], memberRevenue: MemberRevenueMap): TopTeam[] =>
  teams.map(team => {
    let totalRevenue = 0
    let totalOpportunitiesWon = 0
    let currencyCode = 'EUR'

    team.organizationalUnitEmployee.forEach(member => {
      const memberData = memberRevenue.get(member.employeeId)
      if (memberData) {
        totalRevenue += memberData.revenue
        totalOpportunitiesWon += memberData.opportunitiesWon
        currencyCode = memberData.currencyCode
      }
    })

    return {
      id: team.id,
      name: team.name,
      revenue: totalRevenue,
      opportunitiesWon: totalOpportunitiesWon,
      memberCount: team.organizationalUnitEmployee.filter(member => member.employee !== null).length,
      currencyCode
    }
  })

/**
 * Shared query that lists organizational units (teams/departments/units) for a structure,
 * restricted to those with "Sales Associate" members, including each member via EMPLOYEE_REF.
 *
 * Used as the shared team source for both the Top Teams and Teams Needing Attention cards.
 */
export const buildTeamsWithMembersQuery = (): string => `
  query GetTeamsWithMembers($structureId: uuid!) {
    OrganizationalUnit(
      where: {
        isDeleted: {_eq: false}
        structureId: {_eq: $structureId}
        type: {_in: ["TEAM", "DEPARTMENT", "UNIT"]}
        organizationalUnitEmployee: {
          employee: {
            isDeleted: {_eq: false}
            employeePosition: {
              employeeCapabilities: {
                capability: {
                  name: {_eq: "${SALES_ASSOCIATE_CAPABILITY}"}
                }
              }
            }
          }
        }
      }
    ) {
      id
      name
      organizationalUnitEmployee(
        where: {
          employee: {
            isDeleted: {_eq: false}
            employeePosition: {
              employeeCapabilities: {
                capability: {
                  name: {_eq: "${SALES_ASSOCIATE_CAPABILITY}"}
                }
              }
            }
          }
        }
      ) {
        employeeId
        employee {
          ${EMPLOYEE_REF}
        }
      }
    }
  }
`
