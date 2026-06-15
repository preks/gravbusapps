// Sales Associate capability name for filtering (consistent with Sales Performance module)
// MUST be defined before template literals that use it
const SALES_ASSOCIATE_CAPABILITY = 'Sales Associate'

// Time period configurations
export const TIME_PERIODS = {
  SHORT: 7, // 7 days for quick comparisons
  MEDIUM: 14, // 14 days - 2 weeks
  LONG: 30 // 30 days for trend analysis
} as const

// Default period for main analysis
export const ROLLING_PERIOD_DAYS = TIME_PERIODS.MEDIUM // Use 14 days as default

// Query to get comprehensive activity stats with rolling periods
// Filtered to only include activities from Sales Associate employees
export const GET_ACTIVITY_STATS = `
  query GetActivityStats(
    $todayStart: timestamptz!, 
    $weekStart: timestamptz!, 
    $last30DaysStart: timestamptz!,
    $prev30DaysStart: timestamptz!,
    $prev30DaysEnd: timestamptz!,
    $quarterStart: timestamptz!,
    $lastQuarterStart: timestamptz!,
    $lastQuarterEnd: timestamptz!
  ) {
    # Total activities (Sales Associates only)
    totalActivities: SalesActivityAggregate(
      where: { 
        _and: [
          { isDeleted: { _eq: false } }
          {
            ownerEmployee: {
              employeePosition: {
                employeeCapabilities: {
                  capability: {
                    name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
                  }
                }
              }
            }
          }
        ]
      }
    ) {
      aggregate { count }
    }
    # Today (Sales Associates only)
    today: SalesActivityAggregate(
      where: { 
        _and: [
          { isDeleted: { _eq: false } }
          { createdAt: { _gte: $todayStart } }
          {
            ownerEmployee: {
              employeePosition: {
                employeeCapabilities: {
                  capability: {
                    name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
                  }
                }
              }
            }
          }
        ]
      }
    ) {
      aggregate { count }
    }
    # This week (Sales Associates only)
    thisWeek: SalesActivityAggregate(
      where: { 
        _and: [
          { isDeleted: { _eq: false } }
          { createdAt: { _gte: $weekStart } }
          {
            ownerEmployee: {
              employeePosition: {
                employeeCapabilities: {
                  capability: {
                    name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
                  }
                }
              }
            }
          }
        ]
      }
    ) {
      aggregate { count }
    }
    # Last 30 days (rolling, Sales Associates only)
    last30Days: SalesActivityAggregate(
      where: { 
        _and: [
          { isDeleted: { _eq: false } }
          { createdAt: { _gte: $last30DaysStart } }
          {
            ownerEmployee: {
              employeePosition: {
                employeeCapabilities: {
                  capability: {
                    name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
                  }
                }
              }
            }
          }
        ]
      }
    ) {
      aggregate { count }
    }
    # Previous 30 days (for comparison, Sales Associates only)
    prev30Days: SalesActivityAggregate(
      where: { 
        _and: [
          { isDeleted: { _eq: false } }
          { createdAt: { _gte: $prev30DaysStart, _lt: $prev30DaysEnd } }
          {
            ownerEmployee: {
              employeePosition: {
                employeeCapabilities: {
                  capability: {
                    name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
                  }
                }
              }
            }
          }
        ]
      }
    ) {
      aggregate { count }
    }
    # This quarter (Sales Associates only)
    thisQuarter: SalesActivityAggregate(
      where: { 
        _and: [
          { isDeleted: { _eq: false } }
          { createdAt: { _gte: $quarterStart } }
          {
            ownerEmployee: {
              employeePosition: {
                employeeCapabilities: {
                  capability: {
                    name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
                  }
                }
              }
            }
          }
        ]
      }
    ) {
      aggregate { count }
    }
    # Last quarter (for comparison, Sales Associates only)
    lastQuarter: SalesActivityAggregate(
      where: { 
        _and: [
          { isDeleted: { _eq: false } }
          { createdAt: { _gte: $lastQuarterStart, _lt: $lastQuarterEnd } }
          {
            ownerEmployee: {
              employeePosition: {
                employeeCapabilities: {
                  capability: {
                    name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
                  }
                }
              }
            }
          }
        ]
      }
    ) {
      aggregate { count }
    }
    # Distinct entity counts that have Sales-Associate activities
    accountActivities: SalesActivityAggregate(
      where: { 
        _and: [
          { isDeleted: { _eq: false } }
          { accountId: { _isNull: false } }
          {
            ownerEmployee: {
              employeePosition: {
                employeeCapabilities: {
                  capability: {
                    name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
                  }
                }
              }
            }
          }
        ]
      }
    ) {
      aggregate { count(columns: accountId, distinct: true) }
    }
    contactActivities: SalesActivityAggregate(
      where: { 
        _and: [
          { isDeleted: { _eq: false } }
          { contactId: { _isNull: false } }
          {
            ownerEmployee: {
              employeePosition: {
                employeeCapabilities: {
                  capability: {
                    name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
                  }
                }
              }
            }
          }
        ]
      }
    ) {
      aggregate { count(columns: contactId, distinct: true) }
    }
    leadActivities: SalesActivityAggregate(
      where: { 
        _and: [
          { isDeleted: { _eq: false } }
          { leadId: { _isNull: false } }
          {
            ownerEmployee: {
              employeePosition: {
                employeeCapabilities: {
                  capability: {
                    name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
                  }
                }
              }
            }
          }
        ]
      }
    ) {
      aggregate { count(columns: leadId, distinct: true) }
    }
    opportunityActivities: SalesActivityAggregate(
      where: { 
        _and: [
          { isDeleted: { _eq: false } }
          { opportunityId: { _isNull: false } }
          {
            ownerEmployee: {
              employeePosition: {
                employeeCapabilities: {
                  capability: {
                    name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
                  }
                }
              }
            }
          }
        ]
      }
    ) {
      aggregate { count(columns: opportunityId, distinct: true) }
    }
    generalActivities: SalesActivityAggregate(
      where: { 
        _and: [
          { isDeleted: { _eq: false } }
          { accountId: { _isNull: true } }
          { contactId: { _isNull: true } }
          { leadId: { _isNull: true } }
          { opportunityId: { _isNull: true } }
          {
            ownerEmployee: {
              employeePosition: {
                employeeCapabilities: {
                  capability: {
                    name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
                  }
                }
              }
            }
          }
        ]
      }
    ) {
      aggregate { count }
    }
    # Active Sales Associate employees with activities
    activeEmployees: SalesActivity(
      where: { 
        _and: [
          { isDeleted: { _eq: false } }
          {
            ownerEmployee: {
              employeePosition: {
                employeeCapabilities: {
                  capability: {
                    name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
                  }
                }
              }
            }
          }
        ]
      }
      distinctOn: [ownerEmployeeId]
    ) {
      ownerEmployeeId
    }
  }
`

