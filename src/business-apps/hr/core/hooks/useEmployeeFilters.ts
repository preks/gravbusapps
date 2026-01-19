'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '../apps/human-resources/_i18n'
//import { useTranslation } from 'react-i18next';
import { useGetOrganizationalUnits, OrganizationalUnitOption } from './useGetOrganizationalUnits'
import { useGetEmploymentTypes, EmploymentTypeOption } from './useGetEmploymentTypes'
import { useGetContractTypes, ContractTypeOption } from './useGetContractTypes'
import { useGetMatrixTeams, MatrixTeamOption } from './useGetMatrixTeams'

/**
 * Filter option interface for consistent typing
 */
export interface FilterOption {
  id: string
  label: string
  selected: boolean
  onSelect?: () => void
  onDeselect?: () => void
}

/**
 * Filter group interface for use with DataContainer component
 */
export interface FilterGroup {
  id: string
  title: string
  filters?: FilterOption[]
  backendSearch?: (search: string) => { filters: FilterOption[]; loading: boolean; error: any }
}

/**
 * Employee filters interface for use with API calls
 */
export interface EmployeeFilters {
  alpha: string | null
  search: string
  organizationalUnits: string[]
  employmentTypes: string[]
  contractTypes: string[]
  matrixTeams: string[]
}

/**
 * Custom hook to manage employee filters across components
 * @returns Filter state and utility functions
 */
