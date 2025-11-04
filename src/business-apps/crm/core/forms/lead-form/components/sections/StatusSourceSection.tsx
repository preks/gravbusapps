import React, { useState, useEffect } from 'react'
import {
  Label,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useLeadFormContext } from '../../context/LeadFormContext'
import SearchableSelect from '../SearchableSelect'

const prefixDataTestId = 'LeadForm'

const StatusSourceSection: React.FC = () => {
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [isSourceOpen, setIsSourceOpen] = useState(false)
  const [isRatingOpen, setIsRatingOpen] = useState(false)

  const {
    formValues,
    setFormValues,

    // Lead Sources
    leadSources,
    leadSourcesLoading,
    leadSourcesHasMore,
    leadSourcesNeedsMoreData,
    leadSourcesDisplayCount,
    leadSourcesTotalFetched,
    loadMoreLeadSources,
    showMoreLeadSources,

    // Lead Statuses
    leadStatuses,
    leadStatusesLoading,
    leadStatusesHasMore,
    leadStatusesNeedsMoreData,
    leadStatusesDisplayCount,
    leadStatusesTotalFetched,
    loadMoreLeadStatuses,
    showMoreLeadStatuses,

    // Lead Ratings
    leadRatings,
    leadRatingsLoading,
    leadRatingsHasMore,
    leadRatingsNeedsMoreData,
    leadRatingsDisplayCount,
    leadRatingsTotalFetched,
    loadMoreLeadRatings,
    showMoreLeadRatings,

    // Sales Campaigns
    salesCampaigns,
    salesCampaignsLoading,
    salesCampaignsError,
    salesCampaignsHasMore,
    searchSalesCampaigns,
    loadMoreSalesCampaigns
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

  // When dropdowns open, show more if we have them cached
  useEffect(() => {
    if (isStatusOpen && leadStatusesDisplayCount < leadStatusesTotalFetched && leadStatusesTotalFetched > 5) {
      showMoreLeadStatuses()
    }
  }, [isStatusOpen, leadStatusesDisplayCount, leadStatusesTotalFetched, showMoreLeadStatuses])

  useEffect(() => {
    if (isSourceOpen && leadSourcesDisplayCount < leadSourcesTotalFetched && leadSourcesTotalFetched > 5) {
      showMoreLeadSources()
    }
  }, [isSourceOpen, leadSourcesDisplayCount, leadSourcesTotalFetched, showMoreLeadSources])

  useEffect(() => {
    if (isRatingOpen && leadRatingsDisplayCount < leadRatingsTotalFetched && leadRatingsTotalFetched > 5) {
      showMoreLeadRatings()
    }
  }, [isRatingOpen, leadRatingsDisplayCount, leadRatingsTotalFetched, showMoreLeadRatings])

  return (
    <div className="gba:space-y-6">
      {/* Status and Source - Side by side */}
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
        {/* Status dropdown */}
        <div className="gba:space-y-2">
          <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Status</Label>
          <Select
            value={formValues.leadStatus}
            onValueChange={value => setFormValues({ leadStatus: value })}
            onOpenChange={setIsStatusOpen}
            data-testid={formatDataTestId(prefixDataTestId, 'LeadStatusSelect')}
          >
            <SelectTrigger className="gba:border-gray-300 gba:bg-white">
              <SelectValue placeholder="Please Select..." />
            </SelectTrigger>
            <SelectContent
              className="gba:max-h-[200px] gba:overflow-y-auto"
              style={{ maxHeight: '200px', overflowY: 'auto' }}
            >
              {leadStatuses.map((option, index) => (
                <SelectItem key={`${option.id}-${index}`} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
              {leadStatusesLoading && (
                <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium">
                  🔄 Loading more statuses...
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Source dropdown */}
        <div className="gba:space-y-2">
          <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Source</Label>
          <Select
            value={formValues.leadSource}
            onValueChange={value => setFormValues({ leadSource: value })}
            onOpenChange={setIsSourceOpen}
            data-testid={formatDataTestId(prefixDataTestId, 'LeadSourceSelect')}
          >
            <SelectTrigger className="gba:border-gray-300 gba:bg-white">
              <SelectValue placeholder="Please Select..." />
            </SelectTrigger>
            <SelectContent
              className="gba:max-h-[200px] gba:overflow-y-auto"
              style={{ maxHeight: '200px', overflowY: 'auto' }}
            >
              {leadSources.map((option, index) => (
                <SelectItem key={`${option.id}-${index}`} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
              {leadSourcesLoading && (
                <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium">
                  🔄 Loading more sources...
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Rating and Sensitive - Same Row */}
      <div className="gba:flex gba:gap-6 gba:items-end gba:pr-16">
        {/* Rating Field */}
        <div className="gba:w-80">
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Rating</Label>
            <Select
              value={formValues.rating}
              onValueChange={value => setFormValues({ rating: value })}
              onOpenChange={setIsRatingOpen}
              data-testid={formatDataTestId(prefixDataTestId, 'RatingSelect')}
            >
              <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                <SelectValue placeholder="Please Select..." />
              </SelectTrigger>
              <SelectContent
                className="gba:max-h-[200px] gba:overflow-y-auto"
                style={{ maxHeight: '200px', overflowY: 'auto' }}
              >
                {leadRatings.map((option, index) => (
                  <SelectItem key={`${option.id}-${index}`} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
                {leadRatingsLoading && (
                  <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium">
                    🔄 Loading more ratings...
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
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

      {/* Sales Campaign Section */}
      <div className="gba:space-y-2">
        <SearchableSelect
          label="Sales Campaign"
          name="salesCampaignId"
          value={formValues.salesCampaignId}
          placeholder="Please Select Campaign..."
          options={salesCampaigns as any}
          loading={salesCampaignsLoading}
          hasMore={salesCampaignsHasMore}
          onSearch={searchSalesCampaigns}
          onLoadMore={loadMoreSalesCampaigns}
          onChange={value => {
            setFormValues({
              salesCampaignId: value
            })
          }}
          error={salesCampaignsError}
          className="gba:w-full gba:min-w-[300px]"
          data-testid={formatDataTestId(prefixDataTestId, 'CampaignSelect')}
        />
      </div>
    </div>
  )
}

export default StatusSourceSection
