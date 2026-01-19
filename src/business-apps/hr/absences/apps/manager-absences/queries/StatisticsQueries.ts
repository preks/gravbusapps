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
    # Planned absences: Vacation group with Vacation value (current year only)
    plannedAbsences: EmployeeAbsenceAggregate(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "APPROVED"},
        startDate: {_gte: $currentYearStart, _lte: $currentYearEnd},
        employee: {employeePosition: {supervisor: {id: {_eq: $supervisorId}}}},
        type: {
          parentEntryId: {_eq: "AbsenceGroup:v1:RECR"}
        }
      }
    ) {
      aggregate {
        count
      }
    }
    # Unplanned absences: Health group with Sick Leave value (current year only)
    unplannedAbsences: EmployeeAbsenceAggregate(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "APPROVED"},
        startDate: {_gte: $currentYearStart, _lte: $currentYearEnd},
        employee: {employeePosition: {supervisor: {id: {_eq: $supervisorId}}}},
        type: {
          parentEntryId: {_eq: "AbsenceGroup:v1:HEALTH"}
        }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const GET_AVERAGE_DAYS_PER_REQUEST = `
  query GetAverageDaysPerRequest($supervisorId: uuid, $currentYearStart: timestamp!, $currentYearEnd: timestamp!) {
    approvedAbsencesWithDays: EmployeeAbsenceAggregate(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "APPROVED"},
        startDate: {_gte: $currentYearStart, _lte: $currentYearEnd},
        employee: {employeePosition: {supervisor: {id: {_eq: $supervisorId}}}}
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
`

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
`

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
`
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
`

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
`
