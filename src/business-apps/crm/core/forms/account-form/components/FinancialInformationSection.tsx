import React, { useState, useEffect } from 'react'
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  Button
} from '@newwork/nw-design-system'
import { PiCaretDown, PiCaretUp } from 'react-icons/pi'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useAccountFormContext } from '../context/AccountFormContext'
import { toStringOrUndefined } from '../../lead-form/utils/validationUtils'

const prefixDataTestId = 'AccountForm'

const FinancialInformationSection: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false) // Start collapsed
  const [isEmployeeSizeOpen, setIsEmployeeSizeOpen] = useState(false)
  const [isRevenueSizeOpen, setIsRevenueSizeOpen] = useState(false)

  const {
    formValues,
    setFormValues,

    // Employee Sizes
    employeeSizes,
    employeeSizesLoading,
    employeeSizesHasMore,
    employeeSizesNeedsMoreData,
    employeeSizesDisplayCount,
    employeeSizesTotalFetched,
    loadMoreEmployeeSizes,
    showMoreEmployeeSizes,

    // Revenue Sizes
    revenueSizes,
    revenueSizesLoading,
    revenueSizesHasMore,
    revenueSizesNeedsMoreData,
    revenueSizesDisplayCount,
    revenueSizesTotalFetched,
    loadMoreRevenueSizes,
    showMoreRevenueSizes
  } = useAccountFormContext()

  // Employee Sizes auto-loading effects
  useEffect(() => {
    if (employeeSizesNeedsMoreData && !employeeSizesLoading && employeeSizesHasMore) {
      loadMoreEmployeeSizes()
    }
  }, [
    employeeSizesNeedsMoreData,
    employeeSizesLoading,
    employeeSizesHasMore,
    employeeSizesTotalFetched,
    loadMoreEmployeeSizes
  ])

  useEffect(() => {
    if (isEmployeeSizeOpen && employeeSizesDisplayCount < employeeSizesTotalFetched && employeeSizesTotalFetched > 5) {
      console.log(
        `🚀 Employee size dropdown opened - showing more from cache (${employeeSizesDisplayCount}/${employeeSizesTotalFetched})`
      )
      showMoreEmployeeSizes()
    }
  }, [isEmployeeSizeOpen, employeeSizesDisplayCount, employeeSizesTotalFetched, showMoreEmployeeSizes])

  // Revenue Sizes auto-loading effects
  useEffect(() => {
    if (revenueSizesNeedsMoreData && !revenueSizesLoading && revenueSizesHasMore) {
      console.log(
        `🚀 Auto-loading more revenue sizes from API (${revenueSizesTotalFetched} fetched so far, loading 100 more)`
      )
      loadMoreRevenueSizes()
    }
  }, [
    revenueSizesNeedsMoreData,
    revenueSizesLoading,
    revenueSizesHasMore,
    revenueSizesTotalFetched,
    loadMoreRevenueSizes
  ])

  useEffect(() => {
    if (isRevenueSizeOpen && revenueSizesDisplayCount < revenueSizesTotalFetched && revenueSizesTotalFetched > 5) {
      console.log(
        `🚀 Revenue size dropdown opened - showing more from cache (${revenueSizesDisplayCount}/${revenueSizesTotalFetched})`
      )
      showMoreRevenueSizes()
    }
  }, [isRevenueSizeOpen, revenueSizesDisplayCount, revenueSizesTotalFetched, showMoreRevenueSizes])

  const handleLoadMoreRevenueSizes = () => {
    if (revenueSizesNeedsMoreData && !revenueSizesLoading && revenueSizesHasMore) {
      console.log(`🚀 Manual load more - fetching next 100 revenue sizes from API`)
      loadMoreRevenueSizes()
    } else if (revenueSizesDisplayCount < revenueSizesTotalFetched) {
      console.log(
        `🚀 Manual load more - showing more revenue sizes from cache (${revenueSizesDisplayCount}/${revenueSizesTotalFetched})`
      )
      showMoreRevenueSizes()
    }
  }

  const handleLoadMoreEmployeeSizes = () => {
    if (employeeSizesNeedsMoreData && !employeeSizesLoading && employeeSizesHasMore) {
      console.log(`🚀 Manual load more - fetching next 100 employee sizes from API`)
      loadMoreEmployeeSizes()
    } else if (employeeSizesDisplayCount < employeeSizesTotalFetched) {
      console.log(
        `🚀 Manual load more - showing more employee sizes from cache (${employeeSizesDisplayCount}/${employeeSizesTotalFetched})`
      )
      showMoreEmployeeSizes()
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
        className="gba:w-full gba:px-4 gba:py-2 gba:transition-all gba:flex gba:items-center gba:justify-between gba:text-left gba:rounded-xl gba:text-sm gba:bg-destructive-secondary hover:gba:bg-destructive gba:border-0"
        style={{
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
        data-testid={formatDataTestId(prefixDataTestId, 'financial-info-toggle-button')}
      >
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
          <div className="gba:w-2 gba:h-2 gba:bg-red-500 gba:rounded-full"></div>
          <span className="gba:font-medium gba:text-gray-900">Financial Information</span>
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
          className="gba:space-y-6 gba:bg-hsl(var(--background)) gba:border-0 gba:p-4 gba:mt-0"
          style={{
            border: '0',
            borderWidth: '0',
            borderStyle: 'none',
            borderColor: 'transparent',
            padding: '16px',
            marginTop: '0'
          }}
        >
          {/* Annual Revenue - Single field */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Annual Revenue</Label>
            <Select
              value={toStringOrUndefined(formValues.annualRevenue) || ''}
              onValueChange={value => setFormValues({ annualRevenue: value || '' })}
              onOpenChange={setIsRevenueSizeOpen}
              data-testid={formatDataTestId(prefixDataTestId, 'AnnualRevenueSelect')}
            >
              <SelectTrigger className="gba:border-gray-300 gba:bg-hsl(var(--background))">
                <SelectValue placeholder="Please Select..." />
              </SelectTrigger>
              <SelectContent
                className="gba:max-h-[200px] gba:overflow-y-auto"
                style={{ maxHeight: '200px', overflowY: 'auto' }}
              >
                {revenueSizes.map((option, index) => (
                  <SelectItem key={`${option.id}-${index}`} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}

                {/* Load More button or loading message */}
                {revenueSizesLoading && (
                  <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium">
                    🔄 Loading more revenue sizes...
                  </div>
                )}

                {!revenueSizesLoading && revenueSizesHasMore && (
                  <div className="gba:px-2 gba:py-1">
                    <button
                      type="button"
                      onClick={handleLoadMoreRevenueSizes}
                      className="gba:w-full gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded gba:hover:bg-blue-100 gba:transition-colors"
                    >
                      📥 Load More Revenue Sizes ({revenueSizesDisplayCount}/{revenueSizesTotalFetched} shown)
                    </button>
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Number of Employees - Single field */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Number of Employees</Label>
            <Select
              value={formValues.numberOfEmployees}
              onValueChange={value => setFormValues({ numberOfEmployees: value })}
              onOpenChange={setIsEmployeeSizeOpen}
              data-testid={formatDataTestId(prefixDataTestId, 'NumberOfEmployeesSelect')}
            >
              <SelectTrigger className="gba:border-gray-300 gba:bg-hsl(var(--background))">
                <SelectValue placeholder="Please Select..." />
              </SelectTrigger>
              <SelectContent
                className="gba:max-h-[200px] gba:overflow-y-auto"
                style={{ maxHeight: '200px', overflowY: 'auto' }}
              >
                {employeeSizes.map((option, index) => {
                  // Format display value to remove leading zeros (e.g., "01-10" becomes "1-10")
                  const displayValue = (option.label || option.name || '').replace(/\b0+(\d)/g, '$1')
                  return (
                    <SelectItem key={`${option.id}-${index}`} value={option.value}>
                      {displayValue}
                    </SelectItem>
                  )
                })}

                {/* Load More button or loading message */}
                {employeeSizesLoading && (
                  <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:text-center gba:font-medium">
                    Loading more employee sizes...
                  </div>
                )}

                {!employeeSizesLoading && employeeSizesHasMore && (
                  <div className="gba:px-2 gba:py-1">
                    <button
                      type="button"
                      onClick={handleLoadMoreEmployeeSizes}
                      className="gba:w-full gba:px-3 gba:py-2 gba:text-sm gba:text-blue-600 gba:bg-blue-50 gba:border gba:border-blue-200 gba:rounded gba:hover:bg-blue-100 gba:transition-colors"
                    >
                      Load More Employee Sizes ({employeeSizesDisplayCount}/{employeeSizesTotalFetched} shown)
                    </button>
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Foundation Date - Single field */}
          <div className="gba:space-y-2">
            <Label className="gba:text-sm gba:font-medium gba:text-gray-900">Foundation Date</Label>
            <Input
              name="foundationDate"
              type="date"
              value={formValues.foundationDate || ''}
              onChange={e => setFormValues({ foundationDate: e.target.value })}
              className="gba:border-gray-300 gba:bg-hsl(var(--background)) gba:focus:border-blue-500 gba:focus:ring-2 gba:focus:ring-blue-200 gba:transition-all gba:duration-200"
              data-testid={formatDataTestId(prefixDataTestId, 'FoundationDateInput')}
            />
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default FinancialInformationSection
