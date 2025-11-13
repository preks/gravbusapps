import React, { useMemo, useState } from 'react'
import { Alert, AlertTitle, AlertDescription, Button, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useInvestmentPortalIntegration } from './hooks/useInvestmentPortalIntegration'
import { InvestmentExpandableCard } from './components/InvestmentExpandableCard'
import { InvestmentSearch } from './components/InvestmentSearch'
import { InvestmentPortalBanner } from './components/InvestmentPortalBanner'

interface InvestmentPortalProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const InvestmentPortal: React.FC<InvestmentPortalProps> = ({
  accessToken,
  userInfo,
  additionalData,
  prefixDataTestId = 'InvestmentPortal'
}) => {
  const [searchQuery, setSearchQuery] = useState('')

  const { isLoading, error, refetch, getUserAssociatedInvestments } = useInvestmentPortalIntegration({
    accessToken,
    userInfo,
    additionalData
  })

  // Get user-relevant investments
  const userInvestments = useMemo(() => {
    return getUserAssociatedInvestments()
  }, [getUserAssociatedInvestments])

  // Filter investments based on search query
  const filteredInvestments = useMemo(() => {
    if (!searchQuery.trim()) return userInvestments

    const query = searchQuery.toLowerCase()
    return userInvestments.filter(inv => {
      const matchesName = inv.name?.toLowerCase().includes(query)
      const matchesCode = inv.code?.toLowerCase().includes(query)
      const matchesAccount = inv.investmentAccount?.name?.toLowerCase().includes(query)
      const matchesType = inv.investmentType?.value?.toLowerCase().includes(query)

      return matchesName || matchesCode || matchesAccount || matchesType
    })
  }, [userInvestments, searchQuery])

  // Authentication Check
  if (!accessToken) {
    return (
      <div className="gba:p-6 gba:text-center">
        <Alert variant="destructive">
          <AlertTitle>{getTranslationFromI18nKeyAndLabel('error.authTitle', 'Authentication Error')}</AlertTitle>
          <AlertDescription>
            {getTranslationFromI18nKeyAndLabel(
              'error.noAccessToken',
              'No access token found. Please ensure you are properly authenticated.'
            )}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="gba:min-h-screen gba:bg-background">
        {/* Header */}
        <InvestmentPortalBanner userInfo={userInfo} investmentCount={0} />

        {/* Content */}
        <div className="gba:w-full gba:max-w-[1440px] gba:mx-auto gba:px-8 gba:py-8">
          <div className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]">
            <Spinner size="lg" />
          </div>
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="gba:min-h-screen gba:bg-background">
        {/* Header */}
        <InvestmentPortalBanner userInfo={userInfo} investmentCount={0} />

        {/* Content */}
        <div className="gba:w-full gba:max-w-[1440px] gba:mx-auto gba:px-8 gba:py-8">
          <Alert variant="destructive">
            <AlertTitle>{getTranslationFromI18nKeyAndLabel('error.loadingTitle', 'Error Loading Data')}</AlertTitle>
            <AlertDescription>
              {error}
              <Button variant="outline" size="sm" onClick={refetch} className="gba:ml-4">
                {getTranslationFromI18nKeyAndLabel('button.retry', 'Retry')}
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  // No Investments State
  if (userInvestments.length === 0) {
    return (
      <div className="gba:min-h-screen gba:bg-background">
        {/* Header */}
        <InvestmentPortalBanner userInfo={userInfo} investmentCount={0} />

        {/* Content */}
        <div className="gba:w-full gba:max-w-[1440px] gba:mx-auto gba:px-8 gba:py-8">
          <div className="gba:text-center gba:py-16">
            <Alert>
              <AlertTitle>
                {getTranslationFromI18nKeyAndLabel('portal.noInvestments.title', 'No Investments Found')}
              </AlertTitle>
              <AlertDescription>
                {getTranslationFromI18nKeyAndLabel(
                  'portal.noInvestments.description',
                  'No investments are associated with your account. Please contact your investment manager for access.'
                )}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  const hasMultipleInvestments = userInvestments.length > 1

  return (
    <div className="gba:min-h-screen gba:bg-background" data-testid={formatDataTestId(prefixDataTestId, 'Container')}>
      {/* Header */}
      <InvestmentPortalBanner userInfo={userInfo} investmentCount={userInvestments.length} />

      {/* Content */}
      <div className="gba:w-full gba:max-w-[1440px] gba:mx-auto gba:px-8 gba:py-8 gba:space-y-6">
        {/* Search Bar - Only show if multiple investments */}
        {hasMultipleInvestments && (
          <>
            <InvestmentSearch value={searchQuery} onChange={setSearchQuery} />

            {/* Results Count */}
            {searchQuery && (
              <div className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'investment.search.results',
                  `Showing ${filteredInvestments.length} of ${userInvestments.length} investments`
                )}
              </div>
            )}
          </>
        )}

        {/* Investment Cards */}
        <div className="gba:space-y-4">
          {filteredInvestments.map(investment => (
            <InvestmentExpandableCard
              key={investment.id}
              investment={investment}
              accessToken={accessToken}
              userInfo={userInfo}
              additionalData={additionalData}
              prefixDataTestId={`${prefixDataTestId}-card`}
              defaultExpanded={!hasMultipleInvestments}
              showExpandButton={hasMultipleInvestments}
            />
          ))}
        </div>

        {/* Empty Search Results */}
        {filteredInvestments.length === 0 && searchQuery && (
          <div className="gba:text-center gba:py-12">
            <p className="gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'investment.search.empty',
                `No investments match "${searchQuery}". Try a different search term.`
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default InvestmentPortal
