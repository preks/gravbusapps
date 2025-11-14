import React, { useState, useEffect, useMemo } from 'react'
import {
  Spinner,
  Alert,
  Badge,
  IconAvatar,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import DynamicInvestmentFields from './DynamicInvestmentFields'
import { TrendUpIcon } from '@phosphor-icons/react'
import type { Investment } from '@/common/data/investment/types'
import { PiCaretLeft, PiCaretRight } from 'react-icons/pi'

interface InvestmentSectionProps extends Partial<BusinessAppContextProps> {
  investmentId?: string
  investment?: Investment // Investment-Objekt (analog zu AccountSection)
  investments?: Investment[] // Array von Investment-Objekten (für Carousel)
  className?: string
  'data-testid'?: string
  // Optional configurable action props
  actionButtonProps?: {
    contextsArray?: FlowContextName[]
    externalContextData?: Record<string, any>
    prefixDataTestId?: string
  }
  recordUrl?: string
  isLoading?: boolean
  error?: string | null
}

const InvestmentSection: React.FC<InvestmentSectionProps> = ({
  investment,
  investments,
  className = '',
  isLoading = false,
  error = null,
  ...props
}) => {
  const investmentList = useMemo(() => {
    const arr = Array.isArray(investments) ? investments.filter(Boolean) : []
    return arr
  }, [investments])

  const hasMultiple = investmentList.length > 1
  const initialSelected: Investment | null = investment || (investmentList.length > 0 ? investmentList[0] : null)
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(initialSelected)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Update selected investment when investmentList changes
  useEffect(() => {
    if (investmentList.length > 0 && !selectedInvestment) {
      setSelectedInvestment(investmentList[0])
      setCurrentIndex(0)
    }
  }, [investmentList, selectedInvestment])

  // Carousel navigation
  const handlePrevious = () => {
    if (hasMultiple) {
      const newIndex = currentIndex > 0 ? currentIndex - 1 : investmentList.length - 1
      setCurrentIndex(newIndex)
      setSelectedInvestment(investmentList[newIndex])
    }
  }

  const handleNext = () => {
    if (hasMultiple) {
      const newIndex = currentIndex < investmentList.length - 1 ? currentIndex + 1 : 0
      setCurrentIndex(newIndex)
      setSelectedInvestment(investmentList[newIndex])
    }
  }

  // Use the correct investment data source
  const displayInvestment = hasMultiple ? selectedInvestment : investment || initialSelected

  if (isLoading) {
    return (
      <div className={`gba:w-full ${className}`} data-testid="investment-section-loading">
        <div className="gba:flex gba:items-center gba:justify-center gba:py-6">
          <Spinner size="sm" className="gba:mr-1" />
          <span className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('crm.common.loadingInvestment', 'Loading investment data...')}
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`gba:w-full ${className}`} data-testid="investment-section-error">
        <Alert variant="destructive">
          <div>
            <strong>{getTranslationFromI18nKeyAndLabel('crm.common.error', 'Error')}</strong>
            <div>
              {getTranslationFromI18nKeyAndLabel(
                'crm.investments.investment.loadError',
                'Failed to load investment information'
              )}
              : {error}
            </div>
          </div>
        </Alert>
      </div>
    )
  }

  if (!displayInvestment) {
    return (
      <div className={`gba:w-full ${className}`} data-testid="investment-section-empty">
        <div className="gba:flex gba:items-center gba:justify-center gba:py-6">
          <span className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('crm.common.noData', 'No investment data available')}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={`gba:w-full gba:h-full ${className}`} data-testid={props['data-testid'] || 'investment-section'}>
      <div className="gba:flex gba:flex-col gba:gap-6">
        {/* Main Info Section */}
        <div className="gba:flex gba:flex-col gba:gap-3">
          <div className="gba:flex gba:gap-3 gba:items-center">
            {hasMultiple && (
              <button
                onClick={handlePrevious}
                className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded gba:border gba:border-gray-300 gba:hover:bg-gray-100 gba:transition-colors"
                data-testid="investment-carousel-previous"
                aria-label="Previous investment"
              >
                <PiCaretLeft className="gba:w-4 gba:h-4" />
              </button>
            )}
            <IconAvatar icon={TrendUpIcon} variant="default" size="lg" title="Investment" />
            <div className="gba:flex gba:flex-col gba:gap-1 gba:flex-1 gba:min-w-0">
              <div className="gba:flex gba:gap-2.5 gba:items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h3
                        className="gba:text-sm gba:font-semibold gba:text-gray-800 gba:truncate gba:flex-1"
                        data-testid="investment-name"
                      >
                        {displayInvestment?.name ||
                          displayInvestment?.displayName ||
                          getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')}
                      </h3>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="gba:max-w-xs gba:break-words">
                        {displayInvestment?.name ||
                          displayInvestment?.displayName ||
                          getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Investment Role and Stake Type Badges */}
                {(() => {
                  // investmentRole is an array, get first role if available
                  const firstRole = Array.isArray(displayInvestment?.investmentRole)
                    ? displayInvestment.investmentRole[0]
                    : displayInvestment?.investmentRole
                  // Handle both full Investment entity (nested catalog) and Lead/Opportunity (direct catalog)
                  const roleValue =
                    firstRole?.investmentRole?.value ||
                    firstRole?.investmentRole?.code ||
                    firstRole?.value ||
                    firstRole?.code
                  const stakeValue =
                    displayInvestment?.investmentStakeType?.value || displayInvestment?.investmentStakeType?.code

                  const hasValidRole = roleValue && roleValue.trim() && !roleValue.toLowerCase().includes('not set')
                  const hasValidStake = stakeValue && stakeValue.trim() && !stakeValue.toLowerCase().includes('not set')

                  if (!hasValidRole && !hasValidStake) {
                    return null
                  }

                  return (
                    <div className="gba:flex gba:gap-2">
                      {hasValidRole && <Badge variant="outline">{roleValue}</Badge>}
                      {hasValidStake && <Badge variant="outline">{stakeValue}</Badge>}
                    </div>
                  )
                })()}
              </div>

              {/* Investment Group and Type - combined in single badge */}
              {(() => {
                const groupValue = displayInvestment?.investmentGroup?.value || displayInvestment?.investmentGroup?.code
                const typeValue = displayInvestment?.investmentType?.value || displayInvestment?.investmentType?.code
                const combinedValue = [groupValue, typeValue].filter(Boolean).join(' • ')

                if (combinedValue) {
                  return <Badge variant="ext1">{combinedValue}</Badge>
                }
                return null
              })()}
            </div>
            {hasMultiple && (
              <button
                onClick={handleNext}
                className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded gba:border gba:border-gray-300 gba:hover:bg-gray-100 gba:transition-colors"
                data-testid="investment-carousel-next"
                aria-label="Next investment"
              >
                <PiCaretRight className="gba:w-4 gba:h-4" />
              </button>
            )}
            {hasMultiple && (
              <span className="gba:text-xs gba:text-muted-foreground gba:whitespace-nowrap">
                {currentIndex + 1} / {investmentList.length}
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Investment Fields */}
        <DynamicInvestmentFields
          investmentData={displayInvestment}
          businessAppContext={props.accessToken ? (props as BusinessAppContextProps) : undefined}
        />
      </div>
    </div>
  )
}

// Static properties for SectionWrapper
;(InvestmentSection as any).sectionTitle = 'Investment Information'
;(InvestmentSection as any).sectionActions = (props: InvestmentSectionProps) => {
  const { accessToken, actionButtonProps, investment, investmentId } = props

  if (!actionButtonProps) {
    return null
  }

  return (
    <AppActionButton
      data-testid="investment-action-button"
      size="icon"
      contextsArray={
        actionButtonProps.contextsArray || [
          (() => {
            const code = (investment?.investmentType?.code || investment?.investmentGroup?.code || '').toUpperCase()
            if (code.includes('REAL_ESTATE')) return FlowContextName.realEstateInvestmentEntity
            if (code.includes('LIQUID_FUND')) return FlowContextName.liquidFundInvestmentEntity
            if (code.includes('EQUITY')) return FlowContextName.equityInvestmentEntity
            return FlowContextName.investmentEntity
          })()
        ]
      }
      externalContextData={{
        investmentId: investment?.id || investmentId,
        ...actionButtonProps.externalContextData
      }}
      prefixDataTestId={actionButtonProps.prefixDataTestId || 'investment-section-action'}
      accessToken={accessToken}
      emptyStateBehavior="enable"
      deferMainContextRequestsUntilClick
    />
  )
}

export default InvestmentSection
