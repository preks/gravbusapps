import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import { BackofficeFilterSheet } from '@/business-apps/fin/expenses/apps/backoffice-expenses/common/components/BackofficeFilterSheet'
import { CompanyFilterGroup } from '@/business-apps/hr/core/apps/human-resources/components/views/analytics-view/components/shared/CompanyFilterGroup'
import { useActiveStructureCompanies } from '@/business-apps/hr/core/apps/human-resources/components/views/analytics-view/hooks/useActiveStructureCompanies'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

type TFunction = (key: string) => string

type Option = { id: string; label: string }

type DSFilterType = FilterConfiguration['groups'][number]['filters'][number]['type']

type OuRow = { id: string; name: string | null }
type JobFunctionRow = { id: string; name: string | null }
type JobProfileRow = { id: string; name: string | null }

const GET_ALL_DEPARTMENTS = `
  query GetAllDepartments($structureId: uuid!, $limit: Int!) {
    OrganizationalUnit(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { structureId: { _eq: $structureId } }
        ]
      }
      orderBy: { name: ASC }
      limit: $limit
    ) {
      id
      name
    }
  }
`

const GET_ALL_JOB_FUNCTIONS = `
  query GetAllJobFunctions($limit: Int!) {
    JobFunction(where: { isDeleted: { _eq: false } }, orderBy: { name: ASC }, limit: $limit) {
      id
      name
    }
  }
`

const GET_ALL_JOB_PROFILES = `
  query GetAllJobProfiles($limit: Int!) {
    JobProfile(where: { isDeleted: { _eq: false } }, orderBy: { name: ASC }, limit: $limit) {
      id
      name
    }
  }
`

function toOptions(rows: Array<{ id: string; name: string | null }> | null | undefined): Option[] {
  return (rows ?? [])
    .filter(row => typeof row?.id === 'string' && row.id.length > 0)
    .map(row => ({
      id: row.id,
      label: (row.name ?? '').trim() || row.id
    }))
}

