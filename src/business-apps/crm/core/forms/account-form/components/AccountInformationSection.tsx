import React, { useState, useEffect } from 'react'
import {
  Input,
  Label,
  Card,
  CardContent,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useAccountFormContext } from '../context/AccountFormContext'
import OwnerSelector from './OwnerSelector'
import SearchableSelect from '../../opportunity-form/components/SearchableSelect'

const prefixDataTestId = 'AccountForm'

const AccountInformationSection: React.FC = () => {
  const [isLegalFormOpen, setIsLegalFormOpen] = useState(false)
  const [isIndustryOpen, setIsIndustryOpen] = useState(false)

  const {
    formValues,
    setFormValues,
    error,
    employeePositions,
    employeePositionsLoading,
    employeePositionsError,
    employeePositionsHasMore,
    searchEmployeePositions,
    loadMoreEmployeePositions,

    // Legal Forms
    legalForms,
    legalFormsLoading,
    legalFormsHasMore,
    legalFormsNeedsMoreData,
    legalFormsDisplayCount,
    legalFormsTotalFetched,
    loadMoreLegalForms,
    showMoreLegalForms,

    // Industries
    industries,
    industriesLoading,
    industriesHasMore,
    industriesNeedsMoreData,
    industriesDisplayCount,
    industriesTotalFetched,
    loadMoreIndustries,
    showMoreIndustries,

    // Sales Campaigns (CRM-specific)
    salesCampaigns,
    salesCampaignsLoading,
    salesCampaignsError,
    salesCampaignsHasMore,
    searchSalesCampaigns,
    loadMoreSalesCampaigns
  } = useAccountFormContext()

  // Simple effect to load more legal forms when needed
  useEffect(() => {
    if (legalFormsNeedsMoreData && !legalFormsLoading && legalFormsHasMore) {
      loadMoreLegalForms()
    }
  }, [legalFormsNeedsMoreData, legalFormsLoading, legalFormsHasMore, legalFormsTotalFetched, loadMoreLegalForms])

  // Simple effect to load more industries when needed
  useEffect(() => {
    if (industriesNeedsMoreData && !industriesLoading && industriesHasMore) {
      loadMoreIndustries()
    }
  }, [industriesNeedsMoreData, industriesLoading, industriesHasMore, industriesTotalFetched, loadMoreIndustries])

  // When Legal Form dropdown opens, show more if we have them cached
  useEffect(() => {
    if (isLegalFormOpen && legalFormsDisplayCount < legalFormsTotalFetched && legalFormsTotalFetched > 5) {
      showMoreLegalForms()
    }
  }, [isLegalFormOpen, legalFormsDisplayCount, legalFormsTotalFetched, showMoreLegalForms])

  // When Industry dropdown opens, show more if we have them cached
  useEffect(() => {
    if (isIndustryOpen && industriesDisplayCount < industriesTotalFetched && industriesTotalFetched > 5) {
      showMoreIndustries()
    }
  }, [isIndustryOpen, industriesDisplayCount, industriesTotalFetched, showMoreIndustries])

  const handleLoadMoreLegalForms = () => {
    if (legalFormsNeedsMoreData && !legalFormsLoading && legalFormsHasMore) {
      loadMoreLegalForms()
    } else if (legalFormsDisplayCount < legalFormsTotalFetched) {
      showMoreLegalForms()
    }
  }

  const handleLoadMoreIndustries = () => {
    if (industriesNeedsMoreData && !industriesLoading && industriesHasMore) {
      loadMoreIndustries()
    } else if (industriesDisplayCount < industriesTotalFetched) {
      showMoreIndustries()
    }
  }

  return (
    <Card
      className="gba:border-0 gba:shadow-none gba:bg-transparent"
      style={{
        border: '0',
        borderWidth: '0',
        borderStyle: 'none',
        borderColor: 'transparent',
        boxShadow: 'none',
        padding: '0',
        background: 'transparent'
      }}
    >
      <CardContent
        className="gba:space-y-6 gba:p-0"
        style={{
          border: '0',
          borderWidth: '0',
          borderStyle: 'none',
          borderColor: 'transparent',
          padding: '0'
        }}
      >
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Owner */}
        <div>
          <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
            Owner <span className="gba:text-red-500">*</span>
          </Label>
          <OwnerSelector
            value={formValues.owner}
            onChange={(value: string) => setFormValues({ owner: value })}
            employees={employeePositions}
            loading={employeePositionsLoading}
            hasMore={employeePositionsHasMore}
            onLoadMore={loadMoreEmployeePositions}
            onSearch={(searchTerm: string) => {
              searchEmployeePositions(searchTerm)
            }}
            error={employeePositionsError}
            dataTestId={formatDataTestId(prefixDataTestId, 'owner-select')}
          />
        </div>

        {/* Account Name */}
        <div>
          <Label className="gba:block gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">
            Account Name <span className="gba:text-red-500">*</span>
          </Label>
          <Input
            name="accountName"
            value={formValues.accountName}
            onChange={e => setFormValues({ accountName: e.target.value })}
            placeholder="Please Enter..."
            className="gba:border-gray-300 gba:bg-white"
            data-testid={formatDataTestId(prefixDataTestId, 'account-name-input')}
          />
        </div>

        {/* Legal Form and Industry - Side by side */}
        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Legal Form</Label>
            <Select
              value={formValues.legalForm}
              onValueChange={value => setFormValues({ legalForm: value })}
              onOpenChange={setIsLegalFormOpen}
              data-testid={formatDataTestId(prefixDataTestId, 'legal-form-select')}
            >
              <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                <SelectValue placeholder="Please Select..." />
              </SelectTrigger>
              <SelectContent
                className="gba:max-h-[200px] gba:overflow-y-auto"
                style={{ maxHeight: '200px', overflowY: 'auto' }}
              >
                {legalForms.map((option, index) => (
                  <SelectItem key={`${option.id}-${index}`} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}

                {/* Load More button or loading message */}
                {legalFormsLoading && (
                  <div
                    className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium"
                    data-testid={formatDataTestId(prefixDataTestId, 'legal-forms-loading-status')}
                  >
                    🔄 Loading more legal forms...
                  </div>
                )}

                {!legalFormsLoading && legalFormsHasMore && (
                  <div className="gba:px-2 gba:py-1">
                    <button
                      type="button"
                      onClick={handleLoadMoreLegalForms}
                      className="gba:w-full gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded gba:hover:bg-blue-100 gba:transition-colors"
                      data-testid={formatDataTestId(prefixDataTestId, 'load-more-legal-forms-button')}
                    >
                      📥 Load More Legal Forms ({legalFormsDisplayCount}/{legalFormsTotalFetched} shown)
                    </button>
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Industry</Label>
            <Select
              value={formValues.industry}
              onValueChange={value => setFormValues({ industry: value })}
              onOpenChange={setIsIndustryOpen}
              data-testid={formatDataTestId(prefixDataTestId, 'industry-select')}
            >
              <SelectTrigger className="gba:border-gray-300 gba:bg-white">
                <SelectValue placeholder="Please Select..." />
              </SelectTrigger>
              <SelectContent
                className="gba:max-h-[200px] gba:overflow-y-auto"
                style={{ maxHeight: '200px', overflowY: 'auto' }}
              >
                {industries.map((option, index) => (
                  <SelectItem key={`${option.id}-${index}`} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}

                {/* Load More button or loading message */}
                {industriesLoading && (
                  <div
                    className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium"
                    data-testid={formatDataTestId(prefixDataTestId, 'industries-loading-status')}
                  >
                    🔄 Loading more industries...
                  </div>
                )}

                {!industriesLoading && industriesHasMore && (
                  <div className="gba:px-2 gba:py-1">
                    <button
                      type="button"
                      onClick={handleLoadMoreIndustries}
                      className="gba:w-full gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded gba:hover:bg-blue-100 gba:transition-colors"
                      data-testid={formatDataTestId(prefixDataTestId, 'load-more-industries-button')}
                    >
                      📥 Load More Industries ({industriesDisplayCount}/{industriesTotalFetched} shown)
                    </button>
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Website */}
        <div className="gba:space-y-2">
          <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Website</Label>
          <Input
            name="website"
            value={formValues.website}
            onChange={e => setFormValues({ website: e.target.value })}
            placeholder="Please Enter..."
            className="gba:border-gray-300 gba:bg-white"
            data-testid={formatDataTestId(prefixDataTestId, 'website-input')}
          />
        </div>

        {/* Phone and Email - Side by side */}
        <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:md:grid-cols-2">
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Phone</Label>
            <Input
              name="phone"
              value={formValues.phone}
              onChange={e => setFormValues({ phone: e.target.value })}
              placeholder="Please Enter..."
              className="gba:border-gray-300 gba:bg-white"
              data-testid={formatDataTestId(prefixDataTestId, 'phone-input')}
            />
          </div>

          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Email</Label>
            <Input
              name="email"
              value={formValues.email}
              onChange={e => setFormValues({ email: e.target.value })}
              placeholder="Please Enter..."
              className="gba:border-gray-300 gba:bg-white"
              data-testid={formatDataTestId(prefixDataTestId, 'email-input')}
            />
          </div>
        </div>

        {/* ✅ Sales Campaign Section (CRM-specific) */}
        <div>
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
                salesCampaignId: value // Store only ID for backend
              })
            }}
            error={salesCampaignsError}
            className="gba:w-full gba:min-w-[300px]"
            data-testid={formatDataTestId(prefixDataTestId, 'campaign-select')}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default AccountInformationSection
