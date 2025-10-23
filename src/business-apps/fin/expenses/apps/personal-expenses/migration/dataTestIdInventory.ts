// COMPREHENSIVE DATA-TESTID INVENTORY
// Every single one of these MUST be preserved during NW Design System migration

export const CRITICAL_DATA_TEST_IDS = {
  // ======= EXPENSE ITEMS TABLE =======
  EXPENSE_ITEMS: {
    // Action buttons (MOST CRITICAL)
    ACTION_BUTTON: (id: string) => `actions-${id}`, // ✅ PRESERVE
    EDIT_BUTTON: (id: string) => `expense-item-edit-${id}`, // ✅ PRESERVE
    VIEW_BUTTON: (id: string) => `expense-item-view-${id}`, // ✅ PRESERVE
    DELETE_BUTTON: (id: string) => `expense-item-delete-${id}`, // ✅ PRESERVE

    // Table structure
    TABLE_CONTAINER: 'expense-items-table-container', // ✅ PRESERVE
    TABLE_ROW: (id: string) => `expense-items-row-${id}`, // ✅ PRESERVE
    TABLE_CELL: (id: string, field: string) => `expense-items-${field}-${id}`, // ✅ PRESERVE

    // Add button
    ADD_BUTTON: 'add-expense-item-button' // ✅ PRESERVE
  },

  // ======= EXPENSE REQUESTS TABLE =======
  EXPENSE_REQUESTS: {
    // Action buttons
    ACTION_BUTTON: (id: string) => `expense-requests-actions-${id}`, // ✅ PRESERVE
    UPDATE_BUTTON: (id: string) => `expense-requests-update-${id}`, // ✅ PRESERVE

    // Table structure
    TABLE_CONTAINER: 'expense-requests-table-container', // ✅ PRESERVE
    TABLE_ROW: (id: string) => `expense-requests-row-${id}`, // ✅ PRESERVE

    // Add button
    ADD_BUTTON: 'add-expense-request-button' // ✅ PRESERVE
  },

  // ======= EXPENSE PLANS TABLE =======
  EXPENSE_PLANS: {
    // Action buttons
    ACTION_BUTTON: (id: string) => `ExpensePlansTable-actions-cell-${id}`, // ✅ PRESERVE
    UPDATE_BUTTON: (id: string) => `ExpensePlansTable-update-plan-button-${id}`, // ✅ PRESERVE

    // Table structure
    TABLE_CONTAINER: 'expense-plans-table-container', // ✅ PRESERVE
    TABLE_ROW: (id: string) => `ExpensePlansTable-row-${id}`, // ✅ PRESERVE

    // Add button
    ADD_BUTTON: 'add-expense-plan-button' // ✅ PRESERVE
  },

  // ======= ADVANCE PAYMENTS TABLE =======
  ADVANCE_PAYMENTS: {
    // Action buttons
    ACTION_BUTTON: (id: string) => `advance-payments-actions-cell-${id}`, // ✅ PRESERVE
    UPDATE_BUTTON: (id: string) => `advance-payments-update-button-${id}`, // ✅ PRESERVE

    // Table structure
    TABLE_CONTAINER: 'advance-payments-table-container', // ✅ PRESERVE
    TABLE_ROW: (id: string) => `advance-payments-row-${id}` // ✅ PRESERVE
  },

  // ======= DASHBOARD QUICK ACTIONS =======
  DASHBOARD: {
    RECORD_EXPENSE_BUTTON: 'dashboard-record-expense-button', // ✅ PRESERVE
    SUBMIT_REQUEST_BUTTON: 'dashboard-submit-request-button' // ✅ PRESERVE
  },

  // ======= SEARCH AND FILTERS =======
  FILTERS: {
    SEARCH_INPUT: 'search-input', // ✅ PRESERVE
    STATUS_FILTER: 'status-filter', // ✅ PRESERVE
    DATE_FILTER: 'date-filter', // ✅ PRESERVE
    CLEAR_FILTERS: 'clear-filters-button' // ✅ PRESERVE
  }
}

// Validation function to ensure no data-testids are lost
export const validateDataTestIds = (component: string): boolean => {
  const componentTestIds = CRITICAL_DATA_TEST_IDS[component as keyof typeof CRITICAL_DATA_TEST_IDS]

  if (!componentTestIds) {
    console.error(`❌ Unknown component: ${component}`)
    return false
  }

  let allFound = true

  Object.entries(componentTestIds).forEach(([, value]) => {
    if (typeof value === 'function') {
      // Skip function-based test IDs (they generate dynamic IDs)
      return
    }

    const element = document.querySelector(`[data-testid="${value}"]`)
    if (!element) {
      console.error(`❌ Missing data-testid: ${value}`)
      allFound = false
    } else {
      console.log(`✅ Found data-testid: ${value}`)
    }
  })

  return allFound
}

// Migration helper to check specific component
export const checkComponentTestIds = (componentName: string, recordIds: string[] = []) => {
  console.group(`🔍 Checking ${componentName} data-testids`)

  const component = CRITICAL_DATA_TEST_IDS[componentName as keyof typeof CRITICAL_DATA_TEST_IDS]

  if (!component) {
    console.error(`❌ Unknown component: ${componentName}`)
    return false
  }

  let allPresent = true

  // Check static test IDs
  Object.entries(component).forEach(([key, value]) => {
    if (typeof value === 'string') {
      const element = document.querySelector(`[data-testid="${value}"]`)
      if (element) {
        console.log(`✅ ${key}: ${value}`)
      } else {
        console.error(`❌ MISSING ${key}: ${value}`)
        allPresent = false
      }
    }
  })

  // Check dynamic test IDs (for table rows)
  if (recordIds.length > 0) {
    recordIds.forEach(id => {
      Object.entries(component).forEach(([key, value]) => {
        if (typeof value === 'function') {
          const testId = value(id)
          const element = document.querySelector(`[data-testid="${testId}"]`)
          if (element) {
            console.log(`✅ ${key}(${id}): ${testId}`)
          } else {
            console.error(`❌ MISSING ${key}(${id}): ${testId}`)
            allPresent = false
          }
        }
      })
    })
  }

  console.groupEnd()
  return allPresent
}

// Pre-migration audit
export const auditAllDataTestIds = () => {
  console.group('📋 PRE-MIGRATION DATA-TESTID AUDIT')

  let overallResult = true

  Object.keys(CRITICAL_DATA_TEST_IDS).forEach(componentName => {
    const result = checkComponentTestIds(componentName, [])
    if (!result) {
      overallResult = false
    }
  })

  if (overallResult) {
    console.log('✅ ALL DATA-TESTIDS PRESENT - SAFE TO MIGRATE')
  } else {
    console.error('❌ MISSING DATA-TESTIDS - DO NOT MIGRATE YET')
  }

  console.groupEnd()
  return overallResult
}

// Usage during migration:
// 1. Before migration: auditAllDataTestIds()
// 2. After each component: checkComponentTestIds('EXPENSE_ITEMS', ['123', '456'])
// 3. Final verification: auditAllDataTestIds()
