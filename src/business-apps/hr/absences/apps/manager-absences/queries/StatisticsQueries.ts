// ===== STATISTICS TAB QUERIES - PLANNED VS UNPLANNED =====

export const GET_PLANNED_VS_UNPLANNED_2025 = `
  query GetPlannedVsUnplanned2025($supervisorId: uuid, $currentYearStart: timestamp!, $currentYearEnd: timestamp!) {
    # Test query - just get all approved absences first (current year only)
    allApprovedAbsences: EmployeeAbsenceAggregate(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "APPROVED"},
        startDate: {_gte: $currentYearStart, _lte: $currentYearEnd},
        employee: {employeePosition: {supervisor: {id: {_eq: $supervisorId}}}}
      }
    ) {
      aggregate {
        count
      }
    }
    # Test vacation group specifically (current year only)
    vacationAbsences: EmployeeAbsenceAggregate(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "APPROVED"},
        startDate: {_gte: $currentYearStart, _lte: $currentYearEnd},
        employee: {employeePosition: {supervisor: {id: {_eq: $supervisorId}}}},
        type: {parentEntryId: {_eq: "AbsenceGroup:v1:RECR"}}
      }
    ) {
      aggregate {
        count
      }
    }
    # Test sick leave group specifically (current year only)
    sickLeaveAbsences: EmployeeAbsenceAggregate(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "APPROVED"},
        startDate: {_gte: $currentYearStart, _lte: $currentYearEnd},
        employee: {employeePosition: {supervisor: {id: {_eq: $supervisorId}}}},
        type: {parentEntryId: {_eq: "AbsenceGroup:v1:HEALTH"}}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

// ===== AVERAGE DAYS PER REQUEST QUERY =====
// Purpose: Calculate average days per absence request for current year
// Formula: Total effective days / Total approved absence count
// Filters:
// - Only approved absences (status: "APPROVED")
// - Only current year absences (startDate within current year range)
// - Exclude work leave group (type.parentEntryId != "AbsenceGroup:v1:WORK")
// - Only absences for employees supervised by the given supervisor
// - Not deleted absences

export const GET_AVERAGE_DAYS_PER_REQUEST = `
  query GetAverageDaysPerRequest($supervisorId: uuid, $currentYearStart: timestamp!, $currentYearEnd: timestamp!) {
    approvedAbsencesWithDays: EmployeeAbsenceAggregate(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "APPROVED"},
        startDate: {_gte: $currentYearStart, _lte: $currentYearEnd},
        employee: {employeePosition: {supervisor: {id: {_eq: $supervisorId}}}},
        type: {parentEntryId: {_neq: "AbsenceGroup:v1:WORK"}}
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
`;

// ===== USAGE TRENDS DATA QUERY =====
// Purpose: Fetch absence data for monthly usage and day-of-week pattern analysis
// Used for: Monthly bar chart and day-of-week preferences calculation
// Filters:
// - Only approved absences (status: "APPROVED")
// - Exclude work leave group (type.parentEntryId != "AbsenceGroup:v1:WORK")
// - Only absences for employees supervised by the given supervisor
// - Not deleted absences
// - Current year filtering with _or condition:
//   * Absences that start in current year, OR
//   * Ongoing absences that start before current year but end in current year
//     (This ensures we capture absences that span across year boundary)

export const GET_USAGE_TRENDS_DATA = `
  query GetUsageTrendsData($supervisorId: uuid, $currentYearStart: timestamp!, $currentYearEnd: timestamp!) {
    approvedAbsencesForTrends: EmployeeAbsence(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "APPROVED"},
        _or: [
          # Absences that start in current year
          { startDate: {_gte: $currentYearStart, _lte: $currentYearEnd} },
          # Absences that start before current year but end in current year (ongoing absences)
          { 
            startDate: {_lt: $currentYearStart},
            endDate: {_gte: $currentYearStart, _lte: $currentYearEnd}
          }
        ],
        employee: {employeePosition: {supervisor: {id: {_eq: $supervisorId}}}},
        type: {parentEntryId: {_neq: "AbsenceGroup:v1:WORK"}}
      },
      orderBy: {startDate: ASC}
    ) {
      id
      startDate
      endDate
      status
      type {
        id
        parentEntryId
        value
      }
      employee {
        id
        firstName
        lastName
      }
    }
  }
`;

// ===== YEAR OVER YEAR COMPARISON QUERY =====
// Purpose: Fetch absence data for current year and previous year for comparison
// Used for: Year-over-year comparison chart showing monthly trends
// Filters:
// - Only approved absences (status: "APPROVED")
// - Exclude work leave group (type.parentEntryId != "AbsenceGroup:v1:WORK")
// - Only absences for employees supervised by the given supervisor
// - Not deleted absences
// - Date range covers both current year and previous year
// - Includes ongoing absences that span across year boundaries

export const GET_YEAR_OVER_YEAR_DATA = `
  query GetYearOverYearData($supervisorId: uuid, $previousYearStart: timestamp!, $currentYearEnd: timestamp!) {
    yearOverYearData: EmployeeAbsence(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "APPROVED"},
        _or: [
          # Absences that start in previous year or current year
          { startDate: {_gte: $previousYearStart, _lte: $currentYearEnd} },
          # Ongoing absences that start before previous year but end in previous or current year
          { 
            startDate: {_lt: $previousYearStart},
            endDate: {_gte: $previousYearStart, _lte: $currentYearEnd}
          }
        ],
        employee: {employeePosition: {supervisor: {id: {_eq: $supervisorId}}}},
        type: {parentEntryId: {_neq: "AbsenceGroup:v1:WORK"}}
      },
      orderBy: {startDate: ASC}
    ) {
      id
      startDate
      endDate
      status
      type {
        id
        parentEntryId
        value
      }
      employee {
        id
        firstName
        lastName
      }
    }
  }
