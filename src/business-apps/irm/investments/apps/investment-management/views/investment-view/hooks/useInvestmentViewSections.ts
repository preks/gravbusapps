import { useCallback, useMemo, useState } from 'react'
import type { StoredPreferences } from '@/common/hooks/useViewPreferencesStorage'
import { useInvestmentSectionState } from '../data/investment-data/useInvestmentSectionState'
import { useGenericInvestmentSectionState } from './useGenericInvestmentSectionState'
import type { InvestmentGroup } from './useInvestmentGroups'
import type { InvestmentListColumnConfiguration } from '../utils/investmentListColumnTransformer'
import { OVERVIEW_AVAILABLE_COLUMN_IDS, OVERVIEW_DEFAULT_VISIBLE_COLUMNS } from '../utils/investmentViewColumns'
import { reconcileVisibleColumns } from '../utils/investmentViewPreferences'

interface UseInvestmentViewSectionsOptions {
  accessToken: string | undefined
  currentSection: string
  investmentGroups: InvestmentGroup[]
  filtersByTab: Record<string, Record<string, any>>
  filtersReady: boolean
  dynamicColumnConfigByTab: Record<string, InvestmentListColumnConfiguration>
  preferencesByTab: Record<string, StoredPreferences>
  savePreferencePatch: (tabId: string, patch: StoredPreferences) => void
}

const EMPTY_FILTERS: Record<string, any> = {}

export const useInvestmentViewSections = ({
  accessToken,
  currentSection,
  investmentGroups,
  filtersByTab,
  filtersReady,
  dynamicColumnConfigByTab,
  preferencesByTab,
  savePreferencePatch
}: UseInvestmentViewSectionsOptions) => {
  const activeGroup = investmentGroups.find(group => group.tabId === currentSection)
  const activeColumnConfig = currentSection === 'overview' ? undefined : dynamicColumnConfigByTab[currentSection]

  const [searchBySection, setSearchBySection] = useState<Record<string, string>>({})
  const saveSearch = useCallback(
    (search: string) => {
      setSearchBySection(prev => ({ ...prev, [currentSection]: search }))
    },
    [currentSection]
  )

  const stableOverviewFilters = useMemo(() => filtersByTab.overview || EMPTY_FILTERS, [filtersByTab.overview])
  const overviewInitialVisibleColumns = useMemo(
    () =>
      reconcileVisibleColumns(
        preferencesByTab.overview?.visibleColumns,
        OVERVIEW_AVAILABLE_COLUMN_IDS,
        OVERVIEW_DEFAULT_VISIBLE_COLUMNS
      ),
    [preferencesByTab.overview?.visibleColumns]
  )

  const saveOverviewSorting = useCallback(
    (sorting: Array<{ id: string; desc: boolean }>) => {
      savePreferencePatch('overview', { sorting })
    },
    [savePreferencePatch]
  )
  const saveOverviewVisibleColumns = useCallback(
    (visibleColumns: string[]) => {
      savePreferencePatch('overview', { visibleColumns })
    },
    [savePreferencePatch]
  )

  const overviewState = useInvestmentSectionState({
    accessToken: filtersReady && currentSection === 'overview' ? accessToken || '' : '',
    selectedFilters: stableOverviewFilters,
    initialSorting: preferencesByTab.overview?.sorting ?? null,
    onSortingChange: saveOverviewSorting,
    initialVisibleColumns: overviewInitialVisibleColumns,
    onVisibleColumnsChange: saveOverviewVisibleColumns
  })

  const activeDynamicVisibleColumnIds = useMemo(
    () =>
      activeColumnConfig ? ['name', ...activeColumnConfig.availableColumns.map(column => column.id), 'actions'] : [],
    [activeColumnConfig]
  )
  const activeDynamicInitialVisibleColumns = useMemo(
    () =>
      activeColumnConfig
        ? reconcileVisibleColumns(
            preferencesByTab[currentSection]?.visibleColumns,
            activeDynamicVisibleColumnIds,
            activeColumnConfig.defaultVisibleColumns
          )
        : null,
    [activeColumnConfig, activeDynamicVisibleColumnIds, currentSection, preferencesByTab]
  )

  const saveDynamicSorting = useCallback(
    (sorting: Array<{ id: string; desc: boolean }>) => {
      savePreferencePatch(currentSection, { sorting })
    },
    [currentSection, savePreferencePatch]
  )
  const saveDynamicVisibleColumns = useCallback(
    (visibleColumns: string[]) => {
      savePreferencePatch(currentSection, { visibleColumns })
    },
    [currentSection, savePreferencePatch]
  )

  const activeDynamicState = useGenericInvestmentSectionState({
    accessToken: filtersReady && activeGroup && currentSection !== 'overview' ? accessToken || '' : '',
    group: activeGroup ?? null,
    sectionKey: currentSection,
    initialSearch: searchBySection[currentSection],
    onSearchChange: saveSearch,
    selectedFilters: filtersByTab[currentSection] || EMPTY_FILTERS,
    ...(activeColumnConfig?.defaultVisibleColumns
      ? { defaultVisibleColumns: activeColumnConfig.defaultVisibleColumns }
      : {}),
    initialSorting: preferencesByTab[currentSection]?.sorting ?? null,
    onSortingChange: saveDynamicSorting,
    initialVisibleColumns: activeDynamicInitialVisibleColumns,
    onVisibleColumnsChange: saveDynamicVisibleColumns,
    ...(activeColumnConfig?.queryFields ? { queryFields: activeColumnConfig.queryFields } : {}),
    ...(activeColumnConfig?.sortDescriptors ? { sortDescriptors: activeColumnConfig.sortDescriptors } : {}),
    ...(activeColumnConfig?.sortFieldByColumnId ? { sortFieldByColumnId: activeColumnConfig.sortFieldByColumnId } : {}),
    ...(activeColumnConfig?.filterConditionByFilterId
      ? { filterConditionByFilterId: activeColumnConfig.filterConditionByFilterId }
      : {})
  })

  const currentState = currentSection === 'overview' ? overviewState : activeDynamicState

  const titleSections = useMemo(() => {
    const sections = [{ id: 'overview', label: 'Overview' }]
    investmentGroups.forEach(group => {
      sections.push({ id: group.tabId, label: group.label })
    })
    return sections
  }, [investmentGroups])

  return {
    currentSection,
    activeGroup,
    activeColumnConfig,
    overviewState,
    activeDynamicState,
    currentState,
    titleSections
  }
}
