import { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import {
  GET_APPROVED_ABSENCES_2025,
  GET_PENDING_REQUESTS,
  GET_TEAM_MEMBERS_AWAY,
  GET_UPCOMING_ABSENCES,
  GET_VACATION_ABSENCES,
  GET_SICK_ABSENCES,
  GET_SICK_ABSENCES_BY_MONTH
} from '../queries/DashboardQueries'
import {
  GET_PLANNED_VS_UNPLANNED_2025,
  GET_AVERAGE_DAYS_PER_REQUEST,
  GET_USAGE_TRENDS_DATA,
  GET_YEAR_OVER_YEAR_DATA,
  GET_AVERAGE_WORK_STREAK
} from '../queries/StatisticsQueries'

export const executeStatisticsRequests = async (
  graphqlClient: GraphQLClient,
  supervisorId: string,
  currentYearStart: string,
  currentYearEnd: string,
  previousYearStart: string
) => {
  const today = new Date()
  const todayStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 00:00:00+00`
  const todayEnd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} 23:59:59+00`

  const queries = [
    {
      query: GET_APPROVED_ABSENCES_2025(currentYearStart, currentYearEnd),
      variables: { supervisorId, currentYearStart, currentYearEnd }
    },
    {
      query: GET_PENDING_REQUESTS(currentYearStart, currentYearEnd),
      variables: { supervisorId, currentYearStart, currentYearEnd }
    },
    {
      query: GET_TEAM_MEMBERS_AWAY(todayStart, todayEnd),
      variables: { supervisorId, todayStart, todayEnd }
    },
    {
      query: GET_UPCOMING_ABSENCES(todayStart),
      variables: { supervisorId, todayStart }
    },
    {
      query: GET_VACATION_ABSENCES(currentYearStart, currentYearEnd),
      variables: { supervisorId, currentYearStart, currentYearEnd }
    },
    {
      query: GET_SICK_ABSENCES(currentYearStart, currentYearEnd),
      variables: { supervisorId, currentYearStart, currentYearEnd }
    },
    {
      query: GET_PLANNED_VS_UNPLANNED_2025,
      variables: { supervisorId, currentYearStart, currentYearEnd }
    },
    {
      query: GET_AVERAGE_DAYS_PER_REQUEST,
      variables: { supervisorId, currentYearStart, currentYearEnd }
    },
    { query: GET_USAGE_TRENDS_DATA, variables: { supervisorId, currentYearStart, currentYearEnd } },
    {
      query: GET_YEAR_OVER_YEAR_DATA,
      variables: { supervisorId, previousYearStart, currentYearEnd }
    },
    {
      query: GET_AVERAGE_WORK_STREAK,
      variables: { supervisorId, currentYearStart, currentYearEnd }
    }
  ]

  const results = await Promise.all(queries.map(({ query, variables }) => graphqlClient.request(query, variables)))

  return {
    approvedAbsencesResult: results[0],
    pendingRequestsResult: results[1],
    teamMembersAwayResult: results[2],
    upcomingAbsencesResult: results[3],
    vacationAbsencesResult: results[4],
    sickLeaveAbsencesResult: results[5],
    plannedVsUnplannedResult: results[6],
    averageDaysResult: results[7],
    usageTrendsResult: results[8],
    yearOverYearResult: results[9],
    averageWorkStreakResult: results[10]
  }
}

export const executeSickAbsencesByMonthRequest = async (
  graphqlClient: GraphQLClient,
  supervisorId: string,
  currentYearStart: string,
  currentYearEnd: string
) => {
  const sickAbsencesByMonthQuery = GET_SICK_ABSENCES_BY_MONTH(currentYearStart, currentYearEnd)
  return await graphqlClient.request(sickAbsencesByMonthQuery, {
    supervisorId,
    currentYearStart,
    currentYearEnd
  })
}
