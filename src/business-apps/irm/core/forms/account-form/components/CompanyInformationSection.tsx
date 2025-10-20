import React, { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Label,
  Card,
  CardContent,
  Button
} from '@newwork/nw-design-system'
import { PiCaretDown, PiCaretUp } from 'react-icons/pi'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useAccountFormContext } from '../context/AccountFormContext'

const prefixDataTestId = 'AccountForm'

const CompanyInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false) // Start collapsed
  const [isLegalFormOpen, setIsLegalFormOpen] = useState(false)
  const [isIndustryOpen, setIsIndustryOpen] = useState(false)

  const {
    formValues,
    setFormValues,

    // Legal Forms
    legalForms,
    legalFormsLoading,
    legalFormsError,
    legalFormsHasMore,
    legalFormsNeedsMoreData,
    legalFormsDisplayCount,
    legalFormsTotalFetched,
    loadMoreLegalForms,
    showMoreLegalForms,

    // Industries
    industries,
    industriesLoading,
    industriesError,
    industriesHasMore,
    industriesNeedsMoreData,
    industriesDisplayCount,
    industriesTotalFetched,
    loadMoreIndustries,
    showMoreIndustries
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
      className="gba:border-0 gba:shadow-none gba:bg-transparent gba:p-0"
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
      <Button
        type="button"
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:px-4 gba:py-2 gba:transition-colors gba:flex gba:items-center gba:justify-between gba:text-left gba:rounded-lg gba:text-sm"
        style={{
          background: 'linear-gradient(to right, #ddd6fe, #c4b5fd)',
          transition: 'all 0.3s ease',
          border: '0',
          borderWidth: '0',
          borderStyle: 'none',
          borderColor: 'transparent',
          outline: 'none',
          outlineWidth: '0',
          outlineStyle: 'none',
          boxShadow: 'none',
          borderRadius: '12px'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'linear-gradient(to right, #c4b5fd, #a78bfa)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'linear-gradient(to right, #ddd6fe, #c4b5fd)'
        }}
        data-testid={formatDataTestId(prefixDataTestId, 'company-info-toggle')}
      >
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
          <div className="gba:w-2 gba:h-2 gba:bg-purple-500 gba:rounded-full"></div>
          <span className="gba:font-medium gba:text-gray-900">Company Information</span>
        </div>
        <div className="gba:flex gba:items-center">
          {isExpanded ? (
            <PiCaretUp className="gba:w-4 gba:h-4 gba:text-gray-700" />
          ) : (
            <PiCaretDown className="gba:w-4 gba:h-4 gba:text-gray-700" />
          )}
        </div>
      </Button>

      {isExpanded && (
        <CardContent
          className="gba:space-y-6 gba:bg-white gba:border-0 gba:p-4 gba:mt-0"
          style={{
            border: '0',
            borderWidth: '0',
            borderStyle: 'none',
            borderColor: 'transparent',
            padding: '16px',
            marginTop: '0'
          }}
        >
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
                    <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium">
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
                    <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium">
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
        </CardContent>
      )}
    </Card>
  )
}

export default CompanyInformationSection
