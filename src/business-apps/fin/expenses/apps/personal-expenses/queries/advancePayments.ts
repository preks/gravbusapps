// Filter interfaces following Single Responsibility Principle
export interface AdvancePaymentFilters {
  statusFilter?: string[];
  amountRange?: { min?: number; max?: number };
  advanceRange?: { min?: number; max?: number };
}

export interface FilterState {
  hasStatusFilter: boolean;
  hasAmountRange: boolean;
  hasAdvanceRange: boolean;
}

// Filter validation and state management
export const validateFilters = (filters: AdvancePaymentFilters): FilterState => {
  const hasStatusFilter = Boolean(filters.statusFilter && filters.statusFilter.length > 0);
  const hasAmountRange = Boolean(
    filters.amountRange && 
    (filters.amountRange.min !== undefined || filters.amountRange.max !== undefined)
  );
  const hasAdvanceRange = Boolean(
    filters.advanceRange && 
    (filters.advanceRange.min !== undefined || filters.advanceRange.max !== undefined)
  );
  
  return {
    hasStatusFilter,
    hasAmountRange,
    hasAdvanceRange
  };
};

// Query parameter builder following Open/Closed Principle
export const buildQueryParameters = (filterState: FilterState): string => {
  const parameters: string[] = [];
  
  if (filterState.hasStatusFilter) {
    parameters.push('$statusFilter: [String!]');
  }
  
  if (filterState.hasAmountRange) {
    parameters.push('$amountMin: numeric, $amountMax: numeric');
  }
  
  if (filterState.hasAdvanceRange) {
    parameters.push('$advanceMin: numeric, $advanceMax: numeric');
  }
  
  // Note: AdvancePayment doesn't support dynamic orderBy, using hardcoded sorting
  // parameters.push('$orderBy: [AdvancePaymentOrderBy!]');
  
  return parameters.join(', ');
};

// Query condition builder following Single Responsibility Principle
// Build expense plan conditions (amount range)
export const buildExpensePlanConditions = (filterState: FilterState, filters: AdvancePaymentFilters): string => {
  if (filterState.hasAmountRange && filters.amountRange) {
    const { min, max } = filters.amountRange;
    const conditions: string[] = [];
    
    if (min !== undefined) {
      conditions.push('_gte: $amountMin');
    }
    if (max !== undefined) {
      conditions.push('_lte: $amountMax');
    }
    
    if (conditions.length > 0) {
      return `totalAmount: { ${conditions.join(', ')} }`;
    }
  }
  
  return '';
};

// Build advance payment conditions (advance range)
export const buildAdvancePaymentConditions = (filterState: FilterState, filters: AdvancePaymentFilters): string => {
  if (filterState.hasAdvanceRange && filters.advanceRange) {
    const { min, max } = filters.advanceRange;
    const conditions: string[] = [];
    
    if (min !== undefined) {
      conditions.push('_gte: $advanceMin');
    }
    if (max !== undefined) {
      conditions.push('_lte: $advanceMax');
    }
    
    if (conditions.length > 0) {
      return `amount: { ${conditions.join(', ')} }`;
    }
  }
  
  return '';
};