// Query for employee performance with rolling 30-day comparison
// Filtered to only include employees with Sales Associate capability
export const GET_EMPLOYEE_PERFORMANCE = `
  query GetEmployeePerformance(
    $last30DaysStart: timestamptz!, 
    $prev30DaysStart: timestamptz!,
    $prev30DaysEnd: timestamptz!
  ) {
    # Get all Sales Associate employees who have ever logged activities with their most recent activity
    allActiveEmployees: SalesActivity(
      where: { 
        _and: [
          { isDeleted: { _eq: false } }
          {
            ownerEmployee: {
              employeePosition: {
                employeeCapabilities: {
                  capability: {
                    name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
                  }
                }
              }
            }
          }
        ]
      }
      distinctOn: [ownerEmployeeId]
      orderBy: [{ ownerEmployeeId: ASC }, { createdAt: DESC }]
    ) {
      ownerEmployeeId
      createdAt
      ownerEmployee {
        id
        displayName
        firstName
        lastName
        pictureThumbnail
        employeePosition {
          jobPosition { name }
          organizationalUnit { name }
        }
      }
    }
    
    # Activities in last 30 days per employee (Sales Associates only)
    activitiesLast30Days: SalesActivity(
      where: { 
        _and: [
          { isDeleted: { _eq: false } }
          { createdAt: { _gte: $last30DaysStart } }
          {
            ownerEmployee: {
              employeePosition: {
                employeeCapabilities: {
                  capability: {
                    name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
                  }
                }
              }
            }
          }
        ]
      }
    ) {
      ownerEmployeeId
    }
    
    # Activities in previous 30 days per employee (Sales Associates only)
    activitiesPrev30Days: SalesActivity(
      where: { 
        _and: [
          { isDeleted: { _eq: false } }
          { createdAt: { _gte: $prev30DaysStart, _lt: $prev30DaysEnd } }
          {
            ownerEmployee: {
              employeePosition: {
                employeeCapabilities: {
                  capability: {
                    name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
                  }
                }
              }
            }
          }
        ]
      }
    ) {
      ownerEmployeeId
    }
  }
`

// Query for employee absences - fetches all approved absences overlapping with the period
// Uses timestamp type for startDate/endDate (not timestamptz)
// Filtered to only include employees with Sales Associate capability
export const GET_EMPLOYEE_ABSENCES = `
  query GetEmployeeAbsences(
    $periodStart: timestamp!,
    $periodEnd: timestamp!,
    $todayStart: timestamp!,
    $todayEnd: timestamp!
  ) {
    # Absences that overlap with analysis period (for counting leave days) - Sales Associates only
    periodAbsences: EmployeeAbsence(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { status: { _eq: "APPROVED" } }
          {
            employee: {
              employeePosition: {
                employeeCapabilities: {
                  capability: {
                    name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
                  }
                }
              }
            }
          }
          {
            _or: [
              { startDate: { _gte: $periodStart, _lte: $periodEnd } }
              { endDate: { _gte: $periodStart, _lte: $periodEnd } }
              {
                _and: [
                  { startDate: { _lte: $periodStart } }
                  { endDate: { _gte: $periodEnd } }
                ]
              }
            ]
          }
        ]
      }
    ) {
      id
      startDate
      endDate
      effectiveDays
      status
      employeeId
      employee {
        id
      }
      type {
        value
        objectValue
      }
    }
    
    # Employees currently on leave today (Sales Associates only)
    currentlyOnLeave: EmployeeAbsence(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { status: { _eq: "APPROVED" } }
          { startDate: { _lte: $todayEnd } }
          { endDate: { _gte: $todayStart } }
          {
            employee: {
              employeePosition: {
                employeeCapabilities: {
                  capability: {
                    name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
                  }
                }
              }
            }
          }
        ]
      }
    ) {
      id
      startDate
      endDate
      effectiveDays
      employeeId
      employee {
        id
        displayName
        firstName
        lastName
        pictureThumbnail
        employeePosition {
          jobPosition { name }
          organizationalUnit { name }
        }
      }
      type {
        value
        objectValue
      }
    }
  }
`
