import { type TimeFilter } from '../types'

export const SALES_ASSOCIATE_CAPABILITY = 'Sales Associate'

export function generateTimePeriods(timeFilter: TimeFilter): { start: string; end: string; label: string }[] {
  const currentDate = new Date()
  const periods: { start: string; end: string; label: string }[] = []

  switch (timeFilter) {
    case 'month':
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(currentDate)
        weekStart.setDate(currentDate.getDate() - (i * 7 + 7))
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 7)

        periods.push({
          start: weekStart.toISOString(),
          end: weekEnd.toISOString(),
          label: `Week ${4 - i}`
        })
      }
      break

    case 'quarter':
      for (let i = 2; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        periods.push({
          start: date.toISOString(),
          end: new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString(),
          label: date.toLocaleDateString('en-US', { month: 'short' })
        })
      }
      break

    case 'year':
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        periods.push({
          start: date.toISOString(),
          end: new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString(),
          label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        })
      }
      break

    case 'historical':
      for (let i = 23; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        periods.push({
          start: date.toISOString(),
          end: new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString(),
          label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        })
      }
      break

    case 'sixMonths':
    default:
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        periods.push({
          start: date.toISOString(),
          end: new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString(),
          label: date.toLocaleDateString('en-US', { month: 'short' })
        })
      }
  }

  return periods
}

export interface EmployeeQueryInput {
  index: number
  employeeId: string
}

export interface EmployeeAggregateEntry {
  aggregate: {
    count?: number
    sum?: { estimatedAmount: number | null } | null
  }
}

export type SelectedEmployeesResponse = Record<string, EmployeeAggregateEntry>

// Build a single query that returns metrics + per-period trends for every
// selected employee at once (aliased per employee index), so adding/removing an
// employee triggers exactly one network request instead of two per employee.
export const buildSelectedEmployeesQuery = (
  employees: EmployeeQueryInput[],
  periods: { start: string; end: string }[],
  selectedCurrencyId?: string,
  selectedPipelineId?: string
): string => {
  const currencyFilter = selectedCurrencyId ? `\n          currencyRef: {_eq: "${selectedCurrencyId}"}` : ''
  const pipelineFilter = selectedPipelineId ? `\n          salesPipelineRef: {_eq: "${selectedPipelineId}"}` : ''

  const employeeBlocks = employees
    .map(({ index, employeeId }) => {
      const ownerFilter = `ownerEmployeeId: {_in: ${JSON.stringify([employeeId])}}`

      const metricsBase = `isDeleted: {_eq: false}
          ${ownerFilter}${currencyFilter}${pipelineFilter}`

      const trendsBase = `isDeleted: {_eq: false}
          opportunityStatus: {code: {_eq: "WON"}}
          ${ownerFilter}
          estimatedAmount: {_isNull: false}${currencyFilter}${pipelineFilter}`

      const periodBlocks = periods
        .map(
          (period, periodIndex) => `
      e${index}_p${periodIndex}: OpportunityAggregate(where: {
          ${trendsBase}
          closeDate: {_gte: "${period.start}", _lt: "${period.end}"}
        }) {
        aggregate { sum { estimatedAmount } }
      }`
        )
        .join('\n')

      return `
      e${index}_total: OpportunityAggregate(where: { ${metricsBase} }) {
        aggregate { count }
      }
      e${index}_won: OpportunityAggregate(where: {
          ${metricsBase}
          opportunityStatus: {code: {_eq: "WON"}}
        }) {
        aggregate { count sum { estimatedAmount } }
      }
      e${index}_closed: OpportunityAggregate(where: {
          ${metricsBase}
          opportunityStatus: {code: {_in: ["WON", "LOST"]}}
        }) {
        aggregate { count }
      }
${periodBlocks}`
    })
    .join('\n')

  return `
    query GetSelectedEmployeesMetrics {
${employeeBlocks}
    }
  `
}

export const buildEmployeeOptionsQuery = (): string => `
  query GetSalesAssociateEmployees {
    Employee(
      where: {
        isDeleted: { _eq: false }
        employeePosition: {
          employeeCapabilities: {
            capability: {
              name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
            }
          }
        }
      }
      orderBy: { displayName: ASC }
    ) {
      id
      displayName
      firstName
      lastName
      pictureThumbnail
      employeePosition {
        jobPosition { name }
        organizationalUnit { id name }
      }
    }
  }
`
