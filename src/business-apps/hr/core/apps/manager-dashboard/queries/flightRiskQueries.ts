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
 * Separate query for salary history (may use different endpoint)
 * Note: Adjust based on your actual salary data schema
 */
export const GET_SALARY_HISTORY = `
  query GetSalaryHistory($employeeIds: [uuid!]!) {
    EmployeeSalary(
      where: { 
        employeeId: { _in: $employeeIds },
        isDeleted: { _eq: false }
      }
      orderBy: { effectiveDate: DESC }
    ) {
      id
      employeeId
      amount
      currency
      effectiveDate
      salaryType
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