// Main query builder following Dependency Inversion Principle
export const buildAdvancePaymentsQuery = (filters: AdvancePaymentFilters): string => {
  const filterState = validateFilters(filters);
  const queryParameters = buildQueryParameters(filterState);
  const expensePlanConditions = buildExpensePlanConditions(filterState, filters);
  const advancePaymentConditions = buildAdvancePaymentConditions(filterState, filters);
  
  const parameterString = queryParameters ? `, ${queryParameters}` : '';
  const expensePlanConditionString = expensePlanConditions ? `, ${expensePlanConditions}` : '';
  const advancePaymentConditionString = advancePaymentConditions ? `, ${advancePaymentConditions}` : '';
  
  return `
    query GetAdvancePaymentsByEmployee(
      $employeeId: uuid!, 
      $limit: Int, 
      $offset: Int, 
      $searchTerm: String${parameterString}
    ) {
      AdvancePaymentAggregate(
        where: {
          expensePlan: {
            employeeId: {_eq: $employeeId} 
            ${expensePlanConditionString}
          }, 
          isDeleted: {_eq: false},
          ${filterState.hasStatusFilter ? 'status: {_in: $statusFilter},' : ''}
          ${advancePaymentConditionString ? `${advancePaymentConditionString},` : ''}
          _or: [
            {code: {_ilike: $searchTerm}},
            {description: {_ilike: $searchTerm}},
            {status: {_ilike: $searchTerm}},
            {paymentMethod: {_ilike: $searchTerm}},
            {expensePlan: {title: {_ilike: $searchTerm}}}
          ]
        }
      ) {
        aggregate {
          count
        }
      }
      AdvancePayment(
        limit: $limit,
        offset: $offset,
        orderBy: {createdAt: DESC},
        where: {
          expensePlan: {employeeId: 
              {_eq: $employeeId} 
              ${expensePlanConditionString}}
          isDeleted: {_eq: false},
          ${filterState.hasStatusFilter ? 'status: {_in: $statusFilter},' : ''}
          ${advancePaymentConditionString ? `${advancePaymentConditionString},` : ''}
          _or: [
            {code: {_ilike: $searchTerm}},
            {description: {_ilike: $searchTerm}},
            {status: {_ilike: $searchTerm}},
            {paymentMethod: {_ilike: $searchTerm}},
            {expensePlan: {
              title: {_ilike: $searchTerm}
            }
           }
          ]
        }
      ) {
        id
        code
        description
        amount
        currencyRef
        currency {
          code
        }
        costCenter {
          name
        }
        status
        paymentMethod
        expensePlan {
          id
          code
          reimbursableAmount
          startDate
          endDate
          planDate
          decisionDate
          status
          title
          totalAmount
          requestTypeRef
          createdAt
          employeeDocumentId
          advancePaymentPaidAmount
          advancePaymentInTransitAmount
          currencyRef
          description
          currency {
            type
            translations(where: {localeCode: {_eq: "en"}}) {
              localeCode
              value
            }
            catalog {
              defaultLocale
            }
            value
            id
            code
          }
          requestType {
            value
            translations(where: {localeCode: {_eq: "en"}}) {
              localeCode
              value
            }
            catalog {
              defaultLocale
            }
          }
          expensePlanItem {
            title
            status
            totalAmount
            expenseDate
          }
          advancePayment {
            id
            amount
            status
            currency {
              code
              translations(where: {localeCode: {_eq: "en"}}) {
                localeCode
                value
              }
              catalog {
                defaultLocale
              }
            }
          }
          expenseRequestTrip {
            tripDateTime
          }
          expenseRequest {
            id
            code
            title
            description
            startDate
            endDate
            requestDate
            decisionDate
            totalAmount
            currencyRef
            status
            reimbursableAmount
            nonReimbursableAmount
            additionalProperties
            currency {
              value
              translations(where: {localeCode: {_eq: "en"}}) {
                localeCode
                value
              }
              catalog {
                defaultLocale
              }
            }
            requestType {
              value
              translations(where: {localeCode: {_eq: "en"}}) {
                localeCode
                value
              }
              catalog {
                defaultLocale
              }
            }
            costCenter {
              name
            }
            project {
              name
            }
            employee {
              fullName
              employeePosition {
                supervisor {
                  fullName
                }
              }
            }
          }
          employee {
            id
            code
            firstName
            lastName
            employeePosition {
              siteLocation {
                name
              }
              organizationalUnit {
                name
              }
              firstName
              lastName
            }
          }
        }
        expensePlanId
      }
    }
  `;
};

