// ⚡ PERFORMANCE OPTIMIZED: Combined Plan vs Request Query
// Consolidates 4 separate queries into 1 for better performance

import dayjs from 'dayjs';

/**
 * Generate combined query for Plan vs Request data
 * Includes: Period statistics, Category statistics, Overdue plans, and Most used currency
 */
export const generateCombinedPlanVsRequestQuery = (
  period: 'month' | 'quarter' | 'year',
  currencyRef: string,
  selectedDepartment?: string,
  requestTypes?: string[]
): string => {
  const now = dayjs();
  const includeDepartment = Boolean(selectedDepartment);
  
  // Calculate date ranges based on period (using expression to avoid useless assignments)
  const { startDate, endDate, previousStartDate, previousEndDate } = (() => {
    switch (period) {
      case 'month':
        return {
          startDate: now.startOf('month').format('YYYY-MM-DDTHH:mm:ss'),
          endDate: now.endOf('month').format('YYYY-MM-DDTHH:mm:ss'),
          previousStartDate: now.subtract(1, 'month').startOf('month').format('YYYY-MM-DDTHH:mm:ss'),
          previousEndDate: now.subtract(1, 'month').endOf('month').format('YYYY-MM-DDTHH:mm:ss')
        };
      case 'quarter': {
        const currentQuarter = Math.floor(now.month() / 3);
        return {
          startDate: now.month(currentQuarter * 3).startOf('month').format('YYYY-MM-DDTHH:mm:ss'),
          endDate: now.month(currentQuarter * 3 + 2).endOf('month').format('YYYY-MM-DDTHH:mm:ss'),
          previousStartDate: now.subtract(3, 'month').month(currentQuarter * 3).startOf('month').format('YYYY-MM-DDTHH:mm:ss'),
          previousEndDate: now.subtract(3, 'month').month(currentQuarter * 3 + 2).endOf('month').format('YYYY-MM-DDTHH:mm:ss')
        };
      }
      case 'year':
        return {
          startDate: now.startOf('year').format('YYYY-MM-DDTHH:mm:ss'),
          endDate: now.endOf('year').format('YYYY-MM-DDTHH:mm:ss'),
          previousStartDate: now.subtract(1, 'year').startOf('year').format('YYYY-MM-DDTHH:mm:ss'),
          previousEndDate: now.subtract(1, 'year').endOf('year').format('YYYY-MM-DDTHH:mm:ss')
        };
    }
  })();

  const departmentCondition = includeDepartment
    ? `{ employee: { employeePosition: { organizationalUnitId: { _eq: $selectedDepartment } } } },`
    : '';

  // Build query signature
  const querySignature = includeDepartment
    ? `query GetCombinedPlanVsRequestData(
      $currency: String!,
      $startDate: timestamp!,
      $endDate: timestamp!,
      $previousStartDate: timestamp!,
      $previousEndDate: timestamp!,
      $selectedDepartment: uuid
    )`
    : `query GetCombinedPlanVsRequestData(
      $currency: String!,
      $startDate: timestamp!,
      $endDate: timestamp!,
      $previousStartDate: timestamp!,
      $previousEndDate: timestamp!
    )`;

  // Build request type conditions for ExpenseItem filtering
  const buildRequestTypeConditions = (startVar: string, endVar: string): string => {
    // Default conditions: include both EXPENSES and TRIP types
    const defaultConditions = `
        { _and: [
          { expenseDate: { _gte: ${startVar}, _lte: ${endVar} } },
          { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
        ] },
        { _and: [
          { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: ${startVar}, _lte: ${endVar} } } }
        ] }
      `;
    
    // If no requestTypes specified, return default
    if (!requestTypes || requestTypes.length === 0) {
      return defaultConditions;
    }
    
    const conditions: string[] = [];
    if (requestTypes.includes('ExpenseRequestType:v1:EXPENSES')) {
      conditions.push(`
        { _and: [
          { expenseDate: { _gte: ${startVar}, _lte: ${endVar} } },
          { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } } }
        ] }
      `);
    }
    if (requestTypes.includes('ExpenseRequestType:v1:TRIP')) {
      conditions.push(`
        { _and: [
          { expenseRequest: { isDeleted: { _eq: false }, requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" }, startDate: { _gte: ${startVar}, _lte: ${endVar} } } }
        ] }
      `);
    }
    
    // If no conditions matched, fall back to default to avoid empty _or array
    return conditions.length > 0 ? conditions.join(',\n') : defaultConditions;
  };

  return `
    ${querySignature} {
      # ALIGNED_WITH_DASHBOARD_2025_10_13
      # 1. Current Period Expense Plan Total - using item-level dates like Dashboard
      planTotal: ExpensePlanAggregate(
        where: {
          _and: [
            { status: { _nin: ["CREATED", "REJECTED", "DISCARDED"] } },
            { currencyRef: { _eq: $currency } },
            ${departmentCondition}
            { isDeleted: { _eq: false } },
            { _or: [
              { _and: [
                { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } },
                { expensePlanItem: { expenseDate: { _gte: $startDate, _lte: $endDate }, isDeleted: { _eq: false } } }
              ] },
              { _and: [
                { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } },
                { startDate: { _gte: $startDate, _lte: $endDate } }
              ] }
            ] }
          ]
        }
      ) { aggregate { sum { totalAmount } } }
      
      # 2. Current Period Expense Request Total
      requestTotal: ExpenseItemAggregate(
        where: {
          _and: [
            { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
            { currencyRef: { _eq: $currency } },
            ${departmentCondition}
            { isDeleted: { _eq: false } },
            { _or: [
              ${buildRequestTypeConditions('$startDate', '$endDate')}
            ] }
          ]
        }
      ) { aggregate { sum { reimbursableAmount } } }

      # 3. Current Period Category Statistics
      currentPeriodCategories: ExpenseItem(
        where: {
          _and: [
            { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
            { currencyRef: { _eq: $currency } },
            ${departmentCondition}
            { isDeleted: { _eq: false } },
            { _or: [
              ${buildRequestTypeConditions('$startDate', '$endDate')}
            ] }
          ]
        }
      ) {
        expenseGroupRef
        reimbursableAmount
      }

      # 4. Previous Period Category Statistics
      previousPeriodCategories: ExpenseItem(
        where: {
          _and: [
            { status: { _in: ["APPROVED", "VERIFIED", "BOOKED", "PAID"] } },
            { currencyRef: { _eq: $currency } },
            ${departmentCondition}
            { isDeleted: { _eq: false } },
            { _or: [
              ${buildRequestTypeConditions('$previousStartDate', '$previousEndDate')}
            ] }
          ]
        }
      ) {
        expenseGroupRef
        reimbursableAmount
      }

      # 5. Overdue Plans Count
      overduePlans: ExpensePlan(
        where: {
          _and: [
            { status: { _in: ["PENDING_APPROVAL", "APPROVED"] } },
            ${departmentCondition}
            { isDeleted: { _eq: false } },
            { endDate: { _lt: "now()" } }
          ]
        }
      ) {
        id
      }

      # 6. Most Used Currency Detection (lightweight)
      currencyUsage: ExpenseItem(
        where: {
          isDeleted: { _eq: false },
          currencyRef: { _isNull: false }
        },
        limit: 1000
      ) {
        currencyRef
      }
    }
  `;
};

