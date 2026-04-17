import { useManagerPlanningStore } from './useManagerPlanningStore'

/** Toolbar wiring for manager team list: search only (filters/sort live in store for pipeline but are not shown in UI). */
export function useManagerTeamCompensationDataDisplay() {
  const { searchQuery, setSearchQuery } = useManagerPlanningStore()

  return {
    searchQuery,
    setSearchQuery
  }
}
