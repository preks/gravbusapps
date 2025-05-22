"use client";

import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { Button, SearchInput, Checkbox, FilterPanel } from '@newwork/gravity-ui-catalog';
import { PiSlidersHorizontal } from 'react-icons/pi';
import { useGraphqlClient } from "@/hooks/useGraphqlClient";
import { formatDataTestId } from '@/modules/orgchart/utils';

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
export const JobPositionFilters: React.FC<JobPositionFiltersProps> = ({ filters, onFilterChange }) => {
  const { t } = useTranslation();
  const client = useGraphqlClient('newwork');
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
    <div className="mb-4">
      <div className="flex items-center space-x-2 mb-2">
        <SearchInput
          value={searchValue}
          onChange={handleSearchChange}
          onClear={handleClearSearch}
          placeholder={t('job_position.search_placeholder', 'Search job positions...')}
          data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'search-input')}
          className="flex-grow"
        />
        <Button
          variant="text"
          size="small"
          onClick={toggleFilters}
          className="flex items-center"
          data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'toggle-filters')}
        >
          <PiSlidersHorizontal className="mr-1" />
          {t('job_position.filters', 'Filters')}
        </Button>
      </div>

      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
            <div className="flex-grow">
              <FilterPanel
                title={t('job_position.organizational_units', 'Organizational Units')}
                options={orgUnitOptions}
                onChange={(ids: string[]) => handleOrgUnitChange(ids)}
                loading={loading}
                data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'org-units-filter')}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="vacant-only"
                checked={filters.showVacantOnly}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVacantOnlyChange(e.target.checked)}
                data-testid={formatDataTestId(DATA_TEST_ID_PREFIX, 'vacant-only')}
              />
              <label htmlFor="vacant-only" className="text-sm">
                {t('job_position.vacant_only', 'Show Vacant Positions Only')}
              </label>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              variant="text"
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
