import { useState, useCallback, useMemo } from 'react'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface TeamReportFilter {
  position?: string[]
  location?: string[]
  employmentType?: string[]
  contractType?: string[]
  tenurePeriod?: string[]
  exitStatus?: 'active' | 'inactive' | null
}

export interface UseTeamReportV2FiltersReturn {
  search: string
  setSearch: (search: string) => void
  selectedFilters: string[]
  filterGroups: DataFilterGroup[]
  filterLabelMap: Record<string, string>
  addFilter: (filterId: string) => void
  removeFilter: (filterId: string) => void
  getFilters: () => TeamReportFilter
  clearFilters: () => void
}

export interface FilterOption {
  id: string
  name: string
}

export const useTeamReportFilters = (
  uniquePositions: string[] = [],
  uniqueLocations: string[] = [],
  uniqueEmploymentTypes: string[] = [],
  uniqueContractTypes: string[] = []
): UseTeamReportV2FiltersReturn => {
  const [search, setSearch] = useState<string>('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])

  const TENURE_OPTIONS = [
    {
      id: '0-1y',
      label: '0-1 ' + getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.profile_icon_list.years', 'years')
    },
    {
      id: '1-3y',
      label: '1-3 ' + getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.profile_icon_list.years', 'years')
    },
    {
      id: '3-5y',
      label: '3-5 ' + getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.profile_icon_list.years', 'years')
    },
    {
      id: '5-10y',
      label: '5-10 ' + getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.profile_icon_list.years', 'years')
    },
    {
      id: '10+y',
      label: '10+ ' + getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.profile_icon_list.years', 'years')
    }
  ]
  const TENURE_OPTION_IDS = new Set(TENURE_OPTIONS.map(o => o.id))
  const EXIT_STATUS_OPTIONS = new Set(['activeOnly', 'inactiveOnly'])

  const filterGroups = useMemo<DataFilterGroup[]>(() => {
    const SEARCH_THRESHOLD = 10
    const groups: DataFilterGroup[] = []

    const getSelectedForGroup = (prefix: string) => {
      return selectedFilters.filter(f => f.startsWith(`${prefix}:`)).map(f => f.replace(`${prefix}:`, ''))
    }

    const createFilterObjects = (items: string[], prefix: string, selectedForGroup: string[]) => {
      return items.map(item => ({
        id: `${prefix}:${item}`,
        label: item,
        selected: selectedForGroup.includes(item) || selectedFilters.includes(`${prefix}:${item}`)
      }))
    }

    const handleNoSearch = (prefix: string, selectedForGroup: string[]) => {
      if (selectedForGroup.length > 0) {
        const filters = createFilterObjects(selectedForGroup, prefix, selectedForGroup)
        return { filters, loading: false, error: null }
      }
      return { filters: [], loading: true, error: null }
    }

    const handleWithSearch = (prefix: string, allItems: string[], search: string, selectedForGroup: string[]) => {
      const matchingItems = allItems.filter(item => item.toLowerCase().includes(search.toLowerCase()))
      const allItemsToShow = [...new Set([...selectedForGroup, ...matchingItems])]
      const filters = createFilterObjects(allItemsToShow, prefix, selectedForGroup)
      return { filters, loading: false, error: null }
    }

    const createSearchHandler = (prefix: string, allItems: string[]) => (search: string) => {
      const selectedForGroup = getSelectedForGroup(prefix)

      if (!search) {
        return handleNoSearch(prefix, selectedForGroup)
      }

      return handleWithSearch(prefix, allItems, search, selectedForGroup)
    }

    if (uniquePositions.length > SEARCH_THRESHOLD) {
      groups.push({
        id: 'position',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_profile.summary_layout.public_profile_container.job_position',
          'Job Position'
        ),
        backendSearch: createSearchHandler('position', uniquePositions)
      })
    } else {
      groups.push({
        id: 'position',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_profile.summary_layout.public_profile_container.job_position',
          'Job Position'
        ),
        filters: uniquePositions.map(position => ({
          id: `position:${position}`,
          label: position,
          selected: selectedFilters.includes(`position:${position}`)
        }))
      })
    }

    if (uniqueLocations.length > SEARCH_THRESHOLD) {
      groups.push({
        id: 'location',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_profile.profile_icon_list.location_title',
          'Location'
        ),
        backendSearch: createSearchHandler('location', uniqueLocations)
      })
    } else {
      groups.push({
        id: 'location',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_profile.profile_icon_list.location_title',
          'Location'
        ),
        filters: uniqueLocations.map(location => ({
          id: `location:${location}`,
          label: location,
          selected: selectedFilters.includes(`location:${location}`)
        }))
      })
    }

    if (uniqueEmploymentTypes.length > SEARCH_THRESHOLD) {
      groups.push({
        id: 'employmentType',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_profile.employement_layout.working_conditions_container.employment_type_input',
          'Employment Type'
        ),
        backendSearch: createSearchHandler('employmentType', uniqueEmploymentTypes)
      })
    } else {
      groups.push({
        id: 'employmentType',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_profile.employement_layout.working_conditions_container.employment_type_input',
          'Employment Type'
        ),
        filters: uniqueEmploymentTypes.map(type => ({
          id: `employmentType:${type}`,
          label: type,
          selected: selectedFilters.includes(`employmentType:${type}`)
        }))
      })
    }

    if (uniqueContractTypes.length > SEARCH_THRESHOLD) {
      groups.push({
        id: 'contractType',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_profile.employement_layout.working_conditions_container.contract_type_input',
          'Contract Type'
        ),
        backendSearch: createSearchHandler('contractType', uniqueContractTypes)
      })
    } else {
      groups.push({
        id: 'contractType',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_profile.employement_layout.working_conditions_container.contract_type_input',
          'Contract Type'
        ),
        filters: uniqueContractTypes.map(type => ({
          id: `contractType:${type}`,
          label: type,
          selected: selectedFilters.includes(`contractType:${type}`)
        }))
      })
    }

    const tenureSearchHandler = (search: string) => {
      const allItems = TENURE_OPTIONS
      let filteredItems = allItems

      if (search) {
        filteredItems = allItems.filter(item => {
          const searchTerm = search.toLowerCase()
          return item.label.toLowerCase().includes(searchTerm) || item.id.toLowerCase().includes(searchTerm)
        })
      }

      const filters = filteredItems.map(item => ({
        id: item.id,
        label: item.label,
        selected: selectedFilters.includes(item.id)
      }))

      return { filters, loading: false, error: null }
    }

    groups.push({
      id: 'tenure',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.employement_layout.working_conditions_container.tenure_header',
        'Tenure'
      ),
      backendSearch: tenureSearchHandler
    })

    return groups
  }, [selectedFilters, uniquePositions, uniqueLocations, uniqueEmploymentTypes, uniqueContractTypes])

  const filterLabelMap = useMemo(() => {
    const labelMap: Record<string, string> = {
      activeOnly: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_report_filters.active_only',
        'Active employees only'
      ),
      inactiveOnly: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_report_filters.inactive_only',
        'Inactive employees only'
      )
    }

    TENURE_OPTIONS.forEach(option => {
      labelMap[option.id] = option.label
    })

    uniquePositions.forEach(position => {
      labelMap[`position:${position}`] =
        `${getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.summary_layout.public_profile_container.job_position', 'Job Position')}: ${position}`
    })

    uniqueLocations.forEach(location => {
      labelMap[`location:${location}`] =
        `${getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.profile_icon_list.location_title', 'Location')}: ${location}`
    })

    uniqueEmploymentTypes.forEach(type => {
      labelMap[`employmentType:${type}`] =
        `${getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.employement_layout.working_conditions_container.employment_type_input', 'Employment Type')}: ${type}`
    })

    uniqueContractTypes.forEach(type => {
      labelMap[`contractType:${type}`] =
        `${getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.employement_layout.working_conditions_container.contract_type_input', 'Contract Type')}: ${type}`
    })

    return labelMap
  }, [uniquePositions, uniqueLocations, uniqueEmploymentTypes, uniqueContractTypes])

  const addFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => {
      if (EXIT_STATUS_OPTIONS.has(filterId)) {
        const withoutExitStatus = prev.filter(f => !EXIT_STATUS_OPTIONS.has(f))
        return [...withoutExitStatus, filterId]
      }

      if (prev.includes(filterId)) {
        return prev
      } else {
        return [...prev, filterId]
      }
    })
  }, [])

  const removeFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => prev.filter(f => f !== filterId))
  }, [])

  const clearFilters = useCallback(() => {
    setSelectedFilters([])
    setSearch('')
  }, [])

  const getFilters = useCallback((): TeamReportFilter => {
    const filter: TeamReportFilter = {}

    const positionFilters = selectedFilters.filter(f => f.startsWith('position:')).map(f => f.replace('position:', ''))

    const locationFilters = selectedFilters.filter(f => f.startsWith('location:')).map(f => f.replace('location:', ''))

    const employmentTypeFilters = selectedFilters
      .filter(f => f.startsWith('employmentType:'))
      .map(f => f.replace('employmentType:', ''))

    const contractTypeFilters = selectedFilters
      .filter(f => f.startsWith('contractType:'))
      .map(f => f.replace('contractType:', ''))

    const tenurePeriods = selectedFilters.filter(f => TENURE_OPTION_IDS.has(f))

    const exitStatus = selectedFilters.find(f => EXIT_STATUS_OPTIONS.has(f))

    if (positionFilters.length > 0) {
      filter.position = positionFilters
    }

    if (locationFilters.length > 0) {
      filter.location = locationFilters
    }

    if (employmentTypeFilters.length > 0) {
      filter.employmentType = employmentTypeFilters
    }

    if (contractTypeFilters.length > 0) {
      filter.contractType = contractTypeFilters
    }

    if (tenurePeriods.length > 0) {
      filter.tenurePeriod = tenurePeriods
    }

    if (exitStatus) {
      filter.exitStatus = exitStatus === 'activeOnly' ? 'active' : 'inactive'
    }

    return filter
  }, [selectedFilters, uniquePositions, uniqueLocations, uniqueEmploymentTypes, uniqueContractTypes])

  return {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    clearFilters,
    getFilters
  }
}

export default useTeamReportFilters