`;

// ===== AVERAGE WORK STREAK QUERY =====
// Purpose: Calculate average work streak - how many days employees work without absences
// Used for: Average work streak card showing consecutive work days
// Filters:
// - Only approved absences (status: "APPROVED")
// - Exclude work leave group (type.parentEntryId != "AbsenceGroup:v1:WORK")
// - Only absences for employees supervised by the given supervisor
// - Not deleted absences
// - Current year absences for streak calculation

export const GET_AVERAGE_WORK_STREAK = `
  query GetAverageWorkStreak($supervisorId: uuid, $currentYearStart: timestamp!, $currentYearEnd: timestamp!) {
    approvedAbsencesForStreak: EmployeeAbsence(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "APPROVED"},
        startDate: {_gte: $currentYearStart, _lte: $currentYearEnd},
        employee: {employeePosition: {supervisor: {id: {_eq: $supervisorId}}}},
        type: {parentEntryId: {_neq: "AbsenceGroup:v1:WORK"}}
      },
      orderBy: {startDate: ASC}
    ) {
      id
      startDate
      endDate
      status
      employee {
        id
        firstName
        lastName
      }
    }
  }
`;

// ===== EMPLOYEE WORK-LIFE BALANCE ANALYSIS QUERY =====
// Purpose: Fetch detailed employee data and absence patterns for work-life balance analysis
// Used for: Individual employee work-life balance analysis page
// Filters:
// - All employees supervised by the given supervisor
// - All approved absences (excluding work leave) for these employees
// - Current year data for analysis

export const GET_EMPLOYEE_WORK_LIFE_BALANCE = `
  query GetEmployeeWorkLifeBalance($supervisorId: uuid!, $currentYearStart: timestamp!, $currentYearEnd: timestamp!) {
    # Get all employees who report to this supervisor
    employees: Employee(
      where: {
        employeePosition: {supervisorEmployeeId: {_eq: $supervisorId}},
        isDeleted: {_eq: false}
      }
      orderBy: [{firstName: ASC}, {lastName: ASC}]
    ) {
      id
      firstName
      lastName
      pictureThumbnail
      employeePosition {
        organizationalUnit {
          name
        }
      }
    }
    
    # Get all absences for these employees (excluding work leave)
    absences: EmployeeAbsence(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "APPROVED"},
        employee: {employeePosition: {supervisorEmployeeId: {_eq: $supervisorId}}},
        type: {parentEntryId: {_neq: "AbsenceGroup:v1:WORK"}},
        startDate: {_gte: $currentYearStart, _lte: $currentYearEnd}
      }
      orderBy: {startDate: ASC}
    ) {
      id
      startDate
      endDate
      employee {
        id
        firstName
        lastName
      }
    }
  }
`;

// ===== TEAM COVERAGE OPTIMIZER QUERY =====
// Purpose: Fetch comprehensive team coverage data including organizational units, matrix teams, and capabilities
// Used for: Team coverage optimizer page showing coverage by org unit, matrix, and skills
// Filters:
// - All employees supervised by the given supervisor
// - Current absences (excluding work leave)
// - Matrix team memberships
// - Employee capabilities/skills

export const GET_TEAM_COVERAGE_DATA = `
  query GetTeamCoverageData($supervisorId: uuid!, $structureId: uuid, $hasStructureId: Boolean!) {
    # Get all employees who report to this supervisor
    employees: Employee(
      where: {
        employeePosition: {supervisorEmployeeId: {_eq: $supervisorId}},
        isDeleted: {_eq: false}
      }
      orderBy: [{firstName: ASC}, {lastName: ASC}]
    ) {
      id
      firstName
      lastName
      pictureThumbnail
      employeePosition {
        organizationalUnit {
          id
          name
        }
        matrixUnitEmployees(where: {structureId: {_eq: $structureId}}) @include(if: $hasStructureId) {
          matrixUnit {
            id
            name
          }
        }
        # Employee capabilities/skills - moved to employeePosition
        employeeCapabilities(where: {structureId: {_eq: $structureId}}) @include(if: $hasStructureId) {
          capability {
            id
            name
          }
        }
      }
    }
    
    # Get current absences (excluding work leave)
    currentAbsences: EmployeeAbsence(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "APPROVED"},
        employee: {employeePosition: {supervisorEmployeeId: {_eq: $supervisorId}}},
        type: {parentEntryId: {_neq: "AbsenceGroup:v1:WORK"}},
        _and: [
          { startDate: {_lte: "now()"} },
          { endDate: {_gte: "now()"} }
        ]
      }
    ) {
      id
      employee {
        id
        firstName
        lastName
      }
    }
    
    # Get all capabilities in the system for backup calculation
    allCapabilities: Capability(
      where: { isDeleted: {_eq: false} }
      orderBy: {name: ASC}
    ) {
      id
      name
    }
  }
`;