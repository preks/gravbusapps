export const GET_APPROVED_ABSENCES_2025 = (): string => `
  query GetApprovedAbsences2025($supervisorId: uuid, $currentYearStart: timestamp!, $currentYearEnd: timestamp!) {
    EmployeeAbsenceAggregate(
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
  }
`

export const GET_PENDING_REQUESTS = (): string => `
  query GetPendingRequests($supervisorId: uuid, $currentYearStart: timestamp!, $currentYearEnd: timestamp!) {
    EmployeeAbsenceAggregate(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "PENDING"},
        startDate: {_gte: $currentYearStart, _lte: $currentYearEnd},
        employee: {employeePosition: {supervisor: {id: {_eq: $supervisorId}}}}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const GET_TEAM_MEMBERS_AWAY = (): string => `
  query GetTeamMembersAway($supervisorId: uuid, $todayStart: timestamp!, $todayEnd: timestamp!) {
    EmployeeAbsenceAggregate(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "APPROVED"},
        _or: [
          {
            startDate: {_lte: $todayEnd},
            endDate: {_gte: $todayStart}
          },
          {
            startDate: {_gte: $todayStart, _lte: $todayEnd}
          }
        ],
        employee: {employeePosition: {supervisor: {id: {_eq: $supervisorId}}}}
      }
    ) {
      aggregate {
        count(distinct: true, columns: employeeId)
      }
    }
  }
`

export const GET_UPCOMING_ABSENCES = (): string => `
  query GetUpcomingAbsences($supervisorId: uuid, $todayStart: timestamp!) {
    EmployeeAbsenceAggregate(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "APPROVED"},
        startDate: {_gte: $todayStart},
        employee: {employeePosition: {supervisor: {id: {_eq: $supervisorId}}}}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const GET_VACATION_ABSENCES = (): string => `
  query GetVacationAbsences($supervisorId: uuid, $currentYearStart: timestamp!, $currentYearEnd: timestamp!) {
    EmployeeAbsenceAggregate(
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
  }
`

export const GET_SICK_ABSENCES = (): string => `
  query GetSickAbsences($supervisorId: uuid, $currentYearStart: timestamp!, $currentYearEnd: timestamp!) {
    EmployeeAbsenceAggregate(
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
`

export const GET_PERSONAL_ABSENCES = (): string => `
  query GetPersonalAbsences($supervisorId: uuid, $currentYearStart: timestamp!, $currentYearEnd: timestamp!) {
    EmployeeAbsenceAggregate(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "APPROVED"},
        startDate: {_gte: $currentYearStart, _lte: $currentYearEnd},
        employee: {employeePosition: {supervisor: {id: {_eq: $supervisorId}}}},
        type: {parentEntryId: {_eq: "AbsenceGroup:v1:PERS"}}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const GET_PENDING_ABSENCES = (): string => `
  query GetPendingAbsences($supervisorId: uuid, $currentYearStart: timestamp!, $currentYearEnd: timestamp!) {
    EmployeeAbsenceAggregate(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "PENDING"},
        startDate: {_gte: $currentYearStart, _lte: $currentYearEnd},
        employee: {employeePosition: {supervisor: {id: {_eq: $supervisorId}}}}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const GET_REJECTED_ABSENCES = (): string => `
  query GetRejectedAbsences($supervisorId: uuid, $currentYearStart: timestamp!, $currentYearEnd: timestamp!) {
    EmployeeAbsenceAggregate(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "REJECTED"},
        startDate: {_gte: $currentYearStart, _lte: $currentYearEnd},
        employee: {employeePosition: {supervisor: {id: {_eq: $supervisorId}}}}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const GET_SICK_ABSENCES_BY_MONTH = (): string => `
  query GetSickAbsencesByMonth($supervisorId: uuid, $currentYearStart: timestamp!, $currentYearEnd: timestamp!) {
    EmployeeAbsence(
      where: {
        isDeleted: {_eq: false},
        status: {_eq: "APPROVED"},
        startDate: {_gte: $currentYearStart, _lte: $currentYearEnd},
        employee: {employeePosition: {supervisor: {id: {_eq: $supervisorId}}}},
        type: {parentEntryId: {_eq: "AbsenceGroup:v1:HEALTH"}}
      }
      orderBy: {startDate: ASC}
    ) {
      id
      startDate
      endDate
      effectiveDays
      employee {
        id
        firstName
        lastName
      }
    }
  }
`