// Hook for using the dynamic query
export const useAdvancePaymentsQuery = (filters: AdvancePaymentFilters) => {
  const query = buildAdvancePaymentsQuery(filters);
  const filterState = validateFilters(filters);
  
  return {
    query,
    filterState,
    hasActiveFilters: filterState.hasStatusFilter || filterState.hasAmountRange || filterState.hasAdvanceRange
  };
};

// GraphQL query to get advance payments with status filtering
export const GET_ADVANCE_PAYMENTS_BY_EMPLOYEE_WITH_STATUS = `
  query GetAdvancePaymentsByEmployeeWithStatus($employeeId: uuid!, $limit: Int, $offset: Int, $searchTerm: String, $statusFilter: [String!]) {
    AdvancePaymentAggregate(
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}}, 
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}},
          {paymentMethod: {_ilike: $searchTerm}},
          {expensePlan: {title: {_ilike: $searchTerm}}}
        ],
        status: {_in: $statusFilter}
      }
    ) {
      aggregate {
        count
      }
    }
    AdvancePayment(
      limit: $limit,
      offset: $offset,
      orderBy: {createdAt: DESC},
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}}, 
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}},
          {paymentMethod: {_ilike: $searchTerm}},
          {expensePlan: {title: {_ilike: $searchTerm}}}
        ],
        status: {_in: $statusFilter}
      }
    ) {
      id
      code
      description
      amount
      currencyRef
      currency {
        code
      }
      costCenter {
        name
      }
      status
      paymentMethod
      expensePlan {
        code
        title
        totalAmount
        currency {
          code
        }
      }
      expensePlanId
    }
  }
`;

// GraphQL query to get advance payments with amount range filtering
export const GET_ADVANCE_PAYMENTS_BY_EMPLOYEE_WITH_AMOUNT_RANGE = `
  query GetAdvancePaymentsByEmployeeWithAmountRange($employeeId: uuid!, $limit: Int, $offset: Int, $searchTerm: String, $statusFilter: [String!], $amountMin: numeric, $amountMax: numeric) {
    AdvancePaymentAggregate(
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}}, 
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}},
          {paymentMethod: {_ilike: $searchTerm}},
          {expensePlan: {title: {_ilike: $searchTerm}}}
        ],
        status: {_in: $statusFilter},
        expensePlan: {
          totalAmount: {
            _gte: $amountMin,
            _lte: $amountMax
          }
        }
      }
    ) {
      aggregate {
        count
      }
    }
    AdvancePayment(
      limit: $limit,
      offset: $offset,
      orderBy: {createdAt: DESC},
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}}, 
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}},
          {paymentMethod: {_ilike: $searchTerm}},
          {expensePlan: {title: {_ilike: $searchTerm}}}
        ],
        status: {_in: $statusFilter},
        expensePlan: {
          totalAmount: {
            _gte: $amountMin,
            _lte: $amountMax
          }
        }
      }
    ) {
      id
      code
      description
      amount
      currencyRef
      currency {
        code
      }
      costCenter {
        name
      }
      status
      paymentMethod
      expensePlan {
        code
        title
        totalAmount
        currency {
          code
        }
      }
      expensePlanId
    }
  }
`;