export function useEmployeeFilters(accessToken: string) {
  //const { t } = useTranslation();
  const { t } = useTranslation(hrTranslations)

  // Search and filter state
  const [search, setSearch] = useState('')
  const [alpha, setAlpha] = useState<string | null>(null)
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])

  // Organizational Unit filter state
  const [orgUnitSearch, setOrgUnitSearch] = useState('')
  const [orgUnitOffset, setOrgUnitOffset] = useState(0)
  const {
    units: orgUnitOptions,
    loading: orgUnitLoading,
    error: orgUnitError
  } = useGetOrganizationalUnits(accessToken, orgUnitSearch, orgUnitOffset)

  // Employment Type filter state
  const [employmentTypeSearch, setEmploymentTypeSearch] = useState('')
  const [employmentTypeOffset, setEmploymentTypeOffset] = useState(0)
  const {
    types: employmentTypeOptions,
    loading: employmentTypeLoading,
    error: employmentTypeError
  } = useGetEmploymentTypes(accessToken, employmentTypeSearch, employmentTypeOffset)

  // Contract Type filter state
  const [contractTypeSearch, setContractTypeSearch] = useState('')
  const [contractTypeOffset, setContractTypeOffset] = useState(0)
  const {
    types: contractTypeOptions,
    loading: contractTypeLoading,
    error: contractTypeError
  } = useGetContractTypes(accessToken, contractTypeSearch, contractTypeOffset)

  // Matrix Team filter state
  const [matrixTeamSearch, setMatrixTeamSearch] = useState('')
  const [matrixTeamOffset, setMatrixTeamOffset] = useState(0)
  const {
    teams: matrixTeamOptions,
    loading: matrixTeamLoading,
    error: matrixTeamError
  } = useGetMatrixTeams(accessToken, matrixTeamSearch, matrixTeamOffset)

  // Add a filter to the selected filters
  const addFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => [...prev, filterId])
  }, [])

  // Remove a filter from the selected filters
  const removeFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => prev.filter(id => id !== filterId))
  }, [])

  // We no longer use the combined handleFilterChange function
  // Instead, we use separate addFilter and removeFilter functions directly
  // This approach follows best practices and addresses lint warnings

  // Get selected filter IDs by type
  const getSelectedFiltersByType = useCallback(() => {
    return {
      organizationalUnits: selectedFilters.filter(f => orgUnitOptions.map(u => u.id).includes(f)),
      employmentTypes: selectedFilters.filter(f => employmentTypeOptions.map(t => t.id).includes(f)),
      contractTypes: selectedFilters.filter(f => contractTypeOptions.map(t => t.id).includes(f)),
      matrixTeams: selectedFilters.filter(f => matrixTeamOptions.map(t => t.id).includes(f))
    }
  }, [selectedFilters, orgUnitOptions, employmentTypeOptions, contractTypeOptions, matrixTeamOptions])

  // Map organizational units to filter options with separate select/deselect handlers
  const orgUnitFilterOptions = useMemo(() => {
    return orgUnitOptions.map((unit: OrganizationalUnitOption) => ({
      id: unit.id,
      label: unit.name,
      selected: selectedFilters.includes(unit.id),
      onSelect: () => addFilter(unit.id),
      onDeselect: () => removeFilter(unit.id)
    }))
  }, [orgUnitOptions, selectedFilters, addFilter, removeFilter])

  // Map employment types to filter options with separate select/deselect handlers
  const employmentTypeFilterOptions = useMemo(() => {
    return employmentTypeOptions.map((type: EmploymentTypeOption) => ({
      id: type.id,
      label: type.name,
      selected: selectedFilters.includes(type.id),
      onSelect: () => addFilter(type.id),
      onDeselect: () => removeFilter(type.id)
    }))
  }, [employmentTypeOptions, selectedFilters, addFilter, removeFilter])

  // Map contract types to filter options with separate select/deselect handlers
  const contractTypeFilterOptions = useMemo(() => {
    return contractTypeOptions.map((type: ContractTypeOption) => ({
      id: type.id,
      label: type.name ?? '',
      selected: selectedFilters.includes(type.id),
      onSelect: () => addFilter(type.id),
      onDeselect: () => removeFilter(type.id)
    }))
  }, [contractTypeOptions, selectedFilters, addFilter, removeFilter])

  // Map matrix teams to filter options with separate select/deselect handlers
  const matrixTeamFilterOptions = useMemo(() => {
    return matrixTeamOptions.map((team: MatrixTeamOption) => ({
      id: team.id,
      label: team.name,
      selected: selectedFilters.includes(team.id),
      onSelect: () => addFilter(team.id),
      onDeselect: () => removeFilter(team.id)
    }))
  }, [matrixTeamOptions, selectedFilters, addFilter, removeFilter])

  // Create backend search functions that directly use the hooks
  const getOrgUnitFilters = useCallback(
    (search: string) => {
      // Update the search query
      setOrgUnitSearch(search)

      return {
        filters: orgUnitOptions.map(unit => ({
          id: unit.id,
          label: unit.name,
          selected: selectedFilters.includes(unit.id)
        })),
        loading: orgUnitLoading,
        error: orgUnitError
      }
    },
    [orgUnitOptions, selectedFilters, orgUnitLoading, orgUnitError, setOrgUnitSearch]
  )

  const getEmploymentTypeFilters = useCallback(
    (search: string) => {
      // Update the search query
      setEmploymentTypeSearch(search)

      return {
        filters: employmentTypeOptions.map(type => ({
          id: type.id,
          label: type.name,
          selected: selectedFilters.includes(type.id)
        })),
        loading: employmentTypeLoading,
        error: employmentTypeError
      }
    },
    [employmentTypeOptions, selectedFilters, employmentTypeLoading, employmentTypeError, setEmploymentTypeSearch]
  )

  const getContractTypeFilters = useCallback(
    (search: string) => {
      // Update the search query
      setContractTypeSearch(search)

      return {
        filters: contractTypeOptions.map(type => ({
          id: type.id,
          label: type.name ?? '',
          selected: selectedFilters.includes(type.id)
        })),
        loading: contractTypeLoading,
        error: contractTypeError
      }
    },
    [contractTypeOptions, selectedFilters, contractTypeLoading, contractTypeError, setContractTypeSearch]
  )

  const getMatrixTeamFilters = useCallback(
    (search: string) => {
      // Update the search query
      setMatrixTeamSearch(search)

      return {
        filters: matrixTeamOptions.map(team => ({
          id: team.id,
          label: team.name,
          selected: selectedFilters.includes(team.id)
        })),
        loading: matrixTeamLoading,
        error: matrixTeamError
      }
    },
    [matrixTeamOptions, selectedFilters, matrixTeamLoading, matrixTeamError, setMatrixTeamSearch]
  )

  // Create filter groups for the DataContainer component
  const filterGroups: FilterGroup[] = [
    {
      id: 'organizationalUnits',
      title: t('hr-employees-filters-organizational-units'),
      filters: orgUnitFilterOptions,
      backendSearch: getOrgUnitFilters
    },
    {
      id: 'employmentTypes',
      title: t('hr-employees-filters-employment-types'),
      filters: employmentTypeFilterOptions,
      backendSearch: getEmploymentTypeFilters
    },
    {
      id: 'contractTypes',
      title: t('hr-employees-filters-contract-types'),
      filters: contractTypeFilterOptions,
      backendSearch: getContractTypeFilters
    },
    {
      id: 'matrixTeams',
      title: t('hr-employees-filters-matrix-teams'),
      filters: matrixTeamFilterOptions,
      backendSearch: getMatrixTeamFilters
    }
  ]

  // Create filter label map for the DataContainer component
  const filterLabelMap = {
    ...Object.fromEntries(orgUnitOptions.map(u => [u.id, u.name])),
    ...Object.fromEntries(employmentTypeOptions.map(e => [e.id, e.name])),
    ...Object.fromEntries(contractTypeOptions.map(c => [c.id, c.name])),
    ...Object.fromEntries(matrixTeamOptions.map(t => [t.id, t.name]))
  }

  // Get current filters for API calls
  const getFilters = useCallback((): EmployeeFilters => {
    const { organizationalUnits, employmentTypes, contractTypes, matrixTeams } = getSelectedFiltersByType()
    return {
      alpha,
      search,
      organizationalUnits,
      employmentTypes,
      contractTypes,
      matrixTeams
    }
  }, [alpha, search, getSelectedFiltersByType])

  // Reset filters
  const resetFilters = useCallback(() => {
    setSearch('')
    setAlpha(null)
    setSelectedFilters([])
  }, [])

  return {
    // State
    search,
    setSearch,
    alpha,
    setAlpha,
    selectedFilters,
    setSelectedFilters,

    // Filter options
    orgUnitOptions,
    employmentTypeOptions,
    contractTypeOptions,

    // Loading states
    orgUnitLoading,
    employmentTypeLoading,
    contractTypeLoading,
    matrixTeamLoading,

    // Error states
    orgUnitError,
    employmentTypeError,
    contractTypeError,
    matrixTeamError,

    // Pagination
    setOrgUnitOffset,
    setEmploymentTypeOffset,
    setContractTypeOffset,
    setMatrixTeamOffset,

    // Search setters
    setOrgUnitSearch,
    setEmploymentTypeSearch,
    setContractTypeSearch,
    setMatrixTeamSearch,

    // Helper functions
    addFilter,
    removeFilter,
    getSelectedFiltersByType,
    getFilters,
    resetFilters,

    // DataContainer props
    filterGroups,
    filterLabelMap
  }
}
