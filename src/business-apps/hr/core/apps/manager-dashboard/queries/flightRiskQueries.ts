/**
 * GraphQL queries for Flight Risk Prediction feature
 * Fetches all necessary data to calculate employee retention risk scores
 */

/**
 * Main query to fetch all flight risk data for a manager's team
 * Combines employee data, performance, feedback, and absences
 */
export const GET_FLIGHT_RISK_DATA = `
  query GetFlightRiskData(
    $managerId: uuid!, 
    $teamMemberIds: [uuid!]!, 
    $oneYearAgo: timestamp!
  ) {
    # Employee base data with tenure and position info
    employees: Employee(
      where: { 
        id: { _in: $teamMemberIds }, 
        isDeleted: { _eq: false } 
      }
    ) {
      id
      firstName
      lastName
      pictureThumbnail
      workingCondition {
        hireDate
        probationEnd
        exitDate
      }
      employeePosition {
        jobPosition { 
          name 
        }
        organizationalUnit { 
          name 
        }
        supervisor { 
          id 
          firstName 
          lastName 
        }
      }
    }
    
    # Performance goals for all team members (last 12 months)
    performanceGoals: EmployeePerformanceGoal(
      where: { 
        employeeId: { _in: $teamMemberIds },
        isDeleted: { _eq: false },
        startDate: { _gte: $oneYearAgo }
      }
      orderBy: { dueDate: DESC }
    ) {
      id
      employeeId
      title
      progressPercent
      status
      startDate
      dueDate
      completionDate
    }
    
    # Feedback received by team members (for sentiment analysis)
    feedbackReceived: EmployeeFeedback(
      where: {
        employeeId: { _in: $teamMemberIds },
        isDeleted: { _eq: false },
        feedbackDate: { _gte: $oneYearAgo }
      }
      orderBy: { feedbackDate: DESC }
    ) {
      id
      employeeId
      feedback
      feedbackDate
      rating
      feedbackPublic
      senderEmployeeId
    }
    
    # Feedback given by manager (engagement proxy)
    managerFeedback: EmployeeFeedback(
      where: {
        senderEmployeeId: { _eq: $managerId },
        employeeId: { _in: $teamMemberIds },
        isDeleted: { _eq: false }
      }
      orderBy: { feedbackDate: DESC }
    ) {
      id
      employeeId
      feedbackDate
    }
    
    # Absences (sick leave patterns, burnout detection)
    absences: EmployeeAbsence(
      where: {
        employee: { id: { _in: $teamMemberIds } },
        isDeleted: { _eq: false },
        status: { _eq: "APPROVED" },
        startDate: { _gte: $oneYearAgo }
      }
      orderBy: { startDate: DESC }
    ) {
      id
      startDate
      endDate
      effectiveDays
      type {
        id
        value
        parentEntryId
      }
      employee { 
        id 
      }
    }
  }
`

/**
 * Batch query for team salary history
 * Returns salary change records with previous/new amounts for trend analysis
 */
export const GET_TEAM_SALARY_HISTORY = `
  query GetTeamSalaryHistory($employeeIds: [ID!]!) {
    salaryHistory(
      where: { employeeId: { in: $employeeIds } }
      orderBy: { effectiveDate: DESC }
      limit: 100
    ) {
      id
      employeeId
      previousAmount
      newAmount
      currency
      effectiveDate
      reason
    }
  }
`

/**
 * Batch query for current active salaries
 * Used to calculate team median for comparison
 */
export const GET_TEAM_CURRENT_SALARIES = `
  query GetTeamCurrentSalaries($employeeIds: [ID!]!) {
    salaries(
      where: { 
        employeeId: { in: $employeeIds }, 
        isActive: { eq: true } 
      }
    ) {
      id
      employeeId
      amount
      currency
      effectiveDate
    }
  }
`

/**
 * Query to get recent manager 1:1 meetings (if available)
 * This would integrate with calendar/meeting data
 */
export const GET_MANAGER_MEETINGS = `
  query GetManagerMeetings($managerId: uuid!, $teamMemberIds: [uuid!]!, $sixMonthsAgo: timestamp!) {
    EmployeeMeeting(
      where: {
        organizerId: { _eq: $managerId },
        attendees: { employeeId: { _in: $teamMemberIds } },
        startDate: { _gte: $sixMonthsAgo },
        meetingType: { _eq: "ONE_ON_ONE" }
      }
      orderBy: { startDate: DESC }
    ) {
      id
      startDate
      attendees {
        employeeId
      }
    }
  }
`

/**
 * RISK TREND QUERIES - Backend Implementation Required
 * These queries require a new EmployeeRiskScore table to be created
 *
 * Table Schema:
 * - id: UUID (Primary Key)
 * - employeeId: UUID (FK to Employee)
 * - managerId: UUID (FK to Employee - who calculated)
 * - overallScore: INT (0-100)
 * - signalScores: JSONB (individual signal breakdown)
 * - calculatedAt: TIMESTAMP
 * - version: INT (algorithm version for migrations)
 */

/**
 * Mutation to save a risk score record for trend tracking
 */
export const SAVE_EMPLOYEE_RISK_SCORE = `
  mutation SaveEmployeeRiskScore($input: EmployeeRiskScoreInput!) {
    saveEmployeeRiskScore(input: $input) {
      id
      employeeId
      overallScore
      calculatedAt
    }
  }
`

/**
 * Query to get risk score history for trend analysis
 */
export const GET_RISK_SCORE_HISTORY = `
  query GetRiskScoreHistory($employeeId: ID!, $limit: Int) {
    employeeRiskScoreHistory(
      employeeId: $employeeId
      limit: $limit
      orderBy: { calculatedAt: DESC }
    ) {
      id
      overallScore
      signalScores
      calculatedAt
      version
    }
  }
`

/**
 * Batch query to get risk score history for multiple employees
 */
export const GET_TEAM_RISK_SCORE_HISTORY = `
  query GetTeamRiskScoreHistory($employeeIds: [ID!]!, $limit: Int) {
    teamRiskScoreHistory(
      employeeIds: $employeeIds
      limit: $limit
      orderBy: { calculatedAt: DESC }
    ) {
      employeeId
      scores {
        overallScore
        calculatedAt
      }
    }
  }
`

/**
 * Query for team-wide risk summary aggregates
 */
export const GET_TEAM_SUMMARY_AGGREGATES = `
  query GetTeamSummaryAggregates($managerId: uuid!, $teamMemberIds: [uuid!]!) {
    # Total team count
    teamCount: EmployeeAggregate(
      where: { 
        id: { _in: $teamMemberIds },
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Goals behind target
    goalsBehindTarget: EmployeePerformanceGoalAggregate(
      where: {
        employeeId: { _in: $teamMemberIds },
        isDeleted: { _eq: false },
        status: { _in: ["BEHIND_TARGET", "AT_RISK"] }
      }
    ) {
      aggregate {
        count
      }
    }
    
    # Recent sick leaves (last 3 months)
    recentSickLeaves: EmployeeAbsenceAggregate(
      where: {
        employee: { id: { _in: $teamMemberIds } },
        isDeleted: { _eq: false },
        status: { _eq: "APPROVED" },
        type: { parentEntryId: { _eq: "AbsenceGroup:v1:HEALTH" } }
      }
    ) {
      aggregate {
        count
        sum {
          effectiveDays
        }
      }
    }
  }
`
