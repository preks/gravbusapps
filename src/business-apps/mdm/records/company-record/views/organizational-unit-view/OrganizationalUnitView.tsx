/**
 * Organizational Unit View Component for Company Record
 * Displays company organizational units with DataDisplay, search, and infinite scroll card view
 */
import React, { useState, useCallback } from 'react'
import { DataDisplay, Spinner, useTranslation } from '@newwork/nw-design-system'
import { DataCards } from '@/components/dataCards'
import {
  useCompanyOrganizationalUnits,
  type CompanyOrganizationalUnit
} from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from '../../_i18n'
import { CompanyOrganizationalUnitCard } from './components/CompanyOrganizationalUnitCard'

export interface OrganizationalUnitViewProps extends BusinessAppContextProps {
  companyId: string
}

const DATA_TEST_ID_PREFIX = 'company-organizational-unit-view'

export const OrganizationalUnitView: React.FC<OrganizationalUnitViewProps> = ({ companyId, accessToken }) => {
  const { t } = useTranslation(translations)

  const [search, setSearch] = useState('')
  const [selectedUnit, setSelectedUnit] = useState<CompanyOrganizationalUnit | null>(null)

  // Fetch organizational units with infinite scroll
  const { units, loading, error, hasMore, loadMore, retry } = useCompanyOrganizationalUnits(
    accessToken,
    companyId,
    20,
    search,
    [{ field: 'name', direction: 'ASC' }]
  )

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
  }, [])

  const handleUnitSelect = useCallback((unit: CompanyOrganizationalUnit) => {
    setSelectedUnit(prev => (prev?.id === unit.id ? null : unit))
  }, [])

  if (loading && units.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-[400px]">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div data-testid={DATA_TEST_ID_PREFIX} className="gba:space-y-4">
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: t('organizational-units'),
            metadata: {
              count: units.length,
              isLoading: loading
            }
          }
        ]}
        currentSection="all"
        searchValue={search}
        searchPlaceholder={t('search-organizational-units')}
        onSearchChange={handleSearch}
        toolbarDensity="default"
      >
        <DataCards<CompanyOrganizationalUnit>
          items={units}
          getKey={unit => unit.id}
          renderItem={(unit: CompanyOrganizationalUnit) => (
            <div
              className="gba:cursor-pointer"
              onClick={() => handleUnitSelect(unit)}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleUnitSelect(unit)
                }
              }}
              aria-pressed={selectedUnit?.id === unit.id}
              data-testid={`company-organizational-unit-card-wrapper-${unit.id}`}
            >
              <CompanyOrganizationalUnitCard unit={unit} isSelected={selectedUnit?.id === unit.id} />
            </div>
          )}
          hasMore={hasMore}
          loading={loading}
          error={error || null}
          onLoadMore={loadMore}
          onRetry={retry}
          emptyMessage={t('no-organizational-units-found')}
        />
      </DataDisplay>
    </div>
  )
}

export default OrganizationalUnitView
