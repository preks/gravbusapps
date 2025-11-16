import React from 'react'
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
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import DynamicInvestmentFields from './DynamicInvestmentFields'
import { TrendUpIcon } from '@phosphor-icons/react'
import type { Investment } from '@/common/data/investment/types/investmentTypes'
import { createGetPages } from '../utils'

interface InvestmentSectionProps extends Partial<BusinessAppContextProps> {
  investmentId?: string
  investment?: Investment
  investments?: Investment[]
  className?: string
  'data-testid'?: string
  actionButtonProps?: {
    contextsArray?: FlowContextName[]
    externalContextData?: Record<string, any>
    prefixDataTestId?: string
  }
  recordUrl?: string
  isLoading?: boolean
  error?: string | null
}

interface InvestmentDisplayProps {
  investment: Investment
  className?: string
  'data-testid'?: string
  businessAppContext?: BusinessAppContextProps
}

interface InvestmentStateProps {
  isLoading?: boolean
  error?: string | null
  isEmpty?: boolean
  className?: string
}

const extractBusinessAppContext = (props: Partial<BusinessAppContextProps>): BusinessAppContextProps | undefined => {
  if (!props.accessToken) {
    return undefined
  }

  return {
    accessToken: props.accessToken,
    locale: props.locale || '',
    employeeId: props.employeeId || '',
    structureId: props.structureId || '',
    userInfo: props.userInfo || { sub: '', email: '' }
  }
}

const InvestmentStateHandler: React.FC<InvestmentStateProps> = ({ isLoading, error, isEmpty, className = '' }) => {
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

  if (isEmpty) {
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

  return null
}

const InvestmentDisplay: React.FC<InvestmentDisplayProps> = ({
  investment,
  className = '',
  'data-testid': dataTestId = 'investment-section',
  businessAppContext
}) => {
  return (
    <div className={`gba:w-full gba:h-full ${className}`} data-testid={dataTestId}>
      <div className="gba:flex gba:flex-col gba:gap-6">
        {/* Main Info Section */}
        <div className="gba:flex gba:flex-col gba:gap-3">
          <div className="gba:flex gba:gap-3 gba:items-center">
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
                        {investment?.name ||
                          investment?.displayName ||
                          getTranslationFromI18nKeyAndLabel('crm.common.notSet', 'Not set')}
                      </h3>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="gba:max-w-xs gba:break-words">
                        {investment?.name ||
                          investment?.displayName ||
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

                  const hasValidRole = roleValue?.trim() && !roleValue.toLowerCase().includes('not set')
                  const hasValidStake = stakeValue?.trim() && !stakeValue.toLowerCase().includes('not set')

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
                const groupValue = investment?.investmentGroup?.value || investment?.investmentGroup?.code
                const typeValue = investment?.investmentType?.value || investment?.investmentType?.code
                const combinedValue = [groupValue, typeValue].filter(Boolean).join(' • ')

                if (combinedValue) {
                  return <Badge variant="ext1">{combinedValue}</Badge>
                }
                return null
              })()}
            </div>
          </div>
        </div>

        {/* Dynamic Investment Fields */}
        <DynamicInvestmentFields investmentData={investment} businessAppContext={businessAppContext} />
      </div>
    </div>
  )
}

const InvestmentSection: React.FC<InvestmentSectionProps> = ({
  investment,
  investments,
  className = '',
  isLoading = false,
  error = null,
  ...props
}) => {
  const investmentList = Array.isArray(investments) ? investments.filter(Boolean) : []
  const displayInvestment = investment || (investmentList.length > 0 ? investmentList[0] : null)

  const stateHandler = (
    <InvestmentStateHandler isLoading={isLoading} error={error} isEmpty={!displayInvestment} className={className} />
  )

  if (isLoading || error || !displayInvestment) {
    return stateHandler
  }

  return (
    <InvestmentDisplay
      investment={displayInvestment}
      className={className}
      data-testid={props['data-testid'] || 'investment-section'}
      businessAppContext={extractBusinessAppContext(props)}
    />
  )
}

// Static properties for SectionWrapper
;(InvestmentSection as any).sectionTitle = 'Investment Information'
;(InvestmentSection as any).getPages = createGetPages<any>(
  (props: InvestmentSectionProps) => props.investments,
  (props: InvestmentSectionProps) => props.investment
)
;(InvestmentSection as any).renderPage = (pageData: any, _pageIndex: number, props: InvestmentSectionProps) => {
  const { className = '', isLoading = false, error = null } = props

  const stateHandler = (
    <InvestmentStateHandler isLoading={isLoading} error={error} isEmpty={!pageData} className={className} />
  )

  if (isLoading || error || !pageData) {
    return stateHandler
  }

  return (
    <InvestmentDisplay
      investment={pageData}
      className={className}
      data-testid="investment-section"
      businessAppContext={extractBusinessAppContext(props)}
    />
  )
}
;(InvestmentSection as any).getActionButtonConfig = (
  pageData: any,
  _pageIndex: number,
  props: InvestmentSectionProps
) => {
  const { accessToken, actionButtonProps } = props

  if (!actionButtonProps || !accessToken) {
    return null
  }

  // Determine context based on investment type
  const getContext = () => {
    const code = (pageData?.investmentType?.code || pageData?.investmentGroup?.code || '').toUpperCase()
    if (code.includes('REAL_ESTATE')) return FlowContextName.realEstateInvestmentEntity
    if (code.includes('LIQUID_FUND')) return FlowContextName.liquidFundInvestmentEntity
    if (code.includes('EQUITY')) return FlowContextName.equityInvestmentEntity
    return FlowContextName.investmentEntity
  }

  return {
    type: 'AppActionButton' as const,
    config: {
      contextsArray: actionButtonProps.contextsArray || [getContext()],
      externalContextData: {
        ...actionButtonProps.externalContextData,
        investmentId: pageData?.id // Override with current page investmentId (must come after spread)
      },
      prefixDataTestId: actionButtonProps.prefixDataTestId || 'investment-section-action',
      emptyStateBehavior: 'enable' as const,
      deferMainContextRequestsUntilClick: true
    }
  }
}

export default InvestmentSection