export function useJobPositionListFilterSheet(params: {
  accessToken: string
  tHr: TFunction
  tPositions: TFunction
  onAnyFilterChange: () => void
}) {
  const { accessToken, tHr, tPositions, onAnyFilterChange } = params

  const [filtersObject, setFiltersObject] = useState<Record<string, unknown>>({})

  // Companies (same source as analytics)
  const { companies: companyNodes } = useActiveStructureCompanies(accessToken)
  const companies = useMemo<Option[]>(
    () => (companyNodes ?? []).map(c => ({ id: c.id, label: c.name })),
    [companyNodes]
  )

  const graphqlClient = useGraphqlClient(accessToken)
  const structureId = getCurrentActiveStructureId()

  const [deptOptions, setDeptOptions] = useState<Option[]>([])
  const [jobFunctionOptions, setJobFunctionOptions] = useState<Option[]>([])
  const [jobProfileOptions, setJobProfileOptions] = useState<Option[]>([])

  useEffect(() => {
    if (!accessToken) return
    if (!structureId) return
    let cancelled = false

    ;(async () => {
      try {
        const [deptRes, fnRes, profileRes] = await Promise.all([
          graphqlClient.request<{ OrganizationalUnit: OuRow[] }>(GET_ALL_DEPARTMENTS, { structureId, limit: 1000 }),
          graphqlClient.request<{ JobFunction: JobFunctionRow[] }>(GET_ALL_JOB_FUNCTIONS, { limit: 1000 }),
          graphqlClient.request<{ JobProfile: JobProfileRow[] }>(GET_ALL_JOB_PROFILES, { limit: 1000 })
        ])

        if (cancelled) return
        setDeptOptions(toOptions(deptRes?.OrganizationalUnit))
        setJobFunctionOptions(toOptions(fnRes?.JobFunction))
        setJobProfileOptions(toOptions(profileRes?.JobProfile))
      } catch {
        if (cancelled) return
        setDeptOptions([])
        setJobFunctionOptions([])
        setJobProfileOptions([])
      }
    })()

    return () => {
      cancelled = true
    }
  }, [accessToken, graphqlClient, structureId])

  const companyFilterGroupTitle = tHr('hr-analytics-filter-company-title')

  const filterConfiguration = useMemo<FilterConfiguration>(
    () => ({
      id: 'hr-job-positions-filters',
      name: tHr('hr-positions-filter-sheet-title'),
      groups: [
        {
          id: 'company-group',
          label: companyFilterGroupTitle,
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'companyIds',
              field: 'companyIds',
              label: companyFilterGroupTitle,
              type: 'multi-select' as DSFilterType,
              config: { options: companies, showSearch: true, showSelectAll: true }
            }
          ]
        },
        {
          id: 'departments-group',
          label: tPositions('hr-positions-filters-departments'),
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'departments',
              field: 'departments',
              label: tPositions('hr-positions-filters-departments'),
              type: 'multi-select' as DSFilterType,
              config: { options: deptOptions, showSearch: true, showSelectAll: true }
            }
          ]
        },
        {
          id: 'job-functions-group',
          label: tPositions('hr-positions-filters-job-functions'),
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'jobFunctions',
              field: 'jobFunctions',
              label: tPositions('hr-positions-filters-job-functions'),
              type: 'multi-select' as DSFilterType,
              config: { options: jobFunctionOptions, showSearch: true, showSelectAll: true }
            }
          ]
        },
        {
          id: 'job-profiles-group',
          label: tPositions('hr-positions-filters-job-profiles'),
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'jobProfiles',
              field: 'jobProfiles',
              label: tPositions('hr-positions-filters-job-profiles'),
              type: 'multi-select' as DSFilterType,
              config: { options: jobProfileOptions, showSearch: true, showSelectAll: true }
            }
          ]
        }
      ]
    }),
    [companies, companyFilterGroupTitle, deptOptions, jobFunctionOptions, jobProfileOptions, tHr, tPositions]
  )

  const handleFilterChangeFromDisplay = useCallback(
    (next: Record<string, unknown>) => {
      setFiltersObject(next)
      onAnyFilterChange()
    },
    [onAnyFilterChange]
  )

  const renderFilterSheet = useCallback(
    (open: boolean, onOpenChange: (open: boolean) => void) => (
      <BackofficeFilterSheet
        open={open}
        onOpenChange={onOpenChange}
        configuration={filterConfiguration}
        values={filtersObject}
        onApply={handleFilterChangeFromDisplay}
        onChange={handleFilterChangeFromDisplay}
        title={tHr('hr-positions-filter-sheet-title')}
        description={tHr('hr-positions-filter-sheet-description')}
        noFiltersConfiguredLabel={tHr('hr-analytics-filter-no-filters-configured')}
        clearAllLabel={tHr('hr-analytics-filter-clear-all')}
        cancelLabel={tHr('hr-analytics-filter-cancel')}
        applyFiltersLabel={tHr('hr-analytics-filter-apply-filters')}
        customGroup={{
          groupId: 'company-group',
          valueKey: 'companyIds',
          render: ({ selectedIds, onSelectedIdsChange }) => (
            <CompanyFilterGroup
              companies={companies.map(c => ({ id: c.id, name: c.label }))}
              selectedIds={selectedIds}
              onSelectedIdsChange={onSelectedIdsChange}
              searchPlaceholder={tHr('hr-analytics-filter-company-search-placeholder')}
              previousLabel={tHr('hr-analytics-filter-previous')}
              nextLabel={tHr('hr-analytics-filter-next')}
              ofLabel={tHr('hr-analytics-filter-of')}
              emptyLabel={tHr('hr-analytics-filter-company-empty')}
            />
          )
        }}
      />
    ),
    [
      companies,
      deptOptions,
      filterConfiguration,
      filtersObject,
      handleFilterChangeFromDisplay,
      jobFunctionOptions,
      jobProfileOptions,
      tHr,
      tPositions
    ]
  )

  return {
    filtersObject,
    filterConfiguration,
    renderFilterSheet,
    handleFilterChangeFromDisplay
  }
}
