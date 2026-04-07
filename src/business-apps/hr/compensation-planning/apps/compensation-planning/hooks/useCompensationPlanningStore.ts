import { create } from 'zustand'

/**
 * Mirrors the payroll-preparation pattern (`usePayrollRunStore`):
 * - Persistent selector row: Company + Budget Plan
 * - Changing company clears selectedBudgetPlanId by default (see `selectCompany` options)
 * - Changing plan clears downstream derived state
 * - Active tab tracked with deep-link support via ?view= ; Budget setup sub-view via ?budgetSetupSection=departments
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

function readBudgetSetupSectionFromUrl(): 'main' | 'departments' {
  if (typeof window === 'undefined') return 'main'
  const params = new URLSearchParams(window.location.search)
  return params.get('budgetSetupSection') === 'departments' ? 'departments' : 'main'
}

function readInitialStateFromUrl(): {
  activeTab: CompensationPlanningTab
  budgetSetupSection: 'main' | 'departments'
} {
  const activeTab = readTabFromUrl()
  const budgetSetupSection = activeTab === 'budget-setup' ? readBudgetSetupSectionFromUrl() : 'main'
  return { activeTab, budgetSetupSection }
}

function writeCompensationPlanningUrl(tab: CompensationPlanningTab, budgetSetupSection: 'main' | 'departments') {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.set('view', tab)
  if (tab === 'budget-setup' && budgetSetupSection === 'departments') {
    url.searchParams.set('budgetSetupSection', 'departments')
  } else {
    url.searchParams.delete('budgetSetupSection')
  }
  window.history.replaceState(null, '', url.toString())
}

interface CompensationPlanningState {
  selectedCompanyId: string | null
  selectedBudgetPlanId: string | null
  activeTab: CompensationPlanningTab
  /**
   * Sub-view within Budget setup (`?budgetSetupSection=departments`). Synced to URL when `activeTab` is `budget-setup`.
   */
  budgetSetupSection: 'main' | 'departments'

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
  setBudgetSetupSection: (section: 'main' | 'departments') => void
  setSelectedDistributionCompanyBudgetId: (id: string | null) => void
}

const initialFromUrl = readInitialStateFromUrl()

export const useCompensationPlanningStore = create<CompensationPlanningState>(set => ({
  selectedCompanyId: null,
  selectedBudgetPlanId: null,
  activeTab: initialFromUrl.activeTab,
  budgetSetupSection: initialFromUrl.budgetSetupSection,
  selectedDistributionCompanyBudgetId: null,

  selectCompany: (companyId, options) =>
    set(state => {
      const base = {
        selectedCompanyId: companyId,
        selectedBudgetPlanId:
          companyId === null || options?.clearBudgetPlan !== false ? null : state.selectedBudgetPlanId,
        selectedDistributionCompanyBudgetId: null
      }

      if (state.activeTab !== 'budget-setup') {
        return base
      }

      if (companyId === null) {
        writeCompensationPlanningUrl('budget-setup', 'main')
        return { ...base, budgetSetupSection: 'main' as const }
      }

      writeCompensationPlanningUrl('budget-setup', state.budgetSetupSection)
      return { ...base, budgetSetupSection: state.budgetSetupSection }
    }),

  selectBudgetPlan: planId =>
    set({
      selectedBudgetPlanId: planId,
      selectedDistributionCompanyBudgetId: null
    }),

  setActiveTab: tab => {
    const validated = VALID_TABS.has(tab) ? (tab as CompensationPlanningTab) : 'overview'
    writeCompensationPlanningUrl(validated, 'main')
    set({ activeTab: validated, budgetSetupSection: 'main' })
  },

  setBudgetSetupSection: section =>
    set(state => {
      if (state.activeTab !== 'budget-setup') {
        return state
      }
      writeCompensationPlanningUrl('budget-setup', section)
      return { budgetSetupSection: section }
    }),

  setSelectedDistributionCompanyBudgetId: id => set({ selectedDistributionCompanyBudgetId: id })
}))

export function syncCompensationPlanningFromUrl(): void {
  const { activeTab, budgetSetupSection } = readInitialStateFromUrl()
  useCompensationPlanningStore.setState({ activeTab, budgetSetupSection })
}
