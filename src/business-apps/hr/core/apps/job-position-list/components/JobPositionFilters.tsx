"use client";

import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { Button, Input, Checkbox/* , FilterPanel */ } from '@newwork/gravity-ui-catalog';
import { PiSlidersHorizontal } from 'react-icons/pi';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { formatDataTestId } from '@/modules/orgchart/utils';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface JobPositionFiltersProps {
  filters: {
    search: string;
    organizationalUnits: string[];
    showVacantOnly: boolean;
  };
  onFilterChange: (filters: Partial<JobPositionFiltersProps['filters']>) => void;
}

const DATA_TEST_ID_PREFIX = 'JobPositionFilters';

// GraphQL query to fetch organizational units for filter
const ORG_UNITS_QUERY = `
  query OrganizationalUnits {
    OrganizationalUnit(where: {isDeleted: {_eq: false}}, orderBy: {name: ASC}) {
      id
      name
    }
  }
`;

/**
 * Filters component for the job position list
 */
export const JobPositionFilters: React.FC<JobPositionFiltersProps & BusinessAppContextProps> = ({ filters, onFilterChange, accessToken }) => {
  const { t } = useTranslation();
  const client = useGraphqlClient(accessToken);
  const [searchValue, setSearchValue] = useState(filters.search);
  const [showFilters, setShowFilters] = useState(false);
  const [orgUnits, setOrgUnits] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch organizational unit options for filtering
  useEffect(() => {
    if (!client) return;
    
    setLoading(true);
    client.request(ORG_UNITS_QUERY)
      .then((res: any) => {
        setOrgUnits(res?.OrganizationalUnit ?? []);
      })
      .catch(error => {
        console.error("Error fetching organizational units:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [client]);

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onFilterChange({ search: value });
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchValue("");
    onFilterChange({ search: "" });
  };

  // Toggle filters visibility
  const toggleFilters = () => {
    setShowFilters(prev => !prev);
  };

  // Handle vacant only filter change
  const handleVacantOnlyChange = (checked: boolean) => {
    onFilterChange({ showVacantOnly: checked });
  };

  // Handle organizational unit filter change
  const handleOrgUnitChange = (selectedIds: string[]) => {
    onFilterChange({ organizationalUnits: selectedIds });
  };

  // Handle clear all filters
  const handleClearFilters = () => {
    setSearchValue("");
    onFilterChange({
      search: "",
      organizationalUnits: [],
      showVacantOnly: false
    });
  };

  // Create filter options for organizational units
  const orgUnitOptions = orgUnits.map(unit => ({
    id: unit.id,
    label: unit.name,
    selected: filters.organizationalUnits.includes(unit.id)
  }));

  return (
    <div className="gba:mb-4">
      <div className="gba:flex gba:items-center gba:space-x-2 gba:mb-2">
        <Input
          value={searchValue}
          onChange={(field: any) => handleSearchChange(field.value)}
          onClear={handleClearSearch}
          placeholder={t('job_position.search_placeholder', 'Search job positions...')}
          data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'search-input')}
          className="gba:grow"
          name="search"
          type="search"
        />
        <Button
          variant="primary"
          size="small"
          onClick={toggleFilters}
          className="gba:flex gba:items-center"
          data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'toggle-filters')}
        >
          <PiSlidersHorizontal className="gba:mr-1" />
          {t('job_position.filters', 'Filters')}
        </Button>
      </div>

      {showFilters && (
        <div className="gba:bg-gray-50 gba:p-4 gba:rounded-md">
          <div className="gba:flex gba:flex-col gba:space-y-4 gba:md:flex-row gba:md:space-y-0 gba:md:space-x-4">
            <div className="gba:grow">
              {/* <FilterPanel
                title={t('job_position.organizational_units', 'Organizational Units')}
                options={orgUnitOptions}
                onChange={(ids: string[]) => handleOrgUnitChange(ids)}
                loading={loading}
                data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'org-units-filter')}
              /> */}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <Checkbox
                id="vacant-only"
                value={filters.showVacantOnly}
                onChange={(field: any) => handleVacantOnlyChange(field.value as boolean)}
                data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'vacant-only')}
                name="vacant-only"
              />
              <label htmlFor="vacant-only" className="gba:text-sm">
                {t('job_position.vacant_only', 'Show Vacant Positions Only')}
              </label>
            </div>
          </div>
          <div className="gba:flex gba:justify-end gba:mt-4">
            <Button
              variant="primary"
              size="small"
              onClick={handleClearFilters}
              data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'clear-filters')}
            >
              {t('job_position.clear_filters', 'Clear All Filters')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