// GraphQL query to get advance payments with advance range filtering
export const GET_ADVANCE_PAYMENTS_BY_EMPLOYEE_WITH_ADVANCE_RANGE = `
  query GetAdvancePaymentsByEmployeeWithAdvanceRange($employeeId: uuid!, $limit: Int, $offset: Int, $searchTerm: String, $statusFilter: [String!], $advanceMin: numeric, $advanceMax: numeric) {
    AdvancePaymentAggregate(
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}}, 
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}},
          {paymentMethod: {_ilike: $searchTerm}},
          {expensePlan: {title: {_ilike: $searchTerm}}}
        ],
        status: {_in: $statusFilter},
        amount: {
          _gte: $advanceMin,
          _lte: $advanceMax
        }
      }
    ) {
      aggregate {
        count
      }
    }
    AdvancePayment(
      limit: $limit,
      offset: $offset,
      orderBy: {createdAt: DESC},
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}}, 
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}},
          {paymentMethod: {_ilike: $searchTerm}},
          {expensePlan: {title: {_ilike: $searchTerm}}}
        ],
        status: {_in: $statusFilter},
        amount: {
          _gte: $advanceMin,
          _lte: $advanceMax
        }
      }
    ) {
      id
      code
      description
      amount
      currencyRef
      currency {
        code
      }
      costCenter {
        name
      }
      status
      paymentMethod
      expensePlan {
        code
        title
        totalAmount
        currency {
          code
        }
      }
      expensePlanId
    }
  }
`;

// GraphQL query to get advance payments by employee (basic query without filters)
export const GET_ADVANCE_PAYMENTS_BY_EMPLOYEE = `
  query GetAdvancePaymentsByEmployee($employeeId: uuid!, $limit: Int, $offset: Int, $searchTerm: String) {
    AdvancePaymentAggregate(
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}}, 
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}},
          {paymentMethod: {_ilike: $searchTerm}},
          {expensePlan: {title: {_ilike: $searchTerm}}}
        ]
      }
    ) {
      aggregate {
        count
      }
    }
    AdvancePayment(
      limit: $limit,
      offset: $offset,
      orderBy: {createdAt: DESC},
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}}, 
        isDeleted: {_eq: false},
        _or: [
          {code: {_ilike: $searchTerm}},
          {description: {_ilike: $searchTerm}},
          {status: {_ilike: $searchTerm}},
          {paymentMethod: {_ilike: $searchTerm}},
          {expensePlan: {title: {_ilike: $searchTerm}}}
        ]
      }
    ) {
      id
      code
      description
      amount
      currencyRef
      currency {
        code
      }
      costCenter {
        name
      }
      status
      paymentMethod
      expensePlan {
        id
        code
        title
        totalAmount
        currency {
          code
        }
        id
        code
        reimbursableAmount
        startDate
        endDate
        planDate
        decisionDate
        status    
        requestTypeRef
        createdAt
        employeeDocumentId
        advancePaymentPaidAmount
        advancePaymentInTransitAmount 
        expenseRequest {
          id
          code
          status
          totalAmount
        }
      }
      expensePlanId
    }
  }
`;

export const GET_ADVANCE_PAYMENT_BY_ID = `
  query GetAdvancePaymentById($id: uuid!) {
    AdvancePayment(where: {id: {_eq: $id}}) {
      id
      code
      description
      amount
      currencyRef
      costCenter {
        name
      }
      status
      paymentMethod
      expensePlan {
        code
        title
      }
      expensePlanId
    }
  }
`;

export const GET_ADVANCE_PAYMENT_STATISTICS = `
  query GetAdvancePaymentStatistics($employeeId: uuid!, $startDate: timestamptz!, $endDate: timestamptz!) {
    AdvancePaymentAggregate(
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}},
        isDeleted: {_eq: false},
        createdAt: {_gte: $startDate, _lte: $endDate}
        status: {_in: ["APPROVED", "PAID", "BOOKED"]},
        currencyRef: {_eq: "Currency:v1:EUR"}
      }
    ) {
      aggregate {
        count
        sum {
          amount
        }
      }
    }
    PendingAdvancePayments: AdvancePaymentAggregate(
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}},
        isDeleted: {_eq: false},
        status: {_in: ["PENDING", "PREPARED"]}
      }
    ) {
      aggregate {
        count
      }
    }
    ApprovedAdvancePayments: AdvancePaymentAggregate(
      where: {
        expensePlan: {employeeId: {_eq: $employeeId}},
        isDeleted: {_eq: false},
        status: {_in: ["APPROVED", "PAID", "BOOKED"]}
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;
  