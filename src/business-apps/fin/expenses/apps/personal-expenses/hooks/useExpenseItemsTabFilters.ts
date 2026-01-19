// Combines selectedFilters and activeCard into a single array of filters for ExpenseItemsTab
// This is a minimal restoration based on usage in ExpenseItemsTab.tsx

export function useExpenseItemsTabFilters(selectedFilters: string[], activeCard: string | null): string[] {
  let filters = [...selectedFilters]

  // Map card keys to filter values as needed
  if (activeCard === 'pending-reimbursement' && !filters.includes('pending')) {
    filters.push('pending')
  }

  if (activeCard === 'total-expenses') {
    // Only filter paid or closed items for total expenses
    filters = filters.filter(f => f !== 'pending' && f !== 'submitted' && f !== 'in progress')
    if (!filters.includes('paid')) filters.push('paid')
    if (!filters.includes('closed')) filters.push('closed')
  }

  return filters
}
