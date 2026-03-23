import React, { useMemo } from 'react'
import {
  PageLayout,
  DebouncedInput,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { UsersIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { MODULE_COLORS } from '@/common/constants/ui'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useActiveStructureCompanies } from '../../hooks/useActiveStructureCompanies'
import { useCompanyOrganizationalUnits } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import { useManagerPlanningStore } from './hooks/useManagerPlanningStore'
import { useTeamCompensationData } from './hooks/useTeamCompensationData'
import { TeamAllocationGrid } from './components/TeamAllocationGrid'
import translations from './_i18n'

export const ManagerCompensationPlanning: React.FC<BusinessAppContextProps> = context => {
  const { accessToken } = context
  const { t } = useTranslation(translations)

  const {
    searchQuery,
    selectedCompanyId,
    selectedOrgUnitId,
    setSearchQuery,
    setSelectedCompanyId,
    setSelectedOrgUnitId
  } = useManagerPlanningStore()

  const { companies, loading: companiesLoading } = useActiveStructureCompanies(accessToken)

  const { units: orgUnits } = useCompanyOrganizationalUnits(accessToken, selectedCompanyId ?? '', 100)

  const {
    teamMembers,
    loading: dataLoading,
    error
  } = useTeamCompensationData({
    accessToken,
    companyId: selectedCompanyId,
    orgUnitId: selectedOrgUnitId
  })

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return teamMembers
    const q = searchQuery.toLowerCase()
    return teamMembers.filter(
      m =>
        m.displayName.toLowerCase().includes(q) ||
        m.employeeCode.toLowerCase().includes(q) ||
        (m.jobPosition?.toLowerCase().includes(q) ?? false)
    )
  }, [teamMembers, searchQuery])

  const loading = companiesLoading || dataLoading

  return (
    <PageLayout
      headerIcon={UsersIcon}
      headerTitle={t('title')}
      headerDescription={t('subtitle', { orgUnit: '' })}
      variant={MODULE_COLORS.HR}
      className="gba:min-h-screen"
    >
      <div className="gba:space-y-4">
        <Alert>
          <AlertTitle>Read-only Mode</AlertTitle>
          <AlertDescription>
            Compensation proposals require backend tables that are not yet configured. You can view team compensation
            data but cannot create proposals at this time.
          </AlertDescription>
        </Alert>

        <div className="gba:flex gba:items-center gba:gap-3 gba:flex-wrap">
          <Select value={selectedCompanyId ?? undefined} onValueChange={val => setSelectedCompanyId(val || null)}>
            <SelectTrigger className="gba:w-[250px]">
              <SelectValue placeholder="Select company..." />
            </SelectTrigger>
            <SelectContent>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedCompanyId && (
            <Select value={selectedOrgUnitId ?? undefined} onValueChange={val => setSelectedOrgUnitId(val || null)}>
              <SelectTrigger className="gba:w-[250px]">
                <SelectValue placeholder="All org units" />
              </SelectTrigger>
              <SelectContent>
                {orgUnits.map(unit => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="gba:relative gba:flex-1 gba:min-w-[200px] gba:max-w-sm">
            <MagnifyingGlassIcon
              size={16}
              className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:text-muted-foreground"
            />
            <DebouncedInput
              value={searchQuery}
              onChange={val => setSearchQuery(String(val))}
              placeholder={t('search-placeholder')}
              className="gba:pl-9"
            />
          </div>
        </div>

        {loading && (
          <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
            <Spinner />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && selectedCompanyId && (
          <div className="gba:text-sm gba:text-muted-foreground">
            {filteredMembers.length} team member{filteredMembers.length !== 1 ? 's' : ''}
          </div>
        )}

        {!loading && !error && selectedCompanyId && <TeamAllocationGrid members={filteredMembers} />}

        {!loading && !selectedCompanyId && (
          <div className="gba:flex gba:items-center gba:justify-center gba:h-64 gba:text-muted-foreground">
            Select a company to view team compensation data.
          </div>
        )}
      </div>
    </PageLayout>
  )
}
