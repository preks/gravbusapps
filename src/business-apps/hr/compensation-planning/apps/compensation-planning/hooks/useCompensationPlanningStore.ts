import { create } from 'zustand'

/**
 * Mirrors the payroll-preparation pattern (`usePayrollRunStore`):
 * - Persistent selector row: Company + Budget Plan
 * - Changing company clears selectedBudgetPlanId by default (see `selectCompany` options)
 * - Changing plan clears downstream derived state
 * - Active tab tracked with deep-link support via ?view=
 */

export type CompensationPlanningTab = 'overview' | 'budget-setup' | 'budget-distribution' | 'submissions'

const VALID_TABS = new Set<string>(['overview', 'budget-setup', 'budget-distribution', 'submissions'])

function readTabFromUrl(): CompensationPlanningTab {
  if (typeof window === 'undefined') return 'overview'
  const params = new URLSearchParams(window.location.search)
  const view = params.get('view')
  if (view && VALID_TABS.has(view)) return view as CompensationPlanningTab
  return 'overview'
}

function writeTabToUrl(tab: CompensationPlanningTab) {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.set('view', tab)
  window.history.replaceState(null, '', url.toString())
}

interface CompensationPlanningState {
  selectedCompanyId: string | null
  selectedBudgetPlanId: string | null
  activeTab: CompensationPlanningTab

  /**
   * Selected `compensation_budget_plan_company` row for Budget distribution.
   * Derived from (planId, companyId) — cleared when either changes.
   */
  selectedDistributionCompanyBudgetId: string | null

  /**
   * Changing company clears `selectedBudgetPlanId` by default so list/setup stay consistent.
   * Pass `{ clearBudgetPlan: false }` when switching company while staying on the same cycle (e.g. Overview plan dashboard).
   */
  selectCompany: (companyId: string | null, options?: { clearBudgetPlan?: boolean }) => void
  selectBudgetPlan: (planId: string | null) => void
  setActiveTab: (tab: string) => void
  setSelectedDistributionCompanyBudgetId: (id: string | null) => void
}

export const useCompensationPlanningStore = create<CompensationPlanningState>(set => ({
  selectedCompanyId: null,
  selectedBudgetPlanId: null,
  activeTab: readTabFromUrl(),
  selectedDistributionCompanyBudgetId: null,

  selectCompany: (companyId, options) =>
    set(state => ({
      selectedCompanyId: companyId,
      selectedBudgetPlanId:
        companyId === null || options?.clearBudgetPlan !== false ? null : state.selectedBudgetPlanId,
      selectedDistributionCompanyBudgetId: null
    })),

  selectBudgetPlan: planId =>
    set({
      selectedBudgetPlanId: planId,
      selectedDistributionCompanyBudgetId: null
    }),

  setActiveTab: tab => {
    const validated = VALID_TABS.has(tab) ? (tab as CompensationPlanningTab) : 'overview'
    writeTabToUrl(validated)
    set({ activeTab: validated })
  },

  setSelectedDistributionCompanyBudgetId: id => set({ selectedDistributionCompanyBudgetId: id })
}))
