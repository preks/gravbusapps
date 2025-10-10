import React, { useEffect } from 'react'
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox
} from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useLeadFormContext } from '../../context/LeadFormContext'
import SearchableSelect from '../SearchableSelect'

const prefixDataTestId = 'LeadForm'

const StatusSourceSection: React.FC = () => {
  const {
    formValues,
    setFormValues,

    // Lead Sources
    leadSources,
    leadSourcesLoading,
    leadSourcesHasMore,
    leadSourcesNeedsMoreData,
    leadSourcesTotalFetched,
    searchLeadSources,
    loadMoreLeadSources,

    // Lead Statuses
    leadStatuses,
    leadStatusesLoading,
    leadStatusesHasMore,
    leadStatusesNeedsMoreData,
    leadStatusesTotalFetched,
    searchLeadStatuses,
    loadMoreLeadStatuses,

    // Lead Ratings
    leadRatings,
    leadRatingsLoading,
    leadRatingsHasMore,
    leadRatingsNeedsMoreData,
    leadRatingsTotalFetched,
    searchLeadRatings,
    loadMoreLeadRatings
  } = useLeadFormContext()

  // Simple effect to load more lead sources when needed
  useEffect(() => {
    if (leadSourcesNeedsMoreData && !leadSourcesLoading && leadSourcesHasMore) {
      loadMoreLeadSources()
    }
  }, [leadSourcesNeedsMoreData, leadSourcesLoading, leadSourcesHasMore, leadSourcesTotalFetched, loadMoreLeadSources])

  // Simple effect to load more lead statuses when needed
  useEffect(() => {
    if (leadStatusesNeedsMoreData && !leadStatusesLoading && leadStatusesHasMore) {
      loadMoreLeadStatuses()
    }
  }, [
    leadStatusesNeedsMoreData,
    leadStatusesLoading,
    leadStatusesHasMore,
    leadStatusesTotalFetched,
    loadMoreLeadStatuses
  ])

  // Simple effect to load more lead ratings when needed
  useEffect(() => {
    if (leadRatingsNeedsMoreData && !leadRatingsLoading && leadRatingsHasMore) {
      loadMoreLeadRatings()
    }
  }, [leadRatingsNeedsMoreData, leadRatingsLoading, leadRatingsHasMore, leadRatingsTotalFetched, loadMoreLeadRatings])

  return (
    <div className="gba:space-y-6">
      {/* Status and Source - Side by side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        {/* Status dropdown */}
        <SearchableSelect
          label="Status"
          name="leadStatus"
          value={formValues.leadStatus}
          placeholder={
            formValues.leadStatus && formValues.leadStatus.trim() ? 'Search and select status...' : 'Please Select...'
          }
          options={leadStatuses}
          loading={leadStatusesLoading}
          hasMore={leadStatusesHasMore}
          onSearch={searchLeadStatuses}
          onLoadMore={loadMoreLeadStatuses}
          onChange={value => setFormValues({ leadStatus: value })}
          error={null}
          data-testid={formatDataTestId(prefixDataTestId, 'lead-status-select')}
          className="gba:w-full"
        />

        {/* Source dropdown */}
        <SearchableSelect
          label="Source"
          name="leadSource"
          value={formValues.leadSource}
          placeholder={
            formValues.leadSource && formValues.leadSource.trim() ? 'Search and select source...' : 'Please Select...'
          }
          options={leadSources}
          loading={leadSourcesLoading}
          hasMore={leadSourcesHasMore}
          onSearch={searchLeadSources}
          onLoadMore={loadMoreLeadSources}
          onChange={value => setFormValues({ leadSource: value })}
          error={null}
          data-testid={formatDataTestId(prefixDataTestId, 'lead-source-select')}
          className="gba:w-full"
        />
      </div>

      {/* Rating and Sensitive - Same Row */}
      <div className="gba:flex gba:gap-6 gba:items-end gba:pr-16">
        {/* Rating Field */}
        <div className="gba:w-80">
          <SearchableSelect
            label="Rating"
            name="rating"
            value={formValues.rating}
            placeholder={
              formValues.rating && formValues.rating.trim() ? 'Search and select rating...' : 'Please Select...'
            }
            options={leadRatings}
            loading={leadRatingsLoading}
            hasMore={leadRatingsHasMore}
            onSearch={searchLeadRatings}
            onLoadMore={loadMoreLeadRatings}
            onChange={value => setFormValues({ rating: value })}
            error={null}
            data-testid={formatDataTestId(prefixDataTestId, 'rating-select')}
            className="gba:w-full"
          />
        </div>

        {/* Sensitive Checkbox - Same Row */}
        <div className="gba:pb-2">
          <div className="gba:flex gba:items-center gba:space-x-2">
            <Checkbox
              id="sensitive-checkbox"
              checked={!!formValues.sensitive}
              onCheckedChange={checked => setFormValues({ sensitive: !!checked })}
              data-testid={formatDataTestId(prefixDataTestId, 'SensitiveCheckbox')}
            />
            <Label
              htmlFor="sensitive-checkbox"
              className="gba:text-sm gba:font-medium gba:text-gray-900 gba:cursor-pointer"
            >
              Sensitive
            </Label>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StatusSourceSection
