import React from 'react';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { useLeadFormContext } from '../context/LeadFormContext';
import OwnerSelector from './OwnerSelector';
import SearchableSelect from './SearchableSelect';

const prefixDataTestId = 'LeadForm';

const LeadInformationSection: React.FC = () => {
  const {
    formValues,
    setFormValues,
    isLoading,
    error,
    
    // Lead Sources
    leadSources,
    leadSourcesLoading,
    leadSourcesError,
    leadSourcesHasMore,
    searchLeadSources,
    loadMoreLeadSources,
    
    // Lead Statuses
    leadStatuses,
    leadStatusesLoading,
    leadStatusesError,
    leadStatusesHasMore,
    searchLeadStatuses,
    loadMoreLeadStatuses,
    
    // Lead Ratings
    leadRatings,
    leadRatingsLoading,
    leadRatingsError,
    leadRatingsHasMore,
    searchLeadRatings,
    loadMoreLeadRatings,
    
    // Employee positions
    employeePositions,
    employeePositionsLoading,
    employeePositionsError,
    employeePositionsHasMore,
    loadMoreEmployeePositions,
    searchEmployeePositions,
  } = useLeadFormContext();

  return (
    <div className="gba:bg-white gba:rounded-xl gba:shadow-sm gba:border gba:border-gray-100 gba:overflow-hidden">
      <div className="gba:p-6 gba:space-y-6">
        {error && (
          <div className="gba:text-red-700 gba:text-sm gba:p-3 gba:bg-red-50 gba:border gba:border-red-200 gba:rounded-lg">
            {error}
          </div>
        )}

        {/* Owner */}
        <div>
          <label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
            Owner <span className="gba:text-red-500">*</span>
          </label>
          <OwnerSelector
            value={formValues.owner}
            onChange={(value: string) => setFormValues({ owner: value })}
            employees={employeePositions}
            loading={employeePositionsLoading}
            hasMore={employeePositionsHasMore}
            onLoadMore={loadMoreEmployeePositions}
            onSearch={(searchTerm: string) => {
              searchEmployeePositions(searchTerm);
            }}
            error={employeePositionsError}
            dataTestId={formatDataTestId(prefixDataTestId, 'OwnerSelect')}
          />
        </div>

        {/* Status and Source - Side by side */}
        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
          <SearchableSelect
            label="Status"
            name="leadStatus"
            value={formValues.leadStatus}
            onChange={value => setFormValues({ leadStatus: value })}
            options={leadStatuses}
            placeholder="Please Select..."
            loading={leadStatusesLoading}
            hasMore={leadStatusesHasMore}
            onLoadMore={loadMoreLeadStatuses}
            onSearch={searchLeadStatuses}
            error={leadStatusesError}
            data-testid={formatDataTestId(prefixDataTestId, 'LeadStatusSelect')}
          />

          <SearchableSelect
            label="Source"
            name="leadSource"
            value={formValues.leadSource}
            onChange={value => setFormValues({ leadSource: value })}
            options={leadSources}
            placeholder="Please Select..."
            loading={leadSourcesLoading}
            hasMore={leadSourcesHasMore}
            onLoadMore={loadMoreLeadSources}
            onSearch={searchLeadSources}
            error={leadSourcesError}
            data-testid={formatDataTestId(prefixDataTestId, 'LeadSourceSelect')}
          />
        </div>

        {/* Rating */}
        <SearchableSelect
          label="Rating"
          name="rating"
          value={formValues.rating}
          onChange={value => setFormValues({ rating: value })}
          options={leadRatings}
          placeholder="Please Select..."
          loading={leadRatingsLoading}
          hasMore={leadRatingsHasMore}
          onLoadMore={loadMoreLeadRatings}
          onSearch={searchLeadRatings}
          error={leadRatingsError}
          data-testid={formatDataTestId(prefixDataTestId, 'RatingSelect')}
        />
      </div>
    </div>
  );
};

export default LeadInformationSection; 